// src/components/PedidoConfirm.tsx
import React, { useEffect, useState } from 'react';
import { getJson } from '../services/api';
import './PedidoConfirm.css';

interface Props {
  pedidoId?: number | null;
  // si se pasa waUrl no hace fetch
  waUrl?: string | null;
}

const PedidoConfirm: React.FC<Props> = ({ pedidoId: propPedidoId = null, waUrl: initialWaUrl = null }) => {
  const [pedidoId, setPedidoId] = useState<number | null>(propPedidoId ?? null);
  const [waUrl, setWaUrl] = useState<string | null>(initialWaUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // si no tenemos waUrl pero sí pedidoId, intentar cargar datos del pedido
    if (!waUrl && pedidoId) {
      (async () => {
        setLoading(true);
        try {
          const r = await getJson(`/api/pedidos/${pedidoId}`);
          if (r.ok && r.data && r.data.pedido) {
            // backend debería devolver teléfono y mensaje o construir waUrl
            const pedido = r.data.pedido;
            if (pedido.numero_ws && pedido.texto_codificado) {
              setWaUrl(`https://wa.me/${pedido.numero_ws}?text=${pedido.texto_codificado}`);
            } else if (pedido.negocio_telefono) {
              const text = encodeURIComponent(`Hola, soy ${pedido.cliente_nombre || 'cliente'} y quiero: ${pedido.mensaje || ''}`);
              setWaUrl(`https://wa.me/${pedido.negocio_telefono}?text=${text}`);
            }
          } else {
            setError('No se pudo recuperar la información del pedido.');
          }
        } catch (err) {
          console.error('Error cargando pedido', err);
          setError('Error comunicándose con el servidor.');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [pedidoId, waUrl]);

  // si no recibiste pedidoId por props intenta leer querystring ?pedido=ID
  useEffect(() => {
    if (!pedidoId) {
      try {
        const params = new URLSearchParams(window.location.search);
        const p = params.get('pedido');
        if (p) setPedidoId(Number(p));
      } catch {}
    }
  }, [pedidoId]);

  return (
    <div className="pedido-confirm-wrap">
      <h2>Pedido Registrado</h2>

      {loading && <p>Cargando información del pedido...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          <p>Tu pedido ha sido registrado.</p>

          {waUrl ? (
            <p>
              Puedes continuar la conversación en WhatsApp con el negocio:
              <br />
              <a className="btn-whatsapp" href={waUrl} target="_blank" rel="noreferrer">Abrir WhatsApp para finalizar el pedido</a>
            </p>
          ) : (
            <p>
              No se obtuvo la URL de WhatsApp. Puedes contactar al negocio directamente.
            </p>
          )}

          <p style={{ marginTop: 20 }}>
            <a className="btn" href="/">Volver al Inicio</a>
          </p>
        </>
      )}
    </div>
  );
};

export default PedidoConfirm;
