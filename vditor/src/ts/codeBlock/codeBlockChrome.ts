import { updateHotkeyTip } from "../util/compatibility";
import { CM_THEME_GROUPS } from "../ui/codeMirrorColorThemes";
import {
    buildCmChromeThemePickerPanelHTML,
    CM_CHROME_THEME_PANEL_CLASS,
    refreshCmChromeThemePickerPanel,
} from "../ui/cmChromeThemePickerPanel";
import { applyCodeMirrorTheme, resolveCodeMirrorTheme } from "../ui/setCodeTheme";
import {
    isInsideCmLangPopover,
    isInsideCmThemePopover,
    registerPopoverOutsideDismiss,
} from "../ui/chromePopoverDismiss";
import {
    filterCodeMirrorLanguageNames,
    isSameCodeMirrorLanguage,
    toCodeBlockLanguageName,
} from "./codeBlockLanguageHints";
import { applyCodeBlockLanguageChange } from "./codeBlockLanguageInput";
import {
    focusCodeMirror,
    getCodeLanguageName,
    isMathBlockElement,
    removeCmCodeBlock,
    resolveCmCodeBlock,
} from "./codeMirrorManager";

const CHROME_CLASS = "vditor-cm-chrome";
const LANG_SEARCH_CLASS = "vditor-cm-chrome__lang-search";

export const isInsideCodeBlockChrome = (target: EventTarget | Node | null) => {
    if (!target) {
        return false;
    }
    const node = target instanceof Element ? target : (target as Node).parentElement;
    return !!node?.closest(`.${CHROME_CLASS}`) || !!node?.closest(".vditor-mermaid-chrome");
};

const codicon = (name: string, className = "") =>
    `<span class="codicon codicon-${name}${className ? ` ${className}` : ""}" aria-hidden="true"></span>`;

interface ICodeBlockChrome {
    root: HTMLElement;
    toolbar: HTMLElement;
    deleteBtn?: HTMLButtonElement;
    copyBtn: HTMLButtonElement;
    langWrap: HTMLElement;
    langTrigger: HTMLButtonElement;
    langLabel: HTMLElement;
    langPanel: HTMLElement;
    langSearch: HTMLInputElement;
    langList: HTMLElement;
    langChevron: HTMLElement;
    themeWrap?: HTMLElement;
    themeTrigger?: HTMLButtonElement;
    themePanel?: HTMLElement;
    editable: boolean;
    langReadonly: boolean;
    getCodeText: () => string;
    langActiveIndex: number;
}

const chromeMap = new WeakMap<HTMLElement, ICodeBlockChrome>();
let openLangChrome: ICodeBlockChrome | null = null;
let openThemeChrome: ICodeBlockChrome | null = null;

registerPopoverOutsideDismiss({
    isActive: () => !!openLangChrome,
    shouldIgnoreTarget: isInsideCmLangPopover,
    dismiss: () => closeLangPanel(),
});
registerPopoverOutsideDismiss({
    isActive: () => !!openThemeChrome,
    shouldIgnoreTarget: isInsideCmThemePopover,
    dismiss: () => closeThemePanel(),
});

const formatLanguageLabel = (languageName: string) => {
    if (!languageName) {
        return window.VditorI18n.plaintext || "Plain Text";
    }
    return languageName.replace(/-/g, " ");
};

const copyToClipboard = async (text: string) => {
    if (!text) {
        return false;
    }
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        return copied;
    }
};

const bindDeleteButton = (
    vditor: IVditor,
    blockElement: HTMLElement,
    deleteBtn: HTMLButtonElement,
) => {
    deleteBtn.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
    deleteBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeLangPanel();
        closeThemePanel();
        const block = resolveCmCodeBlock(vditor, blockElement) || blockElement;
        removeCmCodeBlock(vditor, block);
    });
};

