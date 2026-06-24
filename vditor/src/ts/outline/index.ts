import {Constants} from "../constants";
import {outlineRender} from "../markdown/outlineRender";
import {isEditorThemeMobileLayout, isMobileOutlineDrawerOpen, setMobileOutlineDrawerOpen, syncMobileOutlinePanel} from "../ui/mobileOutlineMenu";
import {
    getGlobalLocalStorageSetting,
    setGlobalLocalStorageSetting,
} from "../util/globalLocalStorageSettings";
import {setSelectionFocus} from "../util/selection";
import {bindOutlineScrollSpy, restoreOutlineActive, updateOutlineActive} from "./updateOutlineActive";

const OUTLINE_MIN_WIDTH = 120;
const OUTLINE_MAX_WIDTH = 480;
const OUTLINE_WIDTH_SETTING_KEY = "outlineWidth";
const OUTLINE_ENABLE_SETTING_KEY = "outlineEnable";

const normalizeOutlineWidth = (width: number | string | undefined | null): number => {
    const parsedWidth = Number(width);
    if (Number.isNaN(parsedWidth) || parsedWidth <= 0) {
        return 0;
    }
    return Math.min(OUTLINE_MAX_WIDTH, Math.max(OUTLINE_MIN_WIDTH, parsedWidth));
};

const getStoredOutlineWidth = (vditor: IVditor): number => {
    return normalizeOutlineWidth(getGlobalLocalStorageSetting<number>(OUTLINE_WIDTH_SETTING_KEY));
};

const saveOutlineWidth = (vditor: IVditor, width: number) => {
    const normalizedWidth = normalizeOutlineWidth(width);
    if (!normalizedWidth) {
        return;
    }
    setGlobalLocalStorageSetting(OUTLINE_WIDTH_SETTING_KEY, normalizedWidth);
};

const parseStoredOutlineEnable = (value: boolean | string | null | undefined): boolean | null => {
    if (value === true || value === "true") {
        return true;
    }
    if (value === false || value === "false") {
        return false;
    }
    return null;
};

const getStoredOutlineEnable = (vditor: IVditor): boolean | null => {
    return parseStoredOutlineEnable(getGlobalLocalStorageSetting<boolean>(OUTLINE_ENABLE_SETTING_KEY));
};

const saveOutlineEnable = (vditor: IVditor, enable: boolean) => {
    setGlobalLocalStorageSetting(OUTLINE_ENABLE_SETTING_KEY, enable);
};

export class Outline {
    public element: HTMLElement;
    private contentElement: HTMLElement;
    private resizeElement: HTMLElement;
    private unbindScrollSpy?: () => void;
    private vditor?: IVditor;

    constructor(outlineLabel: string) {
        this.element = document.createElement("div");
        this.element.className = "vditor-outline";
        this.element.innerHTML = `<div class="vditor-outline__title">${outlineLabel}</div>
<div class="vditor-outline__content"></div>`;
        this.contentElement = this.element.querySelector(".vditor-outline__content") as HTMLElement;
        this.resizeElement = document.createElement("div");
        this.resizeElement.className = "vditor-outline__resize";
        this.resizeElement.setAttribute("aria-hidden", "true");
        this.element.appendChild(this.resizeElement);
        this.bindResize();
    }

    public init(vditor: IVditor) {
        this.vditor = vditor;
        this.restoreStoredWidth();
        const storedEnable = getStoredOutlineEnable(vditor);
        if (storedEnable !== null) {
            vditor.options.outline.enable = storedEnable;
        }
    }

    private restoreStoredWidth() {
        if (!this.vditor) {
            return;
        }
        const fromOptions = normalizeOutlineWidth(this.vditor.options.outline?.width);
        const restoredWidth = getStoredOutlineWidth(this.vditor) || fromOptions;
        if (!restoredWidth) {
            return;
        }
        this.element.style.width = `${restoredWidth}px`;
    }

