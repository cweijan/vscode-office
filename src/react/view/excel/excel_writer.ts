import { TableDataCell } from "@antv/s2";
import { handler } from "../../util/vscode";

export function copyCells(selectedCells: TableDataCell[]) {
    const lines: string[] = []
    let line = '';
    let previousPosition: number;
    selectedCells.forEach(cell => {
        const ln = cell.getPosition()[0];
        if (previousPosition != null && previousPosition != ln) {
            lines.push(line);
            line = '';
        }
        line += `${cell.getOriginalText()},`
        previousPosition = ln;
    });
    if (line) lines.push(line);
    handler.emit('copy', lines.map(line => line.replace(/,$/, '')).join('\n'));
}