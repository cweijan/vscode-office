export function showConfirm(message: string, confirmLabel?: string): Promise<boolean> {
    const i = window.VditorI18n;
    const okLabel = confirmLabel ?? (i?.aiDelete ?? "Delete");
    const cancelLabel = i?.aiCancel ?? "Cancel";

    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "vditor-confirm-overlay";
        overlay.innerHTML = `
            <div class="vditor-confirm" role="dialog" aria-modal="true">
                <p class="vditor-confirm__message">${message}</p>
                <div class="vditor-confirm__footer">
                    <button type="button" class="vditor-confirm__btn vditor-confirm__btn--cancel" data-cancel>${cancelLabel}</button>
                    <button type="button" class="vditor-confirm__btn vditor-confirm__btn--ok" data-ok>${okLabel}</button>
                </div>
            </div>`;

        const close = (result: boolean) => {
            overlay.remove();
            document.removeEventListener("keydown", onKey);
            resolve(result);
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.stopPropagation(); close(false); }
            if (e.key === "Enter") { e.stopPropagation(); close(true); }
        };

        overlay.querySelector("[data-cancel]")!.addEventListener("click", () => close(false));
        overlay.querySelector("[data-ok]")!.addEventListener("click", () => close(true));
        overlay.addEventListener("click", e => {
            e.stopPropagation();
            if (e.target === overlay) close(false);
        });
        document.addEventListener("keydown", onKey, true);

        document.body.appendChild(overlay);
        (overlay.querySelector("[data-ok]") as HTMLElement).focus();
    });
}
