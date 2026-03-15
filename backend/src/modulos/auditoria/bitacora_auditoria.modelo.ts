import { Schema, model, Document, Types } from 'mongoose';

export interface IBitacoraAuditoria extends Document {
  id_usuario?: Types.ObjectId;
  accion: string;
  entidad_afectada: string;
  id_entidad?: string;
  detalles?: string;
  ip?: string;
  fecha: Date;
}

const bitacoraAuditoriaSchema = new Schema<IBitacoraAuditoria>(
  {
    id_usuario: { 
      type: Schema.Types.ObjectId, 
      ref: 'Usuario' 
    },
    accion: { 
      type: String, 
      required: true, 
      trim: true 
    },
    entidad_afectada: { 
      type: String, 
      required: true, 
      trim: true 
    },
    id_entidad: { 
      type: String 
    },
    detalles: { 
      type: String 
    },
    ip: { 
      type: String 
    },
    fecha: { 
      type: Date, 
      default: Date.now 
    }
  },
  {
    collection: 'bitacora_auditoria'
  }
);

export const BitacoraAuditoria = model<IBitacoraAuditoria>('BitacoraAuditoria', bitacoraAuditoriaSchema);
