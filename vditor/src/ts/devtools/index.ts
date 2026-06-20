import {getMarkdown} from "../markdown/getMarkdown";

export class DevTools {
    public element: HTMLDivElement;

    constructor() {
        this.element = document.createElement("div");
        this.element.className = "vditor-devtools";
        this.element.innerHTML = '<div class="vditor-reset--error"></div><div style="height: 100%;"></div>';
    }

    public renderEchart(vditor: IVditor) {
        if (vditor.devtools.element.style.display !== "block") {
            return;
        }

        try {
            (this.element.lastElementChild as HTMLElement).style.display = "none";
            this.element.firstElementChild.innerHTML = "";
            const pre = document.createElement("pre");
            pre.textContent = JSON.stringify(
                JSON.parse(vditor.lute.RenderEChartsJSON(getMarkdown(vditor))),
                null,
                2,
            );
            this.element.firstElementChild.appendChild(pre);
        } catch (e) {
            (this.element.lastElementChild as HTMLElement).style.display = "none";
            this.element.firstElementChild.innerHTML = String(e);
        }
    }
}
