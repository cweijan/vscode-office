import {EDITOR_THEME_TOGGLE_NAMES} from "./editorThemeCatalog";

const toolbarUpdateCallbacks: Array<(theme: string) => void> = [];

export const registerThemeToggleCallback = (cb: (theme: string) => void) => {
    toolbarUpdateCallbacks.push(cb);
};

export const updateEditorThemeToggle = (theme: string) => {
    if (!EDITOR_THEME_TOGGLE_NAMES.includes(theme)) {
        toolbarUpdateCallbacks.forEach((cb) => cb(theme));
        return;
    }
    toolbarUpdateCallbacks.forEach((cb) => cb(theme));
};
