const isMacPlatform = () => navigator.platform.toUpperCase().indexOf("MAC") >= 0
    || navigator.platform === "iPhone";

const MAC_OPTION_IGNORE_CODES = new Set([
    "Tab", "Escape", "Enter", "Backspace", "Delete",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "Home", "End", "PageUp", "PageDown",
    "Insert", "ContextMenu", "CapsLock", "AltLeft", "AltRight",
]);

/** macOS 仅 Option(Alt) + 符号键时返回 true；仅 preventDefault，不 stopPropagation，以便 VS Code 快捷键仍生效 */
export const shouldBlockMacOptionSymbol = (event: KeyboardEvent) => {
    if (!isMacPlatform() || !event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
        return false;
    }
    if (event.isComposing || event.key === "Alt" || event.key === "Process") {
        return false;
    }
    if (MAC_OPTION_IGNORE_CODES.has(event.code) || /^F\d+$/.test(event.code)) {
        return false;
    }
    if (event.key === "Dead") {
        return true;
    }
    if (/^(Key|Digit|Numpad|Intl|Bracket|Slash|Backslash|Quote|Semicolon|Comma|Period|Minus|Equal|Backquote)/.test(event.code)) {
        return true;
    }
    return event.key.length === 1;
};
