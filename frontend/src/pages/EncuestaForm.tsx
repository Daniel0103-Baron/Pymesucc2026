import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AxiosError } from 'axios';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';

interface Opcion {
  _id: string;
  texto_opcion: string;
  valor_numerico: number;
}

interface Pregunta {
  _id: string;
  texto_pregunta: string;
  tipo_pregunta: string;
  requerida: boolean;
  opciones: Opcion[];
}

interface Seccion {
  _id: string;
  nombre: string;
  descripcion: string;
  preguntas: Pregunta[];
}

type EncuestaFormValues = Record<string, string | number>;

interface ApiErrorResponse {
  error?: string;
}

export default function EncuestaForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [esquema, setEsquema] = useState<Seccion[]>([]);
  const [pasoActual, setPasoActual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const query = new URLSearchParams(location.search);
  const empresaIdObjetivo = query.get('empresaId') ?? '';
  const empresaNombreObjetivo = query.get('empresa') ?? '';
  const accesoConsultorSinEmpresa = (user?.rol === 'semillero' || user?.rol === 'universidad') && !empresaIdObjetivo;

  const { register, handleSubmit, formState: { errors }, trigger } = useForm<EncuestaFormValues>({
    mode: 'onChange'
  });

  useEffect(() => {
    const fetchEsquema = async () => {
      try {
        const resp = await api.get('/encuestas/esquema');
        // Filter out empty sections just in case
        setEsquema(resp.data.filter((sec: Seccion) => sec.preguntas && sec.preguntas.length > 0));
        setLoading(false);
      } catch {
        setServerError('No se pudo cargar el instrumento de la encuesta.');
        setLoading(false);
      }
    };
    fetchEsquema();
  }, []);

  useEffect(() => {
    if ((user?.rol === 'semillero' || user?.rol === 'universidad') && !empresaIdObjetivo) {
      setServerError('Para aplicar la encuesta como consultor debes abrirla desde el detalle de una empresa.');
    }
  }, [user?.rol, empresaIdObjetivo]);

  const totalPasos = esquema.length;
  const preguntasPorId = new Map(esquema.flatMap((seccion) => seccion.preguntas.map((pregunta) => [pregunta._id, pregunta])));

  const onNext = async () => {
    // Validate current step fields before proceeding
    const seccionActual = esquema[pasoActual];
    const fieldsToValidate = seccionActual.preguntas.map(p => p._id);
    const valid = await trigger(fieldsToValidate);
    
    if (valid && pasoActual < totalPasos - 1) {
      setPasoActual(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onSubmit = async (data: EncuestaFormValues) => {
    setSubmitting(true);
    setServerError(null);
    try {
      // Transform form data by question type to align with backend schema.
      const respuestasPayload = Object.keys(data).map((key) => {
        const pregunta = preguntasPorId.get(key);
        const valor = data[key];

        if (pregunta?.tipo_pregunta === 'texto') {
          return {
            id_pregunta: key,
            texto_respuesta: String(valor ?? '').trim()
          };
        }

        return {
          id_pregunta: key,
          valor_numerico: Number(valor)
        };
      });

      await api.post('/respuestas/guardar', {
        respuestas: respuestasPayload,
        empresa_id: empresaIdObjetivo || undefined,
      });
      navigate('/dashboard');
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      setServerError(axiosError.response?.data?.error || 'Error al guardar las respuestas. Reintenta.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-[#6B7280]">
        <Loader2 className="w-10 h-10 animate-spin text-[#00ACC9] mb-4" />
        <p>Cargando instrumento de evaluación...</p>
      </div>
    );
  }

  if (serverError && !esquema.length) {
    return (
      <div className="p-8 text-center text-[#333333] bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl max-w-2xl mx-auto">
        {serverError}
      </div>
    );
  }

  if (accesoConsultorSinEmpresa) {
    return (
      <div className="max-w-2xl mx-auto bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-8">
        <h3 className="text-xl font-bold text-[#333333]">Acceso no permitido para consultor</h3>
        <p className="mt-2 text-sm text-[#6B7280]">
          Para aplicar una nueva evaluación como consultor debes abrir esta pantalla desde el botón "Nueva evaluación"
          dentro del detalle de una empresa en la cartera.
        </p>
        <button
          onClick={() => navigate('/dashboard/resultados')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#00ACC9] px-4 py-2 text-sm font-semibold text-[#FFFFFF] hover:bg-[#3FAE49]"
        >
          Volver a cartera de empresas
        </button>
      </div>
    );
  }

  const seccionActual = esquema[pasoActual];
  const progreso = ((pasoActual + 1) / totalPasos) * 100;

  return (
    <div className="max-w-4xl mx-auto bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-8">
      {/* Header Progreso */}
      <div className="mb-8">
         <h2 className="text-2xl font-bold text-[#333333]">Evaluación de Madurez Digital</h2>
         <p className="text-[#6B7280] mt-1">Sección {pasoActual + 1} de {totalPasos}: {seccionActual.descripcion}</p>
         {(user?.rol === 'semillero' || user?.rol === 'universidad') && empresaNombreObjetivo && (
           <p className="mt-2 inline-flex rounded-full border border-[#BAE6FD] bg-[#E6F7FB] px-3 py-1 text-xs font-semibold text-[#0C4A6E]">
             Aplicando evaluación para: {empresaNombreObjetivo}
           </p>
         )}
         
         <div className="w-full bg-[#E5E7EB] h-2.5 rounded-full mt-4 overflow-hidden">
           <div 
             className="bg-[#00ACC9] h-2.5 rounded-full transition-all duration-500 ease-out"
             style={{ width: `${progreso}%` }}
           ></div>
         </div>
      </div>

      {serverError && (
        <div className="mb-6 p-4 bg-[#F5F7FA] border border-[#E5E7EB] text-[#333333] rounded-lg">
          {serverError}
        </div>
      )}

      {/* Formulario Dinámico */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {seccionActual.preguntas.map((pregunta, index) => (
          <div key={pregunta._id} className="p-6 rounded-xl border border-[#E5E7EB] bg-[#F5F7FA] hover:bg-[#FFFFFF] transition-all">
            <label className="block text-base font-medium text-[#333333] mb-4">
              <span className="text-[#00ACC9] mr-2 font-bold">{index + 1}.</span>
              {pregunta.texto_pregunta}
            </label>


            {pregunta.tipo_pregunta === 'numero' ? (
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Ingresa un valor"
                {...register(pregunta._id, {
                  required: pregunta.requerida ? 'Esta pregunta es obligatoria' : false,
                  valueAsNumber: true,
                  min: { value: 0, message: 'Ingresa un valor válido' }
                })}
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-sm text-[#333333] focus:border-[#00ACC9] focus:outline-none"
              />
            ) : pregunta.tipo_pregunta === 'texto' ? (
              <input
                type="text"
                placeholder="Escribe tu respuesta"
                {...register(pregunta._id, {
                  required: pregunta.requerida ? 'Esta pregunta es obligatoria' : false
                })}
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-sm text-[#333333] focus:border-[#00ACC9] focus:outline-none"
              />
            ) : (
              <div className={`grid gap-3 ${pregunta.tipo_pregunta === 'si_no' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-5'}`}>
                {pregunta.opciones.map(opcion => (
                  <label
                    key={opcion._id}
                    className="flex flex-col items-center justify-center p-4 text-center border border-[#E5E7EB] rounded-lg bg-[#FFFFFF] cursor-pointer hover:border-[#00ACC9] transition-colors [&:has(input:checked)]:bg-[#F5F7FA] [&:has(input:checked)]:border-[#00ACC9]"
                  >
                    <input
                      type="radio"
                      value={opcion.valor_numerico}
                      {...register(pregunta._id, { required: pregunta.requerida ? 'Esta pregunta es obligatoria' : false })}
                      className="w-4 h-4 mb-2 text-[#00ACC9] focus:ring-[#00ACC9] border-[#E5E7EB]"
                    />
                    <span className="text-sm font-medium text-[#333333]">{opcion.texto_opcion}</span>
                  </label>
                ))}
              </div>
            )}
            {errors[pregunta._id] && (
              <p className="text-sm text-[#00ACC9] mt-3">{errors[pregunta._id]?.message as string}</p>
            )}
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-[#E5E7EB] mt-10">
           <button 
             type="button" 
             onClick={() => {
               setPasoActual(prev => Math.max(0, prev - 1));
               window.scrollTo({ top: 0, behavior: 'smooth' });
             }}
             disabled={pasoActual === 0 || submitting}
             className="px-6 py-2.5 border border-[#E5E7EB] text-[#6B7280] font-medium rounded-lg hover:bg-[#F5F7FA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
           >
             Anterior
           </button>
           
           {pasoActual < totalPasos - 1 ? (
             <button 
               type="button"
               onClick={onNext}
               className="px-8 py-2.5 bg-[#00ACC9] text-[#FFFFFF] font-medium rounded-lg hover:bg-[#3FAE49] transition-colors"
             >
               Siguiente
             </button>
           ) : (
             <button 
               type="submit"
               disabled={submitting}
               className="px-8 py-2.5 bg-[#3FAE49] text-[#FFFFFF] font-medium rounded-lg hover:bg-[#00ACC9] transition-colors flex items-center gap-2 disabled:opacity-70"
             >
               {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
               Finalizar y Enviar
             </button>
           )}
        </div>
      </form>
    </div>
  );
}
