import {Constants} from "../constants";
import {addScript} from "../util/addScript";
import {MERMAID_THEME_ATTR} from "../ui/mermaidThemeCatalog";
import {resolveMermaidTheme} from "../ui/setMermaidTheme";
import {mermaidRenderAdapter} from "./adapterRender";
import {ensureMermaidChrome} from "./mermaidChrome";
import {buildMermaidInitConfig, findVditorRoot} from "./mermaidTheme";

declare const mermaid: {
    initialize(options: unknown): void,
    render(
        id: string,
        code: string,
        container?: Element,
    ): Promise<{ svg: string; bindFunctions?: (element: Element) => void }>,
};

const MERMAID_PROCESSED_ATTR = "data-vditor-mermaid-processed";
const MERMAID_SOURCE_ATTR = "data-mermaid";

const MERMAID_BASE_CONFIG = {
    altFontFamily: "sans-serif",
    flowchart: {
        htmlLabels: true,
        useMaxWidth: true,
    },
    fontFamily: "sans-serif",
    gantt: {
        leftPadding: 75,
        rightPadding: 20,
    },
    securityLevel: "loose",
    sequence: {
        boxMargin: 8,
        diagramMarginX: 8,
        diagramMarginY: 8,
        useMaxWidth: true,
    },
    startOnLoad: false,
};

let renderCounter = 0;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

const storeMermaidSource = (item: Element, code: string) => {
    if (!item.getAttribute(MERMAID_SOURCE_ATTR) && code.trim()) {
        item.setAttribute(MERMAID_SOURCE_ATTR, code);
    }
};

const getMermaidSource = (item: Element) => {
    return item.getAttribute(MERMAID_SOURCE_ATTR) || mermaidRenderAdapter.getCode(item);
};

const clearMermaidElement = (item: HTMLElement) => {
    item.removeAttribute("data-processed");
    item.removeAttribute(MERMAID_PROCESSED_ATTR);
    item.removeAttribute("id");
    item.classList.remove("vditor-reset--error");
    const source = item.getAttribute(MERMAID_SOURCE_ATTR);
    if (source) {
        item.textContent = source;
        return;
    }
    item.innerHTML = "";
};

const renderSingleMermaid = async (item: HTMLElement, code: string, index: number) => {
    clearMermaidElement(item);
    const renderId = `vditor-mermaid-${++renderCounter}-${Date.now()}-${index}`;
    try {
        const {svg, bindFunctions} = await mermaid.render(renderId, code, item);
        item.innerHTML = svg;
        bindFunctions?.(item);
        item.setAttribute(MERMAID_PROCESSED_ATTR, "true");
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        item.className = "language-mermaid vditor-reset--error";
        item.textContent = `mermaid render error: ${message}`;
        item.setAttribute(MERMAID_PROCESSED_ATTR, "true");
    }
};

const getThemeId = (themeRoot: HTMLElement, vditor?: IVditor) => {
    if (vditor) {
        return resolveMermaidTheme(vditor.options);
    }
    return themeRoot.getAttribute(MERMAID_THEME_ATTR) || "Auto";
};

const renderMermaidElements = async (
    mermaidElements: NodeListOf<Element>,
    themeRoot: HTMLElement,
    vditor?: IVditor,
) => {
    const themeId = getThemeId(themeRoot, vditor);
    const themeConfig = buildMermaidInitConfig(themeId, themeRoot);
    mermaid.initialize({...MERMAID_BASE_CONFIG, ...themeConfig});
    for (let i = 0; i < mermaidElements.length; i++) {
        const item = mermaidElements[i] as HTMLElement;
        if (item.getAttribute(MERMAID_PROCESSED_ATTR) === "true") {
            continue;
        }
        const code = getMermaidSource(item).trim();
        if (!code) {
            continue;
        }
        storeMermaidSource(item, code);
        await renderSingleMermaid(item, code, i);
        if (vditor) {
            ensureMermaidChrome(vditor, item);
        }
    }
};

const doRefreshMermaidTheme = (root: HTMLElement, cdn: string, vditor?: IVditor) => {
    const mermaidElements = root.querySelectorAll(`.language-mermaid[${MERMAID_PROCESSED_ATTR}='true']`);
    if (mermaidElements.length === 0) {
        return;
    }
    for (let i = 0; i < mermaidElements.length; i++) {
        clearMermaidElement(mermaidElements[i] as HTMLElement);
    }
    addScript(`${cdn}/dist/js/mermaid/mermaid.min.js`, "vditorMermaidScript").then(() => {
        renderMermaidElements(mermaidElements, root, vditor);
    });
};

export const mermaidRender = (
    element: HTMLElement,
    cdn = Constants.CDN,
    vditorOrThemeRoot?: IVditor | HTMLElement,
) => {
    const mermaidElements = mermaidRenderAdapter.getElements(element);
    if (mermaidElements.length === 0) {
        return;
    }
    let themeRoot: HTMLElement;
    let vditor: IVditor | undefined;
    if (vditorOrThemeRoot && "options" in vditorOrThemeRoot) {
        vditor = vditorOrThemeRoot;
        themeRoot = vditor.element;
    } else {
        themeRoot = (vditorOrThemeRoot as HTMLElement | undefined) ?? findVditorRoot(element);
    }
    addScript(`${cdn}/dist/js/mermaid/mermaid.min.js`, "vditorMermaidScript").then(() => {
        renderMermaidElements(mermaidElements, themeRoot, vditor);
    });
};

export const refreshMermaidTheme = (root: HTMLElement, cdn = Constants.CDN, vditor?: IVditor) => {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        doRefreshMermaidTheme(root, cdn, vditor);
    }, 50);
};
