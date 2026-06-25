import { CM_BLOCK_CLASS, isInsideCodeBlockChrome, isInsideCodeMirror } from "../codeBlock/codeMirrorManager";

// 保持原来的 keyCode 触发逻辑：222 (quote), 219 ([/{), 57 ((/9)
const AUTO_PAIR_KEYCODES = new Set([222, 219, 57]);

/**
 * keyCode 命中后再校验 event.key，避免 IME / 中文全角标点误触发。
 * - ( : keyCode 57 + Shift 且 event.key === '('
 * - [ : keyCode 219 + 非 Shift 且 event.key === '['（去除 {）
 * - " : keyCode 222 + Shift 且 event.key === '"'
 */
const resolveKeyCodePairClose = (event: KeyboardEvent): string | null => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
        return null;
    }
    if (!AUTO_PAIR_KEYCODES.has(event.keyCode)) {
        return null;
    }
    if (event.keyCode === 57 && event.shiftKey && event.key === "(") {
        return ")";
    }
    if (event.keyCode === 219 && !event.shiftKey && event.key === "[") {
        return "]";
    }
    if (event.keyCode === 222 && event.shiftKey && event.key === "\"") {
        return "\"";
    }
    return null;
};

const isInsideCodeBlockContext = (target: EventTarget | null) => {
    if (isInsideCodeMirror(target) || isInsideCodeBlockChrome(target)) {
        return true;
    }
    const node = target instanceof Element ? target : (target as Node | null)?.parentElement;
    if (!node) {
        return false;
    }
    return !!node.closest(`[data-type='code-block'], .${CM_BLOCK_CLASS}`);
};

/** 自动补全括号、方括号和双引号；不在代码块内生效 */
export const handleAutoSymbolPair = (event: KeyboardEvent) => {
    const close = resolveKeyCodePairClose(event);
    if (!close) {
        return;
    }
    if (isInsideCodeBlockContext(event.target) || isInsideCodeBlockContext(document.activeElement)) {
        return;
    }
    const selection = document.getSelection();
    if (!selection || selection.toString() !== "") {
        return;
    }
    document.execCommand("insertText", false, close);
    selection.modify("move", "left", "character");
};
