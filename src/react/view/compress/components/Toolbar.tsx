import { FileAddOutlined, FileDoneOutlined } from '@ant-design/icons';
import { Button, Flex, Select } from "antd";
import { handler } from "../../../util/vscode";

export default function Toolbar({ size, currentDir }) {
    return (
        <Flex style={{ padding: '5px', paddingLeft: '10px', backgroundColor: 'white', alignItems: 'center', columnGap: '15px' }}>
            <Button size='middle' icon={<FileAddOutlined />} onClick={() => { handler.emit('addFile', currentDir) }} >
                Add
            </Button>
            <Button type="primary" size='middle' icon={<FileDoneOutlined />} onClick={() => handler.emit('autoExtract')}>
                Extract
            </Button>
            <div >
                <span style={{ fontWeight: 'bold' }}>Size:</span>
                <span style={{ fontWeight: 'bold', marginLeft: '10px', color: 'green' }}>
                    {size}
                </span>
            </div>
            <div >
                <span style={{ fontWeight: 'bold' }}>Encoding:</span>
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