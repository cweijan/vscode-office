import { Flex, Layout } from 'antd';
import { useEffect, useState } from 'react';
import { handler } from '../../util/vscode';
import FileItems from './components/FileItems';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import { CompressInfo, FileInfo } from './zipTypes';

const { Sider, Content } = Layout;
export default function Zip() {
    const [currentDir, setCurrentDir] = useState('')
    const [tableItems, setTableItems] = useState([] as FileInfo[])
    const [info, setInfo] = useState({ files: [] } as CompressInfo)
    const changeFiles = (dirPath: string) => {
        setCurrentDir(dirPath)
        setTableItems(dirPath ? [
            {
                name: '..',
                isDirectory: true,
                entryName: dirPath.includes('/') ? dirPath.replace(/\/.+$/, '') : null,
            },
            ...info.folderMap[dirPath].children
        ] : info.files)
    }
    handler
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
        <Flex gap="middle" wrap="wrap">
            <Layout >
                <Toolbar currentDir={currentDir} />
                <Layout style={{backgroundColor:'white'}}>
                    <Sider width="25%" style={{ backgroundColor: 'transparent' }}>
                        <Sidebar name={info.fileName} items={info.files} currentDir={currentDir} OnClickFolder={changeFiles} />
                    </Sider>
                    <Content > <FileItems items={tableItems} /> </Content>
                </Layout>
            </Layout>
        </Flex>
    )
}