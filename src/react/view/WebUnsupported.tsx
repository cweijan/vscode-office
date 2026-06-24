import { WarningOutlined } from '@ant-design/icons';
import { getConfigs } from '../util/vscodeConfig';
import './WebUnsupported.css';

export default function WebUnsupported() {
	const configs = getConfigs();
	const fileName = configs?.fileName ?? '';
	const language = (configs?.language ?? '').toLowerCase();
	const isZh = language.startsWith('zh');

	return (
		<div className="web-unsupported office-viewer-themed">
			<div className="web-unsupported-panel">
				<WarningOutlined className="web-unsupported-icon" aria-hidden />
				<h1 className="web-unsupported-title">
					{isZh ? '无法在 Web 环境预览' : 'Preview not available on Web'}
				</h1>
				<p className="web-unsupported-desc">
					{isZh
						? '该文件类型当前不支持在 VS Code Web（浏览器）中预览，请在桌面版 VS Code 中打开。'
						: 'This file type cannot be previewed in VS Code for the Web. Please open it in desktop VS Code.'}
				</p>
				{fileName ? (
					<span className="web-unsupported-file" title={fileName}>
						{fileName}
					</span>
				) : null}
			</div>
		</div>
	);
}
