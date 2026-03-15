import { Response } from 'express';
import mongoose from 'mongoose';
import { SolicitudAutenticada } from '../../middlewares/verificar_token';
import { Empresa } from './empresa.modelo';
import { ResultadoMadurez } from '../resultados/resultado_madurez.modelo';
import { ResultadoPorDimension } from '../resultados/resultado_por_dimension.modelo';
import { Encuesta } from '../encuestas/encuesta.modelo';
import { SeccionEncuesta } from '../encuestas/seccion_encuesta.modelo';
import { Rol } from '../usuarios/rol.modelo';
import { Usuario } from '../usuarios/usuario.modelo';
import { EstudianteSemillero } from '../estudiantes/estudiante_semillero.modelo';

type EstadoCartera = 'sin_encuesta' | 'en_proceso' | 'completada' | 'requiere_seguimiento';

const DIAS_SEGUIMIENTO = 180;
const MS_DIA = 1000 * 60 * 60 * 24;

const normalizarTexto = (valor: string): string => valor.trim().toLowerCase();

const calcularEstado = (tieneBorrador: boolean, fechaCalculo?: Date | null): EstadoCartera => {
  if (tieneBorrador) return 'en_proceso';
  if (!fechaCalculo) return 'sin_encuesta';

  const diasDesdeUltima = Math.floor((Date.now() - new Date(fechaCalculo).getTime()) / MS_DIA);
  return diasDesdeUltima > DIAS_SEGUIMIENTO ? 'requiere_seguimiento' : 'completada';
};

const mapearEtiquetaEstado = (estado: EstadoCartera): string => {
  if (estado === 'sin_encuesta') return 'Sin encuesta';
  if (estado === 'en_proceso') return 'En proceso';
  if (estado === 'completada') return 'Completada';
  return 'Requiere seguimiento';
};

export const obtenerCarteraConsultor = async (req: SolicitudAutenticada, res: Response): Promise<void> => {
  try {
    const rol = req.usuario?.rol;
    if (!rol || (rol !== 'semillero' && rol !== 'universidad')) {
      res.status(403).json({ error: 'Acceso restringido a consultores y universidad.' });
      return;
    }

    const estadoFiltro = normalizarTexto(String(req.query.estado ?? 'todos'));
    const sectorFiltro = normalizarTexto(String(req.query.sector ?? 'todos'));
    const ciudadFiltro = normalizarTexto(String(req.query.ciudad ?? 'todos'));
    const busqueda = normalizarTexto(String(req.query.busqueda ?? ''));

    const empresas = await Empresa.find().sort({ fecha_creacion: -1 }).lean();
    const empresaIds = empresas.map((e) => e._id);

    const [resultados, borradores] = await Promise.all([
      ResultadoMadurez.find({ id_empresa: { $in: empresaIds } }).sort({ fecha_calculo: -1 }).lean(),
      Encuesta.find({ id_empresa: { $in: empresaIds }, estado: 'borrador' }).lean(),
    ]);

    const resultadoPorEmpresa = new Map<string, (typeof resultados)[number]>();
    for (const resultado of resultados) {
      const empresaId = String(resultado.id_empresa);
      if (!resultadoPorEmpresa.has(empresaId)) {
        resultadoPorEmpresa.set(empresaId, resultado);
      }
    }

    const empresasConBorrador = new Set(borradores.map((b) => String(b.id_empresa)));

    const carteraBase = empresas.map((empresa) => {
      const idEmpresa = String(empresa._id);
      const ultimoResultado = resultadoPorEmpresa.get(idEmpresa);
      const fechaCalculo = ultimoResultado?.fecha_calculo ? new Date(ultimoResultado.fecha_calculo) : null;
      const estado = calcularEstado(empresasConBorrador.has(idEmpresa), fechaCalculo);

      const proximaRevision = fechaCalculo
        ? new Date(fechaCalculo.getTime() + DIAS_SEGUIMIENTO * MS_DIA)
        : null;

      const diasParaRevision = proximaRevision
        ? Math.ceil((proximaRevision.getTime() - Date.now()) / MS_DIA)
        : null;

      return {
        empresa_id: idEmpresa,
        razon_social: empresa.razon_social,
        nit: empresa.nit,
        sector: empresa.sector,
        ciudad: empresa.ciudad,
        tamano: empresa.tamano,
        representante: empresa.representante,
        origen_registro: empresa.origen_registro ?? 'empresa',
        // Empresa auto-registrada solo permite la primera aplicacion asistida.
        puede_aplicar_encuesta: (empresa.origen_registro ?? 'empresa') !== 'empresa' || !ultimoResultado,
        estado,
        estado_etiqueta: mapearEtiquetaEstado(estado),
        ultima_evaluacion: fechaCalculo,
        puntaje_global: ultimoResultado ? Math.round(ultimoResultado.porcentaje_global) : null,
        nivel_global: ultimoResultado?.nivel_global ?? null,
        proxima_revision: proximaRevision,
        dias_para_revision: diasParaRevision,
      };
    });

    const cartera = carteraBase.filter((empresa) => {
      const coincideEstado = estadoFiltro === 'todos' || empresa.estado === estadoFiltro;
      const coincideSector = sectorFiltro === 'todos' || normalizarTexto(empresa.sector) === sectorFiltro;
      const coincideCiudad = ciudadFiltro === 'todos' || normalizarTexto(empresa.ciudad) === ciudadFiltro;
      const coincideBusqueda = !busqueda
        || normalizarTexto(empresa.razon_social).includes(busqueda)
        || normalizarTexto(empresa.nit).includes(busqueda)
        || normalizarTexto(empresa.representante).includes(busqueda)
        || normalizarTexto(empresa.ciudad).includes(busqueda);

      return coincideEstado && coincideSector && coincideCiudad && coincideBusqueda;
    });

    const resumen = {
      total_empresas: cartera.length,
      sin_encuesta: cartera.filter((e) => e.estado === 'sin_encuesta').length,
      en_proceso: cartera.filter((e) => e.estado === 'en_proceso').length,
      completadas: cartera.filter((e) => e.estado === 'completada').length,
      requiere_seguimiento: cartera.filter((e) => e.estado === 'requiere_seguimiento').length,
    };

    const proximosVencimientos = cartera
      .filter((empresa) => typeof empresa.dias_para_revision === 'number')
      .filter((empresa) => (empresa.dias_para_revision ?? 9999) <= 30)
      .sort((a, b) => (a.dias_para_revision ?? 0) - (b.dias_para_revision ?? 0))
      .slice(0, 8);

    res.json({
      resumen,
      cartera,
      proximos_vencimientos: proximosVencimientos,
      metadata: {
        dias_seguimiento: DIAS_SEGUIMIENTO,
      },
    });
  } catch (error) {
    console.error('Error obteniendo cartera de consultor:', error);
    res.status(500).json({ error: 'Error interno obteniendo cartera del consultor.' });
  }
};

