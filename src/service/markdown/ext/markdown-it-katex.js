/* Process inline math */
/*
Like markdown-it-simplemath, this is a stripped down, simplified version of:
https://github.com/runarberg/markdown-it-math

It differs in that it takes (a subset of) LaTeX as input and relies on KaTeX
for rendering output.
*/

/*jslint node: true */
'use strict';

function math_inline(state, silent) {
    var start, match, token, pos, openMarker, closeMarker, markerLength,
        slashCount;

    if (state.src[state.pos] === "$") {
        openMarker = "$";
        closeMarker = "$";
        markerLength = 1;
    } else if (state.src.slice(state.pos, state.pos + 2) === "\\(") {
        slashCount = 1;
        pos = state.pos - 1;
        while (pos >= 0 && state.src[pos] === "\\") {
            slashCount += 1;
            pos -= 1;
        }
        if (slashCount % 2 === 0) { return false; }
        openMarker = "\\(";
        closeMarker = "\\)";
        markerLength = 2;
    } else {
        return false;
    }

    // First check for and bypass all properly escaped delimieters
    // This loop will assume that the first leading backtick can not
    // be the first character in state.src, which is known since
    // we have found an opening delimieter already.
    start = state.pos + markerLength;
    match = start;
    while ((match = state.src.indexOf(closeMarker, match)) !== -1) {
        if (closeMarker === "$") {
            // Found potential $, look for escapes, pos will point to
            // first non escape when complete
            pos = match - 1;
            while (state.src[pos] === "\\") { pos -= 1; }
            // Even number of escapes, potential closing delimiter found
            if (((match - pos) % 2) == 1) { break; }
        } else {
            // \) 的分隔反斜杠必须是连续反斜杠中的奇数位。
            pos = match;
            while (state.src[pos] === "\\") { pos -= 1; }
            if (((match - pos) % 2) == 1) { break; }
        }
        match += markerLength;
    }

    // No closing delimter found. Consume the opener and continue.
    if (match === -1) {
        if (!silent) { state.pending += openMarker; }
        state.pos = start;
        return true;
    }

    // Empty content is not parsed.
    if (match - start === 0) {
        if (!silent) { state.pending += openMarker + closeMarker; }
        state.pos = match + markerLength;
        return true;
    }

    if (!silent) {
        token = state.push('math_inline', 'math', 0);
        token.markup = openMarker;
        token.content = state.src.slice(start, match);
    }

    state.pos = match + markerLength;
    return true;
}

function math_block(state, start, end, silent) {
    var firstLine, lastLine, next, lastPos, found = false, token,
        pos = state.bMarks[start] + state.tShift[start],
        max = state.eMarks[start],
        openMarker = state.src.slice(pos, pos + 2),
        closeMarker = openMarker === '\\[' ? '\\]' : '$$';

    if (pos + 2 > max) { return false; }
    if (openMarker !== '$$' && openMarker !== '\\[') { return false; }

    pos += 2;
    firstLine = state.src.slice(pos, max);

    if (silent) { return true; }
    if (isBlockClose(firstLine, closeMarker)) {
        // Single line expression
        firstLine = firstLine.trim().slice(0, -2);
        found = true;
    }

    for (next = start; !found;) {

        next++;

        if (next >= end) { break; }

        pos = state.bMarks[next] + state.tShift[next];
        max = state.eMarks[next];

        if (pos < max && state.tShift[next] < state.blkIndent) {
            // non-empty line with negative indent should stop the list:
            break;
        }

        if (isBlockClose(state.src.slice(pos, max), closeMarker)) {
            lastPos = state.src.slice(0, max).lastIndexOf(closeMarker);
            lastLine = state.src.slice(pos, lastPos);
            found = true;
        }

    }

    state.line = next + 1;

    token = state.push('math_block', 'math', 0);
    token.block = true;
    token.content = (firstLine && firstLine.trim() ? firstLine + '\n' : '')
        + state.getLines(start + 1, next, state.tShift[start], true)
        + (lastLine && lastLine.trim() ? lastLine : '');
    token.map = [start, state.line];
    token.markup = openMarker;
    return true;
}

function isBlockClose(line, marker) {
    var trimmed = line.trim(), markerPos, slashCount;
    if (trimmed.slice(-2) !== marker) { return false; }
    if (marker === '$$') { return true; }

    markerPos = trimmed.length - 2;
    slashCount = 0;
    while (markerPos - slashCount >= 0 &&
        trimmed[markerPos - slashCount] === "\\") {
        slashCount += 1;
    }
    return slashCount % 2 === 1;
}

module.exports = function math_plugin(md, options) {
    var katex = require('katex');
    // Default options

    options = { throwOnError: false, strict: false };

    // set KaTeX as the renderer for markdown-it-simplemath
    var katexInline = function (latex) {
        options.displayMode = false;
        try {
            return katex.renderToString(latex, options);
        }
        catch (error) {
            if (options.throwOnError) { console.log(error); }
            return latex;
        }
    };

    var inlineRenderer = function (tokens, idx) {
        return katexInline(tokens[idx].content);
    };

    var katexBlock = function (latex) {
        options.displayMode = true;
        try {
            return "<p>" + katex.renderToString(latex, options) + "</p>";
        }
        catch (error) {
            if (options.throwOnError) { console.log(error); }
            return latex;
        }
    }

    var blockRenderer = function (tokens, idx) {
        return katexBlock(tokens[idx].content) + '\n';
    }

    md.inline.ruler.before('escape', 'math_inline', math_inline);
    md.block.ruler.after('blockquote', 'math_block', math_block, {
        alt: ['paragraph', 'reference', 'blockquote', 'list']
    });
    md.renderer.rules.math_inline = inlineRenderer;
    md.renderer.rules.math_block = blockRenderer;
};
