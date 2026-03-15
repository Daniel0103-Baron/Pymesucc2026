import { Schema, model, Document } from 'mongoose';

export interface ISeccionEncuesta extends Document {
  nombre: string;
  descripcion?: string;
  orden: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

const seccionEncuestaSchema = new Schema<ISeccionEncuesta>(
  {
    nombre: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    descripcion: { 
      type: String, 
      trim: true 
    },
    orden: { 
      type: Number, 
      required: true,
      default: 0
    }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'secciones_encuesta'
  }
);

export const SeccionEncuesta = model<ISeccionEncuesta>('SeccionEncuesta', seccionEncuestaSchema);
