import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { token } = useAuth();

  if (!token) {
    // Se non c'è il token, reindirizza l'utente alla pagina di login
    return <Navigate to="/login" />;
  }

  // Se c'è il token, mostra la pagina richiesta
  return children;
}

export default ProtectedRoute;