import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, ClipboardList, Download, GraduationCap, LineChart, Loader2, MapPin, RefreshCw, Search, Users, X } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/axios';

interface ResumenUniversidad {
  total_empresas: number;
  empresas_con_informe: number;
  empresas_sin_informe: number;
  empresas_requiere_seguimiento: number;
  total_consultores: number;
  consultores_activos: number;
  promedio_global: number;
}

interface EmpresaUniversidad {
  empresa_id: string;
  razon_social: string;
  nit: string;
  sector: string;
  ciudad: string;
  tamano: string;
  estado: 'sin_encuesta' | 'en_proceso' | 'completada' | 'requiere_seguimiento';
  estado_etiqueta: string;
  origen_registro: 'empresa' | 'consultor' | 'universidad';
  telefono: string | null;
  consultor_asignado_usuario_id: string | null;
  consultor_asignado: {
    usuario_id: string;
    nombre: string;
    correo: string;
    estado: boolean;
  } | null;
  fecha_ultima_evaluacion: string | null;
  puntaje_global: number | null;
  nivel_global: string | null;
}

interface ConsultorUniversidad {
  usuario_id: string;
  nombres: string;
  apellidos: string;
  identificacion: string;
  programa_academico: string;
  correo: string;
  estado: boolean;
  empresas_registradas: number;
}

