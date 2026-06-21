import {Constants} from "../constants";
import {outlineRender} from "../markdown/outlineRender";
import {setPadding} from "../ui/initUI";
import {isEditorThemeMobileLayout, isMobileOutlineDrawerOpen, setMobileOutlineDrawerOpen, syncMobileOutlinePanel} from "../ui/mobileOutlineMenu";
import {setSelectionFocus} from "../util/selection";
import {bindOutlineScrollSpy, restoreOutlineActive, updateOutlineActive} from "./updateOutlineActive";

const OUTLINE_MIN_WIDTH = 120;
const OUTLINE_MAX_WIDTH = 480;

export class Outline {
    public element: HTMLElement;
    private contentElement: HTMLElement;
    private resizeElement: HTMLElement;
    private unbindScrollSpy?: () => void;

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
        if (getSelection().rangeCount > 0) {
            const range = getSelection().getRangeAt(0);
            if (vditor[vditor.currentMode].element.contains(range.startContainer)) {
                setSelectionFocus(range);
            } else {
                // 编辑器不需要获得焦点, 这会导致滚动位置被清空
                // vditor[vditor.currentMode].element.focus();
            }
        }
        setPadding(vditor);
    }
}
