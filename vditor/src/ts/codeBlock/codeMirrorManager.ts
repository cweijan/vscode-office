import {indentWithTab} from "@codemirror/commands";
import {LanguageDescription, LanguageSupport} from "@codemirror/language";
import {languages} from "@codemirror/language-data";
import {Compartment, EditorSelection} from "@codemirror/state";
import {EditorView, keymap} from "@codemirror/view";

import {processAfterRender} from "../ir/process";
import {Constants} from "../constants";
import {afterRenderEvent} from "../wysiwyg/afterRenderEvent";
import {vditorCodeMirrorSetup} from "./codeMirrorSetup";

export {focusCodeBlockLanguageInput, showCodeBlockLanguagePopover} from "./codeBlockLanguagePopover";

const SPECIAL_LANGUAGES = [
    "mermaid", "plantuml", "math",
];

const CM_HOST_CLASS = "vditor-cm-host";
export const CM_BLOCK_CLASS = "vditor-code-block--cm";

interface CodeMirrorBinding {
    view: EditorView;
    languageCompartment: Compartment;
    editPre: HTMLElement;
    syncCode: HTMLElement;
    updating: boolean;
    syncTimer: number;
    languageName: string;
}

const bindings = new WeakMap<HTMLElement, CodeMirrorBinding>();

const languageMap: Record<string, LanguageDescription> = {};
for (const language of languages) {
    languageMap[language.name.toLowerCase()] = language;
    for (const alias of language.alias) {
        languageMap[alias.toLowerCase()] = language;
    }
}

export const isSpecialCodeLanguage = (codeElement: HTMLElement) => {
    for (const lang of SPECIAL_LANGUAGES) {
        if (codeElement.classList.contains(`language-${lang}`)) {
            return true;
        }
    }
    return false;
};

export const isCmCodeBlock = (blockElement: HTMLElement | null) => {
    if (!blockElement || blockElement.getAttribute("data-type") !== "code-block") {
        return false;
    }
    const code = blockElement.querySelector(
        "pre.vditor-wysiwyg__pre code, pre.vditor-ir__marker--pre code, pre:first-child code",
    ) as HTMLElement;
    return !!code && !isSpecialCodeLanguage(code);
};

/** @deprecated use isCmCodeBlock */
export const isWysiwygCmCodeBlock = isCmCodeBlock;

export const isInsideCodeMirror = (target: EventTarget | Node | null) => {
    if (!target) {
        return !!document.activeElement?.closest(`.${CM_BLOCK_CLASS} .cm-editor`);
    }
    const node = target instanceof Element ? target : (target as Node).parentElement;
    return !!node?.closest(`.${CM_BLOCK_CLASS} .cm-editor`);
};

/** @deprecated use isInsideCodeMirror */
export const isInsideWysiwygCodeMirror = isInsideCodeMirror;

export const getCodeLanguageName = (codeElement: HTMLElement) => {
    const match = codeElement.className.match(/language-([^\s]+)/);
    return match ? match[1] : "";
};

/** @deprecated use getCodeLanguageName */
const getLanguageName = getCodeLanguageName;

export const shouldShowLanguagePopover = (blockElement: HTMLElement | null) => {
    if (!blockElement || blockElement.getAttribute("data-type") !== "code-block") {
        return false;
    }
    return hasCodeMirror(blockElement) || isCmCodeBlock(blockElement);
};

export const resolveCmCodeBlock = (vditor: IVditor, blockElement?: HTMLElement | null) => {
    if (blockElement?.isConnected && shouldShowLanguagePopover(blockElement)) {
        return blockElement;
    }
    const fromActive = document.activeElement?.closest("[data-type='code-block']") as HTMLElement;
    if (fromActive?.isConnected && shouldShowLanguagePopover(fromActive)) {
        return fromActive;
    }
    const editor = getModeEditor(vditor);
    if (editor) {
        const focusedCm = editor.querySelector(`.${CM_BLOCK_CLASS} .cm-editor.cm-focused`);
        const fromCm = focusedCm?.closest("[data-type='code-block']") as HTMLElement;
        if (fromCm?.isConnected && shouldShowLanguagePopover(fromCm)) {
            return fromCm;
        }
    }
    return blockElement?.isConnected ? blockElement : null;
};

