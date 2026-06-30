export const FONT_COLOR_PANEL_CLASS = "vditor-font-color-panel";
const FONT_COLOR_PREVIEW_TEXT = "Preview";

export const FONT_COLOR_PALETTE: string[] = [
    "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#ffffff",
    "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8",
    "#0000ff", "#9900ff", "#ff00ff", "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc",
    "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc", "#dd7e6b",
    "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8",
];

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const isValidFontColor = (color: string): boolean => HEX_COLOR_RE.test(color);

export const syncFontColorCustomControls = (root: ParentNode, enabled: boolean) => {
    const panel = root.querySelector(`.${FONT_COLOR_PANEL_CLASS}`);
    if (!panel) {
        return;
    }
    const colorInput = panel.querySelector("[data-custom-color]") as HTMLInputElement | null;
    const confirmButton = panel.querySelector("[data-custom-confirm]") as HTMLButtonElement | null;
    const customRow = panel.querySelector(`.${FONT_COLOR_PANEL_CLASS}__custom`);
    if (colorInput) {
        colorInput.disabled = !enabled;
    }
    if (confirmButton) {
        confirmButton.disabled = !enabled;
    }
    if (customRow) {
        customRow.classList.toggle(`${FONT_COLOR_PANEL_CLASS}__custom--disabled`, !enabled);
    }
};

export const updateFontColorPreview = (root: ParentNode, color: string) => {
    const preview = root.querySelector("[data-custom-preview]") as HTMLElement | null;
    if (!preview || !isValidFontColor(color)) {
        return;
    }
    preview.style.color = color;
};

export const updateFontColorPreviewText = (root: ParentNode, text: string) => {
    const preview = root.querySelector("[data-custom-preview]") as HTMLElement | null;
    if (!preview) {
        return;
    }
    preview.textContent = text || FONT_COLOR_PREVIEW_TEXT;
};

export const updateFontColorInput = (root: ParentNode, color: string) => {
    const colorInput = root.querySelector("[data-custom-color]") as HTMLInputElement | null;
    if (!colorInput || !isValidFontColor(color)) {
        return;
    }
    colorInput.value = color;
    updateFontColorPreview(root, color);
};

export const syncFontColorPanelEnabled = (vditor: IVditor, enabled: boolean) => {
    const toolbarItem = vditor.toolbar?.elements?.["font-color"];
    if (!toolbarItem) {
        return;
    }
    syncFontColorCustomControls(toolbarItem, enabled);
};

export const buildFontColorPanelHTML = (): string => {
    const swatches = FONT_COLOR_PALETTE.map((color) => {
        return `<button type="button" class="${FONT_COLOR_PANEL_CLASS}__swatch" data-color="${color}" `
            + `style="background-color:${color}" aria-label="${color}" title="${color}"></button>`;
    }).join("");

    const customLabel = "Color";
    const confirmLabel = window.VditorI18n.confirm || "Confirm";
    return `<div class="${FONT_COLOR_PANEL_CLASS}" role="listbox" aria-label="${window.VditorI18n["font-color"] || "Font color"}">`
        + `<div class="${FONT_COLOR_PANEL_CLASS}__preview" data-custom-preview aria-hidden="true">${FONT_COLOR_PREVIEW_TEXT}</div>`
        + `<div class="${FONT_COLOR_PANEL_CLASS}__grid">${swatches}</div>`
        + `<div class="${FONT_COLOR_PANEL_CLASS}__custom">`
        + `<span class="${FONT_COLOR_PANEL_CLASS}__custom-label">${customLabel}</span>`
        + `<input type="color" class="${FONT_COLOR_PANEL_CLASS}__picker" data-custom-color value="#4285f4" />`
        + `<button type="button" class="${FONT_COLOR_PANEL_CLASS}__confirm" data-custom-confirm>${confirmLabel}</button>`
        + `</div>`
        + `</div>`;
};
