import React, { useState } from 'react';
import '../styles.css';
import './Login.css';
import { postJson } from '../services/api';

const Login = ({ onSwitchToRegister }: any) => {
  const [tipo, setTipo] = useState('cliente');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    const body = { tipo, telefono, password };
    const { ok, data } = await postJson('/api/auth/login', body);

    if (ok && data.ok) {
      // Guardamos user en localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      // Guardamos un flag de redirección (opcional)
      const redirectPage = data.user.tipo === 'negocio' ? 'dashboard-negocio' : 'dashboard-cliente';
      localStorage.setItem('redirect', redirectPage);

      // Redirigimos al root para que App.tsx detecte el user y muestre el dashboard
      window.location.href = '/';
    } else {
      setMsg(data.msg || 'Error al iniciar sesión');
    }
  };

  return (
    <section className="form-container">
      <h2>Iniciar Sesión</h2>
      <form id="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Tipo de Usuario</label>
          <div>
            <label>
              <input type="radio" name="tipo" value="cliente" checked={tipo === 'cliente'} onChange={() => setTipo('cliente')} /> Cliente
            </label>
            <label style={{ marginLeft: '10px' }}>
              <input type="radio" name="tipo" value="negocio" checked={tipo === 'negocio'} onChange={() => setTipo('negocio')} /> Negocio
            </label>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="login-phone">Teléfono / WhatsApp</label>
          <input type="tel" id="login-phone" name="telefono" required value={telefono} onChange={e => setTelefono(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Contraseña</label>
          <input type="password" id="login-password" name="password" required value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <button type="submit">Ingresar</button>
        </div>
        {msg && <p>{msg}</p>}
        <p>¿No tienes una cuenta? <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }}>Regístrate</a></p>
      </form>
    </section>
  );
};

export default Login;
