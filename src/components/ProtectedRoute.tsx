import React from 'react'
import { Navigate } from 'react-router-dom'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = localStorage.getItem('sme_auth')
  if (!auth) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default ProtectedRoute
