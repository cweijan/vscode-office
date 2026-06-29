import {registerThemeToggleCallback} from "../ui/editorThemeToggle";
import {resolveEditorTheme} from "../ui/setEditorTheme";
import {setEditorTheme} from "../ui/setEditorTheme";
import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";

const SUN_ICON = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>`;
const MOON_ICON = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>`;

export class EditorThemeToggle extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const btn = this.element.children[0] as HTMLElement;
        this.update(btn, vditor.options.editorTheme || "Auto");

        btn.addEventListener(getEventName(), (event) => {
            event.preventDefault();
            const theme = btn.dataset.theme || "Auto";
            const nextTheme = theme === "Auto"
                ? resolveEditorTheme(vditor.options.lastNonAutoEditorTheme || "Light")
                : "Auto";
            setEditorTheme(vditor, nextTheme, true, "toggle");
        });

        registerThemeToggleCallback((theme) => this.update(btn, theme));
    }

    private update(btn: HTMLElement, theme: string) {
        btn.dataset.theme = theme;
        const isAuto = theme === "Auto";
        btn.innerHTML = isAuto ? SUN_ICON : MOON_ICON;
        const title = isAuto
            ? (window.VditorI18n?.["editor-theme-toggle-to-light"] || "Switch to Light")
            : (window.VditorI18n?.["editor-theme-toggle-to-auto"] || "Switch to Auto");
        btn.setAttribute("aria-label", title);
        btn.setAttribute("title", title);
    }
}
