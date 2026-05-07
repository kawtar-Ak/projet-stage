import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { ABP_API_URL } from '../api/axiosConfig';

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
    const nomComplet = localStorage.getItem('nomComplet');
    if (token && login) {
      setUser({ token, login, nomComplet, nomService, idService: parseInt(idService) });
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (login, password) => {
    localStorage.removeItem('token');
    localStorage.removeItem('login');
    localStorage.removeItem('nomComplet');
    localStorage.removeItem('nomService');
    localStorage.removeItem('idService');
    delete axios.defaults.headers.common['Authorization'];

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'GestionCourrierAbp_App',
      username: login.trim(),
      password,
      scope: 'GestionCourrierAbp'
    });

    const response = await axios.post('/connect/token', body, {
      baseURL: ABP_API_URL,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const token = response.data.access_token;
    const userLogin = login.trim();

    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const profile = await getBusinessUserProfile(userLogin);
    const isArchiveLogin = userLogin.toLowerCase() === 'archive';
    const isGreffeLogin = userLogin.toLowerCase() === 'bureauordre';
    const nomComplet = profile?.nomComplet ||
      (isArchiveLogin ? 'Service Archive' : isGreffeLogin ? "Greffier - Bureau d'ordre" : userLogin);
    const idService = Number(profile?.idService || profile?.serviceId || (isArchiveLogin ? 13 : isGreffeLogin ? 2 : 1));
    const nomService = profile?.serviceNom || profile?.nomService || (isArchiveLogin ? 'الحفظ' : isGreffeLogin ? 'مكتب الضبط' : 'ABP');

    localStorage.setItem('login', userLogin);
    localStorage.setItem('nomComplet', nomComplet);
    localStorage.setItem('nomService', nomService);
    localStorage.setItem('idService', idService);
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

async function getBusinessUserProfile(login) {
  try {
    const response = await axios.get('/api/utilisateurs');
    return response.data?.find(user => user.login?.toLowerCase() === login.toLowerCase()) || null;
  } catch {
    return null;
  }
}
