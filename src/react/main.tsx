import ReactDOM from 'react-dom/client';
import './util/vscode.js';
import { getConfigs } from './util/vscodeConfig.ts';
import Excel from './view/excel/Excel.tsx';
import Compress from './view/compress/Compress.tsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    {(() => {
      const configs = getConfigs()
      const route = configs?.route
      switch (route) {
        case 'excel':
          return <Excel />
        case 'compress':
          return <Compress />
        default:
          return <>Office Viewer</>
      }
    })()}
  </>
)
