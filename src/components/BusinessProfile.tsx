// src/components/BusinessProfile.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getJson } from '../services/api';
import './BusinessProfile.css';

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
  negocioId?: number | null;
}

function formatPrice(value?: number | null | string) {
  const n = typeof value === 'number' ? value : (value !== null && value !== undefined && value !== '' ? Number(value) : NaN);
  if (!isFinite(n)) return '-';
  return '$' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

const BusinessProfile: React.FC<Props> = ({ negocioId: propNegocioId = null }) => {
  const params = useParams<{ id: string }>();
  const negocioId = propNegocioId ?? (params?.id ? Number(params.id) : null);

  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!negocioId) {
      setError('No se especificó el negocio.');
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r1 = await getJson(`/api/negocios/${negocioId}`);
        if (r1.ok) setNegocio(r1.data.negocio || null);
        else {
          setError(r1.data?.msg || 'No se encontró el negocio.');
        }

        const r2 = await getJson(`/api/negocios/${negocioId}/productos`);
        if (r2.ok) setProductos(r2.data.productos || []);
      } catch (err: any) {
        console.error(err);
        setError('Error comunicándose con el servidor.');
      } finally {
        setLoading(false);
      }
    })();
  }, [negocioId]);

  if (!negocioId) return <div style={{ padding: 24 }}>ID de negocio no especificado.</div>;
  if (loading) return <div style={{ padding: 24 }}>Cargando negocio...</div>;
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>;
  if (!negocio) return <div style={{ padding: 24 }}>No se encontró el negocio.</div>;

  const telClean = (negocio.telefono_negocio || '').replace(/[^0-9+]/g, '');

  return (
    <div className="bp-page">
      <div className="bp-hero">
        <div className="bp-hero-img" style={{ backgroundImage: `url(${negocio.imagen_url || ''})` }} />
        <div className="bp-card">
          <div className="bp-tag">{negocio.categoria || 'Sin categoría'}</div>
          <h1 className="bp-title">{negocio.nombre_negocio ?? negocio.nombre}</h1>
          <div className="bp-meta">
            <span className="bp-rating">★ 4.8</span>
            <span className="bp-address"> {negocio.direccion_exacta || ''}</span>
            <span className="bp-phone"> {negocio.telefono_negocio || ''}</span>
          </div>
        </div>
      </div>

      <main className="bp-main">
        <section className="bp-about">
          <h2>Sobre Nosotros</h2>
          <p>{negocio.descripcion || 'No hay descripción disponible.'}</p>
        </section>

        <aside className="bp-order">
          <div className="bp-order-card">
            <h3>Haz tu Pedido</h3>
            <p>Completa el formulario y envía tu pedido directamente por WhatsApp.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = (e.currentTarget.elements.namedItem('nombre') as HTMLInputElement).value;
                const order = (e.currentTarget.elements.namedItem('pedido') as HTMLTextAreaElement).value;
                const wa = `https://wa.me/${telClean}?text=${encodeURIComponent(`Hola ${negocio.nombre_negocio ?? negocio.nombre}, soy ${name} y quiero: ${order}`)}`;
                window.open(wa, '_blank');
              }}
            >
              <label>Tu Nombre</label>
              <input name="nombre" placeholder="Ej: María Rodriguez" />
              <label>Tu Pedido</label>
              <textarea name="pedido" placeholder="Ej: 2 panes de chocolate, 1 croissant..." rows={4} />
              <button type="submit" className="bp-wa-btn">Enviar Pedido por WhatsApp</button>
            </form>
          </div>
        </aside>
      </main>

      <section className="bp-products-section">
        <div className="bp-products-container">
          <h2>Productos</h2>
          <div className="bp-products-grid">
            {productos.length === 0 && <p>No hay productos publicados.</p>}
            {productos.map((p) => (
              <article key={p.id} className="bp-product">
                <div className="bp-product-img" style={{ backgroundImage: `url(${p.imagen_url || ''})` }}>
                  <div className="bp-price-badge">{formatPrice(p.precio)}</div>
                </div>
                <div className="bp-product-body">
                  <h4>{p.nombre}</h4>
                  <p className="bp-product-desc">{p.descripcion}</p>
                  <div className="bp-product-footer">
                    <span className="bp-price">{formatPrice(p.precio)}</span>
                    <a
                      className="bp-wa-inline"
                      href={`https://wa.me/${telClean}?text=${encodeURIComponent(`Hola ${negocio.nombre_negocio ?? negocio.nombre}, quisiera pedir: ${p.nombre}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Pedir
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BusinessProfile;
