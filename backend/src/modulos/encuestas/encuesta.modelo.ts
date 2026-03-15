import { Schema, model, Document, Types } from 'mongoose';

export interface IEncuesta extends Document {
  id_empresa: Types.ObjectId;
  id_usuario_aplicador: Types.ObjectId;
  estado: 'borrador' | 'completada';
  fecha_inicio: Date;
  fecha_fin?: Date;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

const encuestaSchema = new Schema<IEncuesta>(
  {
    id_empresa: { 
      type: Schema.Types.ObjectId, 
      ref: 'Empresa', 
      required: true 
    },
    id_usuario_aplicador: { 
      type: Schema.Types.ObjectId, 
      ref: 'Usuario', 
      required: true 
    },
    estado: { 
      type: String, 
      enum: ['borrador', 'completada'], 
      default: 'borrador' 
    },
    fecha_inicio: { 
      type: Date, 
      default: Date.now 
    },
    fecha_fin: { 
      type: Date 
    }
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'encuestas'
  }
);

encuestaSchema.index({ id_empresa: 1, estado: 1 });

export const Encuesta = model<IEncuesta>('Encuesta', encuestaSchema);
