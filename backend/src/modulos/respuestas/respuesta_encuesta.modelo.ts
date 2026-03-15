import { Schema, model, Document, Types } from 'mongoose';

export interface IRespuestaEncuesta extends Document {
  id_encuesta: Types.ObjectId;
  id_pregunta: Types.ObjectId;
  id_opcion?: Types.ObjectId;
  texto_respuesta?: string;
  valor_numerico?: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

const respuestaEncuestaSchema = new Schema<IRespuestaEncuesta>(
  {
    id_encuesta: { 
      type: Schema.Types.ObjectId, 
      ref: 'Encuesta', 
      required: true 
    },
    id_pregunta: { 
      type: Schema.Types.ObjectId, 
      ref: 'PreguntaEncuesta', 
      required: true 
    },
    id_opcion: { 
      type: Schema.Types.ObjectId, 
      ref: 'OpcionPregunta' 
    },
    texto_respuesta: { 
      type: String, 
      trim: true 
    },
    valor_numerico: { 
      type: Number 
    }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'respuestas_encuesta'
  }
);

respuestaEncuestaSchema.index({ id_encuesta: 1 });

export const RespuestaEncuesta = model<IRespuestaEncuesta>('RespuestaEncuesta', respuestaEncuestaSchema);
