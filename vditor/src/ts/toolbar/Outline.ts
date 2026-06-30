import {Constants} from "../constants";
import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";
import {telemetryToolbarClickOnly} from "../util/telemetry";

export class Outline extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);
        this.element.children[0].addEventListener(getEventName(), (event) => {
            event.preventDefault();
            const btnElement = vditor.toolbar.elements.outline.firstElementChild;
            if (btnElement.classList.contains(Constants.CLASS_MENU_DISABLED)) {
                return;
            }
            const show = !this.element.firstElementChild.classList.contains("vditor-menu--current");
            telemetryToolbarClickOnly(vditor, event, "outline", { show: show ? "true" : "false" });
            vditor.outline.toggle(vditor, show);
        });
    }
}
