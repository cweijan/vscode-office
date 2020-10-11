// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fetch footnote content, Resolve relative URLs
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("../core")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","../core"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.ReadLink = this.HyperMD.ReadLink || {}), CodeMirror, HyperMD);
})(function (require, exports, CodeMirror, core_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Normalize a (potentially-with-title) URL string
     *
     * @param content eg. `http://laobubu.net/page "The Page"` or just a URL
     */
    function splitLink(content) {
        // remove title part (if exists)
        content = content.trim();
        var url = content, title = "";
        var mat = content.match(/^(\S+)\s+("(?:[^"\\]+|\\.)+"|[^"\s].*)/);
        if (mat) {
            url = mat[1];
            title = mat[2];
            if (title.charAt(0) === '"')
                title = title.substr(1, title.length - 2).replace(/\\"/g, '"');
        }
        return { url: url, title: title };
    }
    exports.splitLink = splitLink;
    /********************************************************************************** */
    //#region CodeMirror Extension
    // add methods to all CodeMirror editors
    // every codemirror editor will have these member methods:
    exports.Extensions = {
        /**
         * Try to find a footnote and return its lineNo, content.
         *
         * NOTE: You will need `hmdSplitLink` and `hmdResolveURL` if you want to get a URL
         *
         * @param footNoteName without square brackets, case-insensive
         * @param line since which line
         */
        hmdReadLink: function (footNoteName, line) {
            return exports.getAddon(this).read(footNoteName, line);
        },
        /**
         * Check if URL is relative URL, and add baseURI if needed; or if it's a email address, add "mailto:"
         *
         * @see ReadLink.resolve
         */
        hmdResolveURL: function (url, baseURI) {
            return exports.getAddon(this).resolve(url, baseURI);
        },
        hmdSplitLink: splitLink,
    };
    for (var name in exports.Extensions) {
        CodeMirror.defineExtension(name, exports.Extensions[name]);
    }
    exports.defaultOption = {
        baseURI: "",
    };
    exports.suggestedOption = {
        baseURI: "",
    };
    core_1.suggestedEditorConfig.hmdReadLink = exports.suggestedOption;
    CodeMirror.defineOption("hmdReadLink", exports.defaultOption, function (cm, newVal) {
        ///// convert newVal's type to `Partial<Options>`, if it is not.
        if (!newVal || typeof newVal === "string") {
            newVal = { baseURI: newVal };
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
    var ReadLink = /** @class */ (function () {
        function ReadLink(cm) {
            var _this = this;
            this.cm = cm;
            this.cache = {};
            cm.on("changes", core_1.debounce(function () { return _this.rescan(); }, 500));
            this.rescan();
        }
        /**
         * get link footnote content like
         *
         * ```markdown
         *  [icon]: http://laobubu.net/icon.png
         * ```
         *
         * @param footNoteName case-insensive name, without "[" or "]"
         * @param line         current line. if not set, the first definition will be returned
         */
        ReadLink.prototype.read = function (footNoteName, line) {
            var defs = this.cache[footNoteName.trim().toLowerCase()] || [];
            var def;
            if (typeof line !== "number")
                line = 1e9;
            for (var i = 0; i < defs.length; i++) {
                def = defs[i];
                if (def.line > line)
                    break;
            }
            return def;
        };
        /**
         * Scan content and rebuild the cache
         */
        ReadLink.prototype.rescan = function () {
            var cm = this.cm;
            var cache = (this.cache = {});
            cm.eachLine(function (line) {
                var txt = line.text, mat = /^(?:>\s+)*>?\s{0,3}\[([^\]]+)\]:\s*(.+)$/.exec(txt);
                if (mat) {
                    var key = mat[1].trim().toLowerCase(), content = mat[2];
                    if (!cache[key])
                        cache[key] = [];
                    cache[key].push({
                        line: line.lineNo(),
                        content: content,
                    });
                }
            });
        };
        /**
         * Check if URL is relative URL, and add baseURI if needed
         *
         * @example
         *
         *     resolve("<email address>") // => "mailto:xxxxxxx"
         *     resolve("../world.png") // => (depends on your editor configuration)
         *     resolve("../world.png", "http://laobubu.net/xxx/foo/") // => "http://laobubu.net/xxx/world.png"
         *     resolve("../world.png", "http://laobubu.net/xxx/foo") // => "http://laobubu.net/xxx/world.png"
         *     resolve("/world.png", "http://laobubu.net/xxx/foo/") // => "http://laobubu.net/world.png"
         */
        ReadLink.prototype.resolve = function (uri, baseURI) {
            var emailRE = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            var hostExtract = /^(?:[\w-]+\:\/*|\/\/)[^\/]+/;
            var levelupRE = /\/[^\/]+(?:\/+\.?)*$/;
            if (!uri)
                return uri;
            if (emailRE.test(uri))
                return "mailto:" + uri;
            var tmp;
            var host = "";
            baseURI = baseURI || this.baseURI;
            // not configured, or is already URI with scheme
            if (!baseURI || hostExtract.test(uri))
                return uri;
            // try to extract scheme+host like http://laobubu.net without tailing slash
            if (tmp = baseURI.match(hostExtract)) {
                host = tmp[0];
                baseURI = baseURI.slice(host.length);
            }
            while (tmp = uri.match(/^(\.{1,2})([\/\\]+)/)) {
                uri = uri.slice(tmp[0].length);
                if (tmp[1] == "..")
                    baseURI = baseURI.replace(levelupRE, "");
            }
            if (uri.charAt(0) === '/' && host) {
                uri = host + uri;
            }
            else {
                if (!/\/$/.test(baseURI))
                    baseURI += "/";
                uri = host + baseURI + uri;
            }
            return uri;
        };
        return ReadLink;
    }());
    exports.ReadLink = ReadLink;
    //#endregion
    /** ADDON GETTER (Singleton Pattern): a editor can have only one ReadLink instance */
    exports.getAddon = core_1.Addon.Getter("ReadLink", ReadLink, exports.defaultOption /** if has options */);
});
