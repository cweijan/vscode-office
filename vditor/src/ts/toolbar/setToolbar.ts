import {Constants} from "../constants";
import {
    isInsideSettingsThemePopover,
    isInsideSettingsFloatingMenu,
    isInsideToolbar,
    registerPopoverOutsideDismiss,
} from "../ui/chromePopoverDismiss";
import {getEventName} from "../util/compatibility";
import {
    bindSettingsHintPosition,
    isSettingsHintPanel,
} from "../ui/settingsHintPosition";

let settingsHintPositionCleanup: (() => void) | undefined;

const clearSettingsHintPosition = () => {
    settingsHintPositionCleanup?.();
    settingsHintPositionCleanup = undefined;
};

const hasOpenToolbarSubPanel = (vditor: IVditor) => {
    for (const panel of vditor.toolbar.element.querySelectorAll(".vditor-hint")) {
        if ((panel as HTMLElement).style.display === "block") {
            return true;
        }
    }
    return false;
};

export const bindToolbarOutsideDismiss = (vditor: IVditor) => {
    registerPopoverOutsideDismiss({
        isActive: () => hasOpenToolbarSubPanel(vditor),
        shouldIgnoreTarget: (target) => isInsideToolbar(target) || isInsideSettingsThemePopover(target) || isInsideSettingsFloatingMenu(target),
        dismiss: () => hidePanel(vditor, ["subToolbar"]),
    });
};

export const bindToolbarTooltipDismiss = (toolbarElement: HTMLElement) => {
    toolbarElement.addEventListener("mouseout", (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        const tooltipElement = target?.closest(".vditor-tooltipped") as HTMLElement | null;
        if (!tooltipElement || !toolbarElement.contains(tooltipElement)) {
            return;
        }
        const relatedTarget = event.relatedTarget as Node | null;
        if (relatedTarget && tooltipElement.contains(relatedTarget)) {
            return;
        }
        tooltipElement.classList.remove("vditor-tooltipped--hover");
        tooltipElement.blur();
    });
};

export const removeCurrentToolbar = (toolbar: { [key: string]: HTMLElement }, names: string[]) => {
    names.forEach((name) => {
        if (!toolbar[name]) {
            return;
        }
        const itemElement = toolbar[name].children[0];
        if (itemElement && itemElement.classList.contains("vditor-menu--current")) {
            itemElement.classList.remove("vditor-menu--current");
        }
    });
};

export const setCurrentToolbar = (toolbar: { [key: string]: HTMLElement }, names: string[]) => {
    names.forEach((name) => {
        if (!toolbar[name]) {
            return;
        }
        const itemElement = toolbar[name].children[0];
        if (itemElement && !itemElement.classList.contains("vditor-menu--current")) {
            itemElement.classList.add("vditor-menu--current");
        }
    });
};

export const enableToolbar = (toolbar: { [key: string]: HTMLElement }, names: string[]) => {
    names.forEach((name) => {
        if (!toolbar[name]) {
            return;
        }
        const itemElement = toolbar[name].children[0];
        if (itemElement && itemElement.classList.contains(Constants.CLASS_MENU_DISABLED)) {
            itemElement.classList.remove(Constants.CLASS_MENU_DISABLED);
        }
    });
};

export const disableToolbar = (toolbar: { [key: string]: HTMLElement }, names: string[]) => {
    names.forEach((name) => {
        if (!toolbar[name]) {
            return;
        }
        const itemElement = toolbar[name].children[0];
        if (itemElement && !itemElement.classList.contains(Constants.CLASS_MENU_DISABLED)) {
            itemElement.classList.add(Constants.CLASS_MENU_DISABLED);
        }
    });
};

export const hideToolbar = (toolbar: { [key: string]: HTMLElement }, names: string[]) => {
    names.forEach((name) => {
        if (!toolbar[name]) {
            return;
        }
        if (toolbar[name]) {
            toolbar[name].style.display = "none";
        }
    });
};

export const showToolbar = (toolbar: { [key: string]: HTMLElement }, names: string[]) => {
    names.forEach((name) => {
        if (!toolbar[name]) {
            return;
        }
        toolbar[name].style.removeProperty("display");
    });
};

// "subToolbar", "hint", "popover"
export const hidePanel = (vditor: IVditor, panels: string[], exceptElement?: HTMLElement) => {
    if (panels.includes("subToolbar")) {
        vditor.toolbar.element.querySelectorAll(".vditor-hint").forEach((item: HTMLElement) => {
            if (exceptElement && item.isEqualNode(exceptElement)) {
                return;
            }
            item.style.display = "none";
        });
        clearSettingsHintPosition();
    }
    if (panels.includes("hint")) {
        vditor.hint.element.style.display = "none";
    }
    if (vditor.wysiwyg.popover && panels.includes("popover")) {
        vditor.wysiwyg.popover.style.display = "none";
    }
};

export const toggleSubMenu = (vditor: IVditor, panelElement: HTMLElement, actionBtn: Element, level: number) => {
    actionBtn.addEventListener(getEventName(), (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (actionBtn.classList.contains(Constants.CLASS_MENU_DISABLED)) {
            return;
        }
        vditor.toolbar.element.querySelectorAll(".vditor-hint--current").forEach((item) => {
            item.classList.remove("vditor-hint--current");
        });
        if (panelElement.style.display === "block") {
            panelElement.style.display = "none";
            clearSettingsHintPosition();
        } else {
            hidePanel(vditor, ["subToolbar", "hint", "popover"], actionBtn.parentElement.parentElement);
            if (!actionBtn.classList.contains("vditor-tooltipped")) {
                actionBtn.classList.add("vditor-hint--current");
            }
            panelElement.style.display = "block";
            if (isSettingsHintPanel(panelElement)) {
                panelElement.classList.remove("vditor-panel--left");
                clearSettingsHintPosition();
                settingsHintPositionCleanup = bindSettingsHintPosition(
                    panelElement,
                    actionBtn as HTMLElement,
                );
            } else if (vditor.toolbar.element.getBoundingClientRect().right - actionBtn.getBoundingClientRect().right < 250) {
                panelElement.classList.add("vditor-panel--left");
            } else {
                panelElement.classList.remove("vditor-panel--left");
            }
        }
    });
};
