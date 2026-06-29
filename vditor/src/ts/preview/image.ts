import { codicon } from "../util/codicon";
import { resolveLinkClickFromTarget } from "../util/linkClick";

export type PreviewImageOptions = {
    vditor?: IVditor;
    lang?: keyof II18n;
    theme?: string;
};

let activeOverlay: HTMLElement | null = null;
let activeKeyDownHandler: ((event: KeyboardEvent) => void) | null = null;

const isDarkPreview = (theme?: string) => {
    if (theme === "dark") {
        return true;
    }
    return !!document.querySelector(".vditor--dark, [data-editor-theme='One Dark'], [data-editor-theme='Github Dark'], [data-editor-theme='Dracula'], [data-editor-theme='Monokai'], [data-editor-theme='Nord']");
};

const resolvePreviewOptions = (
    langOrOptions: keyof II18n | PreviewImageOptions,
    theme: string,
): PreviewImageOptions => {
    if (typeof langOrOptions === "string") {
        return { lang: langOrOptions, theme };
    }
    return { ...langOrOptions, theme: langOrOptions.theme ?? theme };
};

const closePreview = () => {
    if (!activeOverlay) {
        return;
    }
    const overlay = activeOverlay;
    overlay.classList.add("vditor-img-overlay--closing");
    if (activeKeyDownHandler) {
        document.removeEventListener("keydown", activeKeyDownHandler);
        activeKeyDownHandler = null;
    }
    window.setTimeout(() => {
        overlay.remove();
        if (activeOverlay === overlay) {
            activeOverlay = null;
        }
        document.body.style.overflow = "";
    }, 220);
};

const createToolbarButton = (
    action: string,
    label: string,
    icon: string,
    primary = false,
) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `vditor-img-overlay__btn${primary ? " vditor-img-overlay__btn--primary" : ""}`;
    btn.dataset.action = action;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = `${icon}<span>${label}</span>`;
    return btn;
};

export const previewImage = (
    oldImgElement: HTMLImageElement,
    langOrOptions: keyof II18n | PreviewImageOptions = "zh_CN",
    theme = "classic",
) => {
    const options = resolvePreviewOptions(langOrOptions, theme);
    const i18n = window.VditorI18n;
    const vditor = options.vditor;
    const src = oldImgElement.currentSrc || oldImgElement.src;
    if (!src) {
        return;
    }

    closePreview();

    const overlay = document.createElement("div");
    overlay.className = `vditor-img-overlay${isDarkPreview(options.theme) ? " vditor-img-overlay--dark" : ""}`;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", i18n.imagePreview ?? "Image preview");

    const backdrop = document.createElement("div");
    backdrop.className = "vditor-img-overlay__backdrop";

    const stage = document.createElement("div");
    stage.className = "vditor-img-overlay__stage";

    const img = document.createElement("img");
    img.className = "vditor-img-overlay__image";
    img.src = src;
    img.alt = oldImgElement.alt || "";
    img.draggable = false;

    const chrome = document.createElement("div");
    chrome.className = "vditor-img-overlay__chrome";

    const toolbar = document.createElement("div");
    toolbar.className = "vditor-img-overlay__toolbar";

    const hasOpenHandler = !!(vditor && typeof vditor.options.onLinkClick === "function");
    if (hasOpenHandler) {
        toolbar.appendChild(createToolbarButton(
            "open",
            i18n.imageOpen ?? "Open",
            codicon("link-external"),
            true,
        ));
    }

    const rotateBtn = createToolbarButton(
        "rotate",
        i18n.spin ?? "Rotate",
        codicon("redo"),
    );
    rotateBtn.dataset.deg = "0";

    const closeBtn = createToolbarButton(
        "close",
        i18n.close ?? "Close",
        codicon("close"),
    );

    toolbar.append(rotateBtn, closeBtn);
    chrome.appendChild(toolbar);
    stage.appendChild(img);
    overlay.append(backdrop, stage, chrome);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    activeOverlay = overlay;

    requestAnimationFrame(() => {
        overlay.classList.add("vditor-img-overlay--visible");
    });

    let rotation = 0;
    const updateRotation = () => {
        img.style.transform = rotation ? `rotate(${rotation}deg)` : "";
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closePreview();
        }
    };
    activeKeyDownHandler = onKeyDown;
    document.addEventListener("keydown", onKeyDown);

    const onOpen = () => {
        if (!vditor || typeof vditor.options.onLinkClick !== "function") {
            return;
        }
        const payload = resolveLinkClickFromTarget(oldImgElement, vditor);
        if (!payload) {
            return;
        }
        const event = new MouseEvent("click", { bubbles: true, cancelable: true });
        vditor.options.onLinkClick({ ...payload, action: "dblclick" }, event, vditor);
        closePreview();
    };

    toolbar.addEventListener("click", (event) => {
        const btn = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
        if (!btn) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        switch (btn.dataset.action) {
            case "open":
                onOpen();
                break;
            case "rotate":
                rotation = (rotation + 90) % 360;
                rotateBtn.dataset.deg = String(rotation);
                updateRotation();
                break;
            case "close":
                closePreview();
                break;
        }
    });

    backdrop.addEventListener("click", closePreview);
    stage.addEventListener("click", (event) => {
        if (event.target === stage) {
            closePreview();
        }
    });
};