const bindCopyButton = (copyBtn: HTMLButtonElement, getCodeText: () => string) => {
    if (copyBtn.dataset.copyBound === "true") {
        return;
    }
    copyBtn.dataset.copyBound = "true";

    const defaultLabel = window.VditorI18n.copy || "Copy";
    const copiedLabel = window.VditorI18n.copied || "Copied";

    const getCopyIcon = () => copyBtn.querySelector(".vditor-cm-chrome__copy-icon .codicon") as HTMLElement | null;

    const resetCopyState = () => {
        const icon = getCopyIcon();
        copyBtn.setAttribute("aria-label", defaultLabel);
        if (icon) {
            icon.classList.remove("codicon-check");
            icon.classList.add("codicon-copy");
        }
        copyBtn.classList.remove("vditor-cm-chrome__copy--done");
    };

    copyBtn.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
    copyBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const copied = await copyToClipboard(getCodeText());
        if (!copied) {
            return;
        }
        const icon = getCopyIcon();
        copyBtn.setAttribute("aria-label", copiedLabel);
        if (icon) {
            icon.classList.remove("codicon-copy");
            icon.classList.add("codicon-check");
        }
        copyBtn.classList.add("vditor-cm-chrome__copy--done");
        window.clearTimeout(Number(copyBtn.dataset.copyTimer || 0));
        copyBtn.dataset.copyTimer = String(window.setTimeout(() => {
            resetCopyState();
        }, 500));
    });
};

const bindChromeEventIsolation = (root: HTMLElement) => {
    for (const eventName of ["input", "keydown", "keyup"]) {
        root.addEventListener(eventName, (event) => {
            event.stopPropagation();
        });
    }
};

const updateLangChevron = (chevron: HTMLElement, open: boolean) => {
    chevron.classList.remove("codicon-chevron-up", "codicon-chevron-down");
    chevron.classList.add(open ? "codicon-chevron-down" : "codicon-chevron-up");
};

const closeLangPanel = () => {
    if (!openLangChrome) {
        return;
    }
    openLangChrome.langSearch.blur();
    updateLangChevron(openLangChrome.langChevron, false);
    openLangChrome.langWrap.classList.remove("vditor-cm-chrome__lang--open");
    openLangChrome.langWrap.classList.remove("vditor-cm-chrome__lang--focused");
    openLangChrome.langActiveIndex = -1;
    openLangChrome = null;
};

const refreshAllChromeThemePanels = (currentTheme: string) => {
    for (const panel of document.querySelectorAll(
        `.vditor-cm-chrome__theme-panel .${CM_CHROME_THEME_PANEL_CLASS}`,
    )) {
        refreshCmChromeThemePickerPanel(panel as HTMLElement, currentTheme);
    }
};

const closeThemePanel = () => {
    if (!openThemeChrome?.themeWrap) {
        return;
    }
    const chrome = openThemeChrome;
    chrome.themeWrap.classList.remove("vditor-cm-chrome__theme--open");
    openThemeChrome = null;
};

const setThemePanelOpen = (vditor: IVditor, chrome: ICodeBlockChrome, open: boolean) => {
    if (!chrome.themeWrap || !chrome.themePanel) {
        return;
    }
    if (open) {
        closeLangPanel();
        if (openThemeChrome && openThemeChrome !== chrome) {
            closeThemePanel();
        }
        const currentTheme = resolveCodeMirrorTheme(vditor.options);
        chrome.themePanel.innerHTML = buildCmChromeThemePickerPanelHTML(CM_THEME_GROUPS, currentTheme);
        chrome.themeWrap.classList.add("vditor-cm-chrome__theme--open");
        openThemeChrome = chrome;
    } else if (openThemeChrome === chrome) {
        closeThemePanel();
    }
};

const bindThemePanel = (vditor: IVditor, chrome: ICodeBlockChrome) => {
    if (!chrome.themePanel) {
        return;
    }
    chrome.themePanel.addEventListener("click", (event) => {
        event.stopPropagation();
        const button = (event.target as HTMLElement).closest("button[data-theme]") as HTMLElement | null;
        if (!button) {
            return;
        }
        const theme = applyCodeMirrorTheme(vditor, button.getAttribute("data-theme") || "");
        refreshAllChromeThemePanels(theme);
    });
};

