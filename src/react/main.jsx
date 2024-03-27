import React from 'react';
import ReactDOM from 'react-dom/client';
import { getConfigs } from './util/vscodeConfig.js';
import ExcelViewer from './view/ExcelViewer.jsx';
import { getVSCodeEvent } from './util/vscode.js'

window.vscodeEvent = getVSCodeEvent()
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
