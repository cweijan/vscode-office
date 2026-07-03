import {Constants} from "../constants";
import {insertRawEmptyLine} from "../raw/toolbar";
import {getEventName} from "../util/compatibility";
import {insertEmptyBlock} from "../util/fixBrowserBehavior";
import {MenuItem} from "./MenuItem";

export class InsertBefore extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);
        this.element.children[0].addEventListener(getEventName(), (event) => {
            event.preventDefault();
            if (this.element.firstElementChild.classList.contains(Constants.CLASS_MENU_DISABLED)) {
                return;
            }
            if (vditor.currentMode === "raw") {
                insertRawEmptyLine(vditor, "before");
                return;
            }
            insertEmptyBlock(vditor, "beforebegin");
        });
    }
}