const focusLangSearch = (chrome: ICodeBlockChrome) => {
    window.setTimeout(() => {
        chrome.langSearch.focus({ preventScroll: true });
        chrome.langWrap.classList.add("vditor-cm-chrome__lang--focused");
    }, 0);
};

const getLangListItems = (chrome: ICodeBlockChrome) =>
    [...chrome.langList.querySelectorAll(".vditor-cm-chrome__lang-item")] as HTMLElement[];

const updateLangActiveItem = (chrome: ICodeBlockChrome, index: number) => {
    const keepSearchFocus = document.activeElement === chrome.langSearch;
    const items = getLangListItems(chrome);
    if (items.length === 0) {
        chrome.langActiveIndex = -1;
        return;
    }
    const next = ((index % items.length) + items.length) % items.length;
    chrome.langActiveIndex = next;
    for (let i = 0; i < items.length; i++) {
        items[i].classList.toggle("vditor-cm-chrome__lang-item--active", i === next);
    }
    items[next].scrollIntoView({block: "nearest"});
    if (keepSearchFocus) {
        chrome.langSearch.focus({ preventScroll: true });
    }
};

const setLangPanelOpen = (chrome: ICodeBlockChrome, open: boolean) => {
    if (open) {
        closeThemePanel();
        if (openLangChrome && openLangChrome !== chrome) {
            closeLangPanel();
        }
        chrome.langWrap.classList.add("vditor-cm-chrome__lang--open");
        updateLangChevron(chrome.langChevron, true);
        openLangChrome = chrome;
        chrome.langSearch.value = "";
        chrome.langActiveIndex = -1;
        renderLangList(chrome, "");
        focusLangSearch(chrome);
    } else if (openLangChrome === chrome) {
        closeLangPanel();
    }
};

const filterLanguages = (query: string) => filterCodeMirrorLanguageNames(query);

const getChromeCurrentLanguage = (chrome: ICodeBlockChrome) => {
    const blockElement = chrome.root.closest(
        "[data-type='code-block'], [data-type='math-block']",
    ) as HTMLElement | null;
    if (isMathBlockElement(blockElement)) {
        return "math";
    }
    const codeElement = blockElement?.querySelector("pre code") as HTMLElement | null;
    return codeElement ? getCodeLanguageName(codeElement) : "";
};

const applyLanguageReadonlyState = (chrome: ICodeBlockChrome, readonly: boolean) => {
    chrome.langReadonly = readonly;
    chrome.langWrap.classList.toggle("vditor-cm-chrome__lang--readonly", readonly);
    chrome.langTrigger.disabled = readonly;
    chrome.langSearch.disabled = readonly;
    if (readonly) {
        chrome.langTrigger.setAttribute("aria-label", window.VditorI18n.language || "Language");
        if (chrome.langWrap.classList.contains("vditor-cm-chrome__lang--open")) {
            setLangPanelOpen(chrome, false);
        }
    }
};

const renderLangList = (chrome: ICodeBlockChrome, query: string) => {
    chrome.langList.innerHTML = "";
    const languages = filterLanguages(query);
    const currentLanguage = getChromeCurrentLanguage(chrome);
    if (languages.length === 0) {
        const empty = document.createElement("div");
        empty.className = "vditor-cm-chrome__lang-empty";
        empty.textContent = window.VditorI18n.empty || "Empty";
        chrome.langList.appendChild(empty);
        return;
    }
    for (const name of languages) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "vditor-cm-chrome__lang-item";
        if (isSameCodeMirrorLanguage(currentLanguage, name)) {
            item.classList.add("vditor-cm-chrome__lang-item--current");
            item.setAttribute("aria-current", "true");
        }
        item.tabIndex = -1;
        const label = document.createElement("span");
        label.className = "vditor-cm-chrome__lang-item-label";
        label.textContent = name;
        item.appendChild(label);
        if (item.classList.contains("vditor-cm-chrome__lang-item--current")) {
            const desc = document.createElement("span");
            desc.className = "vditor-cm-chrome__lang-item-desc";
            desc.textContent = "current";
            item.appendChild(desc);
        }
        item.setAttribute("data-lang", toCodeBlockLanguageName(name));
        chrome.langList.appendChild(item);
    }
    updateLangActiveItem(chrome, 0);
};

