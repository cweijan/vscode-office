import React from 'react'
import ReactDOM from 'react-dom/client'
import ExcelViewer from './view/ExcelViewer.jsx'

import {
  createBrowserRouter,
  RouterProvider,
  Link,
} from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <div style={{ 'text-align': 'center' }}>
        <h1>Hello World</h1>
        <Link to="about">About Us</Link>
      </div>
    ),
  },
  { path: "about", element: <div>About</div>, },
  { path: "excel", element: <ExcelViewer />, },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)
