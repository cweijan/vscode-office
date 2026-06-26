import {buildFontColorPanelHTML, isValidFontColor, syncFontColorCustomControls} from "../ui/fontColorPanel";
import {applyFontColor, hasTextSelection} from "../util/applyFontColor";
import {getEventName} from "../util/compatibility";
import {telemetry, telemetryToolbar} from "../util/telemetry";
import {MenuItem} from "./MenuItem";
import {hidePanel, toggleSubMenu} from "./setToolbar";

const applyCustomFontColor = (
    vditor: IVditor,
    panelElement: HTMLElement,
    color: string,
): boolean => {
    if (!isValidFontColor(color) || !applyFontColor(vditor, color)) {
        return false;
    }
    telemetry(vditor, "markdown.fontColor.apply", { color, source: "custom" });
    panelElement.style.display = "none";
    hidePanel(vditor, ["subToolbar"]);
    return true;
};

export class FontColor extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const actionBtn = this.element.children[0] as HTMLElement;
        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = buildFontColorPanelHTML();
        this.element.appendChild(panelElement);

        actionBtn.addEventListener(getEventName(), (event) => {
            if (!hasTextSelection(vditor)) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            const willOpen = panelElement.style.display !== "block";
            if (willOpen) {
                telemetryToolbar(vditor, "font-color");
                syncFontColorCustomControls(panelElement, true);
            }
        }, true);

        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            const swatch = event.target.closest("button[data-color]") as HTMLElement | null;
            if (swatch) {
                const color = swatch.getAttribute("data-color") || "";
                if (applyFontColor(vditor, color)) {
                    telemetry(vditor, "markdown.fontColor.apply", { color, source: "palette" });
                    panelElement.style.display = "none";
                    hidePanel(vditor, ["subToolbar"]);
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
                    applyCustomFontColor(vditor, panelElement, colorInput.value);
                }
                event.preventDefault();
                event.stopPropagation();
            }
        });

        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);
        syncFontColorCustomControls(panelElement, hasTextSelection(vditor));
    }
}
