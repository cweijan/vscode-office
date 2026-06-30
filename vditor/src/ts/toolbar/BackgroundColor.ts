import {buildBackgroundColorPanelHTML, isValidBackgroundColor, syncBackgroundColorCustomControls, updateBackgroundColorInput, updateBackgroundColorPreview, updateBackgroundColorPreviewText} from "../ui/backgroundColorPanel";
import {applyBackgroundColor, getSelectionTextForFontColor, hasTextSelection} from "../util/applyFontColor";
import {getEditorRange} from "../util/selection";
import {getEventName} from "../util/compatibility";
import {telemetry, telemetryToolbar} from "../util/telemetry";
import {MenuItem} from "./MenuItem";
import {hidePanel, toggleSubMenu} from "./setToolbar";

const applyCustomBackgroundColor = (
    vditor: IVditor,
    panelElement: HTMLElement,
    color: string,
): boolean => {
    if (!isValidBackgroundColor(color) || !applyBackgroundColor(vditor, color)) {
        return false;
    }
    telemetry(vditor, "markdown.backgroundColor.apply", { color, source: "custom" });
    panelElement.style.display = "none";
    hidePanel(vditor, ["subToolbar"]);
    return true;
};

const syncPreviewText = (vditor: IVditor, panelElement: HTMLElement) => {
    const selectedText = getSelectionTextForFontColor(getEditorRange(vditor), vditor).replace(/\s+/g, " ").trim();
    updateBackgroundColorPreviewText(panelElement, selectedText);
};

export class BackgroundColor extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const actionBtn = this.element.children[0] as HTMLElement;
        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = buildBackgroundColorPanelHTML();
        this.element.appendChild(panelElement);

        if (!vditor.options.isPro) {
            actionBtn.classList.add("vditor-pro-locked");
            actionBtn.insertAdjacentHTML("beforeend",
                `<span class="vditor-pro-locked__badge" aria-hidden="true">PRO</span>`
                + `<span class="vditor-pro-locked__tooltip" aria-hidden="true">`
                + `<span class="vditor-pro-locked__tooltip-text">Set background color</span>`
                + `</span>`);
        }

        actionBtn.addEventListener(getEventName(), (event) => {
            if (!vditor.options.isPro) {
                event.preventDefault();
                event.stopPropagation();
                telemetry(vditor, "markdown.proRequired", { feature: "background-color" });
                vditor.options.onRequirePro?.("background-color");
                return;
            }
            if (!hasTextSelection(vditor)) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            const willOpen = panelElement.style.display !== "block";
            if (willOpen) {
                telemetryToolbar(vditor, "background-color");
                syncBackgroundColorCustomControls(panelElement, true);
                syncPreviewText(vditor, panelElement);
            }
        }, true);

        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            const swatch = event.target.closest("button[data-color]") as HTMLElement | null;
            if (swatch) {
                const color = swatch.getAttribute("data-color") || "";
                if (isValidBackgroundColor(color)) {
                    updateBackgroundColorInput(panelElement, color);
                }
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            const confirmButton = event.target.closest("button[data-custom-confirm]") as HTMLButtonElement | null;
            if (confirmButton) {
                if (confirmButton.disabled || !hasTextSelection(vditor)) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                const colorInput = panelElement.querySelector("[data-custom-color]") as HTMLInputElement | null;
                if (colorInput) {
                    applyCustomBackgroundColor(vditor, panelElement, colorInput.value);
                }
                event.preventDefault();
                event.stopPropagation();
            }
        });

        const colorInput = panelElement.querySelector("[data-custom-color]") as HTMLInputElement | null;
        if (colorInput) {
            syncPreviewText(vditor, panelElement);
            updateBackgroundColorPreview(panelElement, colorInput.value);
            colorInput.addEventListener("input", () => {
                updateBackgroundColorPreview(panelElement, colorInput.value);
            });
        }

        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);
        syncBackgroundColorCustomControls(panelElement, hasTextSelection(vditor));
    }
}
