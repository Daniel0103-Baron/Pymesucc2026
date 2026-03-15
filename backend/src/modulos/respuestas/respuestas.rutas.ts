import { Router } from 'express';
import { procesarResultadosEncuesta } from './respuestas.controlador';
import { verificarToken, SolicitudAutenticada } from '../../middlewares/verificar_token';

const router = Router();

router.post('/guardar', verificarToken, procesarResultadosEncuesta);

export default router;
