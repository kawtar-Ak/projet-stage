import React from 'react';
import ReactDOM from 'react-dom/client';
import './api/axiosConfig';
import './theme.css';   // style principal (RTL, menu à droite, etc.)
import App from './App';
import './i18n';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
