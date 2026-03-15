import { Router } from 'express';
import { loginUsuario, registrarEmpresa, registrarEmpresaComoConsultor, registrarSemillero } from './autenticacion.controlador';
import { validarEsquema } from '../../middlewares/validador';
import { esquemaLogin, esquemaRegistroEmpresa, esquemaRegistroSemillero } from './autenticacion.esquemas';
import { rateLimiterLogin } from '../../middlewares/rate_limit';
import { verificarToken } from '../../middlewares/verificar_token';
import { verificarRol } from '../../middlewares/verificar_rol';

const router = Router();

router.post('/login', rateLimiterLogin, validarEsquema(esquemaLogin), loginUsuario);
router.post('/registro-empresa', validarEsquema(esquemaRegistroEmpresa), registrarEmpresa);
router.post('/registro-empresa-consultor', verificarToken, verificarRol(['semillero', 'universidad']), validarEsquema(esquemaRegistroEmpresa), registrarEmpresaComoConsultor);
router.post('/registro-semillero', validarEsquema(esquemaRegistroSemillero), registrarSemillero);

export default router;
