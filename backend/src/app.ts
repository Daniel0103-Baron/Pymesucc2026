import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import autenticacionRutas from './modulos/autenticacion/autenticacion.rutas';
import empresasRutas from './modulos/empresas/empresas.rutas';
import encuestasRutas from './modulos/encuestas/encuestas.rutas';
import respuestasRutas from './modulos/respuestas/respuestas.rutas';
import resultadosRutas from './modulos/resultados/resultados.rutas';

const app = express();

dotenv.config();

const origenesConfigurados = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

const regexSubdominioNetlify = /^https:\/\/[a-z0-9-]+(?:--[a-z0-9-]+)?\.netlify\.app$/i;

const esOrigenPermitido = (origen: string): boolean => {
  if (origenesConfigurados.includes(origen)) {
    return true;
  }

  // Permite dominios de preview y dominio principal de Netlify.
  return regexSubdominioNetlify.test(origen);
};

app.use(helmet());
app.use(cors({
  origin: (origen, callback) => {
    // Requests sin origin (health checks/server-to-server) se permiten.
    if (!origen) {
      callback(null, true);
      return;
    }

    if (esOrigenPermitido(origen)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'API funcionando correctamente (MongoDB Atlas + Mongoose)' });
});

app.use('/api/auth', autenticacionRutas);
app.use('/api/empresas', empresasRutas);
app.use('/api/encuestas', encuestasRutas);
app.use('/api/respuestas', respuestasRutas);
app.use('/api/resultados', resultadosRutas);

const rutaFrontendDist = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(rutaFrontendDist)) {
  app.use(express.static(rutaFrontendDist));

  // Fallback SPA: cualquier ruta no /api devuelve index.html
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(rutaFrontendDist, 'index.html'));
  });
}

export default app;
