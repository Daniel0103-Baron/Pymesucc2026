import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import autenticacionRutas from './modulos/autenticacion/autenticacion.rutas';
import empresasRutas from './modulos/empresas/empresas.rutas';
import encuestasRutas from './modulos/encuestas/encuestas.rutas';
import respuestasRutas from './modulos/respuestas/respuestas.rutas';
import resultadosRutas from './modulos/resultados/resultados.rutas';

const app = express();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'API funcionando correctamente (MongoDB Atlas + Mongoose)' });
});

app.use('/api/auth', autenticacionRutas);
app.use('/api/empresas', empresasRutas);
app.use('/api/encuestas', encuestasRutas);
app.use('/api/respuestas', respuestasRutas);
app.use('/api/resultados', resultadosRutas);

export default app;
