import { isInsideCodeBlockChrome } from "../codeBlock/codeMirrorManager";
import { syncBlockMarkerTop } from "../util/blockMarker";
import { getEditorRange } from "../util/selection";
import { afterRenderEvent } from "./afterRenderEvent";
import { renderToc } from "../util/toc";

const ROOT_CLASS = "vditor-block-handle";
const DRAG_CLASS = "vditor-block-handle__drag";
const GRIP_CLASS = "vditor-block-handle__grip";
const DROP_LINE_CLASS = "vditor-block-handle__drop-line";
const DRAGGING_CLASS = "vditor-block-handle--dragging";
const SOURCE_DRAGGING_CLASS = "vditor-block-handle__source--dragging";
const GHOST_CLASS = "vditor-block-handle__ghost";
/** 向上拖拽时，插入线提前触发的像素容差 */
const DROP_LINE_HIT_OFFSET = 14;

interface DropTarget {
    container: HTMLElement;
    referenceNode: Element | null;
}

interface DropTargetLine extends DropTarget {
    y: number;
}

interface IBlockHandleState {
    root: HTMLElement;
    dragBtn: HTMLButtonElement;
    dropLine: HTMLElement;
    wrapper: HTMLElement;
    editorElement: HTMLElement;
    activeBlock: HTMLElement | null;
    dragging: boolean;
    visible: boolean;
    hideTimer: number | null;
    dragBlock: HTMLElement | null;
    dropTarget: DropTarget | null;
    originalDropTarget: DropTarget | null;
    dragGhost: HTMLElement | null;
    dragOffsetX: number;
    dragOffsetY: number;
    unbind?: () => void;
}

const handleMap = new WeakMap<IVditor, IBlockHandleState>();

const isListElement = (element: Element | null) => {
    return !!element && (element.tagName === "UL" || element.tagName === "OL");
};

const isTocElement = (element: Element) => {
    return element.classList.contains("vditor-toc") || element.getAttribute("data-type") === "toc-block";
};

const isInsideToc = (element: Element | null) => {
    return !!element?.closest(".vditor-toc, [data-type=\"toc-block\"]");
};

const getTocBlock = (node: Node | null, editor: HTMLElement): HTMLElement | null => {
    if (!node) {
        return null;
    }
    const element = (node instanceof Element ? node : node.parentElement)
        ?.closest(".vditor-toc, [data-type=\"toc-block\"]") as HTMLElement | null;
    if (!element || !editor.contains(element) || element.parentElement !== editor || !isTocElement(element)) {
        return null;
    }
    return element;
};

const isBlockHandleElement = (element: Element | null) => {
    return !!element?.closest(`.${ROOT_CLASS}`);
};

const getHitElementAtPoint = (x: number, y: number) => {
    for (const element of document.elementsFromPoint(x, y)) {
        if (!(element instanceof Element) || isBlockHandleElement(element)) {
            continue;
        }
        return element;
    }
    return null;
};

const getInnermostListItem = (node: Node | null, editor: HTMLElement): HTMLElement | null => {
    if (!node) {
        return null;
    }
    let element = node instanceof Element ? node : node.parentElement;
    if (!element || !editor.contains(element)) {
        return null;
    }
    let innermost: HTMLElement | null = null;
    let current: Element | null = element;
    while (current && current !== editor) {
        if (current.tagName === "LI") {
            innermost = current as HTMLElement;
        }
        current = current.parentElement;
    }
    return innermost;
};

const getListItemDepth = (li: HTMLElement, editor: HTMLElement) => {
    let depth = 0;
    let current: Element | null = li.parentElement;
    while (current && current !== editor) {
        if (current.tagName === "UL" || current.tagName === "OL") {
            depth++;
        }
        current = current.parentElement;
    }
    return depth;
};

const getListItemAtPoint = (y: number, editor: HTMLElement) => {
    let best: HTMLElement | null = null;
    let bestDepth = -1;
    let bestHeight = Infinity;
    for (const item of editor.querySelectorAll("li")) {
        const li = item as HTMLElement;
        if (isInsideToc(li)) {
            continue;
        }
        const rect = li.getBoundingClientRect();
        if (y < rect.top || y > rect.bottom) {
            continue;
        }
        const depth = getListItemDepth(li, editor);
        const height = rect.height;
        if (depth > bestDepth || (depth === bestDepth && height < bestHeight)) {
            bestDepth = depth;
            bestHeight = height;
            best = li;
        }
    }
    return best;
};

