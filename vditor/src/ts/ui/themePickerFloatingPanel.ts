const FLOATING_PANEL_CLASS = "vditor-theme-picker-popover";

export interface IFloatingThemePanelOptions {
    popoverClass?: string;
}

export interface IFloatingThemePanelHandle {
    reposition: () => void;
    close: () => void;
}

const clampPanelPosition = (panel: HTMLElement, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    const panelWidth = panel.offsetWidth || 180;
    const panelHeight = panel.offsetHeight || 240;

    let top = rect.bottom + gap;
    let left = rect.right - panelWidth;

    if (left < margin) {
        left = margin;
    }
    if (left + panelWidth > window.innerWidth - margin) {
        left = window.innerWidth - panelWidth - margin;
    }
    if (top + panelHeight > window.innerHeight - margin) {
        const above = rect.top - panelHeight - gap;
        if (above >= margin) {
            top = above;
        }
    }

    panel.style.position = "fixed";
    panel.style.top = `${Math.max(margin, top)}px`;
    panel.style.left = `${Math.max(margin, left)}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.zIndex = "10002";
    panel.style.display = "block";
};

export const openFloatingThemePanel = (
    panel: HTMLElement,
    anchor: HTMLElement,
    options?: IFloatingThemePanelOptions,
): IFloatingThemePanelHandle => {
    const popoverClass = options?.popoverClass ?? FLOATING_PANEL_CLASS;
    panel.classList.add(popoverClass);
    if (panel.parentElement !== document.body) {
        document.body.appendChild(panel);
    }

    const reposition = () => {
        clampPanelPosition(panel, anchor);
    };

    const onScrollOrResize = () => {
        reposition();
    };

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    requestAnimationFrame(() => {
        reposition();
        requestAnimationFrame(reposition);
    });

    return {
        reposition,
        close: () => {
            window.removeEventListener("scroll", onScrollOrResize, true);
            window.removeEventListener("resize", onScrollOrResize);
            panel.classList.remove(popoverClass);
            panel.style.position = "";
            panel.style.top = "";
            panel.style.left = "";
            panel.style.right = "";
            panel.style.bottom = "";
            panel.style.zIndex = "";
            panel.style.display = "";
        },
    };
};

export const restoreFloatingThemePanel = (panel: HTMLElement, themeWrap: HTMLElement) => {
    if (panel.parentElement !== themeWrap) {
        themeWrap.appendChild(panel);
    }
};
