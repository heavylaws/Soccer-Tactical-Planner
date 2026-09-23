import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Dev only: the AI Studio preview's dev server drops its HMR WebSocket from time to time.
// Those benign disconnects surface as unhandled rejections; hide them so real errors stand out.
// (Moved here from an inline <script> in index.html so production can use a strict CSP.)
if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const text = String(reason?.message ?? reason ?? '');
    if (text.includes('WebSocket') || text.includes('ws:') || text.includes('wss:')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
