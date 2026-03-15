import { Schema, model, Document, Types } from 'mongoose';

export interface IOpcionPregunta extends Document {
  id_pregunta: Types.ObjectId;
  texto_opcion: string;
  valor_numerico?: number;
  orden: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

const opcionPreguntaSchema = new Schema<IOpcionPregunta>(
  {
    id_pregunta: { 
      type: Schema.Types.ObjectId, 
      ref: 'PreguntaEncuesta', 
      required: true 
    },
    texto_opcion: { 
      type: String, 
      required: true, 
      trim: true 
    },
    valor_numerico: { 
      type: Number 
    },
    orden: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'opciones_pregunta'
  }
);

opcionPreguntaSchema.index({ id_pregunta: 1 });

export const OpcionPregunta = model<IOpcionPregunta>('OpcionPregunta', opcionPreguntaSchema);
