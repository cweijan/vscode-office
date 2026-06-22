import { TelemetryReporter } from '@vscode/extension-telemetry';
import { env, ExtensionContext, workspace } from 'vscode';
import { fileTypeFromPath, resolveOfficeViewType } from './officeViewType';

/**
 * Application Insights connection string.
 * See docs/telemetry.md for Azure setup steps.
 */
const TELEMETRY_CONNECTION_STRING = 'InstrumentationKey=596d6b52-80df-4535-9724-a5ad85d41241;IngestionEndpoint=https://eastasia-0.in.applicationinsights.azure.com/;LiveEndpoint=https://eastasia.livediagnostics.monitor.azure.com/;ApplicationId=dedb7f90-910e-4ddc-b2d0-9f7df880dc5a';

export class TelemetryService {
    private static instance: TelemetryService | undefined;
    private reporter: TelemetryReporter | undefined;

    static init(context: ExtensionContext): TelemetryService {
        if (!TelemetryService.instance) {
            TelemetryService.instance = new TelemetryService(context);
        }
        return TelemetryService.instance;
    }

    static get(): TelemetryService | undefined {
        return TelemetryService.instance;
    }

    private constructor(context: ExtensionContext) {
        if (!TELEMETRY_CONNECTION_STRING) {
            return;
        }
        this.reporter = new TelemetryReporter(TELEMETRY_CONNECTION_STRING);
        context.subscriptions.push(this.reporter);
    }

    private enabled(): boolean {
        if (!this.reporter || !env.isTelemetryEnabled) {
            return false;
        }
        return workspace.getConfiguration('vscode-office').get<boolean>('enableTelemetry', true);
    }

    trackViewOpen(viewType: string, fileType?: string): void {
        if (!this.enabled()) {
            return;
        }
        this.reporter!.sendTelemetryEvent('view.open', {
            viewType,
            ...(fileType ? { fileType } : {}),
        });
    }

    trackOfficeViewOpen(fsPath: string, route?: string): void {
        const viewType = resolveOfficeViewType(fsPath, route);
        if (!viewType) {
            return;
        }
        this.trackViewOpen(viewType, fileTypeFromPath(fsPath));
    }

    trackGitHistoryView(mode: 'repo' | 'file'): void {
        if (!this.enabled()) {
            return;
        }
        this.reporter!.sendTelemetryEvent('gitHistory.view', { mode });
    }

    trackMarkdownExport(type: 'pdf' | 'html' | 'docx'): void {
        if (!this.enabled()) {
            return;
        }
        this.reporter!.sendTelemetryEvent('markdown.export', { type });
    }
}
