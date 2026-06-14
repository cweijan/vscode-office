import { FileAddOutlined, FileDoneOutlined, FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Input, Select } from "antd";
import { useState } from 'react';
import { handler } from "../../../util/vscode";

export default function Toolbar({ size, currentDir, extension, passwordEnabled, encrypted, onPasswordApply }) {
    const editable = !extension || extension === 'zip';
    const encodingEnabled = editable || extension === '7z';
    const [password, setPassword] = useState('');

    const applyPassword = () => onPasswordApply(password);

    return (
        <div className="zip-toolbar">
            <div className="zip-toolbar-left">
                <Button size="middle" title="Show In Explorer" icon={<FolderOpenOutlined />} onClick={() => handler.emit('showInExplorer')} />
                <Button size="middle" title="Reload" icon={<ReloadOutlined />} onClick={() => handler.emit('init')} />
                {editable && (
                    <Button size="middle" icon={<FileAddOutlined />} onClick={() => handler.emit('addFile', currentDir)}>
                        Add
                    </Button>
                )}
                <Button type="primary" size="middle" icon={<FileDoneOutlined />} onClick={() => handler.emit('autoExtract')}>
                    Extract
                </Button>
            </div>

            <div className="zip-toolbar-center">
                {currentDir ? <span className="zip-path" title={currentDir}>/{currentDir}</span> : null}
            </div>

            <div className="zip-toolbar-right">
                {passwordEnabled && (
                    <>
                        <span className="zip-password-label" style={{ fontWeight: 600, color: encrypted ? '#d4380d' : 'rgb(120 120 120)' }}>
                            Password
                        </span>
                        <Input.Password
                            size="middle"
                            value={password}
                            placeholder={encrypted ? 'Required' : 'Optional'}
                            style={{ width: 140 }}
                            onChange={(e) => setPassword(e.target.value)}
                            onPressEnter={applyPassword}
                            onBlur={applyPassword}
                        />
                    </>
                )}
                <span className="zip-size">
                    <span className="zip-size-label">Size</span>
                    <span className="zip-size-value">{size}</span>
                </span>
                {encodingEnabled && (
                    <>
                        <span style={{ fontWeight: 600, color: 'rgb(120 120 120)' }}>Encoding</span>
                        <Select
                            defaultValue="utf8"
                            size="middle"
                            style={{ width: 120 }}
                            onChange={(value) => handler.emit('changeEncoding', value)}
                            options={[
                                { value: 'gbk', label: 'GBK' },
                                { value: 'utf8', label: 'UTF-8' },
                            ]}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
