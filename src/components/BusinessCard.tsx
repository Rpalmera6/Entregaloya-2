// src/components/BusinessCard.tsx
import React, { useState, useMemo } from 'react';
import './BusinessCard.css';
import { API_BASE } from '../services/api';

interface Props {
  negocio: {
    id: number;
    nombre: string;
    imagen_url?: string | null;
    imagen?: string | null;
    descripcion?: string;
    telefono?: string;
    categoria?: string;
  };
  onClick: (id: number) => void;
}

const DATA_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#f6f6f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#cfcfcf" font-size="20">Sin imagen</text></svg>`
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

const SmartImage: React.FC<{ src?: string | null; alt?: string; className?: string; style?: React.CSSProperties }> = ({ src, alt, className, style }) => {
  const candidates = useMemo(() => buildCandidatesFromSrc(src), [src]);
  const [idx, setIdx] = useState(0);

  return (
    <img
      src={candidates[idx]}
      alt={alt || ''}
      className={className}
      style={style}
      onError={() => {
        if (idx + 1 < candidates.length) setIdx(idx + 1);
      }}
      draggable={false}
    />
  );
};

const BusinessCard: React.FC<Props> = ({ negocio, onClick }) => {
  const src = negocio.imagen_url || negocio.imagen || '';
  return (
    <div
      className="biz-card"
      onClick={(e) => {
        e.stopPropagation();
        console.log('[BusinessCard] click ->', negocio.id);
        onClick(negocio.id);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          console.log('[BusinessCard] key open ->', negocio.id);
          onClick(negocio.id);
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className="biz-card-image">
        <SmartImage src={src} alt={negocio.nombre} />
      </div>
      <div className="biz-card-body">
        <h3 className="biz-name">{negocio.nombre}</h3>
        <p className="biz-meta">{negocio.categoria ?? ''} · {negocio.telefono ?? ''}</p>
        <p className="biz-desc">{negocio.descripcion ?? ''}</p>
      </div>
    </div>
  );
};

export default BusinessCard;
