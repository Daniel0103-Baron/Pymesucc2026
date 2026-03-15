import { Schema, model, Document } from 'mongoose';

export interface IRol extends Document {
  nombre: string;
  descripcion?: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

const rolSchema = new Schema<IRol>(
  {
    nombre: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      enum: ['empresa', 'semillero', 'universidad']
    },
    descripcion: { 
      type: String, 
      trim: true 
    }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'roles' // Nombre explícito de la colección en español
  }
);

export const Rol = model<IRol>('Rol', rolSchema);
