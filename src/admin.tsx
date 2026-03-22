import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp';

const rootElement = document.getElementById('admin-root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<AdminApp />);
}