const getDraggableBlock = (node: Node | null, editor: HTMLElement): HTMLElement | null => {
    if (!node) {
        return null;
    }
    const tocBlock = getTocBlock(node, editor);
    if (tocBlock) {
        return tocBlock;
    }
    const innermostListItem = getInnermostListItem(node, editor);
    if (innermostListItem) {
        return innermostListItem;
    }
    let element = node instanceof Element ? node : node.parentElement;
    if (!element || !editor.contains(element)) {
        return null;
    }
    while (element && element.parentElement !== editor) {
        element = element.parentElement;
    }
    if (!element || element.parentElement !== editor) {
        return null;
    }
    if (isListElement(element)) {
        return null;
    }
    return element as HTMLElement;
};

const getDraggableBlockFromPoint = (x: number, y: number, editor: HTMLElement) => {
    const hitElement = getHitElementAtPoint(x, y);
    const tocBlock = getTocBlock(hitElement, editor);
    if (tocBlock) {
        return tocBlock;
    }
    const listItem = getListItemAtPoint(y, editor);
    if (listItem) {
        return listItem;
    }
    return getDraggableBlock(hitElement, editor);
};

const cloneDropTarget = (target: DropTarget): DropTarget => ({
    container: target.container,
    referenceNode: target.referenceNode,
});

const dropTargetsEqual = (a: DropTarget | null, b: DropTarget | null) => {
    if (!a || !b) {
        return a === b;
    }
    return a.container === b.container && a.referenceNode === b.referenceNode;
};

const wouldMoveBlock = (block: HTMLElement, target: DropTarget) => {
    if (target.container !== block.parentElement) {
        return true;
    }
    if (target.referenceNode === block) {
        return false;
    }
    if (target.referenceNode === block.nextElementSibling) {
        return false;
    }
    if (!target.referenceNode && !block.nextElementSibling) {
        return false;
    }
    return true;
};

const addListDropTargets = (list: HTMLElement, targets: DropTargetLine[], exclude: HTMLElement) => {
    if (isInsideToc(list)) {
        return;
    }
    for (const child of list.children) {
        if (child.tagName !== "LI" || child === exclude) {
            continue;
        }
        const rect = (child as HTMLElement).getBoundingClientRect();
        targets.push({
            container: list,
            referenceNode: child,
            y: rect.top,
        });
        for (const nested of child.children) {
            if (isListElement(nested)) {
                addListDropTargets(nested as HTMLElement, targets, exclude);
            }
        }
    }
    const listRect = list.getBoundingClientRect();
    targets.push({
        container: list,
        referenceNode: null,
        y: listRect.bottom,
    });
};

const collectDropTargets = (editor: HTMLElement, exclude: HTMLElement) => {
    const targets: DropTargetLine[] = [];

    for (const child of editor.children) {
        if (child === exclude) {
            continue;
        }
        if (isListElement(child)) {
            addListDropTargets(child as HTMLElement, targets, exclude);
            continue;
        }
        const rect = (child as HTMLElement).getBoundingClientRect();
        targets.push({
            container: editor,
            referenceNode: child,
            y: rect.top,
        });
    }
    targets.push({
        container: editor,
        referenceNode: null,
        y: editor.getBoundingClientRect().bottom,
    });
    targets.sort((a, b) => a.y - b.y);
    return targets;
};

const resolveDropTarget = (editor: HTMLElement, clientY: number, exclude: HTMLElement) => {
    const targets = collectDropTargets(editor, exclude);
    let best = targets[targets.length - 1];
    for (const target of targets) {
        if (clientY < target.y + DROP_LINE_HIT_OFFSET) {
            best = target;
            break;
        }
    }
    return best;
};

const getCurrentDropTarget = (block: HTMLElement, editor: HTMLElement): DropTarget => {
    const parent = block.parentElement as HTMLElement;
    if (isListElement(parent)) {
        return { container: parent, referenceNode: block };
    }
    if (parent === editor) {
        return { container: editor, referenceNode: block };
    }
    return { container: editor, referenceNode: block };
};

const cleanupEmptyLists = (start: HTMLElement | null) => {
    let list = start;
    while (list && isListElement(list)) {
        if (list.childElementCount > 0) {
            break;
        }
        const parent = list.parentElement;
        list.remove();
        list = parent;
    }
};

const liToParagraphHtml = (li: HTMLElement) => {
    const clone = li.cloneNode(true) as HTMLElement;
    clone.querySelector('input[type="checkbox"]')?.remove();
    return clone.innerHTML.trim();
};