let popoverModulePromise: Promise<typeof import("./codeBlockLanguagePopover")> | null = null;
const getPopoverModule = () => {
    if (!popoverModulePromise) {
        popoverModulePromise = import("./codeBlockLanguagePopover");
    }
    return popoverModulePromise;
};

const showLanguagePopover = (vditor: IVditor, blockElement: HTMLElement) => {
    const block = resolveCmCodeBlock(vditor, blockElement);
    if (!block) {
        return;
    }
    void getPopoverModule().then((module) => {
        module.showCodeBlockLanguagePopover(vditor, block);
    });
};

const getBlockParts = (blockElement: HTMLElement) => {
    const editPre = blockElement.querySelector(
        "pre.vditor-wysiwyg__pre, pre.vditor-ir__marker--pre, pre:first-child",
    ) as HTMLElement;
    if (!editPre) {
        return null;
    }
    const code = editPre.querySelector("code");
    if (!code) {
        return null;
    }
    const preview = blockElement.querySelector(
        ".vditor-wysiwyg__preview, .vditor-ir__preview",
    ) as HTMLElement;
    return {editPre, code, preview};
};

const getModeEditor = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        return vditor.wysiwyg.element;
    }
    if (vditor.currentMode === "ir") {
        return vditor.ir.element;
    }
    return null;
};

const getCodeBlockSelector = (mode: string) => {
    if (mode === "wysiwyg") {
        return ".vditor-wysiwyg__block[data-type='code-block']";
    }
    return "[data-type='code-block']";
};

/** 普通代码块只保留隐藏的 sync code + CodeMirror，移除 legacy 预览 DOM */
export const prepareCmBlockDom = (blockElement: HTMLElement) => {
    if (!isCmCodeBlock(blockElement)) {
        return;
    }
    const parts = getBlockParts(blockElement);
    if (!parts) {
        return;
    }
    const {editPre, code, preview} = parts;
    blockElement.classList.add(CM_BLOCK_CLASS);
    editPre.classList.add(CM_HOST_CLASS);
    editPre.setAttribute("contenteditable", "false");
    editPre.style.display = "block";
    code.setAttribute("contenteditable", "false");
    code.setAttribute("hidden", "");
    code.setAttribute("aria-hidden", "true");
    code.style.display = "none";
    if (preview) {
        preview.remove();
    }
};

/** @deprecated use prepareCmBlockDom */
export const prepareWysiwygCmBlockDom = prepareCmBlockDom;

const loadLanguage = (languageName: string): Promise<LanguageSupport | undefined> => {
    const language = languageMap[languageName.toLowerCase()];
    if (!language) {
        return Promise.resolve(undefined);
    }
    if (language.support) {
        return Promise.resolve(language.support);
    }
    return language.load();
};

const scheduleSync = (binding: CodeMirrorBinding, vditor: IVditor) => {
    window.clearTimeout(binding.syncTimer);
    binding.syncTimer = window.setTimeout(() => {
        const options = {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: true,
        };
        if (vditor.currentMode === "wysiwyg") {
            afterRenderEvent(vditor, options);
        } else if (vditor.currentMode === "ir") {
            processAfterRender(vditor, options);
        }
    }, vditor.options.undoDelay);
};

const syncCodeFromView = (binding: CodeMirrorBinding, vditor: IVditor) => {
    binding.syncCode.textContent = binding.view.state.doc.toString();
    scheduleSync(binding, vditor);
};

const syncViewFromCode = (binding: CodeMirrorBinding) => {
    const codeText = binding.syncCode.textContent || "";
    const cmText = binding.view.state.doc.length ? binding.view.state.doc.toString() : "";
    if (codeText === cmText) {
        return;
    }
    binding.updating = true;
    binding.view.dispatch({
        changes: {from: 0, to: binding.view.state.doc.length, insert: codeText},
    });
    binding.updating = false;
};

const applyLanguage = (blockElement: HTMLElement, binding: CodeMirrorBinding, languageName: string) => {
    if (binding.languageName === languageName) {
        return;
    }
    if (!languageName) {
        binding.view.dispatch({
            effects: binding.languageCompartment.reconfigure([]),
        });
        binding.languageName = "";
        return;
    }
    loadLanguage(languageName).then((lang) => {
        if (!lang || !bindings.has(blockElement)) {
            return;
        }
        binding.view.dispatch({
            effects: binding.languageCompartment.reconfigure(lang),
        });
        binding.languageName = languageName;
    });
};

