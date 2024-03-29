import { FileAddOutlined, FileDoneOutlined } from '@ant-design/icons';
import { Button, Flex, Select } from "antd";
import { handler } from "../../../util/vscode";

export default function Toolbar({ currentDir }) {
    return (
        <Flex justify='space-between' style={{ padding: '5px', backgroundColor: 'white' }}>
            <div>
                <Button type="primary" size='middle' style={{ marginRight: '10px' }} icon={<FileDoneOutlined />} onClick={() => handler.emit('autoExtract')}>
                    Extract
                </Button>
                <Button size='middle' icon={<FileAddOutlined />} onClick={() => { handler.emit('addFile', currentDir) }} >
                    Add
                </Button>
            </div>
            <div>
                Encoding:
                <Select
                    defaultValue="utf8"
                    size='middle'
                    style={{ width: 120, marginLeft: '15px', marginRight: '20px' }}
                    onChange={(value) => handler.emit('changeEncoding', value)}
                    options={[
                        { value: 'gbk', label: 'GBK' },
                        { value: 'utf8', label: 'UTF-8' },
                    ]}
                />
            </div>
        </Flex>
    )
}