export const obtenerHistorialEmpresaConsultor = async (req: SolicitudAutenticada, res: Response): Promise<void> => {
  try {
    const rol = req.usuario?.rol;
    if (!rol || (rol !== 'semillero' && rol !== 'universidad')) {
      res.status(403).json({ error: 'Acceso restringido a consultores y universidad.' });
      return;
    }

    const empresaId = String(req.params.empresaId ?? '');
    if (!mongoose.Types.ObjectId.isValid(empresaId)) {
      res.status(400).json({ error: 'Identificador de empresa inválido.' });
      return;
    }

    const empresa = await Empresa.findById(empresaId).lean();
    if (!empresa) {
      res.status(404).json({ error: 'Empresa no encontrada.' });
      return;
    }

    const resultados = await ResultadoMadurez
      .find({ id_empresa: empresa._id })
      .sort({ fecha_calculo: -1 })
      .lean();

    if (!resultados.length) {
      res.json({
        empresa: {
          id: String(empresa._id),
          razon_social: empresa.razon_social,
          nit: empresa.nit,
          sector: empresa.sector,
          ciudad: empresa.ciudad,
        },
        historial: [],
        comparativo: null,
      });
      return;
    }

    const idsResultados = resultados.map((r) => r._id);
    const resultadosDimension = await ResultadoPorDimension
      .find({ id_resultado: { $in: idsResultados } })
      .lean();

    const idsSeccion = Array.from(new Set(resultadosDimension.map((rd) => String(rd.id_seccion))));
    const secciones = await SeccionEncuesta
      .find({ _id: { $in: idsSeccion } })
      .lean();

    const mapaSecciones = new Map(secciones.map((s) => [String(s._id), s]));
    const mapaDimPorResultado = new Map<string, Array<{
      id_seccion: string;
      nombre_dimension: string;
      puntaje_porcentaje: number;
      nivel: string;
    }>>();

    for (const rd of resultadosDimension) {
      const idResultado = String(rd.id_resultado);
      const idSeccion = String(rd.id_seccion);
      const seccion = mapaSecciones.get(idSeccion);
      const nombreDimension = seccion?.nombre ?? idSeccion;

      const lista = mapaDimPorResultado.get(idResultado) ?? [];
      lista.push({
        id_seccion: idSeccion,
        nombre_dimension: nombreDimension,
        puntaje_porcentaje: Math.round(rd.porcentaje),
        nivel: rd.nivel,
      });
      mapaDimPorResultado.set(idResultado, lista);
    }

    const historial = resultados.map((r) => {
      const dimensiones = (mapaDimPorResultado.get(String(r._id)) ?? [])
        .sort((a, b) => b.puntaje_porcentaje - a.puntaje_porcentaje);
      return {
        id_resultado: String(r._id),
        id_encuesta: String(r.id_encuesta),
        fecha_calculo: r.fecha_calculo,
        puntaje_global: Math.round(r.porcentaje_global),
        nivel_global: r.nivel_global,
        dimensiones,
      };
    });

    let comparativo: {
      ultimo_id_resultado: string;
      anterior_id_resultado: string;
      delta_global: number;
      dimensiones: Array<{
        id_seccion: string;
        nombre_dimension: string;
        puntaje_actual: number;
        puntaje_anterior: number;
        delta: number;
      }>;
    } | null = null;

    if (historial.length >= 2) {
      const ultimo = historial[0];
      const anterior = historial[1];
      const anteriorMap = new Map(anterior.dimensiones.map((d) => [d.id_seccion, d]));
      const ultimoMap = new Map(ultimo.dimensiones.map((d) => [d.id_seccion, d]));
      const idsUnion = Array.from(new Set([...ultimoMap.keys(), ...anteriorMap.keys()]));

      const dimensionesComparativo = idsUnion.map((idSeccion) => {
        const actual = ultimoMap.get(idSeccion);
        const previo = anteriorMap.get(idSeccion);
        const puntajeActual = actual?.puntaje_porcentaje ?? 0;
        const puntajeAnterior = previo?.puntaje_porcentaje ?? 0;

        return {
          id_seccion: idSeccion,
          nombre_dimension: actual?.nombre_dimension ?? previo?.nombre_dimension ?? idSeccion,
          puntaje_actual: puntajeActual,
          puntaje_anterior: puntajeAnterior,
          delta: puntajeActual - puntajeAnterior,
        };
      }).sort((a, b) => b.delta - a.delta);

      comparativo = {
        ultimo_id_resultado: ultimo.id_resultado,
        anterior_id_resultado: anterior.id_resultado,
        delta_global: ultimo.puntaje_global - anterior.puntaje_global,
        dimensiones: dimensionesComparativo,
      };
    }

    res.json({
      empresa: {
        id: String(empresa._id),
        razon_social: empresa.razon_social,
        nit: empresa.nit,
        sector: empresa.sector,
        ciudad: empresa.ciudad,
      },
      historial,
      comparativo,
    });
  } catch (error) {
    console.error('Error obteniendo historial de empresa para consultor:', error);
    res.status(500).json({ error: 'Error interno obteniendo historial de la empresa.' });
  }
};

