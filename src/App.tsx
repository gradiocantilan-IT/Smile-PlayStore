import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { Marketplace } from './pages/Marketplace';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { authenticated } = useAuth();
  return authenticated ? <>{children}</> : <Navigate to="/admin/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Marketplace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
