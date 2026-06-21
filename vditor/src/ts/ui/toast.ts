const toastMap = new WeakMap<HTMLElement, Toast>();

export class Toast {
    public element: HTMLElement;
    private hideTimer: number | undefined;

    constructor() {
        this.element = document.createElement("div");
        this.element.className = "vditor-toast-container";
    }

    public show(message: string, duration = 4000) {
        clearTimeout(this.hideTimer);
        this.element.className = "vditor-toast-container vditor-toast-container--show";
        this.element.innerHTML = `<div class="vditor-toast">
<span class="vditor-toast__icon" aria-hidden="true">
<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.25" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10l2.25 2.25L13.5 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
</span>
<span class="vditor-toast__message"></span>
<button type="button" class="vditor-toast__close" aria-label="${window.VditorI18n.close}">
<svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
</button>
</div>`;
        this.element.querySelector(".vditor-toast__message").textContent = message;
        this.element.querySelector(".vditor-toast__close").addEventListener("click", () => {
            this.hide();
        });
        if (duration > 0) {
            this.hideTimer = window.setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    public hide() {
        clearTimeout(this.hideTimer);
        this.element.className = "vditor-toast-container";
        this.element.innerHTML = "";
    }
}

export const showToast = (vditor: IVditor, message: string, duration = 4000) => {
    let toast = toastMap.get(vditor.element);
    if (!toast) {
        toast = new Toast();
        vditor.element.appendChild(toast.element);
        toastMap.set(vditor.element, toast);
    }
    toast.show(message, duration);
};