export const obtenerPanelUniversidad = async (req: SolicitudAutenticada, res: Response): Promise<void> => {
  try {
    const rol = req.usuario?.rol;
    if (rol !== 'universidad') {
      res.status(403).json({ error: 'Acceso restringido al rol universidad.' });
      return;
    }

    const empresas = await Empresa.find().sort({ fecha_creacion: -1 }).lean();
    const empresaIds = empresas.map((empresa) => empresa._id);

    const [resultados, borradores, rolSemillero] = await Promise.all([
      ResultadoMadurez.find({ id_empresa: { $in: empresaIds } }).sort({ fecha_calculo: -1 }).lean(),
      Encuesta.find({ id_empresa: { $in: empresaIds }, estado: 'borrador' }).lean(),
      Rol.findOne({ nombre: 'semillero' }).lean(),
    ]);

    const resultadoPorEmpresa = new Map<string, (typeof resultados)[number]>();
    for (const resultado of resultados) {
      const idEmpresa = String(resultado.id_empresa);
      if (!resultadoPorEmpresa.has(idEmpresa)) {
        resultadoPorEmpresa.set(idEmpresa, resultado);
      }
    }

    const empresasConBorrador = new Set(borradores.map((borrador) => String(borrador.id_empresa)));

    const empresasControlBase = empresas.map((empresa) => {
      const idEmpresa = String(empresa._id);
      const ultimoResultado = resultadoPorEmpresa.get(idEmpresa);
      const fechaCalculo = ultimoResultado?.fecha_calculo ? new Date(ultimoResultado.fecha_calculo) : null;
      const estado = calcularEstado(empresasConBorrador.has(idEmpresa), fechaCalculo);

      return {
        empresa_id: idEmpresa,
        razon_social: empresa.razon_social,
        nit: empresa.nit,
        sector: empresa.sector,
        ciudad: empresa.ciudad,
        tamano: empresa.tamano,
        estado,
        estado_etiqueta: mapearEtiquetaEstado(estado),
        origen_registro: empresa.origen_registro ?? 'empresa',
        telefono: empresa.telefono ?? null,
        consultor_asignado_usuario_id: empresa.id_consultor_asignado ? String(empresa.id_consultor_asignado) : null,
        fecha_ultima_evaluacion: fechaCalculo,
        puntaje_global: ultimoResultado ? Math.round(ultimoResultado.porcentaje_global) : null,
        nivel_global: ultimoResultado?.nivel_global ?? null,
      };
    });

    let consultores: Array<{
      usuario_id: string;
      nombres: string;
      apellidos: string;
      identificacion: string;
      programa_academico: string;
      correo: string;
      estado: boolean;
      empresas_registradas: number;
    }> = [];

    if (rolSemillero?._id) {
      const consultorUsuarios = await Usuario.find({ id_rol: rolSemillero._id }).lean();
      const consultorUsuarioIds = consultorUsuarios.map((usuario) => String(usuario._id));

      const [estudiantes, empresasRegistradasPorConsultor] = await Promise.all([
        EstudianteSemillero.find({ id_usuario: { $in: consultorUsuarioIds } }).lean(),
        Empresa.find({ id_usuario_registro: { $in: consultorUsuarioIds } }).lean(),
      ]);

      const estudiantePorUsuario = new Map(estudiantes.map((estudiante) => [String(estudiante.id_usuario), estudiante]));
      const conteoEmpresas = new Map<string, number>();

      for (const empresa of empresasRegistradasPorConsultor) {
        const idUsuarioRegistro = empresa.id_usuario_registro ? String(empresa.id_usuario_registro) : '';
        if (!idUsuarioRegistro) continue;
        conteoEmpresas.set(idUsuarioRegistro, (conteoEmpresas.get(idUsuarioRegistro) ?? 0) + 1);
      }

      consultores = consultorUsuarios.map((usuario) => {
        const estudiante = estudiantePorUsuario.get(String(usuario._id));
        return {
          usuario_id: String(usuario._id),
          nombres: estudiante?.nombres ?? 'Sin nombre',
          apellidos: estudiante?.apellidos ?? '',
          identificacion: estudiante?.identificacion ?? 'N/D',
          programa_academico: estudiante?.programa_academico ?? 'N/D',
          correo: usuario.correo,
          estado: usuario.estado,
          empresas_registradas: conteoEmpresas.get(String(usuario._id)) ?? 0,
        };
      }).sort((a, b) => b.empresas_registradas - a.empresas_registradas);
    }

    const consultorInfoPorId = new Map(consultores.map((consultor) => [consultor.usuario_id, consultor]));

    const empresasControl = empresasControlBase.map((empresa) => {
      const consultorAsignado = empresa.consultor_asignado_usuario_id
        ? consultorInfoPorId.get(empresa.consultor_asignado_usuario_id)
        : null;

      return {
        ...empresa,
        consultor_asignado: consultorAsignado
          ? {
              usuario_id: consultorAsignado.usuario_id,
              nombre: `${consultorAsignado.nombres} ${consultorAsignado.apellidos}`.trim(),
              correo: consultorAsignado.correo,
              estado: consultorAsignado.estado,
            }
          : null,
      };
    });

    const informesEmpresas = empresasControl
      .filter((empresa) => typeof empresa.puntaje_global === 'number')
      .sort((a, b) => (b.puntaje_global ?? 0) - (a.puntaje_global ?? 0));

    const puntajes = informesEmpresas
      .map((empresa) => empresa.puntaje_global)
      .filter((puntaje): puntaje is number => typeof puntaje === 'number');

    const promedioGlobal = puntajes.length
      ? Math.round(puntajes.reduce((acum, puntaje) => acum + puntaje, 0) / puntajes.length)
      : 0;

    const resumen = {
      total_empresas: empresasControl.length,
      empresas_con_informe: informesEmpresas.length,
      empresas_sin_informe: empresasControl.filter((empresa) => empresa.estado === 'sin_encuesta').length,
      empresas_requiere_seguimiento: empresasControl.filter((empresa) => empresa.estado === 'requiere_seguimiento').length,
      total_consultores: consultores.length,
      consultores_activos: consultores.filter((consultor) => consultor.estado).length,
      promedio_global: promedioGlobal,
    };

    res.json({
      resumen,
      empresas: empresasControl,
      informes: informesEmpresas,
      consultores,
    });
  } catch (error) {
    console.error('Error obteniendo panel de universidad:', error);
    res.status(500).json({ error: 'Error interno obteniendo el panel de universidad.' });
  }
};

