import dotenv from 'dotenv';
import { conectarBaseDatos } from '../src/configuracion/base_datos';
import { SeccionEncuesta } from '../src/modulos/encuestas/seccion_encuesta.modelo';
import { PreguntaEncuesta } from '../src/modulos/encuestas/pregunta_encuesta.modelo';

dotenv.config();

const descripcionesSeccion: Record<string, string> = {
  innovacion: 'II. INNOVACIÓN',
  integracion_digital: 'III. INTEGRACIÓN DIGITAL',
  colaboracion_universidad_empresa: 'VII. COLABORACIÓN U-E',
};

const textosPorCodigo: Record<string, string> = {
  '2.1': '2.1 Producto/servicio nuevo que responde a nuevas necesidades del mercado (Bien o servicio nuevo para la empresa que atiende una demanda emergente)',
  '2.2': '2.2 Mejora significativa de producto/servicio existente (materiales o componentes) (Cambios relevantes que mejoran funcionalidad, calidad o desempeño)',
  '2.3': '2.3 Nuevo modelo de negocio (Cambios importantes en la forma en que la empresa vende o gana dinero, por ejemplo: empezar a vender en línea, pasar de venta única a suscripción, ofrecer nuevos servicios complementarios o cambiar la forma de cobrar a los clientes)',
  '2.4': '2.4 Nuevo proceso de administración y dirección (Nuevas prácticas de gestión, planificación o toma de decisiones)',
  '2.5': '2.5 Rediseño de flujos de trabajo para mejorar la calidad (Reorganización de tareas para reducir errores o reprocesos)',
  '2.6': '2.6 Rediseño de procesos para mejorar eficiencia operativa (Optimización para reducir tiempos o aumentar productividad)',
  '3.1': '3.1 Interconexión digital dentro de la producción / prestación de servicios (Uso de sistemas digitales para capturar y compartir información en tiempo real dentro de los procesos operativos. Ejemplo: cuando producción, inventarios y ventas están conectados en el mismo sistema y la información se actualiza automáticamente)',
  '3.2': '3.2 Interconexión digital entre producción y logística (Integración digital entre operaciones productivas y gestión de inventarios, almacenamiento, transporte o distribución. Ejemplo: cuando el sistema de producción actualiza automáticamente el inventario y genera órdenes de despacho, o cuando logística puede ver en tiempo real qué se está produciendo para programar entregas y transporte)',
  '3.3': '3.3 Interconexión digital con clientes (Uso de plataformas o sistemas digitales para intercambiar pedidos, información y retroalimentación con clientes. Ejemplo: recibir pedidos por un portal web o app, que el cliente pueda ver el estado del pedido y la fecha de entrega en línea, y que pueda enviar comentarios o reportes de calidad desde esa misma plataforma)',
  '3.4': '3.4 Interconexión digital con proveedores (Uso de sistemas digitales integrados para coordinar compras, inventarios o entregas con proveedores. Ejemplo: el proveedor puede ver las necesidades de reposición en el sistema y coordinar la entrega directamente desde la plataforma compartida)',
  '4.1': '4.1 IA para Marketing (Servicio al cliente y ventas, automatización de redes sociales, análisis de datos de clientes, generación de contenido, optimización de publicidad, análisis de mercado y tendencias)',
  '4.2': '4.2 IA para Logística (Optimización de inventarios, automatización de pedidos y envíos, optimización de rutas)',
  '4.3': '4.3 IA en Recursos Humanos (Reclutamiento y selección, gestión de nómina, evaluación del desempeño de empleados)',
  '4.4': '4.4 IA para Finanzas y Control Interno (Automatización contable, pronóstico financiero, detección de fraude)',
  '5.1': '5.1 Almacenamiento de datos estructurados (La empresa puede guardar información en sistemas o bases de datos organizadas para consultarla y analizarla después)',
  '5.2': '5.2 Gestión de bases de datos (La empresa administra sus bases de datos: actualiza, ordena, respalda y protege la información)',
  '5.3': '5.3 Procesamiento de datos en tiempo real (La empresa puede capturar y analizar datos casi al instante para responder rápido a situaciones)',
  '6.1': '6.1 La alta dirección promueve activamente el uso de tecnologías digitales como parte de la estrategia empresarial y fomenta una cultura de aprendizaje digital en el personal',
  '6.2': '6.2 En la empresa existe disposición y participación del personal para adoptar nuevas tecnologías e implementar o mejorar soluciones digitales que optimicen los procesos',
  '6.3': '6.3 La empresa cuenta con personal con habilidades suficientes para integrar tecnologías digitales y lograr una interconexión digital efectiva entre producción, logística, clientes y proveedores, facilitando el intercambio de información en tiempo real',
  '6.4': '6.4 La empresa cuenta con personal que aplica IA en sus actividades laborales y cuyo uso contribuye significativamente a la automatización de procesos (marketing, ventas y servicio, logística, recursos humanos, finanzas y control interno)',
  '6.5': '6.5 La empresa cuenta con personal capacitado para gestionar datos: administrar bases de datos (organización, respaldo y protección) y capturar o procesar información en tiempo real para apoyar la toma de decisiones',
  '7.1': '7.1 Colaboración con una universidad o centros de investigación',
  '7.2': '7.2 Vinculación con PCyT (Parque Científico y Tecnológico: espacio que conecta empresas con universidades y centros de investigación para impulsar innovación, desarrollo tecnológico y nuevos negocios)',
  '7.3': '7.3 Proyectos conjuntos de Investigación y Desarrollo I+D con Universidad (Orientados a resolver problemas técnicos específicos, desarrollar o mejorar productos o procesos y avanzar en el desarrollo tecnológico, incluida la validación de prototipos)',
  '7.4': '7.4 Servicios tecnológicos o consultoría con Universidad (Contratos de servicios o consultorías tecnológicas orientados a la mejora de procesos productivos o tecnológicos, la gestión empresarial y estratégica, o el cumplimiento normativo y certificaciones técnicas)',
  '7.5': '7.5 Formación conjunta con Universidad (Cursos, talleres, seminarios, charlas, conferencias, diplomados, especializaciones, maestrías, doctorados)',
  '7.6': '7.6 Movilidad de talento humano con Universidad (Participación de estudiantes e investigadores en prácticas, pasantías o proyectos de innovación, digitalización y tecnologías emergentes en la empresa)',
  '7.7': '7.7 Proyectos conjuntos de Investigación y Desarrollo I+D con PCyT (Orientados a resolver problemas técnicos específicos, desarrollar o mejorar productos o procesos y avanzar en el desarrollo tecnológico, incluida la validación de prototipos)',
  '7.8': '7.8 Servicios tecnológicos o consultoría con PCyT (Contratos de servicios o consultorías tecnológicas orientados a la mejora de procesos productivos o tecnológicos, la gestión empresarial y estratégica, o el cumplimiento normativo y certificaciones técnicas)',
  '7.9': '7.9 Formación conjunta con PCyT (Cursos, talleres, seminarios, charlas, conferencias, diplomados, especializaciones, maestrías, doctorados)',
  '7.10': '7.10 Movilidad de talento humano con PCyT (Participación de estudiantes e investigadores en prácticas, pasantías o proyectos de innovación, digitalización y tecnologías emergentes en la empresa)',
};

const ejecutar = async () => {
  await conectarBaseDatos();

  for (const [nombre, descripcion] of Object.entries(descripcionesSeccion)) {
    await SeccionEncuesta.updateOne({ nombre }, { $set: { descripcion } });
  }

  let actualizadas = 0;

  for (const [codigo, texto] of Object.entries(textosPorCodigo)) {
    const regex = new RegExp(`^${codigo.replace('.', '\\.')}\\b`);
    const resultado = await PreguntaEncuesta.updateMany(
      { texto_pregunta: regex },
      { $set: { texto_pregunta: texto } }
    );
    actualizadas += resultado.modifiedCount ?? 0;
  }

  console.log(`Preguntas actualizadas: ${actualizadas}`);
  process.exit(0);
};

ejecutar().catch((error) => {
  console.error('Error actualizando ortografía del instrumento:', error);
  process.exit(1);
});
