import {getEventName} from "../util/compatibility";
import {FindBar} from "../ui/FindBar";
import {MenuItem} from "./MenuItem";

export class Find extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const btn = this.element.children[0] as HTMLElement;

        let findBar: FindBar | null = null;

        const getOrCreateBar = () => {
            if (!findBar) {
                findBar = new FindBar(vditor);
                vditor.toolbar.element.appendChild(findBar.element);
            }
            return findBar;
        };

        const open = () => {
            const bar = getOrCreateBar();
            if (!bar.isVisible()) bar.show();
        };

        btn.addEventListener(getEventName(), (e) => {
            e.preventDefault();
            const bar = getOrCreateBar();
            bar.toggle();
        });

        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "f") {
                e.preventDefault();
                const bar = getOrCreateBar();
                if (bar.isVisible()) {
                    bar.focusInput();
                } else {
                    bar.show();
                }
            }
        });
    }
}
