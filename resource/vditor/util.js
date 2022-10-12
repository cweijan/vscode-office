const latexSymbols = [
    // 运算符
    { name: 'log', value: "\\log" },
    // 关系运算符
    { name: 'pm', value: "\\pm" },
    { name: 'times', value: "\\times" },
    { name: 'leq', value: "\\leq" },
    { name: 'eq', value: "\\eq" },
    { name: 'geq', value: "\\geq" },
    { name: 'neq', value: "\\neq" },
    { name: 'approx', value: "\\approx" },
    { name: 'prod', value: "\\prod" },
    { name: 'bigodot', value: "\\bigodot" },
    // 逻辑符号
    { name: 'exists', value: "\\exists" },
    { name: 'forall', value: "\\forall" },
    { name: 'rightarrow', value: "\\rightarrow" },
    { name: 'leftarrow', value: "\\leftarrow" },
    // 三角函数符号
    { name: 'sin', value: "\\sin" },
    { name: 'cos', value: "\\cos" },
    { name: 'tan', value: "\\tan" },
    // 函数
    { name: 'fraction', value: "\\frac{}{}" },
    { name: 'sqrt', value: "\\sqrt{}" },
    { name: 'sum', value: "\\sum_{i=0}^n" },
    // 希腊数字
    { name: 'alpha', value: "\\alpha" },
    { name: 'beta', value: "\\beta" },
    { name: 'Delta', value: "\\Delta" },
    { name: 'delta', value: "\\delta" },
    { name: 'epsilon', value: "\\epsilon" },
    { name: 'theta', value: "\\theta" },
    { name: 'lambda', value: "\\lambda" },
    { name: 'Lambda', value: "\\Lambda" },
    { name: 'phi', value: "\\phi" },
    { name: 'Phi', value: "\\Phi" },
    { name: 'omega', value: "\\omega" },
    { name: 'Omega', value: "\\Omega" },
];

export const hotKeys = [
    {
        key: '\\',
        hint: (key) => {
            if (document.getSelection()?.anchorNode?.parentElement?.getAttribute('data-type') != "math-inline") {
                return []
            }
            const results = !key ? latexSymbols : latexSymbols.filter((symbol) => symbol.name.toLowerCase().startsWith(key.toLowerCase()));
            return results.map(com => ({
                html: com.name, value: com.value
            }));
        },
    },
]

