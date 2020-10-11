// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold Image Markers `![](xxx)`
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("./fold"), require("./read-link")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","./fold","./read-link"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.FoldImage = this.HyperMD.FoldImage || {}), HyperMD.Fold, HyperMD.ReadLink);
})(function (require, exports, fold_1, read_link_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var DEBUG = false;
    exports.ImageFolder = function (stream, token) {
        var cm = stream.cm;
        var imgRE = /\bimage-marker\b/;
        var urlRE = /\bformatting-link-string\b/; // matches the parentheses
        if (imgRE.test(token.type) && token.string === "!") {
            var lineNo = stream.lineNo;
            // find the begin and end of url part
            var url_begin = stream.findNext(urlRE);
            var url_end = stream.findNext(urlRE, url_begin.i_token + 1);
            var from = { line: lineNo, ch: token.start };
            var to = { line: lineNo, ch: url_end.token.end };
            var rngReq = stream.requestRange(from, to, from, from);
            if (rngReq === fold_1.RequestRangeResult.OK) {
                var url;
                var title;
                { // extract the URL
                    var rawurl = cm.getRange(// get the URL or footnote name in the parentheses
                    { line: lineNo, ch: url_begin.token.start + 1 }, { line: lineNo, ch: url_end.token.start });
                    if (url_end.token.string === "]") {
                        var tmp = cm.hmdReadLink(rawurl, lineNo);
                        if (!tmp)
                            return null; // Yup! bad URL?!
                        rawurl = tmp.content;
                    }
                    url = read_link_1.splitLink(rawurl).url;
                    url = cm.hmdResolveURL(url);
                }
                { // extract the title
                    title = cm.getRange({ line: lineNo, ch: from.ch + 2 }, { line: lineNo, ch: url_begin.token.start - 1 });
                }
                var img = document.createElement("img");
                var marker = cm.markText(from, to, {
                    clearOnEnter: true,
                    collapsed: true,
                    replacedWith: img,
                });
                img.addEventListener('load', function () {
                    img.classList.remove("hmd-image-loading");
                    marker.changed();
                }, false);
                img.addEventListener('error', function () {
                    img.classList.remove("hmd-image-loading");
                    img.classList.add("hmd-image-error");
                    marker.changed();
                }, false);
                img.addEventListener('click', function () { return fold_1.breakMark(cm, marker); }, false);
                img.className = "hmd-image hmd-image-loading";
                img.src = url;
                img.title = title;
                return marker;
            }
            else {
                if (DEBUG) {
                    console.log("[image]FAILED TO REQUEST RANGE: ", rngReq);
                }
            }
        }
        return null;
    };
    fold_1.registerFolder("image", exports.ImageFolder, true);
});
