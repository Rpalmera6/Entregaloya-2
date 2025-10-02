// src/components/Layout.tsx
import React, { ReactNode, useState } from 'react';
import './layout.css';

interface LayoutProps {
  children: ReactNode;
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
  onSearchClick: () => void;
  onGoHome: () => void;
  user?: {
    id?: number;
    nombre?: string;
    tipo?: string;
    [key: string]: any;
  } | null;
  onLogout?: () => void;
  onGoDashboard?: () => void; // nueva prop
}

const Layout = ({
  children,
  onSwitchToLogin,
  onSwitchToRegister,
  onSearchClick,
  onGoHome,
  user = null,
  onLogout,
  onGoDashboard
}: LayoutProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleSearchClick = (e: React.MouseEvent) => { e.preventDefault(); onSearchClick(); setIsMenuOpen(false); };
  const handleGoHome = (e: React.MouseEvent) => { e.preventDefault(); onGoHome(); setIsMenuOpen(false); };
  const handleLoginClick = (e: React.MouseEvent) => { e.preventDefault(); onSwitchToLogin(); setIsMenuOpen(false); };
  const handleRegisterClick = (e: React.MouseEvent) => { e.preventDefault(); onSwitchToRegister(); setIsMenuOpen(false); };
  const handleLogoutClick = (e: React.MouseEvent) => { e.preventDefault(); if (onLogout) onLogout(); setIsMenuOpen(false); };

  // delega la decisión de a qué dashboard ir a App (onGoDashboard)
  const handleUserClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onGoDashboard) onGoDashboard();
    else onGoHome();
    setIsMenuOpen(false);
  };

  return (
    <div className="layout-container">
      <nav className="navbar">
        <div className="logo" onClick={handleGoHome} style={{ cursor: 'pointer' }}>
          {/* <img src="/logo.png"/> */}
          <span>EntregaloYA</span>
        </div>

        <div className="menu-toggle" onClick={toggleMenu}>
          <div className="hamburger"></div>
          <div className="hamburger"></div>
          <div className="hamburger"></div>
        </div>

        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          <a href="#" onClick={handleSearchClick}>Buscar Negocios</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Preguntas Frecuentes</a>

          <div className="nav-actions-mobile">
            {!user ? (
              <>
                <button className="btn-login" onClick={handleLoginClick}>Iniciar Sesión</button>
                <button className="btn-register" onClick={handleRegisterClick}>Regístrate</button>
              </>
            ) : (
              <>
                <div className="mobile-user">
                  <a href="#" onClick={handleUserClick} style={{ textDecoration: 'none', color: 'inherit' }}>
                    Hola, {user.nombre}
                  </a>
                </div>
                <button className="btn-logout" onClick={handleLogoutClick}>Cerrar sesión</button>
              </>
            )}
          </div>
        </div>

        <div className="nav-actions">
          {!user ? (
            <>
              <button className="btn-login" onClick={handleLoginClick}>Iniciar Sesión</button>
              <button className="btn-register" onClick={handleRegisterClick}>Regístrate</button>
            </>
          ) : (
            <>
              <a
                href="#"
                onClick={handleUserClick}
                style={{ marginRight: 12, textDecoration: 'none', color: 'inherit', fontWeight: 600 }}
              >
                Hola, {user.nombre}
              </a>
              <button onClick={handleLogoutClick}>Cerrar sesión</button>
            </>
          )}
        </div>
      </nav>

      <main className="page-content">
        <div className="container">{children}</div>
      </main>

      <footer className="main-footer">
        <p>© 2025 EntregaloYa. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default Layout;
