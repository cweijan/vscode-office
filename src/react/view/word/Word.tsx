import { useEffect } from "react";
import { handler } from "../../util/vscode";
import './Word.css'
import * as docx from 'docx-preview'

export default function Word() {
    console.log('docx', docx)
    handler.on("open", ({ path }) => {
        fetch(path).then(response => response.arrayBuffer()).then(res => {
            docx.renderAsync(res, document.getElementById("content"), null, {
                // ignoreWidth:true,
                // breakPages:true,
                // ignoreLastRenderedPageBreak:false
            }).then(x => {
                // initPaginition()
                // zoomElement('#container')
            });
        })
    })
    useEffect(() => {
        handler.emit('init')
    })

    return (
        <div id="container">
            <div id="pagination-wrapper">
                <div id="pagination">
                </div>
            </div>
            <div id="content" style={{ width: '100%' }}>
            </div>
        </div>
    )
}