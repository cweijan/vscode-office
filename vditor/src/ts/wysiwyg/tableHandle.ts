import { isInsideCodeBlockChrome } from "../codeBlock/codeMirrorManager";
import {
    deleteColumn,
    deleteRow,
    insertColumn,
    insertRow,
    insertRowAbove,
    moveTableColumn,
    moveTableRow,
    setTableAlign,
} from "../util/fixBrowserBehavior";
import { codicon, TABLE_CODICONS } from "../util/codicon";
import { hasClosestByMatchTag } from "../util/hasClosest";
import { getEditorRange, setSelectionFocus } from "../util/selection";
import { afterRenderEvent } from "./afterRenderEvent";

const ROOT_CLASS = "vditor-table-handle";
const AXIS_CLASS = "vditor-table-handle__axis";
const AXIS_MARK_CLASS = "vditor-table-handle__axis-mark";
const AXIS_GRIP_CLASS = "vditor-table-handle__axis-grip";
const AXIS_GRIP_COL_CLASS = "vditor-table-handle__axis-grip--col";
const AXIS_DRAG_CLASS = "vditor-table-handle__axis--drag";
const AXIS_MENU_CLASS = "vditor-table-handle__axis--menu";
const AXIS_ROW_CLASS = "vditor-table-handle__axis--row";
const AXIS_COL_CLASS = "vditor-table-handle__axis--col";
const MENU_CLASS = "vditor-table-handle__menu";
const MENU_PORTAL_CLASS = "vditor-table-handle__menu--portal";
const MENU_DIVIDER_CLASS = "vditor-table-handle__menu-divider";
const MENU_ITEM_CURRENT_CLASS = "vditor-table-handle__menu-item--current";
const DROP_LINE_CLASS = "vditor-table-handle__drop-line";
const DRAGGING_CLASS = "vditor-table-handle--dragging";
const DRAG_THRESHOLD = 4;
const MENU_VIEWPORT_MARGIN = 8;

interface ITableContentRect {
    left: number;
    right: number;
    top: number;
    bottom: number;
    centerX: number;
    centerY: number;
}

interface IAxisMenuItem {
    action: string;
    label: string;
    icon: string;
}

interface ITableHandleState {
    vditor: IVditor;
    root: HTMLElement;
    menu: HTMLElement;
    dropLine: HTMLElement;
    rowAxisControl: HTMLButtonElement;
    colAxisControl: HTMLButtonElement;
    wrapper: HTMLElement;
    editorElement: HTMLElement;
    hoveredTable: HTMLTableElement | null;
    activeTable: HTMLTableElement | null;
    focusedCell: HTMLTableCellElement | null;
    refreshRafId: number;
    observedTable: HTMLTableElement | null;
    onTableScroll?: () => void;
    resizeObserver?: ResizeObserver;
    dragging: boolean;
    menuMode: "row" | "col" | null;
    dragMode: "row" | "col" | null;
    dragClientX: number;
    dragClientY: number;
    onDocumentPointerDown?: (event: PointerEvent) => void;
    scrollTargets?: EventTarget[];
    onScroll?: () => void;
    unbind?: () => void;
}

const handleMap = new WeakMap<IVditor, ITableHandleState>();

const isTableHandleElement = (element: Element | null) => {
    return !!element?.closest(`.${ROOT_CLASS}, .${MENU_CLASS}`);
};

const isAxisMenuOpen = (state: ITableHandleState) => {
    return state.menuMode !== null && state.menu.style.display === "block";
};

const mountMenuPortal = (state: ITableHandleState) => {
    if (state.menu.parentElement !== document.body) {
        document.body.appendChild(state.menu);
    }
    state.menu.classList.add(MENU_PORTAL_CLASS);
    state.menu.style.position = "fixed";
};

const restoreMenuContainer = (state: ITableHandleState) => {
    state.menu.classList.remove(MENU_PORTAL_CLASS);
    state.menu.style.position = "";
    state.menu.style.left = "";
    state.menu.style.top = "";
    if (state.menu.parentElement !== state.root) {
        state.root.appendChild(state.menu);
    }
};

