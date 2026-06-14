import { Layout } from 'antd';
import { useEffect, useState } from 'react';
import { handler } from '../../util/vscode';
import FileItems from './components/FileItems';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import './Zip.less';
import { CompressInfo, FileInfo } from './zipTypes';

const { Sider, Content } = Layout;

export default function Zip() {
    const [currentDir, setCurrentDir] = useState('')
    const [size, setSize] = useState('')
    const [extension, setExtension] = useState('')
    const [passwordEnabled, setPasswordEnabled] = useState(false)
    const [encrypted, setEncrypted] = useState(false)
    const [tableItems, setTableItems] = useState([] as FileInfo[])
    const [info, setInfo] = useState({ files: [] } as CompressInfo)

    const changeFiles = (dirPath: string) => {
        setCurrentDir(dirPath)
        setTableItems(dirPath ? [
            {
                name: '..',
                isDirectory: true,
                entryName: dirPath.includes('/') ? dirPath.replace(/\/[^\/]+$/, '') : null,
            },
            ...info.folderMap[dirPath].children
        ] : info.files)
    }

    handler
        .on('size', (size: string) => {
            setSize(size)
        })
        .on('extension', (extension: string) => {
            setExtension(extension)
            setPasswordEnabled(false)
            setEncrypted(false)
        })
        .on('passwordEnabled', () => {
            setPasswordEnabled(true)
        })
        .on('encrypted', (value: boolean) => {
            setEncrypted(value)
        })
        .on('data', (info: CompressInfo) => {
            setInfo(info)
            setTableItems(info.files)
        })
        .on('openDir', changeFiles)

    useEffect(() => {
        handler
            .on('zipChange', () => handler.emit('init'))
            .emit('init')
    }, [])

    return (
        <Layout className="zip-viewer">
            <Toolbar
                currentDir={currentDir}
                size={size}
                extension={extension}
                passwordEnabled={passwordEnabled}
                encrypted={encrypted}
                onPasswordApply={(password) => handler.emit('changePassword', password)}
            />
            <Layout className="zip-body">
                <Sider width={260} className="zip-sider" theme="light">
                    <Sidebar name={info.fileName} items={info.files} currentDir={currentDir} OnClickFolder={changeFiles} />
                </Sider>
                <Content className="zip-content">
                    <FileItems items={tableItems} />
                </Content>
            </Layout>
        </Layout>
    )
}
