import { Fragment, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { Download, AlertCircle, ClipboardList, TrendingUp, Loader2, Eye, X, CalendarDays, SlidersHorizontal, ArrowUpRight, Search, FilterX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import api from '../api/axios';

interface ResultadoDimension {
  nombre_dimension: string;
  puntaje_porcentaje: number;
  nivel: string;
}

interface ResultadoGeneral {
  puntaje_global: number;
  nivel_global: string;
  fecha_calculo?: string;
  resultados_por_dimension: ResultadoDimension[];
  recomendaciones: { texto: string; nivel_asociado: string }[];
}

interface ResumenNivel {
  nivel: string;
  cantidad: number;
  porcentaje: number;
}

interface DetalleItemReporte {
  dimension: string;
  pregunta: string;
  valor_numerico: number | null;
  porcentaje_item: number | null;
  nivel_item: string | null;
}

interface ReporteDetallado {
  empresa: {
    razon_social: string;
    nit: string;
    sector: string;
    ciudad: string;
  };
  resumen: {
    puntaje_global: number;
    nivel_global: string;
    fecha_calculo: string;
  };
  resultados_por_dimension: ResultadoDimension[];
  recomendaciones: { texto: string; nivel_asociado: string }[];
  detalle_items: DetalleItemReporte[];
  resumen_por_nivel: ResumenNivel[];
}

interface ApiErrorResponse {
  error?: string;
}

const COLORES_NIVEL: Record<string, string> = {
  'muy_bajo': '#00ACC9',
  'bajo': '#00ACC9',
  'intermedio': '#00ACC9',
  'alto': '#3FAE49',
  'avanzado': '#3FAE49',
};

const LABEL_NIVEL: Record<string, string> = {
  'muy_bajo': 'Muy Bajo',
  'bajo': 'Bajo',
  'intermedio': 'Intermedio',
  'alto': 'Alto',
  'avanzado': 'Avanzado',
};

const obtenerNivelDesdePuntaje = (puntaje: number): string => {
  if (puntaje < 20) return 'muy_bajo';
  if (puntaje < 40) return 'bajo';
  if (puntaje < 60) return 'intermedio';
  if (puntaje < 80) return 'alto';
  return 'avanzado';
};

const normalizarDimension = (dimension: string): string => {
  return dimension
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const convertirARomano = (valor: number): string => {
  const romanos: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let numero = Math.max(1, Math.floor(valor));
  let resultado = '';
  for (const [base, simbolo] of romanos) {
    while (numero >= base) {
      resultado += simbolo;
      numero -= base;
    }
  }
  return resultado;
};

const limpiarPrefijoDimension = (dimension: string): string => {
  return dimension
    .replace(/^\s*(?:[ivxlcdm]+|\d+)\s*[.)-]?\s*/i, '')
    .replace(/^\s*[:.-]\s*/, '')
    .trim();
};

export default function DashboardEmpresa() {
  const navigate = useNavigate();
  const [resultado, setResultado] = useState<ResultadoGeneral | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarVistaPreviaPdf, setMostrarVistaPreviaPdf] = useState(false);
  const [reporteDetallado, setReporteDetallado] = useState<ReporteDetallado | null>(null);
  const [loadingReporteDetallado, setLoadingReporteDetallado] = useState(false);
  const [errorCargaResultados, setErrorCargaResultados] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroDimension, setFiltroDimension] = useState('todas');
  const [filtroNivel, setFiltroNivel] = useState('todos');
  const [busquedaItem, setBusquedaItem] = useState('');

  const cargarResultados = async () => {
    try {
      setLoading(true);
      setErrorCargaResultados(null);
      const resp = await api.get('/resultados/ultimo');
      setResultado(resp.data);
      try {
        const detalle = await api.get('/resultados/reporte-detallado');
        setReporteDetallado(detalle.data);
      } catch {
        // El detalle se puede intentar nuevamente al abrir la vista previa PDF.
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      if (axiosError.response?.status === 404) {
        setResultado(null);
      } else if (axiosError.response?.status === 401) {
        setResultado(null);
        setErrorCargaResultados('Tu sesión expiró. Inicia sesión nuevamente para ver los resultados.');
      } else {
        setResultado(null);
        setErrorCargaResultados('No se pudieron cargar los resultados. Verifica sesión, backend o conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarResultados();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#6B7280]">
        <Loader2 className="animate-spin mr-3" size={24} />
        <span>Cargando resultados...</span>
      </div>
    );
  }

  // ----- Estado: Sin evaluación completada -----
  if (!resultado) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Bienvenido al Panel SIEDSS</h1>
          <p className="text-[#6B7280] mt-1">Plataforma de Madurez Digital para Pymes - Universidad Cooperativa de Colombia</p>
        </div>

        {errorCargaResultados && (
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[#333333] font-semibold">No fue posible cargar información de resultados.</p>
            <p className="text-sm text-[#6B7280] mt-1">{errorCargaResultados}</p>
            <button
              onClick={() => { void cargarResultados(); }}
              className="mt-3 inline-flex items-center gap-2 bg-[#00ACC9] text-[#FFFFFF] font-semibold px-4 py-2 rounded-lg hover:bg-[#3FAE49] transition-colors"
            >
              Reintentar carga
            </button>
          </div>
        )}

        <div className="bg-[#00ACC9] text-[#FFFFFF] p-8 rounded-2xl border border-[#E5E7EB]">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-[#3FAE49] rounded-xl">
              <ClipboardList size={36} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Aún no has completado tu evaluación</h2>
              <p className="text-[#FFFFFF] text-sm leading-relaxed">
                El instrumento de evaluación mide 6 dimensiones de madurez digital en tu empresa. 
                Al completarlo, obtendrás un diagnóstico personalizado con recomendaciones del equipo consultor SIEDSS.
              </p>
              <button
                onClick={() => navigate('/dashboard/encuesta')}
                className="mt-5 inline-flex items-center gap-2 bg-[#FFFFFF] text-[#00ACC9] font-semibold px-6 py-2.5 rounded-lg hover:bg-[#F5F7FA] transition-colors border border-[#E5E7EB]"
              >
                <TrendingUp size={18} />
                Iniciar Evaluación
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['Innovación', 'Integración Digital', 'Inteligencia Artificial', 'Big Data', 'Capital Humano', 'Colaboración U-E'].map(dim => (
            <div key={dim} className="bg-[#FFFFFF] rounded-xl border border-[#E5E7EB] p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F5F7FA] mx-auto mb-3 flex items-center justify-center">
                <span className="text-[#6B7280] text-xs font-bold">?</span>
              </div>
              <p className="text-sm font-medium text-[#333333]">{dim}</p>
              <p className="text-xs text-[#6B7280] mt-1">Pendiente de evaluación</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ----- Estado: Con resultados -----
  const etiquetaNivel = (nivel: string): string => LABEL_NIVEL[nivel] ?? nivel;

  const dimensionesResultado = Array.isArray(resultado.resultados_por_dimension)
    ? resultado.resultados_por_dimension
    : [];

  const chartData = dimensionesResultado.map(d => ({
    name: d.nombre_dimension.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    puntaje: Math.round(d.puntaje_porcentaje),
    nivel: d.nivel,
    fill: COLORES_NIVEL[d.nivel] ?? '#00ACC9'
  }));

  const mapaNombreDimension = new Map(chartData.map((d) => [normalizarDimension(d.name), d.name]));

  const detalleItems = reporteDetallado?.detalle_items ?? [];
  const textoBusqueda = busquedaItem.trim().toLowerCase();
  const filtrosActivos = filtroDimension !== 'todas' || filtroNivel !== 'todos' || Boolean(textoBusqueda);

  const itemsFiltrados = detalleItems.filter((item) => {
    const coincideDimension = filtroDimension === 'todas' || item.dimension === filtroDimension;
    const coincideNivel = filtroNivel === 'todos' || (item.nivel_item ?? '') === filtroNivel;
    const coincideBusqueda =
      !textoBusqueda ||
      item.pregunta.toLowerCase().includes(textoBusqueda) ||
      item.dimension.toLowerCase().includes(textoBusqueda);

    return coincideDimension && coincideNivel && coincideBusqueda;
  });

  const chartDataFiltrado = (() => {
    if (!filtrosActivos || !detalleItems.length) {
      return chartData;
    }

    const agrupado = new Map<string, { suma: number; cantidad: number; nivelRef: string }>();

    for (const item of itemsFiltrados) {
      const dimension = item.dimension?.trim();
      if (!dimension) continue;

      const claveDimension = normalizarDimension(dimension);
      const nombreCanonico = mapaNombreDimension.get(claveDimension) ?? dimension;

      const porcentaje = item.porcentaje_item;
      if (porcentaje === null || Number.isNaN(porcentaje)) continue;

      const actual = agrupado.get(nombreCanonico) ?? { suma: 0, cantidad: 0, nivelRef: item.nivel_item ?? 'intermedio' };
      actual.suma += porcentaje;
      actual.cantidad += 1;
      if (item.nivel_item) {
        actual.nivelRef = item.nivel_item;
      }
      agrupado.set(nombreCanonico, actual);
    }

    return Array.from(agrupado.entries()).map(([name, stats]) => {
      const puntaje = stats.cantidad > 0 ? Math.round(stats.suma / stats.cantidad) : 0;
      const nivel = stats.nivelRef || obtenerNivelDesdePuntaje(puntaje);
      return {
        name,
        puntaje,
        nivel,
        fill: COLORES_NIVEL[nivel] ?? '#00ACC9',
      };
    });
  })();

  const chartDataOrdenado = [...chartDataFiltrado]
    .sort((a, b) => b.puntaje - a.puntaje)
    .map((item) => ({
      ...item,
      nombreEje: item.name.length > 24 ? `${item.name.slice(0, 24)}...` : item.name,
    }));

  const nivelesOrden = ['muy_bajo', 'bajo', 'intermedio', 'alto', 'avanzado'];
  const baseNiveles = filtrosActivos
    ? nivelesOrden.map((nivel) => {
      const cantidad = itemsFiltrados.filter((item) => (item.nivel_item ?? '') === nivel).length;
      const porcentaje = itemsFiltrados.length ? Math.round((cantidad / itemsFiltrados.length) * 100) : 0;
      return { nivel, cantidad, porcentaje };
    })
    : (reporteDetallado?.resumen_por_nivel ?? []).map((n) => ({
      nivel: n.nivel,
      cantidad: n.cantidad,
      porcentaje: n.porcentaje,
    }));

  const nivelesData = nivelesOrden.map((nivel) => {
    const encontrado = baseNiveles.find((n) => n.nivel === nivel);
    return {
      nivel,
      name: etiquetaNivel(nivel),
      cantidad: encontrado?.cantidad ?? 0,
      porcentaje: encontrado?.porcentaje ?? 0,
      fill: COLORES_NIVEL[nivel] ?? '#00ACC9',
    };
  });

  const nivelesPieData = nivelesData
    .filter((n) => n.cantidad > 0)
    .map((n) => ({
      name: n.name,
      value: n.cantidad,
      fill: n.fill,
    }));

  const mapaPuntajeFiltrado = new Map(
    chartDataFiltrado.map((d) => [normalizarDimension(d.name), d.puntaje])
  );
  const radarData = chartData.map((d) => {
    const clave = normalizarDimension(d.name);
    const tieneDatoFiltrado = mapaPuntajeFiltrado.has(clave);
    return {
      dimension: d.name,
      puntaje: filtrosActivos ? (mapaPuntajeFiltrado.get(clave) ?? 0) : d.puntaje,
      tieneDato: filtrosActivos ? tieneDatoFiltrado : true,
    };
  });

  const totalItemsEvaluados = filtrosActivos ? itemsFiltrados.length : (reporteDetallado?.detalle_items.length ?? 0);
  const dimensionesOrdenadas = [...chartDataOrdenado].sort((a, b) => b.puntaje - a.puntaje);
  const mejorDimension = dimensionesOrdenadas[0];
  const menorDimension = dimensionesOrdenadas[dimensionesOrdenadas.length - 1];
  const opcionesDimension = Array.from(new Set(detalleItems.map((item) => item.dimension))).sort((a, b) => a.localeCompare(b));

  const itemsMuestra = itemsFiltrados;
  const itemsAgrupadosPorDimension = itemsMuestra.reduce<Record<string, DetalleItemReporte[]>>((acc, item) => {
    const clave = item.dimension || 'Sin dimensión';
    if (!acc[clave]) {
      acc[clave] = [];
    }
    acc[clave].push(item);
    return acc;
  }, {});
  const dimensionesItems = Object.keys(itemsAgrupadosPorDimension).sort((a, b) => a.localeCompare(b));
  const totalFiltrosActivos = Number(filtroDimension !== 'todas') + Number(filtroNivel !== 'todos') + Number(Boolean(busquedaItem.trim()));

  const puntajeGlobalVisible = chartDataOrdenado.length
    ? Math.round(chartDataOrdenado.reduce((acc, d) => acc + d.puntaje, 0) / chartDataOrdenado.length)
    : Math.round(resultado.puntaje_global);
  const nivelGlobalVisible = chartDataOrdenado.length
    ? obtenerNivelDesdePuntaje(puntajeGlobalVisible)
    : resultado.nivel_global;

  const nivelColor = COLORES_NIVEL[nivelGlobalVisible] ?? '#00ACC9';
  const nivelLabel = LABEL_NIVEL[nivelGlobalVisible] ?? nivelGlobalVisible;
  const fechaReporte = new Date(resultado.fecha_calculo ?? Date.now()).toLocaleString('es-CO');

  const vistaPreviaResumen = reporteDetallado?.resumen;
  const vistaPreviaPuntajeGlobal = Math.round(vistaPreviaResumen?.puntaje_global ?? resultado.puntaje_global);
  const vistaPreviaNivelGlobal = etiquetaNivel(vistaPreviaResumen?.nivel_global ?? resultado.nivel_global);
  const vistaPreviaFecha = vistaPreviaResumen?.fecha_calculo
    ? new Date(vistaPreviaResumen.fecha_calculo).toLocaleString('es-CO')
    : fechaReporte;
  const vistaPreviaNiveles = [...(reporteDetallado?.resumen_por_nivel ?? [])].sort((a, b) => b.cantidad - a.cantidad);
  const vistaPreviaDimensiones = [...(reporteDetallado?.resultados_por_dimension ?? resultado.resultados_por_dimension)]
    .map((dim) => ({
      ...dim,
      puntaje_redondeado: Math.max(0, Math.min(100, Math.round(dim.puntaje_porcentaje))),
    }))
    .sort((a, b) => b.puntaje_redondeado - a.puntaje_redondeado);
  const vistaPreviaItems = reporteDetallado?.detalle_items ?? [];
  const vistaPreviaItemsPorDimension = vistaPreviaItems.reduce<Record<string, DetalleItemReporte[]>>((acc, item) => {
    const clave = item.dimension || 'Sin dimensión';
    if (!acc[clave]) {
      acc[clave] = [];
    }
    acc[clave].push(item);
    return acc;
  }, {});

  const obtenerReporteDetallado = async (): Promise<ReporteDetallado | null> => {
    try {
      setLoadingReporteDetallado(true);
      const resp = await api.get('/resultados/reporte-detallado');
      setReporteDetallado(resp.data);
      return resp.data;
    } catch {
      console.error('No se pudo cargar el reporte detallado para PDF.');
      return null;
    } finally {
      setLoadingReporteDetallado(false);
    }
  };

  const escaparHtml = (texto: string): string => {
    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const generarHtmlReporte = (detalle: ReporteDetallado | null): string => {
    const resumen = detalle?.resumen;
    const dimensiones = detalle?.resultados_por_dimension ?? resultado.resultados_por_dimension;
    const items = detalle?.detalle_items ?? [];
    const resumenNiveles = detalle?.resumen_por_nivel ?? [];

    const empresa = detalle?.empresa;
    const puntajeGlobal = Math.round(resumen?.puntaje_global ?? resultado.puntaje_global);
    const nivelGlobal = etiquetaNivel(resumen?.nivel_global ?? resultado.nivel_global);
    const fecha = new Date(resumen?.fecha_calculo ?? resultado.fecha_calculo ?? Date.now()).toLocaleString('es-CO');
    const totalItems = items.length;
    const totalDimensiones = dimensiones.length;

    const etiquetaDimensionPdf = (nombre: string): string => {
      return nombre.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const dimensionesFormateadas = dimensiones
      .map((d) => ({
        nombre: etiquetaDimensionPdf(d.nombre_dimension),
        puntaje: Math.max(0, Math.min(100, Math.round(d.puntaje_porcentaje))),
        nivel: etiquetaNivel(d.nivel),
      }))
      .sort((a, b) => b.puntaje - a.puntaje);

    const mejorDimension = dimensionesFormateadas[0];
    const menorDimension = dimensionesFormateadas[dimensionesFormateadas.length - 1];
    const brechaDimension = mejorDimension && menorDimension ? mejorDimension.puntaje - menorDimension.puntaje : 0;

    const filasResumenDimensiones = dimensionesFormateadas
      .map((d) => `
        <tr>
          <td>${escaparHtml(d.nombre)}</td>
          <td>${d.puntaje}%</td>
          <td>${escaparHtml(d.nivel)}</td>
        </tr>
      `)
      .join('');

    const itemsPorDimension = items.reduce<Record<string, number>>((acc, item) => {
      const nombre = item.dimension || 'Sin dimensión';
      acc[nombre] = (acc[nombre] ?? 0) + 1;
      return acc;
    }, {});

    const chipsItemsDimension = Object.entries(itemsPorDimension)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dimension, cantidad]) => `<span class="chip">${escaparHtml(dimension)}: ${cantidad}</span>`)
      .join('');

    const centroRadar = 170;
    const radioRadar = 104;
    const dimensionesRadar = dimensionesFormateadas;
    const totalEjesRadar = dimensionesRadar.length;

    const puntoRadar = (indice: number, porcentaje: number) => {
      const angulo = (indice / totalEjesRadar) * Math.PI * 2 - Math.PI / 2;
      const radioActual = radioRadar * (porcentaje / 100);
      const x = centroRadar + Math.cos(angulo) * radioActual;
      const y = centroRadar + Math.sin(angulo) * radioActual;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    };

    const rejillaRadar = [20, 40, 60, 80, 100]
      .map((nivel) => {
        const puntos = dimensionesRadar.map((_, i) => puntoRadar(i, nivel)).join(' ');
        return `<polygon points="${puntos}" class="radar-grid" />`;
      })
      .join('');

    const ejesRadar = dimensionesRadar
      .map((_, i) => `<line x1="${centroRadar}" y1="${centroRadar}" x2="${puntoRadar(i, 100).split(',')[0]}" y2="${puntoRadar(i, 100).split(',')[1]}" class="radar-axis" />`)
      .join('');

    const poligonoRadar = dimensionesRadar.map((d, i) => puntoRadar(i, d.puntaje)).join(' ');

    const puntosRadar = dimensionesRadar
      .map((d, i) => {
        const [x, y] = puntoRadar(i, d.puntaje).split(',');
        return `<circle cx="${x}" cy="${y}" r="3.5" class="radar-dot" />`;
      })
      .join('');

    const etiquetasRadar = dimensionesRadar
      .map((d, i) => {
        const [x, y] = puntoRadar(i, 116).split(',');
        return `<text x="${x}" y="${y}" class="radar-label">${escaparHtml(d.nombre)}</text>`;
      })
      .join('');


    const barrasDimensiones = dimensionesFormateadas
      .map((d, index) => {
        const porcentaje = d.puntaje;
        return `
          <div class="dim-row">
            <div class="dim-left">
              <span class="dim-rank">#${index + 1}</span>
              <div>
                <div class="dim-name">${escaparHtml(d.nombre)}</div>
                <div class="dim-level">Nivel: ${escaparHtml(d.nivel)}</div>
              </div>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${porcentaje}%"></div>
            </div>
            <div class="bar-value">${porcentaje}%</div>
          </div>
        `;
      })
      .join('');

    const itemsDetallePorDimension = items.reduce<Record<string, DetalleItemReporte[]>>((acc, item) => {
      const clave = item.dimension || 'Sin dimensión';
      if (!acc[clave]) {
        acc[clave] = [];
      }
      acc[clave].push(item);
      return acc;
    }, {});

    const bloquesItemsVisual = Object.entries(itemsDetallePorDimension)
      .map(([dimension, lista]) => {
        const filas = lista
          .map((item, index) => {
            const porcentaje = Math.max(0, Math.min(100, Math.round(item.porcentaje_item ?? 0)));
            const nivel = item.nivel_item ? etiquetaNivel(item.nivel_item) : 'Sin dato';
            return `
              <div class="item-row">
                <div class="item-header">
                  <span class="item-index">${index + 1}</span>
                  <span class="item-question">${escaparHtml(item.pregunta)}</span>
                </div>
                <div class="item-metrics">
                  <span class="item-badge">Valor: ${item.valor_numerico ?? 'N/A'}</span>
                  <span class="item-badge">Nivel: ${escaparHtml(nivel)}</span>
                  <span class="item-badge item-badge-strong">${porcentaje}%</span>
                </div>
                <div class="item-bar-track">
                  <div class="item-bar-fill" style="width:${porcentaje}%"></div>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="item-group">
            <div class="item-group-head">
              <div class="item-dimension">${escaparHtml(dimension)}</div>
              <div class="item-count">${lista.length} ítems</div>
            </div>
            <div class="item-list">${filas}</div>
          </div>
        `;
      })
      .join('');

    const tarjetasNiveles = resumenNiveles
      .map((nivel) => `
        <div class="level-card">
          <div class="level-head">${escaparHtml(etiquetaNivel(nivel.nivel))}</div>
          <div class="level-meta">${nivel.cantidad} ítems (${nivel.porcentaje}%)</div>
          <div class="level-track">
            <div class="level-fill" style="width:${Math.max(0, Math.min(100, nivel.porcentaje))}%"></div>
          </div>
        </div>
      `)
      .join('');

    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Reporte SIEDSS</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Nunito', 'Segoe UI', Tahoma, sans-serif; font-size: 14px; line-height: 1.5; margin: 0; padding: 24px; color: #1F2937; background: #F5F7FA; }
            .hero { background: linear-gradient(140deg, #00ACC9 0%, #3FAE49 100%); color: #FFFFFF; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
            .hero h1 { font-family: 'DM Serif Display', Georgia, serif; letter-spacing: 0.2px; margin: 0; font-size: 34px; line-height: 1.15; font-weight: 400; }
            .hero p { margin: 10px 0 0; opacity: 0.95; font-size: 14px; font-weight: 600; line-height: 1.55; }
            .section-title { font-family: 'DM Serif Display', Georgia, serif; color: #00ACC9; margin: 0 0 10px; font-size: 30px; line-height: 1.2; font-weight: 400; }
            .muted { color: #64748B; margin: 0; font-size: 13px; line-height: 1.5; }
            .dashboard-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 16px; }
            .card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
            .kpi { background: #F5F7FA; border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px; }
            .kpi .k { color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
            .kpi .v { color: #1F2937; font-size: 24px; font-weight: 800; margin-top: 4px; line-height: 1.15; }
            .ring-wrap { display: flex; align-items: center; justify-content: center; }
            .ring { width: 180px; height: 180px; border-radius: 999px; background: conic-gradient(#00ACC9 ${puntajeGlobal}%, #E5E7EB ${puntajeGlobal}% 100%); display: grid; place-items: center; margin: 6px auto 12px; }
            .ring-inner { width: 126px; height: 126px; border-radius: 999px; background: #FFFFFF; display: grid; place-items: center; text-align: center; }
            .ring-value { font-size: 30px; font-weight: 800; color: #1F2937; line-height: 1; }
            .ring-label { font-size: 12px; color: #64748B; margin-top: 4px; font-weight: 700; }
            .dim-row { display: grid; grid-template-columns: 250px 1fr 60px; gap: 10px; align-items: center; margin-bottom: 12px; }
            .dim-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
            .dim-rank { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 22px; border-radius: 999px; background: #E6F7FB; color: #0284C7; font-size: 11px; font-weight: 800; }
            .dim-name { font-size: 13px; color: #0F172A; font-weight: 800; line-height: 1.25; }
            .dim-level { font-size: 11px; color: #64748B; font-weight: 700; margin-top: 1px; }
            .bar-track { height: 12px; background: #E5E7EB; border-radius: 999px; overflow: hidden; }
            .bar-fill { height: 100%; background: linear-gradient(90deg, #06B6D4, #0EA5E9); border-radius: 999px; }
            .bar-value { font-size: 12px; color: #334155; text-align: right; font-weight: 800; }
            .level-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
            .level-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; }
            .level-head { font-size: 13px; color: #0F172A; font-weight: 800; }
            .level-meta { font-size: 12px; color: #475569; margin-top: 3px; font-weight: 700; }
            .level-track { height: 10px; border-radius: 999px; background: #E5E7EB; margin-top: 10px; overflow: hidden; }
            .level-fill { height: 100%; border-radius: 999px; background: #3FAE49; }
            .dist-block { margin-top: 14px; padding: 12px; border: 1px solid #E2E8F0; border-radius: 12px; background: #FCFDFE; }
            .dist-subtitle { margin: 0 0 10px; color: #334155; font-size: 12px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; }
            .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 12px; }
            .summary-box { background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px; }
            .summary-box .k { color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 800; }
            .summary-box .v { color: #0F172A; font-size: 16px; font-weight: 800; margin-top: 2px; }
            .chips { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
            .chip { display: inline-flex; align-items: center; border: 1px solid #D1D5DB; border-radius: 999px; padding: 4px 9px; font-size: 11px; font-weight: 700; color: #334155; background: #FFFFFF; }
            .two-col { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 14px; }
            .radar-wrap { background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 12px; padding: 8px; }
            .radar-grid { fill: none; stroke: #D1D5DB; stroke-width: 1; }
            .radar-axis { stroke: #CBD5E1; stroke-width: 1; }
            .radar-area { fill: #00ACC9; fill-opacity: 0.28; stroke: #00ACC9; stroke-width: 2; }
            .radar-dot { fill: #00ACC9; }
            .radar-label { fill: #475569; font-size: 10px; text-anchor: middle; }
            .radar-level { fill: #94A3B8; font-size: 9px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; font-size: 13px; line-height: 1.45; }
            th { background: #F5F7FA; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #334155; font-weight: 800; }
            .item-groups { display: grid; gap: 12px; margin-top: 8px; }
            .item-group { border: 1px solid #E5E7EB; border-radius: 12px; background: #FCFDFE; overflow: hidden; }
            .item-group-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; background: #EEF7FA; border-bottom: 1px solid #E5E7EB; }
            .item-dimension { font-size: 12px; color: #0F172A; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; }
            .item-count { font-size: 11px; color: #475569; font-weight: 800; }
            .item-list { padding: 8px 12px 12px; }
            .item-row { padding: 10px 0; border-bottom: 1px dashed #E2E8F0; }
            .item-row:last-child { border-bottom: 0; padding-bottom: 2px; }
            .item-header { display: flex; align-items: flex-start; gap: 8px; }
            .item-index { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; border-radius: 999px; background: #E6F7FB; color: #0284C7; font-size: 10px; font-weight: 800; margin-top: 2px; }
            .item-question { font-size: 12px; line-height: 1.4; color: #1F2937; font-weight: 700; }
            .item-metrics { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
            .item-badge { border: 1px solid #D1D5DB; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; color: #334155; background: #FFFFFF; }
            .item-badge-strong { background: #E6F7FB; border-color: #BAE6FD; color: #0C4A6E; }
            .item-bar-track { height: 8px; border-radius: 999px; background: #E5E7EB; margin-top: 8px; overflow: hidden; }
            .item-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #06B6D4, #0EA5E9); }
            ul { margin: 0; padding-left: 18px; }
            li { margin-bottom: 8px; line-height: 1.45; }
            .actions { margin-bottom: 14px; }
            .btn { background: #00ACC9; color: #FFFFFF; border: 0; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-family: 'Nunito', 'Segoe UI', Tahoma, sans-serif; font-weight: 800; letter-spacing: 0.02em; }
            .page-break { page-break-before: always; }
            @media print {
              .actions { display: none; }
              body { padding: 0; background: #FFFFFF; }
              .hero { border: 1px solid #E5E7EB; }
              .card { break-inside: avoid; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="actions">
            <button class="btn" onclick="window.print()">Descargar / Guardar PDF</button>
          </div>
          <div class="hero">
            <h1>Reporte Ejecutivo de Transformación Digital</h1>
            <p>Proyecto: Integración de IA Generativa en el Diagnóstico y Planificación Estratégica de la Transformación Digital para PYMES</p>
          </div>

          <div class="dashboard-grid">
            <div class="card">
              <h2 class="section-title">Reporte de Madurez Digital - SIEDSS</h2>
              <p class="muted">Universidad Cooperativa de Colombia</p>
              <p class="muted">Fecha de cálculo: ${escaparHtml(fecha)}</p>
              ${empresa ? `<p class="muted">Empresa: ${escaparHtml(empresa.razon_social)} | NIT: ${escaparHtml(empresa.nit)} | Sector: ${escaparHtml(empresa.sector)} | Ciudad: ${escaparHtml(empresa.ciudad)}</p>` : ''}
              <div class="kpi-grid">
                <div class="kpi"><div class="k">Puntaje Global</div><div class="v">${puntajeGlobal}%</div></div>
                <div class="kpi"><div class="k">Nivel Global</div><div class="v" style="font-size:20px">${escaparHtml(nivelGlobal)}</div></div>
                <div class="kpi"><div class="k">Dimensiones</div><div class="v">${totalDimensiones}</div></div>
                <div class="kpi"><div class="k">Ítems Evaluados</div><div class="v">${totalItems}</div></div>
              </div>
            </div>

            <div class="card ring-wrap">
              <div>
                <div class="ring">
                  <div class="ring-inner">
                    <div>
                      <div class="ring-value">${puntajeGlobal}%</div>
                      <div class="ring-label">Madurez global</div>
                    </div>
                  </div>
                </div>
                <div class="muted" style="text-align:center;font-weight:700;color:#333333">${escaparHtml(nivelGlobal)}</div>
              </div>
            </div>
          </div>

          <div class="card">
            <h2 class="section-title">Resumen Ejecutivo</h2>
            <p class="muted">Síntesis del desempeño digital de la empresa con énfasis en brechas y oportunidades prioritarias.</p>
            <div class="summary-grid">
              <div class="summary-box">
                <div class="k">Mejor Dimensión</div>
                <div class="v">${mejorDimension ? `${escaparHtml(mejorDimension.nombre)} (${mejorDimension.puntaje}%)` : 'Sin datos'}</div>
              </div>
              <div class="summary-box">
                <div class="k">Dimensión Crítica</div>
                <div class="v">${menorDimension ? `${escaparHtml(menorDimension.nombre)} (${menorDimension.puntaje}%)` : 'Sin datos'}</div>
              </div>
              <div class="summary-box">
                <div class="k">Brecha Máxima</div>
                <div class="v">${brechaDimension}%</div>
              </div>
            </div>
            <div class="chips">
              ${chipsItemsDimension || '<span class="chip">Sin distribución de ítems disponible</span>'}
            </div>
          </div>

          <div class="card two-col">
            <div>
              <h2 class="section-title">Mapa de Madurez por Dimensión</h2>
              <p class="muted">Gráfico tipo diamante/radar con el puntaje de cada dimensión evaluada.</p>
              <div class="radar-wrap">
                ${dimensionesRadar.length >= 3 ? `
                <svg viewBox="0 0 340 340" width="100%" height="320" role="img" aria-label="Mapa de madurez por dimensión">
                  ${rejillaRadar}
                  ${ejesRadar}
                  <polygon points="${poligonoRadar}" class="radar-area" />
                  ${puntosRadar}
                  ${etiquetasRadar}
                  <text x="178" y="72" class="radar-level">100</text>
                  <text x="178" y="99" class="radar-level">80</text>
                  <text x="178" y="123" class="radar-level">60</text>
                  <text x="178" y="149" class="radar-level">40</text>
                  <text x="178" y="170" class="radar-level">20</text>
                </svg>
                ` : '<p class="muted">No hay suficientes dimensiones para construir el diamante.</p>'}
              </div>
            </div>
            <div>
              <h2 class="section-title">Resultados por Dimensión</h2>
              <table>
                <thead>
                  <tr>
                    <th>Dimensión</th>
                    <th>Puntaje</th>
                    <th>Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  ${filasResumenDimensiones || '<tr><td colspan="3">Sin resultados por dimensión.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <h2 class="section-title">Distribución por Nivel (Ítems)</h2>
            <div class="level-grid">
              ${tarjetasNiveles || '<p class="muted">Sin datos por nivel.</p>'}
            </div>
            <div class="dist-block">
              <p class="dist-subtitle">Rendimiento por dimensión</p>
              ${barrasDimensiones || '<p class="muted">No hay resultados por dimensión.</p>'}
            </div>
          </div>

          <div class="card page-break">
            <h2 class="section-title">Resultados por Ítem</h2>
            <p class="muted">Vista visual por dimensión con barras de avance por cada pregunta evaluada.</p>
            <div class="item-groups">
              ${bloquesItemsVisual || '<p class="muted">No hay detalle de ítems para mostrar.</p>'}
            </div>
          </div>

        </body>
      </html>
    `;
  };

  const abrirReportePdf = async (descargar: boolean): Promise<void> => {
    const detalle = reporteDetallado ?? await obtenerReporteDetallado();
    if (!detalle) {
      alert('No se pudo generar el PDF porque no hay datos detallados disponibles.');
      return;
    }

    const ventana = window.open('about:blank', '_blank');
    if (!ventana) {
      return;
    }

    // Harden opener while keeping document writable in browsers that block writing with noreferrer.
    ventana.opener = null;

    const html = generarHtmlReporte(detalle);
    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();

    if (descargar) {
      setTimeout(() => {
        ventana.focus();
        ventana.print();
      }, 350);
    }
  };

  return (
    <>
    <div className="space-y-5 max-w-7xl mx-auto pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Panel de Resultados</h1>
          <p className="text-sm text-[#6B7280] mt-1">Seguimiento de madurez digital empresarial</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-sm text-[#6B7280] hover:bg-[#F5F7FA]">
            <CalendarDays size={15} />
            Oct 18 - Nov 18
          </button>
          <button
            onClick={() => setMostrarFiltros((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-sm text-[#6B7280] hover:bg-[#F5F7FA]"
          >
            <SlidersHorizontal size={15} />
            Filtrar {totalFiltrosActivos > 0 ? `(${totalFiltrosActivos})` : ''}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
      {mostrarFiltros && (
        <motion.div
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-sm text-[#6B7280]">
              Dimensión
              <select
                value={filtroDimension}
                onChange={(e) => setFiltroDimension(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-sm text-[#333333]"
              >
                <option value="todas">Todas</option>
                {opcionesDimension.map((dimension) => (
                  <option key={dimension} value={dimension}>{dimension}</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[#6B7280]">
              Nivel
              <select
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-sm text-[#333333]"
              >
                <option value="todos">Todos</option>
                {nivelesOrden.map((nivel) => (
                  <option key={nivel} value={nivel}>{etiquetaNivel(nivel)}</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[#6B7280]">
              Buscar ítem
              <div className="mt-1 flex items-center rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2">
                <Search size={15} className="text-[#9CA3AF]" />
                <input
                  value={busquedaItem}
                  onChange={(e) => setBusquedaItem(e.target.value)}
                  placeholder="Ej: 2.1 o innovación"
                  className="ml-2 w-full border-0 bg-transparent text-sm text-[#333333] outline-none"
                />
              </div>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setFiltroDimension('todas');
                setFiltroNivel('todos');
                setBusquedaItem('');
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:bg-[#F5F7FA]"
            >
              <FilterX size={14} />
              Limpiar filtros
            </button>
            <p className="text-xs text-[#6B7280]">
              Mostrando {itemsFiltrados.length} de {detalleItems.length} ítems.
            </p>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-[#6B7280]">Puntaje Global</p>
          <p className="mt-1 text-3xl font-bold text-[#333333]">{puntajeGlobalVisible}%</p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#EEF7FA] px-2 py-0.5 text-xs font-semibold text-[#00ACC9]">
            <ArrowUpRight size={12} />
            {filtrosActivos ? 'Vista filtrada' : 'Diagnóstico activo'}
          </p>
        </motion.div>

        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-[#6B7280]">Nivel Global</p>
          <p className="mt-1 text-3xl font-bold" style={{ color: nivelColor }}>{nivelLabel}</p>
          <p className="mt-2 text-xs text-[#6B7280]">Clasificación de madurez actual</p>
        </motion.div>

        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-[#6B7280]">Dimensiones</p>
          <p className="mt-1 text-3xl font-bold text-[#333333]">{chartDataOrdenado.length}</p>
          <p className="mt-2 text-xs text-[#6B7280]">Áreas visibles en tablero</p>
        </motion.div>

        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-[#6B7280]">Ítems Evaluados</p>
          <p className="mt-1 text-3xl font-bold text-[#333333]">{totalItemsEvaluados}</p>
          <p className="mt-2 text-xs text-[#6B7280]">
            {filtrosActivos ? 'Total según filtros aplicados' : `Último corte: ${new Date(resultado.fecha_calculo ?? Date.now()).toLocaleDateString('es-CO')}`}
          </p>
        </motion.div>
      </div>

      <div className="flex items-center justify-end flex-wrap gap-3">
        <button
          onClick={async () => {
            const detalle = reporteDetallado ?? await obtenerReporteDetallado();
            if (!detalle) {
              alert('No se pudo cargar el detalle del reporte. Intenta nuevamente.');
              return;
            }
            setMostrarVistaPreviaPdf(true);
          }}
          className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E5E7EB] text-[#333333] hover:bg-[#F5F7FA] px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <Download size={18} />
          Descargar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-6 xl:col-span-2 shadow-sm">
          <h3 className="text-lg font-semibold text-[#333333] mb-1">Desempeño por Dimensión</h3>
          <p className="text-sm text-[#6B7280] mb-4">Ranking porcentual por dimensión evaluada (0% - 100%).</p>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[#374151]">
              Mayor resultado: <span className="font-semibold">{mejorDimension?.name ?? 'N/A'} ({mejorDimension?.puntaje ?? 0}%)</span>
            </div>
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[#374151]">
              Oportunidad de mejora: <span className="font-semibold">{menorDimension?.name ?? 'N/A'} ({menorDimension?.puntaje ?? 0}%)</span>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartDataOrdenado} margin={{ top: 5, right: 36, left: 18, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <YAxis type="category" dataKey="nombreEje" width={200} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#333333' }} />
                <ReferenceLine x={50} stroke="#9CA3AF" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ fill: '#F5F7FA' }}
                  formatter={(value) => [`${Number(value ?? 0)}%`, 'Puntaje']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? 'Dimensión'}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFFFFF' }}
                />
                <Bar dataKey="puntaje" radius={[0, 10, 10, 0]} barSize={26} background={{ fill: '#F3F4F6' }}>
                  {chartDataOrdenado.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="puntaje"
                    position="right"
                    formatter={(value) => `${Number(value ?? 0)}%`}
                    style={{ fill: '#374151', fontSize: 12, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#333333] mb-1">Distribución por Nivel</h3>
          <p className="text-sm text-[#6B7280] mb-4">Cantidad de ítems por nivel específico.</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nivelesData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  cursor={{ fill: '#F5F7FA' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFFFFF' }}
                />
                <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                  {nivelesData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#333333] mb-1">Composición de Niveles</h3>
          <p className="text-sm text-[#6B7280] mb-4">Participación de cada nivel en los ítems evaluados.</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={nivelesPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={55}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name}: ${Math.round((percent ?? 0) * 100)}%`}
                >
                  {nivelesPieData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} ítems`, 'Cantidad']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFFFFF' }}
                />
                <Legend verticalAlign="bottom" height={30} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#333333] mb-1">Mapa de Madurez por Dimensión</h3>
          <p className="text-sm text-[#6B7280] mb-3">Vista integral del equilibrio entre dimensiones (0% - 100%).</p>
          {filtrosActivos && (
            <p className="mb-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs text-[#6B7280]">
              Para mantener el mapa entendible, las dimensiones sin datos en el filtro actual se muestran en 0%.
            </p>
          )}
          {filtrosActivos && !itemsFiltrados.length ? (
            <div className="flex h-72 w-full items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#FCFCFD] px-6 text-center text-sm text-[#6B7280]">
              No hay datos para construir el mapa con los filtros actuales. Ajusta el nivel, dimensión o texto de búsqueda.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <Radar
                    name="Puntaje"
                    dataKey="puntaje"
                    stroke="#00ACC9"
                    fill="#00ACC9"
                    fillOpacity={0.28}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const tieneDato = Boolean((item?.payload as { tieneDato?: boolean } | undefined)?.tieneDato);
                      return [`${value}%`, tieneDato ? 'Puntaje' : 'Sin datos por filtro'];
                    }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFFFFF' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-6 xl:col-span-2 shadow-sm">
          <h3 className="text-lg font-semibold text-[#333333] mb-1">Resultados por Ítem</h3>
          <p className="text-sm text-[#6B7280] mb-4">Muestra filtrada de ítems agrupados por dimensión.</p>
          <div className="overflow-auto max-h-[560px]">
            <table className="min-w-full text-sm rounded-xl overflow-hidden">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#F5F7FA]">
                  <th className="p-3 text-left border border-[#E5E7EB]">Ítem/Pregunta</th>
                  <th className="p-3 text-left border border-[#E5E7EB]">Valor</th>
                  <th className="p-3 text-left border border-[#E5E7EB]">Nivel</th>
                </tr>
              </thead>
              <tbody>
                {dimensionesItems.map((dimension, index) => {
                  const nombreBase = limpiarPrefijoDimension(dimension) || dimension;
                  const tituloDimension = `${convertirARomano(index + 1)}. ${nombreBase}`;
                  return (
                  <Fragment key={`group-${dimension}`}>
                    <tr className="bg-[#EEF7FA]">
                      <td className="p-3 border border-[#E5E7EB] text-[#0F766E] font-semibold" colSpan={3}>
                        {tituloDimension} ({itemsAgrupadosPorDimension[dimension].length} ítems)
                      </td>
                    </tr>
                    {itemsAgrupadosPorDimension[dimension].map((item, idx) => (
                      <tr key={`${dimension}-${idx}`} className={idx % 2 === 0 ? 'bg-[#FFFFFF]' : 'bg-[#FCFCFD]'}>
                        <td className="p-3 border border-[#E5E7EB] text-[#333333]">{item.pregunta}</td>
                        <td className="p-3 border border-[#E5E7EB] text-[#333333]">{item.valor_numerico ?? 'N/A'}</td>
                        <td className="p-3 border border-[#E5E7EB] text-[#333333]">
                          {item.nivel_item ? (
                            <span
                              className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                              style={{
                                backgroundColor: `${COLORES_NIVEL[item.nivel_item] ?? '#00ACC9'}1F`,
                                color: COLORES_NIVEL[item.nivel_item] ?? '#00ACC9',
                              }}
                            >
                              {etiquetaNivel(item.nivel_item)}
                            </span>
                          ) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
                })}
                {!itemsMuestra.length && (
                  <tr>
                    <td className="p-3 border border-[#E5E7EB] text-[#6B7280]" colSpan={3}>
                      {loadingReporteDetallado ? 'Cargando resultados por ítem...' : 'No hay ítems que cumplan los filtros seleccionados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#333333] mb-4 flex items-center gap-2">
            <AlertCircle className="text-[#00ACC9]" size={20} />
            Hallazgos Clave
          </h3>
          <div className="space-y-3 text-sm">
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F5F7FA]">
              <p className="text-[#6B7280]">Mejor dimensión</p>
              <p className="font-semibold text-[#333333] mt-1">
                {mejorDimension ? `${mejorDimension.name} (${mejorDimension.puntaje}%)` : 'Sin datos'}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F5F7FA]">
              <p className="text-[#6B7280]">Dimensión con oportunidad</p>
              <p className="font-semibold text-[#333333] mt-1">
                {menorDimension ? `${menorDimension.name} (${menorDimension.puntaje}%)` : 'Sin datos'}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F5F7FA]">
              <p className="text-[#6B7280]">Niveles detectados</p>
              <p className="font-semibold text-[#333333] mt-1">{nivelesData.filter((n) => n.cantidad > 0).length}</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/encuesta')}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#00ACC9] text-[#FFFFFF] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#3FAE49] transition-colors"
            >
              <TrendingUp size={16} />
              Nueva Evaluación
            </button>
          </div>
        </div>
      </div>
    </div>
    {mostrarVistaPreviaPdf && (
      <div className="fixed inset-0 z-40 bg-[#333333]/40 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl">
          <div className="sticky top-0 bg-[#FFFFFF] border-b border-[#E5E7EB] px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">Vista previa del reporte PDF</h3>
              <p className="text-xs text-[#6B7280] mt-1">Revisa la información antes de abrir o descargar.</p>
            </div>
            <button
              onClick={() => setMostrarVistaPreviaPdf(false)}
              className="p-2 rounded-lg border border-[#E5E7EB] text-[#333333] hover:bg-[#F5F7FA]"
              aria-label="Cerrar vista previa"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4 bg-[#F8FAFC]">
            {loadingReporteDetallado && (
              <div className="border border-[#E5E7EB] rounded-xl p-4 bg-[#F5F7FA] text-sm text-[#6B7280]">
                Cargando detalle del reporte para PDF...
              </div>
            )}
            <div className="rounded-2xl border border-[#D6E8EE] bg-[linear-gradient(135deg,#E8F7FB_0%,#F3FBF6_100%)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold text-[#0F172A]">Reporte SIEDSS</h4>
                  <p className="text-sm text-[#475569]">Fecha de cálculo: {vistaPreviaFecha}</p>
                  {reporteDetallado?.empresa && (
                    <p className="text-sm text-[#475569] mt-1">
                      Empresa: {reporteDetallado.empresa.razon_social} | NIT: {reporteDetallado.empresa.nit}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-[#BAE6FD] bg-[#FFFFFF]/90 px-4 py-3 text-right min-w-[160px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#64748B]">Madurez Global</p>
                  <p className="text-2xl font-extrabold text-[#0C4A6E] leading-none mt-1">{vistaPreviaPuntajeGlobal}%</p>
                  <p className="text-sm font-semibold text-[#334155] mt-1">{vistaPreviaNivelGlobal}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#94A3B8]">Dimensiones</p>
                  <p className="mt-1 text-base font-bold text-[#0F172A]">{vistaPreviaDimensiones.length}</p>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#94A3B8]">Ítems</p>
                  <p className="mt-1 text-base font-bold text-[#0F172A]">{vistaPreviaItems.length}</p>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#94A3B8]">Mejor dimensión</p>
                  <p className="mt-1 text-sm font-semibold text-[#334155] truncate">{vistaPreviaDimensiones[0]?.nombre_dimension ?? 'Sin datos'}</p>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#94A3B8]">Nivel dominante</p>
                  <p className="mt-1 text-sm font-semibold text-[#334155]">{vistaPreviaNiveles[0] ? etiquetaNivel(vistaPreviaNiveles[0].nivel) : 'Sin datos'}</p>
                </div>
              </div>
            </div>

            <div className="border border-[#E5E7EB] bg-[#FFFFFF] rounded-xl p-4">
              <h4 className="text-base font-semibold text-[#333333] mb-3">Resumen por nivel (ítems)</h4>
              <div className="space-y-2">
                {vistaPreviaNiveles.map((n) => (
                  <div key={n.nivel} className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-[#0F172A]">{etiquetaNivel(n.nivel)}</span>
                      <span className="text-[#64748B]">{n.cantidad} ítems</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#00ACC9]"
                        style={{ width: `${Math.max(0, Math.min(100, n.porcentaje))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#475569]">{n.porcentaje}%</p>
                  </div>
                ))}
                {!vistaPreviaNiveles.length && (
                  <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-lg p-3 text-sm text-[#6B7280]">
                    Aún no hay resumen por nivel disponible.
                  </div>
                )}
              </div>
            </div>

            <div className="border border-[#E5E7EB] bg-[#FFFFFF] rounded-xl p-4">
              <h4 className="text-base font-semibold text-[#333333] mb-3">Dimensiones evaluadas</h4>
              <div className="space-y-2">
                {vistaPreviaDimensiones.map((dim) => (
                  <div key={dim.nombre_dimension} className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                    <div className="flex items-start justify-between gap-2 text-sm">
                      <div className="font-semibold text-[#0F172A]">{dim.nombre_dimension}</div>
                      <div className="text-[#334155] font-semibold">{dim.puntaje_redondeado}%</div>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${dim.puntaje_redondeado}%`, backgroundColor: COLORES_NIVEL[dim.nivel] ?? '#00ACC9' }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#64748B]">Nivel: {etiquetaNivel(dim.nivel)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[#E5E7EB] bg-[#FFFFFF] rounded-xl p-4">
              <h4 className="text-base font-semibold text-[#333333] mb-3">Resultados por ítem</h4>
              <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                {Object.entries(vistaPreviaItemsPorDimension).map(([dimension, lista]) => (
                  <div key={dimension} className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-[#0F172A]">{dimension}</p>
                      <span className="text-xs font-semibold text-[#64748B]">{lista.length} ítems</span>
                    </div>
                    <div className="space-y-2">
                      {lista.map((item, idx) => {
                        const porcentaje = Math.max(0, Math.min(100, Math.round(item.porcentaje_item ?? 0)));
                        return (
                          <div key={`${dimension}-${idx}`} className="rounded-md border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2">
                            <p className="text-xs text-[#334155] font-medium">{item.pregunta}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="inline-flex rounded-full border border-[#D1D5DB] px-2 py-0.5 text-[#334155]">Valor: {item.valor_numerico ?? 'N/A'}</span>
                              <span className="inline-flex rounded-full border border-[#D1D5DB] px-2 py-0.5 text-[#334155]">Nivel: {item.nivel_item ? etiquetaNivel(item.nivel_item) : 'N/A'}</span>
                              <span className="inline-flex rounded-full border border-[#BAE6FD] bg-[#E6F7FB] px-2 py-0.5 font-semibold text-[#0C4A6E]">{porcentaje}%</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                              <div className="h-full rounded-full bg-[#00ACC9]" style={{ width: `${porcentaje}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {!vistaPreviaItems.length && (
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F5F7FA] p-3 text-sm text-[#6B7280]">No hay detalle por ítem disponible.</div>
                )}
              </div>
            </div>

          </div>

          <div className="sticky bottom-0 bg-[#FFFFFF] border-t border-[#E5E7EB] p-4 flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => { void abrirReportePdf(false); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#333333] hover:bg-[#F5F7FA]"
            >
              <Eye size={16} />
              Abrir PDF
            </button>
            <button
              onClick={() => { void abrirReportePdf(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00ACC9] text-[#FFFFFF] hover:bg-[#3FAE49]"
            >
              <Download size={16} />
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
