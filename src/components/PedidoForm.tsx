// src/components/PedidoForm.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { getJson, postJson } from '../services/api';
import './PedidoForm.css';

interface Negocio {
  id: number;
  nombre?: string;
  nombre_negocio?: string;
  telefono?: string;
  telefono_negocio?: string;
  imagen_url?: string;
  ciudad?: string;
  barrio?: string;
  direccion_exacta?: string;
}

interface Producto {
  id: number;
  nombre?: string;
  descripcion?: string;
  precio?: number | null;
  imagen_url?: string | null;
}

interface Props {
  negocioId?: number | null;
  onSuccess?: (pedidoId: number | null, waUrl?: string | null) => void;
  onCancel?: () => void;
}

const PedidoForm: React.FC<Props> = ({ negocioId: propNegocioId = null, onSuccess, onCancel }) => {
  // Estado para un negocio único si se pasa propNegocioId
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  
  // Estado para la lista de negocios si no se pasa propNegocioId
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedNegocioId, setSelectedNegocioId] = useState<number | null>(propNegocioId ?? null);
  const [selectedProductoId, setSelectedProductoId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Intentar pre-llenar nombre desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.nombre) setNombreCliente(String(u.nombre));
      }
    } catch (e) {
      // noop
    }
  }, []);

  // 1. Cargar negocios (si es un pedido general) O cargar negocio/productos (si es un pedido específico)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      
      if (propNegocioId) {
        // Modo: Pedido a un Negocio Específico
        try {
          // Cargar negocio único
          const resNegocio = await getJson(`/api/negocios/${propNegocioId}`);
          
          if (!resNegocio.ok || !resNegocio.data || !resNegocio.data.negocio) {
            throw new Error(resNegocio.data?.msg || "Negocio no encontrado o API no responde.");
          }
          
          const n = resNegocio.data.negocio;
          const normalizedNegocio: Negocio = {
              id: Number(n.id),
              nombre: n.nombre || n.nombre_negocio || n.propietario || '',
              nombre_negocio: n.nombre_negocio || n.nombre || '',
              telefono: n.telefono || n.telefono_negocio || '',
              imagen_url: n.imagen_url || n.imagen || '',
              ciudad: n.ciudad || '',
              barrio: n.barrio || '',
              direccion_exacta: n.direccion_exacta || '',
          };
          setNegocio(normalizedNegocio);
          setSelectedNegocioId(normalizedNegocio.id); // Asegurar que el ID esté seleccionado
          
          // Cargar productos
          const resProductos = await getJson(`/api/negocios/${propNegocioId}/productos`);
          let list: any[] = [];
          if (resProductos.ok && resProductos.data) {
            if (Array.isArray(resProductos.data.productos)) list = resProductos.data.productos;
            else if (Array.isArray(resProductos.data)) list = resProductos.data;
          }
          const normalizedProductos = list.map((p: any) => ({
              id: Number(p.id),
              nombre: p.nombre || '',
              descripcion: p.descripcion || '',
              precio: p.precio ?? null,
              imagen_url: p.imagen_url || ''
          }));
          setProductos(normalizedProductos);
          
        } catch (err: any) {
          console.error('Error cargando negocio/productos específicos en PedidoForm', err);
          setError(err.message || 'No se pudo cargar la información del negocio. Intenta de nuevo.');
          setNegocio(null); // ⬅️ IMPORTANTE: Asegurarse que negocio sea null en caso de error
          setProductos([]);
        } finally {
          setLoading(false);
        }
        
      } else {
        // Modo: Pedido General (Mostrar lista de negocios)
        try {
          const res = await getJson('/api/negocios');
          let list: any[] = [];
          if (res.ok && res.data) {
            if (Array.isArray(res.data.negocios)) list = res.data.negocios;
            else if (Array.isArray(res.data)) list = res.data;
            else if (Array.isArray(res.data.items)) list = res.data.items;
          }

          const normalized = list.map((n: any) => ({
            id: Number(n.id),
            nombre: n.nombre || n.nombre_negocio || n.propietario || '',
            nombre_negocio: n.nombre_negocio || n.nombre || '',
            telefono: n.telefono || n.telefono_negocio || '',
            imagen_url: n.imagen_url || n.imagen || '',
            ciudad: n.ciudad || '',
            barrio: n.barrio || '',
            direccion_exacta: n.direccion_exacta || ''
          }));
          setNegocios(normalized);
        } catch (err) {
          console.error('Error cargando negocios en PedidoForm', err);
          setError('No se pudieron cargar los negocios.');
        } finally {
          setLoading(false);
        }
      }
    })();
  }, [propNegocioId]);

  // 2. Cargar productos cuando se selecciona un negocio del selector (solo en modo general)
  useEffect(() => {
    // Si estamos en modo específico (propNegocioId != null), esta lógica es manejada en el useEffect de carga.
    if (propNegocioId !== null) return; 
    
    if (!selectedNegocioId) {
      setProductos([]);
      setSelectedProductoId(null);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const r = await getJson(`/api/negocios/${selectedNegocioId}/productos`);
        let list: any[] = [];
        if (r.ok && r.data) {
          if (Array.isArray(r.data.productos)) list = r.data.productos;
          else if (Array.isArray(r.data)) list = r.data;
        }
        const normalized = list.map((p: any) => ({
          id: Number(p.id),
          nombre: p.nombre || '',
          descripcion: p.descripcion || '',
          precio: p.precio ?? null,
          imagen_url: p.imagen_url || ''
        }));
        setProductos(normalized);
      } catch (err) {
        console.error('Error cargando productos en PedidoForm', err);
        setProductos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedNegocioId, propNegocioId]); // Incluir propNegocioId para evitar ejecutar en modo específico

  // Utilidad para obtener la información del negocio seleccionado (ya sea de la lista o de la prop)
  const currentNegocio = useMemo(() => {
    if (propNegocioId !== null) {
      return negocio; // Retorna el negocio cargado por la prop
    }
    return negocios.find(x => Number(x.id) === Number(selectedNegocioId)) || null; // Retorna de la lista
  }, [negocio, negocios, selectedNegocioId, propNegocioId]);
  
  // Utilidad para obtener el producto seleccionado (útil para el label de Cantidad)
  const selectedProducto = useMemo(() => {
    return productos.find(p => p.id === selectedProductoId);
  }, [productos, selectedProductoId]);
  
  // Utilidad para obtener el número de teléfono
  const findNegocioPhone = (id: number | null): string => {
    if (!id) return '';
    const n = currentNegocio; // Ya usamos el negocio memoizado
    if (!n) return '';
    // Limpia y formatea el teléfono (solo dígitos y +)
    return String(n.telefono || n.telefono_negocio || '').replace(/[^0-9+]/g, ''); 
  };
  
  // Utilidad para obtener la info del cliente (ID, Teléfono)
  const getClienteFromStorage = () => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        const cliente_id = (u && typeof u.id !== 'undefined') ? Number(u.id) : null;
        const cliente_nombre = (u && u.nombre) ? String(u.nombre) : nombreCliente;
        const cliente_telefono = (u && u.telefono) ? String(u.telefono) : '';
        return { cliente_id, cliente_nombre, cliente_telefono };
      }
    } catch (e) {
      // noop
    }
    return { cliente_id: null, cliente_nombre: nombreCliente, cliente_telefono: '' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedNegocioId || !currentNegocio) {
      setError('Por favor, selecciona un negocio.');
      return;
    }

    if (nombreCliente.trim() === '') {
      setError('Por favor, ingresa tu nombre.');
      return;
    }

    if (mensaje.trim() === '' && !selectedProductoId) {
      setError('Por favor, especifica el producto o deja un mensaje detallado.');
      return;
    }
    
    if (cantidad <= 0) {
      setError('La cantidad debe ser mayor a cero.');
      return;
    }

    const { cliente_id, cliente_nombre, cliente_telefono } = getClienteFromStorage();
    
    // Si el cliente no está logeado, el nombre del cliente del formulario es el que se usa
    const finalClienteNombre = cliente_id ? cliente_nombre : nombreCliente; 
    
    // Si el cliente NO está logueado, le pedimos el teléfono. 
    // Usaremos un prompt, ya que el campo no existe en el formulario.
    let finalClienteTelefono = cliente_telefono;
    if (!cliente_id && finalClienteTelefono === '') {
      const tel = prompt('Para que el negocio pueda contactarte, por favor ingresa tu número de WhatsApp (código de país incluido):');
      if (!tel || tel.trim() === '') {
        setError('Se requiere el número de teléfono/WhatsApp para pedidos no logeados.');
        return;
      }
      finalClienteTelefono = tel.trim();
    }
    
    const negocioTelefono = findNegocioPhone(selectedNegocioId);
    
    const payload = {
      negocio_id: selectedNegocioId,
      producto_id: selectedProductoId,
      cliente_id: cliente_id,
      cliente_nombre: finalClienteNombre,
      cliente_telefono: finalClienteTelefono,
      mensaje: mensaje,
      cantidad: cantidad,
    };
    
    setLoading(true);

    try {
      const res = await postJson('/api/pedidos', payload);
      
      // La API debe devolver el ID del pedido y la URL de WhatsApp si se creó con éxito
      if (res.ok && res.data && res.data.pedido_id) {
        // Formato del mensaje de WhatsApp
        const waMessage = 
          `*PEDIDO NUEVO #*${res.data.pedido_id}\n` +
          `Cliente: ${finalClienteNombre}` + (finalClienteTelefono ? ` (${finalClienteTelefono})` : '') + `\n` +
          `Negocio: ${currentNegocio?.nombre_negocio || currentNegocio?.nombre || 'Desconocido'}\n` +
          `---\n` +
          `Artículo: ${selectedProducto ? `${selectedProducto.nombre} (ID: ${selectedProducto.id})` : 'Pedido General'}\n` +
          `*Cantidad:* ${cantidad}\n` +
          `Detalle: ${mensaje.trim() || 'Sin mensaje adicional.'}\n` +
          `---`;
        
        // URL de WhatsApp para iniciar la conversación con el negocio
        const waUrl = `https://wa.me/${negocioTelefono}?text=${encodeURIComponent(waMessage)}`;

        if (onSuccess) {
          onSuccess(res.data.pedido_id, waUrl);
        } else {
          // Fallback
          alert('Pedido enviado. Te redirigiremos a WhatsApp.');
          window.open(waUrl, '_blank');
        }
      } else {
        // Error de la API (ej. validación fallida)
        setError(res.data?.msg || 'Error al procesar el pedido. Inténtalo más tarde.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Error de comunicación con el servidor (Flask). Revisa CORS y la API.');
    } finally {
      setLoading(false);
    }
  };


  // --- Renderizado ---
  
  const isSpecificMode = propNegocioId !== null;
  const isDataReady = isSpecificMode ? (currentNegocio !== null) : (negocios.length > 0 || !loading);
  
  if (loading && !isDataReady) return <div className="loading-spinner">Cargando {!isSpecificMode ? 'negocios' : 'información del negocio'}...</div>;
  if (error && !loading) return <div className="error-message">{error}</div>;
  
  // Caso de error en modo específico donde el negocio no se pudo cargar y no hay lista de negocios
  if (isSpecificMode && !currentNegocio && !loading) {
      return (
          <div className="error-message">
              <p>No se pudo cargar el negocio (ID: {propNegocioId}).</p>
              {error && <p>{error}</p>}
          </div>
      );
  }

  return (
    <div className="pedido-form-modal">
      <div className="pedido-form-content">
        <h2 className="form-title">
          {isSpecificMode 
            ? `Hacer Pedido a ${currentNegocio?.nombre_negocio || currentNegocio?.nombre || 'Negocio'}` 
            : 'Hacer Nuevo Pedido'}
        </h2>
        
        {error && <p className="error-message">{error}</p>}

        {/* El formulario solo se muestra si currentNegocio existe o si no estamos en modo específico */}
        <form onSubmit={handleSubmit}>
          
          {/* Si no se pasó negocioId como prop, mostrar selector */}
          {!isSpecificMode && (
            <div className="form-row">
              <label htmlFor="negocio">Selecciona el negocio</label>
              <select
                id="negocio"
                value={selectedNegocioId ?? ''}
                onChange={(e) => setSelectedNegocioId(Number(e.target.value))}
                required
                className="form-control"
              >
                <option value="">-- Elige un negocio --</option>
                {negocios.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre || n.nombre_negocio} ({n.ciudad} / {n.barrio})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de productos */}
          {currentNegocio && ( // Solo muestra productos si el negocio ya fue cargado
            <div className="form-row">
              <label htmlFor="producto">Selecciona un producto (opcional)</label>
              <select
                id="producto"
                value={selectedProductoId ?? ''}
                onChange={(e) => setSelectedProductoId(e.target.value ? Number(e.target.value) : null)}
                className="form-control"
                disabled={productos.length === 0}
              >
                <option value="">-- {productos.length === 0 ? 'Cargando/Sin productos' : 'Pedido General'} --</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.precio ? `· $${Number(p.precio).toLocaleString('es-CO')}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* CAMPO DE CANTIDAD */}
          <div className="form-row">
            <label htmlFor="cantidad">Cantidad de {selectedProducto?.nombre || 'artículos'}</label>
            <input
              id="cantidad"
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              required
              placeholder="1"
              className="form-control"
            />
          </div>
          
          {/* Nombre del Cliente */}
          <div className="form-row">
            <label htmlFor="nombreCliente">Tu nombre</label>
            <input 
              id="nombreCliente"
              value={nombreCliente} 
              onChange={(e) => setNombreCliente(e.target.value)} 
              placeholder="Ej: María Rodríguez"
              className="form-control"
              required 
            />
          </div>

          {/* Mensaje / descripción del pedido */}
          <div className="form-row">
            <label htmlFor="mensaje">Mensaje / descripción del pedido</label>
            <textarea 
              id="mensaje"
              value={mensaje} 
              onChange={(e) => setMensaje(e.target.value)} 
              rows={4} 
              required={!selectedProductoId}
              placeholder="Ej: Si no hay pan integral, tráeme pan blanco. Mi dirección es..." 
              className="form-control"
            />
          </div>

          <div className="form-row form-actions">
            <button type="submit" className="btn primary" disabled={loading || !selectedNegocioId}>
              {loading ? 'Enviando...' : 'Enviar Pedido'}
            </button>
            {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>}
          </div>

        </form>
      </div>
    </div>
  );
};

export default PedidoForm;