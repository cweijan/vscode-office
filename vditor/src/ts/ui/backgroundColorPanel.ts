import {FONT_COLOR_PALETTE, isValidFontColor} from "./fontColorPanel";

export const BACKGROUND_COLOR_PANEL_CLASS = "vditor-background-color-panel";
const BACKGROUND_COLOR_PREVIEW_TEXT = "Preview";

const getPreviewForegroundColor = (color: string): string => {
    const normalized = color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
    const red = Number.parseInt(normalized.slice(1, 3), 16);
    const green = Number.parseInt(normalized.slice(3, 5), 16);
    const blue = Number.parseInt(normalized.slice(5, 7), 16);
    const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
    return luminance >= 160 ? "#111111" : "#ffffff";
};

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

export const updateBackgroundColorPreview = (root: ParentNode, color: string) => {
    const preview = root.querySelector("[data-custom-preview]") as HTMLElement | null;
    if (!preview || !isValidFontColor(color)) {
        return;
    }
    preview.style.backgroundColor = color;
    preview.style.color = getPreviewForegroundColor(color);
};

export const updateBackgroundColorPreviewText = (root: ParentNode, text: string) => {
    const preview = root.querySelector("[data-custom-preview]") as HTMLElement | null;
    if (!preview) {
        return;
    }
    preview.textContent = text || BACKGROUND_COLOR_PREVIEW_TEXT;
};

export const updateBackgroundColorInput = (root: ParentNode, color: string) => {
    const colorInput = root.querySelector("[data-custom-color]") as HTMLInputElement | null;
    if (!colorInput || !isValidFontColor(color)) {
        return;
    }
    colorInput.value = color;
    updateBackgroundColorPreview(root, color);
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

    const customLabel = "Color";
    const confirmLabel = window.VditorI18n.confirm || "Confirm";
    return `<div class="${BACKGROUND_COLOR_PANEL_CLASS}" role="listbox" aria-label="${window.VditorI18n["background-color"] || "Background color"}">`
        + `<div class="${BACKGROUND_COLOR_PANEL_CLASS}__preview" data-custom-preview aria-hidden="true">${BACKGROUND_COLOR_PREVIEW_TEXT}</div>`
        + `<div class="${BACKGROUND_COLOR_PANEL_CLASS}__grid">${swatches}</div>`
        + `<div class="${BACKGROUND_COLOR_PANEL_CLASS}__custom">`
        + `<span class="${BACKGROUND_COLOR_PANEL_CLASS}__custom-label">${customLabel}</span>`
        + `<input type="color" class="${BACKGROUND_COLOR_PANEL_CLASS}__picker" data-custom-color value="#fff2cc" />`
        + `<button type="button" class="${BACKGROUND_COLOR_PANEL_CLASS}__confirm" data-custom-confirm>${confirmLabel}</button>`
        + `</div>`
        + `</div>`;
};

export {isValidFontColor as isValidBackgroundColor};
