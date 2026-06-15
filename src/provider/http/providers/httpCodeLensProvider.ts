import { CancellationToken, CodeLens, CodeLensProvider, Command, Range, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { Selector } from '../utils/selector';

export class HttpCodeLensProvider implements CodeLensProvider {
    public provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
        const blocks: CodeLens[] = [];
        const lines: string[] = document.getText().split(Constants.LineSplitterRegex);
        const requestRanges: [number, number][] = Selector.getRequestRanges(lines);

        for (const [blockStart, blockEnd] of requestRanges) {
            const range = new Range(blockStart, 0, blockEnd, 0);
            const sendCmd: Command = {
                arguments: [document, range],
                title: '$(run) Send',
                command: 'vscode-office.request'
            };
            blocks.push(new CodeLens(range, sendCmd));

            const curlCmd: Command = {
                arguments: [document, range],
                title: 'Copy as cURL',
                command: 'vscode-office.copy-request-as-curl'
            };
            blocks.push(new CodeLens(range, curlCmd));
        }

        return Promise.resolve(blocks);
    }
}