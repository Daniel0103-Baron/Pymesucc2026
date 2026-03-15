import { Schema, model, Document, Types } from 'mongoose';

export interface IRecomendacion extends Document {
  id_seccion: Types.ObjectId;
  nivel_asociado: 'muy_bajo' | 'bajo' | 'intermedio' | 'alto' | 'avanzado';
  texto: string;
}

const recomendacionSchema = new Schema<IRecomendacion>(
  {
    id_seccion: { 
      type: Schema.Types.ObjectId, 
      ref: 'SeccionEncuesta', 
      required: true 
    },
    nivel_asociado: { 
      type: String, 
      required: true,
      enum: ['muy_bajo', 'bajo', 'intermedio', 'alto', 'avanzado']
    },
    texto: { 
      type: String, 
      required: true, 
      trim: true 
    }
  },
  {
    collection: 'recomendaciones'
  }
);

recomendacionSchema.index({ id_seccion: 1, nivel_asociado: 1 }, { unique: true });

export const Recomendacion = model<IRecomendacion>('Recomendacion', recomendacionSchema);
