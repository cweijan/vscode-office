import { defaultKeymap, history, historyKeymap, indentLess, indentMore, indentWithTab } from '@codemirror/commands';
import { xml } from '@codemirror/lang-xml';
import { Compartment, EditorState } from '@codemirror/state';
import {
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers,
} from '@codemirror/view';
import { useEffect, useRef } from 'react';
import { svgEditorTheme, svgSyntaxHighlighting } from './svgCodeMirrorTheme';

interface SvgCodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    lineWrap?: boolean;
}

function handleTabKey(event: KeyboardEvent, view: EditorView): boolean {
    if (event.key !== 'Tab') return false;
    event.preventDefault();
    event.stopPropagation();
    const command = event.shiftKey ? indentLess : indentMore;
    return command(view);
}

export default function SvgCodeEditor({ value, onChange, lineWrap = false }: SvgCodeEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const lineWrapCompartmentRef = useRef(new Compartment());
    const lineWrapRef = useRef(lineWrap);

    onChangeRef.current = onChange;
    lineWrapRef.current = lineWrap;

    useEffect(() => {
        if (!containerRef.current) return;

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                onChangeRef.current(update.state.doc.toString());
            }
        });

        const state = EditorState.create({
            doc: value,
            extensions: [
                EditorState.tabSize.of(2),
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightActiveLine(),
                history(),
                EditorView.domEventHandlers({
                    keydown: handleTabKey,
                }),
                keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
                xml(),
                svgEditorTheme,
                svgSyntaxHighlighting,
                lineWrapCompartmentRef.current.of(lineWrapRef.current ? EditorView.lineWrapping : []),
                updateListener,
            ],
        });

        const view = new EditorView({ state, parent: containerRef.current });
        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, []);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;

        view.dispatch({
            effects: lineWrapCompartmentRef.current.reconfigure(lineWrap ? EditorView.lineWrapping : []),
        });
    }, [lineWrap]);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;

        const current = view.state.doc.toString();
        if (value === current) return;

        view.dispatch({
            changes: { from: 0, to: current.length, insert: value },
        });
    }, [value]);

    return <div className="svg-viewer__codemirror" ref={containerRef} />;
}
