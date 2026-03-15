import { Schema, model, Document, Types } from 'mongoose';

export interface IPreguntaEncuesta extends Document {
  id_seccion: Types.ObjectId;
  texto_pregunta: string;
  tipo_pregunta: 'texto' | 'numero' | 'si_no' | 'likert_1_5' | 'seleccion_unica' | 'seleccion_multiple';
  requerida: boolean;
  orden: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

const preguntaEncuestaSchema = new Schema<IPreguntaEncuesta>(
  {
    id_seccion: { 
      type: Schema.Types.ObjectId, 
      ref: 'SeccionEncuesta', 
      required: true 
    },
    texto_pregunta: { 
      type: String, 
      required: true, 
      trim: true 
    },
    tipo_pregunta: { 
      type: String, 
      required: true,
      enum: ['texto', 'numero', 'si_no', 'likert_1_5', 'seleccion_unica', 'seleccion_multiple']
    },
    requerida: { 
      type: Boolean, 
      default: true 
    },
    orden: { 
      type: Number, 
      required: true 
    }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'preguntas_encuesta'
  }
);

// Índice para poder buscar todas las preguntas de una sección de forma eficiente
preguntaEncuestaSchema.index({ id_seccion: 1, orden: 1 });

export const PreguntaEncuesta = model<IPreguntaEncuesta>('PreguntaEncuesta', preguntaEncuestaSchema);
