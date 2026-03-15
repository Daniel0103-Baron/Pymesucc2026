import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validarEsquema = (schema: ZodSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validación de datos fallida', detalles: (error as any).errors || error.issues });
      } else {
        res.status(500).json({ error: 'Error inesperado de validación' });
      }
    }
  };
};
