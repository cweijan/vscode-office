import { Flex, Layout } from 'antd';
import { useEffect, useState } from 'react';
import { handler } from '../../util/vscode';
import FileItems from './components/FileItems';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';

const { Sider, Content } = Layout;
export default function Zip() {

    const [name, setName] = useState('')
    const [items, setItems] = useState([])
    const [tableItems, setTableItems] = useState([] as any)
    const [currentDir, setCurrentDir] = useState('')
    const [folderMapping, setFolderMapping] = useState({} as any)

    const changeFiles = (dirPath: string) => {
        // sidebarRef.value.expandPath(dirPath)
        setCurrentDir(dirPath)
        setTableItems([
            {
                name: '..',
                isDirectory: true,
                entryName: dirPath.includes('/') ? dirPath.replace(/\/.+$/, '') : null,
            },
            ...folderMapping[dirPath].children
        ])
    }

    useEffect(() => {
        handler
            .on('data', ({ fileName, files, folderMap }) => {
                setName(fileName)
                setFolderMapping(folderMap)
                if (currentDir) {
                    changeFiles(currentDir)
                } else {
                    setItems(files)
                    setTableItems(files)
                }
            })
            .on('openDir', changeFiles)
            .on('zipChange', () => handler.emit('init'))
            .emit('init')
    }, [])
    return (
        <Flex gap="middle" wrap="wrap">
            <Layout >
                <Toolbar />
                <Layout>
                    <Sider width="25%" style={{ backgroundColor: 'transparent' }}> <Sidebar name={name} items={items} currentDir={currentDir} OnClickFolder={changeFiles} /> </Sider>
                    <Content > <FileItems items={tableItems} /> </Content>
                </Layout>
            </Layout>
        </Flex>
    )
}