interface PanelUniversidadResponse {
  resumen: ResumenUniversidad;
  empresas: EmpresaUniversidad[];
  informes: EmpresaUniversidad[];
  consultores: ConsultorUniversidad[];
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

const etiquetaNivel = (nivel: string | null): string => {
  if (!nivel) return 'Sin dato';
  if (nivel === 'muy_bajo') return 'Muy Bajo';
  if (nivel === 'bajo') return 'Bajo';
  if (nivel === 'intermedio') return 'Intermedio';
  if (nivel === 'alto') return 'Alto';
  if (nivel === 'avanzado') return 'Avanzado';
  return nivel;
};

const etiquetaOrigen = (origen: EmpresaUniversidad['origen_registro']): string => {
  if (origen === 'consultor') return 'Consultor';
  if (origen === 'universidad') return 'Universidad';
  return 'Auto-registro';
};

const COLORES_GRAFICO = ['#00ACC9', '#3FAE49', '#F59E0B', '#0284C7', '#334155'];

const escaparHtml = (texto: string): string => {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export default function UniversidadDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenUniversidad>({
    total_empresas: 0,
    empresas_con_informe: 0,
    empresas_sin_informe: 0,
    empresas_requiere_seguimiento: 0,
    total_consultores: 0,
    consultores_activos: 0,
    promedio_global: 0,
  });

  const [empresas, setEmpresas] = useState<EmpresaUniversidad[]>([]);
  const [informes, setInformes] = useState<EmpresaUniversidad[]>([]);
  const [consultores, setConsultores] = useState<ConsultorUniversidad[]>([]);

  const [busquedaEmpresas, setBusquedaEmpresas] = useState('');
  const [busquedaConsultores, setBusquedaConsultores] = useState('');
  const [asignacionEmpresa, setAsignacionEmpresa] = useState<Record<string, string>>({});
  const [empresaProcesando, setEmpresaProcesando] = useState<string | null>(null);
  const [consultorProcesando, setConsultorProcesando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [detalleEmpresa, setDetalleEmpresa] = useState<HistorialEmpresaResponse | null>(null);

  const cargarPanel = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await api.get<PanelUniversidadResponse>('/empresas/panel-universidad');
      setResumen(resp.data.resumen);
      setEmpresas(resp.data.empresas);
      setInformes(resp.data.informes);
      setConsultores(resp.data.consultores);
      const asignaciones: Record<string, string> = {};
      for (const empresa of resp.data.empresas) {
        asignaciones[empresa.empresa_id] = empresa.consultor_asignado_usuario_id ?? '';
      }
      setAsignacionEmpresa(asignaciones);
    } catch {
      setError('No se pudo cargar el panel de universidad.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarPanel();
  }, []);

  const empresasFiltradas = useMemo(() => {
    const criterio = busquedaEmpresas.trim().toLowerCase();
    if (!criterio) return empresas;
    return empresas.filter((empresa) => {
      return empresa.razon_social.toLowerCase().includes(criterio)
        || empresa.nit.toLowerCase().includes(criterio)
        || empresa.sector.toLowerCase().includes(criterio)
        || empresa.ciudad.toLowerCase().includes(criterio);
    });
  }, [empresas, busquedaEmpresas]);

  const consultoresFiltrados = useMemo(() => {
    const criterio = busquedaConsultores.trim().toLowerCase();
    if (!criterio) return consultores;
    return consultores.filter((consultor) => {
      const nombreCompleto = `${consultor.nombres} ${consultor.apellidos}`.toLowerCase();
      return nombreCompleto.includes(criterio)
        || consultor.correo.toLowerCase().includes(criterio)
        || consultor.programa_academico.toLowerCase().includes(criterio)
        || consultor.identificacion.toLowerCase().includes(criterio);
    });
  }, [consultores, busquedaConsultores]);

  const distribucionEstado = useMemo(() => {
    const estados = ['sin_encuesta', 'en_proceso', 'completada', 'requiere_seguimiento'] as const;
    return estados.map((estado) => ({
      estado: estado === 'sin_encuesta'
        ? 'Sin encuesta'
        : estado === 'en_proceso'
          ? 'En proceso'
          : estado === 'completada'
            ? 'Completada'
            : 'Seguimiento',
      cantidad: empresasFiltradas.filter((empresa) => empresa.estado === estado).length,
    }));
  }, [empresasFiltradas]);

  const distribucionOrigen = useMemo(() => {
    return ['empresa', 'consultor', 'universidad'].map((origen) => ({
      origen: etiquetaOrigen(origen as EmpresaUniversidad['origen_registro']),
      cantidad: empresasFiltradas.filter((empresa) => empresa.origen_registro === origen).length,
    }));
  }, [empresasFiltradas]);

  const topEmpresas = useMemo(() => {
    return [...empresasFiltradas]
      .filter((empresa) => typeof empresa.puntaje_global === 'number')
      .sort((a, b) => (b.puntaje_global ?? 0) - (a.puntaje_global ?? 0))
      .slice(0, 6)
      .map((empresa) => ({
        nombre: empresa.razon_social.length > 20 ? `${empresa.razon_social.slice(0, 20)}...` : empresa.razon_social,
        puntaje: empresa.puntaje_global ?? 0,
      }));
  }, [empresasFiltradas]);

  const coberturaCiudades = useMemo(() => {
    const mapaCiudades = new Map<string, number>();
    for (const empresa of empresasFiltradas) {
      mapaCiudades.set(empresa.ciudad, (mapaCiudades.get(empresa.ciudad) ?? 0) + 1);
    }

    return Array.from(mapaCiudades.entries())
      .map(([ciudad, cantidad]) => ({ ciudad, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8);
  }, [empresasFiltradas]);

  const abrirDetalleInforme = async (empresaId: string) => {
    try {
      setLoadingDetalle(true);
      setErrorDetalle(null);
      const resp = await api.get<HistorialEmpresaResponse>(`/empresas/${empresaId}/historial-resultados`);
      setDetalleEmpresa(resp.data);
    } catch {
      setErrorDetalle('No se pudo cargar el informe de la empresa seleccionada.');
      setDetalleEmpresa(null);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    setDetalleEmpresa(null);
    setErrorDetalle(null);
  };

  const exportarInformeConsolidado = () => {
    const ventana = window.open('about:blank', '_blank');
    if (!ventana) {
      setError('No se pudo abrir la ventana para exportar. Revisa el bloqueador de ventanas.');
      return;
    }

    const fechaGeneracion = new Date().toLocaleString('es-CO');

    const filasEmpresas = empresasFiltradas
      .map((empresa) => `
        <tr>
          <td>${escaparHtml(empresa.razon_social)}</td>
          <td>${escaparHtml(empresa.nit)}</td>
          <td>${escaparHtml(empresa.estado_etiqueta)}</td>
          <td>${escaparHtml(etiquetaOrigen(empresa.origen_registro))}</td>
          <td>${empresa.consultor_asignado ? escaparHtml(empresa.consultor_asignado.nombre) : 'Sin asignar'}</td>
          <td>${empresa.puntaje_global !== null ? `${empresa.puntaje_global}%` : 'N/A'}</td>
        </tr>
      `)
      .join('');

    const filasConsultores = consultoresFiltrados
      .map((consultor) => `
        <tr>
          <td>${escaparHtml(`${consultor.nombres} ${consultor.apellidos}`.trim())}</td>
          <td>${escaparHtml(consultor.correo)}</td>
          <td>${escaparHtml(consultor.programa_academico)}</td>
          <td>${consultor.estado ? 'Activo' : 'Inactivo'}</td>
          <td>${consultor.empresas_registradas}</td>
        </tr>
      `)
      .join('');

    const html = `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Informe Consolidado Universidad</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1F2937; margin: 0; }
          .header { background: linear-gradient(135deg, #00ACC9 0%, #3FAE49 100%); color: #FFFFFF; padding: 16px; border-radius: 10px; }
          .header h1 { margin: 0; font-size: 22px; }
          .header p { margin: 6px 0 0; font-size: 13px; }
          .section { margin-top: 14px; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px; }
          .section h2 { margin: 0 0 8px; color: #00ACC9; font-size: 18px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
          .kpi { border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px; background: #F8FAFC; }
          .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; }
          .kpi-value { font-size: 18px; color: #111827; font-weight: 800; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #E5E7EB; padding: 7px; font-size: 11px; text-align: left; }
          th { background: #F5F7FA; text-transform: uppercase; font-size: 10px; }
          .btn { margin: 10px 0; padding: 8px 12px; border: 0; border-radius: 8px; color: #fff; background: #00ACC9; font-weight: 700; cursor: pointer; }
          @media print { .btn { display: none; } }
        </style>
      </head>
      <body>
        <button class="btn" onclick="window.print()">Descargar / Guardar PDF</button>
        <div class="header">
          <h1>Informe Consolidado - Panel Universidad</h1>
          <p>Generado: ${escaparHtml(fechaGeneracion)}</p>
        </div>

        <div class="section">
          <h2>Resumen Ejecutivo</h2>
          <div class="kpi-grid">
            <div class="kpi"><div class="kpi-label">Empresas</div><div class="kpi-value">${resumen.total_empresas}</div></div>
            <div class="kpi"><div class="kpi-label">Con Informe</div><div class="kpi-value">${resumen.empresas_con_informe}</div></div>
            <div class="kpi"><div class="kpi-label">Consultores Activos</div><div class="kpi-value">${resumen.consultores_activos}</div></div>
            <div class="kpi"><div class="kpi-label">Promedio Global</div><div class="kpi-value">${resumen.promedio_global}%</div></div>
          </div>
        </div>

        <div class="section">
          <h2>Empresas (filtros activos)</h2>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>NIT</th>
                <th>Estado</th>
                <th>Origen</th>
                <th>Consultor Asignado</th>
                <th>Puntaje</th>
              </tr>
            </thead>
            <tbody>
              ${filasEmpresas || '<tr><td colspan="6">No hay empresas para exportar.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Consultores (filtros activos)</h2>
          <table>
            <thead>
              <tr>
                <th>Consultor</th>
                <th>Correo</th>
                <th>Programa</th>
                <th>Estado</th>
                <th>Empresas</th>
              </tr>
            </thead>
            <tbody>
              ${filasConsultores || '<tr><td colspan="5">No hay consultores para exportar.</td></tr>'}
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

  const exportarReporteEmpresa = async (empresa: EmpresaUniversidad) => {
    try {
      const resp = await api.get<HistorialEmpresaResponse>(`/empresas/${empresa.empresa_id}/historial-resultados`);
      const detalle = resp.data;
      const ventana = window.open('about:blank', '_blank');
      if (!ventana) {
        setError('No se pudo abrir la ventana para exportar el reporte de empresa.');
        return;
      }

      const ultimo = detalle.historial[0];
      const filasDimensiones = (ultimo?.dimensiones ?? []).map((dimension) => `
        <tr>
          <td>${escaparHtml(dimension.nombre_dimension)}</td>
          <td>${dimension.puntaje_porcentaje}%</td>
          <td>${escaparHtml(etiquetaNivel(dimension.nivel))}</td>
        </tr>
      `).join('');

      const filasHistorial = detalle.historial.map((item) => `
        <tr>
          <td>${new Date(item.fecha_calculo).toLocaleDateString('es-CO')}</td>
          <td>${item.puntaje_global}%</td>
          <td>${escaparHtml(etiquetaNivel(item.nivel_global))}</td>
        </tr>
      `).join('');

      const html = `
        <!doctype html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Reporte Empresa - ${escaparHtml(detalle.empresa.razon_social)}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1F2937; margin: 0; }
            .header { background: linear-gradient(135deg, #00ACC9 0%, #3FAE49 100%); color: #FFFFFF; padding: 16px; border-radius: 10px; }
            .header h1 { margin: 0; font-size: 22px; }
            .header p { margin: 6px 0 0; font-size: 13px; }
            .section { margin-top: 14px; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px; }
            .section h2 { margin: 0 0 8px; color: #00ACC9; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #E5E7EB; padding: 7px; font-size: 11px; text-align: left; }
            th { background: #F5F7FA; text-transform: uppercase; font-size: 10px; }
            .btn { margin: 10px 0; padding: 8px 12px; border: 0; border-radius: 8px; color: #fff; background: #00ACC9; font-weight: 700; cursor: pointer; }
            @media print { .btn { display: none; } }
          </style>
        </head>
        <body>
          <button class="btn" onclick="window.print()">Descargar / Guardar PDF</button>
          <div class="header">
            <h1>Reporte Individual de Empresa</h1>
            <p>${escaparHtml(detalle.empresa.razon_social)} | NIT: ${escaparHtml(detalle.empresa.nit)} | ${escaparHtml(detalle.empresa.ciudad)}</p>
          </div>

          <div class="section">
            <h2>Resumen General</h2>
            <p><strong>Último puntaje global:</strong> ${ultimo ? `${ultimo.puntaje_global}%` : 'N/A'}</p>
            <p><strong>Último nivel global:</strong> ${ultimo ? escaparHtml(etiquetaNivel(ultimo.nivel_global)) : 'N/A'}</p>
            <p><strong>Fecha reporte:</strong> ${new Date().toLocaleString('es-CO')}</p>
          </div>

          <div class="section">
            <h2>Resultado por Dimensión (última evaluación)</h2>
            <table>
              <thead>
                <tr><th>Dimensión</th><th>Puntaje</th><th>Nivel</th></tr>
              </thead>
              <tbody>
                ${filasDimensiones || '<tr><td colspan="3">No hay dimensiones disponibles.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Historial de Evaluaciones</h2>
            <table>
              <thead>
                <tr><th>Fecha</th><th>Puntaje Global</th><th>Nivel</th></tr>
              </thead>
              <tbody>
                ${filasHistorial || '<tr><td colspan="3">No hay historial de evaluaciones.</td></tr>'}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;

      ventana.document.open();
      ventana.document.write(html);
      ventana.document.close();
    } catch {
      setError('No se pudo generar el reporte individual de la empresa.');
    }
  };

  const cambiarEstadoConsultor = async (consultor: ConsultorUniversidad, estadoDestino: boolean) => {
    try {
      setConsultorProcesando(consultor.usuario_id);
      setAviso(null);
      await api.patch(`/empresas/universidad/consultores/${consultor.usuario_id}/estado`, { estado: estadoDestino });
      setConsultores((prev) => prev.map((item) => (
        item.usuario_id === consultor.usuario_id ? { ...item, estado: estadoDestino } : item
      )));
      setAviso(`Consultor ${estadoDestino ? 'activado' : 'desactivado'}: ${consultor.nombres} ${consultor.apellidos}.`);
    } catch {
      setError('No se pudo actualizar el estado del consultor.');
    } finally {
      setConsultorProcesando(null);
    }
  };

  const asignarConsultorEmpresa = async (empresa: EmpresaUniversidad) => {
    const consultorUsuarioId = asignacionEmpresa[empresa.empresa_id];
    if (!consultorUsuarioId) {
      setError('Selecciona un consultor activo para realizar la asignación.');
      return;
    }

    try {
      setEmpresaProcesando(empresa.empresa_id);
      setAviso(null);
      await api.patch(`/empresas/universidad/empresas/${empresa.empresa_id}/asignar-consultor`, {
        consultor_usuario_id: consultorUsuarioId,
      });
      await cargarPanel();
      setAviso(`Consultor asignado correctamente a ${empresa.razon_social}.`);
    } catch {
      setError('No se pudo asignar el consultor a la empresa.');
    } finally {
      setEmpresaProcesando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#6B7280]">
        <Loader2 className="animate-spin mr-3" size={24} />
        <span>Cargando panel de universidad...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-extrabold text-[#333333]">Panel Universidad</h3>
          <p className="text-sm text-[#6B7280] mt-1">Control institucional de empresas, consultores e informes de madurez.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { void cargarPanel(); }}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#333333] hover:bg-[#F5F7FA]"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button
            onClick={exportarInformeConsolidado}
            className="inline-flex items-center gap-2 rounded-lg bg-[#00ACC9] px-4 py-2 text-sm font-semibold text-[#FFFFFF] hover:bg-[#3FAE49]"
          >
            <Download size={16} />
            Exportar informe
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#B91C1C] inline-flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {aviso && (
        <div className="rounded-lg border border-[#BAE6FD] bg-[#E6F7FB] p-3 text-sm text-[#0C4A6E]">
          {aviso}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-[0.06em]">Empresas registradas</p>
          <p className="mt-1 text-2xl font-extrabold text-[#333333]">{resumen.total_empresas}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-[0.06em]">Empresas con informe</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0284C7]">{resumen.empresas_con_informe}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-[0.06em]">Consultores activos</p>
          <p className="mt-1 text-2xl font-extrabold text-[#3FAE49]">{resumen.consultores_activos} / {resumen.total_consultores}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-[0.06em]">Promedio global</p>
          <p className="mt-1 text-2xl font-extrabold text-[#F59E0B]">{resumen.promedio_global}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <h4 className="text-base font-semibold text-[#333333] mb-3">Empresas por estado</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribucionEstado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                  {distribucionEstado.map((_, idx) => (
                    <Cell key={`estado-cell-${idx}`} fill={COLORES_GRAFICO[idx % COLORES_GRAFICO.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <h4 className="text-base font-semibold text-[#333333] mb-3">Origen de registro</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribucionOrigen} dataKey="cantidad" nameKey="origen" outerRadius={78} innerRadius={42}>
                  {distribucionOrigen.map((_, idx) => (
                    <Cell key={`origen-cell-${idx}`} fill={COLORES_GRAFICO[idx % COLORES_GRAFICO.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={24} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <h4 className="text-base font-semibold text-[#333333] mb-3">Top empresas por puntaje</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEmpresas} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="puntaje" fill="#00ACC9" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
        <h4 className="text-base font-semibold text-[#333333] mb-3 inline-flex items-center gap-2">
          <MapPin size={16} className="text-[#00ACC9]" />
          Mapa de cobertura por ciudad
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {coberturaCiudades.map((item) => {
            const max = coberturaCiudades[0]?.cantidad ?? 1;
            const porcentaje = Math.round((item.cantidad / max) * 100);
            return (
              <div key={item.ciudad} className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                <p className="text-sm font-semibold text-[#0F172A]">{item.ciudad}</p>
                <p className="text-xs text-[#64748B] mt-1">{item.cantidad} empresa(s)</p>
                <div className="mt-2 h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div className="h-full rounded-full bg-[#00ACC9]" style={{ width: `${porcentaje}%` }} />
                </div>
              </div>
            );
          })}
          {!coberturaCiudades.length && (
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-sm text-[#6B7280]">
              No hay datos de ciudades para mostrar en el mapa.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <h4 className="text-base font-semibold text-[#333333] mb-3 inline-flex items-center gap-2">
            <LineChart size={16} className="text-[#00ACC9]" />
            Informes disponibles
          </h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {informes.slice(0, 8).map((empresa) => (
              <div key={`inf-${empresa.empresa_id}`} className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                <p className="text-sm font-semibold text-[#0F172A]">{empresa.razon_social}</p>
                <p className="text-xs text-[#64748B] mt-1">{empresa.puntaje_global ?? 0}% · {etiquetaNivel(empresa.nivel_global)}</p>
                <button
                  onClick={() => { void abrirDetalleInforme(empresa.empresa_id); }}
                  className="mt-2 rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#EEF2F7]"
                >
                  Ver informe
                </button>
              </div>
            ))}
            {!informes.length && (
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-sm text-[#6B7280]">
                Todavía no hay informes disponibles.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <h4 className="text-base font-semibold text-[#333333] mb-3 inline-flex items-center gap-2">
            <Building2 size={16} className="text-[#00ACC9]" />
            Estado operativo
          </h4>
          <div className="space-y-2">
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
              <p className="text-xs text-[#64748B] uppercase font-semibold">Sin informe</p>
              <p className="text-lg font-extrabold text-[#64748B]">{resumen.empresas_sin_informe}</p>
            </div>
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
              <p className="text-xs text-[#64748B] uppercase font-semibold">Requieren seguimiento</p>
              <p className="text-lg font-extrabold text-[#F59E0B]">{resumen.empresas_requiere_seguimiento}</p>
            </div>
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-sm text-[#334155] inline-flex items-center gap-2">
              <ClipboardList size={16} className="text-[#00ACC9]" />
              Prioriza empresas sin evaluación inicial para acelerar cobertura.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <h4 className="text-base font-semibold text-[#333333] mb-3 inline-flex items-center gap-2">
            <Users size={16} className="text-[#00ACC9]" />
            Gestión de consultores
          </h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {consultores.slice(0, 8).map((consultor) => (
              <div key={consultor.usuario_id} className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                <p className="text-sm font-semibold text-[#0F172A]">{consultor.nombres} {consultor.apellidos}</p>
                <p className="text-xs text-[#64748B] mt-1">{consultor.programa_academico}</p>
                <p className="text-xs text-[#64748B]">Empresas registradas: {consultor.empresas_registradas}</p>
              </div>
            ))}
            {!consultores.length && (
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-sm text-[#6B7280]">
                No hay consultores registrados.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="text-base font-semibold text-[#333333]">Empresas registradas</h4>
            <label className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={busquedaEmpresas}
                onChange={(e) => setBusquedaEmpresas(e.target.value)}
                placeholder="Buscar empresa..."
                className="rounded-lg border border-[#E5E7EB] pl-8 pr-3 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#F5F7FA] text-[#334155]">
                  <th className="p-2 border border-[#E5E7EB] text-left">Empresa</th>
                  <th className="p-2 border border-[#E5E7EB] text-left">Estado</th>
                  <th className="p-2 border border-[#E5E7EB] text-left">Origen</th>
                  <th className="p-2 border border-[#E5E7EB] text-left">Consultor asignado</th>
                  <th className="p-2 border border-[#E5E7EB] text-left">Puntaje</th>
                  <th className="p-2 border border-[#E5E7EB] text-left">Acción</th>
                  <th className="p-2 border border-[#E5E7EB] text-left">Reporte</th>
                </tr>
              </thead>
              <tbody>
                {empresasFiltradas.map((empresa) => (
                  <tr key={empresa.empresa_id}>
                    <td className="p-2 border border-[#E5E7EB] align-top">
                      <div className="font-semibold text-[#0F172A]">{empresa.razon_social}</div>
                      <div className="text-xs text-[#6B7280]">{empresa.nit} · {empresa.ciudad}</div>
                    </td>
                    <td className="p-2 border border-[#E5E7EB] align-top text-[#334155]">{empresa.estado_etiqueta}</td>
                    <td className="p-2 border border-[#E5E7EB] align-top text-[#6B7280]">{etiquetaOrigen(empresa.origen_registro)}</td>
                    <td className="p-2 border border-[#E5E7EB] align-top text-[#6B7280] text-xs">
                      {empresa.consultor_asignado ? empresa.consultor_asignado.nombre : 'Sin asignar'}
                    </td>
                    <td className="p-2 border border-[#E5E7EB] align-top text-[#334155] font-semibold">{empresa.puntaje_global ?? 'N/A'}{empresa.puntaje_global !== null ? '%' : ''}</td>
                    <td className="p-2 border border-[#E5E7EB] align-top">
                      <div className="flex items-center gap-2">
                        <select
                          value={asignacionEmpresa[empresa.empresa_id] ?? ''}
                          onChange={(e) => setAsignacionEmpresa((prev) => ({ ...prev, [empresa.empresa_id]: e.target.value }))}
                          className="rounded-md border border-[#E5E7EB] px-2 py-1 text-xs"
                        >
                          <option value="">Seleccionar</option>
                          {consultores.filter((consultor) => consultor.estado).map((consultor) => (
                            <option key={consultor.usuario_id} value={consultor.usuario_id}>
                              {consultor.nombres} {consultor.apellidos}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => { void asignarConsultorEmpresa(empresa); }}
                          disabled={empresaProcesando === empresa.empresa_id || !(asignacionEmpresa[empresa.empresa_id] ?? '')}
                          className="rounded-md bg-[#00ACC9] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#3FAE49] disabled:opacity-70"
                        >
                          {empresaProcesando === empresa.empresa_id ? 'Asignando...' : 'Asignar'}
                        </button>
                      </div>
                    </td>
                    <td className="p-2 border border-[#E5E7EB] align-top">
                      <button
                        onClick={() => { void exportarReporteEmpresa(empresa); }}
                        className="rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#EEF2F7]"
                      >
                        Reporte empresa
                      </button>
                    </td>
                  </tr>
                ))}
                {!empresasFiltradas.length && (
                  <tr>
                    <td colSpan={7} className="p-3 border border-[#E5E7EB] text-[#6B7280]">No hay empresas para mostrar. Si acabas de limpiar la base, crea o registra empresas de prueba para ver datos aquí.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="text-base font-semibold text-[#333333]">Consultores registrados</h4>
            <label className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={busquedaConsultores}
                onChange={(e) => setBusquedaConsultores(e.target.value)}
                placeholder="Buscar consultor..."
                className="rounded-lg border border-[#E5E7EB] pl-8 pr-3 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#F5F7FA] text-[#334155]">
                  <th className="p-2 border border-[#E5E7EB] text-left">Consultor</th>
                  <th className="p-2 border border-[#E5E7EB] text-left">Programa</th>
                  <th className="p-2 border border-[#E5E7EB] text-left">Estado</th>
                  <th className="p-2 border border-[#E5E7EB] text-left">Empresas</th>
                  <th className="p-2 border border-[#E5E7EB] text-left">Acción</th>
                </tr>
              </thead>
              <tbody>
                {consultoresFiltrados.map((consultor) => (
                  <tr key={consultor.usuario_id}>
                    <td className="p-2 border border-[#E5E7EB] align-top">
                      <div className="font-semibold text-[#0F172A]">{consultor.nombres} {consultor.apellidos}</div>
                      <div className="text-xs text-[#6B7280]">{consultor.correo}</div>
                    </td>
                    <td className="p-2 border border-[#E5E7EB] align-top text-[#334155]">{consultor.programa_academico}</td>
                    <td className="p-2 border border-[#E5E7EB] align-top">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${consultor.estado ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                        {consultor.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-2 border border-[#E5E7EB] align-top text-[#334155] font-semibold">{consultor.empresas_registradas}</td>
                    <td className="p-2 border border-[#E5E7EB] align-top">
                      <button
                        onClick={() => { void cambiarEstadoConsultor(consultor, !consultor.estado); }}
                        disabled={consultorProcesando === consultor.usuario_id}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] disabled:opacity-70 ${consultor.estado ? 'bg-[#B91C1C] hover:bg-[#991B1B]' : 'bg-[#15803D] hover:bg-[#166534]'}`}
                      >
                        {consultorProcesando === consultor.usuario_id
                          ? 'Guardando...'
                          : consultor.estado
                            ? 'Desactivar'
                            : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!consultoresFiltrados.length && (
                  <tr>
                    <td colSpan={5} className="p-3 border border-[#E5E7EB] text-[#6B7280]">No hay consultores para mostrar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(loadingDetalle || errorDetalle || detalleEmpresa) && (
        <div className="fixed inset-0 z-40 bg-[#333333]/40 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl">
            <div className="sticky top-0 bg-[#FFFFFF] border-b border-[#E5E7EB] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#333333] inline-flex items-center gap-2">
                  <GraduationCap size={18} className="text-[#00ACC9]" />
                  Informe de empresa
                </h3>
                <p className="text-xs text-[#6B7280] mt-1">Vista institucional de resultados y evolución.</p>
              </div>
              <button
                onClick={cerrarDetalle}
                className="p-2 rounded-lg border border-[#E5E7EB] text-[#333333] hover:bg-[#F5F7FA]"
                aria-label="Cerrar detalle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {loadingDetalle && (
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-sm text-[#6B7280] inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Cargando informe...
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

                  {detalleEmpresa.historial.length ? (
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
                      <h4 className="text-base font-semibold text-[#333333] mb-2">Historial de evaluaciones</h4>
                      <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-[#F5F7FA] text-[#334155]">
                              <th className="p-2 border border-[#E5E7EB] text-left">Fecha</th>
                              <th className="p-2 border border-[#E5E7EB] text-left">Puntaje</th>
                              <th className="p-2 border border-[#E5E7EB] text-left">Nivel</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalleEmpresa.historial.map((registro) => (
                              <tr key={registro.id_resultado}>
                                <td className="p-2 border border-[#E5E7EB]">{new Date(registro.fecha_calculo).toLocaleDateString('es-CO')}</td>
                                <td className="p-2 border border-[#E5E7EB] font-semibold">{registro.puntaje_global}%</td>
                                <td className="p-2 border border-[#E5E7EB]">{etiquetaNivel(registro.nivel_global)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-sm text-[#6B7280]">
                      Esta empresa aún no tiene historial de evaluaciones.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
