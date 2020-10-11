// HyperMD PowerPack "insert-file-with-smms"
// This file is distributed under a WTFPL license http://www.wtfpl.net/
//
// POWERPACK for "addon/paste"
//
// Use http://sm.ms as the default destination when user wants to upload images.
//
// :bulb: **Hint**:
//
// Feel free to copy codes from this module, alter `Upload_One`,
// and make a new `FileHandler` which uploads images to somewhere else.
//
// :warning: **Attribution Required**
//
// If you are using this PowerPack, please add "Uploaded images are hosted by https://sm.ms" to your app
// 如果使用了此 PowerPack，请别忘记添加 “由 https://sm.ms 提供图床服务”

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("../addon/insert-file")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","../addon/insert-file"], mod) :
  /*plain env*/ mod(null, (this.HyperMD_PowerPack = this.HyperMD_PowerPack || {}, this.HyperMD_PowerPack["insert-file-with-smms"] = {}), HyperMD.InsertFile);
})(function (require, exports, insert_file_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Upload one image.
     *
     * @param callback called when finished/error. if success, a `url` is given
     */
    function Upload_One(file, callback) {
        insert_file_1.ajaxUpload('https://sm.ms/api/upload', {
            smfile: file,
            format: 'json'
        }, function (o, e) {
            var imgURL = (o && o.code == 'success') ? o.data.url : null;
            callback(imgURL);
        });
    }
    exports.Upload_One = Upload_One;
    var spinGIF = 'data:image/gif;base64,R0lGODlhEAAQAMMMAAQEBIGBgby8vEJCQtzc3GJiYqCgoC8vL8zMzFRUVBkZGY+Pj+rq6nJycq2trQAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJDAAPACwAAAAAEAAQAAAEVvDJSat9rDV2JSOPcRzGg4AUUwxnkjACcKASMQwCFShATiG+CSERSBE4HYohsegQEEhDoXl5ohjQpOVpYSAnjECD9iA4gpNFACTIwRBJxmLx1Z60eEkEACH5BAkIAA8ALAEAAQAOAA4AAARQ8EnJQmAzM/LEOMJDYFRTEITFCMdAEkUSTotyIBMyT4wzb6SMBLFAOBoG4eQAGAiQSgkzAYyKFpzHRhmUGLAaBG7iWGDEWkRWaXBYM4RxJgIAIfkECQwADwAsAQABAA4ADgAABE/wScnWYjNPkZJ4BDYtQWgxyJCITFAQmXEMsEQg2iPgtpgjC4Qg8Mk9BooCsJhDNkBGm6HG8NkSgYxjmmkAAEyEA0OAOQCKmkYoEag15VwEACH5BAkIAA8ALAEAAQAOAA4AAARO8EnJjGMzT9IaeQQ2OcZHPkjRiI+xfJOQFCwBZwKi7RTCEI6bpjEIAHW8xmHByzB8ExbFgZQgoBOD4nAj+BCHA0IQFkoCAAAzxCMkEuYIACH5BAkMAA8ALAEAAQAOAA4AAARP8MmJ0LyXhcWwFEIHPsTWSY5BXEjTnA+zYsjsYTLDCDa2DCre7RFIGIYTBuJU7D0Elg8A0Lg4DoMZQQFQDQYIwSABI1gWCsWRALsQCg1nBAAh+QQJCAAPACwBAAEADgAOAAAETPDJSci82BlMkUQeYTgXyFzEsl0nVn2LwEkMwQzAMT9G4+C6WU/AWFhmtRbC0ZoIjg/CQbGSCBKFlvRADAQYiEKjWXsIDgOZDeltSiIAIfkECQwADwAsAQABAA4ADgAABE7wyUnIvI8gKTbOCuA8jMU43iMAQHMRzjg1ifUyErKkWPkUisGHExAAE0PVjmCwDZ0IwQfhJAwGslyjgSNdBYzFotRYXHyCREKaJIm7kwgAIfkEBQgADwAsAQABAA4ADgAABE3wSUlKITMzHABYmcQMh0AMA4ZgEnIo4MQgSCY4TJiLyB5mgUHj13IQgkMiwTjzEScEwY/AelQSUujCIGsUeg4Dg7FwaDCERqP6NJhDEQA7';
    var errorPNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAP1BMVEWIioX29/bu7uz+//79/f3S0tL09PPy8vHw8O74+fjMAADU2ND6+vr39/bY3NW9vrzp6ubl5+Pi5N/e4duytLE6MtxfAAAAbUlEQVQY022PSRLDMAgEgZBhMXLW/781cqKDYrtvdPWBoRvNbOflD+qCZ7rQdX09H3dxcClvxeKQgX2LRSRFPGdhaRnmgiHcIgMw559wQ0Y2hrUheh+9YdQQaFFa1aCnf+jh0+sE77co0Xs3/wNPXARclYchfgAAAABJRU5ErkJggg==';
    var supportBlobURL = typeof URL !== 'undefined';
    /** ClassName for `<img>` placeholders */
    var placeholderUploadingClass = "hmd-file-uploading";
    var placeholderUploadedClass = "hmd-file-uploaded";
    /**
     * SmMsFileHandler FileHandler
     *
     * accepts and uploads images, then inserts as `![](image_url)`
     */
    exports.SmMsFileHandler = function (files, action) {
        var unfinishedCount = 0;
        /** a container for all uploading images */
        var placeholderForAll = document.createElement("span");
        placeholderForAll.className = "smms-hosted-items";
        action.setPlaceholder(placeholderForAll);
        var uploads = [];
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (!/image\//.test(file.type))
                continue;
            var blobURL = supportBlobURL ? URL.createObjectURL(file) : spinGIF;
            var name_1 = file.name.match(/[^\\\/]+\.\w+$/)[0];
            var placeholder = document.createElement("img");
            placeholder.onload = resize; // img size changed
            placeholder.className = placeholderUploadingClass;
            placeholder.src = blobURL;
            placeholderForAll.appendChild(placeholder);
            var task = {
                blobURL: blobURL,
                name: name_1,
                url: null,
                placeholder: placeholder,
            };
            uploads.push(task);
            unfinishedCount++;
            Upload_One(file, uploadCallback.bind(null, task));
        }
        return uploads.length > 0;
        //----------------------------------------------------------------------------
        function resize() { action.resize(); }
        /** Once we uploaded a image, download it from server, preload for `fold` addon */
        function uploadCallback(task, url) {
            task.url = url || "error";
            var placeholder = task.placeholder;
            placeholder.className = placeholderUploadedClass;
            var _preloadDone = preloadCallback.bind(null, task);
            if (url) {
                var img = document.createElement("img");
                img.addEventListener("load", _preloadDone, false);
                img.addEventListener("error", _preloadDone, false);
                img.src = url;
            }
            else {
                placeholder.src = errorPNG;
                _preloadDone();
            }
        }
        function preloadCallback(task) {
            if (supportBlobURL)
                URL.revokeObjectURL(task.blobURL);
            if (--unfinishedCount === 0) {
                var texts = uploads.map(function (it) { return "![" + it.name + "](" + it.url + ")"; });
                action.finish(texts.join(" ") + " ");
            }
        }
    };
    insert_file_1.defaultOption.fileHandler = exports.SmMsFileHandler;
});
