import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const rateLimiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDev ? 100 : 5, // En dev: 100 intentos. En producción: 5
  message: { mensaje: 'Demasiados intentos de inicio de sesión desde esta IP. Inténtelo de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

