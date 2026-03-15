import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, ClipboardList, Download, LineChart, Loader2, PlusCircle, RefreshCw, Search, TimerReset, X } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';

interface EmpresaCartera {
  empresa_id: string;
  razon_social: string;
  nit: string;
  sector: string;
  ciudad: string;
  tamano: string;
  representante: string;
  origen_registro: 'empresa' | 'consultor' | 'universidad';
  puede_aplicar_encuesta: boolean;
  estado: 'sin_encuesta' | 'en_proceso' | 'completada' | 'requiere_seguimiento';
  estado_etiqueta: string;
  ultima_evaluacion: string | null;
  puntaje_global: number | null;
  nivel_global: string | null;
  proxima_revision: string | null;
  dias_para_revision: number | null;
}

interface ResumenCartera {
  total_empresas: number;
  sin_encuesta: number;
  en_proceso: number;
  completadas: number;
  requiere_seguimiento: number;
}

interface RespuestaCartera {
  resumen: ResumenCartera;
  cartera: EmpresaCartera[];
  proximos_vencimientos: EmpresaCartera[];
}

interface DimensionHistorial {
  id_seccion: string;
  nombre_dimension: string;
  puntaje_porcentaje: number;
  nivel: string;
}

interface RegistroHistorial {
  id_resultado: string;
  id_encuesta: string;
  fecha_calculo: string;
  puntaje_global: number;
  nivel_global: string;
  dimensiones: DimensionHistorial[];
}

interface DimensionComparativa {
  id_seccion: string;
  nombre_dimension: string;
  puntaje_actual: number;
  puntaje_anterior: number;
  delta: number;
}

interface HistorialEmpresaResponse {
  empresa: {
    id: string;
    razon_social: string;
    nit: string;
    sector: string;
    ciudad: string;
  };
  historial: RegistroHistorial[];
  comparativo: {
    ultimo_id_resultado: string;
    anterior_id_resultado: string;
    delta_global: number;
    dimensiones: DimensionComparativa[];
  } | null;
}

interface RegistroEmpresaForm {
  nit: string;
  razon_social: string;
  sector: string;
  tamano: 'Micro' | 'Pequeña' | 'Mediana' | 'Grande';
  ciudad: string;
  ano_constitucion: string;
  representante: string;
  cargo_entrevistado: string;
  telefono: string;
  correo: string;
  password: string;
}

const ESTADOS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'sin_encuesta', label: 'Sin encuesta' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'completada', label: 'Completada' },
  { value: 'requiere_seguimiento', label: 'Requiere seguimiento' },
] as const;

const colorEstado = (estado: EmpresaCartera['estado']): string => {
  if (estado === 'completada') return '#3FAE49';
  if (estado === 'requiere_seguimiento') return '#F59E0B';
  if (estado === 'en_proceso') return '#0284C7';
  return '#64748B';
};

const etiquetaNivel = (nivel: string | null): string => {
  if (!nivel) return 'Sin dato';
  if (nivel === 'muy_bajo') return 'Muy Bajo';
  if (nivel === 'bajo') return 'Bajo';
  if (nivel === 'intermedio') return 'Intermedio';
  if (nivel === 'alto') return 'Alto';
  if (nivel === 'avanzado') return 'Avanzado';
  return nivel;
};

const etiquetaOrigenRegistro = (origen: EmpresaCartera['origen_registro']): string => {
  if (origen === 'consultor') return 'Registrada por consultor';
  if (origen === 'universidad') return 'Registrada por universidad';
  return 'Auto-registrada por empresa';
};