const getTableAtPoint = (x: number, y: number, editor: HTMLElement): HTMLTableElement | null => {
    for (const element of document.elementsFromPoint(x, y)) {
        if (!(element instanceof Element) || isTableHandleElement(element)) {
            continue;
        }
        if (!editor.contains(element)) {
            continue;
        }
        const table = element.closest("table");
        if (table && editor.contains(table)) {
            return table as HTMLTableElement;
        }
    }
    return null;
};

const getFocusedCell = (vditor: IVditor, editor: HTMLElement): HTMLTableCellElement | null => {
    const range = getEditorRange(vditor);
    const cell =
        hasClosestByMatchTag(range.startContainer, "TD") ||
        hasClosestByMatchTag(range.startContainer, "TH");
    if (cell && editor.contains(cell)) {
        return cell as HTMLTableCellElement;
    }
    return null;
};

const getRowIndex = (table: HTMLTableElement, cell: HTMLTableCellElement) => {
    const row = cell.parentElement as HTMLTableRowElement;
    for (let i = 0; i < table.rows.length; i++) {
        if (table.rows[i] === row) {
            return i;
        }
    }
    return -1;
};

const getColumnIndex = (cell: HTMLTableCellElement) => {
    let index = 0;
    let previous = cell.previousElementSibling;
    while (previous) {
        index++;
        previous = previous.previousElementSibling;
    }
    return index;
};

const shouldShowHandle = (vditor: IVditor, editorElement: HTMLElement, target: EventTarget | null) => {
    if (vditor.currentMode !== "wysiwyg") {
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

const hideDropLine = (state: ITableHandleState) => {
    state.dropLine.style.display = "none";
};

const hideAxisMenu = (state: ITableHandleState) => {
    state.menu.style.display = "none";
    state.menu.innerHTML = "";
    state.menuMode = null;
    restoreMenuContainer(state);
    state.rowAxisControl.classList.remove(AXIS_MENU_CLASS);
    state.colAxisControl.classList.remove(AXIS_MENU_CLASS);
};

const setAxisMenuOpen = (state: ITableHandleState, mode: "row" | "col" | null) => {
    state.rowAxisControl.classList.remove(AXIS_MENU_CLASS);
    state.colAxisControl.classList.remove(AXIS_MENU_CLASS);
    if (mode === "row") {
        state.rowAxisControl.classList.add(AXIS_MENU_CLASS);
    } else if (mode === "col") {
        state.colAxisControl.classList.add(AXIS_MENU_CLASS);
    }
};

const hideAll = (state: ITableHandleState) => {
    state.dragging = false;
    state.dragMode = null;
    state.activeTable = null;
    state.focusedCell = null;
    state.root.classList.remove(`${ROOT_CLASS}--visible`, DRAGGING_CLASS);
    state.rowAxisControl.classList.remove(AXIS_DRAG_CLASS, AXIS_MENU_CLASS);
    state.colAxisControl.classList.remove(AXIS_DRAG_CLASS, AXIS_MENU_CLASS);
    state.rowAxisControl.style.display = "none";
    state.colAxisControl.style.display = "none";
    hideDropLine(state);
    hideAxisMenu(state);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    if (state.observedTable && state.onTableScroll) {
        state.observedTable.removeEventListener("scroll", state.onTableScroll);
    }
    state.observedTable = null;
    state.onTableScroll = undefined;
    state.resizeObserver?.disconnect();
};

export const getTableContentRect = (table: HTMLTableElement): ITableContentRect => {
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;

    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        for (let j = 0; j < row.cells.length; j++) {
            const rect = row.cells[j].getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                continue;
            }
            if (rect.left < left) {
                left = rect.left;
            }
            if (rect.right > right) {
                right = rect.right;
            }
            if (rect.top < top) {
                top = rect.top;
            }
            if (rect.bottom > bottom) {
                bottom = rect.bottom;
            }
        }
    }

    if (!Number.isFinite(left)) {
        const fallback = table.getBoundingClientRect();
        return {
            left: fallback.left,
            right: fallback.right,
            top: fallback.top,
            bottom: fallback.bottom,
            centerX: fallback.left + fallback.width / 2,
            centerY: fallback.top + fallback.height / 2,
        };
    }

    const visible = table.getBoundingClientRect();
    left = Math.max(left, visible.left);
    right = Math.min(right, visible.right);
    top = Math.max(top, visible.top);
    bottom = Math.min(bottom, visible.bottom);

    if (left >= right || top >= bottom) {
        return {
            left: visible.left,
            right: visible.right,
            top: visible.top,
            bottom: visible.bottom,
            centerX: visible.left + visible.width / 2,
            centerY: visible.top + visible.height / 2,
        };
    }

    return {
        left,
        right,
        top,
        bottom,
        centerX: (left + right) / 2,
        centerY: (top + bottom) / 2,
    };
};

