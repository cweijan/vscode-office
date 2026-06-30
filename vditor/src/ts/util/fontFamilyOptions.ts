import {isMacPlatform} from "./compatibility";

export type CodeFontFamilyOption = { label: string; value: string };

const DEFAULT_OPTION: CodeFontFamilyOption = {label: "Default", value: "inherit"};

const MAC_CODE_FONT_SYSTEM: CodeFontFamilyOption[] = [
    {label: "Monaco", value: "Monaco, Menlo, monospace"},
    {label: "Courier", value: "'Courier New', Courier, monospace"},
    {label: "Andale Mono", value: "'Andale Mono', Monaco, monospace"},
];

const WIN_CODE_FONT_SYSTEM: CodeFontFamilyOption[] = [
    {label: "Cascadia Code", value: "'Cascadia Code', 'Cascadia Mono', Consolas, monospace"},
    {label: "Consolas", value: "Consolas, 'Courier New', monospace"},
    {label: "Courier New", value: "'Courier New', Courier, monospace"},
];

/** Third-party fonts that may need separate installation; keep at most two, listed last. */
const EXTRA_CODE_FONT_OPTIONS: CodeFontFamilyOption[] = [
    {label: "JetBrains Mono", value: "'JetBrains Mono', monospace"},
    {label: "Fira Code", value: "'Fira Code', monospace"},
];

export const getCodeFontFamilyOptions = (): readonly CodeFontFamilyOption[] => {
    const system = isMacPlatform() ? MAC_CODE_FONT_SYSTEM : WIN_CODE_FONT_SYSTEM;
    return [DEFAULT_OPTION, ...system, ...EXTRA_CODE_FONT_OPTIONS];
};
