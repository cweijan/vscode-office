import JSZip from "jszip";

const XMLNS = "http://www.w3.org/2000/xmlns/";
const MC = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DOCUMENT_PART = "word/document.xml";

function parseXml(xml: string, partName: string): XMLDocument {
    const parsed = new DOMParser().parseFromString(xml, "application/xml");
    if (parsed.getElementsByTagName("parsererror").length > 0) {
        throw new Error(`Cannot save: invalid XML in ${partName}. The file has not been overwritten.`);
    }
    return parsed;
}

/** Restore bindings needed by verbatim OOXML retained by the 1.x editor. */
export function preserveDocumentNamespaces(originalXml: string, exportedXml: string): string {
    const original = parseXml(originalXml, DOCUMENT_PART).documentElement;
    if (original.namespaceURI !== W || original.localName !== "document") {
        throw new Error("Cannot save: unexpected Word document root.");
    }

    // Parsing the export directly can fail on undeclared prefixes (e.g. w16du:dateUtc).
    // Inherit the source bindings through a temporary wrapper instead. This also handles
    // arbitrary extension prefixes without guessing a URI or maintaining an allowlist.
    const wrapper = parseXml("<export/>", DOCUMENT_PART).documentElement;
    const bindings = Array.from(original.attributes).filter(attr => attr.namespaceURI === XMLNS);
    for (const attr of bindings) {
        wrapper.setAttributeNS(XMLNS, attr.name, attr.value);
    }
    const serializer = new XMLSerializer();
    const wrapperStart = serializer.serializeToString(wrapper).replace(/\/>$/, ">");
    const declaration = exportedXml.match(/^\uFEFF?<\?xml\s[^?]*\?>/)?.[0] ?? "";
    const wrapped = parseXml(
        `${wrapperStart}${exportedXml.slice(declaration.length)}</export>`, DOCUMENT_PART,
    ).documentElement;
    const exported = wrapped.firstElementChild;
    if (wrapped.children.length !== 1 || exported?.namespaceURI !== W || exported.localName !== "document") {
        throw new Error("Cannot save: unexpected Word document root.");
    }

    let changed = false;
    for (const attr of bindings) {
        const existing = exported.getAttributeNodeNS(XMLNS, attr.localName);
        if (existing && existing.value !== attr.value) {
            throw new Error(`Cannot save: conflicting ${attr.name} binding. The file has not been overwritten.`);
        }
        if (!existing) {
            exported.setAttributeNS(XMLNS, attr.name, attr.value);
            changed = true;
        }
    }

    const originalIgnorable = original.getAttributeNodeNS(MC, "Ignorable");
    const exportedIgnorable = exported.getAttributeNodeNS(MC, "Ignorable");
    const ignorable = new Set((exportedIgnorable?.value ?? "").split(/\s+/).filter(Boolean));
    for (const prefix of (originalIgnorable?.value ?? "").split(/\s+/).filter(Boolean)) {
        if (!ignorable.has(prefix)) {
            ignorable.add(prefix);
            changed = true;
        }
    }
    for (const prefix of ignorable) {
        if (!exported.lookupNamespaceURI(prefix)) {
            throw new Error("Cannot save: an mc:Ignorable prefix is undeclared. The file has not been overwritten.");
        }
    }
    if (changed && ignorable.size > 0) {
        exported.setAttributeNS(MC, exportedIgnorable?.name ?? originalIgnorable!.name, [...ignorable].join(" "));
    }

    return changed
        ? declaration + Array.from(wrapped.childNodes).map(node => serializer.serializeToString(node)).join("")
        : exportedXml;
}

/** Validate before emitting a save, so a failed export cannot replace the source file. */
export async function prepareWordSave(originalBuffer: ArrayBuffer, exportedBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    const [original, exported] = await Promise.all([
        JSZip.loadAsync(originalBuffer), JSZip.loadAsync(exportedBuffer),
    ]);
    const originalPart = original.file(DOCUMENT_PART);
    const exportedPart = exported.file(DOCUMENT_PART);
    if (!originalPart || !exportedPart) {
        throw new Error("Cannot save: missing word/document.xml. The file has not been overwritten.");
    }
    const [originalXml, exportedXml] = await Promise.all([
        originalPart.async("string"), exportedPart.async("string"),
    ]);
    const repairedXml = preserveDocumentNamespaces(originalXml, exportedXml);
    for (const part of Object.values(exported.files)) {
        if (!part.dir && /\.(xml|rels)$/i.test(part.name)) {
            parseXml(part.name === DOCUMENT_PART ? repairedXml : await part.async("string"), part.name);
        }
    }
    if (repairedXml === exportedXml) {
        return exportedBuffer;
    }
    exported.file(DOCUMENT_PART, repairedXml);
    return exported.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}
