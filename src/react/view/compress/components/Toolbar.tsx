import { FileAddOutlined, FileDoneOutlined } from '@ant-design/icons';
import { Button } from "antd";
import { handler } from "../../../util/vscode";

export default function Toolbar() {
    return (
        <div style={{ paddingTop: '10px' }}>
            <Button type="primary" style={{marginRight:'10px'}} icon={<FileDoneOutlined />} onClick={() => handler.emit('autoExtract')}>
                Extract
            </Button>
            <Button icon={<FileAddOutlined />} onClick={() => { handler.emit('addFile', 'props.currentDir') }} >
                Add
            </Button>
        </div>
    )
}