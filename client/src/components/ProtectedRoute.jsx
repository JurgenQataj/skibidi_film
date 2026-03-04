import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from "../store/useAuthStore";

function ProtectedRoute({ children }) {
  const { token } = useAuthStore();

  if (!token) {
    // Se non c'è il token, reindirizza l'utente alla pagina di login
    return <Navigate to="/login" />;
  }

  // Se c'è il token, mostra la pagina richiesta
  return children;
}

export default ProtectedRoute;