import {EditorSelection, RangeSetBuilder, StateEffect, StateField} from "@codemirror/state";
import {Decoration, DecorationSet, EditorView} from "@codemirror/view";

import {getCodeMirrorView} from "../codeBlock/codeMirrorManager";

const HIGHLIGHT_CLASS = "vditor-find-highlight";
const CURRENT_CLASS = "vditor-find-highlight--current";
const FIND_SKIP_SELECTOR = [
    "code",
    ".cm-editor",
    ".vditor-cm-chrome",
    ".vditor-find-bar",
    "[hidden]",
    "[aria-hidden='true']",
].join(", ");

const c = (name: string) => `<span class="codicon codicon-${name}" aria-hidden="true"></span>`;

type FindMatch = FindDomMatch | FindCodeMirrorMatch;

interface FindDomMatch {
    kind: "dom";
    mark: HTMLElement;
}

interface FindCodeMirrorMatch {
    kind: "cm";
    block: HTMLElement;
    view: EditorView;
    from: number;
    to: number;
}

const cmDecorationsEffect = StateEffect.define<DecorationSet>();

const cmDecorationsField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(decorations, tr) {
        decorations = decorations.map(tr.changes);
        for (const effect of tr.effects) {
            if (effect.is(cmDecorationsEffect)) {
                decorations = effect.value;
            }
        }
        return decorations;
    },
    provide: (field) => EditorView.decorations.from(field),
});

const ensureFindDecorationsField = (view: EditorView) => {
    if (view.state.field(cmDecorationsField, false)) {
        return;
    }
    view.dispatch({
        effects: StateEffect.appendConfig.of([cmDecorationsField]),
    });
};

export class FindBar {
    public element: HTMLElement;
    private input: HTMLInputElement;
    private countEl: HTMLElement;
    private matches: FindMatch[] = [];
    private currentIndex = -1;
    private vditor: IVditor;