const positionAxisControls = (
    state: ITableHandleState,
    contentRect: ITableContentRect,
    focusedCell: HTMLTableCellElement,
) => {
    const wrapperRect = state.wrapper.getBoundingClientRect();
    const rowRect = focusedCell.parentElement.getBoundingClientRect();
    const cellRect = focusedCell.getBoundingClientRect();
    const rowCenterY = rowRect.top + rowRect.height / 2;
    const colCenterX = cellRect.left + cellRect.width / 2;

    state.rowAxisControl.style.display = "block";
    state.rowAxisControl.style.left = `${contentRect.left - wrapperRect.left}px`;
    state.rowAxisControl.style.top = `${rowCenterY - wrapperRect.top}px`;

    state.colAxisControl.style.display = "block";
    state.colAxisControl.style.left = `${colCenterX - wrapperRect.left}px`;
    state.colAxisControl.style.top = `${contentRect.top - wrapperRect.top}px`;
};

const resolveRowDropIndex = (table: HTMLTableElement, clientY: number) => {
    for (let i = 0; i < table.rows.length; i++) {
        const rect = table.rows[i].getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
            return i;
        }
    }
    return table.rows.length;
};

const resolveColumnDropIndex = (table: HTMLTableElement, clientX: number) => {
    const row = table.rows[0];
    if (!row) {
        return 0;
    }
    for (let i = 0; i < row.cells.length; i++) {
        const rect = row.cells[i].getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) {
            return i;
        }
    }
    return row.cells.length;
};

const positionRowDropLine = (state: ITableHandleState, table: HTMLTableElement, dropIndex: number) => {
    const wrapperRect = state.wrapper.getBoundingClientRect();
    const contentRect = getTableContentRect(table);
    let y = contentRect.bottom;
    if (dropIndex < table.rows.length) {
        y = table.rows[dropIndex].getBoundingClientRect().top;
    }
    state.dropLine.className = `${DROP_LINE_CLASS} ${DROP_LINE_CLASS}--row`;
    state.dropLine.style.display = "block";
    state.dropLine.style.left = `${contentRect.left - wrapperRect.left}px`;
    state.dropLine.style.top = `${y - wrapperRect.top}px`;
    state.dropLine.style.width = `${contentRect.right - contentRect.left}px`;
    state.dropLine.style.height = "2px";
};

const positionColumnDropLine = (state: ITableHandleState, table: HTMLTableElement, dropIndex: number) => {
    const wrapperRect = state.wrapper.getBoundingClientRect();
    const contentRect = getTableContentRect(table);
    const row = table.rows[0];
    let x = contentRect.right;
    if (row && dropIndex < row.cells.length) {
        x = row.cells[dropIndex].getBoundingClientRect().left;
    }
    state.dropLine.className = `${DROP_LINE_CLASS} ${DROP_LINE_CLASS}--col`;
    state.dropLine.style.display = "block";
    state.dropLine.style.left = `${x - wrapperRect.left}px`;
    state.dropLine.style.top = `${contentRect.top - wrapperRect.top}px`;
    state.dropLine.style.width = "2px";
    state.dropLine.style.height = `${contentRect.bottom - contentRect.top}px`;
};

const updateDragDropLine = (state: ITableHandleState) => {
    if (!state.dragging || !state.activeTable || !state.dragMode) {
        return;
    }
    if (state.dragMode === "row") {
        positionRowDropLine(state, state.activeTable, resolveRowDropIndex(state.activeTable, state.dragClientY));
    } else {
        positionColumnDropLine(state, state.activeTable, resolveColumnDropIndex(state.activeTable, state.dragClientX));
    }
};