export const toolbar = [
    'outline',
    "headings",
    "bold",
    "italic",
    "strike",
    "link",
    "emoji",
    "|",
    {
        tipPosition: 's',
        tip: 'Edit In VSCode',
        className: 'right',
        icon: '<?xml version="1.0" encoding="iso-8859-1"?><svg height="401pt" viewBox="0 -1 401.52289 401" width="401pt" xmlns="http://www.w3.org/2000/svg"><path d="m370.589844 250.972656c-5.523438 0-10 4.476563-10 10v88.789063c-.019532 16.5625-13.4375 29.984375-30 30h-280.589844c-16.5625-.015625-29.980469-13.4375-30-30v-260.589844c.019531-16.558594 13.4375-29.980469 30-30h88.789062c5.523438 0 10-4.476563 10-10 0-5.519531-4.476562-10-10-10h-88.789062c-27.601562.03125-49.96875 22.398437-50 50v260.59375c.03125 27.601563 22.398438 49.96875 50 50h280.589844c27.601562-.03125 49.96875-22.398437 50-50v-88.792969c0-5.523437-4.476563-10-10-10zm0 0"/><path d="m376.628906 13.441406c-17.574218-17.574218-46.066406-17.574218-63.640625 0l-178.40625 178.40625c-1.222656 1.222656-2.105469 2.738282-2.566406 4.402344l-23.460937 84.699219c-.964844 3.472656.015624 7.191406 2.5625 9.742187 2.550781 2.546875 6.269531 3.527344 9.742187 2.566406l84.699219-23.464843c1.664062-.460938 3.179687-1.34375 4.402344-2.566407l178.402343-178.410156c17.546875-17.585937 17.546875-46.054687 0-63.640625zm-220.257812 184.90625 146.011718-146.015625 47.089844 47.089844-146.015625 146.015625zm-9.40625 18.875 37.621094 37.625-52.039063 14.417969zm227.257812-142.546875-10.605468 10.605469-47.09375-47.09375 10.609374-10.605469c9.761719-9.761719 25.589844-9.761719 35.351563 0l11.738281 11.734375c9.746094 9.773438 9.746094 25.589844 0 35.359375zm0 0"/></svg>',
        click() {
            handler.emit("editInVSCode")
        }
    },
    {
        tipPosition: 's',
        tip: 'Export To Pdf',
        className: 'right',
        icon: '<?xml version="1.0" encoding="iso-8859-1"?> <!-- Generator: Adobe Illustrator 19.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  --> <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <g> <g> <path d="M494.479,138.557L364.04,3.018C362.183,1.09,359.621,0,356.945,0h-194.41c-21.757,0-39.458,17.694-39.458,39.442v137.789 H44.29c-16.278,0-29.521,13.239-29.521,29.513v147.744C14.769,370.761,28.012,384,44.29,384h78.787v88.627 c0,21.71,17.701,39.373,39.458,39.373h295.238c21.757,0,39.458-17.653,39.458-39.351V145.385 C497.231,142.839,496.244,140.392,494.479,138.557z M359.385,26.581l107.079,111.265H359.385V26.581z M44.29,364.308 c-5.42,0-9.828-4.405-9.828-9.82V206.744c0-5.415,4.409-9.821,9.828-9.821h265.882c5.42,0,9.828,4.406,9.828,9.821v147.744 c0,5.415-4.409,9.82-9.828,9.82H44.29z M477.538,472.649c0,10.84-8.867,19.659-19.766,19.659H162.535 c-10.899,0-19.766-8.828-19.766-19.68V384h167.403c16.278,0,29.521-13.239,29.521-29.512V206.744 c0-16.274-13.243-29.513-29.521-29.513H142.769V39.442c0-10.891,8.867-19.75,19.766-19.75h177.157v128 c0,5.438,4.409,9.846,9.846,9.846h128V472.649z"/> </g> </g> <g> <g> <path d="M132.481,249.894c-3.269-4.25-7.327-7.01-12.173-8.279c-3.154-0.846-9.923-1.269-20.308-1.269H72.596v84.577h17.077 v-31.904h11.135c7.731,0,13.635-0.404,17.712-1.212c3-0.654,5.952-1.99,8.856-4.01c2.904-2.019,5.298-4.798,7.183-8.336 c1.885-3.538,2.827-7.904,2.827-13.096C137.385,259.634,135.75,254.144,132.481,249.894z M117.856,273.173 c-1.288,1.885-3.067,3.269-5.337,4.154s-6.769,1.327-13.5,1.327h-9.346v-24h8.25c6.154,0,10.25,0.192,12.288,0.577 c2.769,0.5,5.058,1.75,6.865,3.75c1.808,2,2.712,4.539,2.712,7.615C119.789,269.096,119.144,271.288,117.856,273.173z"/> </g> </g> <g> <g> <path d="M219.481,263.452c-1.846-5.404-4.539-9.971-8.077-13.702s-7.789-6.327-12.75-7.789c-3.692-1.077-9.058-1.615-16.096-1.615 h-31.212v84.577h32.135c6.308,0,11.346-0.596,15.115-1.789c5.039-1.615,9.039-3.865,12-6.75c3.923-3.808,6.942-8.788,9.058-14.942 c1.731-5.039,2.596-11.039,2.596-18C222.25,275.519,221.327,268.856,219.481,263.452z M202.865,298.183 c-1.154,3.789-2.644,6.51-4.471,8.163c-1.827,1.654-4.125,2.827-6.894,3.519c-2.115,0.539-5.558,0.808-10.327,0.808h-12.75v0 v-56.019h7.673c6.961,0,11.635,0.269,14.019,0.808c3.192,0.692,5.827,2.019,7.904,3.981c2.077,1.962,3.692,4.692,4.846,8.192 c1.154,3.5,1.731,8.519,1.731,15.058C204.596,289.231,204.019,294.394,202.865,298.183z"/> </g> </g> <g> <g> <polygon points="294.827,254.654 294.827,240.346 236.846,240.346 236.846,324.923 253.923,324.923 253.923,288.981 289.231,288.981 289.231,274.673 253.923,274.673 253.923,254.654 		"/> </g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> </svg>',
        click() {
            handler.emit("export")
        }
    },
    {
        tipPosition: 's',
        tip: 'Select Theme',
        className: 'right',
        icon: '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg t="1665548951589" class="icon" viewBox="0 0 1040 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2559" xmlns:xlink="http://www.w3.org/1999/xlink" width="203.125" height="200"><path d="M717.056236 383.936299l-51.226708 0c-28.2893 0-51.226708 22.936385-51.226708 51.225685l0 128.062678c0 28.2893 22.937408 51.225685 51.226708 51.225685l51.226708 0c28.2893 0 51.225685-22.936385 51.225685-51.225685L768.281921 435.161984C768.281921 406.872684 745.345536 383.936299 717.056236 383.936299zM717.056236 537.611308c0 14.158465-11.480472 25.612331-25.613354 25.612331-14.132882 0-25.612331-11.453866-25.612331-25.612331l0-76.835969c0-14.158465 11.480472-25.613354 25.612331-25.613354 14.133905 0 25.613354 11.453866 25.613354 25.613354L717.056236 537.611308zM1013.977739 426.580538 859.776751 165.30079c-8.888438-15.063067-22.294772-25.975605-37.57171-32.080649-32.708959-34.856879-79.187527-56.638975-130.762159-56.638975L332.862064 76.581166c-51.575656 0-98.0532 21.782096-130.761136 56.639998-15.276938 6.105045-28.683273 17.017582-37.572734 32.079626L10.327206 426.580538c-21.26021 36.069497-8.655124 82.217537 28.239158 103.028515l115.00836 64.967664 0 199.163015c0 99.024318 80.264045 153.678078 179.287339 153.678078l358.580818 0c99.024318 0 179.290409-80.266092 179.290409-179.290409L870.733291 594.575694l115.00836-64.966641C1022.63184 508.798075 1035.238972 462.650035 1013.977739 426.580538zM153.574724 536.518417l-67.058278-37.875632c-24.589025-13.907755-33.019021-44.647873-18.809391-68.684312l85.86767-145.555074L153.574724 536.518417zM646.620024 127.807874c0 56.5786-60.205197 102.45137-134.467551 102.45137-74.261331 0-134.466528-45.873794-134.466528-102.45137L646.620024 127.807874zM819.507606 742.515071c0 84.893482-68.810179 153.677055-153.678078 153.677055L358.475418 896.192126c-84.8679 0-153.675008-68.783573-153.675008-153.677055l0-461.030142c0-76.150354 55.402821-139.361001 128.093377-151.545508 1.332345 83.883479 81.06734 151.545508 179.258687 151.545508 98.19237 0 177.926342-67.662029 179.25971-151.545508 72.690556 12.183484 128.096447 75.394131 128.096447 151.545508L819.508629 742.515071zM937.791569 498.642784l-67.058278 37.875632 0-252.111948 85.86767 145.552004C970.807521 453.995935 962.377524 484.736053 937.791569 498.642784z" p-id="2560"></path></svg>',
        click() {
            handler.emit("theme")
        }
    },
    { name: 'upload', tipPosition: 'e' },
    "|",
    // "edit-mode",  // 屏蔽掉, 现版本都是针对一种模式优化
    "code-theme",
    // "|",
    "list",
    "ordered-list",
    "check",
    "table",
    "outdent",
    "indent",
    "|",
    "quote",
    "line",
    "code",
    "inline-code",
    "|",
    "undo",
    "redo",
    "|",
    "preview",
    "info",
    "help",
]

