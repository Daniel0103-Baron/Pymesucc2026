import { Schema, model, Document, Types } from 'mongoose';

export interface IResultadoMadurez extends Document {
  id_encuesta: Types.ObjectId;
  puntaje_global: number;
  porcentaje_global: number;
  nivel_global: 'muy_bajo' | 'bajo' | 'intermedio' | 'alto' | 'avanzado' | 'por_calcular';
  fecha_calculo: Date;
  id_empresa: Types.ObjectId;
  id_usuario_aplicador: Types.ObjectId;
}

const resultadoMadurezSchema = new Schema<IResultadoMadurez>(
  {
    id_encuesta: { 
      type: Schema.Types.ObjectId, 
      ref: 'Encuesta', 
      required: true, 
      unique: true 
    },
    puntaje_global: { 
      type: Number, 
      required: true 
    },
    porcentaje_global: { 
      type: Number, 
      required: true 
    },
    nivel_global: { 
      type: String, 
      required: true,
      enum: ['muy_bajo', 'bajo', 'intermedio', 'alto', 'avanzado', 'por_calcular']
    },
    fecha_calculo: { 
      type: Date, 
      default: Date.now 
    },
    id_empresa: { 
      type: Schema.Types.ObjectId, 
      ref: 'Empresa', 
      required: true 
    },
    id_usuario_aplicador: { 
      type: Schema.Types.ObjectId, 
      ref: 'Usuario', 
      required: true 
    }
  },
  {
    collection: 'resultados_madurez'
  }
);

resultadoMadurezSchema.index({ id_empresa: 1 });

export const ResultadoMadurez = model<IResultadoMadurez>('ResultadoMadurez', resultadoMadurezSchema);
