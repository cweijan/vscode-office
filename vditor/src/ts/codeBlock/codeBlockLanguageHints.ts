import { languages } from "@codemirror/language-data";

import { Constants } from "../constants";

interface CodeMirrorLanguageEntry {
    canonical: string;
    terms: string[];
}

const CODE_MIRROR_LANGUAGE_ENTRIES: CodeMirrorLanguageEntry[] = languages.map((language) => ({
    canonical: language.name,
    terms: [language.name, ...language.alias],
}));

export const matchCodeMirrorLanguages = (key: string): IHintData[] => {
    const matchLangData: IHintData[] = [];
    const lower = key.toLowerCase();
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
    return matchLangData.sort((a, b) =>
        a.value.localeCompare(b.value, undefined, { sensitivity: "base" }),
    );
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
