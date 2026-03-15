import { z } from 'zod';

export const esquemaLogin = z.object({
  body: z.object({
    correo: z.string().email('Debe ser un correo válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  })
});

export const esquemaRegistroEmpresa = z.object({
  body: z.object({
    nit: z.string().min(1, 'El NIT es obligatorio'),
    razon_social: z.string().min(1, 'La razón social es obligatoria'),
    sector: z.string().min(1, 'El sector es obligatorio'),
    tamano: z.enum(['Micro', 'Pequeña', 'Mediana', 'Grande']),
    ciudad: z.string().min(1, 'La ciudad es obligatoria'),
    ano_constitucion: z.number().int().optional(),
    parque_tecnologico: z.string().optional(),
    representante: z.string().min(1, 'El representante es obligatorio'),
    cargo_entrevistado: z.string().optional(),
    telefono: z.string().min(7, 'El teléfono es obligatorio y debe tener al menos 7 dígitos'),
    correo: z.string().email('Debe ser un correo válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  })
});

export const esquemaRegistroSemillero = z.object({
  body: z.object({
    identificacion: z.string().min(1, 'La identificación es obligatoria'),
    nombres: z.string().min(1, 'Los nombres son obligatorios'),
    apellidos: z.string().min(1, 'Los apellidos son obligatorios'),
    programa_academico: z.string().min(1, 'El programa académico es obligatorio'),
    correo: z.string().email('Debe ser un correo válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  })
});
