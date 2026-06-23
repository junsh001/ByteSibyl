import React from 'react';
import { createRoot } from 'react-dom/client';
import './monaco-setup';
import App from './App';
import './index.css';
import '@xterm/xterm/css/xterm.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
