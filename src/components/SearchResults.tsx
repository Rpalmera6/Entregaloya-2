// src/components/SearchResults.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { getJson } from '../services/api';
import BusinessCard from './BusinessCard';
import BusinessModal from './BusinessModal';
import './SearchResults.css';

interface NegocioRaw {
  [key: string]: any;
}

interface Negocio {
  id: number;
  nombre: string;
  categoria: string;
  descripcion: string;
  direccion_exacta: string;
  telefono: string;
  horario?: string;
  imagen_url?: string;
  rating?: number;
  ciudad: string;
  barrio: string;
  // campo auxiliar para búsqueda rápida
  _searchText?: string;
}

const makeSearchText = (n: Negocio) =>
  (
    (n.nombre || '') +
    ' ' +
    (n.categoria || '') +
    ' ' +
    (n.descripcion || '') +
    ' ' +
    (n.telefono || '') +
    ' ' +
    (n.ciudad || '') +
    ' ' +
    (n.barrio || '') +
    ' ' +
    (n.direccion_exacta || '')
  ).toLowerCase();

const SearchResults: React.FC = () => {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [filtered, setFiltered] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // filtros UI
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [categoria, setCategoria] = useState('Todos');

  // cargar negocios y normalizar
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getJson('/api/negocios');
        if (res.ok && res.data) {
          // API puede devolver {negocios: [...] } o directamente un array dependiendo de tu backend
          const rawList: NegocioRaw[] = Array.isArray(res.data.negocios) ? res.data.negocios : Array.isArray(res.data) ? res.data : (res.data.negocios || []);
          console.log('[SearchResults] API returned', rawList.length, 'items');
          const normalized: Negocio[] = rawList.map((r: NegocioRaw) => {
            const nombre = (r.nombre || r.nombre_negocio || '').toString();
            const categoria = (r.categoria || '').toString();
            const descripcion = (r.descripcion || '').toString();
            const direccion_exacta = (r.direccion_exacta || r.direccion || '').toString();
            const telefono = (r.telefono || r.telefono_negocio || '').toString();
            const ciudad = (r.ciudad || '').toString();
            const barrio = (r.barrio || '').toString();

            const base: Negocio = {
              id: Number(r.id),
              nombre,
              categoria,
              descripcion,
              direccion_exacta,
              telefono,
              horario: r.horario,
              imagen_url: r.imagen_url || r.imagen || '',
              rating: r.rating,
              ciudad,
              barrio,
            };
            base._searchText = makeSearchText(base);
            return base;
          });

          setNegocios(normalized);
          setFiltered(normalized);
          setLoading(false);
          return;
        }
        // fallback local si API falla
        console.warn('[SearchResults] API didn\'t return negocios array, using fallback');
        const fallback: Negocio[] = [
          {
            id: 1,
            nombre: 'Panadería Don Manolo',
            categoria: 'Panaderías',
            descripcion: 'El pan más fresco...',
            direccion_exacta: 'Calle Falsa 123',
            telefono: '+57300111222',
            horario: 'Lunes a Sábado 6am - 8pm',
            imagen_url: '/placeholder-600x400.png',
            rating: 4.8,
            ciudad: 'Valledupar',
            barrio: 'Centro',
            _searchText: '',
          },
          {
            id: 2,
            nombre: 'Verduras Frescas La Huerta',
            categoria: 'Mercados',
            descripcion: 'Verduras y frutas locales',
            direccion_exacta: 'Avenida Siempreviva 742',
            telefono: '+57300111333',
            horario: 'Todos los días 7am - 6pm',
            imagen_url: '/placeholder-600x400.png',
            rating: 4.9,
            ciudad: 'Valledupar',
            barrio: 'La Nevada',
            _searchText: '',
          },
          {
            id: 3,
            nombre: 'Ferretería El Martillo',
            categoria: 'Ferreterías',
            descripcion: 'Todo para tus reparaciones',
            direccion_exacta: 'Carrera 10 #20-30',
            telefono: '+57300111444',
            horario: 'Lunes a Viernes 8am - 6pm',
            imagen_url: '/placeholder-600x400.png',
            rating: 4.5,
            ciudad: 'Bosconia',
            barrio: 'Centro',
            _searchText: '',
          },
        ];
        // calcular _searchText
        fallback.forEach(f => (f._searchText = makeSearchText(f)));
        setNegocios(fallback);
        setFiltered(fallback);
        setLoading(false);
      } catch (err: any) {
        console.error('[SearchResults] error fetching negocios', err);
        setError('No se pudieron cargar los negocios.');
        setLoading(false);
      }
    })();
  }, []);

  // lista de categorias únicas (computada)
  const categoriasList = useMemo(() => {
    const setCat = new Set<string>();
    negocios.forEach(n => {
      if (n.categoria && n.categoria.trim()) setCat.add(n.categoria.trim());
    });
    return ['Todos', ...Array.from(setCat)];
  }, [negocios]);

  // función de filtrado centralizada — se ejecuta cuando cambian los inputs
  useEffect(() => {
    if (!negocios || negocios.length === 0) {
      setFiltered([]);
      return;
    }

    const term = (searchTerm || '').trim().toLowerCase();
    const loc = (locationTerm || '').trim().toLowerCase();
    const cat = (categoria || 'Todos').toLowerCase();

    let results = negocios;

    if (cat !== 'todos') {
      results = results.filter(n => (n.categoria || '').toLowerCase() === cat);
    }

    if (term) {
      results = results.filter(n => {
        // busca en el campo precomputado _searchText que ya contiene nombre, desc, telefono, categoría, ciudad, barrio y dirección
        return (n._searchText || '').includes(term);
      });
    }

    if (loc) {
      results = results.filter(n => {
        // buscar en ciudad, barrio o dirección
        return (
          (n.ciudad || '').toLowerCase().includes(loc) ||
          (n.barrio || '').toLowerCase().includes(loc) ||
          (n.direccion_exacta || '').toLowerCase().includes(loc)
        );
      });
    }

    setFiltered(results);
  }, [searchTerm, locationTerm, categoria, negocios]);

  const handleClear = () => {
    setSearchTerm('');
    setLocationTerm('');
    setCategoria('Todos');
    setFiltered(negocios);
  };

  return (
    <div className="search-results-content container">
      <header className="search-header">
        <h1 className="search-title">Encuentra lo que necesitas</h1>
        <p className="search-subtitle">Busca en docenas de negocios locales cerca de ti.</p>

        <div className="search-box">
          <input
            type="text"
            placeholder="Pizza, ferretería, panadería..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchTerm('');
            }}
          />
          <input
            type="text"
            placeholder="Tu ciudad o barrio"
            value={locationTerm}
            onChange={(e) => setLocationTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setLocationTerm('');
            }}
          />
          <button onClick={() => { /* búsqueda es reactiva por useEffect, pero dejamos botón para compatibilidad */ }}>
            🔍 
          </button>
          <button onClick={handleClear} style={{ marginLeft: 8 }}>
            ✖ 
          </button>
        </div>
      </header>

      <main className="main-content">
        <aside className="filter-sidebar">
          <h3>Filtros</h3>
          <div className="filter-group">
            <label htmlFor="categoria">Categoría</label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {categoriasList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </aside>

        <section className="results-grid">
          <h2>{filtered.length} Resultados</h2>
          {loading && <p>Cargando negocios...</p>}
          {error && <p className="error">{error}</p>}
          <div className="negocios-list">
            {filtered.map(n => (
              <BusinessCard key={n.id} negocio={n} onClick={(id) => setSelectedId(id)} />
            ))}
          </div>
        </section>
      </main>

      {selectedId && (
        <BusinessModal
          negocioId={selectedId}
          onClose={() => setSelectedId(null)}
          onSelectProducto={(p) => {
            console.log('producto seleccionado', p);
          }}
        />
      )}
    </div>
  );
};

export default SearchResults;
