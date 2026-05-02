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
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'GestionCourrierAbp_App',
      username: login,
      password,
      scope: 'GestionCourrierAbp'
    });

    const response = await axios.post('/connect/token', body, {
      baseURL: process.env.REACT_APP_ABP_API_URL || 'http://localhost:44301',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const token = response.data.access_token;
    const userLogin = login;
    const nomComplet = login;
    const idService = Number(localStorage.getItem('idService') || 1);
    const nomService = localStorage.getItem('nomService') || 'ABP';

    localStorage.setItem('token', token);
    localStorage.setItem('login', userLogin);
    localStorage.setItem('nomService', nomService);
    localStorage.setItem('idService', idService);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser({ token, login: userLogin, nomComplet, idService, nomService });
    return response.data;
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
