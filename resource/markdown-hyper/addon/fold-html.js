// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold and render embedded HTML snippets
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("../core"), require("./fold"), require("./read-link")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","../core","./fold","./read-link"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.FoldHTML = this.HyperMD.FoldHTML || {}), CodeMirror, HyperMD, HyperMD.Fold);
})(function (require, exports, CodeMirror, core_1, fold_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultChecker = function (html) {
        // TODO: read https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
        if (/^<(?:br)/i.test(html))
            return false; // check first element...
        if (/<(?:script|style|link|meta)/i.test(html))
            return false; // don't allow some tags
        if (/\son\w+\s*=/i.test(html))
            return false; // don't allow `onclick=` etc.
        if (/src\s*=\s*["']?javascript:/i.test(html))
            return false; // don't allow `src="javascript:` etc.
        return true;
    };
    /**
     * Create HTMLElement from HTML string and do special process with HyperMD.ReadLink
     */
    exports.defaultRenderer = function (html, pos, cm) {
        var tagBegin = /^<(\w+)\s*/.exec(html);
        if (!tagBegin)
            return null;
        var tagName = tagBegin[1];
        var ans = document.createElement(tagName);
        var propRE = /([\w\:\-]+)(?:\s*=\s*((['"]).*?\3|\S+))?\s*/g;
        var propLastIndex = propRE.lastIndex = tagBegin[0].length;
        var tmp;
        while (tmp = propRE.exec(html)) {
            if (tmp.index > propLastIndex)
                break; // emmm
            var propName = tmp[1];
            var propValue = tmp[2]; // could be wrapped by " or '
            if (propValue && /^['"]/.test(propValue))
                propValue = propValue.slice(1, -1);
            ans.setAttribute(propName, propValue);
            propLastIndex = propRE.lastIndex;
        }
        if ('innerHTML' in ans) {
            // node may contain innerHTML
            var startCh = html.indexOf('>', propLastIndex) + 1;
            var endCh = html.length;
            if (tmp = new RegExp("</" + tagName + "\\s*>\\s*$", "i").exec(html)) {
                endCh = tmp.index;
            }
            var innerHTML = html.slice(startCh, endCh);
            if (innerHTML)
                ans.innerHTML = innerHTML;
            // resolve relative URLs and change default behavoirs
            core_1.visitElements([ans], function (el) {
                var tagName = el.tagName.toLowerCase();
                if (tagName === 'a') {
                    // for links, if target not set, add target="_blank"
                    if (!el.getAttribute("target"))
                        el.setAttribute("target", "_blank");
                }
                // Then, resovle relative URLs
                var urlAttrs = ({
                    a: ["href"],
                    img: ["src"],
                    iframe: ["src"],
                })[tagName];
                if (urlAttrs) {
                    for (var i = 0; i < urlAttrs.length; i++) {
                        var attr = urlAttrs[i];
                        var attrValue = el.getAttribute(attr);
                        if (attrValue)
                            el.setAttribute(attr, cm.hmdResolveURL(attrValue));
                    }
                }
            });
        }
        return ans;
    };
    /********************************************************************************** */
    var stubClass = "hmd-fold-html-stub";
    var stubClassOmittable = "hmd-fold-html-stub omittable";
    var stubClassHighlight = "hmd-fold-html-stub highlight";
    /********************************************************************************** */
    //#region Folder
    /**
     * Detect if a token is a beginning of HTML, and fold it!
     *
     * @see FolderFunc in ./fold.ts
     */
    exports.HTMLFolder = function (stream, token) {
        if (!token.type || !/ hmd-html-begin/.test(token.type))
            return null;
        var endInfo = stream.findNext(/ hmd-html-\w+/, true); // find next html start/end token
        if (!endInfo || !/ hmd-html-end/.test(endInfo.token.type) || / hmd-html-unclosed/.test(endInfo.token.type))
            return null;
        var cm = stream.cm;
        var from = { line: stream.lineNo, ch: token.start };
        var to = { line: endInfo.lineNo, ch: endInfo.token.end };
        var inlineMode = from.ch != 0 || to.ch < cm.getLine(to.line).length;
        // if (!inlineMode) {
        //   // if not inline mode, be greddy and eat following blank lines (except last line of editor)!
        //   let lastLine: number = cm.lastLine() - 1
        //   let allowCount: number = 1
        //   while (allowCount > 0 && to.line < lastLine) {
        //     let nextLine: string = cm.getLine(to.line + 1)
        //     if (!/^\s*$/.test(nextLine)) break
        //     to.line++
        //     to.ch = nextLine.length
        //     allowCount--
        //   }
        // }
        var addon = exports.getAddon(cm);
        var html = cm.getRange(from, to);
        if (!addon.checker(html, from, cm))
            return null; // security check
        // security check pass!
        var reqAns = stream.requestRange(from, to);
        if (reqAns !== fold_1.RequestRangeResult.OK)
            return null;
        // now we are ready to fold and render!
        var marker = addon.renderAndInsert(html, from, to, inlineMode);
        return marker;
    };
    //#endregion
    fold_1.registerFolder("html", exports.HTMLFolder, false);
    exports.defaultOption = {
        checker: exports.defaultChecker,
        renderer: exports.defaultRenderer,
        stubText: "<HTML>",
        isolatedTagName: /^(?:div|pre|form|table|iframe|ul|ol|input|textarea|p|summary|a)$/i,
    };
    exports.suggestedOption = {};
    core_1.suggestedEditorConfig.hmdFoldHTML = exports.suggestedOption;
    CodeMirror.defineOption("hmdFoldHTML", exports.defaultOption, function (cm, newVal) {
        ///// convert newVal's type to `Partial<Options>`, if it is not.
        if (!newVal) {
            newVal = {};
        }
        else if (typeof newVal == 'function') {
            newVal = { checker: newVal };
        }
        else if (typeof newVal != 'object') {
            console.warn('[HyperMD][FoldHTML] incorrect option value type');
            newVal = {};
        }
        ///// apply config and write new values into cm
        var inst = exports.getAddon(cm);
        for (var k in exports.defaultOption) {
            inst[k] = (k in newVal) ? newVal[k] : exports.defaultOption[k];
        }
        ///// Type Check
        if (inst.isolatedTagName && !(inst.isolatedTagName instanceof RegExp)) {
            console.error("[HyperMD][FoldHTML] option isolatedTagName only accepts RegExp");
            inst.isolatedTagName = exports.defaultOption.isolatedTagName;
        }
    });
    //#endregion
    /********************************************************************************** */
    //#region Addon Class
    var FoldHTML = /** @class */ (function () {
        function FoldHTML(cm) {
            this.cm = cm;
            // options will be initialized to defaultOption when constructor is finished
        }
        /**
         * Render HTML, insert into editor and return the marker
         */
        FoldHTML.prototype.renderAndInsert = function (html, from, to, inlineMode) {
            var cm = this.cm;
            var stub = this.makeStub();
            var el = this.renderer(html, from, cm);
            var breakFn = function () { return fold_1.breakMark(cm, marker); };
            if (!el)
                return null;
            stub.addEventListener("click", breakFn, false);
            if (!el.tagName.match(this.isolatedTagName || /^$/))
                el.addEventListener("click", breakFn, false);
            var replacedWith;
            var marker;
            if (inlineMode) {
                /** put HTML inline */
                var span = document.createElement("span");
                span.setAttribute("class", "hmd-fold-html");
                span.setAttribute("style", "display: inline-block");
                span.appendChild(stub);
                span.appendChild(el);
                replacedWith = span;
                /** If element size changed, we notify CodeMirror */
                var watcher = core_1.watchSize(el, function (w, h) {
                    var computedStyle = getComputedStyle(el);
                    var getStyle = function (name) { return computedStyle.getPropertyValue(name); };
                    var floating = w < 10 || h < 10 ||
                        !/^relative|static$/i.test(getStyle('position')) ||
                        !/^none$/i.test(getStyle('float'));
                    if (!floating)
                        stub.className = stubClassOmittable;
                    else
                        stub.className = stubClass;
                    marker.changed();
                });
                watcher.check(); // trig the checker once
                // Marker is not created yet. Bind events later
                setTimeout(function () {
                    marker.on("clear", function () {
                        watcher.stop();
                    });
                }, 0);
            }
            else {
                /** use lineWidget to insert element */
                replacedWith = stub;
                var lineWidget_1 = cm.addLineWidget(to.line, el, {
                    above: false,
                    coverGutter: false,
                    noHScroll: false,
                    showIfHidden: false,
                });
                var highlightON_1 = function () { return stub.className = stubClassHighlight; };
                var highlightOFF_1 = function () { return stub.className = stubClass; };
                el.addEventListener("mouseenter", highlightON_1, false);
                el.addEventListener("mouseleave", highlightOFF_1, false);
                var watcher = core_1.watchSize(el, function () { return lineWidget_1.changed(); });
                watcher.check();
                // Marker is not created yet. Bind events later
                setTimeout(function () {
                    marker.on("clear", function () {
                        watcher.stop();
                        lineWidget_1.clear();
                        el.removeEventListener("mouseenter", highlightON_1, false);
                        el.removeEventListener("mouseleave", highlightOFF_1, false);
                    });
                }, 0);
            }
            marker = cm.markText(from, to, {
                replacedWith: replacedWith,
            });
            return marker;
        };
        FoldHTML.prototype.makeStub = function () {
            var ans = document.createElement('span');
            ans.setAttribute("class", stubClass);
            ans.textContent = this.stubText || '<HTML>';
            return ans;
        };
        return FoldHTML;
    }());
    exports.FoldHTML = FoldHTML;
    //#endregion
    /** ADDON GETTER (Singleton Pattern): a editor can have only one FoldHTML instance */
    exports.getAddon = core_1.Addon.Getter("FoldHTML", FoldHTML, exports.defaultOption /** if has options */);
});
