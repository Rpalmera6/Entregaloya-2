// src/components/DashboardNegocio.tsx
import React, { useEffect, useState } from 'react';
import ProductForm, { ProductoMin } from './ProductForm';

// Cambia si tu API está en otra URL
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

type UserType = {
  id: number;
  nombre: string;
  telefono: string;
  tipo: 'cliente' | 'negocio' | string;
  negocio_id?: number | null;
  [k: string]: any;
};

interface DashboardNegocioProps {
  user: UserType;
  onLogout: () => void;
  onEditProfile: () => void;
}

interface Pedido {
  id: number;
  cliente_id: number | null;
  producto_id: number | null;
  mensaje: string;
  estado: 'pendiente' | 'confirmado' | 'cancelado';
  fecha: string;
  respuesta: string | null;
  cantidad: number;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  producto_nombre: string | null;
}

const DashboardNegocio: React.FC<DashboardNegocioProps> = ({ user, onLogout, onEditProfile }) => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Productos
  const [productos, setProductos] = useState<ProductoMin[]>([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoMin | undefined>(undefined);

  // Modal pedido
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [respuestaText, setRespuestaText] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<'pendiente' | 'confirmado' | 'cancelado'>('pendiente');

  useEffect(() => {
    if (!user || user.tipo !== 'negocio' || !user.negocio_id) {
      onLogout();
      return;
    }
    fetchPedidos();
    fetchProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchPedidos = async () => {
    if (!user.negocio_id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/pedidos/negocio/${user.negocio_id}`, {
        credentials: 'include' // <<-- enviar cookies
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setPedidos(data.pedidos || []);
      else setError(data?.msg || 'Error al cargar pedidos.');
    } catch (err) {
      console.error(err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async () => {
    if (!user.negocio_id) return;
    setProdLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/negocios/${user.negocio_id}/productos`, {
        credentials: 'include' // <<-- enviar cookies
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.productos) {
        setProductos(data.productos || []);
      } else {
        setProductos([]);
      }
    } catch (err) {
      console.error('fetchProductos', err);
      setProductos([]);
    } finally {
      setProdLoading(false);
    }
  };

  // Pedidos
  const openModal = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setRespuestaText(pedido.respuesta || '');
    setNuevoEstado(pedido.estado);
    setIsModalOpen(true);
  };

  const handleUpdatePedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPedido) return;
    const payload = {
      estado: nuevoEstado,
      respuesta: respuestaText,
    };
    try {
      // Nota: tu backend acepta PUT en /api/pedidos/<id> para edición por cliente,
      // pero en tu diseño también tienes /api/pedidos/negocio/<id> para negocio;
      // aquí usaremos el endpoint de negocio (si tu backend difiere, ajusta).
      const res = await fetch(`${API_BASE}/api/pedidos/${selectedPedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',               // <- importante para cookies/sesión
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        alert('✅ Pedido actualizado.');
        setPedidos(prev => prev.map(p => (p.id === selectedPedido.id ? { ...p, estado: nuevoEstado, respuesta: respuestaText } : p)));
        setIsModalOpen(false);
        setSelectedPedido(null);
      } else {
        alert(`Error: ${json?.msg || 'No se pudo actualizar'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al actualizar pedido.');
    }
  };

  const handleDeletePedido = async (pedido: Pedido) => {
    if (!window.confirm(`¿Eliminar pedido #${pedido.id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/pedidos/${pedido.id}`, {
        method: 'DELETE',
        credentials: 'include' // <<-- enviar cookies (para que el backend vea la sesión)
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setPedidos(prev => prev.filter(p => p.id !== pedido.id));
        alert('Pedido eliminado.');
      } else alert(json?.msg || 'No se pudo eliminar.');
    } catch (err) {
      console.error(err);
      alert('Error de conexión al eliminar pedido.');
    }
  };

  // Productos: abrir/editar/guardar/borrar
  const openCreateProduct = () => {
    setEditingProduct(undefined);
    setIsProductModalOpen(true);
  };

  const openEditProduct = (p: ProductoMin) => {
    setEditingProduct(p);
    setIsProductModalOpen(true);
  };

  const handleProductSaved = (saved: ProductoMin) => {
    setProductos(prev => {
      const found = prev.find(x => x.id === saved.id);
      if (found) return prev.map(x => (x.id === saved.id ? saved : x));
      return [saved, ...prev];
    });
    setIsProductModalOpen(false);
    setEditingProduct(undefined);
  };

  const handleDeleteProduct = async (prodId?: number) => {
    if (!prodId) return;
    if (!window.confirm('¿Eliminar producto?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/productos/${prodId}`, {
        method: 'DELETE',
        credentials: 'include' // <<-- enviar cookies
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setProductos(prev => prev.filter(p => p.id !== prodId));
        alert('Producto eliminado.');
      } else alert(json?.msg || 'No se pudo eliminar el producto');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar producto.');
    }
  };

  if (loading) return <div className="loading-spinner">Cargando pedidos de tu negocio...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1 className="dashboard-title">¡Bienvenido, {user.nombre}! 🎉</h1>
          <p className="dashboard-subtitle">Panel de Control del Negocio</p>
          <p className="dashboard-intro">
            Aquí puedes gestionar todos los pedidos entrantes y los productos de tu negocio.
          </p>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Total Pedidos</div>
          <div className="stat-value">{pedidos.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pendientes</div>
          <div className="stat-value">{pedidos.filter(p => p.estado === 'pendiente').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Confirmados</div>
          <div className="stat-value">{pedidos.filter(p => p.estado === 'confirmado').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cancelados</div>
          <div className="stat-value">{pedidos.filter(p => p.estado === 'cancelado').length}</div>
        </div>
      </div>

      {/* BOTONES: Agregar Producto junto a Editar Perfil */}
      <div className="dashboard-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn primary" onClick={openCreateProduct}>
          ➕ Agregar Producto
        </button>

        <button className="btn primary" onClick={onEditProfile}>
          📝 Editar Perfil de Negocio
        </button>

        <button className="btn secondary" onClick={onLogout}>
          🚪 Cerrar Sesión
        </button>
      </div>

      {/* Vista rápida de productos */}
      <section style={{ marginTop: 18 }}>
        <h2>Productos ({productos.length})</h2>
        {prodLoading ? (
          <div>Cargando productos...</div>
        ) : productos.length === 0 ? (
          <div>No hay productos aún. Usa "Agregar Producto" para crear el primero.</div>
        ) : (
          <div className="product-list">
            {productos.slice(0, 6).map(p => (
              <div key={p.id} className="product-card">
                <div className="product-thumb">
                  {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} style={{ maxWidth: 80 }} /> : <div className="no-thumb">Sin imagen</div>}
                </div>
                <div className="product-body">
                  <strong>{p.nombre}</strong>
                  <div className="muted">{p.descripcion}</div>
                  <div>Precio: {p.precio ?? 'N/A'}</div>
                </div>
                <div className="product-actions">
                  <button onClick={() => openEditProduct(p)} className="btn small">Editar</button>
                  <button onClick={() => handleDeleteProduct(p.id)} className="btn small danger">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lista de pedidos */}
      <h1 className="dashboard-title" style={{ marginTop: 20 }}>Panel de Pedidos del Negocio ({user.nombre})</h1>
      <p className="dashboard-intro">Gestiona los pedidos entrantes. Puedes confirmarlos, cancelarlos o enviar una respuesta.</p>

      {pedidos.length === 0 ? (
        <p className="no-data-message">Aún no hay pedidos para tu negocio.</p>
      ) : (
        <div className="order-list">
          {pedidos.map(p => (
            <div key={p.id} className={`order-card status-${p.estado}`}>
              <div className="order-header">
                <span className="order-id"># {p.id}</span>
                <span className={`order-status-badge status-${p.estado}`}>{p.estado.toUpperCase()}</span>
              </div>
              <div className="order-body">
                <p><strong>Cliente:</strong> {p.cliente_nombre || 'Anónimo'}</p>
                <p><strong>Teléfono:</strong> {p.cliente_telefono || 'N/A'}</p>
                <p><strong>Artículo:</strong> {p.producto_nombre || 'Pedido General'}</p>
                <p><strong>Cantidad:</strong> <strong>{p.cantidad}</strong></p>
                <p><strong>Mensaje del Cliente:</strong> {p.mensaje}</p>
                <p><strong>Fecha:</strong> {new Date(p.fecha).toLocaleString()}</p>
              </div>

              {p.respuesta && p.respuesta.trim().length > 0 && (
                <div className="order-response">
                  <h4>Tu Respuesta:</h4>
                  <p className="response-text">"{p.respuesta}"</p>
                </div>
              )}

              <div className="order-actions">
                <button className="btn small primary" onClick={() => openModal(p)}>✉️ Responder/Actualizar</button>
                <a href={`https://wa.me/${p.cliente_telefono || ''}?text=${encodeURIComponent(`Hola ${p.cliente_nombre || 'Cliente'}, soy el negocio. Respecto a tu pedido #${p.id}: `)}`} target="_blank" rel="noopener noreferrer" className="btn small whatsapp">💬 Contactar Cliente</a>
                <button className="btn small danger" onClick={() => handleDeletePedido(p)}>🗑️ Eliminar de lista</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal respuesta */}
      {isModalOpen && selectedPedido && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Responder y Actualizar Pedido #{selectedPedido.id}</h2>
            <p><strong>Cliente:</strong> {selectedPedido.cliente_nombre || 'Anónimo'}</p>
            <p><strong>Artículo x Cantidad:</strong> {selectedPedido.producto_nombre || 'General'} x <strong>{selectedPedido.cantidad}</strong></p>
            <p className="pedido-msg"><strong>Mensaje:</strong> "{selectedPedido.mensaje}"</p>

            <form onSubmit={handleUpdatePedido}>
              <div className="form-group">
                <label htmlFor="estado">Nuevo Estado:</label>
                <select id="estado" className="form-control" value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value as any)} required>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="respuesta">Mensaje de Respuesta (Visible para el Cliente):</label>
                <textarea id="respuesta" className="form-control" rows={3} value={respuestaText} onChange={(e) => setRespuestaText(e.target.value)} placeholder="Ej: Confirmado. Entrega en 45 minutos." />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn primary">Guardar Cambios</button>
                <button type="button" className="btn secondary" onClick={() => setIsModalOpen(false)}>Cerrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Producto */}
      {isProductModalOpen && (
        <ProductForm
          negocioId={user.negocio_id as number}
          producto={editingProduct}
          onCancel={() => { setIsProductModalOpen(false); setEditingProduct(undefined); }}
          onSaved={(prod) => handleProductSaved(prod)}
        />
      )}
    </div>
  );
};

export default DashboardNegocio;
