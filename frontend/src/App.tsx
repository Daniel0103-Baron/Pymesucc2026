import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardEmpresa from './pages/DashboardEmpresa';
import EncuestaForm from './pages/EncuestaForm';
import ConsultorDashboard from './pages/ConsultorDashboard';
import UniversidadDashboard from './pages/UniversidadDashboard';
import { useAuthStore } from './store/useAuthStore';

type RolUsuario = 'empresa' | 'semillero' | 'universidad';

const rutaInicioPorRol: Record<RolUsuario, string> = {
  empresa: '/dashboard',
  semillero: '/dashboard/resultados',
  universidad: '/dashboard/universidad',
};

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RoleRoute({ children, allowedRoles }: { children: ReactElement; allowedRoles: RolUsuario[] }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.rol)) {
    return <Navigate to={rutaInicioPorRol[user.rol]} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    return <Navigate to={rutaInicioPorRol[user.rol]} replace />;
  }

  return children;
}

function DashboardEntry() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
        <Route
          path="/login"
          element={(
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          )}
        />
        
        {/* Rutas Protegidas (Requieren Auth) */}
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<DashboardEntry />} />
          <Route
            path="encuesta"
            element={(
              <RoleRoute allowedRoles={['empresa']}>
                <EncuestaForm />
              </RoleRoute>
            )}
          />
          <Route
            path="resultados"
            element={(
              <RoleRoute allowedRoles={['semillero']}>
                <ConsultorDashboard />
              </RoleRoute>
            )}
          />
          <Route
            path="universidad"
            element={(
              <RoleRoute allowedRoles={['universidad']}>
                <UniversidadDashboard />
              </RoleRoute>
            )}
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

