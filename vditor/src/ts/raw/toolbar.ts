type RawLineCommand = "check" | "list" | "ordered-list" | "quote";

const getSelectedLineRange = (textarea: HTMLTextAreaElement) => {
    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndSearchStart = end > start && value[end - 1] === "\n" ? end - 2 : end;
    const nextLineBreak = value.indexOf("\n", Math.max(lineEndSearchStart, lineStart));
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    return {lineStart, lineEnd, start, end};
};

const replaceRawRange = (
    vditor: IVditor,
    start: number,
    end: number,
    replacement: string,
    selectionStart = start + replacement.length,
    selectionEnd = selectionStart,
) => {
    const textarea = vditor.raw.element;
    if (textarea.disabled) {
        return;
    }
    clearTimeout(vditor.raw.inputTimeoutId);
    textarea.setRangeText(replacement, start, end, "preserve");
    textarea.focus();
    textarea.setSelectionRange(selectionStart, selectionEnd);
    vditor.raw.record(vditor);
};

const clampRawOffset = (textarea: HTMLTextAreaElement, offset: number) => {
    return Math.min(Math.max(0, offset), textarea.value.length);
};

const getRunBefore = (value: string, position: number, char: string) => {
    let index = position - 1;
    while (index >= 0 && value[index] === char) {
        index--;
    }
    return position - index - 1;
};

const getRunAfter = (value: string, position: number, char: string) => {
    let index = position;
    while (index < value.length && value[index] === char) {
        index++;
    }
    return index - position;
};

const canToggleRawWrap = (
    value: string,
    start: number,
    end: number,
    prefix: string,
    suffix: string,
    selectionIncludesMarkers: boolean,
) => {
    if (!prefix || !suffix) {
        return false;
    }
    if (prefix === "*" && suffix === "*") {
        const beforeRun = selectionIncludesMarkers ? getRunAfter(value, start, "*") : getRunBefore(value, start, "*");
        const afterRun = selectionIncludesMarkers ? getRunBefore(value, end, "*") : getRunAfter(value, end, "*");
        return beforeRun !== 2 && afterRun !== 2;
    }
    return true;
};

const wrapRawSelection = (vditor: IVditor, prefix: string, suffix = "", enableToggle = false) => {
    const textarea = vditor.raw.element;
    const {selectionStart, selectionEnd, value} = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    if (enableToggle) {
        const selectionIncludesMarkers = selected.startsWith(prefix) && selected.endsWith(suffix) &&
            selected.length >= prefix.length + suffix.length &&
            canToggleRawWrap(value, selectionStart, selectionEnd, prefix, suffix, true);
        if (selectionIncludesMarkers) {
            const replacement = selected.slice(prefix.length, selected.length - suffix.length);
            replaceRawRange(
                vditor,
                selectionStart,
                selectionEnd,
                replacement,
                selectionStart,
                selectionStart + replacement.length,
            );
            return;
        }

        const selectionHasMarkersAround = selectionStart >= prefix.length &&
            value.slice(selectionStart - prefix.length, selectionStart) === prefix &&
            value.slice(selectionEnd, selectionEnd + suffix.length) === suffix &&
            canToggleRawWrap(value, selectionStart, selectionEnd, prefix, suffix, false);
        if (selectionHasMarkersAround) {
            replaceRawRange(
                vditor,
                selectionStart - prefix.length,
                selectionEnd + suffix.length,
                selected,
                selectionStart - prefix.length,
                selectionEnd - prefix.length,
            );
            return;
        }
    }

    const replacement = `${prefix}${selected}${suffix}`;
    const cursorStart = selectionStart + prefix.length;
    const cursorEnd = cursorStart + selected.length;
    replaceRawRange(vditor, selectionStart, selectionEnd, replacement, cursorStart, cursorEnd);
};

const insertRawText = (vditor: IVditor, text: string, cursorOffset = text.length) => {
    const textarea = vditor.raw.element;
    replaceRawRange(
        vditor,
        textarea.selectionStart,
        textarea.selectionEnd,
        text,
        textarea.selectionStart + cursorOffset,
    );
};

export const insertRawMarkdown = (
    vditor: IVditor,
    text: string,
    selection?: { start: number, end: number },
) => {
    const textarea = vditor.raw.element;
    const start = clampRawOffset(textarea, selection?.start ?? textarea.selectionStart);
    const end = Math.max(start, clampRawOffset(textarea, selection?.end ?? textarea.selectionEnd));
    replaceRawRange(vditor, start, end, text, start + text.length);
};

