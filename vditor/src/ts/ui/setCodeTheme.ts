import {Constants} from "../constants";

/** Reserved for CodeMirror theme switching; currently stores selection only. */
export const setCodeTheme = (codeTheme: string) => {
    if (!Constants.CODE_THEME.includes(codeTheme)) {
        return;
    }
    // TODO: apply CodeMirror theme to editor and preview code blocks
};
