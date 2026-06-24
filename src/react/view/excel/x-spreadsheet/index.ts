/* global window, document */
import { h } from './component/element';
import DataProxy from './core/data_proxy';
import Sheet from './component/sheet';
import Bottombar from './component/bottombar';
import { cssPrefix } from './config';
import { locale } from './locale/locale';
import './index.less';
import '@vscode/codicons/dist/codicon.css';
import {
    findAllInSheets,
    findFirstMatch,
    findNextMatch,
    replaceAllInSheets,
    replaceCellText,
    type FindMatch,
    type FindOptions,
} from '../excel_find';
import { parseSpreadsheetLink } from '../excel_hyperlink';
import { expr2xy } from './core/alphabet';

export interface ExtendToolbarOption {
    tip?: string;
    el?: HTMLElement;
    icon?: string;
    onClick?: (data: object, sheet: object) => void;
}

export interface Options {
    mode?: 'edit' | 'read';
    showToolbar?: boolean;
    showGrid?: boolean;
    showContextmenu?: boolean;
    showBottomBar?: boolean;
    extendToolbar?: {
        left?: ExtendToolbarOption[];
        right?: ExtendToolbarOption[];
    };
    autoFocus?: boolean;
    view?: {
        height: () => number;
        width?: () => number;
    };
    row?: {
        len: number;
        height: number;
    };
    col?: {
        len: number;
        width?: number;
        indexWidth?: number;
        minWidth?: number;
    };
    style?: {
        bgcolor: string;
        align: 'left' | 'center' | 'right';
        valign: 'top' | 'middle' | 'bottom';
        textwrap: boolean;
        strike: boolean;
        underline: boolean;
        color: string;
        font: {
            name: 'Helvetica';
            size: number;
            bold: boolean;
            italic: false;
        };
    };
}

export type CELL_SELECTED = 'cell-selected';
export type CELLS_SELECTED = 'cells-selected';
export type CELL_EDITED = 'cell-edited';

export type CellMerge = [number, number];

export interface SpreadsheetEventHandler {
    (envt: CELL_SELECTED, callback: (cell: Cell, rowIndex: number, colIndex: number) => void): void;
    (envt: CELLS_SELECTED, callback: (cell: Cell, parameters: { sri: number; sci: number; eri: number; eci: number }) => void): void;
    (evnt: CELL_EDITED, callback: (text: string, rowIndex: number, colIndex: number) => void): void;
}

export interface ColProperties {
    width?: number;
}

export interface CellData {
    text: string;
    style?: number;
    merge?: CellMerge;
    /** false 表示不可编辑（对应 Excel 锁定单元格） */
    editable?: boolean;
}

export interface RowData {
    cells: {
        [key: number]: CellData;
    };
    height?: number;
}

export interface RowsData {
    len?: number;
    [key: number]: RowData | number | undefined;
}

export interface SheetAutofilterData {
    ref: string;
    filters?: { ci: number; operator: string; value: unknown }[];
    sort?: { ci: number; order: string };
}

export interface SheetHyperlinkData {
    link: string;
    tooltip?: string;
}

export interface SheetValidationData {
    refs: string[];
    mode: string;
    type: string;
    required?: boolean;
    operator?: string;
    value?: string | string[] | number;
}

export interface SheetData {
    name?: string;
    freeze?: string;
    autofilter?: SheetAutofilterData;
    hyperlinks?: Record<string, SheetHyperlinkData>;
    validations?: SheetValidationData[];
    /** Excel 工作表保护配置（不含密码） */
    sheetProtection?: Record<string, unknown>;
    styles?: CellStyle[];
    merges?: string[];
    cols?: {
        len?: number;
        [key: number]: ColProperties | number | undefined;
    };
    rows?: RowsData;
}

export interface SpreadsheetData {
    name?: string;
    [index: number]: SheetData;
}

