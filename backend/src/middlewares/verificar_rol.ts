import { Response, NextFunction } from 'express';
import { SolicitudAutenticada } from './verificar_token';

export const verificarRol = (rolesPermitidos: string[]) => {
  return (req: SolicitudAutenticada, res: Response, next: NextFunction): void => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      res.status(403).json({ mensaje: 'Acceso denegado, no tiene los permisos requeridos' });
      return;
    }
    next();
  };
};
