import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import { mermaid } from "codemirror-lang-mermaid";

import { buildCodeMirrorLanguageMap } from "./codeBlockLanguageHints";

const languageMap = buildCodeMirrorLanguageMap();

/** DOM / Lute 语言名 → CodeMirror 高亮语言名 */
const HIGHLIGHT_LANGUAGE_ALIASES: Record<string, string> = {
    math: "latex",
};

const PLANTUML_KEYWORDS =
    "abstract|actor|alt|as|autonumber|boundary|box|class|component|create|deactivate|destroy"
    + "|else|endif|end|entity|enum|folder|fork|group|header|hide|if|interface|legend|loop"
    + "|namespace|node|note|opt|package|participant|person|rectangle|ref|repeat|return"
    + "|skinparam|split|start|state|title|together|usecase|while";

let mermaidLanguageSupport: LanguageSupport | undefined;

const getMermaidLanguageSupport = () => {
    if (!mermaidLanguageSupport) {
        mermaidLanguageSupport = mermaid();
    }
    return mermaidLanguageSupport;
};

/** StreamLanguage.token 须返回字符串标签名，不能返回 @lezer/highlight 的 Tag 对象 */
const plantumlLanguage = StreamLanguage.define({
    name: "plantuml",
    startState: () => ({}),
    token(stream) {
        if (stream.eatSpace()) {
            return null;
        }
        if (stream.match(/^@[\w-]+/)) {
            return "annotation";
        }
        if (stream.match(/^#[0-9a-fA-F]{3,8}\b/)) {
            return "number";
        }
        if (stream.match(/^"(?:[^"\\]|\\.)*"/)) {
            return "string";
        }
        if (stream.match(/^'[^'\n]*/)) {
            return "comment";
        }
        if (stream.match(/^\/\/.*/)) {
            return "comment";
        }
        if (stream.match(/^\/\*(?:[^*]|\*(?!\/))*\*\//)) {
            return "comment";
        }
        if (stream.match(/^(?:<[<]?--?[>]?|--?[>]?>|<-->|<->|\.{2,}>|==?)/)) {
            return "operator";
        }
        if (stream.match(new RegExp(`^(?:${PLANTUML_KEYWORDS})\\b`, "i"))) {
            return "keyword";
        }
        stream.next();
        return null;
    },
});

const plantumlLanguageSupport = new LanguageSupport(plantumlLanguage);

const STATIC_LANGUAGE_SUPPORTS: Record<string, () => LanguageSupport> = {
    mermaid: getMermaidLanguageSupport,
    plantuml: () => plantumlLanguageSupport,
};

export const resolveCodeMirrorHighlightLanguage = (languageName: string): string => {
    const lower = languageName.trim().toLowerCase();
    return HIGHLIGHT_LANGUAGE_ALIASES[lower] ?? lower;
};

export const loadCodeMirrorHighlightLanguage = (
    languageName: string,
): Promise<LanguageSupport | undefined> => {
    const resolved = resolveCodeMirrorHighlightLanguage(languageName);
    const staticSupport = STATIC_LANGUAGE_SUPPORTS[resolved];
    if (staticSupport) {
        return Promise.resolve(staticSupport());
    }
    const language = languageMap[resolved];
    if (!language) {
        return Promise.resolve(undefined);
    }
    if (language.support) {
        return Promise.resolve(language.support);
    }
    return language.load();
};