export interface CellStyle {
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
    font?: {
        name?: string;
        size?: number;
        bold?: boolean;
        italic?: boolean;
    };
    bgcolor?: string;
    textwrap?: boolean;
    strike?: boolean;
    underline?: boolean;
    color?: string;
    border?: {
        top?: string[];
        right?: string[];
        bottom?: string[];
        left?: string[];
    };
    format?: string;
}

export interface Editor { }
export interface Element { }
export interface Row { }
export interface Table { }
export interface Cell { }
export interface Sheet { }

export class Spreadsheet {
    private options: Options;
    private sheetIndex: number;
    private datas: DataProxy[];
    private bottombar: Bottombar | null;
    private data: DataProxy;
    private sheet: Sheet;
    private sheetChangeListeners: ((index: number) => void)[] = [];

    constructor(selectors: string | HTMLElement, options: Options = {}) {
        let targetEl = selectors;
        this.options = { showBottomBar: true, ...options };
        this.sheetIndex = 1;
        this.datas = [];
        this.sheetChangeListeners = [];

        if (typeof selectors === 'string') {
            targetEl = document.querySelector(selectors) as HTMLElement;
        }

        this.bottombar = this.options.showBottomBar ? new Bottombar(
            () => {
                if (this.options.mode === 'read') return;
                const d = this.addSheet();
                this.sheet.resetData(d);
            },
            (index: number) => {
                const d = this.datas[index];
                this.sheet.resetData(d);
                this.data = d;
                for (const listener of this.sheetChangeListeners) {
                    listener(index);
                }
            },
            (key: string) => {
                this.handleSheetMenu(key);
            },
            (index: number, value: string) => {
                this.datas[index].name = value;
                this.sheet.trigger('change');
            },
            (from: number, to: number) => {
                this.moveSheetTo(from, to);
            }
        ) : null;

        this.data = this.addSheet();
        const rootEl = h('div', `${cssPrefix}`)
            .on('contextmenu', (evt: Event) => evt.preventDefault());

        (targetEl as HTMLElement).appendChild(rootEl.el);
        this.sheet = new Sheet(rootEl, this.data);

        if (this.bottombar !== null) {
            rootEl.child(this.bottombar.el);
        }
    }

    addSheet(name?: string, active = true): DataProxy {
        const n = name || `sheet${this.sheetIndex}`;
        const d = new DataProxy(n, this.options);
        d.change = (...args: any[]) => {
            this.sheet.trigger('change', ...args);
        };
        this.datas.push(d);

        if (this.bottombar !== null) {
            this.bottombar.addItem(n, active, this.options);
        }
        this.sheetIndex += 1;
        return d;
    }

    deleteSheet(): void {
        if (this.bottombar === null) return;

        const [oldIndex, nindex] = this.bottombar.deleteItem();
        if (oldIndex >= 0) {
            this.datas.splice(oldIndex, 1);
            if (nindex >= 0) {
                this.data = this.datas[nindex];
                this.sheet.resetData(this.datas[nindex]);
                for (const listener of this.sheetChangeListeners) {
                    listener(nindex);
                }
            }
            this.sheet.trigger('change');
        }
    }

    private uniqueSheetName(base: string): string {
        const names = this.datas.map(d => d.name);
        const trimmed = base.trim() || 'Sheet';
        if (!names.includes(trimmed)) return trimmed;
        let i = 2;
        while (names.includes(`${trimmed} (${i})`)) {
            i += 1;
        }
        return `${trimmed} (${i})`;
    }

    handleSheetMenu(key: string): void {
        if (this.options.mode === 'read' || this.bottombar === null) return;
        const index = this.bottombar.getContextSheetIndex();
        if (index < 0) return;
        if (key === 'delete') {
            this.deleteSheet();
        } else if (key === 'rename') {
            this.bottombar.startRename(index);
        } else if (key === 'duplicate') {
            this.duplicateSheet(index);
        }
    }

