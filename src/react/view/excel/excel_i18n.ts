import { getConfigs } from '../../util/vscodeConfig.ts';
import Spreadsheet from './x-spreadsheet/index';
import en from './x-spreadsheet/locale/en';
import zhCn from './x-spreadsheet/locale/zh-cn';
import zhTw from './x-spreadsheet/locale/zh-tw';
import de from './x-spreadsheet/locale/de';
import nl from './x-spreadsheet/locale/nl';
import { t as localeT } from './x-spreadsheet/locale/locale';

const localeMessages: Record<string, object> = {
    en,
    'zh-cn': zhCn,
    'zh-tw': zhTw,
    de,
    nl,
};

const TRADITIONAL_ZH = new Set(['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant']);
const SIMPLIFIED_ZH = new Set(['zh-cn', 'zh-sg', 'zh-hans']);

function resolveSpreadsheetLang(vscodeLang: string): string {
    const lower = (vscodeLang || 'en').toLowerCase();
    if (SIMPLIFIED_ZH.has(lower)) return 'zh-cn';
    if (TRADITIONAL_ZH.has(lower)) return 'zh-tw';
    if (lower === 'zh') return 'zh-cn';
    if (lower.startsWith('de')) return 'de';
    if (lower.startsWith('nl')) return 'nl';
    return 'en';
}

let currentLang = 'en';
let initialized = false;

export function initExcelLocale(): string {
    if (initialized) return currentLang;
    const lang = resolveSpreadsheetLang(getConfigs()?.language ?? 'en');
    const messages = localeMessages[lang] ?? en;
    Spreadsheet.locale(lang, messages);
    currentLang = lang;
    initialized = true;
    return lang;
}

export function getExcelLang(): string {
    if (!initialized) initExcelLocale();
    return currentLang;
}

/** Translate a locale key; `{}` placeholders are filled in order. */
export function t(key: string, ...args: (string | number)[]): string {
    if (!initialized) initExcelLocale();
    let text = localeT(key);
    for (const arg of args) {
        text = text.replace('{}', String(arg));
    }
    return text;
}
