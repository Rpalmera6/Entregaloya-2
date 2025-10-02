// src/context/UserContext.tsx

import React, { useState, createContext, ReactNode } from 'react';

// 1. Definición de Tipos (lo que DashboardCliente y DashboardNegocio esperan)
export type UserType = {
    id: number;
    nombre: string;
    tipo: 'cliente' | 'negocio' | 'admin';
    negocio_id: number | null; // El ID del negocio (null si es cliente)
    telefono?: string;
};

interface UserContextValue {
    user: UserType | null;
    setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
}

// 2. Creación del Contexto
// Creamos un valor por defecto que concuerde con la interfaz
export const UserContext = createContext<UserContextValue>({
    user: null,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setUser: () => {}, 
});

// 3. Componente Proveedor (Para envolver tu App en App.tsx)
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Aquí puedes inicializar el estado del usuario leyendo del localStorage, por ejemplo
    const [user, setUser] = useState<UserType | null>(null);

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

// Nota: Debes asegurarte de que tu Login.tsx y Register.tsx
// usen la función 'setUser' para guardar el usuario al iniciar sesión.