import {FONT_COLOR_PALETTE, isValidFontColor} from "./fontColorPanel";

export const BACKGROUND_COLOR_PANEL_CLASS = "vditor-background-color-panel";

export const syncBackgroundColorCustomControls = (root: ParentNode, enabled: boolean) => {
    const panel = root.querySelector(`.${BACKGROUND_COLOR_PANEL_CLASS}`);
    if (!panel) {
        return;
    }
    const colorInput = panel.querySelector("[data-custom-color]") as HTMLInputElement | null;
    const confirmButton = panel.querySelector("[data-custom-confirm]") as HTMLButtonElement | null;
    const customRow = panel.querySelector(`.${BACKGROUND_COLOR_PANEL_CLASS}__custom`);
    if (colorInput) {
        colorInput.disabled = !enabled;
    }
    if (confirmButton) {
        confirmButton.disabled = !enabled;
    }
    if (customRow) {
        customRow.classList.toggle(`${BACKGROUND_COLOR_PANEL_CLASS}__custom--disabled`, !enabled);
    }
};

export const syncBackgroundColorPanelEnabled = (vditor: IVditor, enabled: boolean) => {
    const toolbarItem = vditor.toolbar?.elements?.["background-color"];
    if (!toolbarItem) {
        return;
    }
    syncBackgroundColorCustomControls(toolbarItem, enabled);
};

export const buildBackgroundColorPanelHTML = (): string => {
    const swatches = FONT_COLOR_PALETTE.map((color) => {
        return `<button type="button" class="${BACKGROUND_COLOR_PANEL_CLASS}__swatch" data-color="${color}" `
            + `style="background-color:${color}" aria-label="${color}" title="${color}"></button>`;
    }).join("");

    const customLabel = window.VditorI18n["background-color-custom"] || "Custom";
    const confirmLabel = window.VditorI18n.confirm || "Confirm";
    return `<div class="${BACKGROUND_COLOR_PANEL_CLASS}" role="listbox" aria-label="${window.VditorI18n["background-color"] || "Background color"}">`
        + `<div class="${BACKGROUND_COLOR_PANEL_CLASS}__grid">${swatches}</div>`
        + `<div class="${BACKGROUND_COLOR_PANEL_CLASS}__custom">`
        + `<span class="${BACKGROUND_COLOR_PANEL_CLASS}__custom-label">${customLabel}</span>`
        + `<input type="color" class="${BACKGROUND_COLOR_PANEL_CLASS}__picker" data-custom-color value="#fff2cc" />`
        + `<button type="button" class="${BACKGROUND_COLOR_PANEL_CLASS}__confirm" data-custom-confirm>${confirmLabel}</button>`
        + `</div>`
        + `</div>`;
};

export {isValidFontColor as isValidBackgroundColor};
