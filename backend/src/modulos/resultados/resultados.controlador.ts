import { Response } from 'express';
import { ResultadoMadurez } from './resultado_madurez.modelo';
import { ResultadoPorDimension } from './resultado_por_dimension.modelo';
import { Recomendacion } from './recomendacion.modelo';
import { SeccionEncuesta } from '../encuestas/seccion_encuesta.modelo';
import { Empresa } from '../empresas/empresa.modelo';
import { RespuestaEncuesta } from '../respuestas/respuesta_encuesta.modelo';
import { PreguntaEncuesta } from '../encuestas/pregunta_encuesta.modelo';
import { SolicitudAutenticada } from '../../middlewares/verificar_token';
import { calcularPorcentaje, clasificarNivel } from './madurez.servicio';

// GET /api/resultados/ultimo
// Devuelve el último resultado de la empresa del usuario autenticado
export const obtenerUltimoResultado = async (req: SolicitudAutenticada, res: Response): Promise<void> => {
  try {
    const usuarioId = req.usuario.id;

    // Buscar empresa del usuario
    const empresa = await Empresa.findOne({ id_usuario: usuarioId });
    if (!empresa) {
      res.status(404).json({ error: 'No se encontró empresa asociada' });
      return;
    }

    // Buscar el último resultado de esa empresa
    const ultimoResultado = await ResultadoMadurez
      .findOne({ id_empresa: empresa._id })
      .sort({ fecha_calculo: -1 })
      .lean();

    if (!ultimoResultado) {
      res.status(404).json({ error: 'Sin evaluaciones completadas aún' });
      return;
    }

    // Obtener dimensiones del resultado
    const dimensiones = await ResultadoPorDimension
      .find({ id_resultado: ultimoResultado._id })
      .lean();

    // Enriquecer con nombre de la sección
    const resultadosPorDimension = await Promise.all(
      dimensiones.map(async (dim) => {
        const seccion = await SeccionEncuesta.findById(dim.id_seccion).lean();
        return {
          nombre_dimension: seccion?.nombre ?? dim.id_seccion.toString(),
          descripcion_dimension: seccion?.descripcion ?? '',
          puntaje_porcentaje: dim.porcentaje,
          nivel: dim.nivel,
        };
      })
    );

    // Obtener recomendaciones relevantes para las dimensiones con nivel más bajo
    const nivelesPresentes = [...new Set(resultadosPorDimension.map(d => d.nivel))];
    const recomendaciones = await Recomendacion
      .find({ nivel_asociado: { $in: nivelesPresentes } })
      .limit(6)
      .lean();

    res.json({
      puntaje_global: ultimoResultado.porcentaje_global,
      nivel_global: ultimoResultado.nivel_global,
      fecha_calculo: ultimoResultado.fecha_calculo,
      resultados_por_dimension: resultadosPorDimension,
      recomendaciones: recomendaciones.map(r => ({
        texto: r.texto,
        nivel_asociado: r.nivel_asociado,
      })),
    });

  } catch (error) {
    console.error('Error obteniendo último resultado:', error);
    res.status(500).json({ error: 'Error interno obteniendo resultados' });
  }
};