const repositionControls = (state: ITableHandleState) => {
    if (!state.activeTable || !state.focusedCell) {
        return;
    }
    const contentRect = getTableContentRect(state.activeTable);
    positionAxisControls(state, contentRect, state.focusedCell);
    if (state.menuMode && state.menu.style.display === "block") {
        const control = state.menuMode === "row" ? state.rowAxisControl : state.colAxisControl;
        positionAxisMenu(state, control);
    }
};

const bindScrollListener = (target: EventTarget, listener: () => void) => {
    target.addEventListener("scroll", listener, { passive: true });
};

const unbindScrollListener = (target: EventTarget, listener: () => void) => {
    target.removeEventListener("scroll", listener);
};

const observeActiveTable = (state: ITableHandleState, table: HTMLTableElement) => {
    if (state.observedTable === table) {
        return;
    }
    if (state.observedTable && state.onTableScroll) {
        state.observedTable.removeEventListener("scroll", state.onTableScroll);
    }
    state.observedTable = table;
    state.onTableScroll = () => {
        if (state.activeTable && state.focusedCell) {
            repositionControls(state);
            return;
        }
        scheduleRefresh(state.vditor, state);
    };
    table.addEventListener("scroll", state.onTableScroll, { passive: true });

    state.resizeObserver?.disconnect();
    if (typeof ResizeObserver === "undefined") {
        return;
    }
    state.resizeObserver = new ResizeObserver(() => {
        scheduleRefresh(state.vditor, state);
    });
    state.resizeObserver.observe(table);
    for (let i = 0; i < table.rows.length; i++) {
        state.resizeObserver.observe(table.rows[i]);
    }
};

const getAxisMenuItems = (mode: "row" | "col"): IAxisMenuItem[] => {
    if (mode === "row") {
        return [
            {
                action: "insertRowAbove",
                label: window.VditorI18n.insertRowAbove,
                icon: TABLE_CODICONS.insertRowAbove,
            },
            {
                action: "insertRowBelow",
                label: window.VditorI18n.insertRowBelow,
                icon: TABLE_CODICONS.insertRowBelow,
            },
            {
                action: "deleteRow",
                label: window.VditorI18n["delete-row"],
                icon: TABLE_CODICONS.deleteRow,
            },
        ];
    }
    return [
        {
            action: "insertColumnLeft",
            label: window.VditorI18n.insertColumnLeft,
            icon: TABLE_CODICONS.insertColumnLeft,
        },
        {
            action: "insertColumnRight",
            label: window.VditorI18n.insertColumnRight,
            icon: TABLE_CODICONS.insertColumnRight,
        },
        {
            action: "deleteColumn",
            label: window.VditorI18n["delete-column"],
            icon: TABLE_CODICONS.deleteColumn,
        },
    ];
};

const getCellAlignType = (cell: HTMLTableCellElement) => {
    return cell.getAttribute("align") || (cell.tagName === "TH" ? "center" : "left");
};

const appendAlignMenuSection = (state: ITableHandleState, cell: HTMLTableCellElement) => {
    const divider = document.createElement("div");
    divider.className = MENU_DIVIDER_CLASS;
    state.menu.appendChild(divider);

    const alignType = getCellAlignType(cell);
    const alignItems = [
        {
            action: "alignLeft",
            label: window.VditorI18n.alignLeft,
            icon: TABLE_CODICONS.alignLeft,
            type: "left",
        },
        {
            action: "alignCenter",
            label: window.VditorI18n.alignCenter,
            icon: TABLE_CODICONS.alignCenter,
            type: "center",
        },
        {
            action: "alignRight",
            label: window.VditorI18n.alignRight,
            icon: TABLE_CODICONS.alignRight,
            type: "right",
        },
    ];
    for (let i = 0; i < alignItems.length; i++) {
        const item = alignItems[i];
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.action = item.action;
        button.innerHTML = `${codicon(item.icon)}<span>${item.label}</span>`;
        if (alignType === item.type) {
            button.classList.add(MENU_ITEM_CURRENT_CLASS);
        }
        state.menu.appendChild(button);
    }
};

