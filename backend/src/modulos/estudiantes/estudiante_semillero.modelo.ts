import { Schema, model, Document, Types } from 'mongoose';

export interface IEstudianteSemillero extends Document {
  id_usuario: Types.ObjectId;
  identificacion: string;
  nombres: string;
  apellidos: string;
  programa_academico: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

const estudianteSchema = new Schema<IEstudianteSemillero>(
  {
    id_usuario: { 
      type: Schema.Types.ObjectId, 
      ref: 'Usuario', 
      required: true, 
      unique: true 
    },
    identificacion: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    nombres: { 
      type: String, 
      required: true, 
      trim: true 
    },
    apellidos: { 
      type: String, 
      required: true, 
      trim: true 
    },
    programa_academico: { 
      type: String, 
      required: true, 
      trim: true 
    }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'estudiantes_semillero'
  }
);

export const EstudianteSemillero = model<IEstudianteSemillero>('EstudianteSemillero', estudianteSchema);
