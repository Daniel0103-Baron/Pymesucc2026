import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function DashboardLayout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const location = useLocation();

  const etiquetaRol = (rol?: string): string => {
    if (rol === 'semillero') return 'Consultor';
    if (rol === 'universidad') return 'Universidad colaborativa/parques científicos y tecnológicos';
    return rol ?? '';
  };

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const itemClass =
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors';

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-0 md:p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col overflow-hidden border border-[#E5E7EB] bg-[#FFFFFF] md:min-h-[calc(100vh-2rem)] md:flex-row md:rounded-3xl md:shadow-[0_20px_55px_rgba(51,51,51,0.08)]">
        <aside className="w-full border-b border-[#E5E7EB] bg-[#FCFCFD] md:w-[260px] md:border-b-0 md:border-r md:flex md:flex-col">
          <div className="shrink-0 border-b border-[#E5E7EB] px-6 py-6">
            <h1 className="text-[30px] leading-none font-extrabold tracking-tight text-[#00ACC9]">SIEDSS</h1>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">Panel UCC</p>
          </div>

          <nav className="flex-1 space-y-5 p-4">
            <div className="space-y-1">
              <Link
                to="/dashboard"
                className={`${itemClass} ${
                  location.pathname === '/dashboard'
                    ? 'bg-[#EEF7FA] text-[#00ACC9]'
                    : 'text-[#333333] hover:bg-[#F2F4F7]'
                }`}
              >
                <Home size={17} />
                <span>Dashboard</span>
              </Link>

              {user?.rol === 'empresa' && (
                <Link
                  to="/dashboard/encuesta"
                  className={`${itemClass} ${
                    location.pathname === '/dashboard/encuesta'
                      ? 'bg-[#EEF7FA] text-[#00ACC9]'
                      : 'text-[#333333] hover:bg-[#F2F4F7]'
                  }`}
                >
                  <ClipboardList size={17} />
                  <span>Realizar Encuesta</span>
                </Link>
              )}

              {user?.rol === 'semillero' && (
                <Link
                  to="/dashboard/resultados"
                  className={`${itemClass} ${
                    location.pathname === '/dashboard/resultados'
                      ? 'bg-[#EEF7FA] text-[#00ACC9]'
                      : 'text-[#333333] hover:bg-[#F2F4F7]'
                  }`}
                >
                  <BarChart3 size={17} />
                  <span>Resultados Empresas</span>
                </Link>
              )}

              {user?.rol === 'universidad' && (
                <Link
                  to="/dashboard/universidad"
                  className={`${itemClass} ${
                    location.pathname === '/dashboard/universidad'
                      ? 'bg-[#EEF7FA] text-[#00ACC9]'
                      : 'text-[#333333] hover:bg-[#F2F4F7]'
                  }`}
                >
                  <BarChart3 size={17} />
                  <span>Panel Universidad</span>
                </Link>
              )}
            </div>
          </nav>

          <div className="border-t border-[#E5E7EB] p-4">
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-3">
              <p className="truncate text-sm font-semibold text-[#333333]">{user?.correo}</p>
              <p className="text-xs text-[#6B7280]">{etiquetaRol(user?.rol)}</p>
              <button
                onClick={logout}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F5F7FA] hover:text-[#00ACC9]"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[#F7F8FA]">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-[#FFFFFF]/95 px-4 md:px-8 backdrop-blur">
            <h2 className="text-base font-bold text-[#333333] md:text-xl">
              {location.pathname === '/dashboard' && 'Dashboard'}
              {location.pathname === '/dashboard/encuesta' && 'Instrumento de Evaluación'}
              {location.pathname.startsWith('/dashboard/resultados') && 'Resultados'}
              {location.pathname.startsWith('/dashboard/universidad') && 'Panel Universidad'}
            </h2>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-[#333333]">{user?.correo?.split('@')[0]}</p>
                <p className="text-xs text-[#00ACC9]">{etiquetaRol(user?.rol)}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#00ACC9] text-sm font-bold text-[#FFFFFF]">
                {user?.correo?.charAt(0).toUpperCase() ?? 'U'}
              </div>
            </div>
          </header>

          <div className="h-[calc(100vh-4rem)] overflow-y-auto p-4 md:p-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
