import {updateHotkeyTip} from "../util/compatibility";
import {filterCodeMirrorLanguageNames} from "./codeBlockLanguageHints";
import {applyCodeBlockLanguageChange} from "./codeBlockLanguageInput";
import {
    focusCodeMirror,
    getCodeLanguageName,
    resolveCmCodeBlock,
} from "./codeMirrorManager";

const CHROME_CLASS = "vditor-cm-chrome";
const LANG_SEARCH_CLASS = "vditor-cm-chrome__lang-search";

export const isInsideCodeBlockChrome = (target: EventTarget | Node | null) => {
    if (!target) {
        return false;
    }
    const node = target instanceof Element ? target : (target as Node).parentElement;
    return !!node?.closest(`.${CHROME_CLASS}`);
};

const COPY_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path fill="currentColor" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>`;
const CHEVRON_ICON = `<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="m4.427 9.427 3.396-3.396a.25.25 0 0 1 .354-.354l3.396 3.396a.25.25 0 0 1-.354.354L4.604 6.604a.25.25 0 0 1-.177.427Z"/></svg>`;

interface ICodeBlockChrome {
    root: HTMLElement;
    toolbar: HTMLElement;
    copyBtn: HTMLButtonElement;
    copyLabel: HTMLElement;
    langWrap: HTMLElement;
    langTrigger: HTMLButtonElement;
    langLabel: HTMLElement;
    langPanel: HTMLElement;
    langSearch: HTMLInputElement;
    langList: HTMLElement;
    editable: boolean;
    getCodeText: () => string;
    langActiveIndex: number;
}

const chromeMap = new WeakMap<HTMLElement, ICodeBlockChrome>();
let openLangChrome: ICodeBlockChrome | null = null;
let documentCloseBound = false;

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

const bindCopyButton = (copyBtn: HTMLButtonElement, copyLabel: HTMLElement, getCodeText: () => string) => {
    const defaultLabel = window.VditorI18n.copy || "Copy";
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
        const copiedLabel = window.VditorI18n.copied || "Copied";
        copyLabel.textContent = copiedLabel;
        copyBtn.classList.add("vditor-cm-chrome__copy--done");
        window.clearTimeout(Number(copyBtn.dataset.copyTimer || 0));
        copyBtn.dataset.copyTimer = String(window.setTimeout(() => {
            copyLabel.textContent = defaultLabel;
            copyBtn.classList.remove("vditor-cm-chrome__copy--done");
        }, 1600));
    });
};

const bindChromeEventIsolation = (root: HTMLElement) => {
    for (const eventName of ["input", "keydown", "keyup"]) {
        root.addEventListener(eventName, (event) => {
            event.stopPropagation();
        });
    }
};

const ensureDocumentCloseListener = () => {
    if (documentCloseBound) {
        return;
    }
    documentCloseBound = true;
    const handleOutsidePointer = (event: Event) => {
        if (!openLangChrome) {
            return;
        }
        const target = event.target as Element | null;
        if (target?.closest(".vditor-cm-chrome__lang")) {
            return;
        }
        closeLangPanel();
    };
    document.addEventListener("mousedown", handleOutsidePointer, true);
    document.addEventListener("pointerdown", handleOutsidePointer, true);
};

const closeLangPanel = () => {
    if (!openLangChrome) {
        return;
    }
    openLangChrome.langSearch.blur();
    openLangChrome.langWrap.classList.remove("vditor-cm-chrome__lang--open");
    openLangChrome.langWrap.classList.remove("vditor-cm-chrome__lang--focused");
    openLangChrome.langActiveIndex = -1;
    openLangChrome = null;
};

const scrollLangItemIntoView = (list: HTMLElement, item: HTMLElement) => {
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;
    if (itemTop < viewTop) {
        list.scrollTop = itemTop;
    } else if (itemBottom > viewBottom) {
        list.scrollTop = itemBottom - list.clientHeight;
    }
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
    scrollLangItemIntoView(chrome.langList, items[next]);
    if (keepSearchFocus) {
        chrome.langSearch.focus({ preventScroll: true });
    }
};

const setLangPanelOpen = (chrome: ICodeBlockChrome, open: boolean) => {
    if (open) {
        ensureDocumentCloseListener();
        if (openLangChrome && openLangChrome !== chrome) {
            closeLangPanel();
        }
        chrome.langWrap.classList.add("vditor-cm-chrome__lang--open");
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

const renderLangList = (chrome: ICodeBlockChrome, query: string) => {
    chrome.langList.innerHTML = "";
    const languages = filterLanguages(query);
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
        item.tabIndex = -1;
        item.textContent = name;
        item.dataset.lang = name;
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
    applyCodeBlockLanguageChange(vditor, blockElement, lang);
    syncCodeBlockChromeLanguageLabel(blockElement, lang.trim());
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
            const lang = activeItem?.dataset.lang || query;
            if (lang) {
                selectLanguage(vditor, getBlock(), chrome, lang);
            }
            event.preventDefault();
        }
    });

    chrome.langList.addEventListener("mousemove", (event) => {
        const item = (event.target as HTMLElement).closest(".vditor-cm-chrome__lang-item") as HTMLElement;
        if (!item) {
            return;
        }
        const items = getLangListItems(chrome);
        const index = items.indexOf(item);
        if (index > -1 && index !== chrome.langActiveIndex) {
            updateLangActiveItem(chrome, index);
        }
    });

    chrome.langList.addEventListener("click", (event) => {
        event.stopPropagation();
        const item = (event.target as HTMLElement).closest(".vditor-cm-chrome__lang-item") as HTMLElement;
        if (!item?.dataset.lang) {
            return;
        }
        selectLanguage(vditor, getBlock(), chrome, item.dataset.lang);
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
        `<span class="vditor-cm-chrome__lang-chevron">${CHEVRON_ICON}</span>`;
    langWrap.appendChild(langTrigger);

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

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "vditor-cm-chrome__copy";
    const copyLabel = document.createElement("span");
    copyLabel.className = "vditor-cm-chrome__copy-label";
    copyLabel.textContent = window.VditorI18n.copy || "Copy";
    copyBtn.innerHTML = `<span class="vditor-cm-chrome__copy-icon">${COPY_ICON}</span>`;
    copyBtn.appendChild(copyLabel);

    toolbar.appendChild(langWrap);
    toolbar.appendChild(copyBtn);
    root.appendChild(toolbar);

    if (!editable) {
        langTrigger.disabled = true;
        langSearch.disabled = true;
    }

    return {
        root,
        toolbar,
        copyBtn,
        copyLabel,
        langWrap,
        langTrigger,
        langLabel: langTrigger.querySelector(".vditor-cm-chrome__lang-label") as HTMLElement,
        langPanel,
        langSearch,
        langList,
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
        getCodeText,
        langActiveIndex: -1,
    };
    chromeMap.set(host, chrome);
    host.insertBefore(chrome.root, host.firstChild);
    bindCopyButton(chrome.copyBtn, chrome.copyLabel, () => chrome.getCodeText());
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
        getCodeText: () => string;
    },
) => {
    const host = blockElement.querySelector("pre.vditor-cm-host, pre.vditor-cm-preview-host") as HTMLElement;
    if (!host) {
        return;
    }

    let chrome = chromeMap.get(blockElement);
    const editable = options.editable !== false;

    if (!chrome) {
        const created = createChromeRoot(editable);
        chrome = {
            ...created,
            editable,
            getCodeText: options.getCodeText,
            langActiveIndex: -1,
        };
        chromeMap.set(blockElement, chrome);
        host.insertBefore(chrome.root, host.firstChild);
        bindCopyButton(chrome.copyBtn, chrome.copyLabel, () => chrome.getCodeText());
        bindChromeEventIsolation(chrome.root);
        ensureDocumentCloseListener();

        if (editable) {
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
    }

    chrome.getCodeText = options.getCodeText;
    chrome.editable = editable;

    const codeElement = blockElement.querySelector("pre code") as HTMLElement;
    updateCodeBlockChromeLanguage(blockElement, codeElement ? getCodeLanguageName(codeElement) : "");
};

export const removeCodeBlockChrome = (target: HTMLElement) => {
    const chrome = chromeMap.get(target);
    if (!chrome) {
        return;
    }
    if (openLangChrome === chrome) {
        closeLangPanel();
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
    if (!chrome || !chrome.editable) {
        return false;
    }
    setLangPanelOpen(chrome, true);
    return true;
};
