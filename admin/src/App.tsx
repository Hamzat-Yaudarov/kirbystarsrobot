import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Promocodes from './pages/Promocodes'
import Tasks from './pages/Tasks'
import Lotteries from './pages/Lotteries'
import Channels from './pages/Channels'
import Pets from './pages/Pets'
import Broadcasts from './pages/Broadcasts'
import { CircularProgress, Box } from '@mui/material'

const App: React.FC = () => {
  const { admin, loading } = useAuth()

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!admin) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/promocodes" element={<Promocodes />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/lotteries" element={<Lotteries />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/pets" element={<Pets />} />
        <Route path="/broadcasts" element={<Broadcasts />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
