import { Button } from "antd"
import { SearchOutlined } from '@ant-design/icons';
import { handler } from "../../../util/vscode";

export default function Toolbar() {
    // const props = defineProps({ currentDir: String })
    return (
        <div style={{ paddingTop: '10px' }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => handler.emit('autoExtract')}>
                Extract
            </Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => { handler.emit('addFile', 'props.currentDir') }} >
                Add
            </Button>
        </div>
    )
}