// GET /api/resultados/reporte-detallado
// Devuelve información completa para vista previa/descarga de PDF
export const obtenerReporteDetallado = async (req: SolicitudAutenticada, res: Response): Promise<void> => {
  try {
    const usuarioId = req.usuario.id;

    const empresa = await Empresa.findOne({ id_usuario: usuarioId }).lean();
    if (!empresa) {
      res.status(404).json({ error: 'No se encontró empresa asociada' });
      return;
    }

    const ultimoResultado = await ResultadoMadurez
      .findOne({ id_empresa: empresa._id })
      .sort({ fecha_calculo: -1 })
      .lean();

    if (!ultimoResultado) {
      res.status(404).json({ error: 'Sin evaluaciones completadas aún' });
      return;
    }

    const dimensiones = await ResultadoPorDimension
      .find({ id_resultado: ultimoResultado._id })
      .lean();

    const resultadosPorDimension = await Promise.all(
      dimensiones.map(async (dim) => {
        const seccion = await SeccionEncuesta.findById(dim.id_seccion).lean();
        return {
          id_seccion: dim.id_seccion,
          nombre_dimension: seccion?.nombre ?? dim.id_seccion.toString(),
          descripcion_dimension: seccion?.descripcion ?? '',
          puntaje_porcentaje: dim.porcentaje,
          nivel: dim.nivel,
        };
      })
    );

    const recomendaciones = await Recomendacion
      .find({ nivel_asociado: { $in: [...new Set(resultadosPorDimension.map((d) => d.nivel))] } })
      .limit(6)
      .lean();

    const respuestas = await RespuestaEncuesta
      .find({ id_encuesta: ultimoResultado.id_encuesta })
      .lean();

    const preguntas = await PreguntaEncuesta
      .find({ _id: { $in: respuestas.map((r) => r.id_pregunta) } })
      .lean();

    const secciones = await SeccionEncuesta.find().lean();

    const mapaPreguntas = new Map(preguntas.map((p) => [String(p._id), p]));
    const mapaSecciones = new Map(secciones.map((s) => [String(s._id), s]));

    const detalleItems = respuestas
      .map((r) => {
        const pregunta = mapaPreguntas.get(String(r.id_pregunta));
        if (!pregunta) {
          return null;
        }

        const seccion = mapaSecciones.get(String(pregunta.id_seccion));
        const valor = typeof r.valor_numerico === 'number' ? r.valor_numerico : null;
        const esDatoGeneral = seccion?.nombre === 'datos_generales';
        const valorInformativo = typeof r.texto_respuesta === 'string' && r.texto_respuesta.trim().length > 0
          ? r.texto_respuesta.trim()
          : valor;
        const porcentajeItem = !esDatoGeneral && valor !== null ? calcularPorcentaje(valor) : null;
        const nivelItem = porcentajeItem !== null ? clasificarNivel(porcentajeItem) : null;

        return {
          id_pregunta: r.id_pregunta,
          dimension: seccion?.descripcion ?? seccion?.nombre ?? 'sin_dimension',
          pregunta: pregunta.texto_pregunta,
          valor_numerico: valor,
          valor_respuesta: valorInformativo,
          porcentaje_item: porcentajeItem,
          nivel_item: nivelItem,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const conteoNiveles = detalleItems.reduce<Record<string, number>>((acc, item) => {
      if (item.nivel_item) {
        acc[item.nivel_item] = (acc[item.nivel_item] ?? 0) + 1;
      }
      return acc;
    }, {});

    const totalConNivel = Object.values(conteoNiveles).reduce((a, b) => a + b, 0);
    const resumenPorNivel = Object.entries(conteoNiveles).map(([nivel, cantidad]) => ({
      nivel,
      cantidad,
      porcentaje: totalConNivel > 0 ? Number(((cantidad / totalConNivel) * 100).toFixed(2)) : 0,
    }));

    res.json({
      empresa: {
        nombre_empresa: empresa.razon_social,
        razon_social: empresa.razon_social,
        nit: empresa.nit,
        sector: empresa.sector,
        ciudad: empresa.ciudad,
        tamano: empresa.tamano,
        ano_constitucion: empresa.ano_constitucion,
        parque_tecnologico: empresa.parque_tecnologico,
        representante: empresa.representante,
        cargo_entrevistado: empresa.cargo_entrevistado,
        telefono: empresa.telefono,
      },
      resumen: {
        puntaje_global: ultimoResultado.porcentaje_global,
        nivel_global: ultimoResultado.nivel_global,
        fecha_calculo: ultimoResultado.fecha_calculo,
      },
      resultados_por_dimension: resultadosPorDimension,
      recomendaciones: recomendaciones.map((r) => ({
        texto: r.texto,
        nivel_asociado: r.nivel_asociado,
      })),
      detalle_items: detalleItems,
      resumen_por_nivel: resumenPorNivel,
    });
  } catch (error) {
    console.error('Error obteniendo reporte detallado:', error);
    res.status(500).json({ error: 'Error interno generando reporte detallado' });
  }
};