const updateAlignMenuState = (menu: HTMLElement, alignType: string) => {
    const buttons = menu.querySelectorAll("button[data-action^=\"align\"]");
    for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i] as HTMLButtonElement;
        const action = button.dataset.action || "";
        const type = action === "alignLeft" ? "left"
            : action === "alignCenter" ? "center"
                : "right";
        button.classList.toggle(MENU_ITEM_CURRENT_CLASS, type === alignType);
    }
};

const positionAxisMenu = (
    state: ITableHandleState,
    control: HTMLButtonElement,
) => {
    mountMenuPortal(state);
    state.menu.style.display = "block";
    state.menu.style.visibility = "hidden";
    state.menu.style.left = "0";
    state.menu.style.top = "0";

    const controlRect = control.getBoundingClientRect();
    const menuWidth = state.menu.offsetWidth;
    const menuHeight = state.menu.offsetHeight;
    let left = controlRect.right + 4;
    let top = controlRect.bottom + 4;

    if (left + menuWidth > window.innerWidth - MENU_VIEWPORT_MARGIN) {
        left = controlRect.left - menuWidth - 4;
    }
    if (top + menuHeight > window.innerHeight - MENU_VIEWPORT_MARGIN) {
        top = controlRect.top - menuHeight - 4;
    }

    left = Math.max(
        MENU_VIEWPORT_MARGIN,
        Math.min(left, window.innerWidth - menuWidth - MENU_VIEWPORT_MARGIN),
    );
    top = Math.max(
        MENU_VIEWPORT_MARGIN,
        Math.min(top, window.innerHeight - menuHeight - MENU_VIEWPORT_MARGIN),
    );

    state.menu.style.left = `${left}px`;
    state.menu.style.top = `${top}px`;
    state.menu.style.visibility = "";
};

const showAxisMenu = (
    state: ITableHandleState,
    control: HTMLButtonElement,
    mode: "row" | "col",
) => {
    hideAxisMenu(state);
    state.menuMode = mode;
    setAxisMenuOpen(state, mode);
    const items = getAxisMenuItems(mode);
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.action = item.action;
        button.innerHTML = `${codicon(item.icon)}<span>${item.label}</span>`;
        state.menu.appendChild(button);
    }
    if (state.focusedCell) {
        appendAlignMenuSection(state, state.focusedCell);
    }
    positionAxisMenu(state, control);
};

const runAxisMenuAction = (state: ITableHandleState, action: string) => {
    const table = state.activeTable;
    const focusedCell = state.focusedCell;
    if (!table || !focusedCell) {
        return;
    }
    const range = getEditorRange(state.vditor);
    if (action === "alignLeft" || action === "alignCenter" || action === "alignRight") {
        const type = action === "alignLeft" ? "left"
            : action === "alignCenter" ? "center"
                : "right";
        setTableAlign(table, type);
        setSelectionFocus(range);
        updateAlignMenuState(state.menu, type);
        afterRenderEvent(state.vditor, {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: true,
        });
        const control = state.menuMode === "row" ? state.rowAxisControl : state.colAxisControl;
        positionAxisMenu(state, control);
        return;
    }
    hideAxisMenu(state);
    if (action === "insertRowAbove") {
        insertRowAbove(state.vditor, range, focusedCell);
    } else if (action === "insertRowBelow") {
        insertRow(state.vditor, range, focusedCell);
    } else if (action === "deleteRow") {
        deleteRow(state.vditor, range, focusedCell);
    } else if (action === "insertColumnLeft") {
        insertColumn(state.vditor, table, focusedCell, "beforebegin");
    } else if (action === "insertColumnRight") {
        insertColumn(state.vditor, table, focusedCell, "afterend");
    } else if (action === "deleteColumn") {
        deleteColumn(state.vditor, range, table, focusedCell);
    }
    refresh(state.vditor, state);
};

