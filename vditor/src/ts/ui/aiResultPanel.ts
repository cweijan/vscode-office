const CLS = "vditor-ai-result";

export class AIResultPanel {
    private el: HTMLElement | null = null;
    private originalEl: HTMLPreElement | null = null;
    private resultEl: HTMLPreElement | null = null;
    private acceptBtn: HTMLButtonElement | null = null;
    private spinnerEl: HTMLElement | null = null;
    private pendingResult: string = "";
    private onAccept: ((result: string) => void) | null = null;
    private onDiscard: (() => void) | null = null;
    private onCancel: (() => void) | null = null;

    public open(
        original: string,
        anchorRect: DOMRect | null,
        onAccept: (result: string) => void,
        onDiscard: () => void,
        onCancel: () => void,
    ) {
        this.onAccept = onAccept;
        this.onDiscard = onDiscard;
        this.onCancel = onCancel;
        this.pendingResult = "";

        this.destroy();
        const i = window.VditorI18n;
        const el = document.createElement("div");
        el.className = CLS;
        el.setAttribute("role", "dialog");
        el.innerHTML = `
            <div class="${CLS}__header">
                <span class="codicon codicon-sparkle ${CLS}__icon"></span>
                <span class="${CLS}__title">${i.aiPolish}</span>
                <span class="${CLS}__spinner"></span>
                <button type="button" class="${CLS}__close" data-action="discard" title="${i.aiCancel}">
                    <span class="codicon codicon-close"></span>
                </button>
            </div>
            <div class="${CLS}__body">
                <div class="${CLS}__pane ${CLS}__pane--original">
                    <div class="${CLS}__pane-label">${i.aiOriginal ?? "Original"}</div>
                    <pre class="${CLS}__text"></pre>
                </div>
                <div class="${CLS}__divider"></div>
                <div class="${CLS}__pane ${CLS}__pane--result">
                    <div class="${CLS}__pane-label">${i.aiResult ?? "AI Result"}</div>
                    <pre class="${CLS}__text ${CLS}__text--loading"></pre>
                </div>
            </div>
            <div class="${CLS}__footer">
                <button type="button" class="${CLS}__btn ${CLS}__btn--discard" data-action="discard">
                    <span class="codicon codicon-close"></span>${i.aiDiscard ?? "Discard"}
                </button>
                <button type="button" class="${CLS}__btn ${CLS}__btn--accept" data-action="accept" disabled>
                    <span class="codicon codicon-check"></span>${i.aiAccept ?? "Accept"}
                </button>
            </div>`;

        this.el = el;
        this.spinnerEl = el.querySelector<HTMLElement>(`.${CLS}__spinner`);
        this.originalEl = el.querySelector<HTMLPreElement>(`.${CLS}__pane--original .${CLS}__text`);
        this.resultEl = el.querySelector<HTMLPreElement>(`.${CLS}__pane--result .${CLS}__text`);
        this.acceptBtn = el.querySelector<HTMLButtonElement>(`[data-action="accept"]`);

        if (this.originalEl) this.originalEl.textContent = original;

        document.body.appendChild(el);
        this.position(anchorRect);
        this.bindEvents();
    }

    public stream(chunk: string) {
        this.pendingResult += chunk;
        if (this.resultEl) {
            this.resultEl.textContent = this.pendingResult;
            this.resultEl.classList.remove(`${CLS}__text--loading`);
        }
    }

    public showResult(result: string) {
        this.pendingResult = result;
        if (this.resultEl) {
            this.resultEl.textContent = result;
            this.resultEl.classList.remove(`${CLS}__text--loading`);
        }
        if (this.spinnerEl) this.spinnerEl.hidden = true;
        if (this.acceptBtn) this.acceptBtn.disabled = false;
    }

    public endStream() {
        if (this.spinnerEl) this.spinnerEl.hidden = true;
        if (this.resultEl) this.resultEl.classList.remove(`${CLS}__text--loading`);
        if (this.acceptBtn) this.acceptBtn.disabled = false;
    }

    public destroy() {
        this.el?.remove();
        this.el = null;
        this.originalEl = null;
        this.resultEl = null;
        this.acceptBtn = null;
        this.spinnerEl = null;
    }

    private position(anchorRect: DOMRect | null) {
        if (!this.el) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const panelW = Math.min(640, vw - 32);
        this.el.style.width = `${panelW}px`;

        if (!anchorRect) {
            // Center horizontally, show in lower third
            this.el.style.left = `${Math.round((vw - panelW) / 2)}px`;
            this.el.style.top = `${Math.round(vh * 0.55)}px`;
            return;
        }

        // Horizontal: align to selection left, clamp to viewport
        let left = anchorRect.left;
        left = Math.max(16, Math.min(left, vw - panelW - 16));
        this.el.style.left = `${left}px`;

        // Vertical: prefer below selection, flip above if needed
        const gap = 8;
        const panelH = 320; // estimated
        const spaceBelow = vh - anchorRect.bottom - gap;
        const spaceAbove = anchorRect.top - gap;

        if (spaceBelow >= panelH || spaceBelow >= spaceAbove) {
            this.el.style.top = `${anchorRect.bottom + gap}px`;
        } else {
            this.el.style.top = `${Math.max(8, anchorRect.top - panelH - gap)}px`;
        }
    }

    private bindEvents() {
        this.el?.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
            if (action === "accept") {
                this.onAccept?.(this.pendingResult);
                this.destroy();
            } else if (action === "discard") {
                this.onDiscard?.();
                this.destroy();
            }
        });
    }
}