const createTopLevelListFromLi = (li: HTMLElement) => {
    const sourceList = li.parentElement as HTMLElement;
    const list = document.createElement(sourceList.tagName.toLowerCase());
    if (sourceList.getAttribute("data-block") === "0") {
        list.setAttribute("data-block", "0");
    }
    const marker = sourceList.getAttribute("data-marker");
    if (marker) {
        list.setAttribute("data-marker", marker);
    }
    const tight = sourceList.getAttribute("data-tight");
    if (tight) {
        list.setAttribute("data-tight", tight);
    }
    list.appendChild(li.cloneNode(true));
    return list;
};

const createLiFromBlock = (block: HTMLElement, listContainer: HTMLElement) => {
    const li = document.createElement("li");
    const sampleLi = listContainer.querySelector("li");
    if (sampleLi?.classList.contains("vditor-task")) {
        li.classList.add("vditor-task");
        li.innerHTML = `<input type="checkbox" /> ${block.innerHTML}`;
    } else {
        li.innerHTML = block.innerHTML;
    }
    return li;
};

const applyDropTarget = (block: HTMLElement, target: DropTarget, editor: HTMLElement) => {
    const oldListParent = block.tagName === "LI" ? block.parentElement : null;

    if (block.tagName === "LI" && target.container === editor) {
        const node = block.querySelector("ul, ol")
            ? createTopLevelListFromLi(block)
            : (() => {
                const paragraph = document.createElement("p");
                paragraph.setAttribute("data-block", "0");
                paragraph.innerHTML = liToParagraphHtml(block);
                return paragraph;
            })();
        if (target.referenceNode) {
            editor.insertBefore(node, target.referenceNode);
        } else {
            editor.appendChild(node);
        }
        block.remove();
        cleanupEmptyLists(oldListParent as HTMLElement);
        return;
    }

    if (block.tagName !== "LI" && isListElement(target.container)) {
        const li = createLiFromBlock(block, target.container);
        if (target.referenceNode) {
            target.container.insertBefore(li, target.referenceNode);
        } else {
            target.container.appendChild(li);
        }
        block.remove();
        return;
    }

    if (target.referenceNode) {
        target.container.insertBefore(block, target.referenceNode);
    } else {
        target.container.appendChild(block);
    }
    if (oldListParent && oldListParent !== target.container) {
        cleanupEmptyLists(oldListParent as HTMLElement);
    }
};

const positionHandle = (state: IBlockHandleState, block: HTMLElement) => {
    const blockRect = block.getBoundingClientRect();
    const wrapperRect = state.wrapper.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(block).lineHeight) || 24;
    const handleSize = 20;
    const top = blockRect.top - wrapperRect.top + Math.max(0, Math.min(lineHeight / 2 - handleSize / 2, 6));
    const left = blockRect.left - wrapperRect.left - (block.tagName === "LI" ? 40 : 28);
    syncBlockMarkerTop(block);
    state.root.style.top = `${top}px`;
    state.root.style.left = `${left}px`;
    state.root.classList.add(`${ROOT_CLASS}--visible`);
    state.visible = true;
};

const getDropLineMetrics = (target: DropTarget) => {
    if (target.referenceNode instanceof HTMLElement) {
        const rect = target.referenceNode.getBoundingClientRect();
        return { y: rect.top, left: rect.left, width: rect.width };
    }
    const container = target.container;
    let anchor: HTMLElement | null = null;
    if (isListElement(container)) {
        for (let i = container.children.length - 1; i >= 0; i--) {
            const child = container.children[i];
            if (child.tagName === "LI") {
                anchor = child as HTMLElement;
                break;
            }
        }
    } else {
        anchor = container.lastElementChild as HTMLElement | null;
    }
    if (anchor) {
        const rect = anchor.getBoundingClientRect();
        return { y: rect.bottom, left: rect.left, width: rect.width };
    }
    const rect = container.getBoundingClientRect();
    return { y: rect.bottom, left: rect.left, width: rect.width };
};

const positionDropLine = (state: IBlockHandleState, target: DropTarget) => {
    const metrics = getDropLineMetrics(target);
    const wrapperRect = state.wrapper.getBoundingClientRect();
    state.dropLine.style.top = `${metrics.y - wrapperRect.top}px`;
    state.dropLine.style.left = `${metrics.left - wrapperRect.left}px`;
    state.dropLine.style.width = `${metrics.width}px`;
    state.dropLine.style.display = "block";
};

