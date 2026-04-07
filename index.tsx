import React from 'react';
import ReactDOM from 'react-dom/client';
// Fix: Added .tsx extension to ensure module is found.
import App from './App.tsx';
import { AppProvider } from './context/AppContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);
