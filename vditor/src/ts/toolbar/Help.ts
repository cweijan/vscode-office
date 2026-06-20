import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";

export class Help extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);
        this.element.children[0].addEventListener(getEventName(), (event) => {
            event.preventDefault();
            vditor.tip.show(`<div style="margin-bottom:14px;font-size: 14px;line-height: 22px;display: flex;align-items: center;gap: 12px;padding-top: 14px;white-space: nowrap;">
    <a href="https://github.com/cweijan/vscode-office/issues" target="_blank">Issues</a>
    <span style="opacity: 0.4;">|</span>
    <a href="https://ld246.com/article/1582778815353" target="_blank">键盘快捷键</a>
</div>`, 0);
        });
    }
}
