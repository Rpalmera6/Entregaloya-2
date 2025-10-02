// src/components/Home.tsx
import React, { useEffect, useState } from 'react';
import './Home.css';
import BusinessCard from './BusinessCard';
import BusinessModal from './BusinessModal';
import { getJson, getImageUrl } from '../services/api'; 

// **********************************************
// [CORRECCIÓN FINAL] IMÁGENES DEL CARRUSELA
// Usamos new URL() y rutas relativas. Esto le dice a Vite
// que procese el asset para obtener la URL correcta en el build.dddD
// **********************************************

// Rutas relativas desde src/components/Home.tsx hasta src/assets/
const CAROUSEL_IMAGES_PATHS: string[] = [
  '../assets/ARA-D1.jpg',
  '../assets/Bannerprincipal-D1.jpg', 
  '../assets/Bannerotiendaolimpica.jpg',
];

// Función para obtener la URL procesada por Vite
const getAssetUrl = (relativePath: string): string => {
    try {
        // La URL se construye usando el path relativo y la ubicación del archivo actual (Home.tsx)
        return new URL(relativePath, import.meta.url).href;
    } catch (e) {
        console.error(`Error al procesar la URL para el carrusel: ${relativePath}`, e);
        return relativePath; // Fallback
    }
}

// Pre-procesamos las URLS para usarlas en el estado
const CAROUSEL_IMAGES: string[] = CAROUSEL_IMAGES_PATHS.map(getAssetUrl);


interface Negocio {
  id: number;
  nombre: string;
  nombre_negocio?: string;
  categoria?: string;
  descripcion?: string;
  direccion_exacta?: string;
  telefono?: string;
  horario?: string;
  imagen_url?: string;
  es_patrocinador?: boolean;
  es_destacado?: boolean;
}

interface HomeProps {
  user?: { id?: number; nombre?: string; tipo?: string } | null;
  onOpenProfile?: (id: number) => void;
}

