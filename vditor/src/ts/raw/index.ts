import { Constants } from "../constants";
import { hidePanel } from "../toolbar/setToolbar";
import { uploadFiles } from "../upload/index";
import { accessLocalStorage, isCtrl } from "../util/compatibility";
import { hotkeyEvent, selectEvent, wheelZoomFontSizeEvent } from "../util/editorCommonEvent";
import { saveCacheFocus } from "../util/cacheFocus";
import { fireContentInput } from "../util/saveToolbarState";
import { renderToc } from "../util/toc";
import { insertRawMarkdown } from "./toolbar";

type RawSelection = { start: number, end: number };

class Raw {
    public element: HTMLTextAreaElement;
    public outlineElement: HTMLElement;
    public inputTimeoutId = 0;
    public afterRenderLastAt = 0;
    private hasPendingInput = false;
    private headingElements: HTMLElement[] = [];
    private lastOutlineText = "";
    private lineStartOffsets: number[] = [0];

    constructor(vditor: IVditor) {
        const divElement = document.createElement("div");
        divElement.className = "vditor-raw";

        this.element = document.createElement("textarea");
        this.element.className = "vditor-raw__textarea";
        this.element.placeholder = vditor.options.placeholder || "";
        this.element.spellcheck = false;
        this.element.wrap = "off";

        this.outlineElement = document.createElement("div");
        this.outlineElement.className = "vditor-raw__outline";

        divElement.appendChild(this.element);
        divElement.appendChild(this.outlineElement);
        this.bindEvent(vditor);
        hotkeyEvent(vditor, this.element);
        wheelZoomFontSizeEvent(vditor, this.element);
        selectEvent(vditor, this.element);
    }

    public record(vditor: IVditor, enableInput = true, enableAddUndoStack = true) {
        clearTimeout(this.inputTimeoutId);
        this.hasPendingInput = false;
        const text = this.element.value;
        if (this.syncOutline()) {
            renderToc(vditor);
        }
        if (enableInput) {
            fireContentInput(vditor, text);
        }
        if (vditor.options.counter.enable) {
            vditor.counter.render(vditor, text);
        }
        if (vditor.options.cache.enable && accessLocalStorage()) {
            localStorage.setItem(vditor.options.cache.id, text);
            if (vditor.options.cache.after) {
                vditor.options.cache.after(text);
            }
        }
        if (enableAddUndoStack) {
            vditor.undo.addToUndoStack(vditor);
        }
        this.afterRenderLastAt = Date.now();
    }

