import { setEditMode } from "../toolbar/EditMode";
import { bindToolbarOutsideDismiss } from "../toolbar/setToolbar";
import { bindCacheFocusPersistence, markCacheContentRestored, persistScrollFocusAnchor } from "../util/cacheFocus";
import { bindDocumentScrollPersistence, purgeLegacyDocumentStateKeys, setScrollFocusAnchorHandler } from "../util/documentState";
import { bindHistoryInputBufferClick } from "../util/historyInputBuffer";
import { accessLocalStorage } from "../util/compatibility";
import { macOptionSymbolEvent } from "../util/editorCommonEvent";
import { initEditorTheme } from "./setEditorTheme";
import { initMermaidTheme } from "./setMermaidTheme";
import { resolveCodeMirrorTheme, setCodeTheme } from "./setCodeTheme";
import { setTheme } from "./setTheme";
import { applyEditorSettings } from "../util/globalLocalStorageSettings";
import { initSaveToolbarState } from "../util/saveToolbarState";

export const initUI = (vditor: IVditor) => {
  purgeLegacyDocumentStateKeys();
  vditor.element.innerHTML = "";
  vditor.element.classList.add("vditor");
  // 支持 RTL
  if (vditor.options.rtl) {
    vditor.element.setAttribute("dir", "rtl")
  }
  setTheme(vditor);
  applyEditorSettings(vditor.element);
  macOptionSymbolEvent(vditor);
  setCodeTheme(resolveCodeMirrorTheme(vditor.options), vditor.element);
  if (typeof vditor.options.height === "number") {
    vditor.element.style.height = vditor.options.height + "px";
  } else {
    vditor.element.style.height = vditor.options.height;
  }
  if (typeof vditor.options.minHeight === "number") {
    vditor.element.style.minHeight = vditor.options.minHeight + "px";
  }
  if (typeof vditor.options.width === "number") {
    vditor.element.style.width = vditor.options.width + "px";
  } else {
    vditor.element.style.width = vditor.options.width;
  }

  vditor.element.appendChild(vditor.toolbar.element);

  const contentElement = document.createElement("div");
  contentElement.className = "vditor-content";

  if (vditor.options.outline.position === "left") {
    contentElement.appendChild(vditor.outline.element);
    vditor.outline.init(vditor);
  }

  contentElement.appendChild(vditor.wysiwyg.element.parentElement);

  contentElement.appendChild(vditor.ir.element.parentElement);

  if (vditor.options.outline.position === "right") {
    vditor.outline.element.classList.add("vditor-outline--right");
    contentElement.appendChild(vditor.outline.element);
    vditor.outline.init(vditor);
  }

  if (vditor.upload) {
    contentElement.appendChild(vditor.upload.element);
  }

  contentElement.appendChild(vditor.hint.element);

  contentElement.appendChild(vditor.tip.element);

  vditor.element.appendChild(contentElement);

  bindToolbarOutsideDismiss(vditor);

  initEditorTheme(vditor);
  initMermaidTheme(vditor);

  setScrollFocusAnchorHandler(persistScrollFocusAnchor);
  bindCacheFocusPersistence(vditor);
  bindDocumentScrollPersistence(vditor);
  bindHistoryInputBufferClick(vditor);

  const initValue = afterRender(vditor);
  setEditMode(vditor, vditor.options.mode, initValue);
  initSaveToolbarState(vditor, initValue);

  document.execCommand("DefaultParagraphSeparator", false, "p");

  if (navigator.userAgent.indexOf("iPhone") > -1 && typeof window.visualViewport !== "undefined") {
    // https://github.com/Vanessa219/vditor/issues/379
    let pendingUpdate = false;
    const viewportHandler = (event: Event) => {
      if (pendingUpdate) {
        return;
      }
      pendingUpdate = true;

      requestAnimationFrame(() => {
        pendingUpdate = false;
        const layoutViewport = vditor.toolbar.element;
        layoutViewport.style.transform = "none";
        if (layoutViewport.getBoundingClientRect().top < 0) {
          layoutViewport.style.transform = `translate(0, ${-layoutViewport.getBoundingClientRect().top}px)`;
        }
      });
    };
    window.visualViewport.addEventListener("scroll", viewportHandler);
    window.visualViewport.addEventListener("resize", viewportHandler);
  }
};

const afterRender = (vditor: IVditor) => {
  // set default value
  let initValue = accessLocalStorage() && localStorage.getItem(vditor.options.cache.id);
  if (vditor.options.cache.enable && initValue) {
    markCacheContentRestored(vditor);
  }
  if (!vditor.options.cache.enable || !initValue) {
    if (vditor.options.value) {
      initValue = vditor.options.value;
    } else if (vditor.originalInnerHTML) {
      initValue = vditor.lute.HTML2Md(vditor.originalInnerHTML);
    } else if (!vditor.options.cache.enable) {
      initValue = "";
    }
  }
  return initValue || "";
};