    moveSheetTo(from: number, to: number): void {
        if (this.bottombar === null) return;
        if (from === to || from < 0 || to < 0 || from >= this.datas.length || to >= this.datas.length) return;
        const [sheet] = this.datas.splice(from, 1);
        this.datas.splice(to, 0, sheet);
        this.bottombar.moveItem(from, to);
        const active = this.getActiveSheetIndex();
        if (active === from || active === to) {
            for (const listener of this.sheetChangeListeners) {
                listener(this.getActiveSheetIndex());
            }
        }
        this.sheet.trigger('change');
    }

    duplicateSheet(sourceIndex: number): void {
        if (this.bottombar === null) return;
        const source = this.datas[sourceIndex];
        if (!source) return;

        const copyName = this.uniqueSheetName(source.name);
        const sheetData = JSON.parse(JSON.stringify(source.getData())) as SheetData;
        sheetData.name = copyName;

        const nd = new DataProxy(copyName, this.options);
        nd.change = (...args: any[]) => {
            this.sheet.trigger('change', ...args);
        };
        nd.setData(sheetData);

        const insertAt = sourceIndex + 1;
        this.datas.splice(insertAt, 0, nd);
        this.bottombar.insertItem(insertAt, copyName, true, this.options);

        this.data = nd;
        this.sheet.resetData(nd);
        for (const listener of this.sheetChangeListeners) {
            listener(insertAt);
        }
        this.sheet.trigger('change');
    }

    loadData(data: SpreadsheetData | SpreadsheetData[]): this {
        const ds = Array.isArray(data) ? data : [data];
        if (this.bottombar !== null) {
            this.bottombar.clear();
        }
        this.datas = [];
        if (ds.length > 0) {
            for (let i = 0; i < ds.length; i += 1) {
                const it = ds[i];
                const nd = this.addSheet(it.name, i === 0);
                nd.setData(it);
                if (i === 0) {
                    this.data = nd;
                    this.sheet.resetData(nd);
                }
            }
        }
        return this;
    }

    getData(): SpreadsheetData[] {
        return this.datas.map(it => it.getData());
    }

    cellText(ri: number, ci: number, text: string, sheetIndex = 0): this {
        this.datas[sheetIndex].setCellText(ri, ci, text, 'finished');
        return this;
    }

    cell(ri: number, ci: number, sheetIndex = 0): Cell {
        return this.datas[sheetIndex].getCell(ri, ci);
    }

    cellStyle(ri: number, ci: number, sheetIndex = 0): CellStyle {
        return this.datas[sheetIndex].getCellStyle(ri, ci);
    }

    reRender(): this {
        this.sheet.table.render();
        return this;
    }

    setSaveEnabled(enabled: boolean): this {
        (this.sheet as any).toolbar.setSaveEnabled(enabled);
        return this;
    }

    getActiveSheetIndex(): number {
        if (this.bottombar === null) return 0;
        const bar = this.bottombar as any;
        const idx = bar.items.findIndex((it: any) => it === bar.activeEl);
        return idx >= 0 ? idx : 0;
    }

    activateSheet(index: number): this {
        if (index < 0 || index >= this.datas.length) return this;
        if (this.getActiveSheetIndex() === index) return this;
        if (this.bottombar !== null) {
            const bar = this.bottombar as any;
            const item = bar.items[index];
            if (item) bar.clickSwap2(item);
        } else {
            this.data = this.datas[index];
            this.sheet.resetData(this.data);
        }
        return this;
    }

    scrollToCell(ri: number, ci: number, sheetIndex = 0): this {
        const before = this.getSelection();
        this.activateSheet(sheetIndex);
        const data = this.datas[sheetIndex];
        if (!data) {
            console.warn('[excel-view] scrollToCell: no data', { sheetIndex, ri, ci });
            return this;
        }
        const maxRi = Math.max(0, (data.rows.len ?? 1) - 1);
        const maxCi = Math.max(0, (data.cols.len ?? 1) - 1);
        const row = Math.min(Math.max(0, ri), maxRi);
        const col = Math.min(Math.max(0, ci), maxCi);
        console.log('[excel-view] scrollToCell', {
            request: { ri, ci, sheetIndex },
            clamped: { row, col },
            before,
            activeSheet: this.getActiveSheetIndex(),
        });
        (this.sheet as any).scrollToCell(row, col);
        return this;
    }

