import {code160to32} from "../util/code160to32";
import {codicon} from "../util/codicon";

export const codeRender = (element: HTMLElement) => {
    element.querySelectorAll("pre > code").forEach((e: HTMLElement) => {
        if (e.parentElement.classList.contains("vditor-wysiwyg__pre") ||
            e.parentElement.classList.contains("vditor-ir__marker--pre")) {
            return;
        }
        if (e.classList.contains("language-mermaid") ||
            e.classList.contains("language-plantuml") ||
            e.classList.contains("language-math")) {
            return;
        }

        if (e.style.maxHeight.indexOf("px") > -1) {
            return;
        }

        let codeText = e.innerText;
        if (e.classList.contains("highlight-chroma")) {
            const codeElement = document.createElement("code");
            codeElement.innerHTML = e.innerHTML;
            codeElement.querySelectorAll(".highlight-ln").forEach((item: HTMLElement) => {
                item.remove();
            });
            codeText = codeElement.innerText;
        }

        const iconHTML = codicon("copy");

        const divElement = document.createElement("div");
        divElement.className = "vditor-copy";
        divElement.innerHTML = `<span aria-label="${window.VditorI18n?.copy || "复制"}"
onmouseover="this.setAttribute('aria-label', '${window.VditorI18n?.copy || "复制"}')"
class="vditor-tooltipped vditor-tooltipped__w"
onclick="this.previousElementSibling.select();document.execCommand('copy');this.setAttribute('aria-label', '${window.VditorI18n?.copy || "已复制"}')">${iconHTML}</span>`;
        const textarea = document.createElement("textarea");
        textarea.value = code160to32(codeText);
        divElement.insertAdjacentElement("afterbegin", textarea);

        e.before(divElement);
        e.style.maxHeight = (window.outerHeight - 40) + "px";
    });
};
