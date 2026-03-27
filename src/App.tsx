import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import Finance        from './pages/Finance'
import Cost           from './pages/Cost'
import Marketing      from './pages/Marketing'
import BusinessReport from './pages/BusinessReport'
import Settings       from './pages/Settings'
import ImportCenter   from './pages/ImportCenter'

const App: React.FC = () => {
  return (
    <AppProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="finance"   element={<Finance />} />
          <Route path="cost"      element={<Cost />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="report"    element={<BusinessReport />} />
          <Route path="settings"  element={<Settings />} />
          <Route path="import"    element={<ImportCenter />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}

export default App
