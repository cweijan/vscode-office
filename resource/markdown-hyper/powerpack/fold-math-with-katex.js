// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-math"
//
// Use KaTeX to render TeX formulars.
//
// :warning: In plain browser env, don't forget to load `katex/dist/katex.min.css`.
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("katex"), require("../addon/fold-math"), require("katex/dist/katex.min.css")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","katex","../addon/fold-math","katex/dist/katex.min.css"], mod) :
  /*plain env*/ mod(null, (this.HyperMD_PowerPack = this.HyperMD_PowerPack || {}, this.HyperMD_PowerPack["fold-math-with-katex"] = {}), katex, HyperMD.FoldMath);
})(function (require, exports, katex, fold_math_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var KatexRenderer = /** @class */ (function () {
        function KatexRenderer(container, mode) {
            this.container = container;
            this.isDisplay = mode === "display";
            var elClass = "hmd-math-katex";
            if (mode)
                elClass += " hmd-math-katex-" + mode;
            var errorEl = this.errorEl = document.createElement("span");
            errorEl.setAttribute("style", "white-space: pre-wrap; font-size: 90%; border: 1px solid #900; color: #C00");
            var el = this.el = document.createElement("span");
            el.className = elClass;
            container.appendChild(el);
        }
        KatexRenderer.prototype.startRender = function (expr) {
            var el = this.el, errorEl = this.errorEl;
            try {
                katex.render(expr, el, {
                    displayMode: this.isDisplay
                });
                // remove "error" mark if exists
                if (errorEl.parentElement === el) {
                    el.removeChild(errorEl);
                    el.className = el.className.replace(" hmd-math-katex-error", "");
                }
            }
            catch (err) {
                // failed to render!
                errorEl.textContent = err && err.message;
                if (errorEl.parentElement !== el) {
                    el.textContent = "";
                    el.appendChild(errorEl);
                    el.className += " hmd-math-katex-error";
                }
            }
            var onChanged = this.onChanged;
            if (onChanged)
                setTimeout(onChanged.bind(this, expr), 0);
        };
        KatexRenderer.prototype.clear = function () {
            this.container.removeChild(this.el);
        };
        /** indicate that if the Renderer is ready to execute */
        KatexRenderer.prototype.isReady = function () {
            return true; // I'm always ready!
        };
        return KatexRenderer;
    }());
    exports.KatexRenderer = KatexRenderer;
    // Use KatexRenderer as default MathRenderer
    if (typeof katex != "undefined") {
        fold_math_1.defaultOption.renderer = KatexRenderer;
    }
    else {
        console.error("[HyperMD] PowerPack fold-math-with-katex loaded, but katex not found.");
    }
});
