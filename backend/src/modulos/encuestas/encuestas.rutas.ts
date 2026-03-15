import { Router } from 'express';
import { obtenerEsquemaEncuesta } from './encuestas.controlador';
import { verificarToken, SolicitudAutenticada } from '../../middlewares/verificar_token';

const router = Router();

// El frontend necesita obtener el esquema para pintarlo
router.get('/esquema', verificarToken, obtenerEsquemaEncuesta);

export default router;