const insertRawBlock = (vditor: IVditor, text: string) => {
    const textarea = vditor.raw.element;
    const value = textarea.value;
    const start = textarea.selectionStart;
    const prefix = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const suffix = start < value.length && value[start] !== "\n" ? "\n" : "";
    insertRawText(vditor, `${prefix}${text}${suffix}`);
};

const getLineCommandPattern = (command: RawLineCommand) => {
    if (command === "check") {
        return /^(\s*)[-*+]\s+\[[ xX]\]\s+/;
    }
    if (command === "ordered-list") {
        return /^(\s*)\d+[.)]\s+/;
    }
    if (command === "quote") {
        return /^(\s*)>\s?/;
    }
    return /^(\s*)[-*+]\s+/;
};

const addLineCommandPrefix = (line: string, command: RawLineCommand, index: number) => {
    if (command === "check") {
        return `* [ ] ${line}`;
    }
    if (command === "ordered-list") {
        return `${index + 1}. ${line}`;
    }
    if (command === "quote") {
        return `> ${line}`;
    }
    return `* ${line}`;
};

const mapLineCommandOffset = (
    offset: number,
    changes: Array<{ oldStart: number, oldLength: number, delta: number, prefixDelta: number }>,
) => {
    let accumulatedDelta = 0;
    for (const change of changes) {
        const oldEnd = change.oldStart + change.oldLength;
        if (offset < change.oldStart) {
            return offset + accumulatedDelta;
        }
        if (offset <= oldEnd) {
            return Math.max(change.oldStart + accumulatedDelta, offset + accumulatedDelta + change.prefixDelta);
        }
        accumulatedDelta += change.delta;
    }
    return offset + accumulatedDelta;
};

const toggleRawLineCommand = (vditor: IVditor, command: RawLineCommand) => {
    const textarea = vditor.raw.element;
    const {lineStart, lineEnd, start, end} = getSelectedLineRange(textarea);
    const block = textarea.value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const pattern = getLineCommandPattern(command);
    const nonEmptyLines = lines.filter((line) => line.trim() !== "");
    const shouldRemove = nonEmptyLines.length > 0 && nonEmptyLines.every((line) => pattern.test(line));
    let oldOffset = 0;
    const changes: Array<{ oldStart: number, oldLength: number, delta: number, prefixDelta: number }> = [];
    const nextLines = lines.map((line, index) => {
        const nextLine = shouldRemove ? line.replace(pattern, "$1") : addLineCommandPrefix(line, command, index);
        const delta = nextLine.length - line.length;
        changes.push({
            delta,
            oldLength: line.length,
            oldStart: oldOffset,
            prefixDelta: delta,
        });
        oldOffset += line.length + 1;
        return nextLine;
    });
    const replacement = nextLines.join("\n");
    replaceRawRange(
        vditor,
        lineStart,
        lineEnd,
        replacement,
        lineStart + mapLineCommandOffset(start - lineStart, changes),
        lineStart + mapLineCommandOffset(end - lineStart, changes),
    );
};

const indentRawLines = (vditor: IVditor) => {
    const textarea = vditor.raw.element;
    const {lineStart, lineEnd, start, end} = getSelectedLineRange(textarea);
    const block = textarea.value.slice(lineStart, lineEnd);
    const indent = vditor.options.tab || "\t";
    const changes: Array<{ oldStart: number, oldLength: number, delta: number, prefixDelta: number }> = [];
    let oldOffset = 0;
    const replacement = block.split("\n").map((line) => {
        changes.push({
            delta: indent.length,
            oldLength: line.length,
            oldStart: oldOffset,
            prefixDelta: indent.length,
        });
        oldOffset += line.length + 1;
        return `${indent}${line}`;
    }).join("\n");
    replaceRawRange(
        vditor,
        lineStart,
        lineEnd,
        replacement,
        lineStart + mapLineCommandOffset(start - lineStart, changes),
        lineStart + mapLineCommandOffset(end - lineStart, changes),
    );
};

const outdentRawLines = (vditor: IVditor) => {
    const textarea = vditor.raw.element;
    const {lineStart, lineEnd, start, end} = getSelectedLineRange(textarea);
    const block = textarea.value.slice(lineStart, lineEnd);
    let removedBeforeStart = 0;
    let totalRemoved = 0;
    let offset = lineStart;
    const replacement = block.split("\n").map((line) => {
        const match = line.match(/^(\t| {1,4})/);
        const removed = match ? match[0].length : 0;
        if (removed && offset < start) {
            removedBeforeStart += Math.min(removed, start - offset);
        }
        totalRemoved += removed;
        offset += line.length + 1;
        return removed ? line.slice(removed) : line;
    }).join("\n");
    replaceRawRange(
        vditor,
        lineStart,
        lineEnd,
        replacement,
        Math.max(lineStart, start - removedBeforeStart),
        Math.max(lineStart, end - totalRemoved),
    );
};

