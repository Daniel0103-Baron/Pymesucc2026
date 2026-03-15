import { Request, Response, NextFunction } from 'express';
import { verificarAccessToken } from '../utilidades/jwt';

export interface SolicitudAutenticada extends Request {
  usuario?: any;
}

export const verificarToken = (req: SolicitudAutenticada, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ mensaje: 'No autorizado, token requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodificado = verificarAccessToken(token);
    req.usuario = decodificado;
    next();
  } catch (error) {
    res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};
