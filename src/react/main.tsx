import ReactDOM from 'react-dom/client';
import './util/vscode.js';
import { getConfigs } from './util/vscodeConfig.ts';
import Excel from './view/excel/Excel.tsx';
import Zip from './view/compress/Zip.tsx';
import './main.css'
import { ConfigProvider } from 'antd';

document.getElementById('_defaultStyles').parentNode.removeChild(document.getElementById('_defaultStyles'))
ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider componentSize='small'>
    {(() => {
      const configs = getConfigs()
      const route = configs?.route
      switch (route) {
        case 'excel':
          return <Excel />
        case 'zip':
          return <Zip />
        default:
          return <>Office Viewer</>
      }
    })()}
  </ConfigProvider>
)
