import { Schema, model, Document, Types } from 'mongoose';

export interface IEmpresa extends Document {
  id_usuario: Types.ObjectId;
  id_usuario_registro?: Types.ObjectId;
  id_consultor_asignado?: Types.ObjectId;
  origen_registro: 'empresa' | 'consultor' | 'universidad';
  nit: string;
  razon_social: string;
  sector: string;
  tamano: 'Micro' | 'Pequeña' | 'Mediana' | 'Grande';
  ciudad: string;
  ano_constitucion?: number;
  parque_tecnologico?: string;
  representante: string;
  cargo_entrevistado?: string;
  telefono?: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

const empresaSchema = new Schema<IEmpresa>(
  {
    id_usuario: { 
      type: Schema.Types.ObjectId, 
      ref: 'Usuario', 
      required: true, 
      unique: true 
    },
    id_usuario_registro: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario'
    },
    id_consultor_asignado: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario'
    },
    origen_registro: {
      type: String,
      enum: ['empresa', 'consultor', 'universidad'],
      default: 'empresa',
      required: true
    },
    nit: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    razon_social: { 
      type: String, 
      required: true, 
      trim: true 
    },
    sector: { 
      type: String, 
      required: true, 
      trim: true 
    },
    tamano: { 
      type: String, 
      required: true,
      enum: ['Micro', 'Pequeña', 'Mediana', 'Grande']
    },
    ciudad: { 
      type: String, 
      required: true, 
      trim: true 
    },
    ano_constitucion: { 
      type: Number 
    },
    parque_tecnologico: { 
      type: String, 
      trim: true 
    },
    representante: { 
      type: String, 
      required: true, 
      trim: true 
    },
    cargo_entrevistado: { 
      type: String, 
      trim: true 
    },
    telefono: { 
      type: String, 
      trim: true 
    }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'empresas'
  }
);

export const Empresa = model<IEmpresa>('Empresa', empresaSchema);