    constructor(vditor: IVditor) {
        this.vditor = vditor;

        this.element = document.createElement("div");
        this.element.className = "vditor-find-bar";
        this.element.style.display = "none";
        this.element.innerHTML = `
            <input type="text" class="vditor-find-bar__input" placeholder="${window.VditorI18n?.["find-placeholder"] || "Find…"}"/>
            <span class="vditor-find-bar__count"></span>
            <button type="button" class="vditor-find-bar__nav" data-dir="-1" title="Previous (Shift+Enter)">${c("arrow-up")}</button>
            <button type="button" class="vditor-find-bar__nav" data-dir="1" title="Next (Enter)">${c("arrow-down")}</button>
            <button type="button" class="vditor-find-bar__close">${c("close")}</button>
        `;

        this.input = this.element.querySelector(".vditor-find-bar__input") as HTMLInputElement;
        this.countEl = this.element.querySelector(".vditor-find-bar__count") as HTMLElement;

        this.input.addEventListener("input", () => this.search());

        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.navigate(e.shiftKey ? -1 : 1);
            } else if (e.key === "Escape") {
                this.hide();
            }
        });

        (this.element.querySelector("[data-dir='-1']") as HTMLElement).addEventListener("click", () => this.navigate(-1));
        (this.element.querySelector("[data-dir='1']") as HTMLElement).addEventListener("click", () => this.navigate(1));
        (this.element.querySelector(".vditor-find-bar__close") as HTMLElement).addEventListener("click", () => this.hide());
    }

    private getContentEl(): HTMLElement | null {
        const mode = this.vditor.currentMode;
        if (mode === "ir") return this.vditor.element.querySelector(".vditor-ir");
        if (mode === "wysiwyg") return this.vditor.element.querySelector(".vditor-wysiwyg");
        return null;
    }

    private getScrollElement(): HTMLElement | null {
        const contentEl = this.getContentEl();
        if (!contentEl) return null;
        if (contentEl.classList.contains("vditor-reset")) {
            return contentEl;
        }
        return contentEl.querySelector(".vditor-reset") as HTMLElement | null;
    }

    private scrollMarkIntoView(mark: HTMLElement) {
        const scrollEl = this.getScrollElement();
        if (!scrollEl) {
            mark.scrollIntoView({block: "nearest", inline: "nearest"});
            return;
        }
        const scrollRect = scrollEl.getBoundingClientRect();
        const markRect = mark.getBoundingClientRect();
        const padding = 40;
        if (markRect.top < scrollRect.top + padding) {
            scrollEl.scrollTop += markRect.top - scrollRect.top - padding;
        } else if (markRect.bottom > scrollRect.bottom - padding) {
            scrollEl.scrollTop += markRect.bottom - scrollRect.bottom + padding;
        }
    }

    private scrollCodeMirrorMatchIntoView(match: FindCodeMirrorMatch) {
        match.view.dispatch({
            effects: EditorView.scrollIntoView(match.from, {y: "center"}),
            selection: EditorSelection.cursor(match.from),
        });
    }

    private search() {
        this.clearHighlights();
        const query = this.input.value.trim();
        if (!query) {
            this.updateCount();
            return;
        }

        const contentEl = this.getContentEl();
        if (!contentEl) return;

        this.applyDomHighlights(contentEl, query);
        this.applyCodeMirrorHighlights(contentEl, query);
        this.sortMatchesInDocumentOrder();
        this.currentIndex = this.matches.length > 0 ? 0 : -1;
        this.updateCurrent();
        this.updateCount();
    }

    private applyDomHighlights(root: HTMLElement, query: string) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (parent.classList.contains(HIGHLIGHT_CLASS)) return NodeFilter.FILTER_REJECT;
                if (parent.closest(FIND_SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            },
        });

        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
            textNodes.push(node as Text);
        }

        const lowerQuery = query.toLowerCase();
        for (const textNode of textNodes) {
            const text = textNode.textContent || "";
            const lowerText = text.toLowerCase();
            let idx = lowerText.indexOf(lowerQuery);
            if (idx === -1) continue;

            const parent = textNode.parentNode as Node;
            const frag = document.createDocumentFragment();
            let lastIndex = 0;

            while (idx !== -1) {
                if (idx > lastIndex) {
                    frag.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
                }
                const mark = document.createElement("mark");
                mark.className = HIGHLIGHT_CLASS;
                mark.textContent = text.slice(idx, idx + query.length);
                frag.appendChild(mark);
                this.matches.push({kind: "dom", mark});
                lastIndex = idx + query.length;
                idx = lowerText.indexOf(lowerQuery, lastIndex);
            }
            if (lastIndex < text.length) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            parent.replaceChild(frag, textNode);
        }
    }

    private applyCodeMirrorHighlights(root: HTMLElement, query: string) {
        const lowerQuery = query.toLowerCase();
        const blockElements = root.querySelectorAll<HTMLElement>("[data-type='code-block'], [data-type='math-block']");
        for (const blockElement of blockElements) {
            const view = getCodeMirrorView(blockElement);
            if (!view) {
                continue;
            }
            ensureFindDecorationsField(view);
            const text = view.state.doc.toString();
            const lowerText = text.toLowerCase();
            let idx = lowerText.indexOf(lowerQuery);
            while (idx !== -1) {
                this.matches.push({
                    kind: "cm",
                    block: blockElement,
                    view,
                    from: idx,
                    to: idx + query.length,
                });
                idx = lowerText.indexOf(lowerQuery, idx + query.length);
            }
        }
        this.updateCodeMirrorDecorations();
    }

    private sortMatchesInDocumentOrder() {
        this.matches.sort((a, b) => {
            if (a.kind === "cm" && b.kind === "cm" && a.block === b.block) {
                return a.from - b.from;
            }
            const aNode = a.kind === "dom" ? a.mark : a.block;
            const bNode = b.kind === "dom" ? b.mark : b.block;
            if (aNode === bNode) {
                if (a.kind === "cm" && b.kind === "cm") {
                    return a.from - b.from;
                }
                return 0;
            }
            const position = aNode.compareDocumentPosition(bNode);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
                return -1;
            }
            if (position & Node.DOCUMENT_POSITION_PRECEDING) {
                return 1;
            }
            return 0;
        });
    }

    private updateCodeMirrorDecorations() {
        const cmMatchesByView = new Map<EditorView, Array<{match: FindCodeMirrorMatch; index: number}>>();
        this.matches.forEach((match, index) => {
            if (match.kind !== "cm") {
                return;
            }
            const matches = cmMatchesByView.get(match.view) || [];
            matches.push({match, index});
            cmMatchesByView.set(match.view, matches);
        });

        const views = new Set<EditorView>();
        this.getContentEl()?.querySelectorAll<HTMLElement>("[data-type='code-block'], [data-type='math-block']").forEach((blockElement) => {
            const view = getCodeMirrorView(blockElement);
            if (view) {
                views.add(view);
            }
        });

        views.forEach((view) => {
            ensureFindDecorationsField(view);
            const builder = new RangeSetBuilder<Decoration>();
            const matches = cmMatchesByView.get(view) || [];
            for (const {match, index} of matches) {
                const className = index === this.currentIndex
                    ? `${HIGHLIGHT_CLASS} ${CURRENT_CLASS}`
                    : HIGHLIGHT_CLASS;
                builder.add(match.from, match.to, Decoration.mark({class: className}));
            }
            view.dispatch({
                effects: cmDecorationsEffect.of(builder.finish()),
            });
        });
    }

    private clearHighlights() {
        for (const match of this.matches) {
            if (match.kind !== "dom") {
                continue;
            }
            const parent = match.mark.parentNode;
            if (parent) {
                while (match.mark.firstChild) {
                    parent.insertBefore(match.mark.firstChild, match.mark);
                }
                parent.removeChild(match.mark);
                parent.normalize();
            }
        }
        const contentEl = this.getContentEl();
        contentEl?.querySelectorAll<HTMLElement>("[data-type='code-block'], [data-type='math-block']").forEach((blockElement) => {
            const view = getCodeMirrorView(blockElement);
            if (!view) {
                return;
            }
            ensureFindDecorationsField(view);
            view.dispatch({
                effects: cmDecorationsEffect.of(Decoration.none),
            });
        });
        this.matches = [];
        this.currentIndex = -1;
    }

    private navigate(dir: 1 | -1) {
        if (this.matches.length === 0) return;
        this.currentIndex = (this.currentIndex + dir + this.matches.length) % this.matches.length;
        this.updateCurrent();
        this.updateCount();
    }

    private updateCurrent() {
        this.matches.forEach((match, i) => {
            if (match.kind === "dom") {
                match.mark.classList.toggle(CURRENT_CLASS, i === this.currentIndex);
            }
        });
        this.updateCodeMirrorDecorations();
        if (this.currentIndex >= 0 && this.matches[this.currentIndex]) {
            const match = this.matches[this.currentIndex];
            if (match.kind === "dom") {
                this.scrollMarkIntoView(match.mark);
            } else {
                this.scrollCodeMirrorMatchIntoView(match);
            }
        }
    }

    private updateCount() {
        if (this.matches.length > 0) {
            this.countEl.textContent = `${this.currentIndex + 1} / ${this.matches.length}`;
            this.countEl.classList.remove("vditor-find-bar__count--none");
        } else {
            this.countEl.textContent = window.VditorI18n?.["find-no-result"] || "No results";
            this.countEl.classList.toggle("vditor-find-bar__count--none", !!this.input.value.trim());
        }
    }

    public focusInput() {
        this.input.focus();
        this.input.select();
    }

    public show() {
        this.element.style.display = "flex";
        this.input.focus();
        this.input.select();
        if (this.input.value.trim()) {
            this.search();
        } else {
            this.updateCount();
        }
    }

    public hide() {
        this.element.style.display = "none";
        this.clearHighlights();
    }

    public toggle() {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }

    public isVisible() {
        return this.element.style.display === "flex";
    }
}
