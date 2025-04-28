/* global window, document */
import { h } from './component/element';
import DataProxy from './core/data_proxy';
import Sheet from './component/sheet';
import Bottombar from './component/bottombar';
import { cssPrefix } from './config';
import { locale } from './locale/locale';
import './index.less';

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
}

export interface RowData {
    cells: {
        [key: number]: CellData;
    };
}

export interface SheetData {
    name?: string;
    freeze?: string;
    styles?: CellStyle[];
    merges?: string[];
    cols?: {
        len?: number;
        [key: number]: ColProperties;
    };
    rows?: {
        [key: number]: RowData;
    };
}

export interface SpreadsheetData {
    name?: string;
    [index: number]: SheetData;
}

export interface CellStyle {
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
    font?: {
        bold?: boolean;
    };
    bgcolor?: string;
    textwrap?: boolean;
    color?: string;
    border?: {
        top?: string[];
        right?: string[];
        bottom?: string[];
        left?: string[];
    };
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

    constructor(selectors: string | HTMLElement, options: Options = {}) {
        let targetEl = selectors;
        this.options = { showBottomBar: true, ...options };
        this.sheetIndex = 1;
        this.datas = [];

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
            },
            () => {
                this.deleteSheet();
            },
            (index: number, value: string) => {
                this.datas[index].name = value;
                this.sheet.trigger('change');
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
            if (nindex >= 0) this.sheet.resetData(this.datas[nindex]);
            this.sheet.trigger('change');
        }
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