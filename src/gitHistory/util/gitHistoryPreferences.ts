import * as vscode from 'vscode';

export type FileHistorySplitLayout = 'vertical' | 'horizontal';

export const DEFAULT_FILE_HISTORY_SPLIT_LAYOUT: FileHistorySplitLayout = 'vertical';

const FILE_HISTORY_SPLIT_LAYOUT_KEY = 'office.gitHistory.fileSplitLayout';

export function getFileHistorySplitLayout(context: vscode.ExtensionContext): FileHistorySplitLayout {
    const value = context.globalState.get<FileHistorySplitLayout>(FILE_HISTORY_SPLIT_LAYOUT_KEY);
    return value === 'horizontal' ? 'horizontal' : 'vertical';
}

export async function setFileHistorySplitLayout(
    context: vscode.ExtensionContext,
    layout: FileHistorySplitLayout,
): Promise<void> {
    await context.globalState.update(FILE_HISTORY_SPLIT_LAYOUT_KEY, layout);
}
