const DEFAULT_VDITOR_LANG = 'en_US'

/** @type {Map<string, string>} */
const VSCODE_TO_VDITOR = new Map([
    ['en', 'en_US'],
    ['zh-cn', 'zh_CN'],
    ['zh-tw', 'zh_TW'],
    ['ja', 'ja_JP'],
    ['ko', 'ko_KR'],
    ['ru', 'ru_RU'],
])

/**
 * @param {string | undefined} vscodeLanguage vscode.env.language
 * @returns {string}
 */
export function mapVscodeLanguageToVditorLang(vscodeLanguage) {
    if (!vscodeLanguage) {
        return DEFAULT_VDITOR_LANG
    }
    return VSCODE_TO_VDITOR.get(vscodeLanguage.toLowerCase()) ?? DEFAULT_VDITOR_LANG
}
