import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './assets/global.css';
import { DashboardRefreshProvider } from './context/DashboardRefreshContext';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <DashboardRefreshProvider>
        <App />
      </DashboardRefreshProvider>
    </AuthProvider>
  </React.StrictMode>,
);