// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Load code highlighting modes (aka. profiles) automatically
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("../core"), require("codemirror/mode/meta")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","../core","codemirror/mode/meta"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.ModeLoader = this.HyperMD.ModeLoader || {}), CodeMirror, HyperMD);
})(function (require, exports, CodeMirror, core_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultOption = {
        source: null,
    };
    exports.suggestedOption = {
        source: (typeof requirejs === 'function') ? "~codemirror/" : "https://cdn.jsdelivr.net/npm/codemirror/",
    };
    core_1.suggestedEditorConfig.hmdModeLoader = exports.suggestedOption;
    CodeMirror.defineOption("hmdModeLoader", exports.defaultOption, function (cm, newVal) {
        ///// convert newVal's type to `Partial<Options>`, if it is not.
        if (!newVal || typeof newVal === "boolean") {
            newVal = { source: newVal && exports.suggestedOption.source || null };
        }
        else if (typeof newVal === "string" || typeof newVal === "function") {
            newVal = { source: newVal };
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
    var ModeLoader = /** @class */ (function () {
        function ModeLoader(cm) {
            // options will be initialized to defaultOption when constructor is finished
            // add your code here
            var _this = this;
            this.cm = cm;
            this._loadingModes = {};
            /**
             * CodeMirror "renderLine" event handler
             */
            this.rlHandler = function (cm, line) {
                var lineNo = line.lineNo();
                var text = line.text || "", mat = text.match(/^```\s*(\S+)/);
                if (mat) { // seems found one code fence
                    var lang = mat[1];
                    var modeInfo = CodeMirror.findModeByName(lang);
                    var modeName = modeInfo && modeInfo.mode;
                    if (modeName && !(modeName in CodeMirror.modes)) {
                        // a not-loaded mode is found!
                        // now we shall load mode `modeName`
                        _this.startLoadMode(modeName, lineNo);
                    }
                }
            };
            new core_1.FlipFlop() // use FlipFlop to detect if a option is changed
                .bind(this, "source")
                .ON(function () { cm.on("renderLine", _this.rlHandler); })
                .OFF(function () { cm.off("renderLine", _this.rlHandler); });
        }
        /** trig a "change" event on one line */
        ModeLoader.prototype.touchLine = function (lineNo) {
            var line = this.cm.getLineHandle(lineNo);
            var lineLen = line.text.length;
            this.cm.replaceRange(line.text.charAt(lineLen - 1), { line: lineNo, ch: lineLen - 1 }, { line: lineNo, ch: lineLen });
        };
        /**
         * load a mode, then refresh editor
         *
         * @param  mode
         * @param  line >=0 : add into waiting queue    <0 : load and retry up to `-line` times
         */
        ModeLoader.prototype.startLoadMode = function (mode, line) {
            var linesWaiting = this._loadingModes;
            var self = this;
            if (line >= 0 && mode in linesWaiting) {
                linesWaiting[mode].push(line);
                return;
            }
            // start load a mode
            if (line >= 0)
                linesWaiting[mode] = [line];
            var successCb = function () {
                console.log("[HyperMD] mode-loader loaded " + mode);
                var lines = linesWaiting[mode];
                self.cm.operation(function () {
                    for (var i = 0; i < lines.length; i++) {
                        self.touchLine(lines[i]);
                    }
                });
                delete linesWaiting[mode];
            };
            var errorCb = function () {
                console.warn("[HyperMD] mode-loader failed to load mode " + mode + " from ", url);
                if (line === -1) {
                    // no more chance
                    return;
                }
                console.log("[HyperMD] mode-loader will retry loading " + mode);
                setTimeout(function () {
                    self.startLoadMode(mode, line >= 0 ? -3 : (line + 1));
                }, 1000);
            };
            if (typeof this.source === "function") {
                this.source(mode, successCb, errorCb);
                return;
            }
            var url = this.source + "mode/" + mode + "/" + mode + ".js";
            if (typeof requirejs === 'function' && url.charAt(0) === "~") {
                // require.js
                requirejs([
                    url.slice(1, -3),
                ], successCb);
            }
            else {
                // trandition loadScript
                var script = document.createElement('script');
                script.onload = successCb;
                script.onerror = errorCb;
                script.src = url;
                document.head.appendChild(script);
            }
        };
        return ModeLoader;
    }());
    exports.ModeLoader = ModeLoader;
    //#endregion
    /** ADDON GETTER (Singleton Pattern): a editor can have only one ModeLoader instance */
    exports.getAddon = core_1.Addon.Getter("ModeLoader", ModeLoader, exports.defaultOption /** if has options */);
});
