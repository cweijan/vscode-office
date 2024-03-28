import { FileAddOutlined, FileDoneOutlined } from '@ant-design/icons';
import { Button } from "antd";
import { handler } from "../../../util/vscode";

export default function Toolbar({ currentDir }) {
    return (
        <div style={{ padding: '5px', backgroundColor: 'white' }}>
            <Button type="primary" size='middle' style={{ marginRight: '10px' }} icon={<FileDoneOutlined />} onClick={() => handler.emit('autoExtract')}>
                Extract
            </Button>
            <Button size='middle' icon={<FileAddOutlined />} onClick={() => { handler.emit('addFile', currentDir) }} >
                Add
            </Button>
        </div>
    )
}