const isClipboardShortcut = (event: KeyboardEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
        return false;
    }
    const key = event.key.toLowerCase();
    return key === "c" || key === "x" || key === "v" || key === "a" || key === "z" || key === "y";
};

const getCmSelectionText = (view: EditorView) => {
    const parts: string[] = [];
    for (const range of view.state.selection.ranges) {
        parts.push(view.state.sliceDoc(range.from, range.to));
    }
    return parts.join("\n");
};

const cmDomEventHandlers = (vditor: IVditor, blockElement: HTMLElement, binding: CodeMirrorBinding) => ({
    mousedown: (event: Event) => {
        event.stopPropagation();
        const block = (event.target as HTMLElement).closest("[data-type='code-block']") as HTMLElement;
        showLanguagePopover(vditor, block || blockElement);
    },
    focus: () => {
        showLanguagePopover(vditor, blockElement);
        return false;
    },
    click: (event: Event) => {
        event.stopPropagation();
        const block = (event.target as HTMLElement).closest("[data-type='code-block']") as HTMLElement;
        showLanguagePopover(vditor, block || blockElement);
    },
    copy: (event: Event) => {
        const clipboardEvent = event as ClipboardEvent;
        const view = binding.view;
        if (!view?.state || !clipboardEvent.clipboardData) {
            return false;
        }
        const text = getCmSelectionText(view);
        if (!text) {
            return false;
        }
        event.stopPropagation();
        clipboardEvent.preventDefault();
        clipboardEvent.clipboardData.setData("text/plain", text);
        return true;
    },
    cut: (event: Event) => {
        const clipboardEvent = event as ClipboardEvent;
        const view = binding.view;
        if (!view?.state || !clipboardEvent.clipboardData) {
            return false;
        }
        const text = getCmSelectionText(view);
        if (!text) {
            return false;
        }
        event.stopPropagation();
        clipboardEvent.preventDefault();
        clipboardEvent.clipboardData.setData("text/plain", text);
        view.dispatch(view.state.changeByRange((range) => ({
            changes: {from: range.from, to: range.to, insert: ""},
            range: EditorSelection.cursor(range.from),
        })));
        syncCodeFromView(binding, vditor);
        return true;
    },
    paste: (event: Event) => {
        const clipboardEvent = event as ClipboardEvent;
        const view = binding.view;
        if (!view?.state || !clipboardEvent.clipboardData) {
            return false;
        }
        const text = clipboardEvent.clipboardData.getData("text/plain");
        event.stopPropagation();
        clipboardEvent.preventDefault();
        if (text) {
            view.dispatch(view.state.replaceSelection(text));
            syncCodeFromView(binding, vditor);
        }
        return true;
    },
    keydown: (event: Event) => {
        if (isClipboardShortcut(event as KeyboardEvent)) {
            return false;
        }
        event.stopPropagation();
    },
    keyup: (event: Event) => {
        event.stopPropagation();
    },
    input: (event: Event) => {
        event.stopPropagation();
    },
});

const destroyCodeMirror = (blockElement: HTMLElement) => {
    const binding = bindings.get(blockElement);
    if (!binding) {
        return;
    }
    window.clearTimeout(binding.syncTimer);
    binding.syncCode.textContent = binding.view.state.doc.toString();
    binding.view.destroy();
    bindings.delete(blockElement);
    binding.editPre.querySelector(".cm-editor")?.remove();
    prepareCmBlockDom(blockElement);
};

export const destroyAllCodeMirrors = (vditor: IVditor) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }
    editor.querySelectorAll(`.${CM_BLOCK_CLASS}`).forEach((block) => {
        destroyCodeMirror(block as HTMLElement);
    });
};

/** @deprecated use destroyAllCodeMirrors */
export const destroyAllWysiwygCodeMirrors = destroyAllCodeMirrors;

/** Spin DOM 前卸载 CodeMirror，保持 sync code 隐藏 */
export const deactivateAllCodeMirrors = (vditor: IVditor) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }
    editor.querySelectorAll(getCodeBlockSelector(vditor.currentMode)).forEach((block) => {
        const blockElement = block as HTMLElement;
        if (bindings.has(blockElement)) {
            destroyCodeMirror(blockElement);
        } else {
            prepareCmBlockDom(blockElement);
        }
    });
};

