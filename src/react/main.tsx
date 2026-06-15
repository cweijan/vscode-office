import ReactDOM from 'react-dom/client';
import './util/vscode.js';
import { getConfigs } from './util/vscodeConfig.ts';
import './main.css'
import { ConfigProvider } from 'antd';
import { lazy } from 'react';
import { antThemeConfig } from './antThemeConfig.ts';
const Zip = lazy(() => import('./view/compress/Zip.tsx'))
const Excel = lazy(() => import('./view/excel/Excel.tsx'))
const Image = lazy(() => import('./view/image/Image.tsx'))
const Word = lazy(() => import('./view/word/Word.tsx'))
const PowerPoint = lazy(() => import('./view/powerpoint/PowerPoint.tsx'))
const FontViewer = lazy(() => import('./view/fontViewer/FontViewer.tsx'))
const Epub = lazy(() => import('./view/epub/Epub.tsx'))
const IcnsViewer = lazy(() => import('./view/icns/IcnsViewer.tsx'))
const PsdViewer = lazy(() => import('./view/psd/PsdViewer.tsx'))

document.getElementById('_defaultStyles')?.parentNode?.removeChild(document.getElementById('_defaultStyles'))
ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider
    componentSize='small'
    theme={antThemeConfig}
  >
    {(() => {
      const configs = getConfigs()
      const route = configs?.route
      switch (route) {
        case 'image':
          return <Image />
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
        default:
          return <>Office Viewer</>
      }
    })()}
  </ConfigProvider>
)
