import {highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, keymap} from "@codemirror/view";
import {EditorState} from "@codemirror/state";
import {indentOnInput, bracketMatching} from "@codemirror/language";
import {history, defaultKeymap, historyKeymap} from "@codemirror/commands";
import {highlightSelectionMatches, searchKeymap} from "@codemirror/search";
import {closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap} from "@codemirror/autocomplete";
import {lintKeymap} from "@codemirror/lint";
import {vditorSyntaxHighlighting} from "./codeMirrorHighlight";

/** basicSetup without defaultHighlightStyle — layout in _codemirror.less, colors via CSS variables / theme files */
export const vditorCodeMirrorSetup = [
    highlightSpecialChars(),
    history(),
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
        ...completionKeymap,
        ...lintKeymap,
    ]),
];
