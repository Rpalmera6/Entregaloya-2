// src/App.tsx
import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import SearchResults from './components/SearchResults';
import Layout from './components/Layout';
import DashboardCliente from './components/DashboardCliente';
import DashboardNegocio from './components/DashboardNegocio';
import EditProfile from './components/EditProfile';
import BusinessProfile from './components/BusinessProfile';
import PedidoForm from './components/PedidoForm';
import PedidoConfirm from './components/PedidoConfirm';
import { BrowserRouter } from 'react-router-dom';
import './forms.css';

// 🌟 Exportamos UserType para poder usarlo en EditProfile.tsx
export type UserType = {
  id: number;
  nombre: string;
  tipo: 'cliente' | 'negocio' | string;
  telefono: string;
  [key: string]: any;
};

type OptionalUserType = UserType | null;

function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [user, setUser] = useState<OptionalUserType>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);

  // Carga user al montar
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed: OptionalUserType = JSON.parse(raw);
      if (parsed && parsed.id) { 
        setUser(parsed);

        const redirect = localStorage.getItem('redirect');
        if (redirect) {
          setCurrentPage(redirect);
          localStorage.removeItem('redirect');
          return;
        }

        if (parsed.tipo === 'negocio') setCurrentPage('dashboard-negocio');
        else setCurrentPage('dashboard-cliente');
      } else {
        localStorage.removeItem('user');
      }
    } else {
      try {
        const m = window.location.pathname.match(/^\/negocios\/(\d+)/);
        if (m) {
          setSelectedBusinessId(Number(m[1]));
          setCurrentPage('business-profile');
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // LISTENER GLOBAL: abrir perfil de negocio (desde otros componentes)
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const ce = ev as CustomEvent<{ id: number }>;
        const id = ce?.detail?.id;
        if (id) {
          setSelectedBusinessId(Number(id));
          setCurrentPage('business-profile');
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('open-business-profile', handler as EventListener);
    return () => window.removeEventListener('open-business-profile', handler as EventListener);
  }, []);

  // LISTENER GLOBAL: abrir formulario de pedido (desde BusinessModal)
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const ce = ev as CustomEvent<{ id?: number }>;
        const id = ce?.detail?.id;
        if (typeof id === 'number') setSelectedBusinessId(Number(id));
        setCurrentPage('pedido');
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('open-pedido', handler as EventListener);
    return () => window.removeEventListener('open-pedido', handler as EventListener);
  }, []);

  const handlePageChange = (page: string) => setCurrentPage(page);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('home');
  };

  const goToDashboard = () => {
    if (!user) return;
    if (user.tipo === 'negocio') setCurrentPage('dashboard-negocio');
    else setCurrentPage('dashboard-cliente');
  };

  const categorias = [
    { id: 1, nombre: 'Restaurantes' },
    { id: 2, nombre: 'Tiendas de Ropa' },
    { id: 3, nombre: 'Panaderías' },
  ];

  const openBusinessProfile = (id: number) => {
    setSelectedBusinessId(id);
    setCurrentPage('business-profile');
    try {
      window.history.pushState({}, '', `/negocios/${id}`);
    } catch (e) { /* noop */ }
  };

  const openPedido = (negocioId?: number | null) => {
    if (typeof negocioId === 'number') setSelectedBusinessId(negocioId);
    setCurrentPage('pedido');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home user={user} onOpenProfile={openBusinessProfile} />;
      case 'login':
        return <Login onSwitchToRegister={() => handlePageChange('register')} />;
      case 'register':
        return (
          <Register
            categorias={categorias}
            onSwitchToLogin={() => handlePageChange('login')}
          />
        );
      case 'search':
        return <SearchResults />;
      case 'dashboard-cliente':
        // 🌟 Verificación de user no nulo.
        if (user && user.tipo === 'cliente') {
          // 🌟 Se usan las funciones inline para satisfacer a TypeScript
          return <DashboardCliente 
            user={user} 
            onLogout={handleLogout} 
            onEditProfile={() => setCurrentPage('editar-perfil')} 
          />;
        }
        break;
      case 'dashboard-negocio':
        // 🌟 Verificación de user no nulo.
        if (user && user.tipo === 'negocio') {
          // 🌟 Se usan las funciones inline para satisfacer a TypeScript
          return <DashboardNegocio 
            user={user} 
            onLogout={handleLogout} 
            onEditProfile={() => setCurrentPage('editar-perfil')} 
          />;
        }
        break;
      case 'editar-perfil':
        // 🌟 Verificación de user no nulo.
        if (user) {
          // 🌟 Soluciona el error de "tipos de parámetros 'id' y 'user' no son compatibles"
          return <EditProfile 
            user={user} 
            onSaved={(u) => { 
                setUser(u); 
                localStorage.setItem('user', JSON.stringify(u)); 
                setCurrentPage('home'); 
            }} 
          />;
        }
        break;
      case 'business-profile':
        return <BusinessProfile negocioId={selectedBusinessId} />;
      case 'pedido':
        return (
          <PedidoForm
            negocioId={selectedBusinessId}
            onSuccess={(pedidoId: number | null, waUrl?: string | null) => {
              setSelectedPedidoId(pedidoId ?? null);
              setCurrentPage('pedido-confirm');
              if (waUrl) window.open(waUrl, '_blank');
            }}
            onCancel={() => setCurrentPage('home')}
          />
        );
      case 'pedido-confirm':
        return <PedidoConfirm pedidoId={selectedPedidoId} />;
      default:
        return <Home user={user} onOpenProfile={openBusinessProfile} />;
    }
    // Si la verificación falla, regresa a Home.
    return <Home user={user} onOpenProfile={openBusinessProfile} />;
  };

  return (
    <div className="App">
      <Layout
        onSwitchToLogin={() => handlePageChange('login')}
        onSwitchToRegister={() => handlePageChange('register')}
        onSearchClick={() => handlePageChange('search')}
        onGoHome={() => handlePageChange('home')}
        user={user}
        onLogout={handleLogout}
        onGoDashboard={goToDashboard}
      >
        {renderPage()}
      </Layout>
    </div>
  );
}

export default App;