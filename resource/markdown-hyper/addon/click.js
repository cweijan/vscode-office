// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Click to open links / jump to footnotes / toggle TODOs, and more.
//
// With custom ClickHandler supported
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("../core"), require("./read-link")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","../core","./read-link"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.Click = this.HyperMD.Click || {}), CodeMirror, HyperMD, HyperMD.ReadLink);
})(function (require, exports, CodeMirror, core_1, read_link_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //#endregion
    /********************************************************************************** */
    //#region defaultClickHandler
    exports.defaultClickHandler = function (info, cm) {
        var text = info.text, type = info.type, url = info.url, pos = info.pos;
        if (type === 'url' || type === 'link') {
            var footnoteRef = text.match(/\[[^\[\]]+\](?:\[\])?$/); // bare link, footref or [foot][] . assume no escaping char inside
            if (footnoteRef && info.altKey) {
                // extract footnote part (with square brackets), then jump to the footnote
                text = footnoteRef[0];
                if (text.slice(-2) === '[]')
                    text = text.slice(0, -2); // remove [] of [foot][]
                type = "footref";
            }
            else if ((info.ctrlKey || info.altKey) && url) {
                // just open URL
                window.open(url, "_blank");
            }
        }
        if (type === 'todo') {
            var _a = core_1.expandRange(cm, pos, "formatting-task"), from = _a.from, to = _a.to;
            var text_1 = cm.getRange(from, to);
            text_1 = (text_1 === '[ ]') ? '[x]' : '[ ]';
            cm.replaceRange(text_1, from, to);
        }
        if (type === 'footref' && (info.ctrlKey || info.altKey)) {
            // Jump to FootNote
            var footnote_name = text.slice(1, -1);
            var footnote = cm.hmdReadLink(footnote_name, pos.line);
            if (footnote) {
                makeBackButton(cm, footnote.line, pos);
                cm.setCursor({ line: footnote.line, ch: 0 });
            }
        }
    };
    /**
     * Display a "go back" button. Requires "HyperMD-goback" gutter set.
     *
     * maybe not useful?
     *
     * @param line where to place the button
     * @param anchor when user click the back button, jumps to here
     */
    var makeBackButton = (function () {
        var bookmark = null;
        function updateBookmark(cm, pos) {
            if (bookmark) {
                cm.clearGutter("HyperMD-goback");
                bookmark.clear();
            }
            bookmark = cm.setBookmark(pos);
        }
        /**
         * Make a button, bind event handlers, but not insert the button
         */
        function makeButton(cm) {
            var hasBackButton = cm.options.gutters.indexOf("HyperMD-goback") != -1;
            if (!hasBackButton)
                return null;
            var backButton = document.createElement("div");
            backButton.className = "HyperMD-goback-button";
            backButton.addEventListener("click", function () {
                cm.setCursor(bookmark.find());
                cm.clearGutter("HyperMD-goback");
                bookmark.clear();
                bookmark = null;
            });
            var _tmp1 = cm.display.gutters.children;
            _tmp1 = _tmp1[_tmp1.length - 1];
            _tmp1 = _tmp1.offsetLeft + _tmp1.offsetWidth;
            backButton.style.width = _tmp1 + "px";
            backButton.style.marginLeft = -_tmp1 + "px";
            return backButton;
        }
        return function (cm, line, anchor) {
            var backButton = makeButton(cm);
            if (!backButton)
                return;
            backButton.innerHTML = (anchor.line + 1) + "";
            updateBookmark(cm, anchor);
            cm.setGutterMarker(line, "HyperMD-goback", backButton);
        };
    })();
    exports.defaultOption = {
        enabled: false,
        handler: null,
    };
    exports.suggestedOption = {
        enabled: true,
    };
    core_1.suggestedEditorConfig.hmdClick = exports.suggestedOption;
    CodeMirror.defineOption("hmdClick", exports.defaultOption, function (cm, newVal) {
        ///// convert newVal's type to `Partial<Options>`, if it is not.
        if (!newVal || typeof newVal === "boolean") {
            newVal = { enabled: !!newVal };
        }
        else if (typeof newVal === "function") {
            newVal = { enabled: true, handler: newVal };
        }
        ///// apply config and write new values into cm
        var inst = exports.getAddon(cm);
        for (var k in exports.defaultOption) {
            inst[k] = (k in newVal) ? newVal[k] : exports.defaultOption[k];
        }
    });
    //#endregion
    /********************************************************************************** */
    //#region Addon Class
    var Click = /** @class */ (function () {
        function Click(cm) {
            var _this = this;
            this.cm = cm;
            /** remove modifier className to editor DOM */
            this._mouseMove_keyDetect = function (ev) {
                var el = _this.el;
                var className = el.className, newClassName = className;
                var altClass = "HyperMD-with-alt";
                var ctrlClass = "HyperMD-with-ctrl";
                if (!ev.altKey && className.indexOf(altClass) >= 0) {
                    newClassName = className.replace(altClass, "");
                }
                if (!ev.ctrlKey && className.indexOf(ctrlClass) >= 0) {
                    newClassName = className.replace(ctrlClass, "");
                }
                if (!ev.altKey && !ev.ctrlKey) {
                    _this._KeyDetectorActive = false;
                    el.removeEventListener('mousemove', _this._mouseMove_keyDetect, false);
                }
                if (className != newClassName)
                    el.className = newClassName.trim();
            };
            /** add modifier className to editor DOM */
            this._keyDown = function (ev) {
                var kc = ev.keyCode || ev.which;
                var className = "";
                if (kc == 17)
                    className = "HyperMD-with-ctrl";
                if (kc == 18)
                    className = "HyperMD-with-alt";
                var el = _this.el;
                if (className && el.className.indexOf(className) == -1) {
                    el.className += " " + className;
                }
                if (!_this._KeyDetectorActive) {
                    _this._KeyDetectorActive = true;
                    _this.el.addEventListener('mousemove', _this._mouseMove_keyDetect, false);
                }
            };
            /**
             * Unbind _mouseUp, then call ClickHandler if mouse not bounce
             */
            this._mouseUp = function (ev) {
                var cinfo = _this._cinfo;
                _this.lineDiv.removeEventListener("mouseup", _this._mouseUp, false);
                if (Math.abs(ev.clientX - cinfo.clientX) > 5 || Math.abs(ev.clientY - cinfo.clientY) > 5)
                    return;
                if (typeof _this.handler === 'function' && _this.handler(cinfo, _this.cm) === false)
                    return;
                exports.defaultClickHandler(cinfo, _this.cm);
            };
            /**
             * Try to construct ClickInfo and bind _mouseUp
             */
            this._mouseDown = function (ev) {
                var button = ev.button, clientX = ev.clientX, clientY = ev.clientY, ctrlKey = ev.ctrlKey, altKey = ev.altKey, shiftKey = ev.shiftKey;
                var cm = _this.cm;
                if (ev.target.tagName === "PRE")
                    return;
                var pos = cm.coordsChar({ left: clientX, top: clientY }, "window");
                var range;
                var token = cm.getTokenAt(pos);
                var state = token.state;
                var styles = " " + token.type + " ";
                var mat;
                var type = null;
                var text, url;
                if (mat = styles.match(/\s(image|link|url)\s/)) {
                    // Could be a image, link, bare-link, footref, footnote, plain url, plain url w/o angle brackets
                    type = mat[1];
                    var isBareLink = /\shmd-barelink\s/.test(styles);
                    if (state.linkText) {
                        // click on content of a link text.
                        range = core_1.expandRange(cm, pos, function (token) { return token.state.linkText || /(?:\s|^)link(?:\s|$)/.test(token.type); });
                        type = "link";
                    }
                    else {
                        range = core_1.expandRange(cm, pos, type);
                    }
                    if (/^(?:image|link)$/.test(type) && !isBareLink) {
                        // CodeMirror breaks [text] and (url)
                        // Let HyperMD mode handle it!
                        var tmp_range = core_1.expandRange(cm, { line: pos.line, ch: range.to.ch + 1 }, "url");
                        if (tmp_range)
                            range.to = tmp_range.to;
                    }
                    text = cm.getRange(range.from, range.to).trim();
                    // now extract the URL. boring job
                    var tmp = void 0;
                    if (text.slice(-1) === ')' &&
                        (tmp = text.lastIndexOf('](')) !== -1 // xxxx](url)     image / link without ref
                    ) {
                        // remove title part (if exists)
                        url = read_link_1.splitLink(text.slice(tmp + 2, -1)).url;
                    }
                    else if ((mat = text.match(/[^\\]\]\s?\[([^\]]+)\]$/)) || // .][ref]     image / link with ref
                        (mat = text.match(/^\[(.+)\]\s?\[\]$/)) || // [ref][]
                        (mat = text.match(/^\[(.+)\](?:\:\s*)?$/)) // [barelink] or [^ref] or [footnote]:
                    ) {
                        if (isBareLink && mat[1].charAt(0) === '^')
                            type = 'footref';
                        var t2 = cm.hmdReadLink(mat[1], pos.line);
                        if (!t2)
                            url = null;
                        else {
                            // remove title part (if exists)
                            url = read_link_1.splitLink(t2.content).url;
                        }
                    }
                    else if ((mat = text.match(/^\<(.+)\>$/)) || // <http://laobubu.net>
                        (mat = text.match(/^\((.+)\)$/)) || // (http://laobubu.net)
                        (mat = [null, text]) // http://laobubu.net    last possibility: plain url w/o < >
                    ) {
                        url = mat[1];
                    }
                    url = cm.hmdResolveURL(url);
                }
                else if (styles.match(/\sformatting-task\s/)) {
                    // TO-DO checkbox
                    type = "todo";
                    range = core_1.expandRange(cm, pos, "formatting-task");
                    range.to.ch = cm.getLine(pos.line).length;
                    text = cm.getRange(range.from, range.to);
                    url = null;
                }
                else if (styles.match(/\shashtag/)) {
                    type = "hashtag";
                    range = core_1.expandRange(cm, pos, "hashtag");
                    text = cm.getRange(range.from, range.to);
                    url = null;
                }
                if (type !== null) {
                    _this._cinfo = {
                        type: type, text: text, url: url, pos: pos,
                        button: button, clientX: clientX, clientY: clientY,
                        ctrlKey: ctrlKey, altKey: altKey, shiftKey: shiftKey,
                    };
                    _this.lineDiv.addEventListener('mouseup', _this._mouseUp, false);
                }
            };
            this.lineDiv = cm.display.lineDiv;
            var el = this.el = cm.getWrapperElement();
            new core_1.FlipFlop(
            /* ON  */ function () {
                _this.lineDiv.addEventListener("mousedown", _this._mouseDown, false);
                el.addEventListener("keydown", _this._keyDown, false);
            }, 
            /* OFF */ function () {
                _this.lineDiv.removeEventListener("mousedown", _this._mouseDown, false);
                el.removeEventListener("keydown", _this._keyDown, false);
            }).bind(this, "enabled", true);
        }
        return Click;
    }());
    exports.Click = Click;
    //#endregion
    /** ADDON GETTER (Singleton Pattern): a editor can have only one Click instance */
    exports.getAddon = core_1.Addon.Getter("Click", Click, exports.defaultOption /** if has options */);
});