export const actualizarEstadoConsultorUniversidad = async (req: SolicitudAutenticada, res: Response): Promise<void> => {
  try {
    if (req.usuario?.rol !== 'universidad') {
      res.status(403).json({ error: 'Acceso restringido al rol universidad.' });
      return;
    }

    const usuarioId = String(req.params.usuarioId ?? '');
    const { estado } = req.body as { estado?: boolean };

    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      res.status(400).json({ error: 'Identificador de consultor inválido.' });
      return;
    }

    if (typeof estado !== 'boolean') {
      res.status(400).json({ error: 'Debes enviar el campo estado como booleano.' });
      return;
    }

    const rolSemillero = await Rol.findOne({ nombre: 'semillero' }).lean();
    if (!rolSemillero?._id) {
      res.status(404).json({ error: 'No se encontró el rol de consultor.' });
      return;
    }

    const consultorActualizado = await Usuario.findOneAndUpdate(
      { _id: usuarioId, id_rol: rolSemillero._id },
      { estado },
      { new: true }
    ).lean();

    if (!consultorActualizado) {
      res.status(404).json({ error: 'Consultor no encontrado.' });
      return;
    }

    res.json({
      mensaje: estado ? 'Consultor activado correctamente.' : 'Consultor desactivado correctamente.',
      consultor: {
        usuario_id: String(consultorActualizado._id),
        estado: consultorActualizado.estado,
      },
    });
  } catch (error) {
    console.error('Error actualizando estado de consultor:', error);
    res.status(500).json({ error: 'Error interno actualizando el estado del consultor.' });
  }
};

