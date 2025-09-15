
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure we get the root element and explicitly cast as HTMLElement
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

// Create the root and render
createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
