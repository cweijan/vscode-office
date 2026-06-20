import {LanguageDescription} from "@codemirror/language";
import { languages } from "@codemirror/language-data";

import { Constants } from "../constants";

interface CodeMirrorLanguageEntry {
    canonical: string;
    terms: string[];
}

/** 在 @codemirror/language-data 之外补充的语言别名 */
const EXTRA_LANGUAGE_ALIASES: Record<string, string[]> = {
    Shell: ["bash", "sh", "zsh", "shell", "shellscript", "console", "terminal"],
};

const buildLanguageEntries = (): CodeMirrorLanguageEntry[] => {
    const entries: CodeMirrorLanguageEntry[] = [];
    for (const language of languages) {
        const terms = new Set<string>([language.name, ...language.alias]);
        const extra = EXTRA_LANGUAGE_ALIASES[language.name];
        if (extra) {
            for (const alias of extra) {
                terms.add(alias);
            }
        }
        entries.push({
            canonical: language.name,
            terms: [...terms],
        });
    }
    return entries;
};

const CODE_MIRROR_LANGUAGE_ENTRIES: CodeMirrorLanguageEntry[] = buildLanguageEntries();

export const getPlainTextLanguageLabel = (): string =>
    window.VditorI18n?.plaintext || "Plain Text";

const PLAIN_TEXT_LANGUAGE_TERMS = ["plain text", "plaintext", "plain", "text"];

export const toCodeBlockLanguageName = (displayName: string): string => {
    if (displayName === getPlainTextLanguageLabel() || displayName === "Plain Text") {
        return "";
    }
    return displayName;
};

const plainTextMatchesQuery = (query: string): boolean => {
    const lower = query.trim().toLowerCase();
    if (!lower) {
        return true;
    }
    const label = getPlainTextLanguageLabel().toLowerCase();
    if (label.includes(lower)) {
        return true;
    }
    for (const term of PLAIN_TEXT_LANGUAGE_TERMS) {
        if (term.includes(lower) || lower.includes(term)) {
            return true;
        }
    }
    return false;
};

export const buildCodeMirrorLanguageMap = (): Record<string, LanguageDescription> => {
    const map: Record<string, LanguageDescription> = {};
    for (const language of languages) {
        map[language.name.toLowerCase()] = language;
        for (const alias of language.alias) {
            map[alias.toLowerCase()] = language;
        }
        const extra = EXTRA_LANGUAGE_ALIASES[language.name];
        if (extra) {
            for (const alias of extra) {
                map[alias.toLowerCase()] = language;
            }
        }
    }
    return map;
};

const PINNED_CODE_MIRROR_LANGUAGES = [
    "Shell",
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "C",
    "C++",
    "C#",
    "Go",
    "Rust",
    "SQL",
    "HTML",
    "CSS",
    "JSON",
    "YAML",
    "Markdown",
    "PHP",
    "Ruby",
    "Kotlin",
    "Swift",
    "Vue",
    "XML",
    "SCSS",
];

const pinnedLanguageOrder = new Map(PINNED_CODE_MIRROR_LANGUAGES.map((name, index) => [name, index]));

const sortLanguageNamesWithPinnedFirst = (names: string[]) => {
    const remaining = new Set(names);
    const sorted: string[] = [];
    for (const pinned of PINNED_CODE_MIRROR_LANGUAGES) {
        if (remaining.has(pinned)) {
            sorted.push(pinned);
            remaining.delete(pinned);
        }
    }
    const rest = [...remaining].sort((a, b) => a.localeCompare(b, undefined, {sensitivity: "base"}));
    for (const name of rest) {
        sorted.push(name);
    }
    return sorted;
};

const sortHintDataWithPinnedFirst = (items: IHintData[]) => {
    return items.sort((a, b) => {
        const aPinned = pinnedLanguageOrder.get(a.value);
        const bPinned = pinnedLanguageOrder.get(b.value);
        if (aPinned !== undefined && bPinned !== undefined) {
            return aPinned - bPinned;
        }
        if (aPinned !== undefined) {
            return -1;
        }
        if (bPinned !== undefined) {
            return 1;
        }
        return a.value.localeCompare(b.value, undefined, {sensitivity: "base"});
    });
};

export const getAllCodeMirrorLanguageNames = (): string[] => {
    const names: string[] = [getPlainTextLanguageLabel()];
    for (const entry of CODE_MIRROR_LANGUAGE_ENTRIES) {
        names.push(entry.canonical);
    }
    return sortLanguageNamesWithPinnedFirst(names);
};

export const filterCodeMirrorLanguageNames = (query: string): string[] => {
    const lower = query.trim().toLowerCase();
    const all = getAllCodeMirrorLanguageNames();
    if (!lower) {
        return all;
    }
    const matched = new Set<string>();
    if (plainTextMatchesQuery(lower)) {
        matched.add(getPlainTextLanguageLabel());
    }
    for (const entry of CODE_MIRROR_LANGUAGE_ENTRIES) {
        for (const term of entry.terms) {
            if (term.toLowerCase().includes(lower)) {
                matched.add(entry.canonical);
                break;
            }
        }
    }
    return sortLanguageNamesWithPinnedFirst([...matched]);
};

export const matchCodeMirrorLanguages = (key: string): IHintData[] => {
    const matchLangData: IHintData[] = [];
    const lower = key.toLowerCase();
    if (plainTextMatchesQuery(lower)) {
        matchLangData.push({ html: getPlainTextLanguageLabel(), value: getPlainTextLanguageLabel() });
    }
    for (const entry of CODE_MIRROR_LANGUAGE_ENTRIES) {
        let matched = false;
        for (const term of entry.terms) {
            if (term.toLowerCase().indexOf(lower) > -1) {
                matched = true;
                break;
            }
        }
        if (matched) {
            matchLangData.push({ html: entry.canonical, value: entry.canonical });
        }
    }
    return sortHintDataWithPinnedFirst(matchLangData);
};

/** 脑图、mermaid 等特殊预览代码块的语言补全 */
export const matchPreviewCodeLanguages = (key: string): IHintData[] => {
    const matchLangData: IHintData[] = [];
    const lower = key.toLowerCase();
    for (const keyName of Constants.CODE_LANGUAGES) {
        if (keyName.indexOf(lower) > -1) {
            matchLangData.push({ html: keyName, value: keyName });
        }
    }
    return matchLangData;
};
