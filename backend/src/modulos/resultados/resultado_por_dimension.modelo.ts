import { Schema, model, Document, Types } from 'mongoose';

export interface IResultadoPorDimension extends Document {
  id_resultado: Types.ObjectId;
  id_seccion: Types.ObjectId;
  puntaje: number;
  porcentaje: number;
  nivel: string;
}

const resultadoPorDimensionSchema = new Schema<IResultadoPorDimension>(
  {
    id_resultado: { 
      type: Schema.Types.ObjectId, 
      ref: 'ResultadoMadurez', 
      required: true 
    },
    id_seccion: { 
      type: Schema.Types.ObjectId, 
      ref: 'SeccionEncuesta', 
      required: true 
    },
    puntaje: { 
      type: Number, 
      required: true 
    },
    porcentaje: { 
      type: Number, 
      required: true 
    },
    nivel: { 
      type: String, 
      required: true 
    }
  },
  {
    collection: 'resultados_por_dimension'
  }
);

resultadoPorDimensionSchema.index({ id_resultado: 1 });

export const ResultadoPorDimension = model<IResultadoPorDimension>('ResultadoPorDimension', resultadoPorDimensionSchema);
