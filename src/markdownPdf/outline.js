const { PDFDocument, PDFPageLeaf, PDFDict, PDFString, PDFArray, PDFName, PDFNull, PDFNumber, } = require("pdf-lib");

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
        if (array.length > 1) {
            const isLast = index == array.length - 1;
            const nextOrPrevIndex = isLast ? index - 1 : index + 1;
            const nextOrPrev = getKey($(array[nextOrPrevIndex]).children('a'));
            dict[key].nextOrPrev = dict[nextOrPrev].refer;
        }
        dictArray.push(dict[key])
    }
    return dictArray;
}

function extractDict(pdfDoc) {
    const dics = {};
    for (const obj of pdfDoc.context.indirectObjects.entries()) {
        if (obj[1] && obj[1] instanceof PDFDict) {
            for (const entry of obj[1].dict.entries()) {
                if (entry[0].encodedName == '/Dest') {
                    const key = entry[1].encodedName;
                    dics[key] = {
                        refer: obj[0]
                    };
                }
            }
        }
    }
    return dics;
}

function getKey(a) {
    return "/" + a.attr("href").replace("#", "").replace(/%/g, "#25");
}


async function creatOutlines(doc, dictArray) {

    const getPageRefs = (pdfDoc) => {
        const refs = [];
        pdfDoc.catalog.Pages().traverse((kid, ref) => {
            if (kid instanceof PDFPageLeaf) refs.push(ref);
        });
        return refs;
    };
    //(PDFDocument, string, PDFRef, PDFRef, PDFRef, boolean)
    const createOutlineItem = (pdfDoc, title, parent, nextOrPrev, page, isLast = false) => {
        let array = PDFArray.withContext(pdfDoc.context);
        array.push(page);
        array.push(PDFName.of("XYZ"));
        array.push(PDFNull);
        array.push(PDFNull);
        array.push(PDFNull);
        const map = new Map();
        map.set(PDFName.Title, PDFString.of(title));
        map.set(PDFName.Parent, parent);
        map.set(PDFName.of(isLast ? "Prev" : "Next"), nextOrPrev);
        map.set(PDFName.of("Dest"), array);

        return PDFDict.fromMapWithContext(map, pdfDoc.context);
    }

    const pageRefs = getPageRefs(doc);

    const outlinesDictRef = doc.context.nextRef();
    const outlineItem1Ref = doc.context.nextRef();
    const outlineItem2Ref = doc.context.nextRef();
    const outlineItem3Ref = doc.context.nextRef();

    const outlineItem1 = createOutlineItem(
        doc,
        "Page 1",
        outlinesDictRef,
        outlineItem2Ref,
        pageRefs[0]
    );

    const outlineItem2 = createOutlineItem(
        doc,
        "Page 2",
        outlinesDictRef,
        outlineItem3Ref,
        pageRefs[1]
    );

    const outlineItem3 = createOutlineItem(
        doc,
        "Page 3",
        outlinesDictRef,
        outlineItem2Ref,
        pageRefs[2],
        true
    );
    //Actual outline items that will be displayed
    doc.context.assign(outlineItem1Ref, outlineItem1);
    doc.context.assign(outlineItem2Ref, outlineItem2);
    doc.context.assign(outlineItem3Ref, outlineItem3);


    // 下面是将outline引用绑定pdf outline
    const outlinesDictMap = new Map();
    outlinesDictMap.set(PDFName.Type, PDFName.of("Outlines"));
    outlinesDictMap.set(PDFName.of("First"), outlineItem1Ref);
    outlinesDictMap.set(PDFName.of("Last"), outlineItem3Ref);
    outlinesDictMap.set(PDFName.of("Count"), PDFNumber.of(3)); //This is a count of the number of outline items. Should be changed for X no. of outlines
    //Pointing the "Outlines" property of the PDF's "Catalog" to the first object of your outlines
    doc.catalog.set(PDFName.of("Outlines"), outlinesDictRef)
    const outlinesDict = PDFDict.fromMapWithContext(outlinesDictMap, doc.context);
    //First 'Outline' object. Refer to table H.3 in Annex H.6 of PDF Specification doc.
    doc.context.assign(outlinesDictRef, outlinesDict);

}
