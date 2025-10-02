// src/components/EditProfile.tsx
import React, { useEffect, useState, useRef } from 'react';
import { putJson, API_BASE, getJson } from '../services/api';
import './EditProfile.css';

// 🌟 Definición de UserType actualizado (asegurando campos esenciales requeridos al editar)
// NOTA: Lo ideal es IMPORTAR este tipo desde App.tsx si lo exportaste allí.
export type UserType = {
  id: number; // Requerido, ya que el usuario debe estar logueado para editar
  nombre: string;
  telefono: string;
  tipo: 'cliente' | 'negocio' | string;
  // Campos opcionales
  ciudad?: string;
  barrio?: string;
  codigo_postal?: string;
  direccion_exacta?: string;
  imagen_url?: string;
  nombre_negocio?: string;
  descripcion?: string;
  categoria_id?: number | string | null; // Añadido | null para consistencia
  [k: string]: any;
};

interface Props {
  // 🌟 User ya no es opcional (no puede ser null en esta pantalla)
  user: UserType; 
  // 🌟 onSaved ya no es opcional y espera un UserType actualizado (no nulo)
  onSaved: (user: UserType) => void;
}

// 🌟 Tipado actualizado para que initialUser sea UserType y onSaved sea requerido
const EditProfile: React.FC<Props> = ({ user: initialUser, onSaved }) => {
  // 🌟 Eliminamos | null del useState, ya que initialUser es UserType
  // Si initialUser está ausente, simplemente devolvemos la pantalla de "No hay usuario cargado."
  const [user, setUser] = useState<UserType>(initialUser);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Ya no necesitamos la lógica de cargar desde localStorage si 'user' es un prop requerido.
    // Simplemente usamos el prop inicial.
    setUser(initialUser);

    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser]); // Dependencia actualizada para reflejar que solo depende de initialUser

  // cargar categorias si es negocio (o siempre, no es costoso)
  useEffect(() => {
    (async () => {
      setLoadingCategorias(true);
      try {
        const res = await getJson('/api/categorias');
        if (res.ok && res.data && Array.isArray(res.data.categorias)) {
          setCategorias(res.data.categorias);
        } else {
          setCategorias([]);
        }
      } catch (err) {
        console.error('Error cargando categorías', err);
        setCategorias([]);
      } finally {
        setLoadingCategorias(false);
      }
    })();
  }, []);

  // La verificación inicial de `!user` ya no es necesaria, ya que `initialUser` 
  // ya está en el estado `user` y está garantizado ser `UserType` por las Props.
  // Sin embargo, por seguridad si el estado interno se corrompe:
  if (!user || !user.id) return <div className="form-container"><p>No hay usuario cargado.</p></div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Ahora que user es UserType, el tipado es más simple.
    setUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id) return;
    setLoading(true);
    setMsg(null);

    // Los campos esenciales ya son accesibles directamente
    const payload: any = {
      nombre: user.nombre,
      telefono: user.telefono,
      ciudad: user.ciudad || null, // Manejar opcionales con null
      barrio: user.barrio || null,
      codigo_postal: user.codigo_postal || null,
      direccion_exacta: user.direccion_exacta || null,
    };

    // Uso de `as any` se puede mantener si es necesario para campos de negocio,
    // pero la declaración de UserType ya incluye [k: string]: any, lo que ayuda.
    if (user.tipo === 'negocio') {
      payload.nombre_negocio = user.nombre_negocio || null;
      payload.descripcion = user.descripcion || null;
      
      let catId = user.categoria_id;
      if (typeof catId === 'string' && catId.trim() === '') {
        catId = null;
      }
      if (catId !== undefined && catId !== null) {
        const parsed = Number(catId);
        payload.categoria_id = Number.isNaN(parsed) ? catId : parsed;
      } else {
        payload.categoria_id = null;
      }
    }

    try {
      const res = await putJson(`/api/usuarios/${user.id}`, payload);
      setLoading(false);

      if (res.ok && res.data && res.data.ok) {
        setMsg('Perfil actualizado correctamente.');
        const returned = res.data.user || {};
        if (returned.tipo === undefined && (returned.tipo_usuario !== undefined)) {
          returned.tipo = returned.tipo_usuario;
          delete returned.tipo_usuario;
        }
        
        // 🌟 mergedUser está garantizado como UserType (ya que user era UserType)
        const mergedUser: UserType = { ...user, ...returned } as UserType; 
        localStorage.setItem('user', JSON.stringify(mergedUser));
        setUser(mergedUser);
        // 🌟 onSaved ahora está garantizado que existe y recibe el tipo correcto
        onSaved(mergedUser); 
      } else {
        setMsg(res.data?.msg || 'Error al actualizar.');
      }
    } catch (err) {
      setLoading(false);
      setMsg('Error de comunicación con el servidor.');
      console.error('EditProfile save error', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !user.id) return;
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Cleanup anterior
    if (preview) URL.revokeObjectURL(preview);

    // Preview local
    const url = URL.createObjectURL(file);
    setPreview(url);

    // Subir archivo
    setUploading(true);
    setMsg(null);

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`${API_BASE}/api/usuarios/${user.id}/upload_imagen`, {
        method: 'POST',
        body: fd,
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        const imagen_url = json.imagen_url || '';
        // actualizar state y localStorage
        const updated: UserType = { ...user, imagen_url };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        setMsg('Imagen subida correctamente.');
        // 🌟 onSaved ahora está garantizado que existe
        onSaved(updated); 
      } else {
        setMsg(json?.msg || 'Error subiendo imagen.');
      }
    } catch (err) {
      console.error('Upload error', err);
      setMsg('Error de comunicación al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const currentImage = preview || user.imagen_url || '';

  return (
    <div className="form-container" style={{ maxWidth: 900, margin: '20px auto' }}>
      <h2>Editar Perfil</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ width: 160 }}>
            <div style={{ width: 160, height: 120, background: '#f2f2f2', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentImage ? <img src={currentImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ padding: 8, textAlign: 'center' }}>Sin imagen</div>}
            </div>
            <div style={{ marginTop: 8 }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />
              {uploading && <div style={{ fontSize: 13 }}>Subiendo...</div>}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div className="form-group">
              <label>Nombre</label>
              <input name="nombre" value={user.nombre || ''} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Teléfono</label>
              <input name="telefono" value={user.telefono || ''} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Ciudad</label>
              <input name="ciudad" value={user.ciudad || ''} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Código Postal</label>
              <input name="codigo_postal" value={user.codigo_postal || ''} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Barrio</label>
              <input name="barrio" value={user.barrio || ''} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Dirección exacta</label>
              <input name="direccion_exacta" value={user.direccion_exacta || ''} onChange={handleChange} />
            </div>
          </div>
        </div>

        {user.tipo === 'negocio' && (
          <>
            <div className="form-group">
              <label>Nombre del negocio</label>
              <input name="nombre_negocio" value={user.nombre_negocio || ''} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Categoría</label>
              {loadingCategorias ? (
                <div>Cargando categorías...</div>
              ) : (
                <select
                  name="categoria_id"
                  value={user.categoria_id ?? ''}
                  onChange={handleChange}
                >
                  <option value="">-- Sin categoría --</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea name="descripcion" value={user.descripcion || ''} onChange={handleChange} />
            </div>
          </>
        )}

        <div className="form-group">
          <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
        {msg && <p>{msg}</p>}
      </form>
    </div>
  );
};

export default EditProfile;