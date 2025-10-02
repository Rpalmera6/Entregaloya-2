import React, { useState } from 'react';
import '../styles.css';
import './Register.css';
import { postJson } from '../services/api';

interface Categoria {
  id: number;
  nombre: string;
}

interface RegisterProps {
  categorias: Categoria[];
  onSwitchToLogin: () => void;
}

const Register = ({ categorias, onSwitchToLogin }: RegisterProps) => {
  const [userType, setUserType] = useState('cliente');
  const [msg, setMsg] = useState<string | null>(null);

  const handleClientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    const { ok, data } = await postJson('/api/auth/register', body);
    if (ok && data.ok) {
      setMsg('Registro cliente exitoso. Inicia sesión.');
      form.reset();
    } else {
      setMsg(data.msg || 'Error al registrar');
    }
  };

  const handleBusinessSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    const { ok, data } = await postJson('/api/auth/register', body);
    if (ok && data.ok) {
      setMsg('Registro negocio exitoso. Inicia sesión.');
      form.reset();
    } else {
      setMsg(data.msg || 'Error al registrar negocio');
    }
  };

  return (
    <div className="form-container">
      <div className="tabs">
        <button id="tab-client" style={{cursor: 'pointer'}} className={`tab ${userType === 'cliente' ? 'active' : ''}`} onClick={() => setUserType('cliente')}>Cliente</button>
        <button id="tab-business" style={{cursor: 'pointer'}} className={`tab ${userType === 'negocio' ? 'active' : ''}`} onClick={() => setUserType('negocio')}>Negocio</button>
      </div>

      {userType === 'cliente' ? (
        <form id="form-client" onSubmit={handleClientSubmit}>
          <input type="hidden" name="tipo" value="cliente" />
          <div className="form-group">
            <label htmlFor="client-name">Nombre Completo</label>
            <input type="text" id="client-name" name="nombre" required />
          </div>
          <div className="form-group">
            <label htmlFor="client-phone">Teléfono / WhatsApp</label>
            <input type="tel" id="client-phone" name="telefono" required />
          </div>
          <div className="form-group">
            <label htmlFor="client-password">Contraseña</label>
            <input type="password" id="client-password" name="password" required />
          </div>
          <div className="form-group">
            <label htmlFor="client-ciudad">Ciudad</label>
            <input type="text" id="client-ciudad" name="ciudad" required />
          </div>
          <div className="form-group">
            <label htmlFor="client-cp">Código Postal</label>
            <input type="text" id="client-cp" name="codigo_postal" required />
          </div>
          <div className="form-group">
            <label htmlFor="client-barrio">Barrio</label>
            <input type="text" id="client-barrio" name="barrio" required />
          </div>
          <div className="form-group">
            <label htmlFor="client-dir">Dirección exacta de vivienda</label>
            <input type="text" id="client-dir" name="direccion_exacta" required />
          </div>
          <div className="form-group">
            <button type="submit">Registrarme como Cliente</button>
          </div>
          {msg && <p>{msg}</p>}
          <p>¿Ya tienes una cuenta? <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}>Ingresa</a></p>
        </form>
      ) : (
        <form id="form-business" onSubmit={handleBusinessSubmit}>
          <input type="hidden" name="tipo" value="negocio" />
          <div className="form-group">
            <label htmlFor="business-full-name">Nombre del Propietario</label>
            <input type="text" id="business-full-name" name="nombre" required />
          </div>
          <div className="form-group">
            <label htmlFor="business-name">Nombre del Negocio</label>
            <input type="text" id="business-name" name="nombre_negocio" required />
          </div>
          <div className="form-group">
            <label htmlFor="business-phone">Teléfono / WhatsApp</label>
            <input type="tel" id="business-phone" name="telefono" required />
          </div>
          <div className="form-group">
            <label htmlFor="business-password">Contraseña</label>
            <input type="password" id="business-password" name="password" required />
          </div>
          <div className="form-group">
            <label htmlFor="business-category">Categoría</label>
            <select id="business-category" name="categoria" required>
              <option value="">Seleccione...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="business-ciudad">Ciudad</label>
            <input type="text" id="business-ciudad" name="ciudad" required />
          </div>
          <div className="form-group">
            <label htmlFor="business-cp">Código Postal</label>
            <input type="text" id="business-cp" name="codigo_postal" required />
          </div>
          <div className="form-group">
            <label htmlFor="business-barrio">Barrio</label>
            <input type="text" id="business-barrio" name="barrio" required />
          </div>
          <div className="form-group">
            <label htmlFor="business-dir">Dirección exacta del local</label>
            <input type="text" id="business-dir" name="direccion_exacta" required />
          </div>
          <div className="form-group">
            <button type="submit">Registrarme como Negocio</button>
          </div>
          {msg && <p>{msg}</p>}
          <p>¿Ya tienes una cuenta? <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}>Ingresa</a></p>
        </form>
      )}
    </div>
  );
};

export default Register;
