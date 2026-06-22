const HIGHLIGHT_CLASS = "vditor-find-highlight";
const CURRENT_CLASS = "vditor-find-highlight--current";

const c = (name: string) => `<span class="codicon codicon-${name}" aria-hidden="true"></span>`;

export class FindBar {
    public element: HTMLElement;
    private input: HTMLInputElement;
    private countEl: HTMLElement;
    private matches: HTMLElement[] = [];
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

    private search() {
        this.clearHighlights();
        const query = this.input.value.trim();
        if (!query) {
            this.updateCount();
            return;
        }

        const contentEl = this.getContentEl();
        if (!contentEl) return;

        this.applyHighlights(contentEl, query);
        this.currentIndex = this.matches.length > 0 ? 0 : -1;
        this.updateCurrent();
        this.updateCount();
    }

    private applyHighlights(root: HTMLElement, query: string) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (parent.classList.contains(HIGHLIGHT_CLASS)) return NodeFilter.FILTER_REJECT;
                if (parent.closest("code, .vditor-find-bar")) return NodeFilter.FILTER_REJECT;
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
                this.matches.push(mark);
                lastIndex = idx + query.length;
                idx = lowerText.indexOf(lowerQuery, lastIndex);
            }
            if (lastIndex < text.length) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            parent.replaceChild(frag, textNode);
        }
    }

    private clearHighlights() {
        for (const mark of this.matches) {
            const parent = mark.parentNode;
            if (parent) {
                while (mark.firstChild) {
                    parent.insertBefore(mark.firstChild, mark);
                }
                parent.removeChild(mark);
                parent.normalize();
            }
        }
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
        this.matches.forEach((m, i) => m.classList.toggle(CURRENT_CLASS, i === this.currentIndex));
        if (this.currentIndex >= 0 && this.matches[this.currentIndex]) {
            this.matches[this.currentIndex].scrollIntoView({block: "center"});
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