/**
 * 针对wysiwyg和ir两种模式对超链接做不同的处理
 */
export const openLink = () => {
    const clickCallback = e => {
        let ele = e.target;
        e.stopPropagation()
        if (!e.ctrlKey && event.type != 'dblclick') {
            return;
        }
        if (ele.tagName == 'A') {
            handler.emit("openLink", ele.href)
        } else if (ele.tagName == 'IMG') {
            const parent = ele.parentElement;
            if (parent?.tagName == 'A' && parent.href) {
                handler.emit("openLink", parent.href)
                return;
            }
            const src = ele.src;
            if (src?.match(/http/)) {
                handler.emit("openLink", src)
            }
        }
    }
    const content = document.querySelector(".vditor-wysiwyg");
    content.addEventListener('dblclick', clickCallback);
    content.addEventListener('click', clickCallback);
    document.querySelector(".vditor-ir").addEventListener('click', e => {
        let ele = e.target;
        if (ele.classList.contains('vditor-ir__link')) {
            ele = e.target.nextElementSibling?.nextElementSibling?.nextElementSibling
        }
        if (ele.classList.contains('vditor-ir__marker--link')) {
            handler.emit("openLink", ele.textContent)
        }
    });
}


//监听选项改变事件
export function onToolbarClick(editor) {
    document.querySelector('.vditor-toolbar').addEventListener("click", (e) => {
        let type;
        for (let i = 0; i < 3; i++) {
            if (type = e.path[i].dataset.type) break;
        }
        if (type == 'outline') {
            handler.emit("saveOutline", editor.vditor.options.outline.enable)
        }
    })
}

