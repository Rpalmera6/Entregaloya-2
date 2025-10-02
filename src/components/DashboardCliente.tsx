// src/components/DashboardCliente.tsx
import React, { useState, useEffect } from 'react';
import './DashboardCliente.css';
// ❌ ELIMINADO: import { useNavigate } from 'react-router-dom'; // ¡Eliminamos useNavigate!

// URL base de tu API de Flask
const API_BASE = 'http://127.0.0.1:5000';

// 🌟 Definición de UserType
type UserType = {
  id: number;
  nombre: string;
  telefono: string;
  tipo: 'cliente' | 'negocio' | string;
  ciudad?: string;
  barrio?: string;
  codigo_postal?: string;
  direccion_exacta?: string;
  imagen_url?: string;
  [k: string]: any;
};

// 🌟 INTERFAZ DE PROPS
interface DashboardClienteProps {
  user: UserType;
  onLogout: () => void;
  onEditProfile: () => void;
}

// Interfaz que refleja la estructura de la tabla 'pedidos' con JOINS
interface Pedido {
  id: number;
  negocio_id: number;
  producto_id: number | null;
  mensaje: string;
  estado: 'pendiente' | 'confirmado' | 'cancelado';
  fecha: string; // La fecha viene como string desde la API (timestamp/ISO)
  respuesta: string | null; // Respuesta del negocio
  cantidad: number; 
  negocio_nombre: string;
  negocio_telefono: string;
  producto_nombre: string | null;
}

// Interfaz para la respuesta de la API
interface PedidosResponse {
  ok: boolean;
  pedidos: Pedido[];
}

