import {Constants} from "../constants";
import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";

export class Outline extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);
        this.element.children[0].addEventListener(getEventName(), (event) => {
            event.preventDefault();
            const btnElement = vditor.toolbar.elements.outline.firstElementChild;
            if (btnElement.classList.contains(Constants.CLASS_MENU_DISABLED)) {
                return;
            }
            vditor.options.outline.enable = !this.element.firstElementChild.classList.contains("vditor-menu--current");
            vditor.outline.toggle(vditor, vditor.options.outline.enable);
        });
    }
}