const syncCodeBlockChromeLanguageLabel = (target: HTMLElement, languageName: string) => {
    const chrome = chromeMap.get(target);
    if (!chrome) {
        return;
    }
    const label = formatLanguageLabel(languageName);
    chrome.langLabel.textContent = label;
    chrome.langWrap.dataset.lang = languageName || "plain";
    if (chrome.langWrap.classList.contains("vditor-cm-chrome__lang--open")) {
        renderLangList(chrome, chrome.langSearch.value);
    }
};

export const updateCodeBlockChromeLanguage = (target: HTMLElement, languageName: string) => {
    syncCodeBlockChromeLanguageLabel(target, languageName);
};

const selectLanguage = (vditor: IVditor, blockElement: HTMLElement, chrome: ICodeBlockChrome, lang: string) => {
    const languageName = toCodeBlockLanguageName(lang.trim());
    applyCodeBlockLanguageChange(vditor, blockElement, languageName);
    syncCodeBlockChromeLanguageLabel(blockElement, languageName);
    closeLangPanel();
};

const bindLanguagePanel = (vditor: IVditor, blockElement: HTMLElement, chrome: ICodeBlockChrome) => {
    const getBlock = () => resolveCmCodeBlock(vditor, blockElement) || blockElement;

    chrome.langSearch.addEventListener("input", () => {
        renderLangList(chrome, chrome.langSearch.value);
    });

    chrome.langSearch.addEventListener("focus", () => {
        chrome.langWrap.classList.add("vditor-cm-chrome__lang--focused");
    });

    chrome.langSearch.addEventListener("blur", () => {
        window.setTimeout(() => {
            if (!chrome.langWrap.contains(document.activeElement)) {
                chrome.langWrap.classList.remove("vditor-cm-chrome__lang--focused");
            }
        }, 0);
    });

    chrome.langSearch.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
            closeLangPanel();
            event.preventDefault();
            return;
        }
        if (event.key === "ArrowDown") {
            updateLangActiveItem(chrome, chrome.langActiveIndex + 1);
            event.preventDefault();
            return;
        }
        if (event.key === "ArrowUp") {
            updateLangActiveItem(chrome, chrome.langActiveIndex - 1);
            event.preventDefault();
            return;
        }
        if (event.key === "Enter") {
            const query = chrome.langSearch.value.trim();
            const items = getLangListItems(chrome);
            const activeItem = items[chrome.langActiveIndex];
            if (activeItem?.hasAttribute("data-lang")) {
                selectLanguage(vditor, getBlock(), chrome, activeItem.getAttribute("data-lang") ?? "");
            } else if (query) {
                selectLanguage(vditor, getBlock(), chrome, query);
            }
            event.preventDefault();
        }
    });

    chrome.langList.addEventListener("click", (event) => {
        event.stopPropagation();
        const item = (event.target as HTMLElement).closest(".vditor-cm-chrome__lang-item") as HTMLElement;
        if (!item?.hasAttribute("data-lang")) {
            return;
        }
        selectLanguage(vditor, getBlock(), chrome, item.getAttribute("data-lang") ?? "");
    });
};

