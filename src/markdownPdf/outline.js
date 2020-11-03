const { PDFDocument, PDFDict, PDFString, PDFName } = require("pdf-lib");

module.exports = {
    createOutline: async (pdf, html) => {

        const pdfDoc = await PDFDocument.load(pdf)

        const $ = require("cheerio").load(html)

        const array = $('.table-of-contents>ol>li');
        if (array.length > 0) {
            const dict = extractDict(pdfDoc);
            const dictArray = inflateDict(array, $, dict);
            creatOutlines(pdfDoc, dictArray)
        }

        return await pdfDoc.save()
    }
}

function inflateDict(array, $, dict) {
    const dictArray = []
    for (let index = 0; index < array.length; index++) {
        const a = $(array[index]).children('a');
        const key = getKey(a);
        dict[key].title = a.text();
        dict[key].isLast = array.length == 1 || index == array.length - 1;
        dictArray.push(dict[key])
    }
    return dictArray;
}

function extractDict(pdfDoc) {
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
    return "/" + a.attr("href").replace("#", "").replace(/%/g, "#25");
}


async function creatOutlines(doc, dictArray) {

    const createOutlineItem = (doc, dict, parentRefer, outlineRefer, nextOrPrev) => {
        const map = new Map();
        map.set(PDFName.Title, PDFString.of(dict.title));
        map.set(PDFName.Parent, parentRefer);
        if (nextOrPrev != null) {
            map.set(PDFName.of(dict.isLast ? "Prev" : "Next"), nextOrPrev);
        } else {
            map.set(PDFName.of("Next"), outlineRefer);
        }
        map.set(PDFName.of("Dest"), dict.dest);
        const outlineDict = PDFDict.fromMapWithContext(map, doc.context);
        doc.context.assign(outlineRefer, outlineDict);
        return outlineRefer;
    }


    const outlinesDictRef = doc.context.nextRef();
    const outlineRefers = []
    for (const _ of dictArray) {
        outlineRefers.push(doc.context.nextRef())
    }

    for (let i = 0; i < dictArray.length; i++) {
        const dict = dictArray[i];
        const isLast = i == dictArray.length - 1;
        const nextOrPrev = isLast ? outlineRefers[i - 1] : outlineRefers[i + 1];
        createOutlineItem(doc, dict, outlinesDictRef, outlineRefers[i], nextOrPrev)
    }


    // 下面是将outline引用绑定pdf outline
    const outlinesDictMap = new Map();
    outlinesDictMap.set(PDFName.Type, PDFName.of("Outlines"));
    outlinesDictMap.set(PDFName.of("First"), outlineRefers[0]);
    outlinesDictMap.set(PDFName.of("Last"), outlineRefers[outlineRefers.length - 1]);
    doc.catalog.set(PDFName.of("Outlines"), outlinesDictRef)
    doc.context.assign(outlinesDictRef, PDFDict.fromMapWithContext(outlinesDictMap, doc.context));

}
