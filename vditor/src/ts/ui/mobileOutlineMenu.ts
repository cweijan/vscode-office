import { codicon } from "../util/codicon";
import { getEventName } from "../util/compatibility";

export const EDITOR_THEME_MOBILE_BREAKPOINT = 700;

const MOBILE_OUTLINE_TRIGGER_ACTIVE_CLASS = "vditor-mobile-outline-trigger--active";

type MobileOutlineHost = {
    outline: HTMLElement;
    backdrop: HTMLElement;
    menuBtn: HTMLButtonElement;
    drawerOpen: boolean;
    wasMobileLayout: boolean;
};

const mobileOutlineHosts = new WeakMap<IVditor, MobileOutlineHost>();

export const isEditorThemeMobileLayout = (vditor: IVditor): boolean => {
    return vditor.element.hasAttribute("data-editor-theme")
        && window.innerWidth <= EDITOR_THEME_MOBILE_BREAKPOINT;
};

export const isOutlinePanelVisible = (vditor: IVditor): boolean => {
    if (isEditorThemeMobileLayout(vditor)) {
        return vditor.outline.element.classList.contains("vditor-outline--mobile-open");
    }
    return vditor.outline.element.style.display !== "none";
};

const getHost = (vditor: IVditor) => mobileOutlineHosts.get(vditor);

export const isMobileOutlineDrawerOpen = (vditor: IVditor): boolean => {
    return getHost(vditor)?.drawerOpen ?? false;
};

export const setMobileOutlineDrawerOpen = (vditor: IVditor, open: boolean) => {
    const host = getHost(vditor);
    if (host) {
        host.drawerOpen = open;
    }
};

const updateMobileOutlineTrigger = (menuBtn: HTMLButtonElement, open: boolean) => {
    menuBtn.classList.toggle(MOBILE_OUTLINE_TRIGGER_ACTIVE_CLASS, open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.innerHTML = open ? codicon("close") : codicon("menu");
};

const clearMobileOutlineUi = (vditor: IVditor) => {
    const host = getHost(vditor);
    const outline = vditor.outline.element;
    outline.classList.remove("vditor-outline--mobile-open");
    vditor.element.classList.remove("vditor--mobile-outline-open");
    host?.backdrop.classList.remove("vditor-outline__backdrop--visible");
    if (host) {
        host.drawerOpen = false;
        updateMobileOutlineTrigger(host.menuBtn, false);
    }
};

export const syncMobileOutlinePanel = (vditor: IVditor, show: boolean) => {
    const host = getHost(vditor);
    const outline = vditor.outline.element;
    if (!isEditorThemeMobileLayout(vditor)) {
        clearMobileOutlineUi(vditor);
        return;
    }

    outline.style.display = "";
    outline.classList.toggle("vditor-outline--mobile-open", show);
    host?.backdrop.classList.toggle("vditor-outline__backdrop--visible", show);
    if (host) {
        updateMobileOutlineTrigger(host.menuBtn, show);
    }
    vditor.element.classList.toggle("vditor--mobile-outline-open", show);
};

export const closeMobileOutline = (vditor: IVditor) => {
    if (!isEditorThemeMobileLayout(vditor)) {
        return;
    }
    setMobileOutlineDrawerOpen(vditor, false);
    vditor.outline.resetMobileDrawer(vditor);
};

const handleMobileOutlineResize = (vditor: IVditor) => {
    const host = getHost(vditor);
    if (!host) {
        return;
    }

    const isMobile = isEditorThemeMobileLayout(vditor);
    if (!isMobile) {
        clearMobileOutlineUi(vditor);
        if (host.wasMobileLayout) {
            vditor.outline.restoreDesktopState(vditor);
        }
        host.wasMobileLayout = false;
        return;
    }

    if (!host.wasMobileLayout) {
        setMobileOutlineDrawerOpen(vditor, false);
        vditor.outline.resetMobileDrawer(vditor);
    } else if (host.drawerOpen) {
        syncMobileOutlinePanel(vditor, true);
    } else {
        vditor.outline.resetMobileDrawer(vditor);
    }
    host.wasMobileLayout = true;
};

export const prepareEditorThemeMobileOutline = (vditor: IVditor) => {
    if (!vditor.element.hasAttribute("data-editor-theme")
        || window.innerWidth > EDITOR_THEME_MOBILE_BREAKPOINT) {
        return;
    }
    vditor.outline.element.classList.remove("vditor-outline--mobile-open");
    vditor.outline.element.style.display = "none";
};

export const initMobileOutlineMenu = (vditor: IVditor) => {
    if (!vditor.element.hasAttribute("data-editor-theme") || getHost(vditor)) {
        return;
    }

    prepareEditorThemeMobileOutline(vditor);

    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.setAttribute("data-type", "mobile-outline");
    menuBtn.className = "vditor-mobile-outline-trigger";
    menuBtn.setAttribute("aria-label", window.VditorI18n?.outline || "Outline");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.innerHTML = codicon("menu");
    vditor.element.appendChild(menuBtn);

    const backdrop = document.createElement("div");
    backdrop.className = "vditor-outline__backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    vditor.element.appendChild(backdrop);

    const host: MobileOutlineHost = {
        outline: vditor.outline.element,
        backdrop,
        menuBtn,
        drawerOpen: false,
        wasMobileLayout: isEditorThemeMobileLayout(vditor),
    };
    mobileOutlineHosts.set(vditor, host);

    menuBtn.addEventListener(getEventName(), (event) => {
        event.preventDefault();
        const open = !host.drawerOpen;
        setMobileOutlineDrawerOpen(vditor, open);
        vditor.outline.toggle(vditor, open);
    });

    backdrop.addEventListener("click", () => {
        closeMobileOutline(vditor);
    });

    const onResize = () => {
        handleMobileOutlineResize(vditor);
    };
    window.addEventListener("resize", onResize);
    handleMobileOutlineResize(vditor);
};
