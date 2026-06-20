export const mathRenderAdapter = {
    getCode: (mathElement: Element) => mathElement.textContent,
    getElements: (element: HTMLElement) => element.querySelectorAll(".language-math"),
};
export const mermaidRenderAdapter = {
    /** 不仅要返回code，并且需要将 code 设置为 el 的 innerHTML */
    getCode: (el: Element) => el.textContent,
    getElements: (element: HTMLElement) => element.querySelectorAll(".language-mermaid"),
};
export const plantumlRenderAdapter = {
    getCode: (el: Element) => el.textContent,
    getElements: (el: HTMLElement | Document) => el.querySelectorAll(".language-plantuml"),
};
