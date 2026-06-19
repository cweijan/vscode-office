import { FormattingOptions } from 'vscode';
import { PrettyData, pd } from '../../http/utils/pretty-data';

function getIndentStep(options?: FormattingOptions): string {
    if (options?.insertSpaces === false) {
        return '\t';
    }
    return ' '.repeat(options?.tabSize ?? 2);
}

export function formatXml(text: string, options?: FormattingOptions): string {
    if (!text.trim()) {
        return text;
    }
    const step = getIndentStep(options);
    const formatter = step === '  ' ? pd : new PrettyData(step);
    return formatter.xml(text);
}
