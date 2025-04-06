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
const FontViewer = lazy(() => import('./view/fontViewer/FontViewer.tsx'))

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
        case 'font':
          return <FontViewer />
        default:
          return <>Office Viewer</>
      }
    })()}
  </ConfigProvider>
)
