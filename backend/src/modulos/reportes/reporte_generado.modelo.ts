import { Schema, model, Document, Types } from 'mongoose';

export interface IReporteGenerado extends Document {
  id_resultado: Types.ObjectId;
  url_archivo: string;
  fecha_generacion: Date;
}

const reporteGeneradoSchema = new Schema<IReporteGenerado>(
  {
    id_resultado: { 
      type: Schema.Types.ObjectId, 
      ref: 'ResultadoMadurez', 
      required: true 
    },
    url_archivo: { 
      type: String, 
      required: true 
    },
    fecha_generacion: { 
      type: Date, 
      default: Date.now 
    }
  },
  {
    collection: 'reportes_generados'
  }
);

reporteGeneradoSchema.index({ id_resultado: 1 });

export const ReporteGenerado = model<IReporteGenerado>('ReporteGenerado', reporteGeneradoSchema);
