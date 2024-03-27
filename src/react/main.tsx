import ReactDOM from 'react-dom/client';
import './util/vscode.js';
import { getConfigs } from './util/vscodeConfig.ts';
import ExcelViewer from './view/ExcelViewer.tsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    {(() => {
      const configs = getConfigs()
      const route = configs?.route
      switch (route) {
        case 'excel':
          return <ExcelViewer />
        default:
          return <>Office Viewer</>
      }
    })()}
  </>
)
