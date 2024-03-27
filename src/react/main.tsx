import ReactDOM from 'react-dom/client';
import './util/vscode.js';
import { getConfigs } from './util/vscodeConfig.ts';
import Excel from './view/excel/Excel.tsx';
import Zip from './view/compress/Zip.tsx';
import './main.css'

document.getElementById('_defaultStyles').parentNode.removeChild(document.getElementById('_defaultStyles'))
ReactDOM.createRoot(document.getElementById('root')).render(
  <>
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
  </>
)
