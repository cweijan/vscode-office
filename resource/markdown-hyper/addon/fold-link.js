// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold URL of links `[text](url)`
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("./fold"), require("./read-link"), require("../core")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","./fold","./read-link","../core"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.FoldLink = this.HyperMD.FoldLink || {}), HyperMD.Fold, HyperMD.ReadLink, HyperMD);
})(function (require, exports, fold_1, read_link_1, line_spans_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var DEBUG = false;
    exports.LinkFolder = function (stream, token) {
        var cm = stream.cm;
        // a valid beginning must be ...
        if (!(token.string === '[' && // the leading [
            token.state.linkText && // (double check) is link text
            !token.state.linkTitle && // (double check) not image's title
            !/\bimage\b/.test(token.type) // and is not a image mark
        ))
            return null;
        var spanExtractor = line_spans_1.getLineSpanExtractor(cm);
        var tmpSpans;
        // first, find the link text span
        var linkTextSpan = spanExtractor.findSpanWithTypeAt({ line: stream.lineNo, ch: token.start }, "linkText");
        if (!linkTextSpan)
            return null;
        // then find the link href span
        var linkHrefSpan = spanExtractor.findSpanWithTypeAt({ line: stream.lineNo, ch: linkTextSpan.end + 1 }, "linkHref");
        if (!linkHrefSpan)
            return null;
        // now compose the ranges
        var href_from = { line: stream.lineNo, ch: linkHrefSpan.begin };
        var href_to = { line: stream.lineNo, ch: linkHrefSpan.end };
        var link_from = { line: stream.lineNo, ch: linkTextSpan.begin };
        var link_to = href_to;
        // and check if the range is OK
        var rngReq = stream.requestRange(href_from, href_to, link_from, href_from);
        if (rngReq !== fold_1.RequestRangeResult.OK)
            return null;
        // everything is OK! make the widget
        var text = cm.getRange(href_from, href_to);
        var _a = read_link_1.splitLink(text.substr(1, text.length - 2)), url = _a.url, title = _a.title;
        var img = document.createElement("span");
        img.setAttribute("class", "hmd-link-icon");
        img.setAttribute("title", url + "\n" + title);
        img.setAttribute("data-url", url);
        var marker = cm.markText(href_from, href_to, {
            collapsed: true,
            replacedWith: img,
        });
        img.addEventListener('click', function () { return fold_1.breakMark(cm, marker); }, false);
        return marker;
    };
    fold_1.registerFolder("link", exports.LinkFolder, true);
});
