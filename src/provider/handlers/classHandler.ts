import { Output } from '@/common/Output';
import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { parse } from 'path';
import * as vscode from 'vscode';

export function handleClass(uri: vscode.Uri, panel: vscode.WebviewPanel) {
    const tempPath = `${tmpdir()}/office_temp_java`
    if (!existsSync(tempPath)) {
        mkdirSync(tempPath)
    }
    const java = spawn("java", ['-cp', '../resource/java-decompiler.jar', 'org.jetbrains.java.decompiler.main.decompiler.ConsoleDecompiler', uri.fsPath, tempPath], { cwd: __dirname })
    java.stdout.on('data', (data) => {
        console.log(data.toString("utf8"))
        if (data.toString("utf8").indexOf("done") == -1) {
            return;
        }
        const fileName = `${tempPath}/${parse(uri.fsPath).name}.java`;
        setTimeout(() => {
            vscode.window.showTextDocument(vscode.Uri.file(fileName).with({ scheme: "decompile_java", query: new Date().getTime().toString() }));
        }, 10);
    });
    java.stderr.on('data', (data) => {
        Output.log(data.toString("utf8"))
    });
}
