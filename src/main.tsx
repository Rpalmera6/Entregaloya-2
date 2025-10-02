import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App'
import './index.css'


// 🌟 CAMBIO PRINCIPAL: Eliminada la segunda llamada a ReactDOM.createRoot
// La aplicación completa debe estar envuelta en <BrowserRouter> y renderizada una sola vez.

// Esta es la llamada correcta y única:
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 🌟 EL COMPONENTE DEBE ESTAR AQUÍ */}
    <BrowserRouter> 
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);