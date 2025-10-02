// src/components/BusinessModal.tsx
import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { getJson, API_BASE } from '../services/api';
import './BusinessModal.css';

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio?: number | null | string;
  imagen_url?: string | null;
}

interface Negocio {
  id: number;
  nombre_negocio?: string;
  nombre?: string;
  imagen_url?: string | null;
  descripcion?: string;
  telefono_negocio?: string;
  categoria?: string;
  ciudad?: string;
  barrio?: string;
  direccion_exacta?: string;
  horario?: string;
  codigo_postal?: string;
  propietario?: string;
}

interface Props {
  negocioId: number | null;
  onClose: () => void;
  onSelectProducto?: (p: Producto) => void;
  onOpenProfile?: (id: number) => void; // opcional: preferible para SPA
}

/* placeholder inline (svg) */
const DATA_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#f2f2f2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bdbdbd" font-size="22">Sin imagen</text></svg>`
  );

function buildCandidatesFromSrc(raw?: string | null) {
  const base = (API_BASE || '').replace(/\/$/, '');
  if (!raw || !raw.trim()) return [DATA_PLACEHOLDER];
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return [s, DATA_PLACEHOLDER];
  if (/^\/\//.test(s)) return [window.location.protocol + s, DATA_PLACEHOLDER];
  const candidates: string[] = [];
  if (s.startsWith('/')) {
    if (base) candidates.push(`${base}${s}`);
    candidates.push(s);
    candidates.push(DATA_PLACEHOLDER);
    return Array.from(new Set(candidates));
  }
  if (base) candidates.push(`${base}/static/uploads/${s}`);
  candidates.push(`/static/uploads/${s}`);
  candidates.push(`/${s}`);
  candidates.push(s);
  candidates.push(DATA_PLACEHOLDER);
  return Array.from(new Set(candidates));
}

const SmartImage: React.FC<{ src?: string | null; alt?: string; className?: string; style?: React.CSSProperties; height?: number }> = ({
  src,
  alt,
  className,
  style,
  height,
}) => {
  const candidates = useMemo(() => buildCandidatesFromSrc(src), [src]);
  const [idx, setIdx] = useState(0);
  return (
    <img
      src={candidates[idx]}
      alt={alt || ''}
      className={className}
      style={height ? { ...style, height, objectFit: 'cover' } : style}
      onError={() => {
        if (idx + 1 < candidates.length) setIdx(idx + 1);
      }}
      draggable={false}
    />
  );
};

function formatPrice(value?: number | null | string) {
  const n = typeof value === 'number' ? value : (value !== null && value !== undefined && value !== '' ? Number(value) : NaN);
  if (!isFinite(n)) return '-';
  return '$' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

const BusinessModal: React.FC<Props> = ({ negocioId, onClose, onSelectProducto, onOpenProfile }) => {
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (negocioId === null || negocioId === undefined) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const r1 = await getJson(`/api/negocios/${negocioId}`);
        if (!r1.ok) {
          setError(r1.data?.msg || 'No se pudo cargar el negocio');
          setLoading(false);
          return;
        }
        setNegocio(r1.data.negocio || null);

        const r2 = await getJson(`/api/negocios/${negocioId}/productos`);
        if (!r2.ok) setProductos([]);
        else setProductos(r2.data.productos || []);
      } catch (err: any) {
        console.error('Error cargando negocio/productos', err);
        setError('Error de comunicación con el servidor');
      } finally {
        setLoading(false);
      }
    })();
  }, [negocioId]);

  if (negocioId === null || negocioId === undefined) return null;

  const telClean = (negocio?.telefono_negocio || '').replace(/[^0-9+]/g, '');

  const abrirPerfilRobusto = (id: number) => {
    // 1) preferimos handler SPA pasado por props
    if (typeof onOpenProfile === 'function') {
      onOpenProfile(id);
      return;
    }

    // 2) intentar actualizar URL y avisar a la app vía evento global (sin recargar)
    try {
      const newUrl = `/negocios/${id}`;
      if (typeof window !== 'undefined' && window.history && typeof window.history.pushState === 'function') {
        window.history.pushState({}, '', newUrl);
      }
      const ev = new CustomEvent('open-business-profile', { detail: { id } });
      window.dispatchEvent(ev);
      return;
    } catch (e) {
      console.warn('No se pudo abrir perfil vía pushState/event, usando fallback a href', e);
    }

    // 3) fallback clásico: recargar a la página del perfil
    window.location.href = `/negocios/${id}`;
  };
  
  // 🌟 FUNCIÓN PARA ABRIR EL FORMULARIO DE PEDIDO O WHATSAPP
  const handleProductOrder = (p: Producto) => {
    // Si se provee una función de selección, la usamos para abrir el formulario interno
    if (onSelectProducto) {
      onSelectProducto(p);
      return;
    }
    
    // Si no hay función de selección (fallback a WhatsApp), enviamos cantidad 1
    const mensaje = encodeURIComponent(`Hola ${negocio?.nombre_negocio ?? negocio?.nombre}, quisiera pedir 1 unidad de: ${p.nombre}`);
    window.open(`https://wa.me/${telClean}?text=${mensaje}`, '_blank');
  };

  const modalContent = (
    <div className="bm-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="bm-close" onClick={onClose} aria-label="Cerrar">✕</button>

        {loading ? (
          <div className="bm-loading">Cargando...</div>
        ) : error ? (
          <div className="bm-error">{error}</div>
        ) : negocio ? (
          <>
            <div className="bm-top">
              <div className="bm-top-left">
                <h2 className="bm-title">{negocio.nombre_negocio ?? negocio.nombre}</h2>
                <div className="bm-sub">
                  <span className="bm-category">{negocio.categoria ?? 'Sin categoría'}</span>
                  {(negocio.ciudad || negocio.barrio) && (
                    <span className="bm-location"> · {negocio.ciudad ?? ''}{negocio.ciudad && negocio.barrio ? ', ' : ''}{negocio.barrio ?? ''}</span>
                  )}
                </div>
                <p className="bm-description">{negocio.descripcion || 'No hay descripción disponible.'}</p>

                <div className="bm-meta">
                  <div className="bm-phone">📞 {negocio.telefono_negocio ?? 'No disponible'}</div>
                  {negocio.horario && <div className="bm-horario">⏰ {negocio.horario}</div>}
                  <div className="bm-address">
                    {negocio.direccion_exacta ? negocio.direccion_exacta : 'Dirección no especificada'}
                    {negocio.codigo_postal ? ` · CP ${negocio.codigo_postal}` : ''}
                    {negocio.propietario ? <div className="bm-propietario">Propietario: {negocio.propietario}</div> : null}
                  </div>
                </div>
              </div>

              <div className="bm-top-right">
                <SmartImage src={negocio.imagen_url} alt={negocio.nombre_negocio ?? negocio.nombre} style={{ width: '100%', borderRadius: 8 }} height={140} />
              </div>
            </div>

            <div className="bm-bottom">
              <section className="bm-products">
                <h3>Nuestros Productos</h3>

                {productos.length === 0 ? (
                  <>
                    <p>No hay productos publicados aún.</p>
                  </>
                ) : (
                  <>
                    <div className="bm-products-grid">
                      {productos.slice(0, 3).map((p) => (
                        <div className="bm-product-card" key={p.id}>
                          <div className="bm-prod-img">
                            <SmartImage src={p.imagen_url} alt={p.nombre} height={120} />
                            <div className="bm-price-badge">{formatPrice(p.precio)}</div>
                          </div>

                          <div className="bm-prod-body">
                            <strong className="bm-prod-title">{p.nombre}</strong>
                            <p className="bm-prod-desc">{p.descripcion}</p>
                            <div className="bm-prod-footer">
                              <span className="bm-price-sm">{formatPrice(p.precio)}</span>
                              <div className="bm-prod-actions">
                                {/* 🌟 LÓGICA DE PEDIDO ACTUALIZADA */}
                                <button
                                  className="bm-btn-primary"
                                  onClick={() => handleProductOrder(p)}
                                >
                                  Pedir
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* BOTÓN "VER MÁS" SIEMPRE VISIBLE */}
                <div className="bm-products-footer">
                  <button className="bm-btn-link" onClick={() => abrirPerfilRobusto(negocio.id)}>
                    Ver más
                  </button>
                </div>
              </section>

              <aside className="bm-order-panel">
                <h4>Haz tu pedido</h4>
                <p>Enviar pedido por WhatsApp al negocio:</p>
                <a
                  className="bm-whatsapp-btn"
                  href={`https://wa.me/${telClean}?text=${encodeURIComponent(`Hola ${negocio.nombre_negocio ?? negocio.nombre}, quiero hacer un pedido:`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar Pedido por WhatsApp
                </a>

                {/* Aquí es donde abrimos el formulario interno: */}
                <button
                  className="bm-whatsapp-btn bm-local-order"
                  onClick={(e) => {
                    e.preventDefault();
                    // Notificamos al App para que abra la página/form de pedido (con negocio seleccionado)
                    try {
                      window.dispatchEvent(new CustomEvent('open-pedido', { detail: { id: negocio.id } }));
                    } catch (err) {
                      // fallback: navegar a /pedido directamente
                      try {
                        window.history.pushState({}, '', `/pedido?negocio=${negocio.id}`);
                        window.dispatchEvent(new Event('popstate'));
                      } catch (e2) { /* noop */ }
                    }
                    onClose();
                  }}
                >
                  Hacer Pedido (interno)
                </button>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return ReactDOM.createPortal(modalContent, document.body);
  }
  return null;
};

export default BusinessModal;