export const asignarConsultorEmpresaUniversidad = async (req: SolicitudAutenticada, res: Response): Promise<void> => {
  try {
    if (req.usuario?.rol !== 'universidad') {
      res.status(403).json({ error: 'Acceso restringido al rol universidad.' });
      return;
    }

    const empresaId = String(req.params.empresaId ?? '');
    const { consultor_usuario_id } = req.body as { consultor_usuario_id?: string };

    if (!mongoose.Types.ObjectId.isValid(empresaId)) {
      res.status(400).json({ error: 'Identificador de empresa inválido.' });
      return;
    }

    if (!consultor_usuario_id || !mongoose.Types.ObjectId.isValid(consultor_usuario_id)) {
      res.status(400).json({ error: 'Debes enviar un consultor_usuario_id válido.' });
      return;
    }

    const rolSemillero = await Rol.findOne({ nombre: 'semillero' }).lean();
    if (!rolSemillero?._id) {
      res.status(404).json({ error: 'No se encontró el rol de consultor.' });
      return;
    }

    const consultor = await Usuario.findOne({
      _id: consultor_usuario_id,
      id_rol: rolSemillero._id,
      estado: true,
    }).lean();

    if (!consultor) {
      res.status(404).json({ error: 'El consultor no existe o está inactivo.' });
      return;
    }

    const empresaActualizada = await Empresa.findByIdAndUpdate(
      empresaId,
      { id_consultor_asignado: consultor_usuario_id },
      { new: true }
    ).lean();

    if (!empresaActualizada) {
      res.status(404).json({ error: 'Empresa no encontrada.' });
      return;
    }

    res.json({
      mensaje: 'Consultor asignado correctamente a la empresa.',
      empresa: {
        empresa_id: String(empresaActualizada._id),
        consultor_asignado_usuario_id: consultor_usuario_id,
      },
    });
  } catch (error) {
    console.error('Error asignando consultor a empresa:', error);
    res.status(500).json({ error: 'Error interno asignando consultor a la empresa.' });
  }
};
