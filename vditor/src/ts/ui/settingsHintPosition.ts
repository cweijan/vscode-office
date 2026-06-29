const SETTINGS_HINT_MARGIN = 16;
const SETTINGS_HINT_GAP = 6;
const SETTINGS_PANEL_SELECTOR = ".vditor-settings-panel";

export const isSettingsHintPanel = (panelElement: HTMLElement) => {
    return !!panelElement.querySelector(SETTINGS_PANEL_SELECTOR);
};

export const bindSettingsHintPosition = (
    panelElement: HTMLElement,
    anchorBtn: HTMLElement,
) => {
    const reposition = () => {
        if (panelElement.style.display !== "block") {
            return;
        }

        const anchorRect = anchorBtn.getBoundingClientRect();
        const panelWidth = panelElement.offsetWidth || panelElement.getBoundingClientRect().width || 300;
        const margin = SETTINGS_HINT_MARGIN;
        const anchorCenterX = anchorRect.left + anchorRect.width / 2;
        let left = anchorCenterX - panelWidth / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));

        const top = anchorRect.bottom + SETTINGS_HINT_GAP;
        panelElement.style.position = "fixed";
        panelElement.style.left = `${left}px`;
        panelElement.style.top = `${top}px`;
        panelElement.style.right = "auto";
        panelElement.style.bottom = "auto";
        panelElement.style.transform = "none";

        const arrowLeft = anchorCenterX - left - 7;
        const arrowPadding = 14;
        const clampedArrowLeft = Math.max(
            arrowPadding,
            Math.min(panelWidth - arrowPadding, arrowLeft),
        );
        panelElement.style.setProperty("--settings-panel-arrow-left", `${clampedArrowLeft}px`);
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

    return () => {
        window.removeEventListener("scroll", onScrollOrResize, true);
        window.removeEventListener("resize", onScrollOrResize);
        panelElement.style.position = "";
        panelElement.style.left = "";
        panelElement.style.top = "";
        panelElement.style.right = "";
        panelElement.style.bottom = "";
        panelElement.style.transform = "";
        panelElement.style.removeProperty("--settings-panel-arrow-left");
    };
};