const hideHandle = (state: IBlockHandleState) => {
    if (state.dragging) {
        return;
    }
    if (state.hideTimer !== null) {
        clearTimeout(state.hideTimer);
    }
    state.hideTimer = window.setTimeout(() => {
        state.hideTimer = null;
        state.activeBlock = null;
        state.visible = false;
        state.root.classList.remove(`${ROOT_CLASS}--visible`);
    }, 500);
};

const removeDragGhost = (state: IBlockHandleState) => {
    state.dragGhost?.remove();
    state.dragGhost = null;
};

const createDragGhost = (block: HTMLElement) => {
    const rect = block.getBoundingClientRect();
    const blockStyle = getComputedStyle(block);
    const ghost = document.createElement("div");
    ghost.className = GHOST_CLASS;
    ghost.textContent = block.innerText.trim() || "\u00a0";
    ghost.style.maxWidth = `${rect.width}px`;
    ghost.style.font = blockStyle.font;
    ghost.style.lineHeight = blockStyle.lineHeight;
    ghost.style.color = blockStyle.color;
    document.body.appendChild(ghost);
    return ghost;
};

const positionDragGhost = (
    ghost: HTMLElement,
    clientX: number,
    clientY: number,
    offsetX: number,
    offsetY: number,
) => {
    ghost.style.left = `${clientX - offsetX}px`;
    ghost.style.top = `${clientY - offsetY}px`;
};

const finishDrag = (vditor: IVditor, state: IBlockHandleState) => {
    const editor = state.editorElement;
    const block = state.dragBlock;
    const dropTarget = state.dropTarget;
    state.dragging = false;
    state.dragBlock = null;
    state.dropTarget = null;
    state.wrapper.classList.remove(DRAGGING_CLASS);
    state.dropLine.style.display = "none";
    removeDragGhost(state);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    if (block && dropTarget) {
        block.classList.remove(SOURCE_DRAGGING_CLASS);
        const moved = !dropTargetsEqual(state.originalDropTarget, dropTarget)
            && wouldMoveBlock(block, dropTarget);
        if (moved) {
            applyDropTarget(block, dropTarget, editor);
            renderToc(vditor);
            vditor.undo.addToUndoStack(vditor);
            afterRenderEvent(vditor, {
                enableAddUndoStack: false,
                enableHint: false,
                enableInput: true,
            });
        }
        state.activeBlock = block.isConnected ? block : null;
        if (state.activeBlock) {
            positionHandle(state, state.activeBlock);
        }
    }
};

const startDrag = (vditor: IVditor, state: IBlockHandleState, event: PointerEvent) => {
    const block = state.activeBlock;
    if (!block || vditor.currentMode !== "wysiwyg") {
        return;
    }
    event.preventDefault();
    event.stopPropagation();

    const editor = state.editorElement;
    const blockRect = block.getBoundingClientRect();
    const currentTarget = getCurrentDropTarget(block, editor);
    state.dragging = true;
    state.dragBlock = block;
    state.originalDropTarget = cloneDropTarget(currentTarget);
    state.dropTarget = cloneDropTarget(currentTarget);
    state.dragOffsetX = event.clientX - blockRect.left;
    state.dragOffsetY = event.clientY - blockRect.top;
    state.dragGhost = createDragGhost(block);
    positionDragGhost(state.dragGhost, event.clientX, event.clientY, state.dragOffsetX, state.dragOffsetY);
    state.wrapper.classList.add(DRAGGING_CLASS);
    block.classList.add(SOURCE_DRAGGING_CLASS);
    state.root.classList.remove(`${ROOT_CLASS}--visible`);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const initialLine = resolveDropTarget(editor, event.clientY, block);
    state.dropTarget = { container: initialLine.container, referenceNode: initialLine.referenceNode };
    positionDropLine(state, state.dropTarget);
    state.dragBtn.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
        if (state.dragGhost) {
            positionDragGhost(
                state.dragGhost,
                moveEvent.clientX,
                moveEvent.clientY,
                state.dragOffsetX,
                state.dragOffsetY,
            );
        }
        const line = resolveDropTarget(editor, moveEvent.clientY, block);
        state.dropTarget = { container: line.container, referenceNode: line.referenceNode };
        positionDropLine(state, state.dropTarget);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
        state.dragBtn.releasePointerCapture(upEvent.pointerId);
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        finishDrag(vditor, state);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
};

const shouldShowHandle = (vditor: IVditor, editorElement: HTMLElement | undefined, target: EventTarget | null) => {
    if (vditor.currentMode !== "wysiwyg" || !editorElement) {
        return false;
    }
    if (editorElement.getAttribute("contenteditable") === "false") {
        return false;
    }
    if (isInsideCodeBlockChrome(target)) {
        return false;
    }
    return true;
};

