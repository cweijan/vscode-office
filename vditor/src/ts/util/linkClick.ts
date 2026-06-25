import { isInsideCodeBlockChrome, isInsideCodeMirror, isPlantumlRenderImage } from "../codeBlock/codeMirrorManager";
import { hasClosestByAttribute, hasClosestByMatchTag } from "./hasClosest";

/** 未配置 onLinkClick 时：Ctrl/⌘+单击、双击或中键触发默认跳转 */
export const shouldTriggerLinkClick = (event: MouseEvent) => {
    if (event.type === "auxclick" || event.type === "dblclick") {
        return true;
    }
    if (event.type === "click" && (event.metaKey || event.ctrlKey)) {
        return true;
    }
    return false;
};

const getLinkClickAction = (event: MouseEvent): ILinkClickAction => {
    if (event.type === "dblclick") {
        return "dblclick";
    }
    if (event.type === "auxclick") {
        return "auxclick";
    }
    return "click";
};

const getWikilinkElement = (target: HTMLElement) => {
    if (target.dataset?.type === "wikilink" || target.dataset?.type === "wikilink-embed") {
        return target;
    }
    return target.closest?.("[data-type='wikilink'], [data-type='wikilink-embed'], .obsidian-wikilink, .obsidian-wikilink-embed") as HTMLElement | null;
};

const resolveIrLink = (target: HTMLElement): Omit<ILinkClickPayload, "action"> | null => {
    if (target.classList.contains("vditor-ir__marker--link")) {
        const href = target.textContent?.trim();
        if (href) {
            return { type: "link", href, text: href, element: target };
        }
    }
    const aNode = hasClosestByAttribute(target, "data-type", "a");
    if (aNode) {
        const href = aNode.querySelector(":scope > .vditor-ir__marker--link")?.textContent?.trim();
        if (href) {
            return { type: "link", href, text: href, element: aNode as HTMLElement };
        }
    }
    return null;
};

export const resolveLinkClickFromTarget = (
    target: EventTarget | null,
    vditor: IVditor,
): Omit<ILinkClickPayload, "action"> | null => {
    if (!target || !(target instanceof HTMLElement)) {
        return null;
    }
    if (isInsideCodeMirror(target) || isInsideCodeBlockChrome(target)) {
        return null;
    }
    if (target.closest(".vditor-ai-dialog-overlay")) {
        return null;
    }

    const footnoteRef = hasClosestByAttribute(target, "data-type", "footnotes-ref");
    if (footnoteRef) {
        const label = footnoteRef.getAttribute("data-footnotes-label") || footnoteRef.textContent?.trim() || "";
        if (label) {
            return { type: "footnote-ref", href: label, text: label, element: footnoteRef as HTMLElement };
        }
    }

    const linkRef = hasClosestByAttribute(target, "data-type", "link-ref");
    if (linkRef) {
        const label = linkRef.getAttribute("data-link-label") || linkRef.textContent?.trim() || "";
        if (label) {
            return { type: "link-ref", href: label, text: label, element: linkRef as HTMLElement };
        }
    }

    const tagEl = hasClosestByAttribute(target, "data-type", "obsidian-tag")
        || target.closest?.(".vditor-obsidian-tag, .obsidian-tag") as HTMLElement | null;
    if (tagEl) {
        const text = tagEl.textContent?.trim() || "";
        const href = text.startsWith("#") ? text.slice(1) : text;
        if (href) {
            return { type: "tag", href, text, element: tagEl };
        }
    }

    const wikiEl = getWikilinkElement(target);
    if (wikiEl) {
        const href = wikiEl.getAttribute("data-href") || wikiEl.dataset?.href || "";
        const isEmbed = wikiEl.dataset?.type === "wikilink-embed"
            || wikiEl.classList.contains("obsidian-wikilink-embed")
            || wikiEl.classList.contains("vditor-wikilink-embed");
        if (href) {
            return {
                type: isEmbed ? "wikilink-embed" : "wikilink",
                href,
                text: wikiEl.textContent?.trim() || href,
                element: wikiEl,
            };
        }
    }

    if (target.tagName === "IMG" && !isPlantumlRenderImage(target)) {
        const img = target as HTMLImageElement;
        const parentA = hasClosestByMatchTag(target, "A") as HTMLAnchorElement | false;
        if (parentA?.href) {
            return {
                type: "link",
                href: parentA.href,
                text: img.alt || parentA.href,
                element: img,
            };
        }
        const src = img.currentSrc || img.src;
        if (src) {
            return { type: "image", href: src, text: img.alt || src, element: img };
        }
    }

    const aElement = hasClosestByMatchTag(target, "A") as HTMLAnchorElement | false;
    if (aElement) {
        const rawHref = aElement.getAttribute("href") || "";
        if (rawHref && rawHref !== "#") {
            return {
                type: "link",
                href: aElement.href,
                text: aElement.textContent?.trim() || aElement.href,
                element: aElement,
            };
        }
    }

    if (vditor.currentMode === "ir") {
        return resolveIrLink(target);
    }

    return null;
};

const defaultLinkClickBehavior = (payload: ILinkClickPayload) => {
    const href = payload.href;
    if (!href) {
        return;
    }
    if (/^https?:\/\//i.test(href) || href.startsWith("file:")) {
        window.open(href, "_blank");
        return;
    }
    if (href.startsWith("#")) {
        const id = href.slice(1);
        const anchor = document.getElementById(id);
        anchor?.scrollIntoView({ block: "center" });
    }
};

export const linkClickEvent = (vditor: IVditor, editorElement: HTMLElement) => {
    const onPointer = (event: MouseEvent) => {
        const payload = resolveLinkClickFromTarget(event.target, vditor);
        if (!payload) {
            return;
        }

        if (event.type === "dblclick" && payload.type === "image") {
            return;
        }

        event.stopPropagation();

        const onLinkClick = vditor.options.onLinkClick;
        if (typeof onLinkClick === "function") {
            onLinkClick({
                ...payload,
                action: getLinkClickAction(event),
            }, event, vditor);
            return;
        }

        if (!shouldTriggerLinkClick(event)) {
            return;
        }
        defaultLinkClickBehavior({
            ...payload,
            action: getLinkClickAction(event),
        });
    };

    // 冒泡阶段，与 util.openLink 一致：先让 pre 内 Vditor UI 处理，再拦截向外传播
    editorElement.addEventListener("click", onPointer);
    editorElement.addEventListener("auxclick", onPointer);
    editorElement.addEventListener("dblclick", onPointer);
};