    public syncOutline() {
        const markdown = this.element.value;
        if (markdown === this.lastOutlineText) {
            return false;
        }

        this.lastOutlineText = markdown;
        this.headingElements = [];
        this.lineStartOffsets = [0];
        const fragment = document.createDocumentFragment();
        let inFence = false;
        let fenceMarker = "";
        const lines = markdown.split("\n");
        let lineStart = 0;

        lines.forEach((line, index) => {
            this.lineStartOffsets[index] = lineStart;
            lineStart += line.length + 1;
            const normalizedLine = line.endsWith("\r") ? line.slice(0, -1) : line;
            const fenceMatch = normalizedLine.match(/^\s{0,3}(`{3,}|~{3,})/);
            if (fenceMatch) {
                const marker = fenceMatch[1];
                if (!inFence) {
                    inFence = true;
                    fenceMarker = marker;
                } else if (marker[0] === fenceMarker[0] && marker.length >= fenceMarker.length) {
                    inFence = false;
                    fenceMarker = "";
                }
                return;
            }
            if (inFence) {
                return;
            }

            const headingMatch = normalizedLine.match(/^\s{0,3}(#{1,6})(?:\s+|$)(.*)$/);
            if (!headingMatch) {
                return;
            }

            const level = headingMatch[1].length;
            const text = headingMatch[2].replace(/\s+#+\s*$/, "").trim();
            const heading = document.createElement(`h${level}`);
            heading.textContent = text || headingMatch[1];
            heading.dataset.line = `${index + 1}`;
            this.headingElements.push(heading);
            fragment.appendChild(heading);
        });

        this.outlineElement.replaceChildren(fragment);
        return true;
    }

    public getActiveHeadingId() {
        if (this.headingElements.length === 0) {
            return null;
        }

        const style = window.getComputedStyle(this.element);
        const lineHeight = parseFloat(style.lineHeight) || 20;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const currentLine = Math.max(1, Math.floor(Math.max(0, this.element.scrollTop - paddingTop) / lineHeight) + 1);
        let left = 0;
        let right = this.headingElements.length - 1;
        let activeIndex = 0;
        while (left <= right) {
            const middle = Math.floor((left + right) / 2);
            const line = Number(this.headingElements[middle].dataset.line);
            if (line <= currentLine) {
                activeIndex = middle;
                left = middle + 1;
            } else {
                right = middle - 1;
            }
        }
        return this.headingElements[activeIndex].id || null;
    }

    public scrollToHeading(targetId: string) {
        const heading = this.outlineElement.querySelector(`#${CSS.escape(targetId)}`) as HTMLElement | null;
        const line = Number(heading?.dataset.line);
        if (!line) {
            return false;
        }

        return this.scrollToLine(line);
    }

    public scrollToLine(line: number) {
        if (!Number.isFinite(line) || line < 1) {
            return false;
        }

        const position = this.getLineStartOffset(line);
        this.element.focus();
        this.element.setSelectionRange(position, position);

        const style = window.getComputedStyle(this.element);
        const lineHeight = parseFloat(style.lineHeight) || 20;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        this.element.scrollTop = Math.max(0, (line - 1) * lineHeight + paddingTop);
        return true;
    }

    public selectCurrentLines() {
        const {startLine, endLine, offsets, lines} = this.getLineState();
        this.element.focus();
        this.element.setSelectionRange(offsets[startLine], this.getLineRangeEnd(lines, offsets, endLine));
        return true;
    }

    public deleteCurrentLines(vditor: IVditor) {
        const {startLine, endLine, lines} = this.getLineState();
        const nextLines = lines.slice();
        nextLines.splice(startLine, endLine - startLine + 1);
        if (nextLines.length === 0) {
            nextLines.push("");
        }
        const offsets = this.getLineOffsets(nextLines);
        const cursor = offsets[Math.min(startLine, nextLines.length - 1)] ?? this.joinLines(nextLines).length;
        this.applyValue(vditor, this.joinLines(nextLines), cursor, cursor);
        return true;
    }

    public moveCurrentLines(vditor: IVditor, direction: "up" | "down") {
        const {startLine, endLine, lines} = this.getLineState();
        if ((direction === "up" && startLine === 0) || (direction === "down" && endLine >= lines.length - 1)) {
            return false;
        }

        const count = endLine - startLine + 1;
        const nextLines = lines.slice();
        const movedLines = nextLines.splice(startLine, count);
        const insertAt = direction === "up" ? startLine - 1 : startLine + 1;
        nextLines.splice(insertAt, 0, ...movedLines);

        const newStartLine = direction === "up" ? startLine - 1 : startLine + 1;
        this.selectLineBlockAfterChange(vditor, nextLines, newStartLine, count);
        return true;
    }

    public copyCurrentLines(vditor: IVditor, direction: "up" | "down") {
        const {startLine, endLine, lines} = this.getLineState();
        const count = endLine - startLine + 1;
        const copiedLines = lines.slice(startLine, endLine + 1);
        const nextLines = lines.slice();
        const insertAt = direction === "up" ? startLine : endLine + 1;
        nextLines.splice(insertAt, 0, ...copiedLines);

        const originalStartLine = direction === "up" ? startLine + count : startLine;
        this.selectLineBlockAfterChange(vditor, nextLines, originalStartLine, count);
        return true;
    }

    public insertEmptyLine(vditor: IVditor, position: "before" | "after") {
        const {startLine, endLine, lines} = this.getLineState();
        const nextLines = lines.slice();
        const insertAt = position === "before" ? startLine : endLine + 1;
        nextLines.splice(insertAt, 0, "");
        const offsets = this.getLineOffsets(nextLines);
        const cursor = offsets[insertAt] ?? this.joinLines(nextLines).length;
        this.applyValue(vditor, this.joinLines(nextLines), cursor, cursor);
        return true;
    }

    public flushPendingRecord(vditor: IVditor) {
        if (!this.hasPendingInput) {
            return;
        }
        this.record(vditor);
    }

    private scheduleRecord(vditor: IVditor) {
        this.hasPendingInput = true;
        clearTimeout(this.inputTimeoutId);
        this.inputTimeoutId = window.setTimeout(() => {
            this.record(vditor);
        }, vditor.options.undoDelay);
    }

    private bindEvent(vditor: IVditor) {
        this.element.addEventListener("focus", () => {
            if (vditor.options.focus) {
                vditor.options.focus(this.element.value);
            }
            hidePanel(vditor, ["subToolbar", "hint"]);
        });

        this.element.addEventListener("blur", () => {
            this.flushPendingRecord(vditor);
            saveCacheFocus(vditor);
            if (vditor.options.blur) {
                vditor.options.blur(this.element.value);
            }
        });

        this.element.addEventListener("input", () => {
            this.scheduleRecord(vditor);
        });

        this.element.addEventListener("keydown", (event: KeyboardEvent) => {
            if (isCtrl(event) && !event.altKey && !event.isComposing) {
                const key = event.key.toLowerCase();
                if (key === "z" && !event.shiftKey) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    this.flushPendingRecord(vditor);
                    vditor.undo.undo(vditor);
                    return;
                }
                if (key === "y" || (key === "z" && event.shiftKey)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    this.flushPendingRecord(vditor);
                    vditor.undo.redo(vditor);
                    return;
                }
            }
            if (event.key === "Escape" && vditor.options.esc && !event.isComposing) {
                vditor.options.esc(this.element.value);
                event.preventDefault();
                event.stopImmediatePropagation();
            }
            if (event.key === "Tab" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                this.insertText(vditor.options.tab || "\t");
                this.scheduleRecord(vditor);
            }
        });

        this.element.addEventListener("dragstart", (event) => {
            event.dataTransfer?.setData(Constants.DROP_EDITOR, Constants.DROP_EDITOR);
        });

        this.element.addEventListener("dragover", (event: DragEvent) => {
            if (event.dataTransfer?.types.includes("Files")) {
                event.preventDefault();
            }
        });

        this.element.addEventListener("paste", (event: ClipboardEvent) => {
            this.handleFileInput(vditor, event);
        });

        this.element.addEventListener("drop", (event: DragEvent) => {
            if (event.dataTransfer?.getData(Constants.DROP_EDITOR)) {
                return;
            }
            this.handleFileInput(vditor, event);
        });
    }

    private handleFileInput(vditor: IVditor, event: ClipboardEvent | DragEvent) {
        const files = this.getInputFiles(event);
        if (!files) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.element.focus();
        if ((vditor.options.upload.url || vditor.options.upload.handler) && vditor.upload) {
            uploadFiles(vditor, files);
            return;
        }
        this.insertImageFilesAsDataUrls(vditor, files, {
            end: this.element.selectionEnd,
            start: this.element.selectionStart,
        });
    }

    private getInputFiles(event: ClipboardEvent | DragEvent) {
        if (event instanceof ClipboardEvent && event.clipboardData?.files.length) {
            return event.clipboardData.files;
        }
        if (event instanceof DragEvent && event.dataTransfer?.types.includes("Files")) {
            return event.dataTransfer.items.length > 0 ? event.dataTransfer.items : event.dataTransfer.files;
        }
        return null;
    }

    private getFiles(files: FileList | DataTransferItemList) {
        const result: File[] = [];
        for (let i = 0; i < files.length; i++) {
            const item = files[i];
            const file = item instanceof DataTransferItem ? item.getAsFile() : item;
            if (file) {
                result.push(file);
            }
        }
        return result;
    }

    private insertImageFilesAsDataUrls(
        vditor: IVditor,
        files: FileList | DataTransferItemList,
        selection: RawSelection,
    ) {
        const imageFiles = this.getFiles(files).filter((file) => file.type.startsWith("image"));
        let insertAt = {...selection};
        const insertNext = (index: number) => {
            const file = imageFiles[index];
            if (!file) {
                return;
            }
            const fileReader = new FileReader();
            fileReader.onload = () => {
                const markdown = `![${file.name}](${fileReader.result?.toString() || ""})\n`;
                insertRawMarkdown(vditor, markdown, insertAt);
                insertAt = {
                    end: insertAt.start + markdown.length,
                    start: insertAt.start + markdown.length,
                };
                insertNext(index + 1);
            };
            fileReader.readAsDataURL(file);
        };
        insertNext(0);
    }

    private insertText(text: string) {
        const start = this.element.selectionStart;
        const end = this.element.selectionEnd;
        this.element.setRangeText(text, start, end, "end");
    }

    private applyValue(vditor: IVditor, value: string, selectionStart: number, selectionEnd = selectionStart) {
        clearTimeout(this.inputTimeoutId);
        this.element.value = value;
        this.element.focus();
        this.element.setSelectionRange(selectionStart, selectionEnd);
        this.record(vditor);
    }

    private getLineOffsets(lines: string[]) {
        const offsets: number[] = [];
        let offset = 0;
        lines.forEach((line, index) => {
            offsets[index] = offset;
            offset += line.length + 1;
        });
        return offsets;
    }

    private getLineIndex(offsets: number[], offset: number) {
        let line = 0;
        for (let index = 0; index < offsets.length; index++) {
            if (offsets[index] <= offset) {
                line = index;
            } else {
                break;
            }
        }
        return line;
    }

    private getLineState() {
        const value = this.element.value;
        const lines = value.split("\n");
        const offsets = this.getLineOffsets(lines);
        const selectionStart = this.element.selectionStart;
        const selectionEnd = this.element.selectionEnd;
        const endOffset = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n" ?
            selectionEnd - 1 : selectionEnd;
        return {
            endLine: this.getLineIndex(offsets, endOffset),
            lines,
            offsets,
            startLine: this.getLineIndex(offsets, selectionStart),
        };
    }

    private getLineRangeEnd(lines: string[], offsets: number[], line: number) {
        if (line < lines.length - 1) {
            return offsets[line + 1];
        }
        return this.joinLines(lines).length;
    }

    private joinLines(lines: string[]) {
        return lines.join("\n");
    }

    private selectLineBlockAfterChange(vditor: IVditor, lines: string[], startLine: number, count: number) {
        const offsets = this.getLineOffsets(lines);
        const selectionStart = offsets[startLine] ?? this.joinLines(lines).length;
        const selectionEnd = this.getLineRangeEnd(lines, offsets, startLine + count - 1);
        this.applyValue(vditor, this.joinLines(lines), selectionStart, selectionEnd);
    }

    private getLineStartOffset(line: number) {
        return this.lineStartOffsets[line - 1] ?? this.element.value.length;
    }
}

export { Raw };