const showForBlock = (vditor: IVditor, block: HTMLElement | null) => {
    const state = handleMap.get(vditor);
    if (!state || !block || state.dragging) {
        return;
    }
    if (state.hideTimer !== null) {
        clearTimeout(state.hideTimer);
        state.hideTimer = null;
    }
    state.activeBlock = block;
    positionHandle(state, block);
};

export const initBlockHandle = (vditor: IVditor, wrapper: HTMLElement, editorElement: HTMLElement) => {
    if (handleMap.has(vditor)) {
        return;
    }

    const root = document.createElement("div");
    root.className = ROOT_CLASS;

    const dragBtn = document.createElement("button");
    dragBtn.type = "button";
    dragBtn.className = DRAG_CLASS;
    dragBtn.setAttribute("aria-label", window.VditorI18n.dragBlock || "Drag to move block");
    dragBtn.innerHTML = `<svg class="${GRIP_CLASS}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 14" width="8" height="14"><circle cx="2" cy="2" r="1.2" fill="currentColor"/><circle cx="6" cy="2" r="1.2" fill="currentColor"/><circle cx="2" cy="7" r="1.2" fill="currentColor"/><circle cx="6" cy="7" r="1.2" fill="currentColor"/><circle cx="2" cy="12" r="1.2" fill="currentColor"/><circle cx="6" cy="12" r="1.2" fill="currentColor"/></svg>`;
    root.appendChild(dragBtn);

    const dropLine = document.createElement("div");
    dropLine.className = DROP_LINE_CLASS;
    dropLine.style.display = "none";
    wrapper.insertBefore(dropLine, wrapper.firstChild);
    wrapper.insertBefore(root, wrapper.firstChild);

    const state: IBlockHandleState = {
        root,
        dragBtn,
        dropLine,
        wrapper,
        editorElement,
        activeBlock: null,
        dragging: false,
        visible: false,
        hideTimer: null,
        dragBlock: null,
        dropTarget: null,
        originalDropTarget: null,
        dragGhost: null,
        dragOffsetX: 0,
        dragOffsetY: 0,
    };
    handleMap.set(vditor, state);

    dragBtn.addEventListener("mousedown", (event) => {
        event.preventDefault();
    });
    dragBtn.addEventListener("pointerdown", (event) => {
        startDrag(vditor, state, event);
    });

    const onMouseMove = (event: MouseEvent) => {
        if (state.dragging || !shouldShowHandle(vditor, editorElement, event.target)) {
            return;
        }
        const block = getDraggableBlockFromPoint(event.clientX, event.clientY, editorElement);
        if (block) {
            showForBlock(vditor, block);
        } else {
            hideHandle(state);
        }
    };

    const onMouseLeave = (event: MouseEvent) => {
        if (state.dragging) {
            return;
        }
        const related = event.relatedTarget as Node | null;
        if (related && (state.root.contains(related) || state.wrapper.contains(related))) {
            return;
        }
        hideHandle(state);
    };

    const onScroll = () => {
        if (state.activeBlock && !state.dragging) {
            positionHandle(state, state.activeBlock);
        }
    };

    const onKeyDown = () => {
        if (!state.visible) {
            return;
        }
        state.activeBlock = null;
        state.visible = false;
        const root = state.root;
        window.setTimeout(() => {
            if (state.visible) return;
            root.classList.remove(`${ROOT_CLASS}--visible`);
        }, 500);
    };

    wrapper.addEventListener("mousemove", onMouseMove);
    wrapper.addEventListener("mouseleave", onMouseLeave);
    editorElement.addEventListener("keydown", onKeyDown, { capture: true });
    editorElement.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });

    state.unbind = () => {
        wrapper.removeEventListener("mousemove", onMouseMove);
        wrapper.removeEventListener("mouseleave", onMouseLeave);
        editorElement.removeEventListener("keydown", onKeyDown, { capture: true });
        editorElement.removeEventListener("scroll", onScroll);
        window.removeEventListener("scroll", onScroll);
        root.remove();
        dropLine.remove();
        handleMap.delete(vditor);
    };
};

export const updateBlockHandle = (_vditor: IVditor, _target?: Node) => {
    // Block handle is shown only on mouse hover (mousemove), not on cursor/focus changes.
};

export const hideBlockHandle = (vditor: IVditor) => {
    const state = handleMap.get(vditor);
    if (state) {
        hideHandle(state);
    }
};
