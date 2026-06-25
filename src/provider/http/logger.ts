import { OutputChannel, window } from 'vscode';
import { RestClientSettings } from './models/configurationSettings';
import { LogLevel } from './models/types';

class Log {
    private readonly outputChannel: OutputChannel = window.createOutputChannel('Office Http Request');
    private readonly settings = RestClientSettings.Instance;

    public error(message: string, data?: unknown): void {
        this.log(LogLevel.Error, message, data);
    }

    private log(level: LogLevel, message: string, data?: unknown): void {
        if (level >= this.settings.logLevel) {
            this.outputChannel.appendLine(`[${LogLevel[level]} - ${new Date().toLocaleTimeString()}] ${message}`);
            if (data) {
                this.outputChannel.appendLine(this.formatData(data));
            }
        }
    }

    private formatData(data: unknown): string {
        if (data instanceof Error) {
            return data.stack || data.message;
        }
        if (typeof data === 'string') {
            return data;
        }
        return JSON.stringify(data, null, 2);
    }
}

export default new Log();