const createChromeRoot = (editable: boolean) => {
    const root = document.createElement("div");
    root.className = CHROME_CLASS;

    const toolbar = document.createElement("div");
    toolbar.className = "vditor-cm-chrome__toolbar";

    const langWrap = document.createElement("div");
    langWrap.className = "vditor-cm-chrome__lang";

    const langTrigger = document.createElement("button");
    langTrigger.type = "button";
    langTrigger.className = "vditor-cm-chrome__lang-trigger";
    langTrigger.setAttribute(
        "aria-label",
        (window.VditorI18n.language || "Language") + "<" + updateHotkeyTip("⌥Enter") + ">",
    );
    langTrigger.innerHTML =
        `<span class="vditor-cm-chrome__lang-label"></span>` +
        `<span class="vditor-cm-chrome__lang-chevron">${codicon("chevron-up")}</span>`;
    langWrap.appendChild(langTrigger);
    const langChevron = langTrigger.querySelector(".vditor-cm-chrome__lang-chevron .codicon") as HTMLElement;

    const langPanel = document.createElement("div");
    langPanel.className = "vditor-cm-chrome__lang-panel";

    const langSearch = document.createElement("input");
    langSearch.type = "text";
    langSearch.className = LANG_SEARCH_CLASS;
    langSearch.setAttribute("placeholder", "Search language");
    langPanel.appendChild(langSearch);

    const langList = document.createElement("div");
    langList.className = "vditor-cm-chrome__lang-list";
    langPanel.appendChild(langList);

    langWrap.appendChild(langPanel);

    const actions = document.createElement("div");
    actions.className = "vditor-cm-chrome__actions";

    let themeWrap: HTMLElement | undefined;
    let themeTrigger: HTMLButtonElement | undefined;
    let themePanel: HTMLElement | undefined;
    if (editable) {
        themeWrap = document.createElement("div");
        themeWrap.className = "vditor-cm-chrome__theme";

        themeTrigger = document.createElement("button");
        themeTrigger.type = "button";
        themeTrigger.className = "vditor-cm-chrome__theme-trigger";
        themeTrigger.setAttribute("aria-label", window.VditorI18n["code-theme"] || "CodeMirror Theme");
        themeTrigger.innerHTML = `<span class="vditor-cm-chrome__theme-icon">${codicon("color-mode")}</span>`;
        themeWrap.appendChild(themeTrigger);

        themePanel = document.createElement("div");
        themePanel.className = "vditor-cm-chrome__theme-panel";
        themeWrap.appendChild(themePanel);
        actions.appendChild(themeWrap);
    }

    let deleteBtn: HTMLButtonElement | undefined;
    if (editable) {
        deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "vditor-cm-chrome__delete";
        deleteBtn.setAttribute("aria-label", window.VditorI18n.remove || "Remove");
        deleteBtn.innerHTML = `<span class="vditor-cm-chrome__delete-icon">${codicon("trash")}</span>`;
        actions.appendChild(deleteBtn);
    }

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "vditor-cm-chrome__copy";
    copyBtn.setAttribute("aria-label", window.VditorI18n.copy || "Copy");
    copyBtn.innerHTML = `<span class="vditor-cm-chrome__copy-icon">${codicon("copy")}</span>`;
    actions.appendChild(copyBtn);

    toolbar.appendChild(langWrap);
    toolbar.appendChild(actions);
    root.appendChild(toolbar);

    if (!editable) {
        langTrigger.disabled = true;
        langSearch.disabled = true;
    }

    return {
        root,
        toolbar,
        deleteBtn,
        copyBtn,
        langWrap,
        langTrigger,
        langLabel: langTrigger.querySelector(".vditor-cm-chrome__lang-label") as HTMLElement,
        langPanel,
        langSearch,
        langList,
        langChevron,
        themeWrap,
        themeTrigger,
        themePanel,
    };
};

export const ensurePreviewCodeBlockChrome = (
    host: HTMLElement,
    languageName: string,
    getCodeText: () => string,
) => {
    if (chromeMap.has(host)) {
        const chrome = chromeMap.get(host)!;
        chrome.getCodeText = getCodeText;
        updateCodeBlockChromeLanguage(host, languageName);
        return;
    }

    const created = createChromeRoot(false);
    const chrome: ICodeBlockChrome = {
        ...created,
        editable: false,
        langReadonly: true,
        getCodeText,
        langActiveIndex: -1,
    };
    chromeMap.set(host, chrome);
    host.insertBefore(chrome.root, host.firstChild);
    bindCopyButton(chrome.copyBtn, () => chrome.getCodeText());
    updateCodeBlockChromeLanguage(host, languageName);
};