// 🌟 Aceptar props en lugar de usar useContext.
const DashboardCliente: React.FC<DashboardClienteProps> = ({ user, onLogout, onEditProfile }) => {
  // ❌ ELIMINADO: const navigate = useNavigate(); // ¡Ya no se necesita!
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 🌟 La verificación de tipo es crucial para la navegación
    if (!user || user.tipo !== 'cliente') {
      // 🌟 CAMBIO: Eliminada la llamada a navigate('/'). 
      // Ahora usamos onLogout para que App.tsx nos saque de esta página.
      onLogout(); 
      return;
    }
    fetchPedidos();
  }, [user, onLogout]); // 🌟 Dependencia 'navigate' eliminada

  const fetchPedidos = async () => {
    // Ya que 'user' es una prop, no es nulo aquí, pero comprobamos el tipo por seguridad.
    if (user.tipo !== 'cliente') return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/pedidos/cliente/${user.id}`);
      const data: PedidosResponse = await response.json();

      if (data.ok) {
        setPedidos(data.pedidos);
      } else {
        setError('Error al cargar pedidos.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // ... (handleEdit y handleDelete se mantienen igual)
  const handleEdit = (pedido: Pedido) => {
    if (pedido.estado !== 'pendiente') {
      alert('❌ Solo puedes editar pedidos que están en estado "pendiente".');
      return;
    }

    const nuevoMensaje = prompt('Edita el mensaje de tu pedido:', pedido.mensaje);
    if (nuevoMensaje === null) return; 

    const nuevaCantidadStr = prompt(`Edita la cantidad para ${pedido.producto_nombre || 'el artículo'} (actual: ${pedido.cantidad || 1}):`, String(pedido.cantidad));
    if (nuevaCantidadStr === null) return;

    const nuevaCantidad = parseInt(nuevaCantidadStr, 10);
    
    // Validaciones
    if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
      alert('🛑 La cantidad debe ser un número positivo.');
      return;
    }
    
    // Si no hubo cambios reales
    if (nuevoMensaje.trim() === pedido.mensaje && nuevaCantidad === pedido.cantidad) return; 

    // Llamada a la API PUT
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pedidos/${pedido.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            mensaje: nuevoMensaje.trim(), 
            cantidad: nuevaCantidad 
          }),
        });
        const json = await res.json().catch(() => ({}));
        
        if (res.ok && json.ok) {
          // Actualizar el estado local
          setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, mensaje: nuevoMensaje.trim(), cantidad: nuevaCantidad } : p));
          alert('✅ Pedido actualizado con éxito.');
        } else {
          alert(`Error al actualizar el pedido: ${json?.msg || 'Error desconocido'}`);
        }
      } catch (err) {
        console.error(err); 
        alert('Error de comunicación al actualizar. Revisa la consola.');
      }
    })();
  };

  const handleDelete = (pedido: Pedido) => {
    if (pedido.estado !== 'pendiente') {
        alert('❌ Solo puedes eliminar pedidos que están en estado "pendiente".');
        return;
    }
    if (!window.confirm(`¿Estás seguro que deseas eliminar el pedido #${pedido.id}?`)) {
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pedidos/${pedido.id}`, {
          method: 'DELETE',
        });
        const json = await res.json().catch(() => ({}));
        
        if (res.ok && json.ok) {
          // Remover del estado local
          setPedidos(prev => prev.filter(p => p.id !== pedido.id));
          alert('🗑️ Pedido eliminado con éxito.');
        } else {
          alert(`Error al eliminar el pedido: ${json?.msg || 'Error desconocido'}`);
        }
      } catch (err) {
        console.error(err);
        alert('Error de comunicación al eliminar. Revisa la consola.');
      }
    })();
  };
  // ------------------------------------------------------------------

  if (loading) return <div className="loading-spinner">Cargando tus pedidos...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="dashboard-container">

  <div className="dashboard-header">
      <div className="dashboard-welcome">
        <h1 className="dashboard-title">¡Hola, {user.nombre}! 👋</h1>
        <p className="dashboard-subtitle">Tu Panel de Pedidos</p>
        <p className="dashboard-intro">
          Revisa el estado de todas tus órdenes en un solo lugar. 
          Edita pedidos pendientes, contacta a los negocios directamente 
          y mantente informado sobre cada entrega. ¡Todo al alcance de un clic!
        </p>
      </div>
    </div>


    <div className="dashboard-stats">
      <div className="stat-card">
        <div className="stat-label">Mis Pedidos</div>
        <div className="stat-value">{pedidos.length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">En Proceso</div>
        <div className="stat-value">{pedidos.filter(p => p.estado === 'pendiente').length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Completados</div>
        <div className="stat-value">{pedidos.filter(p => p.estado === 'confirmado').length}</div>
      </div>
    </div>
    


      <h1 className="dashboard-title">Mis Pedidos ({user.nombre})</h1>
      <p className="dashboard-intro">Aquí puedes revisar el estado de tus órdenes y ver las respuestas de los negocios.</p>
      
      {/* 🌟 Botón para editar el perfil del cliente */}
      <div className="dashboard-actions">
      <button className="btn primary" onClick={onEditProfile}>
        ✏️ Editar Perfil
      </button>
      <button className="btn secondary" onClick={onLogout}>
        🚪 Cerrar Sesión
      </button>
    </div>

      {pedidos.length === 0 ? (
        <p className="no-data-message">Aún no has realizado ningún pedido.</p>
      ) : (
        <div className="order-list">
          {pedidos.map(p => (
            <div key={p.id} className={`order-card status-${p.estado}`}>
              <div className="order-header">
                <span className="order-id"># {p.id}</span>
                <span className={`order-status-badge status-${p.estado}`}>{p.estado.toUpperCase()}</span>
              </div>
              <div className="order-body">
                <p><strong>Negocio:</strong> {p.negocio_nombre}</p>
                <p><strong>Artículo:</strong> {p.producto_nombre || 'Pedido General'}</p>
                <p><strong>Cantidad:</strong> {p.cantidad}</p>
                <p><strong>Mensaje al Negocio:</strong> {p.mensaje}</p>
                <p><strong>Fecha:</strong> {new Date(p.fecha).toLocaleString()}</p> 
              </div>
                
              {/* MOSTRAR RESPUESTA DEL NEGOCIO */}
              {p.respuesta && p.respuesta.trim().length > 0 && (
                <div className="order-response">
                  <h4>Respuesta del Negocio:</h4>
                  <p className="response-text">"{p.respuesta}"</p>
                </div>
              )}

              <div className="order-actions">
                <button 
                  className="btn small primary" 
                  onClick={() => handleEdit(p)}
                  disabled={p.estado !== 'pendiente'} // Solo editable si es pendiente
                >
                  ✏️ Editar
                </button>
                <a 
                  href={`https://wa.me/${p.negocio_telefono}?text=${encodeURIComponent(`Hola, quisiera consultar sobre mi pedido #${p.id} de ${p.producto_nombre || 'un artículo'}.`)}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn small whatsapp"
                >
                  💬 Contactar Negocio
                </a>
                <button 
                  className="btn small danger" 
                  onClick={() => handleDelete(p)}
                  disabled={p.estado !== 'pendiente'} // Solo cancelable si es pendiente
                >
                  🗑️ Cancelar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardCliente;