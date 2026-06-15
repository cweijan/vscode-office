import { commands, Disposable, ExtensionContext, languages, Range, TextDocument, Uri, window, workspace } from 'vscode';
import { RestClientSettings } from './models/configurationSettings';
import { CodeSnippetController } from './controllers/codeSnippetController';
import { RequestController } from './controllers/requestController';
import { CustomVariableDiagnosticsProvider } from './providers/customVariableDiagnosticsProvider';
import { RequestBodyDocumentLinkProvider } from './providers/documentLinkProvider';
import { EnvironmentOrFileVariableHoverProvider } from './providers/environmentOrFileVariableHoverProvider';
import { FileVariableDefinitionProvider } from './providers/fileVariableDefinitionProvider';
import { FileVariableReferenceProvider } from './providers/fileVariableReferenceProvider';
import { FileVariableReferencesCodeLensProvider } from './providers/fileVariableReferencesCodeLensProvider';
import { HttpCodeLensProvider } from './providers/httpCodeLensProvider';
import { HttpCompletionItemProvider } from './providers/httpCompletionItemProvider';
import { HttpDocumentSymbolProvider } from './providers/httpDocumentSymbolProvider';
import { RequestVariableCompletionItemProvider } from './providers/requestVariableCompletionItemProvider';
import { RequestVariableDefinitionProvider } from './providers/requestVariableDefinitionProvider';
import { RequestVariableHoverProvider } from './providers/requestVariableHoverProvider';

const documentSelector = [{ language: 'http', scheme: '*' }];

class ConditionalRegistration implements Disposable {
    private registration?: Disposable;

    constructor(
        private readonly register: () => Disposable,
        private readonly isEnabled: () => boolean,
        settings: RestClientSettings,
    ) {
        settings.onDidChangeConfiguration(() => this.update());
        this.update();
    }

    private update() {
        if (this.isEnabled()) {
            if (!this.registration) {
                this.registration = this.register();
            }
        } else if (this.registration) {
            this.registration.dispose();
            this.registration = undefined;
        }
    }

    dispose() {
        this.registration?.dispose();
    }
}

export async function activateHttp(context: ExtensionContext): Promise<void> {
    const settings = RestClientSettings.Instance;
    const requestController = new RequestController(context);
    const codeSnippetController = new CodeSnippetController();

    context.subscriptions.push(
        requestController,
        codeSnippetController,
        commands.registerCommand('vscode-office.request', (_document: TextDocument, range: Range) => requestController.run(range)),
        commands.registerCommand('vscode-office.copy-request-as-curl', (document: TextDocument, range: Range) => codeSnippetController.copyAsCurl(document, range)),
        commands.registerCommand('vscode-office._openDocumentLink', args => {
            workspace.openTextDocument(Uri.parse(args.path)).then(window.showTextDocument, error => {
                window.showErrorMessage(error.message);
            });
        }),
        languages.registerCompletionItemProvider(documentSelector, new HttpCompletionItemProvider()),
        languages.registerCompletionItemProvider(documentSelector, new RequestVariableCompletionItemProvider(), '.'),
        languages.registerHoverProvider(documentSelector, new EnvironmentOrFileVariableHoverProvider()),
        languages.registerHoverProvider(documentSelector, new RequestVariableHoverProvider()),
        languages.registerCodeLensProvider(documentSelector, new HttpCodeLensProvider()),
        new ConditionalRegistration(
            () => languages.registerCodeLensProvider(documentSelector, new FileVariableReferencesCodeLensProvider()),
            () => settings.enableCustomVariableReferencesCodeLens,
            settings,
        ),
        languages.registerDocumentLinkProvider(documentSelector, new RequestBodyDocumentLinkProvider()),
        languages.registerDefinitionProvider(documentSelector, new FileVariableDefinitionProvider()),
        languages.registerDefinitionProvider(documentSelector, new RequestVariableDefinitionProvider()),
        languages.registerReferenceProvider(documentSelector, new FileVariableReferenceProvider()),
        languages.registerDocumentSymbolProvider(documentSelector, new HttpDocumentSymbolProvider()),
        new CustomVariableDiagnosticsProvider(),
    );
}

export function deactivateHttp(): void {
}
