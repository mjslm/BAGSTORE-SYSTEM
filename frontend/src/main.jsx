import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { NetworkStatusProvider } from './context/NetworkStatusContext.jsx';
import { NotificationsProvider } from './context/NotificationsContext.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><BrowserRouter><NetworkStatusProvider><AuthProvider><CartProvider><NotificationsProvider>
    <App />
  </NotificationsProvider></CartProvider></AuthProvider></NetworkStatusProvider></BrowserRouter></React.StrictMode>,
);
