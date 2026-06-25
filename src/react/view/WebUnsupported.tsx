import { WarningOutlined } from '@ant-design/icons';
import { getConfigs } from '../util/vscodeConfig';
import { $t } from '../i18n/i18nConfig';
import './WebUnsupported.css';

export default function WebUnsupported() {
	const configs = getConfigs();
	const fileName = configs?.fileName ?? '';

	return (
		<div className="web-unsupported office-viewer-themed">
			<div className="web-unsupported-panel">
				<WarningOutlined className="web-unsupported-icon" aria-hidden />
				<h1 className="web-unsupported-title">
					{$t('webUnsupported.title')}
				</h1>
				<p className="web-unsupported-desc">
					{$t('webUnsupported.desc')}
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
