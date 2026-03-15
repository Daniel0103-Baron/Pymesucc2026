import { Request, Response } from 'express';
import { SeccionEncuesta } from './seccion_encuesta.modelo';
import { PreguntaEncuesta } from './pregunta_encuesta.modelo';
import { OpcionPregunta } from './opcion_pregunta.modelo';

export const obtenerEsquemaEncuesta = async (req: Request, res: Response): Promise<void> => {
  try {
    const secciones = await SeccionEncuesta.find().sort({ orden: 1 }).lean();
    
    // Anidar preguntas y opciones  - se pasa el _id como-is (ya es ObjectId compatible en Mongoose)
    const instrumentoFinal = await Promise.all(secciones.map(async (seccion) => {
      const seccionId = seccion._id as unknown as string;
      const preguntas = await PreguntaEncuesta.find({ id_seccion: seccionId }).sort({ orden: 1 }).lean();
      
      const preguntasConOpciones = await Promise.all(preguntas.map(async (pregunta) => {
        const preguntaId = pregunta._id as unknown as string;
        const opciones = await OpcionPregunta.find({ id_pregunta: preguntaId }).sort({ orden: 1 }).lean();
        return Object.assign({}, pregunta, { opciones });
      }));

      return Object.assign({}, seccion, { preguntas: preguntasConOpciones });
    }));

    res.json(instrumentoFinal);
  } catch (error) {
    console.error('Error obteniendo la encuesta:', error);
    res.status(500).json({ error: 'Error interno obteniendo la encuesta' });
  }
};