    getSelection(): { ri: number; ci: number; sheetIndex: number } {
        const { ri = 0, ci = 0 } = this.data.selector ?? {};
        return { ri, ci, sheetIndex: this.getActiveSheetIndex() };
    }

    onSheetChange(cb: (index: number) => void): this {
        this.sheetChangeListeners.push(cb);
        return this;
    }

    onOpenLink(cb: (payload: { link: string; tooltip?: string }) => void): this {
        this.sheet.on('open-link', cb);
        return this;
    }

    onProtectedCellDblClick(cb: () => void): this {
        this.sheet.on('protected-cell-dblclick', cb);
        return this;
    }

    findFirst(text: string, options: FindOptions = {}): FindMatch | null {
        return findFirstMatch(this.getData(), text, options, this.getActiveSheetIndex());
    }

    findNext(text: string, from: FindMatch, options: FindOptions = {}, backward = false): FindMatch | null {
        return findNextMatch(this.getData(), text, from, options, this.getActiveSheetIndex(), backward);
    }

    findAll(text: string, options: FindOptions = {}): FindMatch[] {
        return findAllInSheets(this.getData(), text, options, this.getActiveSheetIndex());
    }

    gotoMatch(match: FindMatch): this {
        this.scrollToCell(match.ri, match.ci, match.sheetIndex);
        return this;
    }

    replaceAt(match: FindMatch, findText: string, replaceText: string, options: FindOptions = {}): boolean {
        const sheets = this.getData();
        const changed = replaceCellText(sheets, match, findText, replaceText, options);
        if (changed) {
            const data = this.datas[match.sheetIndex];
            if (data) {
                data.setData(sheets[match.sheetIndex]);
                if (match.sheetIndex === this.getActiveSheetIndex()) {
                    this.sheet.resetData(data);
                }
                this.sheet.trigger('change');
            }
        }
        return changed;
    }

    replaceAll(findText: string, replaceText: string, options: FindOptions = {}): number {
        const sheets = this.getData();
        const count = replaceAllInSheets(sheets, findText, replaceText, options, this.getActiveSheetIndex());
        if (count > 0) {
            for (let i = 0; i < this.datas.length; i += 1) {
                this.datas[i].setData(sheets[i]);
            }
            this.sheet.resetData(this.data);
            this.sheet.trigger('change');
        }
        return count;
    }

    followHyperlink(payload: { link: string }): this {
        const parsed = parseSpreadsheetLink(payload.link);
        if (parsed.type === 'external') {
            this.sheet.trigger('open-external-link', parsed.url);
            return this;
        }
        const sheetIndex = this.datas.findIndex((d) => d.name === parsed.sheetName);
        if (sheetIndex < 0) return this;
        const [ci, ri] = expr2xy(parsed.ref);
        this.scrollToCell(ri, ci, sheetIndex);
        return this;
    }

    on(eventName: string, func: (...args: any[]) => void): this {
        this.sheet.on(eventName, func);
        return this;
    }

    validate(): boolean {
        const { validations } = this.data;
        return validations.errors.size <= 0;
    }

    change(cb: (json: SpreadsheetData) => void): this {
        this.sheet.on('change', cb);
        return this;
    }

    static locale(lang: string, message: object): void {
        locale(lang, message);
    }
}

const spreadsheet = (el: string | HTMLElement, options: Options = {}): Spreadsheet => new Spreadsheet(el, options);

if (window) {
    (window as any).x_spreadsheet = spreadsheet;
    (window as any).x_spreadsheet.locale = (lang: string, message: object) => locale(lang, message);
}

export default Spreadsheet;
export { spreadsheet };
export type { FindMatch, FindOptions } from '../excel_find'; 