import {
    getTopList,
    hasClosestBlock, hasClosestByAttribute, hasTopClosestByTag,
} from "../util/hasClosest";
import { hasClosestByTag } from "../util/hasClosestByHeadings";
import { log, formatMs, logPerf } from "../util/log";
import { processCodeRender } from "../util/processCode";
import {
    deactivateCodeMirrorsInScope,
    autoFocusCreatedBlockAfterSpin,
    focusCmBlockAtCursor,
    focusEmptyMathBlockAfterSpin,
    isCmCodeBlock,
    renderCodeBlocksInScope,
    syncMathBlocksDisplayMode,
} from "../codeBlock/codeMirrorManager";
import { getEditorRange, setRangeByWbr } from "../util/selection";
import { renderToc } from "../util/toc";
import { afterRenderEvent } from "./afterRenderEvent";
import { previoueIsEmptyA } from "./inlineTag";

export const input = (vditor: IVditor, range: Range, event?: InputEvent) => {
    const debug = vditor.options.debugger;
    const totalStart = debug ? performance.now() : 0;
    let stepStart = debug ? performance.now() : 0;
    let prepareHtmlMs = 0;
    let spinDomMs = 0;
    let applyDomMs = 0;
    let postProcessMs = 0;

    let blockElement = hasClosestBlock(range.startContainer);

    if (!blockElement) {
        // 使用顶级块元素，应使用 innerHTML
        blockElement = vditor.wysiwyg.element;
    }

    if (event && event.inputType !== "formatItalic"
        && event.inputType !== "deleteByDrag"
        && event.inputType !== "insertFromDrop"
        && event.inputType !== "formatBold"
        && event.inputType !== "formatRemove"
        && event.inputType !== "formatStrikeThrough"
        && event.inputType !== "insertUnorderedList"
        && event.inputType !== "insertOrderedList"
        && event.inputType !== "formatOutdent"
        && event.inputType !== "formatIndent"
        && event.inputType !== ""   // document.execCommand('unlink', false)
        || !event
    ) {
        const previousAEmptyElement = previoueIsEmptyA(range.startContainer);
        if (previousAEmptyElement) {
            // 链接结尾回车不应该复制到下一行 https://github.com/Vanessa219/vditor/issues/163
            previousAEmptyElement.remove();
        }

        // 保存光标
        vditor.wysiwyg.element.querySelectorAll("wbr").forEach((wbr) => {
            wbr.remove();
        });
        range.insertNode(document.createElement("wbr"));

        // 在行首进行删除，后面的元素会带有样式，需清除
        blockElement.querySelectorAll("[style]").forEach((item) => {
            item.removeAttribute("style");
        });

        let html = "";
        if (blockElement.getAttribute("data-type") === "link-ref-defs-block") {
            // 修改链接引用
            blockElement = vditor.wysiwyg.element;
        }

        const isWYSIWYGElement = blockElement.isEqualNode(vditor.wysiwyg.element);
        const footnoteElement = hasClosestByAttribute(blockElement, "data-type", "footnotes-block");

        if (!isWYSIWYGElement) {
            // 列表需要到最顶层
            const topListElement = getTopList(range.startContainer);
            if (topListElement && !footnoteElement) {
                const blockquoteElement = hasClosestByTag(range.startContainer, "BLOCKQUOTE");
                if (blockquoteElement) {
                    // li 中有 blockquote 就只渲染 blockquote
                    blockElement = hasClosestBlock(range.startContainer) || blockElement;
                } else {
                    blockElement = topListElement;
                }
            }

            // 修改脚注
            if (footnoteElement) {
                blockElement = footnoteElement;
            }

            html = blockElement.outerHTML;

            if (blockElement.tagName === "UL" || blockElement.tagName === "OL") {
                // 如果为列表的话，需要把上下的列表都重绘
                const listPrevElement = blockElement.previousElementSibling;
                const listNextElement = blockElement.nextElementSibling;
                if (listPrevElement && (listPrevElement.tagName === "UL" || listPrevElement.tagName === "OL")) {
                    html = listPrevElement.outerHTML + html;
                    listPrevElement.remove();
                }
                if (listNextElement && (listNextElement.tagName === "UL" || listNextElement.tagName === "OL")) {
                    html = html + listNextElement.outerHTML;
                    listNextElement.remove();
                }
                // firefox 列表回车不会产生新的 list item https://github.com/Vanessa219/vditor/issues/194
                html = html.replace("<div><wbr><br></div>", "<li><p><wbr><br></p></li>");
            }

            if (!blockElement.innerText.startsWith("```")) {
                // 添加链接引用
                vditor.wysiwyg.element.querySelectorAll("[data-type='link-ref-defs-block']").forEach((item) => {
                    if (item && !(blockElement as HTMLElement).isEqualNode(item)) {
                        html += item.outerHTML;
                        item.remove();
                    }
                });

                // 添加脚注
                vditor.wysiwyg.element.querySelectorAll("[data-type='footnotes-block']").forEach((item) => {
                    if (item && !(blockElement as HTMLElement).isEqualNode(item)) {
                        html += item.outerHTML;
                        item.remove();
                    }
                });
            }
        } else {
            // 整页重渲染时需先 deactivate CM，确保 pre 内只有干净的 code 元素，
            // 否则 Chrome toolbar / cm-editor DOM 会混入 html，Lute 无法正确解析代码内容
            deactivateCodeMirrorsInScope(vditor, vditor.wysiwyg.element);
            html = blockElement.innerHTML;
        }

        // 合并多个 em， strong，s。以防止多个相同元素在一起时不满足 commonmark 规范，出现标记符
        html = html.replace(/<\/(strong|b)><strong data-marker="\W{2}">/g, "")
            .replace(/<\/(em|i)><em data-marker="\W{1}">/g, "")
            .replace(/<\/(s|strike)><s data-marker="~{1,2}">/g, "");

        if (html === '<p data-block="0">```<wbr></p>' && vditor.hint.recentLanguage) {
            html = '<p data-block="0">```<wbr></p>'.replace("```", "```" + vditor.hint.recentLanguage);
        }

        const oldHtml = html;
        prepareHtmlMs = debug ? performance.now() - stepStart : 0;
        stepStart = debug ? performance.now() : 0;
        // TODO
        //         <ol data-tight="true" data-marker="1." data-block="0">
        //     <li data-marker="1.">sdfsdf</li>
        //     <li data-marker="2.">sdfsdfsdf
        //         <ol data-tight="true" data-marker="1." data-block="0">
        //             <li data-marker="1.">sdfsdf</li>
        //             <li data-marker="2.">​s<wbr></li>
        //         </ol>
        //     </li>
        // </ol>
        // TODO 这里要处理一下, 当li有子元素p的时候, 把他转为如上的ol
        // <ol data-tight="true" data-marker="1." data-block="0">
        //     <li data-marker="1.">sdfsdf</li>
        //     <li data-marker="2.">sdfsdfsdf
        //         <p data-block="0">​-<wbr></p>
        //     </li>
        // </ol>
        // console.log(oldHtml)
        const spinScope = isWYSIWYGElement ? vditor.wysiwyg.element : blockElement;
        if (!isWYSIWYGElement) {
            deactivateCodeMirrorsInScope(vditor, spinScope);
        }
        html = vditor.lute.SpinVditorDOM(html);
        spinDomMs = debug ? performance.now() - stepStart : 0;
        stepStart = debug ? performance.now() : 0;

        if (isWYSIWYGElement) {
            blockElement.innerHTML = html;
        } else {
            // TODO 这里的判断条件是避免tab+其他字符会生成代码块的bug
            const isUnexceptCodeBlock = html.match(/vditor-wysiwyg__pre\b/) && !oldHtml.match(/```/);
            // const isUnexceptCodeBlock=html.match(/vditor-wysiwyg__pre/) && !oldHtml.match(/```/);
            if (!isUnexceptCodeBlock) {
                // 防止创建图片后消失
                blockElement.outerHTML = html.replace(`alt=""`, `alt="img"`);
            }

            if (footnoteElement) {
                // 更新正文中的 tip
                const footnoteItemElement = hasTopClosestByTag(vditor.wysiwyg.element.querySelector("wbr"), "LI");
                if (footnoteItemElement) {
                    const footnoteRefElement = vditor.wysiwyg.element.querySelector(`sup[data-type="footnotes-ref"][data-footnotes-label="${footnoteItemElement.getAttribute("data-marker")}"]`);
                    if (footnoteRefElement) {
                        footnoteRefElement.setAttribute("aria-label",
                            footnoteItemElement.textContent.trim().substr(0, 24));
                    }
                }
            }
        }
        applyDomMs = debug ? performance.now() - stepStart : 0;
        stepStart = debug ? performance.now() : 0;

        let remountScope = spinScope;
        if (!isWYSIWYGElement) {
            const wbrElement = vditor.wysiwyg.element.querySelector("wbr");
            if (wbrElement) {
                remountScope = hasClosestBlock(wbrElement) || vditor.wysiwyg.element;
            }
        }

        let firstLinkRefDefElement: Element;
        const allLinkRefDefsElement = vditor.wysiwyg.element.querySelectorAll("[data-type='link-ref-defs-block']");
        allLinkRefDefsElement.forEach((item, index) => {
            if (index === 0) {
                firstLinkRefDefElement = item;
            } else {
                firstLinkRefDefElement.insertAdjacentHTML("beforeend", item.innerHTML);
                item.remove();
            }
        });
        if (allLinkRefDefsElement.length > 0) {
            vditor.wysiwyg.element.insertAdjacentElement("beforeend", allLinkRefDefsElement[0]);
        }

        // 脚注合并后添加的末尾
        let firstFootnoteElement: Element;
        const allFootnoteElement = vditor.wysiwyg.element.querySelectorAll("[data-type='footnotes-block']");
        allFootnoteElement.forEach((item, index) => {
            if (index === 0) {
                firstFootnoteElement = item;
            } else {
                firstFootnoteElement.insertAdjacentHTML("beforeend", item.innerHTML);
                item.remove();
            }
        });
        if (allFootnoteElement.length > 0) {
            vditor.wysiwyg.element.insertAdjacentElement("beforeend", allFootnoteElement[0]);
        }

        // 设置光标
        setRangeByWbr(vditor.wysiwyg.element, range);
        renderCodeBlocksInScope(vditor, remountScope);
        syncMathBlocksDisplayMode(remountScope, vditor);
        const activeRange = getEditorRange(vditor);
        if (!autoFocusCreatedBlockAfterSpin(vditor, vditor.wysiwyg.element, activeRange, oldHtml)) {
            focusCmBlockAtCursor(vditor, vditor.wysiwyg.element);
        }
        focusEmptyMathBlockAfterSpin(vditor, vditor.wysiwyg.element, activeRange, oldHtml);

        remountScope.querySelectorAll(".vditor-wysiwyg__preview[data-render='2']")
            .forEach((item: HTMLElement) => {
                if (isCmCodeBlock(item.parentElement as HTMLElement)) {
                    return;
                }
                processCodeRender(item, vditor);
            });
        postProcessMs = debug ? performance.now() - stepStart : 0;
    }
    stepStart = debug ? performance.now() : 0;
    renderToc(vditor);
    afterRenderEvent(vditor, {
        enableAddUndoStack: true,
        enableHint: true,
        enableInput: true,
    });
    postProcessMs += debug ? performance.now() - stepStart : 0;

    logPerf(debug, "[vditor input] input", {
        prepareHtmlMs: formatMs(prepareHtmlMs),
        spinDomMs: formatMs(spinDomMs),
        applyDomMs: formatMs(applyDomMs),
        postProcessMs: formatMs(postProcessMs),
        totalMs: formatMs(debug ? performance.now() - totalStart : 0),
    });
};
