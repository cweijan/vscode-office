import {lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, keymap} from "@codemirror/view";
import {EditorState} from "@codemirror/state";
import {foldGutter, indentOnInput, bracketMatching, foldKeymap} from "@codemirror/language";
import {history, defaultKeymap, historyKeymap} from "@codemirror/commands";
import {highlightSelectionMatches, searchKeymap} from "@codemirror/search";
import {closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap} from "@codemirror/autocomplete";
import {lintKeymap} from "@codemirror/lint";
import {vditorSyntaxHighlighting} from "./codeMirrorHighlight";
import {vditorEditorTheme} from "./codeMirrorTheme";

/** basicSetup without defaultHighlightStyle — syntax colors come from css/codemirror.css */
export const vditorCodeMirrorSetup = [
    vditorEditorTheme,
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    EditorState.tabSize.of(4),
    indentOnInput(),
    vditorSyntaxHighlighting,
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
    ]),
];
