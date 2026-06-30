import { Constants } from "../constants";
import { encodeMdSourceAttr } from "../htmlInline/renderHtmlBlock";
import { hasClosestBlock } from "./hasClosest";

export const IMAGE_HTML_BLOCK_MARK = "data-image-resize";
export const IMAGE_ASPECT_RATIO_LOCK_ATTR = "data-aspect-ratio-lock";

const escapeAttr = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("\"", "&quot;")
        .replaceAll("<", "&lt;");

export const isImageAspectRatioLocked = (img: HTMLImageElement): boolean =>
    img.getAttribute(IMAGE_ASPECT_RATIO_LOCK_ATTR) !== "false";

export const setImageAspectRatioLocked = (img: HTMLImageElement, locked: boolean) => {
    img.setAttribute(IMAGE_ASPECT_RATIO_LOCK_ATTR, locked ? "true" : "false");
    if (!locked) {
        ensureExplicitImageDimensions(img);
    }
};

export const getImageAspectRatio = (img: HTMLImageElement): number => {
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    if (naturalWidth > 0 && naturalHeight > 0) {
        return naturalWidth / naturalHeight;
    }
    const attrWidth = Number(img.getAttribute("width"));
    const attrHeight = Number(img.getAttribute("height"));
    if (attrWidth > 0 && attrHeight > 0) {
        return attrWidth / attrHeight;
    }
    const rect = img.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        return rect.width / rect.height;
    }
    return 1;
};

const roundDimension = (value: number): number => Math.round(value);

const readAttrDimension = (raw: string | null): number | null => {
    if (!raw) {
        return null;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
        return null;
    }
    return roundDimension(value);
};

export const getImageDisplayDimensions = (img: HTMLImageElement): { width: number; height: number } => {
    const attrWidth = readAttrDimension(img.getAttribute("width"));
    const attrHeight = readAttrDimension(img.getAttribute("height"));

    if (attrWidth !== null && attrHeight !== null) {
        return { width: attrWidth, height: attrHeight };
    }
    if (attrWidth !== null) {
        if (isImageAspectRatioLocked(img)) {
            return {
                width: attrWidth,
                height: roundDimension(attrWidth / getImageAspectRatio(img)),
            };
        }
        return {
            width: attrWidth,
            height: roundDimension(img.getBoundingClientRect().height || img.naturalHeight || 0),
        };
    }
    if (attrHeight !== null) {
        if (isImageAspectRatioLocked(img)) {
            const ratio = getImageAspectRatio(img);
            return {
                width: roundDimension(attrHeight * ratio),
                height: attrHeight,
            };
        }
        return {
            width: roundDimension(img.getBoundingClientRect().width || img.naturalWidth || 0),
            height: attrHeight,
        };
    }

    const rect = img.getBoundingClientRect();
    return {
        width: roundDimension(rect.width || img.naturalWidth || 0),
        height: roundDimension(rect.height || img.naturalHeight || 0),
    };
};

export const buildImageMdSource = (img: HTMLImageElement): string => {
    const parts = ["<img"];
    const alt = img.getAttribute("alt");
    if (alt !== null) {
        parts.push(` alt="${escapeAttr(alt)}"`);
    }
    const src = img.getAttribute("src");
    if (src) {
        parts.push(` src="${escapeAttr(src)}"`);
    }
    const width = img.getAttribute("width");
    if (width) {
        parts.push(` width="${width}"`);
    }
    const height = img.getAttribute("height");
    if (height) {
        parts.push(` height="${height}"`);
    }
    const aspectLocked = img.getAttribute(IMAGE_ASPECT_RATIO_LOCK_ATTR);
    if (aspectLocked === "true" || aspectLocked === "false") {
        parts.push(` ${IMAGE_ASPECT_RATIO_LOCK_ATTR}="${aspectLocked}"`);
    }
    parts.push(">");
    return parts.join("");
};

export const findImageHtmlBlock = (img: HTMLImageElement): HTMLElement | null => {
    return resolveImageHtmlWrapperInfo(img)?.wrapper ?? null;
};

