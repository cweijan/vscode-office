import {languages} from "@codemirror/language-data";

import {Constants} from "../constants";

const CODE_MIRROR_LANGUAGES: string[] = (() => {
    const names = new Set<string>();
    for (const language of languages) {
        names.add(language.name);
        for (const alias of language.alias) {
            names.add(alias);
        }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, {sensitivity: "base"}));
})();

export const matchCodeMirrorLanguages = (key: string): IHintData[] => {
    const matchLangData: IHintData[] = [];
    const lower = key.toLowerCase();
    for (const langName of CODE_MIRROR_LANGUAGES) {
        if (langName.toLowerCase().indexOf(lower) > -1) {
            matchLangData.push({html: langName, value: langName});
        }
    }
    return matchLangData;
};

/** 脑图、mermaid 等特殊预览代码块的语言补全 */
export const matchPreviewCodeLanguages = (key: string): IHintData[] => {
    const matchLangData: IHintData[] = [];
    const lower = key.toLowerCase();
    for (const keyName of Constants.CODE_LANGUAGES) {
        if (keyName.indexOf(lower) > -1) {
            matchLangData.push({html: keyName, value: keyName});
        }
    }
    return matchLangData;
};
