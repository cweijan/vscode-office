handler.emit("init")
handler.on("open", (md) => {
    const editor = new Vditor('vditor', {
        value: md.content,
        height: document.documentElement.clientHeight,
        outline: true,
        "preview": {
            "markdown": {
              "toc": true
            }
        },
        transform(html) {
            console.log(html)
        },
        input(md) {
            // 这里实际是保存事件
            console.log('input')
        },
        // latex语法
        hint: {
            extend: [
                {
                    key: '@',
                    hint: (key) => {
                        if ('vanessa'.indexOf(key.toLocaleLowerCase()) > -1) {
                            return [
                                {
                                    value: '@Vanessa',
                                    html: '<img src="https://avatars0.githubusercontent.com/u/970828?s=60&v=4"/> Vanessa',
                                }]
                        }
                        return []
                    },
                },
            ]
        }
        // TODO
        // 1. 图片地址转换
        // 2. input事件
        // 3. ``代码默认样式参考typora
        // 4. 自动引号
    })
    window.onkeypress = (e) => {
        if (e.ctrlKey && e.code == "KeyS") {
            vscodeEvent.emit("doSave", editor.getValue())
        }
    }
})