const refresh = (vditor: IVditor, state: ITableHandleState) => {
    if (state.dragging) {
        return;
    }
    if (!shouldShowHandle(vditor, state.editorElement, document.activeElement)) {
        hideAll(state);
        return;
    }

    const focusedCellFromRange = getFocusedCell(vditor, state.editorElement);
    let focusedCell = focusedCellFromRange;
    if (!focusedCell && isAxisMenuOpen(state) && state.focusedCell) {
        focusedCell = state.focusedCell;
    }
    const tableFromFocus = focusedCell?.closest("table") as HTMLTableElement | null;
    let activeTable = state.hoveredTable || tableFromFocus;
    if (!activeTable && isAxisMenuOpen(state) && state.activeTable) {
        activeTable = state.activeTable;
    }

    if (!activeTable) {
        hideAll(state);
        return;
    }

    state.activeTable = activeTable;
    state.focusedCell =
        focusedCell && focusedCell.closest("table") === activeTable ? focusedCell : null;

    observeActiveTable(state, activeTable);
    state.root.classList.add(`${ROOT_CLASS}--visible`);

    if (state.focusedCell) {
        repositionControls(state);
        if (state.menuMode && state.menu.childElementCount === 0) {
            hideAxisMenu(state);
        } else if (isAxisMenuOpen(state)) {
            const control = state.menuMode === "row" ? state.rowAxisControl : state.colAxisControl;
            positionAxisMenu(state, control);
        }
    } else if (isAxisMenuOpen(state) && state.menuMode) {
        const control = state.menuMode === "row" ? state.rowAxisControl : state.colAxisControl;
        state.rowAxisControl.style.display = "block";
        state.colAxisControl.style.display = "block";
        positionAxisMenu(state, control);
    } else {
        state.rowAxisControl.style.display = "none";
        state.colAxisControl.style.display = "none";
        hideAxisMenu(state);
    }
};

const scheduleRefresh = (vditor: IVditor, state: ITableHandleState) => {
    if (state.refreshRafId) {
        cancelAnimationFrame(state.refreshRafId);
    }
    state.refreshRafId = requestAnimationFrame(() => {
        state.refreshRafId = 0;
        refresh(vditor, state);
    });
};

