import {Compartment, EditorState} from "@codemirror/state";
import {EditorView, lineNumbers} from "@codemirror/view";
import {LanguageSupport} from "@codemirror/language";

import {vditorSyntaxHighlighting} from "./codeMirrorHighlight";
import {ensurePreviewCodeBlockChrome, removePreviewCodeBlockChrome} from "./codeBlockChrome";
import {buildCodeMirrorLanguageMap} from "./codeBlockLanguageHints";

const PREVIEW_HOST_CLASS = "vditor-cm-preview-host";
const previewViews = new WeakMap<HTMLElement, EditorView>();

const languageMap = buildCodeMirrorLanguageMap();

const isPreviewCodeElement = (code: HTMLElement) => {
    const pre = code.parentElement;
    if (!pre || pre.tagName !== "PRE") {
        return false;
    }
    if (pre.classList.contains("vditor-wysiwyg__pre") ||
        pre.classList.contains("vditor-ir__marker--pre")) {
        return false;
    }
    if (code.classList.contains("language-mermaid") ||
        code.classList.contains("language-plantuml") ||
        code.classList.contains("language-math")) {
        return false;
    }
    return true;
};

const getLanguageName = (code: HTMLElement) => {
    const match = code.className.match(/language-([^\s]+)/);
    return match ? match[1] : "";
};

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

const mountPreviewCodeMirror = (pre: HTMLElement, code: HTMLElement, showLineNumber: boolean) => {
    const existing = previewViews.get(pre);
    if (existing) {
        existing.destroy();
    }

    pre.classList.add(PREVIEW_HOST_CLASS, "vditor-cm-host");
    pre.querySelector(".cm-editor")?.remove();
    removePreviewCodeBlockChrome(pre);
    code.setAttribute("hidden", "");
    code.setAttribute("aria-hidden", "true");
    code.style.display = "none";

    const languageCompartment = new Compartment();
    const languageName = getLanguageName(code);
    const extensions = [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        vditorSyntaxHighlighting,
        languageCompartment.of([]),
    ];
    if (showLineNumber) {
        extensions.push(lineNumbers());
    }

    const view = new EditorView({
        doc: code.textContent || "",
        parent: pre,
        extensions,
    });
    previewViews.set(pre, view);

    ensurePreviewCodeBlockChrome(
        pre,
        languageName,
        () => view.state.doc.toString(),
    );

    if (languageName) {
        loadLanguage(languageName).then((lang) => {
            if (!lang || previewViews.get(pre) !== view) {
                return;
            }
            view.dispatch({
                effects: languageCompartment.reconfigure(lang),
            });
        });
    }
};

export const codeMirrorPreviewRender = (
    hljsOption?: IHljs,
    element: HTMLElement | Document = document,
) => {
    if (hljsOption?.enable === false) {
        return;
    }

    const root = element instanceof Document ? element.body : element;
    const showLineNumber = hljsOption?.lineNumber ?? false;

    for (const code of root.querySelectorAll("pre > code")) {
        if (!isPreviewCodeElement(code as HTMLElement)) {
            continue;
        }
        mountPreviewCodeMirror(code.parentElement as HTMLElement, code as HTMLElement, showLineNumber);
    }
};