const Home: React.FC<HomeProps> = ({ user = null, onOpenProfile }) => {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  // --------------------------
  const carouselImages = CAROUSEL_IMAGES.filter(Boolean);

  // --------------------------
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getJson('/api/negocios');
        if (res.ok && res.data && Array.isArray(res.data.negocios)) {
          const normalized = res.data.negocios.map((n: any) => ({
            id: n.id,
            nombre: n.nombre || n.nombre_negocio || '',
            nombre_negocio: n.nombre_negocio,
            categoria: n.categoria,
            descripcion: n.descripcion,
            direccion_exacta: n.direccion_exacta,
            telefono: n.telefono || n.telefono_negocio,
            horario: n.horario,
            imagen_url: n.imagen_url || n.imagen || '',
            es_patrocinador: n.es_patrocinador || false,
            es_destacado: n.es_destacado || false,
          }));
          setNegocios(normalized);
        } else if (res.ok && res.data && Array.isArray(res.data)) {
          setNegocios(res.data);
        } else {
          // Datos de prueba
          setNegocios([
            { id: 1, nombre: 'Panadería Don Manolo', categoria: 'Panaderías', descripcion: 'Pan fresco', direccion_exacta: 'Calle Falsa 123', telefono: '+57300111222', horario: '6am-8pm', imagen_url: '/placeholder-600x400.png', es_patrocinador: true, es_destacado: true },
            { id: 2, nombre: 'Verduras Frescas La Huerta', categoria: 'Mercados', descripcion: 'Verduras', direccion_exacta: 'Av SiempreViva', telefono: '+57300111333', horario: '7am-6pm', imagen_url: '/placeholder-600x400.png', es_destacado: true },
          ]);
        }
      } catch (err: any) {
        console.error('Error cargando negocios:', err);
        setError('No se pudieron cargar los negocios.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const destacados = negocios.filter(n => n.es_destacado);
  const regulares = negocios.filter(n => !n.es_destacado);

  // pre-cargar imágenes (La importación ya no es necesaria, solo la verificación)
  useEffect(() => {
    carouselImages.forEach(src => {
      console.log('[carousel] Intentando cargar con URL procesada:', src);
      const img = new Image();
      img.src = src;
      img.onerror = () => console.error(`[carousel] ¡ERROR CRÍTICO! NO se pudo cargar. URL Final: ${src}`);
    });
  }, [carouselImages]);

  // Intervalo automático para el carrusel
  useEffect(() => {
    if (carouselImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  const handleToggleShow = () => {
    setShowAll(prev => !prev);
  };

  // Si un negocio no tiene imagen_url, usamos una imagen local como fallback cíclico
  const negociosConUrlCorregida = negocios.map((n, i) => {
    // La imagen de fallback local usa la URL ya procesada
    const fallbackUrl = carouselImages[i % carouselImages.length] || '';

    return {
      ...n,
      // Aplicamos getImageUrl a la URL de la base de datos para que apunte a Flask (5000)
      // Si la URL de la DB no existe, usa el fallback pre-procesado
      imagen_url: n.imagen_url && n.imagen_url.trim() !== '' ? getImageUrl(n.imagen_url) : fallbackUrl,
    };
  });

  const displayedDestacados = negociosConUrlCorregida.filter(n => n.es_destacado);
  const displayedRegulares = negociosConUrlCorregida.filter(n => !n.es_destacado);
  const displayedAll = showAll ? displayedRegulares : displayedRegulares.slice(0, 6);


  return (
    <div className="home-content">
      <header className="hero-section">
        <div className="carousel-background" style={{ overflow: 'hidden' }}>
          {carouselImages.map((url, index) => (
            <div
              key={index}
              className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
              style={{
                // Solo dejamos el fondo dinámico y el zIndex.
                backgroundImage: `linear-gradient(rgba(10, 89, 96, 0.40), rgba(10, 89, 96, 0.40)), url(${url})`, 
                zIndex: index === currentSlide ? 1 : 0,
              }}
            />
          ))}
          <div className="carousel-dots" style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}>
            {carouselImages.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Ir a slide ${index + 1}`}
                type="button"
              />
            ))}
          </div>
        </div>
        
        {/* ... (Resto del JSX) ... */}

        <div className="hero-overlay">
          <div className="container">
            <div className="hero-content-wrapper">
              <span className="hero-badge">🚀 Conecta con tu comunidad</span>
              <h1 className="hero-title">Tu Tienda Local, a un WhatsApp de Distancia</h1>
              <p className="hero-subtitle">
                Encuentra, ordena y conecta con los negocios de tu barrio. Rápido, fácil y directo.
              </p>
              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-number">{negocios.length}+</span>
                  <span className="stat-label">Negocios</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Disponible</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">Local</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        {displayedDestacados.length > 0 && (
          <section className="featured-businesses-section">
            <div className="section-header">
              <div className="section-title-wrapper">
                <span className="section-icon">⭐</span>
                <h2>Negocios Destacados</h2>
              </div>
              <p>Descubre los favoritos de la comunidad y apoya el comercio local.</p>
            </div>

            {loading && <div className="loading-spinner">Cargando negocios...</div>}
            {error && <p className="error">{error}</p>}

            <div className="featured-grid">
              {displayedDestacados.map((neg) => (
                <BusinessCard
                  key={neg.id}
                  negocio={neg}
                  onClick={(id) => setSelectedId(id)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="all-businesses-section">
          <div className="section-header">
            <div className="section-title-wrapper">
              <span className="section-icon">🏪</span>
              <h2>Todos los Negocios</h2>
              </div>
            <p>Explora toda nuestra comunidad de comerciantes locales.</p>
          </div>

          <div className="businesses-grid">
            {displayedAll.length === 0 && !loading ? (
              <p className="no-results">No hay negocios disponibles.</p>
            ) : (
              displayedAll.map((neg) => (
                <BusinessCard
                  key={neg.id}
                  negocio={neg}
                  onClick={(id) => setSelectedId(id)}
                />
              ))
            )}
          </div>

          {displayedRegulares.length > 6 && (
            <div className="view-more-container">
              <button className="btn-view-all" onClick={handleToggleShow}>
                {showAll ? '← Ver menos' : `Ver todos los negocios (${displayedRegulares.length}) →`}
              </button>
            </div>
          )}
        </section>
      </div>

      {selectedId !== null && (
        <BusinessModal
          negocioId={selectedId}
          onClose={() => setSelectedId(null)}
          onSelectProducto={(p) => {
            console.log('Seleccionado producto desde Home modal: ', p);
          }}
          onOpenProfile={(id) => {
            if (typeof onOpenProfile === 'function') {
              onOpenProfile(id);
            } else {
              setSelectedId(null);
              window.location.href = `/negocios/${id}`;
            }
          }}
        />
      )}
    </div>
  );
};

export default Home;