const createAxisControl = (className: string, horizontalGrip = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${AXIS_CLASS} ${className}`;
    button.style.display = "none";
    const mark = document.createElement("span");
    mark.className = AXIS_MARK_CLASS;
    const grip = document.createElement("span");
    grip.className = horizontalGrip
        ? `${AXIS_GRIP_CLASS} ${AXIS_GRIP_COL_CLASS}`
        : AXIS_GRIP_CLASS;
    grip.setAttribute("aria-hidden", "true");
    button.appendChild(mark);
    button.appendChild(grip);
    button.addEventListener("mousedown", (event) => {
        event.preventDefault();
    });
    return button;
};

const bindAxisControl = (
    state: ITableHandleState,
    control: HTMLButtonElement,
    mode: "row" | "col",
) => {
    let pointerId = -1;
    let pointerDown = false;
    let dragStarted = false;
    let sourceIndex = -1;
    let dropIndex = -1;
    let startX = 0;
    let startY = 0;

    const resetDrag = () => {
        dragStarted = false;
        state.dragging = false;
        state.dragMode = null;
        control.classList.remove(AXIS_DRAG_CLASS);
        if (pointerId >= 0 && control.hasPointerCapture(pointerId)) {
            control.releasePointerCapture(pointerId);
        }
        state.root.classList.remove(DRAGGING_CLASS);
        hideDropLine(state);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        pointerId = -1;
        sourceIndex = -1;
        dropIndex = -1;
    };

    const startDrag = () => {
        if (!state.activeTable || !state.focusedCell) {
            return;
        }
        hideAxisMenu(state);
        dragStarted = true;
        state.dragging = true;
        state.dragMode = mode;
        sourceIndex = mode === "row"
            ? getRowIndex(state.activeTable, state.focusedCell)
            : getColumnIndex(state.focusedCell);
        dropIndex = sourceIndex;
        control.classList.add(AXIS_DRAG_CLASS);
        if (pointerId >= 0) {
            control.setPointerCapture(pointerId);
        }
        state.root.classList.add(DRAGGING_CLASS);
        document.body.style.userSelect = "none";
        document.body.style.cursor = mode === "row" ? "row-resize" : "col-resize";
        if (mode === "row") {
            dropIndex = resolveRowDropIndex(state.activeTable, state.dragClientY);
            positionRowDropLine(state, state.activeTable, dropIndex);
        } else {
            dropIndex = resolveColumnDropIndex(state.activeTable, state.dragClientX);
            positionColumnDropLine(state, state.activeTable, dropIndex);
        }
    };

    const finishDrag = () => {
        const table = state.activeTable;
        if (dragStarted && table) {
            if (mode === "row") {
                dropIndex = resolveRowDropIndex(table, state.dragClientY);
            } else {
                dropIndex = resolveColumnDropIndex(table, state.dragClientX);
            }
        }
        const shouldMove = dragStarted && table && sourceIndex >= 0 && dropIndex >= 0 && sourceIndex !== dropIndex;
        const moveFrom = sourceIndex;
        const moveTo = dropIndex;
        resetDrag();
        pointerDown = false;
        if (shouldMove && table) {
            if (mode === "row") {
                moveTableRow(state.vditor, table, moveFrom, moveTo);
            } else {
                moveTableColumn(state.vditor, table, moveFrom, moveTo);
            }
            state.vditor.undo.addToUndoStack(state.vditor);
            afterRenderEvent(state.vditor, {
                enableAddUndoStack: false,
                enableHint: false,
                enableInput: true,
            });
        }
        refresh(state.vditor, state);
    };

    control.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !state.focusedCell || !state.activeTable) {
            return;
        }
        event.preventDefault();
        pointerDown = true;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        state.dragClientX = event.clientX;
        state.dragClientY = event.clientY;
    });

    control.addEventListener("pointermove", (event) => {
        state.dragClientX = event.clientX;
        state.dragClientY = event.clientY;
        if (!pointerDown) {
            return;
        }
        if (!dragStarted) {
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
                startDrag();
            }
            return;
        }
        if (!state.activeTable) {
            return;
        }
        if (mode === "row") {
            dropIndex = resolveRowDropIndex(state.activeTable, event.clientY);
            positionRowDropLine(state, state.activeTable, dropIndex);
        } else {
            dropIndex = resolveColumnDropIndex(state.activeTable, event.clientX);
            positionColumnDropLine(state, state.activeTable, dropIndex);
        }
    });

    control.addEventListener("pointerup", () => {
        if (dragStarted) {
            finishDrag();
            return;
        }
        if (pointerDown) {
            showAxisMenu(state, control, mode);
        }
        pointerDown = false;
    });

    control.addEventListener("pointercancel", () => {
        if (dragStarted) {
            resetDrag();
            refresh(state.vditor, state);
        }
        pointerDown = false;
    });
};

export const initTableHandle = (vditor: IVditor, wrapper: HTMLElement, editorElement: HTMLElement) => {
    if (handleMap.has(vditor)) {
        return;
    }

    const root = document.createElement("div");
    root.className = ROOT_CLASS;

    const menu = document.createElement("div");
    menu.className = `vditor-hint ${MENU_CLASS}`;
    menu.style.display = "none";

    const dropLine = document.createElement("div");
    dropLine.className = DROP_LINE_CLASS;
    dropLine.style.display = "none";

    const rowAxisControl = createAxisControl(AXIS_ROW_CLASS);
    const colAxisControl = createAxisControl(AXIS_COL_CLASS, true);

    root.appendChild(rowAxisControl);
    root.appendChild(colAxisControl);
    root.appendChild(menu);
    root.appendChild(dropLine);
    wrapper.insertBefore(root, wrapper.firstChild);

    const state: ITableHandleState = {
        vditor,
        root,
        menu,
        dropLine,
        rowAxisControl,
        colAxisControl,
        wrapper,
        editorElement,
        hoveredTable: null,
        activeTable: null,
        focusedCell: null,
        refreshRafId: 0,
        observedTable: null,
        dragging: false,
        menuMode: null,
        dragMode: null,
        dragClientX: 0,
        dragClientY: 0,
    };
    handleMap.set(vditor, state);

    bindAxisControl(state, rowAxisControl, "row");
    bindAxisControl(state, colAxisControl, "col");

    menu.addEventListener("mousedown", (event) => {
        event.stopPropagation();
        const target = (event.target as Element).closest("button[data-action]");
        if (!(target instanceof HTMLButtonElement)) {
            return;
        }
        event.preventDefault();
        runAxisMenuAction(state, target.dataset.action || "");
    });

    state.onDocumentPointerDown = (event: PointerEvent) => {
        const target = event.target as Node | null;
        if (!target || state.menu.style.display !== "block") {
            return;
        }
        if (state.menu.contains(target) || state.rowAxisControl.contains(target) || state.colAxisControl.contains(target)) {
            return;
        }
        hideAxisMenu(state);
    };
    document.addEventListener("pointerdown", state.onDocumentPointerDown);

    const onMouseMove = (event: MouseEvent) => {
        if (state.dragging || isAxisMenuOpen(state)) {
            return;
        }
        if (!shouldShowHandle(vditor, editorElement, event.target)) {
            state.hoveredTable = null;
            scheduleRefresh(vditor, state);
            return;
        }
        const table = getTableAtPoint(event.clientX, event.clientY, editorElement);
        if (table) {
            state.hoveredTable = table;
        } else if (!isTableHandleElement(event.target as Element)) {
            state.hoveredTable = null;
        }
        scheduleRefresh(vditor, state);
    };

    const onMouseLeave = (event: MouseEvent) => {
        if (state.dragging || isAxisMenuOpen(state)) {
            return;
        }
        const related = event.relatedTarget as Node | null;
        if (related && (state.root.contains(related) || state.wrapper.contains(related) || state.menu.contains(related))) {
            return;
        }
        state.hoveredTable = null;
        scheduleRefresh(vditor, state);
    };

    const onScroll = () => {
        if (state.dragging) {
            updateDragDropLine(state);
            repositionControls(state);
            return;
        }
        if (isAxisMenuOpen(state) && state.menuMode) {
            repositionControls(state);
            const control = state.menuMode === "row" ? state.rowAxisControl : state.colAxisControl;
            positionAxisMenu(state, control);
            return;
        }
        if (state.activeTable && state.focusedCell) {
            repositionControls(state);
            return;
        }
        if (!state.activeTable && !state.hoveredTable) {
            return;
        }
        scheduleRefresh(vditor, state);
    };

    const scrollTargets: EventTarget[] = [editorElement, wrapper];
    const vditorElement = wrapper.closest(".vditor");
    if (vditorElement instanceof HTMLElement) {
        scrollTargets.push(vditorElement);
    }
    const contentElement = wrapper.closest(".vditor-content");
    if (contentElement instanceof HTMLElement) {
        scrollTargets.push(contentElement);
    }
    state.scrollTargets = scrollTargets;
    state.onScroll = onScroll;
    window.addEventListener("scroll", onScroll, { passive: true });
    for (let i = 0; i < scrollTargets.length; i++) {
        bindScrollListener(scrollTargets[i], onScroll);
    }

    wrapper.addEventListener("mousemove", onMouseMove);
    wrapper.addEventListener("mouseleave", onMouseLeave);

    state.unbind = () => {
        if (state.refreshRafId) {
            cancelAnimationFrame(state.refreshRafId);
        }
        if (state.onDocumentPointerDown) {
            document.removeEventListener("pointerdown", state.onDocumentPointerDown);
        }
        if (state.observedTable && state.onTableScroll) {
            state.observedTable.removeEventListener("scroll", state.onTableScroll);
        }
        state.resizeObserver?.disconnect();
        if (state.onScroll) {
            window.removeEventListener("scroll", state.onScroll);
            const targets = state.scrollTargets;
            if (targets) {
                for (let i = 0; i < targets.length; i++) {
                    unbindScrollListener(targets[i], state.onScroll);
                }
            }
        }
        wrapper.removeEventListener("mousemove", onMouseMove);
        wrapper.removeEventListener("mouseleave", onMouseLeave);
        restoreMenuContainer(state);
        root.remove();
        handleMap.delete(vditor);
    };
};

export const updateTableHandle = (vditor: IVditor) => {
    const state = handleMap.get(vditor);
    if (state) {
        scheduleRefresh(vditor, state);
    }
};

export const hideTableHandle = (vditor: IVditor) => {
    const state = handleMap.get(vditor);
    if (state) {
        state.hoveredTable = null;
        hideAll(state);
    }
};