export const removePreviewCodeBlockChrome = (host: HTMLElement) => {
    removeCodeBlockChrome(host);
};

export const ensureCodeBlockChrome = (
    vditor: IVditor,
    blockElement: HTMLElement,
    options: {
        editable?: boolean;
        languageReadonly?: boolean;
        getCodeText: () => string;
    },
) => {
    const host = blockElement.querySelector("pre.vditor-cm-host, pre.vditor-cm-preview-host") as HTMLElement;
    if (!host) {
        return;
    }

    let chrome = chromeMap.get(blockElement);
    const editable = options.editable !== false;
    const languageReadonly = options.languageReadonly ?? isMathBlockElement(blockElement);

    if (!chrome) {
        const created = createChromeRoot(editable);
        chrome = {
            ...created,
            editable,
            langReadonly: languageReadonly,
            getCodeText: options.getCodeText,
            langActiveIndex: -1,
        };
        chromeMap.set(blockElement, chrome);
        host.insertBefore(chrome.root, host.firstChild);
        bindCopyButton(chrome.copyBtn, () => chrome.getCodeText());
        if (chrome.deleteBtn) {
            bindDeleteButton(vditor, blockElement, chrome.deleteBtn);
        }
        bindChromeEventIsolation(chrome.root);
        applyLanguageReadonlyState(chrome, languageReadonly);

        if (editable && !languageReadonly) {
            chrome.langWrap.addEventListener("mousedown", (event) => {
                event.stopPropagation();
            });
            chrome.langPanel.addEventListener("mousedown", (event) => {
                event.stopPropagation();
            });
            chrome.langSearch.addEventListener("mousedown", (event) => {
                event.stopPropagation();
            });
            chrome.langTrigger.addEventListener("mousedown", (event) => {
                event.stopPropagation();
            });
            chrome.langTrigger.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                const isOpen = chrome!.langWrap.classList.contains("vditor-cm-chrome__lang--open");
                setLangPanelOpen(chrome!, !isOpen);
            });
            bindLanguagePanel(vditor, blockElement, chrome);
        }
        if (editable && chrome.themeWrap && chrome.themeTrigger) {
            chrome.themeWrap.addEventListener("mousedown", (event) => {
                event.stopPropagation();
            });
            chrome.themePanel?.addEventListener("mousedown", (event) => {
                event.stopPropagation();
            });
            chrome.themeTrigger.addEventListener("mousedown", (event) => {
                event.stopPropagation();
            });
            chrome.themeTrigger.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                const isOpen = chrome!.themeWrap!.classList.contains("vditor-cm-chrome__theme--open");
                setThemePanelOpen(vditor, chrome!, !isOpen);
            });
            bindThemePanel(vditor, chrome);
        }
    }

    chrome.getCodeText = options.getCodeText;
    chrome.editable = editable;
    applyLanguageReadonlyState(chrome, languageReadonly);

    const codeElement = blockElement.querySelector("pre code") as HTMLElement;
    const languageName = isMathBlockElement(blockElement) ? "math" : (codeElement ? getCodeLanguageName(codeElement) : "");
    updateCodeBlockChromeLanguage(blockElement, languageName);
};

export const removeCodeBlockChrome = (target: HTMLElement) => {
    const chrome = chromeMap.get(target);
    if (!chrome) {
        return;
    }
    if (openLangChrome === chrome) {
        closeLangPanel();
    }
    if (openThemeChrome === chrome) {
        closeThemePanel();
    }
    chrome.root.remove();
    chromeMap.delete(target);
};

export const focusCodeBlockChromeLanguage = (vditor: IVditor, blockElement?: HTMLElement | null) => {
    const block = resolveCmCodeBlock(vditor, blockElement);
    if (!block) {
        return false;
    }
    const chrome = chromeMap.get(block);
    if (!chrome || !chrome.editable || chrome.langReadonly) {
        return false;
    }
    setLangPanelOpen(chrome, true);
    return true;
};
