import { load as loadCheerio, type Cheerio, type CheerioAPI } from 'cheerio';

const PDF_OUTLINE_ANCHOR_STYLE = `<style id="pdf-outline-anchor-style">
a.pdf-outline-anchor {
    display: inline-block;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0.01;
    color: inherit !important;
    text-decoration: none !important;
    user-select: none;
}
</style>`;

/** When TOC is auto-inserted and hidden on print, inject tiny (not hidden) anchor links at body end so PDF destinations exist. */
export function injectHeadingLinksFromToc(html: string): string {
    const $ = loadCheerio(html);
    const tocItems = $('.table-of-contents>ol>li');
    if (tocItems.length === 0) {
        return html;
    }

    const hrefs = new Set<string>();
    collectTocHrefs(tocItems, $, hrefs);
    appendOutlineAnchorsToBody($, hrefs);
    return $.html();
}

function collectTocHrefs(items: Cheerio<any>, $: CheerioAPI, hrefs: Set<string>): void {
    for (let index = 0; index < items.length; index++) {
        const li = $(items[index]);
        const anchor = li.children('a').first();
        if (anchor.length > 0) {
            const href = anchor.attr('href') || '';
            if (href.startsWith('#')) {
                hrefs.add(href);
            }
        }

        const children = li.children('ol').children('li');
        if (children.length > 0) {
            collectTocHrefs(children, $, hrefs);
        }
    }
}

function appendOutlineAnchorsToBody($: CheerioAPI, hrefs: Set<string>): void {
    if (hrefs.size === 0) {
        return;
    }
    const body = $('body').first();
    if (!body.length) {
        return;
    }

    if (!$('style#pdf-outline-anchor-style').length) {
        body.append(PDF_OUTLINE_ANCHOR_STYLE);
    }

    if ($('#pdf-outline-anchors').length) {
        return;
    }

    const links = Array.from(hrefs)
        .map(href => `<a class="pdf-outline-anchor" href="${href}" aria-hidden="true">.</a>`)
        .join('');
    body.append(`<div id="pdf-outline-anchors" aria-hidden="true">${links}</div>`);
}

export const createOutline = async (pdf, html) => {

    const { PDFDocument } = require("pdf-lib");
    const pdfDoc = await PDFDocument.load(pdf)

    const $ = require("cheerio").load(html)

    const array = $('.table-of-contents>ol>li');
    if (array.length > 0) {
        const dict = extractDict(pdfDoc);
        const dictArray = inflateDict(array, $, dict);
        if (dictArray.length > 0) {
            creatOutlines(pdfDoc, dictArray)
        }
    }

    return await pdfDoc.save()
}

function inflateDict(array, $, dict) {
    const dictArray = []
    for (let index = 0; index < array.length; index++) {
        const li = $(array[index]);
        const a = li.children('a');
        if (!a) continue;
        const key = getKey(a);
        if (!dict[key]) { continue; }
        dict[key].title = a.text();
        dict[key].isLast = array.length == 1 || index == array.length - 1;
        const childs = $(array[index]).children('ol').children('li');
        if (childs != null && childs.length > 0) {
            dict[key].child = inflateDict(childs, $, dict)
        }
        dictArray.push(dict[key])
    }
    return dictArray;
}

function extractDict(pdfDoc) {
    const { PDFDict } = require("pdf-lib");
    const dict = {};
    for (const obj of pdfDoc.context.indirectObjects.entries()) {
        if (obj[1] && obj[1] instanceof PDFDict) {
            for (const entry of obj[1].dict.entries()) {
                if (entry[0].encodedName == '/Dest') {
                    const key = entry[1].encodedName;
                    dict[key] = {
                        dest: entry[1]
                    };
                }
            }
        }
    }
    return dict;
}

function getKey(a) {
    const href = a.attr("href") || "";
    const anchor = decodeURIComponent(href.replace(/^#/, ""));
    return anchorToPdfDestKey(anchor);
}

function anchorToPdfDestKey(anchor) {
    const encoded = encodeURIComponent(anchor);
    return "/" + encoded.replace(/%/g, "#25");
}


async function creatOutlines(doc, dictArray) {
    const { PDFDict, PDFHexString, PDFNumber, PDFName } = require("pdf-lib");
    const createOutlineItem = (doc, dict, parentRefer, outlineRefer, nextOrPrev, childRefs) => {
        const map = new Map();
        map.set(PDFName.Title, PDFHexString.fromText(dict.title));
        map.set(PDFName.Parent, parentRefer);
        if (nextOrPrev != null) {
            map.set(PDFName.of(dict.isLast ? "Prev" : "Next"), nextOrPrev);
        }
        if (childRefs) {
            map.set(PDFName.of("First"), childRefs[0]);
            map.set(PDFName.of("Last"), childRefs[childRefs.length - 1]);
            map.set(PDFName.of("Count"), PDFNumber.of(childRefs.length));
        }
        map.set(PDFName.of("Dest"), dict.dest);
        const outlineDict = PDFDict.fromMapWithContext(map, doc.context);
        doc.context.assign(outlineRefer, outlineDict);
        return outlineRefer;
    }


    function buildOutline(dictArray, doc, parentRef) {
        const outlineRefers = [];
        for (const _ of dictArray) {
            outlineRefers.push(doc.context.nextRef());
        }
        for (let i = 0; i < dictArray.length; i++) {
            const dict = dictArray[i];
            const isLast = i == dictArray.length - 1;
            const nextOrPrev = isLast ? outlineRefers[i - 1] : outlineRefers[i + 1];
            const childRefs = dict.child ? buildOutline(dict.child, doc, outlineRefers[i]) : null
            createOutlineItem(doc, dict, parentRef, outlineRefers[i], nextOrPrev, childRefs);
        }
        return outlineRefers;
    }


    const outlinesDictRef = doc.context.nextRef();
    const outlineRefers = buildOutline(dictArray, doc, outlinesDictRef);


    // 下面是将outline引用绑定pdf outline
    const outlinesDictMap = new Map();
    outlinesDictMap.set(PDFName.Type, PDFName.of("Outlines"));
    outlinesDictMap.set(PDFName.of("First"), outlineRefers[0]);
    outlinesDictMap.set(PDFName.of("Last"), outlineRefers[outlineRefers.length - 1]);
    outlinesDictMap.set(PDFName.of("Count"), PDFNumber.of(outlineRefers.length)); //This is a count of the number of outline items. Should be changed for X no. of outlines
    doc.catalog.set(PDFName.of("Outlines"), outlinesDictRef)
    doc.context.assign(outlinesDictRef, PDFDict.fromMapWithContext(outlinesDictMap, doc.context));

}