const escaparHtml = (texto: string): string => {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export default function ConsultorDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [estado, setEstado] = useState('todos');
  const [sector, setSector] = useState('todos');
  const [ciudad, setCiudad] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const [resumen, setResumen] = useState<ResumenCartera>({
    total_empresas: 0,
    sin_encuesta: 0,
    en_proceso: 0,
    completadas: 0,
    requiere_seguimiento: 0,
  });
  const [cartera, setCartera] = useState<EmpresaCartera[]>([]);
  const [vencimientos, setVencimientos] = useState<EmpresaCartera[]>([]);
  const [detalleEmpresa, setDetalleEmpresa] = useState<HistorialEmpresaResponse | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [avisoAccion, setAvisoAccion] = useState<string | null>(null);
  const [mostrarRegistroEmpresa, setMostrarRegistroEmpresa] = useState(false);
  const [loadingRegistroEmpresa, setLoadingRegistroEmpresa] = useState(false);
  const [errorRegistroEmpresa, setErrorRegistroEmpresa] = useState<string | null>(null);
  const [formRegistroEmpresa, setFormRegistroEmpresa] = useState<RegistroEmpresaForm>({
    nit: '',
    razon_social: '',
    sector: '',
    tamano: 'Micro',
    ciudad: '',
    ano_constitucion: '',
    representante: '',
    cargo_entrevistado: '',
    telefono: '',
    correo: '',
    password: 'Prueba123!',
  });

  const cargarCartera = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('estado', estado);
      params.set('sector', sector);
      params.set('ciudad', ciudad);
      params.set('busqueda', busqueda.trim());

      const resp = await api.get<RespuestaCartera>(`/empresas/cartera-consultor?${params.toString()}`);
      setResumen(resp.data.resumen);
      setCartera(resp.data.cartera);
      setVencimientos(resp.data.proximos_vencimientos);
    } catch {
      setError('No se pudo cargar la cartera de empresas del consultor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      void cargarCartera();
    }, 250);

    return () => clearTimeout(handle);
  }, [estado, sector, ciudad, busqueda]);

  const opcionesSector = useMemo(() => {
    const sectores = Array.from(new Set(cartera.map((e) => e.sector))).sort((a, b) => a.localeCompare(b));
    return ['todos', ...sectores];
  }, [cartera]);

  const opcionesCiudad = useMemo(() => {
    const ciudades = Array.from(new Set(cartera.map((e) => e.ciudad))).sort((a, b) => a.localeCompare(b));
    return ['todos', ...ciudades];
  }, [cartera]);

  const empresasSinEncuesta = useMemo(() => {
    return cartera.filter((empresa) => empresa.estado === 'sin_encuesta');
  }, [cartera]);

  const empresasSeguimientoVencido = useMemo(() => {
    return cartera.filter((empresa) => empresa.estado === 'requiere_seguimiento');
  }, [cartera]);

  const empresasSoloLectura = useMemo(() => {
    return cartera.filter((empresa) => !empresa.puede_aplicar_encuesta);
  }, [cartera]);

  const abrirDetalleEmpresa = async (empresaId: string) => {
    try {
      setLoadingDetalle(true);
      setErrorDetalle(null);
      const resp = await api.get<HistorialEmpresaResponse>(`/empresas/${empresaId}/historial-resultados`);
      setDetalleEmpresa(resp.data);
    } catch {
      setErrorDetalle('No se pudo cargar el historial de esta empresa.');
      setDetalleEmpresa(null);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarDetalleEmpresa = () => {
    setDetalleEmpresa(null);
    setErrorDetalle(null);
    setAvisoAccion(null);
  };

  const historialCronologico = useMemo(() => {
    return detalleEmpresa ? [...detalleEmpresa.historial].reverse() : [];
  }, [detalleEmpresa]);

  const sparklinePoints = useMemo(() => {
    if (!historialCronologico.length) return '';
    const width = 560;
    const height = 96;
    const padding = 8;
    const step = historialCronologico.length > 1 ? (width - padding * 2) / (historialCronologico.length - 1) : 0;
    return historialCronologico
      .map((item, index) => {
        const x = padding + index * step;
        const y = height - padding - ((item.puntaje_global / 100) * (height - padding * 2));
        return `${x},${y}`;
      })
      .join(' ');
  }, [historialCronologico]);

  const abrirComparativoPdf = () => {
    if (!detalleEmpresa) return;
    const ventana = window.open('about:blank', '_blank');
    if (!ventana) {
      setAvisoAccion('No se pudo abrir la ventana para exportar. Revisa bloqueador de ventanas.');
      return;
    }

    const comparativoRows = (detalleEmpresa.comparativo?.dimensiones ?? [])
      .map((dim) => `
        <tr>
          <td>${escaparHtml(dim.nombre_dimension)}</td>
          <td>${dim.puntaje_anterior}%</td>
          <td>${dim.puntaje_actual}%</td>
          <td style="font-weight:700;color:${dim.delta >= 0 ? '#15803D' : '#B91C1C'}">${dim.delta >= 0 ? '+' : ''}${dim.delta}%</td>
        </tr>
      `)
      .join('');

    const historialRows = detalleEmpresa.historial
      .map((registro) => `
        <tr>
          <td>${new Date(registro.fecha_calculo).toLocaleString('es-CO')}</td>
          <td>${registro.puntaje_global}%</td>
          <td>${escaparHtml(etiquetaNivel(registro.nivel_global))}</td>
        </tr>
      `)
      .join('');

    const html = `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Comparativo Empresa - ${escaparHtml(detalleEmpresa.empresa.razon_social)}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1F2937; margin: 0; }
          .header { background: linear-gradient(135deg, #00ACC9 0%, #3FAE49 100%); color: #FFFFFF; padding: 16px; border-radius: 10px; }
          .header h1 { margin: 0; font-size: 22px; }
          .header p { margin: 6px 0 0; font-size: 13px; }
          .section { margin-top: 14px; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px; }
          .section h2 { margin: 0 0 8px; color: #00ACC9; font-size: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #E5E7EB; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #F5F7FA; text-transform: uppercase; font-size: 11px; }
          .btn { margin: 10px 0; padding: 8px 12px; border: 0; border-radius: 8px; color: #fff; background: #00ACC9; font-weight: 700; cursor: pointer; }
          @media print { .btn { display: none; } }
        </style>
      </head>
      <body>
        <button class="btn" onclick="window.print()">Descargar / Guardar PDF</button>
        <div class="header">
          <h1>Comparativo de Evolución - ${escaparHtml(detalleEmpresa.empresa.razon_social)}</h1>
          <p>NIT: ${escaparHtml(detalleEmpresa.empresa.nit)} | Sector: ${escaparHtml(detalleEmpresa.empresa.sector)} | Ciudad: ${escaparHtml(detalleEmpresa.empresa.ciudad)}</p>
        </div>

        <div class="section">
          <h2>Comparativo de Dimensiones</h2>
          <table>
            <thead>
              <tr><th>Dimensión</th><th>Anterior</th><th>Actual</th><th>Delta</th></tr>
            </thead>
            <tbody>
              ${comparativoRows || '<tr><td colspan="4">No hay comparativo disponible.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Línea de Tiempo</h2>
          <table>
            <thead>
              <tr><th>Fecha</th><th>Puntaje Global</th><th>Nivel</th></tr>
            </thead>
            <tbody>
              ${historialRows || '<tr><td colspan="3">Sin historial.</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
  };

  const iniciarNuevaEvaluacion = () => {
    if (!detalleEmpresa) return;
    const query = new URLSearchParams({
      empresaId: detalleEmpresa.empresa.id,
      empresa: detalleEmpresa.empresa.razon_social,
    }).toString();
    cerrarDetalleEmpresa();
    navigate(`/dashboard/encuesta?${query}`);
  };

  const aplicarEncuestaEmpresa = (empresa: EmpresaCartera) => {
    const query = new URLSearchParams({
      empresaId: empresa.empresa_id,
      empresa: empresa.razon_social,
    }).toString();
    navigate(`/dashboard/encuesta?${query}`);
  };

  const abrirRegistroEmpresa = () => {
    setErrorRegistroEmpresa(null);
    setMostrarRegistroEmpresa(true);
  };

  const cerrarRegistroEmpresa = () => {
    setMostrarRegistroEmpresa(false);
    setErrorRegistroEmpresa(null);
  };

  const actualizarCampoRegistro = (campo: keyof RegistroEmpresaForm, valor: string) => {
    setFormRegistroEmpresa((prev) => ({ ...prev, [campo]: valor }));
  };

  const registrarEmpresaDesdeConsultor = async () => {
    try {
      if (!formRegistroEmpresa.telefono.trim()) {
        setErrorRegistroEmpresa('El teléfono es obligatorio.');
        return;
      }

      if (formRegistroEmpresa.ano_constitucion && !/^\d{4}$/.test(formRegistroEmpresa.ano_constitucion)) {
        setErrorRegistroEmpresa('El año de constitución debe tener 4 dígitos (ejemplo: 2018).');
        return;
      }

      const anioActual = new Date().getFullYear();
      if (formRegistroEmpresa.ano_constitucion) {
        const anio = Number(formRegistroEmpresa.ano_constitucion);
        if (anio < 1900 || anio > anioActual) {
          setErrorRegistroEmpresa(`El año de constitución debe estar entre 1900 y ${anioActual}.`);
          return;
        }
      }

      setLoadingRegistroEmpresa(true);
      setErrorRegistroEmpresa(null);

      await api.post('/auth/registro-empresa-consultor', {
        ...formRegistroEmpresa,
        ano_constitucion: formRegistroEmpresa.ano_constitucion
          ? Number(formRegistroEmpresa.ano_constitucion)
          : undefined,
      });

      setMostrarRegistroEmpresa(false);
      setAvisoAccion(`Empresa ${formRegistroEmpresa.razon_social} registrada correctamente. Puedes aplicarle encuesta ahora.`);
      setFormRegistroEmpresa({
        nit: '',
        razon_social: '',
        sector: '',
        tamano: 'Micro',
        ciudad: '',
        ano_constitucion: '',
        representante: '',
        cargo_entrevistado: '',
        telefono: '',
        correo: '',
        password: 'Prueba123!',
      });
      await cargarCartera();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErrorRegistroEmpresa(msg ?? 'No se pudo registrar la empresa desde el panel de consultor.');
    } finally {
      setLoadingRegistroEmpresa(false);
    }
  };

  if (user?.rol === 'empresa') {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-6 text-[#333333]">
        Esta vista está disponible solo para consultores y universidad.
      </div>
    );
  }

  if (user?.rol === 'universidad') {
    return <Navigate to="/dashboard/universidad" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-extrabold text-[#333333]">Cartera de Empresas</h3>
          <p className="text-sm text-[#6B7280] mt-1">Seguimiento operativo de registro, evaluación y renovación diagnóstica.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={abrirRegistroEmpresa}
            className="inline-flex items-center gap-2 rounded-lg bg-[#00ACC9] px-4 py-2 text-sm font-semibold text-[#FFFFFF] hover:bg-[#3FAE49]"
          >
            <PlusCircle size={16} />
            Registrar empresa
          </button>
          <button
            onClick={() => { void cargarCartera(); }}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#333333] hover:bg-[#F5F7FA]"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
      </div>

      {avisoAccion && (
        <div className="rounded-lg border border-[#BAE6FD] bg-[#E6F7FB] p-3 text-sm text-[#0C4A6E]">
          {avisoAccion}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-[0.06em]">Empresas activas</p>
          <p className="mt-1 text-2xl font-extrabold text-[#333333]">{resumen.total_empresas}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-[0.06em]">Sin encuesta</p>
          <p className="mt-1 text-2xl font-extrabold text-[#64748B]">{resumen.sin_encuesta}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-[0.06em]">En proceso</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0284C7]">{resumen.en_proceso}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-[0.06em]">Completadas</p>
          <p className="mt-1 text-2xl font-extrabold text-[#3FAE49]">{resumen.completadas}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-[0.06em]">Requieren seguimiento</p>
          <p className="mt-1 text-2xl font-extrabold text-[#F59E0B]">{resumen.requiere_seguimiento}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="text-sm text-[#333333]">
            <span className="mb-1 block font-semibold">Estado</span>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2">
              {ESTADOS.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-[#333333]">
            <span className="mb-1 block font-semibold">Sector</span>
            <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2">
              {opcionesSector.map((opcion) => (
                <option key={opcion} value={opcion}>{opcion === 'todos' ? 'Todos los sectores' : opcion}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-[#333333]">
            <span className="mb-1 block font-semibold">Ciudad</span>
            <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2">
              {opcionesCiudad.map((opcion) => (
                <option key={opcion} value={opcion}>{opcion === 'todos' ? 'Todas las ciudades' : opcion}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-[#333333]">
            <span className="mb-1 block font-semibold">Buscar empresa</span>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] py-2 pl-9 pr-3"
                placeholder="Nombre, NIT, ciudad..."
              />
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 2xl:col-span-2">
          <h4 className="text-base font-semibold text-[#333333] mb-3">Empresas de la cartera</h4>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#6B7280] p-6">
              <Loader2 size={16} className="animate-spin" />
              Cargando cartera...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#B91C1C] inline-flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F7FA] text-[#334155]">
                    <th className="p-2 border border-[#E5E7EB] text-left">Empresa</th>
                    <th className="p-2 border border-[#E5E7EB] text-left">Estado</th>
                    <th className="p-2 border border-[#E5E7EB] text-left">Origen</th>
                    <th className="p-2 border border-[#E5E7EB] text-left">Resultado</th>
                    <th className="p-2 border border-[#E5E7EB] text-left">Última evaluación</th>
                    <th className="p-2 border border-[#E5E7EB] text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cartera.map((empresa) => (
                    <tr key={empresa.empresa_id}>
                      <td className="p-2 border border-[#E5E7EB] align-top">
                        <div className="font-semibold text-[#0F172A]">{empresa.razon_social}</div>
                        <div className="text-[#6B7280] text-xs">NIT: {empresa.nit} | {empresa.ciudad} | {empresa.sector}</div>
                      </td>
                      <td className="p-2 border border-[#E5E7EB] align-top">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ color: colorEstado(empresa.estado), backgroundColor: `${colorEstado(empresa.estado)}20` }}
                        >
                          {empresa.estado_etiqueta}
                        </span>
                      </td>
                      <td className="p-2 border border-[#E5E7EB] align-top text-[#6B7280] text-xs">
                        {etiquetaOrigenRegistro(empresa.origen_registro)}
                      </td>
                      <td className="p-2 border border-[#E5E7EB] align-top">
                        <div className="text-[#334155] font-semibold">{empresa.puntaje_global ?? 'N/A'}{empresa.puntaje_global !== null ? '%' : ''}</div>
                        <div className="text-xs text-[#6B7280]">{etiquetaNivel(empresa.nivel_global)}</div>
                      </td>
                      <td className="p-2 border border-[#E5E7EB] align-top text-[#6B7280]">
                        {empresa.ultima_evaluacion ? new Date(empresa.ultima_evaluacion).toLocaleDateString('es-CO') : 'Sin historial'}
                      </td>
                      <td className="p-2 border border-[#E5E7EB] align-top">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { void abrirDetalleEmpresa(empresa.empresa_id); }}
                            className="rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#F5F7FA]"
                          >
                            Ver detalle
                          </button>
                          <button
                            onClick={() => aplicarEncuestaEmpresa(empresa)}
                            disabled={!empresa.puede_aplicar_encuesta}
                            title={!empresa.puede_aplicar_encuesta ? 'Esta empresa auto-registrada ya completó su evaluación inicial.' : undefined}
                            className="rounded-md bg-[#00ACC9] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#3FAE49] disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
                          >
                            Aplicar encuesta
                          </button>
                        </div>
                        {!empresa.puede_aplicar_encuesta && (
                          <div className="mt-1 text-[11px] text-[#B45309]">
                            Solo lectura: ya completó su primera evaluación.
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!cartera.length && (
                    <tr>
                      <td colSpan={6} className="p-3 border border-[#E5E7EB] text-[#6B7280]">No hay empresas con los filtros seleccionados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <h4 className="text-base font-semibold text-[#333333] mb-3">Próximos vencimientos</h4>
          <div className="space-y-2">
            {vencimientos.map((empresa) => (
              <div key={`v-${empresa.empresa_id}`} className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0F172A] leading-tight">{empresa.razon_social}</p>
                  <TimerReset size={14} className="text-[#F59E0B] shrink-0" />
                </div>
                <p className="mt-1 text-xs text-[#64748B]">{empresa.dias_para_revision ?? 0} días para revisión</p>
              </div>
            ))}
            {!vencimientos.length && (
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-sm text-[#6B7280]">
                No hay vencimientos en los próximos 30 días.
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155]">
                <ClipboardList size={16} className="text-[#00ACC9]" />
                Pendientes de primera encuesta: {empresasSinEncuesta.length}
              </div>
              <p className="mt-1 text-xs text-[#64748B]">Empresas sin diagnóstico inicial en la cartera filtrada.</p>
              {empresasSinEncuesta[0] ? (
                <button
                  onClick={() => aplicarEncuestaEmpresa(empresasSinEncuesta[0])}
                  disabled={!empresasSinEncuesta[0].puede_aplicar_encuesta}
                  className="mt-2 rounded-md bg-[#00ACC9] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#3FAE49] disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
                >
                  Aplicar a {empresasSinEncuesta[0].razon_social}
                </button>
              ) : (
                <p className="mt-2 text-xs text-[#15803D]">No hay pendientes de primera encuesta.</p>
              )}
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155]">
                <TimerReset size={16} className="text-[#F59E0B]" />
                Seguimientos vencidos: {empresasSeguimientoVencido.length}
              </div>
              <p className="mt-1 text-xs text-[#64748B]">Empresas que requieren una nueva revisión de madurez.</p>
              {empresasSeguimientoVencido[0] ? (
                <button
                  onClick={() => { void abrirDetalleEmpresa(empresasSeguimientoVencido[0].empresa_id); }}
                  className="mt-2 rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#EEF2F7]"
                >
                  Ver detalle de {empresasSeguimientoVencido[0].razon_social}
                </button>
              ) : (
                <p className="mt-2 text-xs text-[#15803D]">No hay seguimientos vencidos.</p>
              )}
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155]">
                <Building2 size={16} className="text-[#0284C7]" />
                Empresas solo lectura: {empresasSoloLectura.length}
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                Auto-registradas que ya completaron su evaluación inicial.
              </p>
              {empresasSoloLectura[0] ? (
                <button
                  onClick={() => { void abrirDetalleEmpresa(empresasSoloLectura[0].empresa_id); }}
                  className="mt-2 rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#EEF2F7]"
                >
                  Revisar {empresasSoloLectura[0].razon_social}
                </button>
              ) : (
                <p className="mt-2 text-xs text-[#15803D]">Sin empresas bloqueadas para aplicar encuesta.</p>
              )}
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-sm text-[#334155] inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#3FAE49]" />
              El panel ahora muestra tareas accionables según filtros activos.
            </div>
          </div>
        </div>
      </div>

      {(loadingDetalle || errorDetalle || detalleEmpresa) && (
        <div className="fixed inset-0 z-40 bg-[#333333]/40 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-auto bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl">
            <div className="sticky top-0 bg-[#FFFFFF] border-b border-[#E5E7EB] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#333333]">Historial y Comparativo de Empresa</h3>
                <p className="text-xs text-[#6B7280] mt-1">Evolución diagnóstica y comparación entre las dos últimas evaluaciones.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={iniciarNuevaEvaluacion}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F5F7FA]"
                >
                  <ClipboardList size={14} />
                  Nueva evaluación
                </button>
                <button
                  onClick={abrirComparativoPdf}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F5F7FA]"
                >
                  <Download size={14} />
                  Exportar comparativo
                </button>
                <button
                  onClick={cerrarDetalleEmpresa}
                  className="p-2 rounded-lg border border-[#E5E7EB] text-[#333333] hover:bg-[#F5F7FA]"
                  aria-label="Cerrar detalle"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {avisoAccion && (
                <div className="rounded-lg border border-[#BAE6FD] bg-[#E6F7FB] p-3 text-sm text-[#0C4A6E]">
                  {avisoAccion}
                </div>
              )}

              {loadingDetalle && (
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-sm text-[#6B7280] inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Cargando historial...
                </div>
              )}

              {errorDetalle && (
                <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C] inline-flex items-center gap-2">
                  <AlertCircle size={16} />
                  {errorDetalle}
                </div>
              )}

              {detalleEmpresa && (
                <>
                  <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                    <h4 className="text-base font-semibold text-[#0F172A]">{detalleEmpresa.empresa.razon_social}</h4>
                    <p className="text-sm text-[#64748B] mt-1">NIT: {detalleEmpresa.empresa.nit} | {detalleEmpresa.empresa.sector} | {detalleEmpresa.empresa.ciudad}</p>
                  </div>

                  {detalleEmpresa.comparativo && (
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
                      <h4 className="text-base font-semibold text-[#333333] mb-2">Comparativo última vs anterior</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
                          <p className="text-[11px] text-[#64748B] uppercase font-semibold">Delta global</p>
                          <p className={`text-lg font-extrabold ${detalleEmpresa.comparativo.delta_global >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                            {detalleEmpresa.comparativo.delta_global >= 0 ? '+' : ''}{detalleEmpresa.comparativo.delta_global}%
                          </p>
                        </div>
                        <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
                          <p className="text-[11px] text-[#64748B] uppercase font-semibold">Último resultado</p>
                          <p className="text-sm font-semibold text-[#334155]">{new Date(detalleEmpresa.historial[0].fecha_calculo).toLocaleDateString('es-CO')}</p>
                        </div>
                        <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
                          <p className="text-[11px] text-[#64748B] uppercase font-semibold">Resultado anterior</p>
                          <p className="text-sm font-semibold text-[#334155]">{detalleEmpresa.historial[1] ? new Date(detalleEmpresa.historial[1].fecha_calculo).toLocaleDateString('es-CO') : 'N/A'}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {detalleEmpresa.comparativo.dimensiones.map((dim) => (
                          <div key={dim.id_seccion} className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="font-semibold text-[#0F172A]">{dim.nombre_dimension}</span>
                              <span className={`font-semibold ${dim.delta >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                                {dim.delta >= 0 ? '+' : ''}{dim.delta}%
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#64748B]">
                              <span>Anterior: {dim.puntaje_anterior}%</span>
                              <span className="text-right">Actual: {dim.puntaje_actual}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                              <div className="h-full rounded-full bg-[#00ACC9]" style={{ width: `${Math.max(0, Math.min(100, dim.puntaje_actual))}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
                    <h4 className="text-base font-semibold text-[#333333] mb-2">Línea de tiempo de evaluaciones</h4>
                    {historialCronologico.length >= 2 && (
                      <div className="mb-3 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#475569] mb-2">
                          <LineChart size={14} className="text-[#00ACC9]" />
                          Evolución del puntaje global
                        </div>
                        <svg viewBox="0 0 560 96" className="w-full h-20" role="img" aria-label="Evolución del puntaje global">
                          <polyline fill="none" stroke="#CBD5E1" strokeWidth="1" points="8,88 552,88" />
                          <polyline fill="none" stroke="#00ACC9" strokeWidth="3" points={sparklinePoints} />
                          {historialCronologico.map((item, index) => {
                            const width = 560;
                            const height = 96;
                            const padding = 8;
                            const step = historialCronologico.length > 1 ? (width - padding * 2) / (historialCronologico.length - 1) : 0;
                            const x = padding + index * step;
                            const y = height - padding - ((item.puntaje_global / 100) * (height - padding * 2));
                            return <circle key={item.id_resultado} cx={x} cy={y} r="3" fill="#0284C7" />;
                          })}
                        </svg>
                      </div>
                    )}
                    <div className="space-y-2">
                      {detalleEmpresa.historial.map((registro) => (
                        <div key={registro.id_resultado} className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#0F172A]">{new Date(registro.fecha_calculo).toLocaleString('es-CO')}</p>
                            <span className="text-xs font-semibold text-[#334155]">{registro.puntaje_global}% - {etiquetaNivel(registro.nivel_global)}</span>
                          </div>
                        </div>
                      ))}
                      {!detalleEmpresa.historial.length && (
                        <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-sm text-[#6B7280]">Sin historial de evaluaciones.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {mostrarRegistroEmpresa && (
        <div className="fixed inset-0 z-50 bg-[#333333]/45 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-auto bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl">
            <div className="sticky top-0 bg-[#FFFFFF] border-b border-[#E5E7EB] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#333333]">Registrar nueva empresa</h3>
                <p className="text-xs text-[#6B7280] mt-1">Crea la cuenta de empresa y queda disponible para aplicar encuesta.</p>
              </div>
              <button onClick={cerrarRegistroEmpresa} className="p-2 rounded-lg border border-[#E5E7EB] text-[#333333] hover:bg-[#F5F7FA]" aria-label="Cerrar registro empresa">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {errorRegistroEmpresa && (
                <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#B91C1C]">{errorRegistroEmpresa}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">NIT</span>
                  <input value={formRegistroEmpresa.nit} onChange={(e) => actualizarCampoRegistro('nit', e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2" />
                </label>
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">Razón social</span>
                  <input value={formRegistroEmpresa.razon_social} onChange={(e) => actualizarCampoRegistro('razon_social', e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2" />
                </label>
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">Sector</span>
                  <input value={formRegistroEmpresa.sector} onChange={(e) => actualizarCampoRegistro('sector', e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2" />
                </label>
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">Tamaño</span>
                  <select value={formRegistroEmpresa.tamano} onChange={(e) => actualizarCampoRegistro('tamano', e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2">
                    <option value="Micro">Micro</option>
                    <option value="Pequeña">Pequeña</option>
                    <option value="Mediana">Mediana</option>
                    <option value="Grande">Grande</option>
                  </select>
                </label>
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">Ciudad</span>
                  <input value={formRegistroEmpresa.ciudad} onChange={(e) => actualizarCampoRegistro('ciudad', e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2" />
                </label>
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">Año constitución (opcional)</span>
                  <input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    inputMode="numeric"
                    value={formRegistroEmpresa.ano_constitucion}
                    onChange={(e) => actualizarCampoRegistro('ano_constitucion', e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2"
                    placeholder="Ej: 2018"
                    title="Ingresa un año de 4 dígitos, por ejemplo 2018"
                  />
                  <span className="mt-1 block text-xs text-[#6B7280]">Formato: año de 4 dígitos (ejemplo: 2018).</span>
                </label>
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">Representante</span>
                  <input value={formRegistroEmpresa.representante} onChange={(e) => actualizarCampoRegistro('representante', e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2" />
                </label>
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">Cargo entrevistado (opcional)</span>
                  <input value={formRegistroEmpresa.cargo_entrevistado} onChange={(e) => actualizarCampoRegistro('cargo_entrevistado', e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2" />
                </label>
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">Teléfono</span>
                  <input value={formRegistroEmpresa.telefono} onChange={(e) => actualizarCampoRegistro('telefono', e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2" />
                </label>
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">Correo de acceso empresa</span>
                  <input type="email" value={formRegistroEmpresa.correo} onChange={(e) => actualizarCampoRegistro('correo', e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2" />
                </label>
                <label className="text-sm text-[#333333]">
                  <span className="mb-1 block font-semibold">Contraseña inicial</span>
                  <input type="text" value={formRegistroEmpresa.password} onChange={(e) => actualizarCampoRegistro('password', e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2" />
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#FFFFFF] border-t border-[#E5E7EB] p-4 flex justify-end gap-2">
              <button onClick={cerrarRegistroEmpresa} className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#F5F7FA]">
                Cancelar
              </button>
              <button
                onClick={() => { void registrarEmpresaDesdeConsultor(); }}
                disabled={loadingRegistroEmpresa}
                className="rounded-lg bg-[#00ACC9] px-4 py-2 text-sm font-semibold text-[#FFFFFF] hover:bg-[#3FAE49] disabled:opacity-70 inline-flex items-center gap-2"
              >
                {loadingRegistroEmpresa && <Loader2 size={14} className="animate-spin" />}
                Crear empresa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
