import { parse, HTMLElement, Node } from 'node-html-parser';

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
    const root = parse(html);
    const tocItems = root.querySelectorAll('.table-of-contents > ol > li');
    if (tocItems.length === 0) {
        return html;
    }

    const hrefs = new Set<string>();
    collectTocHrefs(tocItems, hrefs);
    return appendOutlineAnchorsToHtml(root.toString(), hrefs);
}

function collectTocHrefs(items: HTMLElement[], hrefs: Set<string>): void {
    for (const li of items) {
        const anchor = findDirectChildByTag(li, 'a');
        if (anchor) {
            const href = anchor.getAttribute('href') || '';
            if (href.startsWith('#')) {
                hrefs.add(href);
            }
        }

        const nestedList = findDirectChildByTag(li, 'ol');
        const children = nestedList ? getDirectChildElementsByTag(nestedList, 'li') : [];
        if (children.length > 0) {
            collectTocHrefs(children, hrefs);
        }
    }
}

function appendOutlineAnchorsToHtml(html: string, hrefs: Set<string>): string {
    if (hrefs.size === 0) {
        return html;
    }
    if (html.includes('id="pdf-outline-anchors"')) {
        return html;
    }

    let suffix = '';
    if (!html.includes('id="pdf-outline-anchor-style"')) {
        suffix += PDF_OUTLINE_ANCHOR_STYLE;
    }
    const links = Array.from(hrefs)
        .map(href => `<a class="pdf-outline-anchor" href="${href}" aria-hidden="true">.</a>`)
        .join('');
    suffix += `<div id="pdf-outline-anchors" aria-hidden="true">${links}</div>`;

    if (html.includes('</body>')) {
        return html.replace('</body>', `${suffix}</body>`);
    }
    return `${html}${suffix}`;
}

export const createOutline = async (pdf, html) => {
    const { PDFDocument } = require("pdf-lib");
    const pdfDoc = await PDFDocument.load(pdf)
    const root = parse(html);
    const items = root.querySelectorAll('.table-of-contents > ol > li');
    if (items.length > 0) {
        const dict = extractDict(pdfDoc);
        const dictArray = inflateDict(items, dict);
        if (dictArray.length > 0) {
            creatOutlines(pdfDoc, dictArray)
        }
    }

    return await pdfDoc.save()
}

function inflateDict(items: HTMLElement[], dict) {
    const dictArray = []
    for (let index = 0; index < items.length; index++) {
        const li = items[index];
        const anchor = findDirectChildByTag(li, 'a');
        if (!anchor) continue;
        const key = getKey(anchor);
        if (!dict[key]) { continue; }
        dict[key].title = anchor.text.trim();
        dict[key].isLast = items.length == 1 || index == items.length - 1;
        const nestedList = findDirectChildByTag(li, 'ol');
        const children = nestedList ? getDirectChildElementsByTag(nestedList, 'li') : [];
        if (children.length > 0) {
            dict[key].child = inflateDict(children, dict)
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

function getKey(anchor: HTMLElement) {
    const href = anchor.getAttribute("href") || "";
    const target = decodeURIComponent(href.replace(/^#/, ""));
    return anchorToPdfDestKey(target);
}

function isElementNode(node: Node): node is HTMLElement {
    return node instanceof HTMLElement;
}

function getDirectChildElementsByTag(element: HTMLElement, tagName: string): HTMLElement[] {
    return element.childNodes.filter(isElementNode).filter(child => child.rawTagName === tagName);
}

function findDirectChildByTag(element: HTMLElement, tagName: string): HTMLElement | null {
    return getDirectChildElementsByTag(element, tagName)[0] ?? null;
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
