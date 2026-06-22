import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";
import {SponsorPanel} from "./SponsorPanel";
// @ts-ignore
import sponsorIconUrl from "../../assets/sponsor-icon.png";

export class Help extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const btn = this.element.children[0] as HTMLElement;
        btn.innerHTML = `<img src="${sponsorIconUrl}" alt="Sponsor" class="vditor-sponsor-toolbar-icon" draggable="false"/>`;

        const opts = vditor.options;
        const lang = opts.lang || "en_US";
        let panel: SponsorPanel | null = null;

        btn.addEventListener(getEventName(), (event) => {
            event.preventDefault();
            if (!panel) {
                panel = new SponsorPanel(
                    this.element.parentElement,
                    lang,
                    opts.onSponsorLogoClick,
                    opts.onSponsorSiteClick,
                );
                document.addEventListener("click", (e) => {
                    if (panel.isVisible() && !panel.element.contains(e.target as Node) && !btn.contains(e.target as Node)) {
                        panel.hide();
                    }
                });
            }
            panel.toggle(btn);
        });
    }
}