    private bindResize() {
        this.resizeElement.addEventListener("mousedown", (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            const startX = event.clientX;
            const startWidth = this.element.offsetWidth;
            const isRight = this.element.classList.contains("vditor-outline--right");

            this.element.classList.add("vditor-outline--resizing");
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";

            const onMouseMove = (moveEvent: MouseEvent) => {
                const delta = isRight ? startX - moveEvent.clientX : moveEvent.clientX - startX;
                const width = Math.min(OUTLINE_MAX_WIDTH, Math.max(OUTLINE_MIN_WIDTH, startWidth + delta));
                this.element.style.width = `${width}px`;
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                this.element.classList.remove("vditor-outline--resizing");
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
                const width = this.element.offsetWidth;
                this.element.dispatchEvent(new CustomEvent("vditor-outline-resize", {
                    detail: {width},
                }));
                if (this.vditor) {
                    saveOutlineWidth(this.vditor, width);
                }
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    }

    public render(vditor: IVditor) {
        const tocHTML = outlineRender(vditor[vditor.currentMode].element, this.contentElement, vditor);
        if (isEditorThemeMobileLayout(vditor) || this.element.style.display !== "none") {
            restoreOutlineActive(vditor);
        }
        return tocHTML;
    }

    private bindScrollSpy(vditor: IVditor) {
        this.unbindScrollSpy?.();
        this.unbindScrollSpy = bindOutlineScrollSpy(vditor, (force) => {
            updateOutlineActive(vditor, force);
        });
    }

    private unbindScrollSpyListener() {
        this.unbindScrollSpy?.();
        this.unbindScrollSpy = undefined;
    }

    public resetMobileDrawer(vditor: IVditor) {
        if (!isEditorThemeMobileLayout(vditor)) {
            return;
        }
        setMobileOutlineDrawerOpen(vditor, false);
        this.element.style.display = "none";
        this.element.classList.remove("vditor-outline--mobile-open");
        syncMobileOutlinePanel(vditor, false);
        this.unbindScrollSpyListener();
    }

    public restoreDesktopState(vditor: IVditor) {
        if (isEditorThemeMobileLayout(vditor)) {
            return;
        }
        this.element.classList.remove("vditor-outline--mobile-open");
        this.toggle(vditor, vditor.options.outline.enable);
    }

    public toggle(vditor: IVditor, show = true) {
        const btnElement = vditor.toolbar.elements.outline?.firstElementChild;
        const mobileLayout = isEditorThemeMobileLayout(vditor);
        const openDrawer = !mobileLayout || isMobileOutlineDrawerOpen(vditor);

        if (show) {
            if (mobileLayout) {
                this.element.style.display = openDrawer ? "" : "none";
            } else {
                this.element.classList.remove("vditor-outline--mobile-open");
                this.element.style.display = "block";
            }
            this.render(vditor);
            if (openDrawer) {
                if (mobileLayout) {
                    this.element.style.display = "";
                }
                syncMobileOutlinePanel(vditor, true);
                updateOutlineActive(vditor, true);
                this.bindScrollSpy(vditor);
                if (!mobileLayout) {
                    btnElement?.classList.add("vditor-menu--current");
                }
            } else if (mobileLayout) {
                this.element.style.display = "none";
                syncMobileOutlinePanel(vditor, false);
                this.unbindScrollSpyListener();
            }
        } else {
            if (mobileLayout) {
                setMobileOutlineDrawerOpen(vditor, false);
                this.element.style.display = "none";
                this.element.classList.remove("vditor-outline--mobile-open");
                syncMobileOutlinePanel(vditor, false);
            } else {
                this.element.style.display = "none";
            }
            this.unbindScrollSpyListener();
            if (!mobileLayout) {
                btnElement?.classList.remove("vditor-menu--current");
            }
        }
        if (!mobileLayout) {
            vditor.options.outline.enable = show;
            saveOutlineEnable(vditor, show);
        }
        if (getSelection().rangeCount > 0) {
            const range = getSelection().getRangeAt(0);
            if (vditor[vditor.currentMode].element.contains(range.startContainer)) {
                setSelectionFocus(range);
            } else {
                // 编辑器不需要获得焦点, 这会导致滚动位置被清空
                // vditor[vditor.currentMode].element.focus();
            }
        }
    }
}
