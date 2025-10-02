// src/components/ProductsList.tsx
import React from 'react';
import './ProductsList.css';

type Producto = {
  id: number;
  nombre: string;
  descripcion?: string;
  precio?: number;
  imagen_url?: string;
};

interface Props {
  productos: Producto[];
  limit?: number; // si viene, mostrar sólo primeros N
}

const ProductsList: React.FC<Props> = ({ productos, limit = 3 }) => {
  const list = limit ? productos.slice(0, limit) : productos;
  if (!productos || productos.length === 0) return <div style={{ color: '#666' }}>No hay productos aún.</div>;
  return (
    <div className="pl-list">
      {list.map(p => (
        <div key={p.id} className="pl-item">
          <div className="pl-left">
            <img src={p.imagen_url || '/placeholder-150x100.png'} alt={p.nombre} onError={(e)=>{ (e.target as HTMLImageElement).src = '/placeholder-150x100.png'; }} />
          </div>
          <div className="pl-right">
            <div style={{ fontWeight: 700 }}>{p.nombre}</div>
            <div style={{ color:'#666', fontSize:13 }}>{p.descripcion ?? ''}</div>
          </div>
        </div>
      ))}
      {productos.length > limit && <div className="pl-more">+ {productos.length - limit} más</div>}
    </div>
  );
};

export default ProductsList;