/** @deprecated use deactivateAllCodeMirrors */
export const deactivateAllWysiwygCodeMirrors = deactivateAllCodeMirrors;

const mountCodeMirror = (blockElement: HTMLElement, vditor: IVditor) => {
    if (!isCmCodeBlock(blockElement)) {
        return;
    }

    prepareCmBlockDom(blockElement);

    const parts = getBlockParts(blockElement);
    if (!parts) {
        return;
    }

    const existing = bindings.get(blockElement);
    if (existing) {
        syncViewFromCode(existing);
        const languageName = getLanguageName(parts.code);
        if (existing.languageName !== languageName) {
            existing.syncCode.className = parts.code.className;
            applyLanguage(blockElement, existing, languageName);
        }
        return;
    }

    const {editPre, code} = parts;
    const languageCompartment = new Compartment();
    const languageName = getLanguageName(code);

    const binding: CodeMirrorBinding = {
        view: null as unknown as EditorView,
        languageCompartment,
        editPre,
        syncCode: code,
        updating: false,
        syncTimer: 0,
        languageName: "",
    };

    const view = new EditorView({
        doc: code.textContent || "",
        parent: editPre,
        extensions: [
            vditorCodeMirrorSetup,
            keymap.of([indentWithTab]),
            languageCompartment.of([]),
            EditorView.updateListener.of((update) => {
                if (binding.updating || !update.docChanged) {
                    return;
                }
                syncCodeFromView(binding, vditor);
            }),
            EditorView.domEventHandlers(cmDomEventHandlers(vditor, blockElement, binding)),
        ],
    });

    binding.view = view;
    bindings.set(blockElement, binding);
    applyLanguage(blockElement, binding, languageName);
};

export const renderCodeBlocks = (vditor: IVditor) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }
    editor.querySelectorAll(getCodeBlockSelector(vditor.currentMode)).forEach((block) => {
        mountCodeMirror(block as HTMLElement, vditor);
    });
};

/** @deprecated use renderCodeBlocks */
export const renderWysiwygCodeBlocks = renderCodeBlocks;

export const focusCodeMirror = (
    blockElement: HTMLElement,
    collapseToStart = true,
    vditor?: IVditor,
) => {
    if (!blockElement) {
        return;
    }
    if (!bindings.get(blockElement) && vditor) {
        mountCodeMirror(blockElement, vditor);
    }
    const binding = bindings.get(blockElement);
    if (!binding) {
        return;
    }
    const hadFocus = binding.view.hasFocus;
    binding.view.focus();
    if (!hadFocus) {
        if (collapseToStart) {
            binding.view.dispatch({
                selection: {anchor: 0, head: 0},
                scrollIntoView: true,
            });
        } else {
            const length = binding.view.state.doc.length;
            binding.view.dispatch({
                selection: {anchor: length, head: length},
                scrollIntoView: true,
            });
        }
    }
};

/** @deprecated use focusCodeMirror */
export const focusWysiwygCodeMirror = focusCodeMirror;

export const focusCodeBlock = (blockElement: HTMLElement, vditor: IVditor, collapseToStart = true) => {
    if (!isCmCodeBlock(blockElement)) {
        return false;
    }
    focusCodeMirror(blockElement, collapseToStart, vditor);
    return true;
};

export const updateCodeMirrorLanguage = (blockElement: HTMLElement, languageName: string) => {
    const lang = languageName.trim();
    const binding = bindings.get(blockElement);
    if (binding) {
        binding.syncCode.className = lang ? `language-${lang}` : "";
        applyLanguage(blockElement, binding, lang);
    }
    const infoElement = blockElement.querySelector('[data-type="code-block-info"]') as HTMLElement;
    if (infoElement) {
        infoElement.textContent = Constants.ZWSP + lang;
    }
};

/** @deprecated use updateCodeMirrorLanguage */
export const updateWysiwygCodeMirrorLanguage = updateCodeMirrorLanguage;

export const hasCodeMirror = (blockElement: HTMLElement) => bindings.has(blockElement);

/** @deprecated use hasCodeMirror */
export const hasWysiwygCodeMirror = hasCodeMirror;

export const getCodeMirrorView = (blockElement: HTMLElement) => bindings.get(blockElement)?.view;

/** @deprecated use getCodeMirrorView */
export const getWysiwygCodeMirrorView = getCodeMirrorView;
