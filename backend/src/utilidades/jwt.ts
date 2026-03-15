import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const obtenerSecreto = (nombre: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string => {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno requerida: ${nombre}`);
  }
  return valor;
};

export const generarTokens = (usuarioId: Types.ObjectId | string, rol: string) => {
  const jwtSecret = obtenerSecreto('JWT_SECRET');
  const jwtRefreshSecret = obtenerSecreto('JWT_REFRESH_SECRET');

  const accessToken = jwt.sign(
    { id: usuarioId.toString(), rol },
    jwtSecret,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: usuarioId.toString() },
    jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const verificarAccessToken = (token: string) => {
  return jwt.verify(token, obtenerSecreto('JWT_SECRET'));
};

export const verificarRefreshToken = (token: string) => {
  return jwt.verify(token, obtenerSecreto('JWT_REFRESH_SECRET'));
};
