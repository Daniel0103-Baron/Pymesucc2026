import { Schema, model, Document, Types } from 'mongoose';

export interface IUsuario extends Document {
  id_rol: Types.ObjectId;
  correo: string;
  password_hash: string;
  estado: boolean;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

const usuarioSchema = new Schema<IUsuario>(
  {
    id_rol: { 
      type: Schema.Types.ObjectId, 
      ref: 'Rol', 
      required: true 
    },
    correo: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    password_hash: { 
      type: String, 
      required: true 
    },
    estado: { 
      type: Boolean, 
      default: true 
    }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'usuarios'
  }
);

// Índice recomendado para búsqueda por correo que será muy frecuente
usuarioSchema.index({ correo: 1 });

export const Usuario = model<IUsuario>('Usuario', usuarioSchema);
