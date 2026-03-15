import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, ChevronRight, Landmark, LogIn, Loader2, Sparkles, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState, type ReactNode } from 'react';
import { AxiosError } from 'axios';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';

const loginSchema = z.object({
  correo: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(6, 'Debe tener al menos 6 caracteres'),
});

const registroEmpresaSchema = z.object({
  nit: z.string().min(1, 'El NIT es obligatorio'),
  razon_social: z.string().min(1, 'La razón social es obligatoria'),
  sector: z.string().min(1, 'El sector es obligatorio'),
  tamano: z.enum(['Micro', 'Pequeña', 'Mediana', 'Grande']),
  ciudad: z.string().min(1, 'La ciudad es obligatoria'),
  ano_constitucion: z.string().optional().refine((value) => !value || /^\d{4}$/.test(value), 'El año debe tener 4 dígitos'),
  parque_tecnologico: z.string().optional(),
  representante: z.string().min(1, 'El representante es obligatorio'),
  cargo_entrevistado: z.string().optional(),
  telefono: z.string().min(7, 'El teléfono debe tener al menos 7 dígitos'),
  correo: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(6, 'Debe tener al menos 6 caracteres'),
});

const registroSemilleroSchema = z.object({
  identificacion: z.string().min(1, 'La identificación es obligatoria'),
  nombres: z.string().min(1, 'Los nombres son obligatorios'),
  apellidos: z.string().min(1, 'Los apellidos son obligatorios'),
  programa_academico: z.string().min(1, 'El programa académico es obligatorio'),
  correo: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(6, 'Debe tener al menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegistroEmpresaForm = z.infer<typeof registroEmpresaSchema>;
type RegistroSemilleroForm = z.infer<typeof registroSemilleroSchema>;

type RolAcceso = 'empresa' | 'semillero' | 'universidad';
type ModoPantalla = 'login' | 'registro';
type TipoRegistro = 'empresa' | 'semillero';
type PasoRegistroEmpresa = 1 | 2;

const NOMBRE_UNIVERSIDAD_COLABORACION = 'Universidad colaborativa/parques científicos y tecnológicos';

interface LoginErrorResponse {
  error?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const loginApp = useAuthStore((state) => state.login);

  const [modoPantalla, setModoPantalla] = useState<ModoPantalla>('login');
  const [rolAcceso, setRolAcceso] = useState<RolAcceso>('empresa');
  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>('empresa');
  const [pasoRegistroEmpresa, setPasoRegistroEmpresa] = useState<PasoRegistroEmpresa>(1);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingRegistro, setLoadingRegistro] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerEmpresa,
    handleSubmit: handleSubmitEmpresa,
    formState: { errors: empresaErrors },
    trigger: triggerEmpresa,
    reset: resetEmpresa,
  } = useForm<RegistroEmpresaForm>({
    resolver: zodResolver(registroEmpresaSchema),
    defaultValues: {
      tamano: 'Micro',
    },
  });

  const {
    register: registerSemillero,
    handleSubmit: handleSubmitSemillero,
    formState: { errors: semilleroErrors },
    reset: resetSemillero,
  } = useForm<RegistroSemilleroForm>({
    resolver: zodResolver(registroSemilleroSchema),
  });

  const rolAccesoLabel = useMemo<Record<RolAcceso, string>>(
    () => ({
      empresa: 'Empresa',
      semillero: 'Consultor',
      universidad: NOMBRE_UNIVERSIDAD_COLABORACION,
    }),
    []
  );

  const opcionesAcceso: Array<{ rol: RolAcceso; descripcion: string; icono: ReactNode }> = [
    { rol: 'empresa', descripcion: 'Gestión y evaluación empresarial', icono: <BriefcaseBusiness size={16} /> },
    { rol: 'semillero', descripcion: 'Consultoría y acompañamiento', icono: <Users size={16} /> },
    { rol: 'universidad', descripcion: 'Gestión de investigación, innovación y parques tecnológicos', icono: <Landmark size={16} /> },
  ];

  const irPasoEmpresaDos = async () => {
    const valido = await triggerEmpresa(['nit', 'razon_social', 'sector', 'tamano', 'ciudad']);
    if (valido) {
      setPasoRegistroEmpresa(2);
    }
  };

  const limpiarMensajes = () => {
    setServerError(null);
    setServerMessage(null);
  };

  const onSubmitLogin = async (data: LoginForm) => {
    setLoadingLogin(true);
    limpiarMensajes();

    try {
      const resp = await api.post('/auth/login', data);
      const { tokens, usuario, empresa } = resp.data;

      if (usuario.rol !== rolAcceso) {
        setServerError(`Esta cuenta pertenece al rol ${usuario.rol}. Selecciona el tipo de ingreso correcto.`);
        return;
      }

      const userData = {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        empresaId: empresa?.id,
      };

      loginApp(userData, tokens.accessToken);
      navigate('/dashboard');
    } catch (error: unknown) {
      const axiosError = error as AxiosError<LoginErrorResponse>;
      setServerError(axiosError.response?.data?.error || 'No se pudo conectar al servidor. Inténtalo más tarde.');
    } finally {
      setLoadingLogin(false);
    }
  };

  const onSubmitRegistroEmpresa = async (data: RegistroEmpresaForm) => {
    setLoadingRegistro(true);
    limpiarMensajes();

    try {
      await api.post('/auth/registro-empresa', {
        ...data,
        ano_constitucion: data.ano_constitucion ? Number(data.ano_constitucion) : undefined,
      });

      setServerMessage('Registro de empresa exitoso. Ahora puedes iniciar sesión.');
      setModoPantalla('login');
      setRolAcceso('empresa');
      resetEmpresa();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<LoginErrorResponse>;
      setServerError(axiosError.response?.data?.error || 'No se pudo completar el registro de empresa.');
    } finally {
      setLoadingRegistro(false);
    }
  };

  const onSubmitRegistroSemillero = async (data: RegistroSemilleroForm) => {
    setLoadingRegistro(true);
    limpiarMensajes();

    try {
      await api.post('/auth/registro-semillero', data);
      setServerMessage('Registro de consultor exitoso. Ahora puedes iniciar sesión.');
      setModoPantalla('login');
      setRolAcceso('semillero');
      resetSemillero();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<LoginErrorResponse>;
      setServerError(axiosError.response?.data?.error || 'No se pudo completar el registro de consultor.');
    } finally {
      setLoadingRegistro(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[#F5F7FA] overflow-hidden">
      <div className="absolute inset-0 bg-[#00ACC9]"></div>

      <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl rounded-3xl overflow-hidden border border-[#E5E7EB] bg-[#FFFFFF]">
          <div className="grid md:grid-cols-5">
            <section className="md:col-span-2 relative bg-[#00ACC9] text-[#FFFFFF] p-7 md:p-10">
              <div className="absolute -top-20 -left-20 h-52 w-52 rounded-full bg-[#3FAE49]"></div>
              <div className="absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-[#3FAE49]"></div>

              <div className="relative space-y-6">
                <div className="inline-flex items-center gap-3 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold tracking-wide bg-[#FFFFFF] text-[#00ACC9]">
                  <Building2 size={18} />
                  Universidad Cooperativa de Colombia
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#FFFFFF] font-semibold">Plataforma SIEDSS</p>
                  <h1 className="mt-3 text-2xl md:text-3xl font-extrabold leading-tight">
                    Integración de IA Generativa en el Diagnóstico y Planificación Estratégica de la Transformación Digital para PYMES
                  </h1>
                </div>

                <p className="text-sm md:text-base text-[#FFFFFF]">
                  Selecciona tu tipo de acceso y gestiona el diagnóstico digital con enfoque en evidencia y mejora estratégica.
                </p>

                <div className="hidden md:flex items-center gap-2 text-sm font-semibold text-[#FFFFFF]">
                  <ChevronRight size={16} />
                  Diagnostica, prioriza y transforma.
                </div>
              </div>
            </section>

            <section className="md:col-span-3 p-7 md:p-10 bg-[#FFFFFF]">
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 rounded-xl bg-[#F5F7FA] border border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => {
                      setModoPantalla('login');
                      limpiarMensajes();
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      modoPantalla === 'login' ? 'bg-[#00ACC9] text-[#FFFFFF]' : 'text-[#333333]'
                    }`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoPantalla('registro');
                      limpiarMensajes();
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      modoPantalla === 'registro' ? 'bg-[#00ACC9] text-[#FFFFFF]' : 'text-[#333333]'
                    }`}
                  >
                    Registrarse
                  </button>
                </div>
              </div>

              {modoPantalla === 'login' && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-extrabold text-[#333333]">Iniciar sesión</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">Elige el tipo de cuenta con el que deseas ingresar.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    {opcionesAcceso.map((opcion) => (
                      <button
                        key={opcion.rol}
                        type="button"
                        onClick={() => {
                          setRolAcceso(opcion.rol);
                          limpiarMensajes();
                        }}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          rolAcceso === opcion.rol
                            ? 'bg-[#00ACC9] text-[#FFFFFF] border-[#00ACC9]'
                            : 'bg-[#FFFFFF] text-[#333333] border-[#E5E7EB] hover:bg-[#F5F7FA]'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          {opcion.icono}
                          {rolAccesoLabel[opcion.rol]}
                        </div>
                        <p className={`text-xs mt-1 ${rolAcceso === opcion.rol ? 'text-[#FFFFFF]' : 'text-[#6B7280]'}`}>
                          {opcion.descripcion}
                        </p>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSubmitLogin(onSubmitLogin)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#333333] mb-1">Correo electrónico</label>
                      <input
                        type="email"
                        {...registerLogin('correo')}
                        className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg bg-[#FFFFFF] focus:ring-2 focus:ring-[#00ACC9] focus:border-[#00ACC9] outline-none text-[#333333]"
                        placeholder="tu@correo.com"
                      />
                      {loginErrors.correo && <p className="text-sm text-[#00ACC9] mt-1">{loginErrors.correo.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#333333] mb-1">Contraseña</label>
                      <input
                        type="password"
                        {...registerLogin('password')}
                        className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg bg-[#FFFFFF] focus:ring-2 focus:ring-[#00ACC9] focus:border-[#00ACC9] outline-none text-[#333333]"
                        placeholder="••••••••"
                      />
                      {loginErrors.password && <p className="text-sm text-[#00ACC9] mt-1">{loginErrors.password.message}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={loadingLogin}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#00ACC9] hover:bg-[#3FAE49] text-[#FFFFFF] font-semibold rounded-lg transition-colors disabled:opacity-70"
                    >
                      {loadingLogin ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                      {loadingLogin ? 'Validando...' : `Ingresar como ${rolAccesoLabel[rolAcceso]}`}
                    </button>
                  </form>
                </>
              )}

              {modoPantalla === 'registro' && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-extrabold text-[#333333]">Registro de cuenta</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">Solo pueden registrarse Empresas y Consultores. El usuario de Universidad se crea de forma administrada y solo inicia sesión.</p>
                  </div>

                  <div className="mb-5 p-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FA] flex items-center gap-2 text-sm text-[#333333]">
                    <Sparkles size={16} className="text-[#00ACC9]" />
                    Flujo guiado: completa cada bloque para un registro más rápido y claro.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                    {(['empresa', 'semillero'] as TipoRegistro[]).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => {
                          setTipoRegistro(tipo);
                          setPasoRegistroEmpresa(1);
                          limpiarMensajes();
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                          tipoRegistro === tipo
                            ? 'bg-[#00ACC9] text-[#FFFFFF] border-[#00ACC9]'
                            : 'bg-[#FFFFFF] text-[#333333] border-[#E5E7EB] hover:bg-[#F5F7FA]'
                        }`}
                      >
                        {tipo === 'empresa' ? 'Registrar Empresa' : 'Registrar Consultor'}
                      </button>
                    ))}
                  </div>

                  {tipoRegistro === 'empresa' && (
                    <form onSubmit={handleSubmitEmpresa(onSubmitRegistroEmpresa)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 mb-1 flex items-center gap-2 text-xs font-semibold">
                        <span className={`h-2.5 w-2.5 rounded-full ${pasoRegistroEmpresa === 1 ? 'bg-[#00ACC9]' : 'bg-[#E5E7EB]'}`}></span>
                        <span className={pasoRegistroEmpresa === 1 ? 'text-[#333333]' : 'text-[#6B7280]'}>Paso 1: Datos de la empresa</span>
                        <span className={`h-2.5 w-2.5 rounded-full ml-2 ${pasoRegistroEmpresa === 2 ? 'bg-[#00ACC9]' : 'bg-[#E5E7EB]'}`}></span>
                        <span className={pasoRegistroEmpresa === 2 ? 'text-[#333333]' : 'text-[#6B7280]'}>Paso 2: Contacto y acceso</span>
                      </div>

                      {pasoRegistroEmpresa === 1 && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">NIT</label>
                            <input {...registerEmpresa('nit')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                            {empresaErrors.nit && <p className="text-sm text-[#00ACC9] mt-1">{empresaErrors.nit.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Razón social</label>
                            <input {...registerEmpresa('razon_social')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                            {empresaErrors.razon_social && <p className="text-sm text-[#00ACC9] mt-1">{empresaErrors.razon_social.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Sector</label>
                            <input {...registerEmpresa('sector')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                            {empresaErrors.sector && <p className="text-sm text-[#00ACC9] mt-1">{empresaErrors.sector.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Tamaño</label>
                            <select {...registerEmpresa('tamano')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg bg-[#FFFFFF]">
                              <option value="Micro">Micro</option>
                              <option value="Pequeña">Pequeña</option>
                              <option value="Mediana">Mediana</option>
                              <option value="Grande">Grande</option>
                            </select>
                            {empresaErrors.tamano && <p className="text-sm text-[#00ACC9] mt-1">{empresaErrors.tamano.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Ciudad</label>
                            <input {...registerEmpresa('ciudad')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                            {empresaErrors.ciudad && <p className="text-sm text-[#00ACC9] mt-1">{empresaErrors.ciudad.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Año de constitución (opcional)</label>
                            <input
                              type="number"
                              min={1900}
                              max={new Date().getFullYear()}
                              inputMode="numeric"
                              placeholder="Ej: 2018"
                              title="Ingresa un año de 4 dígitos, por ejemplo 2018"
                              {...registerEmpresa('ano_constitucion')}
                              className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg"
                            />
                            <p className="text-xs text-[#6B7280] mt-1">Formato: año con 4 dígitos (ejemplo: 2018).</p>
                            {empresaErrors.ano_constitucion && <p className="text-sm text-[#00ACC9] mt-1">{empresaErrors.ano_constitucion.message}</p>}
                          </div>
                          <div className="md:col-span-2">
                            <button
                              type="button"
                              onClick={irPasoEmpresaDos}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#00ACC9] hover:bg-[#3FAE49] text-[#FFFFFF] font-semibold rounded-lg transition-colors"
                            >
                              Continuar a contacto <ArrowRight size={16} />
                            </button>
                          </div>
                        </>
                      )}

                      {pasoRegistroEmpresa === 2 && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Representante</label>
                            <input {...registerEmpresa('representante')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                            {empresaErrors.representante && <p className="text-sm text-[#00ACC9] mt-1">{empresaErrors.representante.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Cargo entrevistado (opcional)</label>
                            <input {...registerEmpresa('cargo_entrevistado')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Teléfono</label>
                            <input {...registerEmpresa('telefono')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                            {empresaErrors.telefono && <p className="text-sm text-[#00ACC9] mt-1">{empresaErrors.telefono.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Parque tecnológico (opcional)</label>
                            <input {...registerEmpresa('parque_tecnologico')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Correo electrónico</label>
                            <input {...registerEmpresa('correo')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                            {empresaErrors.correo && <p className="text-sm text-[#00ACC9] mt-1">{empresaErrors.correo.message}</p>}
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-[#333333] mb-1">Contraseña</label>
                            <input type="password" {...registerEmpresa('password')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                            {empresaErrors.password && <p className="text-sm text-[#00ACC9] mt-1">{empresaErrors.password.message}</p>}
                          </div>
                          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setPasoRegistroEmpresa(1)}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F5F7FA] border border-[#E5E7EB] text-[#333333] font-semibold rounded-lg transition-colors"
                            >
                              <ArrowLeft size={16} /> Volver
                            </button>
                            <button
                              type="submit"
                              disabled={loadingRegistro}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#3FAE49] hover:bg-[#00ACC9] text-[#FFFFFF] font-semibold rounded-lg transition-colors disabled:opacity-70"
                            >
                              {loadingRegistro ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                              {loadingRegistro ? 'Registrando...' : 'Registrar Empresa'}
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  )}

                  {tipoRegistro === 'semillero' && (
                    <form onSubmit={handleSubmitSemillero(onSubmitRegistroSemillero)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#333333] mb-1">Identificación</label>
                        <input {...registerSemillero('identificacion')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                        {semilleroErrors.identificacion && <p className="text-sm text-[#00ACC9] mt-1">{semilleroErrors.identificacion.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#333333] mb-1">Programa académico</label>
                        <input {...registerSemillero('programa_academico')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                        {semilleroErrors.programa_academico && <p className="text-sm text-[#00ACC9] mt-1">{semilleroErrors.programa_academico.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#333333] mb-1">Nombres</label>
                        <input {...registerSemillero('nombres')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                        {semilleroErrors.nombres && <p className="text-sm text-[#00ACC9] mt-1">{semilleroErrors.nombres.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#333333] mb-1">Apellidos</label>
                        <input {...registerSemillero('apellidos')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                        {semilleroErrors.apellidos && <p className="text-sm text-[#00ACC9] mt-1">{semilleroErrors.apellidos.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#333333] mb-1">Correo electrónico</label>
                        <input {...registerSemillero('correo')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                        {semilleroErrors.correo && <p className="text-sm text-[#00ACC9] mt-1">{semilleroErrors.correo.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#333333] mb-1">Contraseña</label>
                        <input type="password" {...registerSemillero('password')} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg" />
                        {semilleroErrors.password && <p className="text-sm text-[#00ACC9] mt-1">{semilleroErrors.password.message}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <button
                          type="submit"
                          disabled={loadingRegistro}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#3FAE49] hover:bg-[#00ACC9] text-[#FFFFFF] font-semibold rounded-lg transition-colors disabled:opacity-70"
                        >
                          {loadingRegistro ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                          {loadingRegistro ? 'Registrando...' : 'Registrar Consultor'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {serverError && (
                <div className="mt-4 p-3 bg-[#F5F7FA] border border-[#E5E7EB] text-[#333333] text-sm rounded-lg">
                  {serverError}
                </div>
              )}

              {serverMessage && (
                <div className="mt-4 p-3 bg-[#F5F7FA] border border-[#E5E7EB] text-[#333333] text-sm rounded-lg">
                  {serverMessage}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
