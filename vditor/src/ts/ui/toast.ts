const toastMap = new WeakMap<HTMLElement, Toast>();

export class Toast {
    public element: HTMLElement;
    private hideTimer: number | undefined;

    constructor() {
        this.element = document.createElement("div");
        this.element.className = "vditor-toast-container";
        this.element.setAttribute("role", "status");
        this.element.setAttribute("aria-live", "polite");
    }

    public show(message: string, duration = 4000, type: "success" | "error" = "success", position: "top-right" | "bottom-right" = "top-right") {
        clearTimeout(this.hideTimer);
        const typeClass = type === "error" ? " vditor-toast-container--error" : "";
        const positionClass = position === "bottom-right" ? " vditor-toast-container--bottom-right" : "";
        this.element.className = `vditor-toast-container vditor-toast-container--show${typeClass}${positionClass}`;
        const iconSvg = type === "error"
            ? `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.25" stroke="currentColor" stroke-width="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
            : `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.25" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10l2.25 2.25L13.5 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        this.element.innerHTML = `<div class="vditor-toast">
<span class="vditor-toast__icon" aria-hidden="true">${iconSvg}</span>
<span class="vditor-toast__message"></span>
<button type="button" class="vditor-toast__close" aria-label="${window.VditorI18n.close}">
<svg viewBox="0 0 16 16" fill="currentColor"><path d="M7.116 8l-4.558 4.558.884.884L8 8.884l4.558 4.558.884-.884L8.884 8l4.558-4.558-.884-.884L8 7.116 3.442 2.558l-.884.884L7.116 8z"/></svg>
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

export const showToast = (vditor: IVditor, message: string, duration = 2000, type: "success" | "error" = "success", position: "top-right" | "bottom-right" = "top-right") => {
    let toast = toastMap.get(vditor.element);
    if (!toast) {
        toast = new Toast();
        vditor.element.appendChild(toast.element);
        toastMap.set(vditor.element, toast);
    }
    toast.show(message, duration, type, position);
};
