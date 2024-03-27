import ReactDOM from 'react-dom/client';
import { getConfigs } from './util/vscodeConfig.ts';
import ExcelViewer from './view/ExcelViewer.tsx';
import './util/vscode.js'

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
