"user strict";
import * as vscode from "vscode";

export class Output {

    public static debug(value: any) {
        this.log(value, false)
    }

    public static log(value: any, showLog = true) {
        if (this.outputChannel == null) {
            this.outputChannel = vscode.window.createOutputChannel("Office");
        }
        if (showLog) this.outputChannel.show(true);
        this.outputChannel.appendLine(`${value}`);
        this.outputChannel.appendLine("-----------------------------------------------------------------------------------------");
    }

    private static outputChannel: vscode.OutputChannel;
}
