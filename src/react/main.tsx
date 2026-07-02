import './polyfills/buffer';
import ReactDOM from 'react-dom/client';
import './util/vscode.js';
import { getConfigs } from './util/vscodeConfig.ts';
import { initI18n, $t } from './i18n/i18nConfig.ts';
import './main.css'
import { ConfigProvider } from 'antd';
import { lazy } from 'react';
import { antThemeConfig } from './antThemeConfig.ts';
import GitHistory from './view/gitHistory/GitHistory.tsx';
const Zip = lazy(() => import('./view/compress/Zip.tsx'))
const Excel = lazy(() => import('./view/excel/Excel.tsx'))
const Image = lazy(() => import('./view/image/Image.tsx'))
const SvgViewer = lazy(() => import('./view/svg/SvgViewer.tsx'))
const Word = lazy(() => import('./view/word/Word.tsx'))
const PowerPoint = lazy(() => import('./view/powerpoint/PowerPoint.tsx'))
const FontViewer = lazy(() => import('./view/fontViewer/FontViewer.tsx'))
const Epub = lazy(() => import('./view/epub/Epub.tsx'))
const IcnsViewer = lazy(() => import('./view/icns/IcnsViewer.tsx'))
const PsdViewer = lazy(() => import('./view/psd/PsdViewer.tsx'))
const XmindViewer = lazy(() => import('./view/xmind/XmindViewer.tsx'))
const Parquet = lazy(() => import('./view/parquet/Parquet.tsx'))
const WebUnsupported = lazy(() => import('./view/WebUnsupported.tsx'))

document.getElementById('_defaultStyles')?.parentNode?.removeChild(document.getElementById('_defaultStyles'))
const configs = getConfigs();
initI18n(configs?.language);

export default function App() {
  const route = configs?.route
  switch (route) {
    case 'image':
      return <Image />
    case 'svg':
      return <SvgViewer />
    case 'excel':
      return <Excel />
    case 'zip':
      return <Zip />
    case 'word':
      return <Word />
    case 'ppt':
      return <PowerPoint />
    case 'font':
      return <FontViewer />
    case 'epub':
      return <Epub />
    case 'icns':
      return <IcnsViewer />
    case 'psd':
      return <PsdViewer />
    case 'xmind':
      return <XmindViewer />
    case 'parquet':
      return <Parquet />
    case 'gitHistory':
      return <GitHistory />
    case 'webUnsupported':
      return <WebUnsupported />
    default:
      return <>{$t('common.officeViewer')}</>
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider
    componentSize='small'
    theme={antThemeConfig}
  >
    <App />
  </ConfigProvider>
)
