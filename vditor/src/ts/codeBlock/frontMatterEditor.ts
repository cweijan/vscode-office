import { indentLess } from "@codemirror/commands";
import { Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

import { processAfterRender } from "../ir/process";
import { afterRenderEvent } from "../wysiwyg/afterRenderEvent";
import { loadCodeMirrorHighlightLanguage } from "./codeBlockHighlightLanguages";
import { stopHandledCodeMirrorKeymap, vditorCodeMirrorSetup } from "./codeMirrorSetup";

const CM_HOST_CLASS = "vditor-cm-host";
const CM_BLOCK_CLASS = "vditor-code-block--cm";

interface YamlBinding {
    view: EditorView;
    languageCompartment: Compartment;
    syncCode: HTMLElement;
    blockElement: HTMLElement;
    syncTimer: number;
    propertiesTimer: number;
    updating: boolean;
}

const yamlBindings = new WeakMap<HTMLElement, YamlBinding>();

const getModeEditor = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        return vditor.wysiwyg.element;
    }
    if (vditor.currentMode === "ir") {
        return vditor.ir.element;
    }
    return null;
};

const insertLiteralTab = (view: EditorView) => {
    view.dispatch(view.state.update(view.state.replaceSelection("\t"), {
        scrollIntoView: true,
        userEvent: "input",
    }));
    return true;
};

const prepareYamlCmDom = (blockElement: HTMLElement, pre: HTMLElement, code: HTMLElement) => {
    blockElement.classList.add(CM_BLOCK_CLASS);
    if (blockElement.classList.contains("vditor-ir__node")) {
        blockElement.classList.add("vditor-ir__node--expand");
    }
    pre.classList.add(CM_HOST_CLASS);
    pre.setAttribute("contenteditable", "false");
    pre.style.display = "block";
    code.setAttribute("contenteditable", "false");
    code.setAttribute("hidden", "");
    code.setAttribute("aria-hidden", "true");
    code.style.display = "none";
};

const cleanupYamlCmDom = (blockElement: HTMLElement, pre: HTMLElement, code: HTMLElement) => {
    blockElement.classList.remove(CM_BLOCK_CLASS);
    if (blockElement.classList.contains("vditor-ir__node")) {
        blockElement.classList.remove("vditor-ir__node--expand");
    }
    pre.classList.remove(CM_HOST_CLASS);
    pre.removeAttribute("contenteditable");
    pre.style.display = "";
    code.removeAttribute("contenteditable");
    code.removeAttribute("hidden");
    code.removeAttribute("aria-hidden");
    code.style.display = "";
};

const flushYamlToDocument = (binding: YamlBinding, vditor: IVditor) => {
    window.clearTimeout(binding.syncTimer);
    binding.syncCode.textContent = binding.view.state.doc.toString();
    const options = {
        enableAddUndoStack: false,
        enableHint: false,
        enableInput: true,
    };
    if (vditor.currentMode === "wysiwyg") {
        afterRenderEvent(vditor, options);
    } else if (vditor.currentMode === "ir") {
        processAfterRender(vditor, options);
    }
};

const scheduleYamlSync = (binding: YamlBinding, vditor: IVditor) => {
    window.clearTimeout(binding.syncTimer);
    binding.syncTimer = window.setTimeout(() => {
        binding.syncCode.textContent = binding.view.state.doc.toString();
        const options = {
            enableAddUndoStack: false,
            enableHint: false,
            enableInput: false,
        };
        if (vditor.currentMode === "wysiwyg") {
            afterRenderEvent(vditor, options);
        } else if (vditor.currentMode === "ir") {
            processAfterRender(vditor, options);
        }
    }, vditor.options.undoDelay);
};

const renderFrontMatterPreviewHtml = (vditor: IVditor, yaml: string) => {
    if (!vditor.lute) {
        return "";
    }
    const md = `---\n${yaml.trimEnd()}\n---\n`;
    if (vditor.currentMode === "ir") {
        return vditor.lute.Md2VditorIRDOM(md);
    }
    return vditor.lute.Md2VditorDOM(md);
};

const refreshPropertiesPanel = (block: HTMLElement, yaml: string, vditor: IVditor) => {
    const html = renderFrontMatterPreviewHtml(vditor, yaml);
    if (!html) {
        return;
    }
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const freshProps = wrap.querySelector(".vditor-properties");
    const currentProps = block.querySelector(".vditor-properties");
    const anchor = block.querySelector("details.vditor-properties__source-wrap");

    if (freshProps && currentProps) {
        currentProps.replaceWith(freshProps);
        return;
    }
    if (freshProps && !currentProps && anchor) {
        block.insertBefore(freshProps, anchor);
        return;
    }
    if (!freshProps && currentProps) {
        currentProps.remove();
    }
};

