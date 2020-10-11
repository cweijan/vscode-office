// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: A workaround for cheap and unstable mouses.
//
// When a user clicks to move the cursor, releasing mouse button,
// the user's hand might shake and an unexcepted selection will be made.
// This addon suppresses the shake.
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("../core")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","../core"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.CursorDebounce = this.HyperMD.CursorDebounce || {}), CodeMirror, HyperMD);
})(function (require, exports, CodeMirror, core_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /********************************************************************************** */
    // Some parameter LGTM
    var silenceDuration = 100, distance = 5;
    exports.defaultOption = {
        enabled: false,
    };
    exports.suggestedOption = {
        enabled: true,
    };
    core_1.suggestedEditorConfig.hmdCursorDebounce = exports.suggestedOption;
    CodeMirror.defineOption("hmdCursorDebounce", exports.defaultOption, function (cm, newVal) {
        ///// convert newVal's type to `Partial<Options>`, if it is not.
        if (!newVal || typeof newVal === "boolean") {
            newVal = { enabled: !!newVal };
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
    var CursorDebounce = /** @class */ (function () {
        function CursorDebounce(cm) {
            var _this = this;
            this.cm = cm;
            this.mouseDownHandler = function (cm, ev) {
                _this.lastX = ev.clientX;
                _this.lastY = ev.clientY;
                var supressor = _this.mouseMoveSuppress;
                document.addEventListener("mousemove", supressor, true);
                if (_this.lastTimeout)
                    clearTimeout(_this.lastTimeout);
                _this.lastTimeout = setTimeout(function () {
                    document.removeEventListener("mousemove", supressor, true);
                    _this.lastTimeout = null;
                }, silenceDuration);
            };
            this.mouseMoveSuppress = function (ev) {
                if ((Math.abs(ev.clientX - _this.lastX) <= distance) && (Math.abs(ev.clientY - _this.lastY) <= distance))
                    ev.stopPropagation();
            };
            new core_1.FlipFlop(
            /* ON  */ function () { cm.on('mousedown', _this.mouseDownHandler); }, 
            /* OFF */ function () { cm.off('mousedown', _this.mouseDownHandler); }).bind(this, "enabled", true);
        }
        return CursorDebounce;
    }());
    exports.CursorDebounce = CursorDebounce;
    //#endregion
    /** ADDON GETTER (Singleton Pattern): a editor can have only one CursorDebounce instance */
    exports.getAddon = core_1.Addon.Getter("CursorDebounce", CursorDebounce, exports.defaultOption /** if has options */);
});