/** @deprecated use findImageHtmlBlock */
export const findMarkedImageHtmlBlock = findImageHtmlBlock;

export const ensureImageHtmlBlockMarked = (block: HTMLElement) => {
    block.setAttribute(IMAGE_HTML_BLOCK_MARK, "true");
};

type ImageHtmlWrapperInfo = {
    wrapper: HTMLElement;
    display: HTMLElement;
    dataType: "html-block" | "html-inline";
};

const resolveImageHtmlWrapperInfo = (img: HTMLImageElement): ImageHtmlWrapperInfo | null => {
    const parent = img.parentElement;
    if (!parent) {
        return null;
    }
    let dataType: "html-block" | "html-inline" | null = null;
    if (parent.classList.contains("vditor-html-block__display")) {
        dataType = "html-block";
    } else if (parent.classList.contains("vditor-html-inline__display")) {
        dataType = "html-inline";
    } else {
        return null;
    }
    const wrapper = parent.parentElement;
    if (!wrapper || wrapper.getAttribute("data-type") !== dataType) {
        return null;
    }
    return { wrapper, display: parent, dataType };
};

const hasCustomImageDimensions = (img: HTMLImageElement): boolean =>
    img.hasAttribute("width") || img.hasAttribute("height");

const getImageFromHtmlWrapper = (wrapper: HTMLElement): HTMLImageElement | null => {
    const dataType = wrapper.getAttribute("data-type");
    const displaySelector = dataType === "html-inline"
        ? ".vditor-html-inline__display"
        : ".vditor-html-block__display";
    const display = wrapper.querySelector(displaySelector);
    return display?.querySelector("img") as HTMLImageElement | null;
};

const isImgOnlyParagraph = (paragraph: HTMLElement, img: HTMLImageElement): boolean => {
    if (paragraph.tagName !== "P") {
        return false;
    }
    for (let i = 0; i < paragraph.childNodes.length; i++) {
        const child = paragraph.childNodes[i];
        if (child === img) {
            continue;
        }
        if (child.nodeType === 3) {
            const text = (child.textContent || "").replaceAll(Constants.ZWSP, "").trim();
            if (!text) {
                continue;
            }
        }
        return false;
    }
    return paragraph.contains(img);
};

const createMarkedImageHtmlBlock = (vditor: IVditor, mdSource: string): HTMLElement => {
    const block = document.createElement("div");
    block.className = vditor.currentMode === "ir"
        ? "vditor-ir__node vditor-html-block--readonly"
        : "vditor-wysiwyg__block vditor-html-block--readonly";
    block.setAttribute("contenteditable", "false");
    block.setAttribute("data-type", "html-block");
    block.setAttribute("data-block", "0");
    block.setAttribute("data-md-source", encodeMdSourceAttr(mdSource));
    block.setAttribute(IMAGE_HTML_BLOCK_MARK, "true");

    const display = document.createElement("div");
    display.className = "vditor-html-block__display";
    block.appendChild(display);
    return block;
};

const syncImageHtmlWrapperSource = (info: ImageHtmlWrapperInfo, img: HTMLImageElement) => {
    img.removeAttribute("style");
    const mdSource = buildImageMdSource(img);
    info.wrapper.setAttribute("data-md-source", encodeMdSourceAttr(mdSource));
    info.display.innerHTML = mdSource;
    if (info.dataType === "html-block") {
        info.wrapper.setAttribute(IMAGE_HTML_BLOCK_MARK, "true");
    }
};

const wrapImageInMarkedHtmlBlock = (
    vditor: IVditor,
    img: HTMLImageElement,
): HTMLImageElement => {
    img.removeAttribute("style");
    const mdSource = buildImageMdSource(img);
    const block = createMarkedImageHtmlBlock(vditor, mdSource);
    const display = block.querySelector(".vditor-html-block__display") as HTMLElement;
    const paragraph = hasClosestBlock(img) as HTMLElement | false;

    if (paragraph && isImgOnlyParagraph(paragraph, img)) {
        display.appendChild(img);
        paragraph.replaceWith(block);
    } else {
        const parent = img.parentElement;
        if (!parent) {
            return img;
        }
        parent.replaceChild(block, img);
        display.appendChild(img);
    }
    return display.querySelector("img") as HTMLImageElement;
};

