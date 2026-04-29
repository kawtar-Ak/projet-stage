import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const login = localStorage.getItem('login');
    const nomService = localStorage.getItem('nomService');
    const idService = localStorage.getItem('idService');
    if (token && login) {
      setUser({ token, login, nomService, idService: parseInt(idService) });
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (login, password) => {
    const response = await axios.post('/api/auth/login', {
      login: login.trim(),
      password,
    });

    const data = response.data;
    const token = data.token || data.Token;
    const id = data.id || data.Id;
    const userLogin = data.login || data.Login;
    const nomComplet = data.nomComplet || data.NomComplet;
    const idService = data.idService || data.IdService;
    const nomService = data.nomService || data.NomService;

    localStorage.setItem('token', token);
    localStorage.setItem('login', userLogin);
    localStorage.setItem('nomComplet', nomComplet || '');
    localStorage.setItem('nomService', nomService);
    localStorage.setItem('idService', idService);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser({ token, id, login: userLogin, nomComplet, idService, nomService });
    return data;
  };

  const logout = () => {
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