const insertRawCodeBlock = (vditor: IVditor) => {
    const textarea = vditor.raw.element;
    const {selectionStart, selectionEnd, value} = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const leading = selectionStart > 0 && value[selectionStart - 1] !== "\n" ? "\n" : "";
    const trailing = selectionEnd < value.length && value[selectionEnd] !== "\n" ? "\n" : "";
    const body = selected ? `${selected}${selected.endsWith("\n") ? "" : "\n"}` : "\n";
    const replacement = `${leading}\`\`\`\n${body}\`\`\`\n${trailing}`;
    const cursorStart = selected ? selectionStart + replacement.length : selectionStart + leading.length + 4;
    const cursorEnd = cursorStart;
    replaceRawRange(vditor, selectionStart, selectionEnd, replacement, cursorStart, cursorEnd);
};

const insertRawTable = (vditor: IVditor, prefix: string, suffix: string) => {
    const textarea = vditor.raw.element;
    const {selectionStart, selectionEnd, value} = textarea;
    const leading = selectionStart > 0 && value[selectionStart - 1] !== "\n" ? "\n" : "";
    const trailing = selectionEnd < value.length && value[selectionEnd] !== "\n" ? "\n" : "";
    const replacement = `${leading}${prefix}${suffix}\n${trailing}`;
    const cursor = selectionStart + leading.length + prefix.length;
    replaceRawRange(vditor, selectionStart, selectionEnd, replacement, cursor, cursor);
};

export const processRawToolbar = (
    vditor: IVditor,
    actionBtn: Element,
    prefix = "",
    suffix = "",
) => {
    const command = actionBtn.getAttribute("data-type") || "";
    if (command === "check" || command === "list" || command === "ordered-list" || command === "quote") {
        toggleRawLineCommand(vditor, command);
        return;
    }
    if (command === "indent") {
        indentRawLines(vditor);
        return;
    }
    if (command === "outdent") {
        outdentRawLines(vditor);
        return;
    }
    if (command === "code") {
        insertRawCodeBlock(vditor);
        return;
    }
    if (command === "line") {
        insertRawBlock(vditor, "---\n");
        return;
    }
    if (command === "table") {
        insertRawTable(vditor, prefix, suffix);
        return;
    }
    wrapRawSelection(
        vditor,
        prefix,
        suffix,
        command === "bold" || command === "italic" || command === "strike" || command === "inline-code",
    );
};

export const setRawHeading = (vditor: IVditor, marker: string) => {
    const textarea = vditor.raw.element;
    const {lineStart, lineEnd, start, end} = getSelectedLineRange(textarea);
    const block = textarea.value.slice(lineStart, lineEnd);
    const changes: Array<{ oldStart: number, oldLength: number, delta: number, prefixDelta: number }> = [];
    let oldOffset = 0;
    const replacement = block.split("\n").map((line) => {
        const oldPrefix = line.match(/^\s{0,3}#{1,6}\s*/)?.[0] || "";
        const withoutHeading = line.replace(/^\s{0,3}#{1,6}\s*/, "");
        const nextLine = marker ? `${marker}${withoutHeading}` : withoutHeading;
        const delta = nextLine.length - line.length;
        changes.push({
            delta,
            oldLength: line.length,
            oldStart: oldOffset,
            prefixDelta: marker.length - oldPrefix.length,
        });
        oldOffset += line.length + 1;
        return nextLine;
    }).join("\n");
    replaceRawRange(
        vditor,
        lineStart,
        lineEnd,
        replacement,
        lineStart + mapLineCommandOffset(start - lineStart, changes),
        lineStart + mapLineCommandOffset(end - lineStart, changes),
    );
};

export const insertRawEmptyLine = (vditor: IVditor, position: "before" | "after") => {
    const textarea = vditor.raw.element;
    const {lineStart, lineEnd} = getSelectedLineRange(textarea);
    const insertAt = position === "before" ? lineStart : lineEnd;
    const cursor = position === "before" ? insertAt : insertAt + 1;
    replaceRawRange(vditor, insertAt, insertAt, "\n", cursor);
};
