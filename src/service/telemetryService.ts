import { TelemetryReporter } from '@vscode/extension-telemetry';
import { env, ExtensionContext, workspace } from 'vscode';
import { fileTypeFromPath, resolveOfficeViewType } from './officeViewType';

/**
 * Application Insights connection string.
 * See docs/telemetry.md for Azure setup steps.
 */
const TELEMETRY_CONNECTION_STRING = 'InstrumentationKey=49047faa-e1fe-4428-90b7-d4a3730299d8;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=3b475201-7779-41cb-bce0-8a05b81e3c21';

export class TelemetryService {
    private static instance: TelemetryService | undefined;
    private static readonly VIEW_OPEN_INTERVAL_MS = 180 * 60 * 1000;
    private reporter: TelemetryReporter | undefined;
    private viewOpenLastSentByFileType = new Map<string, number>();

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

    trackViewOpen(viewType: string, fileType?: string, properties?: Record<string, string>): void {
        if (!this.enabled()) {
            return;
        }
        const rateLimitKey = fileType ?? viewType;
        const now = Date.now();
        const lastSent = this.viewOpenLastSentByFileType.get(rateLimitKey);
        if (lastSent !== undefined && now - lastSent < TelemetryService.VIEW_OPEN_INTERVAL_MS) {
            return;
        }
        this.viewOpenLastSentByFileType.set(rateLimitKey, now);
        this.reporter!.sendTelemetryEvent('view.open', {
            viewType,
            ...(fileType ? { fileType } : {}),
            ...properties,
        });
    }

    trackOfficeViewOpen(fsPath: string, route?: string, fileType?: string): void {
        const viewType = resolveOfficeViewType(fsPath, route);
        if (!viewType) {
            return;
        }
        this.trackViewOpen(viewType, fileType || fileTypeFromPath(fsPath));
    }

    trackEvent(event: string, properties?: Record<string, string>): void {
        if (!this.enabled()) {
            return;
        }
        this.reporter!.sendTelemetryEvent(event, properties);
    }

}
