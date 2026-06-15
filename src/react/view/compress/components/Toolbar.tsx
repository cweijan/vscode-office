import { type ReactNode } from 'react';
import { handler } from '../../../util/vscode';
import { IconExtract, IconFileAdd, IconFolderOpen, IconReload } from '../icons';

interface ToolbarProps {
    size: string;
    currentDir: string;
    extension: string;
    onExtract: () => void;
}

function ToolbarButton({ title, onClick, primary, children }: {
    title: string;
    onClick: () => void;
    primary?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            className={`zip-btn${primary ? ' zip-btn-primary' : ''}`}
            title={title}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

export default function Toolbar({ size, currentDir, extension, onExtract }: ToolbarProps) {
    const editable = !extension || extension === 'zip';
    const encodingEnabled = editable || extension === '7z';

    return (
        <header className="zip-toolbar">
            <div className="zip-toolbar-left">
                <ToolbarButton title="Show In Explorer" onClick={() => handler.emit('showInExplorer')}>
                    <IconFolderOpen size={15} />
                </ToolbarButton>
                <ToolbarButton title="Reload" onClick={() => handler.emit('init')}>
                    <IconReload size={15} />
                </ToolbarButton>
                {editable && (
                    <ToolbarButton title="Add file" onClick={() => handler.emit('addFile', currentDir)}>
                        <IconFileAdd size={15} />
                        <span>Add</span>
                    </ToolbarButton>
                )}
                <ToolbarButton title="Extract" primary onClick={onExtract}>
                    <IconExtract size={15} />
                    <span>Extract</span>
                </ToolbarButton>
            </div>

            <div className="zip-toolbar-center">
                {currentDir ? (
                    <span className="zip-path" title={currentDir}>/{currentDir}</span>
                ) : null}
            </div>

            <div className="zip-toolbar-right">
                <span className="zip-size">
                    <span className="zip-size-label">Size</span>
                    <span className="zip-size-value">{size}</span>
                </span>
                {encodingEnabled && (
                    <div className="zip-encoding-group">
                        <span className="zip-encoding-label">Encoding</span>
                        <select
                            className="zip-select"
                            defaultValue="utf8"
                            onChange={(e) => handler.emit('changeEncoding', e.target.value)}
                        >
                            <option value="gbk">GBK</option>
                            <option value="utf8">UTF-8</option>
                        </select>
                    </div>
                )}
            </div>
        </header>
    );
}