const unwrapImageHtmlWrapper = (wrapper: HTMLElement): HTMLImageElement | null => {
    const img = getImageFromHtmlWrapper(wrapper);
    if (!img) {
        return null;
    }
    img.removeAttribute("width");
    img.removeAttribute("height");
    img.removeAttribute("style");
    img.removeAttribute(IMAGE_ASPECT_RATIO_LOCK_ATTR);
    wrapper.replaceWith(img);
    return img;
};

const ensureExplicitImageDimensions = (img: HTMLImageElement) => {
    if (isImageAspectRatioLocked(img)) {
        return;
    }
    const { width, height } = getImageDisplayDimensions(img);
    if (!img.hasAttribute("width") && width > 0) {
        img.setAttribute("width", String(width));
    }
    if (!img.hasAttribute("height") && height > 0) {
        img.setAttribute("height", String(height));
    }
};

const applyDimensionAttributes = (
    img: HTMLImageElement,
    attribute: "width" | "height",
    rawValue: string,
) => {
    img.removeAttribute("style");
    const value = rawValue.trim();
    if (value === "") {
        if (isImageAspectRatioLocked(img)) {
            img.removeAttribute("width");
            img.removeAttribute("height");
        } else {
            img.removeAttribute(attribute);
        }
        return;
    }
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
        return;
    }
    const rounded = roundDimension(nextValue);
    if (isImageAspectRatioLocked(img)) {
        const ratio = getImageAspectRatio(img);
        if (attribute === "width") {
            img.setAttribute("width", String(rounded));
            img.setAttribute("height", String(roundDimension(rounded / ratio)));
        } else {
            img.setAttribute("height", String(rounded));
            img.setAttribute("width", String(roundDimension(rounded * ratio)));
        }
        return;
    }
    ensureExplicitImageDimensions(img);
    img.setAttribute(attribute, String(rounded));
};

export const syncLockedImageDimensions = (img: HTMLImageElement) => {
    if (!isImageAspectRatioLocked(img)) {
        return;
    }
    const width = readAttrDimension(img.getAttribute("width"));
    const height = readAttrDimension(img.getAttribute("height"));
    if (width === null && height === null) {
        return;
    }
    const ratio = getImageAspectRatio(img);
    if (width !== null) {
        img.setAttribute("width", String(width));
        img.setAttribute("height", String(roundDimension(width / ratio)));
        return;
    }
    if (height !== null) {
        img.setAttribute("height", String(height));
        img.setAttribute("width", String(roundDimension(height * ratio)));
    }
};

export const syncImageHtmlBlockIfWrapped = (img: HTMLImageElement): HTMLImageElement => {
    const info = resolveImageHtmlWrapperInfo(img);
    if (!info) {
        img.removeAttribute("style");
        return img;
    }
    syncImageHtmlWrapperSource(info, img);
    return getImageFromHtmlWrapper(info.wrapper) ?? img;
};

export const applyImageDimensionChange = (
    vditor: IVditor,
    imgElement: HTMLImageElement,
    attribute: "width" | "height",
    rawValue: string,
): HTMLImageElement => {
    applyDimensionAttributes(imgElement, attribute, rawValue);

    const wrapperInfo = resolveImageHtmlWrapperInfo(imgElement);
    if (!hasCustomImageDimensions(imgElement)) {
        if (wrapperInfo) {
            return unwrapImageHtmlWrapper(wrapperInfo.wrapper) ?? imgElement;
        }
        return imgElement;
    }

    if (wrapperInfo) {
        syncImageHtmlWrapperSource(wrapperInfo, imgElement);
        return getImageFromHtmlWrapper(wrapperInfo.wrapper) ?? imgElement;
    }

    vditor[vditor.currentMode].preventInput = true;
    return wrapImageInMarkedHtmlBlock(vditor, imgElement);
};