export const createContextMenu = (editor) => {
    const menu = document.getElementById('context-menu')
    document.addEventListener("mousedown", e => {
        if (!e.target?.classList?.contains('dropdown-item')) {
            menu.classList.remove('show')
            menu.style.display = 'none'
        }
    });
    document.oncontextmenu = e => {
        e.stopPropagation();
        var top = e.pageY - 10;
        var left = e.pageX - 90;
        menu.style.display = 'block'
        menu.style.top = top + "px";
        menu.style.left = left + "px";
        menu.classList.add('show')
    }
    menu.onclick = e => {
        menu.style.display = 'none'
        menu.classList.remove('show')
        const id = e.target.getAttribute("id");
        switch (id) {
            case "copy":
                document.execCommand("copy")
                break;
            case "paste":
                if (document.getSelection()?.toString()) { document.execCommand("delete") }
                vscodeEvent.emit('command', 'office.markdown.paste')
                break;
            case "exportPdf":
                vscodeEvent.emit("save", editor.getValue())
                vscodeEvent.emit('export')
                break;
            case "exportHtml":
                vscodeEvent.emit("save", editor.getValue())
                vscodeEvent.emit('exportPdfToHtml')
                break;
        }
    }
}

export const imageParser = (viewAbsoluteLocal) => {
    if (!viewAbsoluteLocal) return;
    var observer = new MutationObserver(mutationList => {
        for (var mutation of mutationList) {
            for (var node of mutation.addedNodes) {
                if (!node.querySelector) continue;
                const imgs = node.querySelectorAll('img')
                for (const img of imgs) {
                    const url = img.src;
                    if (url.startsWith("http")) { continue; }
                    if (url.startsWith("vscode-webview-resource") && url.includes("file///")) {
                        img.src = `https://file+.vscode-resource.vscode-cdn.net/${url.split("file///")[1]}`
                    }
                }
            }
        }
    });
    observer.observe(document, {
        childList: true,
        subtree: true
    });
}



/**
 * 自动补全符号
 */
const keys = ['"', "{", "("];
export const autoSymbal = (editor) => {
    let _exec = document.execCommand.bind(document)
    document.execCommand = (cmd, ...args) => {
        if (cmd === 'delete') {
            setTimeout(() => {
                return _exec(cmd, ...args)
            })
        } else {
            return _exec(cmd, ...args)
        }
    }
    window.onkeydown = (e) => {
        if (e.ctrlKey && e.code == "KeyV") {
            if (e.shiftKey) {
                navigator.clipboard.readText().then(text => {
                    if (!text) return;
                    document.execCommand('insertText', false, text.trim());
                })
            } else {
                if (document.getSelection()?.toString()) { document.execCommand("delete") }
            }
            // vscodeEvent.emit('command', 'office.markdown.paste')
            e.stopPropagation()
            return;
        }
        // 之前某个vscode版本有bug保存不了, 所以在这里触发, 不过现在不会了
        // if (e.ctrlKey && e.code == "KeyS" && !e.shiftKey) {
        //     vscodeEvent.emit("doSave", editor.getValue())
        //     e.stopPropagation()
        //     return;
        // }
        if (keys.indexOf(e.key) == -1) {
            return;
        }
        const selectText = document.getSelection().toString();
        if (selectText != "") { return; }

        if (e.key == '(') {
            document.execCommand('insertText', false, ')');
        } else if (e.key == '{') {
            document.execCommand('insertText', false, '}');
        } else {
            document.execCommand('insertText', false, e.key);
        }
        document.getSelection().modify('move', 'left', 'character')
    }

    window.onresize = () => {
        document.getElementById('vditor').style.height = `${document.documentElement.clientHeight}px`
    }
    let app;
    let needFocus = false;
    window.onblur = () => {
        if (!app) { app = document.querySelector('.vditor-reset'); }
        // 纯文本没有offsetTop, 所以需要拿父节点
        const targetNode = document.getSelection()?.baseNode?.parentNode;
        // 如果编辑器现在没有获得焦点, 则无需重获焦点
        if (!app?.contains(targetNode)) {
            needFocus = false;
            return;
        }
        // 判断是否需要聚焦
        const curPosition = targetNode?.offsetTop ?? 0;
        const appPosition = app?.scrollTop ?? 0;
        if (appPosition - curPosition < window.innerHeight) {
            needFocus = true;
        }
    }
    window.onfocus = () => {
        if (!app) { app = document.querySelector('.vditor-reset'); }
        if (needFocus) {
            app.focus()
            needFocus = false;
        }
    }
}