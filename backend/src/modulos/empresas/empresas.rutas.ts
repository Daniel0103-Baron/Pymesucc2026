import { Router } from 'express';
import { verificarToken } from '../../middlewares/verificar_token';
import { verificarRol } from '../../middlewares/verificar_rol';
import {
	obtenerCarteraConsultor,
	obtenerHistorialEmpresaConsultor,
	obtenerPanelUniversidad,
	actualizarEstadoConsultorUniversidad,
	asignarConsultorEmpresaUniversidad,
} from './empresas.controlador';

const router = Router();

router.get('/cartera-consultor', verificarToken, verificarRol(['semillero', 'universidad']), obtenerCarteraConsultor);
router.get('/panel-universidad', verificarToken, verificarRol(['universidad']), obtenerPanelUniversidad);
router.patch('/universidad/consultores/:usuarioId/estado', verificarToken, verificarRol(['universidad']), actualizarEstadoConsultorUniversidad);
router.patch('/universidad/empresas/:empresaId/asignar-consultor', verificarToken, verificarRol(['universidad']), asignarConsultorEmpresaUniversidad);
router.get('/:empresaId/historial-resultados', verificarToken, verificarRol(['semillero', 'universidad']), obtenerHistorialEmpresaConsultor);

export default router;
