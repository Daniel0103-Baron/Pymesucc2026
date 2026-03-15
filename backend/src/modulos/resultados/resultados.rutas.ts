import { Router } from 'express';
import { obtenerUltimoResultado, obtenerReporteDetallado } from './resultados.controlador';
import { verificarToken } from '../../middlewares/verificar_token';

const router = Router();

// Obtener último resultado de la empresa autenticada
router.get('/ultimo', verificarToken, obtenerUltimoResultado);
router.get('/reporte-detallado', verificarToken, obtenerReporteDetallado);

export default router;
