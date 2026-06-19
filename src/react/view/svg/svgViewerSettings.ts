import { vscodeApi } from '../../util/vscode';

const LINE_WRAP_KEY = 'office-svg-line-wrap';

export function loadSvgLineWrap(): boolean {
    const state = vscodeApi?.getState?.() as { svgLineWrap?: boolean } | undefined;
    if (state?.svgLineWrap !== undefined) {
        return state.svgLineWrap;
    }
    try {
        return localStorage.getItem(LINE_WRAP_KEY) === '1';
    } catch {
        return false;
    }
}

export function saveSvgLineWrap(enabled: boolean): void {
    try {
        localStorage.setItem(LINE_WRAP_KEY, enabled ? '1' : '0');
    } catch { }
    if (vscodeApi?.setState) {
        const prev = (vscodeApi.getState?.() ?? {}) as Record<string, unknown>;
        vscodeApi.setState({ ...prev, svgLineWrap: enabled });
    }
}
