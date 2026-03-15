import { Response } from 'express';
import mongoose from 'mongoose';
import { Encuesta } from '../encuestas/encuesta.modelo';
import { RespuestaEncuesta } from './respuesta_encuesta.modelo';
import { ResultadoMadurez } from '../resultados/resultado_madurez.modelo';
import { ResultadoPorDimension } from '../resultados/resultado_por_dimension.modelo';
import { Empresa } from '../empresas/empresa.modelo';
import { PreguntaEncuesta } from '../encuestas/pregunta_encuesta.modelo';
import { SeccionEncuesta } from '../encuestas/seccion_encuesta.modelo';
import { BitacoraAuditoria } from '../auditoria/bitacora_auditoria.modelo';
import { calcularPuntajeDimension, calcularPorcentaje, clasificarNivel } from '../resultados/madurez.servicio';
import { SolicitudAutenticada } from '../../middlewares/verificar_token';

export const procesarResultadosEncuesta = async (req: SolicitudAutenticada, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const usuarioId = req.usuario.id;
    const rolUsuario = req.usuario.rol as string | undefined;
    const { respuestas, empresa_id } = req.body;
    const esAplicacionAsistida = rolUsuario === 'semillero' || rolUsuario === 'universidad';

    let empresa;
    if (rolUsuario === 'empresa') {
      empresa = await Empresa.findOne({ id_usuario: usuarioId }).session(session);
      if (!empresa) {
        await session.abortTransaction();
        res.status(404).json({ error: 'No se encontró una empresa asociada al usuario actual' });
        return;
      }
    } else if (rolUsuario === 'semillero' || rolUsuario === 'universidad') {
      if (!empresa_id || typeof empresa_id !== 'string' || !mongoose.Types.ObjectId.isValid(empresa_id)) {
        await session.abortTransaction();
        res.status(400).json({ error: 'Para aplicar la encuesta como consultor debes enviar un empresa_id válido.' });
        return;
      }

      empresa = await Empresa.findById(empresa_id).session(session);
      if (!empresa) {
        await session.abortTransaction();
        res.status(404).json({ error: 'No se encontró la empresa objetivo para esta evaluación.' });
        return;
      }

      const origenRegistro = empresa.origen_registro ?? 'empresa';
      if (origenRegistro === 'empresa') {
        const resultadoPrevio = await ResultadoMadurez.findOne({ id_empresa: empresa._id }).session(session);
        if (resultadoPrevio) {
        await session.abortTransaction();
        res.status(403).json({ error: 'Esta empresa auto-registrada ya tiene evaluación. Solo puedes aplicar su primera encuesta asistida.' });
        return;
        }
      }
    } else {
      await session.abortTransaction();
      res.status(403).json({ error: 'Rol sin permisos para registrar resultados de encuesta.' });
      return;
    }

    const nuevaEncuesta = new Encuesta({
      id_empresa: empresa._id,
      id_usuario_aplicador: usuarioId,
      estado: 'completada',
      fecha_fin: new Date()
    });
    await nuevaEncuesta.save({ session });

    const respuestasProcesadas = [];
    const agrupadoPorDimension = new Map<string, { suma_valores: number, conteo: number }>();

    for (const resp of respuestas) {
      const respDoc = new RespuestaEncuesta({
        id_encuesta: nuevaEncuesta._id,
        ...resp
      });
      await respDoc.save({ session });
      respuestasProcesadas.push(respDoc);

      const pregunta = await PreguntaEncuesta.findById(resp.id_pregunta).session(session);
      if (pregunta && typeof resp.valor_numerico === 'number') {
        const id_seccion = pregunta.id_seccion.toString();
        if (!agrupadoPorDimension.has(id_seccion)) {
          agrupadoPorDimension.set(id_seccion, { suma_valores: 0, conteo: 0 });
        }
        const dimData = agrupadoPorDimension.get(id_seccion)!;
        dimData.suma_valores += resp.valor_numerico;
        dimData.conteo += 1;
      }
    }

    let sumaPuntajesGlobales = 0;
    
    const resultadoMadurez = new ResultadoMadurez({
      id_encuesta: nuevaEncuesta._id,
      puntaje_global: 0,
      porcentaje_global: 0,
      nivel_global: 'por_calcular',
      id_empresa: empresa._id,
      id_usuario_aplicador: usuarioId
    });
    await resultadoMadurez.save({ session });

    let numeroDimensionesPuntuables = 0;

    for (const [id_seccion, data] of agrupadoPorDimension.entries()) {
      const seccion = await SeccionEncuesta.findById(id_seccion).session(session);
      if(seccion && seccion.nombre !== 'datos_generales') {
          const puntajeDim = calcularPuntajeDimension(data.suma_valores, data.conteo);
          const porcDim = calcularPorcentaje(puntajeDim);
          const nivelDim = clasificarNivel(porcDim);

          sumaPuntajesGlobales += puntajeDim;
          numeroDimensionesPuntuables += 1;

          const resDim = new ResultadoPorDimension({
            id_resultado: resultadoMadurez._id,
            id_seccion: id_seccion,
            puntaje: puntajeDim,
            porcentaje: porcDim,
            nivel: nivelDim
          });
          await resDim.save({ session });
      }
    }

    const puntajeGlobal = numeroDimensionesPuntuables > 0 ? (sumaPuntajesGlobales / numeroDimensionesPuntuables) : 0;
    const porcentajeGlobal = calcularPorcentaje(puntajeGlobal);
    const nivelGlobal = clasificarNivel(porcentajeGlobal);

    resultadoMadurez.puntaje_global = puntajeGlobal;
    resultadoMadurez.porcentaje_global = porcentajeGlobal;
    resultadoMadurez.nivel_global = nivelGlobal;
    await resultadoMadurez.save({ session });

    const ipCliente = req.ip || req.socket.remoteAddress;
    await BitacoraAuditoria.create([
      {
        id_usuario: usuarioId,
        accion: esAplicacionAsistida ? 'aplicar_encuesta_asistida' : 'aplicar_encuesta_empresa',
        entidad_afectada: 'encuesta',
        id_entidad: String(nuevaEncuesta._id),
        detalles: esAplicacionAsistida
          ? `Consultor ${usuarioId} aplicó encuesta a empresa ${empresa._id} (${empresa.razon_social}). Resultado ${resultadoMadurez._id}.`
          : `Empresa ${empresa._id} (${empresa.razon_social}) registró su encuesta. Resultado ${resultadoMadurez._id}.`,
        ip: ipCliente,
      },
    ], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      mensaje: 'Resultados procesados exitosamente',
      resultadoGlobal: resultadoMadurez,
      empresa: {
        id: empresa._id,
        razon_social: empresa.razon_social,
      },
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error calculando resultados de Mongoose:', error);
    res.status(500).json({ error: 'Error interno de algoritmos matemáticos' });
  }
};
