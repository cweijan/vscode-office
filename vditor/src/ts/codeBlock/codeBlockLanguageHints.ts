import {LanguageDescription} from "@codemirror/language";
import { languages } from "@codemirror/language-data";

import { Constants } from "../constants";

interface CodeMirrorLanguageEntry {
    canonical: string;
    terms: string[];
}

type LanguageHintData = IHintData & {
    current?: boolean;
};

/** 在 @codemirror/language-data 之外补充的语言别名 */
const EXTRA_LANGUAGE_ALIASES: Record<string, string[]> = {
    Shell: ["bash", "sh", "zsh", "shell", "shellscript", "console", "terminal"],
};

const COMMON_CODE_MIRROR_LANGUAGES = new Set([
    "Angular Template",
    "C",
    "C++",
    "C#",
    "Clojure",
    "CMake",
    "CoffeeScript",
    "CSS",
    "Dart",
    "diff",
    "Dockerfile",
    "Erlang",
    "F#",
    "Go",
    "Groovy",
    "Haskell",
    "HTML",
    "HTTP",
    "Java",
    "JavaScript",
    "Jinja",
    "JSON",
    "JSON-LD",
    "JSX",
    "Kotlin",
    "LaTeX",
    "LESS",
    "Lua",
    "Markdown",
    "MariaDB SQL",
    "MS SQL",
    "MySQL",
    "Nginx",
    "Objective-C",
    "Objective-C++",
    "Perl",
    "PHP",
    "PLSQL",
    "PostgreSQL",
    "PowerShell",
    "Properties files",
    "ProtoBuf",
    "Python",
    "R",
    "Ruby",
    "Rust",
    "Sass",
    "Scala",
    "SCSS",
    "Shell",
    "SQL",
    "SQLite",
    "Swift",
    "TOML",
    "TSX",
    "TypeScript",
    "VB.NET",
    "Verilog",
    "Vue",
    "WebAssembly",
    "XML",
    "YAML",
]);

const codeMirrorLanguages = languages.filter((language) => COMMON_CODE_MIRROR_LANGUAGES.has(language.name));

const buildLanguageEntries = (): CodeMirrorLanguageEntry[] => {
    const entries: CodeMirrorLanguageEntry[] = [];
    for (const language of codeMirrorLanguages) {
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

export const resolveCodeMirrorLanguageName = (languageName: string): string => {
    const normalized = toCodeBlockLanguageName(languageName.trim());
    if (!normalized) {
        return "";
    }
    const lower = normalized.toLowerCase();
    for (const entry of CODE_MIRROR_LANGUAGE_ENTRIES) {
        if (entry.canonical.toLowerCase() === lower) {
            return entry.canonical;
        }
        for (const term of entry.terms) {
            if (term.toLowerCase() === lower) {
                return entry.canonical;
            }
        }
    }
    return normalized;
};

export const isSameCodeMirrorLanguage = (languageName: string, candidateName: string): boolean =>
    resolveCodeMirrorLanguageName(languageName).toLowerCase() ===
    resolveCodeMirrorLanguageName(candidateName).toLowerCase();

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
    for (const language of codeMirrorLanguages) {
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

export const matchCodeMirrorLanguages = (key: string, currentLanguage = ""): IHintData[] => {
    const matchLangData: LanguageHintData[] = [];
    const lower = key.toLowerCase();
    const addLanguage = (html: string, value: string) => {
        matchLangData.push({
            html,
            value,
            current: isSameCodeMirrorLanguage(currentLanguage, value),
        });
    };
    if (plainTextMatchesQuery(lower)) {
        addLanguage(getPlainTextLanguageLabel(), getPlainTextLanguageLabel());
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
            addLanguage(entry.canonical, entry.canonical);
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
