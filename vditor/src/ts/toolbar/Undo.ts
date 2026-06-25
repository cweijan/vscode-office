import {Constants} from "../constants";
import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";
import {disableToolbar} from "./setToolbar";
import {telemetryToolbar} from "../util/telemetry";

export class Undo extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);
        disableToolbar({undo: this.element}, ["undo"]);
        this.element.children[0].addEventListener(getEventName(), (event) => {
            event.preventDefault();
            if (this.element.firstElementChild.classList.contains(Constants.CLASS_MENU_DISABLED)) {
                return;
            }
            telemetryToolbar(vditor, "undo");
            vditor.undo.undo(vditor);
        });
    }
}
