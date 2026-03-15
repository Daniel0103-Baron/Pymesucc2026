import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardEmpresa from './pages/DashboardEmpresa';
import EncuestaForm from './pages/EncuestaForm';
import ConsultorDashboard from './pages/ConsultorDashboard';
import UniversidadDashboard from './pages/UniversidadDashboard';
import { useAuthStore } from './store/useAuthStore';

function DashboardEntry() {
  const user = useAuthStore((state) => state.user);

  if (user?.rol === 'empresa') {
    return <DashboardEmpresa />;
  }

  if (user?.rol === 'universidad') {
    return <Navigate to="/dashboard/universidad" replace />;
  }

  return <Navigate to="/dashboard/resultados" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rutas Protegidas (Requieren Auth) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardEntry />} />
          <Route path="encuesta" element={<EncuestaForm />} />
          <Route path="resultados" element={<ConsultorDashboard />} />
          <Route path="universidad" element={<UniversidadDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

