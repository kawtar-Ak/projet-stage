import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard'; // un composant générique
import GererServices from './pages/GererServices';
import GererUtilisateurs from './pages/GererUtilisateurs';
import GererEquipements from './pages/GererEquipements';
import GererCourriers from './pages/GererCourriers';
import Registre from './pages/Registre';
// ... puis dans les routes

// ... importez toutes vos pages (equipements, transactions, etc.)
import './theme.css';

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <PrivateRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </PrivateRoute>
      } />
      {/* Routes pour chaque fonctionnalité (selon les paths définis dans le menu) */}
      <Route path="/courriers" element={<PrivateRoute><MainLayout><GererCourriers /></MainLayout></PrivateRoute>} />
      <Route path="/registre" element={<PrivateRoute><MainLayout><Registre /></MainLayout></PrivateRoute>} />
      <Route path="/equipements" element={<PrivateRoute><MainLayout><GererEquipements /></MainLayout></PrivateRoute>} />
      <Route path="/services" element={<PrivateRoute><MainLayout><GererServices /></MainLayout></PrivateRoute>} />
      <Route path="/utilisateurs" element={<PrivateRoute><MainLayout><GererUtilisateurs /></MainLayout></PrivateRoute>} />
      {/* ... ajoutez les autres routes */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;