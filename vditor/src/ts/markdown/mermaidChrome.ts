import { isInsideMermaidThemePopover, registerPopoverOutsideDismiss } from "../ui/chromePopoverDismiss";
import { MERMAID_THEME_GROUPS } from "../ui/mermaidThemeCatalog";
import { applyMermaidTheme, resolveMermaidTheme } from "../ui/setMermaidTheme";
import { MERMAID_THEME_PANEL_CLASS } from "../ui/themePickerPanel";
import { buildMermaidThemePickerPanelHTML, refreshMermaidThemePickerPanel } from "../ui/mermaidThemePickerPanel";
import { codicon } from "../util/codicon";
import { svgAsPngUri } from "save-svg-as-png";
import { showToast } from "../ui/toast";

const MERMAID_HOST_CLASS = "vditor-mermaid-host";
const MERMAID_CHROME_CLASS = "vditor-mermaid-chrome";
const MERMAID_THEME_OPEN_CLASS = "vditor-mermaid-chrome__theme--open";

interface IMermaidChrome {
    host: HTMLElement;
    themeWrap: HTMLElement;
    themeTrigger: HTMLButtonElement;
    themePanel: HTMLElement;
}

const chromeMap = new WeakMap<HTMLElement, IMermaidChrome>();
let openThemeChrome: IMermaidChrome | null = null;

const syncMermaidPanelTheme = (panel: HTMLElement, theme: string) => {
    panel.setAttribute("data-mermaid-theme", theme);
};

const closeThemePanel = () => {
    if (!openThemeChrome) {
        return;
    }
    const chrome = openThemeChrome;
    chrome.themeWrap.classList.remove(MERMAID_THEME_OPEN_CLASS);
    openThemeChrome = null;
};

registerPopoverOutsideDismiss({
    isActive: () => !!openThemeChrome,
    shouldIgnoreTarget: isInsideMermaidThemePopover,
    dismiss: () => closeThemePanel(),
});

const refreshAllMermaidThemePanels = (currentTheme: string) => {
    for (const panel of document.querySelectorAll(
        `.vditor-mermaid-chrome__theme-panel .${MERMAID_THEME_PANEL_CLASS}`,
    )) {
        refreshMermaidThemePickerPanel(panel as HTMLElement, currentTheme);
    }
};

const setThemePanelOpen = (vditor: IVditor, chrome: IMermaidChrome, open: boolean) => {
    if (open) {
        if (openThemeChrome && openThemeChrome !== chrome) {
            closeThemePanel();
        }
        const currentTheme = resolveMermaidTheme(vditor.options);
        chrome.themePanel.innerHTML = buildMermaidThemePickerPanelHTML(MERMAID_THEME_GROUPS, currentTheme);
        syncMermaidPanelTheme(chrome.themePanel, currentTheme);
        chrome.themeWrap.classList.add(MERMAID_THEME_OPEN_CLASS);
        openThemeChrome = chrome;
        syncMermaidPanelTheme(chrome.themePanel, currentTheme);
    } else if (openThemeChrome === chrome) {
        closeThemePanel();
    }
};

const bindThemePanel = (vditor: IVditor, chrome: IMermaidChrome) => {
    chrome.themePanel.addEventListener("click", (event) => {
        event.stopPropagation();
        const button = (event.target as HTMLElement).closest("button[data-theme]") as HTMLElement | null;
        if (!button) {
            return;
        }
        const theme = applyMermaidTheme(vditor, button.getAttribute("data-theme") || "");
        refreshAllMermaidThemePanels(theme);
        chrome.host.setAttribute("data-mermaid-theme", theme);
        syncMermaidPanelTheme(chrome.themePanel, theme);
    });
};

