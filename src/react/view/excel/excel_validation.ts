import type * as ExcelJS from '@cweijan/exceljs';

export interface SpreadsheetValidationItem {
    refs: string[];
    mode: string;
    type: string;
    required?: boolean;
    operator?: string;
    value?: string | string[] | number;
}

type ExcelOperator = NonNullable<ExcelJS.DataValidation['operator']>;

const SS_TO_EXCEL_OPERATOR: Record<string, ExcelOperator> = {
    be: 'between',
    nbe: 'notBetween',
    eq: 'equal',
    neq: 'notEqual',
    lt: 'lessThan',
    lte: 'lessThanOrEqual',
    gt: 'greaterThan',
    gte: 'greaterThanOrEqual',
};

const EXCEL_TO_SS_OPERATOR: Record<string, string> = {
    between: 'be',
    notBetween: 'nbe',
    equal: 'eq',
    notEqual: 'neq',
    lessThan: 'lt',
    lessThanOrEqual: 'lte',
    greaterThan: 'gt',
    greaterThanOrEqual: 'gte',
};

function parseListFormula(raw: unknown): string {
    if (raw == null) return '';
    let text = String(raw).trim();
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        text = text.slice(1, -1);
    }
    return text;
}

function toFormulaValue(value: string | number): string | number {
    if (typeof value === 'number') return value;
    const trimmed = value.trim();
    if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed);
    return trimmed;
}

export function excelValidationToSpreadsheet(
    ref: string,
    dv: ExcelJS.DataValidation,
): SpreadsheetValidationItem | null {
    const mode = 'cell';
    if (dv.type === 'list') {
        return {
            refs: [ref],
            mode,
            type: 'list',
            required: !dv.allowBlank,
            value: parseListFormula(dv.formulae?.[0]),
        };
    }
    if (dv.type === 'whole' || dv.type === 'decimal') {
        const operator = dv.operator ? EXCEL_TO_SS_OPERATOR[dv.operator] : undefined;
        let value: string | string[] | number = '';
        if (dv.operator === 'between' || dv.operator === 'notBetween') {
            value = [String(dv.formulae?.[0] ?? ''), String(dv.formulae?.[1] ?? '')];
        } else {
            value = String(dv.formulae?.[0] ?? '');
        }
        return {
            refs: [ref],
            mode,
            type: 'number',
            required: !dv.allowBlank,
            operator,
            value,
        };
    }
    if (dv.type === 'date') {
        const operator = dv.operator ? EXCEL_TO_SS_OPERATOR[dv.operator] : undefined;
        let value: string | string[] = '';
        if (dv.operator === 'between' || dv.operator === 'notBetween') {
            value = [String(dv.formulae?.[0] ?? ''), String(dv.formulae?.[1] ?? '')];
        } else {
            value = String(dv.formulae?.[0] ?? '');
        }
        return {
            refs: [ref],
            mode,
            type: 'date',
            required: !dv.allowBlank,
            operator,
            value,
        };
    }
    return null;
}

export function readWorksheetValidations(worksheet: ExcelJS.Worksheet): SpreadsheetValidationItem[] {
    const model = (worksheet as { dataValidations?: { model?: Record<string, ExcelJS.DataValidation> } })
        .dataValidations?.model ?? {};
    const items: SpreadsheetValidationItem[] = [];
    for (const ref of Object.keys(model)) {
        const dv = model[ref];
        if (!dv) continue;
        const converted = excelValidationToSpreadsheet(ref, dv);
        if (converted) items.push(converted);
    }
    return items;
}

export function spreadsheetValidationToExcel(item: SpreadsheetValidationItem): ExcelJS.DataValidation | null {
    const { type, operator, value, required } = item;
    const allowBlank = !required;

    if (type === 'list') {
        const list = Array.isArray(value) ? value.join(',') : String(value ?? '');
        return {
            type: 'list',
            allowBlank,
            formulae: [`"${list}"`],
        };
    }
    if (type === 'number') {
        const excelOp = operator ? SS_TO_EXCEL_OPERATOR[operator] : undefined;
        if (excelOp === 'between' || excelOp === 'notBetween') {
            const arr = Array.isArray(value) ? value : ['', ''];
            return {
                type: 'decimal',
                allowBlank,
                operator: excelOp,
                formulae: [toFormulaValue(arr[0]), toFormulaValue(arr[1])],
            };
        }
        return {
            type: 'decimal',
            allowBlank,
            operator: excelOp,
            formulae: [toFormulaValue(Array.isArray(value) ? value[0] : String(value ?? ''))],
        };
    }
    if (type === 'date') {
        const excelOp = operator ? SS_TO_EXCEL_OPERATOR[operator] : undefined;
        if (excelOp === 'between' || excelOp === 'notBetween') {
            const arr = Array.isArray(value) ? value : ['', ''];
            return {
                type: 'date',
                allowBlank,
                operator: excelOp,
                formulae: [arr[0], arr[1]],
            };
        }
        return {
            type: 'date',
            allowBlank,
            operator: excelOp,
            formulae: [Array.isArray(value) ? value[0] : String(value ?? '')],
        };
    }
    if (type === 'email' || type === 'phone') {
        return null;
    }
    return null;
}

export function writeWorksheetValidations(
    worksheet: ExcelJS.Worksheet,
    items: SpreadsheetValidationItem[] | undefined,
) {
    if (!items?.length) return;
    const dv = (worksheet as { dataValidations?: { add: (ref: string, v: ExcelJS.DataValidation) => void } })
        .dataValidations;
    if (!dv?.add) return;
    for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        const excelDv = spreadsheetValidationToExcel(item);
        if (!excelDv) continue;
        for (let j = 0; j < item.refs.length; j += 1) {
            dv.add(item.refs[j], excelDv);
        }
    }
}
