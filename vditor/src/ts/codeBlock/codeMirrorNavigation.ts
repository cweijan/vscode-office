import {hasClosestBlock} from "../util/hasClosest";
import {isCtrl} from "../util/compatibility";
import {getSelectPosition} from "../util/selection";
import {
    focusCodeMirror,
    isCmCodeBlock,
    isInsideCodeMirror,
} from "./codeMirrorManager";

/** 从相邻块用 ↑/↓ 进入 CodeMirror */
export const tryFocusAdjacentCodeMirror = (vditor: IVditor, event: KeyboardEvent, range: Range) => {
    if (isCtrl(event) || event.altKey || event.shiftKey || isInsideCodeMirror(event.target)) {
        return false;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        return false;
    }

    const blockElement = hasClosestBlock(range.startContainer);
    if (!blockElement) {
        return false;
    }

    const editor = vditor[vditor.currentMode].element as HTMLElement;
    const text = blockElement.textContent || "";
    const position = getSelectPosition(blockElement, editor, range);

    if (event.key === "ArrowDown") {
        const nextElement = blockElement.nextElementSibling as HTMLElement;
        if (!isCmCodeBlock(nextElement)) {
            return false;
        }
        if (text.substr(0, position.start).indexOf("\n") === -1 &&
            position.start >= text.trimRight().length) {
            focusCodeMirror(nextElement, true, vditor);
            event.preventDefault();
            return true;
        }
    }

    if (event.key === "ArrowUp") {
        const previousElement = blockElement.previousElementSibling as HTMLElement;
        if (!isCmCodeBlock(previousElement)) {
            return false;
        }
        if (text.substr(0, position.start).indexOf("\n") === -1) {
            focusCodeMirror(previousElement, false, vditor);
            event.preventDefault();
            return true;
        }
    }

    return false;
};
