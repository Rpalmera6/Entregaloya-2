// src/components/ProductForm.tsx
import React, { useEffect, useState } from 'react';
import './ProductForm.css'; // Opcional: crea este archivo si quieres estilos

export interface ProductoMin {
  id: number;
  nombre: string;
  descripcion?: string;
  precio?: number | null;
  imagen_url?: string | null;
  negocio_id?: number;
}

// Si prefieres usar una constante global/archivo de configuración, cámbiala aquí
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';


interface Props {
  negocioId: number;
  producto?: ProductoMin;
  onCancel?: () => void;
  onSaved?: (producto: ProductoMin) => void;
}

const ProductForm: React.FC<Props> = ({ negocioId, producto, onCancel, onSaved }) => {
  const [nombre, setNombre] = useState(producto?.nombre || '');
  const [descripcion, setDescripcion] = useState(producto?.descripcion || '');
  const [precio, setPrecio] = useState<string>(producto?.precio ? String(producto.precio) : '');
  const [imagen, setImagen] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (producto) {
      setNombre(producto.nombre || '');
      setDescripcion(producto.descripcion || '');
      setPrecio(producto.precio ? String(producto.precio) : '');
    }
  }, [producto]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    setImagen(f || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setMsg('Nombre requerido'); return; }
    setLoading(true);
    setMsg(null);

    try {
      const fd = new FormData();
      fd.append('nombre', nombre);
      fd.append('descripcion', descripcion);
      fd.append('precio', precio || '');
      if (imagen) fd.append('file', imagen);

      let url = '';
      let method: 'POST' | 'PUT' = 'POST';

      if (producto && producto.id) {
        url = `${API_BASE}/api/productos/${producto.id}`;
        method = 'PUT';
      } else {
        url = `${API_BASE}/api/negocios/${negocioId}/productos`;
        method = 'POST';
      }

      const res = await fetch(url, { method, body: fd, credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setMsg(producto ? 'Producto actualizado.' : 'Producto creado.');
        const saved = json.producto || json;
        if (onSaved) onSaved(saved);
      } else {
        setMsg(json?.msg || 'Error al guardar producto');
      }
    } catch (err) {
      console.error(err);
      setMsg('Error de comunicación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pf-backdrop" onClick={onCancel}>
      <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pf-close" onClick={onCancel}>✕</button>
        <h3>{producto ? 'Editar Producto' : 'Agregar Producto'}</h3>
        <form onSubmit={handleSubmit} className="pf-form">
          <div className="pf-row">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="pf-row">
            <label>Descripción</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="pf-row">
            <label>Precio</label>
            <input value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Ej: 12.50" />
          </div>
          <div className="pf-row">
            <label>Imagen</label>
            <input type="file" accept="image/*" onChange={handleFile} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button type="submit" disabled={loading}>{loading ? 'Guardando...' : (producto ? 'Guardar' : 'Crear')}</button>
            <button type="button" onClick={onCancel}>Cancelar</button>
          </div>
          {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
