import {getMarkdown} from "../markdown/getMarkdown";
import {Constants} from "../constants";

const SAVE_TOOLBAR_NAME = "save";

const savedMarkdownMap = new WeakMap<IVditor, string>();

const setSaveButtonDisabled = (vditor: IVditor, disabled: boolean) => {
    const toolbarItem = vditor.toolbar?.elements?.[SAVE_TOOLBAR_NAME];
    if (!toolbarItem) {
        return;
    }
    const btn = toolbarItem.children[0] as HTMLElement | undefined;
    if (!btn) {
        return;
    }
    if (disabled) {
        btn.setAttribute("disabled", "disabled");
        btn.classList.add(Constants.CLASS_MENU_DISABLED);
        return;
    }
    btn.removeAttribute("disabled");
    btn.classList.remove(Constants.CLASS_MENU_DISABLED);
};

export const initSaveToolbarState = (vditor: IVditor, markdown: string) => {
    savedMarkdownMap.set(vditor, markdown);
    updateSaveToolbarState(vditor);
};

export const markDocumentSaved = (vditor: IVditor, markdown?: string) => {
    savedMarkdownMap.set(vditor, markdown ?? getMarkdown(vditor));
    updateSaveToolbarState(vditor);
};

export const isDocumentDirty = (vditor: IVditor): boolean => {
    const saved = savedMarkdownMap.get(vditor);
    if (saved === undefined) {
        return false;
    }
    return getMarkdown(vditor) !== saved;
};

export const updateSaveToolbarState = (vditor: IVditor) => {
    if (!vditor.toolbar?.elements?.[SAVE_TOOLBAR_NAME]) {
        return;
    }
    const saved = savedMarkdownMap.get(vditor);
    if (saved === undefined) {
        return;
    }
    setSaveButtonDisabled(vditor, getMarkdown(vditor) === saved);
};

export const fireContentInput = (vditor: IVditor, text: string) => {
    if (typeof vditor.options.input === "function") {
        vditor.options.input(text);
    }
    updateSaveToolbarState(vditor);
};
