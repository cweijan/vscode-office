"user strict";
import * as vscode from "vscode";

export class Output {
    public static log(value: any) {
        if (this.outputChannel == null) {
            this.outputChannel = vscode.window.createOutputChannel("Office");
        }
        this.outputChannel.show(true);
        this.outputChannel.appendLine(`${value}`);
        this.outputChannel.appendLine("-----------------------------------------------------------------------------------------");
    }

    private static outputChannel: vscode.OutputChannel;
}