const createMermaidChrome = () => {
    const chromeRoot = document.createElement("div");
    chromeRoot.className = MERMAID_CHROME_CLASS;

    const toolbar = document.createElement("div");
    toolbar.className = "vditor-mermaid-chrome__toolbar";

    const spacer = document.createElement("div");
    spacer.className = "vditor-mermaid-chrome__spacer";
    toolbar.appendChild(spacer);

    const actions = document.createElement("div");
    actions.className = "vditor-mermaid-chrome__actions";

    const themeWrap = document.createElement("div");
    themeWrap.className = "vditor-mermaid-chrome__theme";

    const themeTrigger = document.createElement("button");
    themeTrigger.type = "button";
    themeTrigger.className = "vditor-mermaid-chrome__theme-trigger";
    themeTrigger.setAttribute("aria-label", window.VditorI18n["mermaid-theme"] || "Mermaid Theme");
    themeTrigger.innerHTML = `<span class="vditor-mermaid-chrome__theme-icon">${codicon("color-mode")}</span>`;
    themeWrap.appendChild(themeTrigger);

    const themePanel = document.createElement("div");
    themePanel.className = "vditor-mermaid-chrome__theme-panel";
    themeWrap.appendChild(themePanel);

    actions.appendChild(themeWrap);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "vditor-mermaid-chrome__copy-btn";
    copyBtn.setAttribute("aria-label", "Copy as image");
    copyBtn.innerHTML = `<span class="vditor-mermaid-chrome__copy-icon">${codicon("copy")}</span>`;
    actions.appendChild(copyBtn);

    toolbar.appendChild(actions);
    chromeRoot.appendChild(toolbar);

    return { chromeRoot, themeWrap, themeTrigger, themePanel, copyBtn };
};

export const ensureMermaidHost = (mermaidElement: HTMLElement) => {
    const parent = mermaidElement.parentElement;
    if (parent?.classList.contains(MERMAID_HOST_CLASS)) {
        return parent;
    }

    const host = document.createElement("div");
    host.className = MERMAID_HOST_CLASS;
    if (parent) {
        parent.insertBefore(host, mermaidElement);
        host.appendChild(mermaidElement);
    }
    return host;
};

export const ensureMermaidChrome = (vditor: IVditor, mermaidElement: HTMLElement) => {
    const host = ensureMermaidHost(mermaidElement);
    const theme = resolveMermaidTheme(vditor.options);
    host.setAttribute("data-mermaid-theme", theme);

    let chrome = chromeMap.get(host);
    if (chrome) {
        syncMermaidPanelTheme(chrome.themePanel, theme);
        return;
    }

    const created = createMermaidChrome();
    chrome = {
        host,
        themeWrap: created.themeWrap,
        themeTrigger: created.themeTrigger,
        themePanel: created.themePanel,
    };
    chromeMap.set(host, chrome);
    host.insertBefore(created.chromeRoot, host.firstChild);
    syncMermaidPanelTheme(chrome.themePanel, theme);

    created.themeWrap.addEventListener("mousedown", (event) => {
        event.stopPropagation();
    });
    created.themePanel.addEventListener("mousedown", (event) => {
        event.stopPropagation();
    });
    created.themeTrigger.addEventListener("mousedown", (event) => {
        event.stopPropagation();
    });
    created.themeTrigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = chrome!.themeWrap.classList.contains(MERMAID_THEME_OPEN_CLASS);
        setThemePanelOpen(vditor, chrome!, !isOpen);
    });
    bindThemePanel(vditor, chrome);

    created.copyBtn.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
    created.copyBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const svg = host.querySelector("svg");
        if (!svg) return;
        try {
            const scale = window.devicePixelRatio || 1;
            const uri = await svgAsPngUri(svg, { scale });
            const res = await fetch(uri);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            const icon = created.copyBtn.querySelector(".codicon");
            if (icon) {
                icon.className = "codicon codicon-check";
                setTimeout(() => { icon.className = "codicon codicon-copy"; }, 1500);
            }
        } catch (error) {
            showToast(vditor, window.VditorI18n.copyFailed, 1000, "error");
        }
    });
};

export const removeMermaidChrome = (host: HTMLElement) => {
    const chrome = chromeMap.get(host);
    if (!chrome) {
        return;
    }
    if (openThemeChrome === chrome) {
        closeThemePanel();
    }
    chrome.host.querySelector(`.${MERMAID_CHROME_CLASS}`)?.remove();
    chromeMap.delete(host);
};

export const isInsideMermaidChrome = (target: EventTarget | Node | null) => {
    if (!target) {
        return false;
    }
    const node = target instanceof Element ? target : (target as Node).parentElement;
    return !!node?.closest(`.${MERMAID_CHROME_CLASS}`);
};
