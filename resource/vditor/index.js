import {openLink, hotKeys, imageParser, toolbar, windowHack } from "./util.js";

handler.on("open", (md) => {
    if (md.autoTheme) {
        window.addThemeCss()
    }
    const editor=new Vditor('vditor', {
        value: md.content,
        height: document.documentElement.clientHeight,
        outline: true,
        "preview": {
            "markdown": {
                "toc": true
            },
            hljs: {
                style: 'github'
            },
            math: {
                engine: 'MathJax'
            }
        },
        toolbar,
        input(content) {
            handler.emit("save", content)
        },
        hint: {
            extend: hotKeys
        }
    })

    openLink()
    windowHack(editor);
    console.log(md)
    if(md.viewAbsoluteLocal){
        imageParser()
    }

})

handler.emit("init")

