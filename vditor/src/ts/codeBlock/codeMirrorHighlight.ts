import {HighlightStyle, syntaxHighlighting} from "@codemirror/language";
import {tags as t} from "@lezer/highlight";

/** Stable cm-* classes for _codemirror.less syntax rules (ported from CM5 theme). */
export const vditorSyntaxHighlighting = syntaxHighlighting(HighlightStyle.define([
    {tag: t.comment, class: "cm-comment"},
    {tag: t.string, class: "cm-string"},
    {tag: t.keyword, class: "cm-keyword"},
    {tag: t.atom, class: "cm-atom"},
    {tag: t.number, class: "cm-number"},
    {tag: t.propertyName, class: "cm-property"},
    {tag: t.attributeName, class: "cm-attribute"},
    {tag: t.variableName, class: "cm-variable"},
    {tag: t.definition(t.variableName), class: "cm-def"},
    {tag: t.bracket, class: "cm-bracket"},
    {tag: t.tagName, class: "cm-tag"},
    {tag: t.link, class: "cm-link"},
    {tag: t.invalid, class: "cm-error"},
]));