const schedulePropertiesRefresh = (
    binding: YamlBinding,
    vditor: IVditor,
) => {
    window.clearTimeout(binding.propertiesTimer);
    binding.propertiesTimer = window.setTimeout(() => {
        const yaml = binding.view.state.doc.toString();
        binding.syncCode.textContent = yaml;
        refreshPropertiesPanel(binding.blockElement, yaml, vditor);
    }, 150);
};

const mountYamlEditor = (pre: HTMLElement, vditor: IVditor) => {
    if (yamlBindings.has(pre)) {
        return;
    }
    const code = pre.querySelector("code[data-type='yaml-front-matter']") as HTMLElement | null;
    const blockElement = pre.closest("[data-type='yaml-front-matter']") as HTMLElement | null;
    if (!code || !blockElement) {
        return;
    }

    prepareYamlCmDom(blockElement, pre, code);
    const languageCompartment = new Compartment();
    const binding: YamlBinding = {
        view: null as unknown as EditorView,
        languageCompartment,
        syncCode: code,
        blockElement,
        syncTimer: 0,
        propertiesTimer: 0,
        updating: false,
    };

    const view = new EditorView({
        doc: (code.textContent || "").trimEnd(),
        parent: pre,
        extensions: [
            vditorCodeMirrorSetup,
            keymap.of(stopHandledCodeMirrorKeymap([
                { key: "Tab", run: insertLiteralTab, shift: indentLess },
            ])),
            languageCompartment.of([]),
            EditorView.updateListener.of((update) => {
                if (binding.updating || !update.docChanged) {
                    return;
                }
                binding.syncCode.textContent = binding.view.state.doc.toString();
                schedulePropertiesRefresh(binding, vditor);
                scheduleYamlSync(binding, vditor);
            }),
            EditorView.domEventHandlers({
                mousedown: (event) => {
                    event.stopPropagation();
                },
                blur: () => {
                    window.setTimeout(() => {
                        if (!yamlBindings.has(pre) || binding.view.hasFocus) {
                            return;
                        }
                        if (pre.contains(document.activeElement)) {
                            return;
                        }
                        flushYamlToDocument(binding, vditor);
                    }, 0);
                    return false;
                },
            }),
        ],
    });

    binding.view = view;
    yamlBindings.set(pre, binding);

    loadCodeMirrorHighlightLanguage("yaml").then((lang) => {
        if (!lang || !yamlBindings.has(pre)) {
            return;
        }
        view.dispatch({
            effects: languageCompartment.reconfigure(lang),
        });
    });
};

const unmountYamlEditor = (pre: HTMLElement, vditor: IVditor) => {
    const binding = yamlBindings.get(pre);
    if (!binding) {
        return;
    }
    window.clearTimeout(binding.syncTimer);
    window.clearTimeout(binding.propertiesTimer);
    binding.syncCode.textContent = binding.view.state.doc.toString();
    refreshPropertiesPanel(binding.blockElement, binding.syncCode.textContent, vditor);
    flushYamlToDocument(binding, vditor);
    binding.view.destroy();
    yamlBindings.delete(pre);
    cleanupYamlCmDom(binding.blockElement, pre, binding.syncCode);
    pre.querySelectorAll(".cm-editor").forEach((editor) => {
        editor.remove();
    });
};

const bindYamlSourceDetails = (details: HTMLDetailsElement, pre: HTMLElement, vditor: IVditor) => {
    if (details.dataset.cmBound === "true") {
        if (details.open) {
            mountYamlEditor(pre, vditor);
        }
        return;
    }
    details.dataset.cmBound = "true";
    details.addEventListener("toggle", () => {
        if (details.open) {
            mountYamlEditor(pre, vditor);
        } else {
            unmountYamlEditor(pre, vditor);
        }
    });
    if (details.open) {
        mountYamlEditor(pre, vditor);
    }
};

/** 为 Obsidian Properties 中展开的 YAML 源码区挂载 CodeMirror */
export const setupFrontMatterYamlEditors = (vditor: IVditor) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }
    for (const details of editor.querySelectorAll(
        "[data-type='yaml-front-matter'] details.vditor-properties__source-wrap",
    )) {
        const pre = details.querySelector(".vditor-properties__source") as HTMLElement | null;
        if (!pre) {
            continue;
        }
        bindYamlSourceDetails(details as HTMLDetailsElement, pre, vditor);
    }
};

export const flushFrontMatterYamlToSyncCode = (vditor: IVditor) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }
    for (const pre of editor.querySelectorAll(
        `[data-type='yaml-front-matter'].${CM_BLOCK_CLASS} .vditor-cm-host`,
    )) {
        const binding = yamlBindings.get(pre as HTMLElement);
        if (!binding) {
            continue;
        }
        window.clearTimeout(binding.syncTimer);
        window.clearTimeout(binding.propertiesTimer);
        binding.syncCode.textContent = binding.view.state.doc.toString();
    }
};

export const isFrontMatterYamlCmFocused = () => {
    return !!document.querySelector(
        `[data-type='yaml-front-matter'].${CM_BLOCK_CLASS} .cm-editor.cm-focused`,
    );
};
