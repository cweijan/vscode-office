import { Constants } from "../constants";
import { addScript } from "../util/addScript";
import { addStyle } from "../util/addStyle";
import { code160to32 } from "../util/code160to32";
import { mathRenderAdapter } from "./adapterRender";

declare const katex: {
    renderToString(math: string, option: {
        displayMode?: boolean | undefined;
        output?: 'html' | 'mathml' | 'htmlAndMathml' | undefined;
        leqno?: boolean | undefined;
        fleqn?: boolean | undefined;
        throwOnError?: boolean | undefined;
        errorColor?: string | undefined;
        macros?: any;
        minRuleThickness?: number | undefined;
        colorIsTextColor?: boolean | undefined;
        maxSize?: number | undefined;
        maxExpand?: number | undefined;
        strict?: boolean | string | undefined;
        globalGroup?: boolean | undefined;
        trust?: boolean | ((context: { command: string }) => boolean) | undefined;
    }): string;
};

export const mathRender = (element: HTMLElement, options?: { cdn?: string, extPath?: string, math?: IMath }) => {
    const mathElements = mathRenderAdapter.getElements(element);

    if (mathElements.length === 0) {
        return;
    }

    const defaultOptions = {
        cdn: Constants.CDN,
        math: {
            inlineDigit: false,
            macros: {},
        },
    };

    if (options && options.math) {
        options.math =
            Object.assign({}, defaultOptions.math, options.math);
    }
    options = Object.assign({}, defaultOptions, options);

    const baseUrl = options.extPath || options.cdn;
    addStyle(`${baseUrl}/dist/js/katex/katex.min.css`, "vditorKatexStyle");
    addScript(`${baseUrl}/dist/js/katex/katex.min.js`, "vditorKatexScript").then(() => {
        addScript(`${baseUrl}/dist/js/katex/mhchem.min.js`, "vditorKatexChemScript").then(() => {
            for (const mathElement of mathElements) {
                if (mathElement.parentElement.classList.contains("vditor-wysiwyg__pre") ||
                    mathElement.parentElement.classList.contains("vditor-ir__marker--pre")) {
                    continue;
                }
                if (mathElement.getAttribute("data-math")) {
                    continue;
                }
                const math = code160to32(mathRenderAdapter.getCode(mathElement));
                mathElement.setAttribute("data-math", math);
                try {
                    mathElement.innerHTML = katex.renderToString(math, {
                        displayMode: mathElement.tagName === "DIV",
                        strict: false,
                        throwOnError: false,
                        output: "html",
                        macros: options.math.macros,
                        trust: true,
                    });
                } catch (e) {
                    mathElement.innerHTML = e.message;
                    mathElement.className = "language-math vditor-reset--error";
                }

                mathElement.addEventListener("copy", (event: ClipboardEvent) => {
                    event.stopPropagation();
                    event.preventDefault();
                    const vditorMathElement = (event.currentTarget as HTMLElement).closest(".language-math");
                    event.clipboardData.setData("text/html", vditorMathElement.innerHTML);
                    event.clipboardData.setData("text/plain",
                        vditorMathElement.getAttribute("data-math"));
                });
            }
        });
    });
};
