import {Constants} from "../constants";
import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";
import {disableToolbar} from "./setToolbar";
import {telemetryToolbarClickOnly} from "../util/telemetry";

export class Redo extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);
        disableToolbar({redo: this.element}, ["redo"]);
        this.element.children[0].addEventListener(getEventName(), (event) => {
            event.preventDefault();
            if (this.element.firstElementChild.classList.contains(Constants.CLASS_MENU_DISABLED)) {
                return;
            }
            telemetryToolbarClickOnly(vditor, event, "redo");
            vditor.undo.redo(vditor);
        });
    }
}
