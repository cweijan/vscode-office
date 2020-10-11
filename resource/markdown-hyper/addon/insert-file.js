// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Insert images or files into Editor by pasting (Ctrl+V) or Drag'n'Drop
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("../core")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","../core"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.InsertFile = this.HyperMD.InsertFile || {}), CodeMirror, HyperMD);
})(function (require, exports, CodeMirror, core_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * send data to url
     *
     * @param method default: "POST"
     */
    function ajaxUpload(url, form, callback, method) {
        var xhr = new XMLHttpRequest();
        var formData = new FormData();
        for (var name in form)
            formData.append(name, form[name]);
        xhr.onreadystatechange = function () {
            if (4 == this.readyState) {
                var ret = xhr.responseText;
                try {
                    ret = JSON.parse(xhr.responseText);
                }
                catch (err) { }
                if (/^20\d/.test(xhr.status + "")) {
                    callback(ret, null);
                }
                else {
                    callback(null, ret);
                }
            }
        };
        xhr.open(method || 'POST', url, true);
        // xhr.setRequestHeader("Content-Type", "multipart/form-data");
        xhr.send(formData);
    }
    exports.ajaxUpload = ajaxUpload;
    exports.defaultOption = {
        byDrop: false,
        byPaste: false,
        fileHandler: null,
    };
    exports.suggestedOption = {
        byPaste: true,
        byDrop: true,
    };
    core_1.suggestedEditorConfig.hmdInsertFile = exports.suggestedOption;
    CodeMirror.defineOption("hmdInsertFile", exports.defaultOption, function (cm, newVal) {
        ///// convert newVal's type to `Partial<Options>`, if it is not.
        if (!newVal || typeof newVal === "boolean") {
            var enabled = !!newVal;
            newVal = { byDrop: enabled, byPaste: enabled };
        }
        else if (typeof newVal === 'function') {
            newVal = { byDrop: true, byPaste: true, fileHandler: newVal };
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
    var InsertFile = /** @class */ (function () {
        function InsertFile(cm) {
            // options will be initialized to defaultOption when constructor is finished
            var _this = this;
            this.cm = cm;
            this.pasteHandle = function (cm, ev) {
                if (!_this.doInsert(ev.clipboardData || window['clipboardData'], true))
                    return;
                ev.preventDefault();
            };
            this.dropHandle = function (cm, ev) {
                var self = _this, cm = _this.cm, result = false;
                cm.operation(function () {
                    var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY }, "window");
                    cm.setCursor(pos);
                    result = self.doInsert(ev.dataTransfer, false);
                });
                if (!result)
                    return;
                ev.preventDefault();
            };
            new core_1.FlipFlop(
            /* ON  */ function () { return _this.cm.on("paste", _this.pasteHandle); }, 
            /* OFF */ function () { return _this.cm.off("paste", _this.pasteHandle); }).bind(this, "byPaste", true);
            new core_1.FlipFlop(
            /* ON  */ function () { return _this.cm.on("drop", _this.dropHandle); }, 
            /* OFF */ function () { return _this.cm.off("drop", _this.dropHandle); }).bind(this, "byDrop", true);
        }
        /**
         * upload files to the current cursor.
         *
         * @param {DataTransfer} data
         * @returns {boolean} data is accepted or not
         */
        InsertFile.prototype.doInsert = function (data, isClipboard) {
            var cm = this.cm;
            if (isClipboard && data.types && data.types.some(function (type) { return type.slice(0, 5) === 'text/'; }))
                return false;
            if (!data || !data.files || 0 === data.files.length)
                return false;
            var files = data.files;
            var fileHandler = this.fileHandler;
            var handled = false;
            if (typeof fileHandler !== 'function')
                return false;
            cm.operation(function () {
                // create a placeholder
                cm.replaceSelection(".");
                var posTo = cm.getCursor();
                var posFrom = { line: posTo.line, ch: posTo.ch - 1 };
                var placeholderContainer = document.createElement("span");
                var marker = cm.markText(posFrom, posTo, {
                    replacedWith: placeholderContainer,
                    clearOnEnter: false,
                    handleMouseEvents: false,
                });
                var action = {
                    marker: marker, cm: cm,
                    finish: function (text, cursor) { return cm.operation(function () {
                        var range = marker.find();
                        var posFrom = range.from, posTo = range.to;
                        cm.replaceRange(text, posFrom, posTo);
                        marker.clear();
                        if (typeof cursor === 'number')
                            cm.setCursor({
                                line: posFrom.line,
                                ch: posFrom.ch + cursor,
                            });
                    }); },
                    setPlaceholder: function (el) {
                        if (placeholderContainer.childNodes.length > 0)
                            placeholderContainer.removeChild(placeholderContainer.firstChild);
                        placeholderContainer.appendChild(el);
                        marker.changed();
                    },
                    resize: function () {
                        marker.changed();
                    }
                };
                handled = fileHandler(files, action);
                if (!handled)
                    marker.clear();
            });
            return handled;
        };
        return InsertFile;
    }());
    exports.InsertFile = InsertFile;
    //#endregion
    /** ADDON GETTER (Singleton Pattern): a editor can have only one InsertFile instance */
    exports.getAddon = core_1.Addon.Getter("InsertFile", InsertFile, exports.defaultOption /** if has options */);
});
