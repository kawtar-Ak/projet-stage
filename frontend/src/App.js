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
import GererCourriersJuridiques from './pages/GererCourriersJuridiques';
import GestionCourriers from './pages/GestionCourriers';
import Registre from './pages/Registre';
import MessagesAdministratifs from './pages/MessagesAdministratifs';
import ActeursJudiciaires from './pages/ActeursJudiciaires';
import TransactionsOutgoing from './pages/TransactionsOutgoing';
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
      <Route path="/courriers" element={<PrivateRoute><MainLayout><GestionCourriers /></MainLayout></PrivateRoute>} />
      <Route path="/courriers-juridiques" element={<PrivateRoute><MainLayout><GererCourriersJuridiques /></MainLayout></PrivateRoute>} />
      <Route path="/registre" element={<PrivateRoute><MainLayout><Registre /></MainLayout></PrivateRoute>} />
      <Route path="/messages-administratifs" element={<PrivateRoute><MainLayout><MessagesAdministratifs /></MainLayout></PrivateRoute>} />
      <Route path="/acteurs-judiciaires" element={<PrivateRoute><MainLayout><ActeursJudiciaires /></MainLayout></PrivateRoute>} />
      <Route path="/transactions-outgoing" element={<PrivateRoute><MainLayout><TransactionsOutgoing /></MainLayout></PrivateRoute>} />
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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
