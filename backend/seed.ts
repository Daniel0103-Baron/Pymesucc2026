import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Rol } from './src/modulos/usuarios/rol.modelo';
import { SeccionEncuesta } from './src/modulos/encuestas/seccion_encuesta.modelo';
import { PreguntaEncuesta } from './src/modulos/encuestas/pregunta_encuesta.modelo';
import { OpcionPregunta } from './src/modulos/encuestas/opcion_pregunta.modelo';
import { Recomendacion } from './src/modulos/resultados/recomendacion.modelo';
import { Encuesta } from './src/modulos/encuestas/encuesta.modelo';
import { RespuestaEncuesta } from './src/modulos/respuestas/respuesta_encuesta.modelo';
import { ResultadoMadurez } from './src/modulos/resultados/resultado_madurez.modelo';
import { ResultadoPorDimension } from './src/modulos/resultados/resultado_por_dimension.modelo';
import { conectarBaseDatos } from './src/configuracion/base_datos';

dotenv.config();

const ejecutarSeed = async () => {
  try {
    await conectarBaseDatos();

    console.log('🧹 Limpiando base de datos...');
    await SeccionEncuesta.deleteMany({});
    await PreguntaEncuesta.deleteMany({});
    await OpcionPregunta.deleteMany({});
    await Recomendacion.deleteMany({});
    await ResultadoPorDimension.deleteMany({});
    await ResultadoMadurez.deleteMany({});
    await RespuestaEncuesta.deleteMany({});
    await Encuesta.deleteMany({});

    console.log('🌱 Sincronizando Roles...');
    const rolesBase = [
      { nombre: 'empresa', descripcion: 'Rol para PYMES registradas' },
      { nombre: 'semillero', descripcion: 'Estudiantes del semillero SIEDSS' },
      { nombre: 'universidad', descripcion: 'Administradores y docentes UCC' }
    ];

    for (const rol of rolesBase) {
      await Rol.updateOne(
        { nombre: rol.nombre },
        { $set: { descripcion: rol.descripcion } },
        { upsert: true }
      );
    }

    console.log('📁 Insertando Secciones de Encuesta...');
    // Se definen las secciones respetando el orden del instrumento
    const secciones = await SeccionEncuesta.insertMany([
      { nombre: 'datos_generales', descripcion: 'I. DATOS GENERALES', orden: 1 },
      { nombre: 'innovacion', descripcion: 'II. INNOVACION', orden: 2 },
      { nombre: 'integracion_digital', descripcion: 'III. INTEGRACION DIGITAL', orden: 3 },
      { nombre: 'inteligencia_artificial', descripcion: 'IV. INTELIGENCIA ARTIFICIAL', orden: 4 },
      { nombre: 'big_data', descripcion: 'V. BIG DATA', orden: 5 },
      { nombre: 'capital_humano', descripcion: 'VI. CAPITAL HUMANO', orden: 6 },
      { nombre: 'colaboracion_universidad_empresa', descripcion: 'VII. COLABORACIÓN U–E', orden: 7 }
    ]);

    const mapaSecciones = secciones.reduce((acc, seccion) => {
      acc[seccion.nombre] = seccion._id;
      return acc;
    }, {} as Record<string, mongoose.Types.ObjectId>);

    console.log('❓ Insertando Preguntas y Opciones...');

    // Opciones Likert 1-5 estándar (En ninguna medida - En gran medida)
    const opcionesLikert = [
      { texto_opcion: '1 - En ninguna medida', valor_numerico: 1, orden: 1 },
      { texto_opcion: '2', valor_numerico: 2, orden: 2 },
      { texto_opcion: '3', valor_numerico: 3, orden: 3 },
      { texto_opcion: '4', valor_numerico: 4, orden: 4 },
      { texto_opcion: '5 - En gran medida', valor_numerico: 5, orden: 5 }
    ];

    const opcionesSiNo = [
      { texto_opcion: 'Sí', valor_numerico: 5, orden: 1 },
      { texto_opcion: 'No', valor_numerico: 1, orden: 2 }
    ];

    const preguntas = [
      // I. DATOS GENERALES
      {
        seccion: 'datos_generales',
        texto: '1.1 Tamaño de la empresa (rango de empleados)',
        tipo: 'seleccion_unica',
        orden: 1,
        opciones: [
          { texto_opcion: '1-10', valor_numerico: 1, orden: 1 },
          { texto_opcion: '11-50', valor_numerico: 2, orden: 2 },
          { texto_opcion: '51-200', valor_numerico: 3, orden: 3 },
          { texto_opcion: 'Más de 200', valor_numerico: 4, orden: 4 }
        ]
      },
      {
        seccion: 'datos_generales',
        texto: '1.2 Número medio de empleados',
        tipo: 'numero',
        orden: 2
      },
      {
        seccion: 'datos_generales',
        texto: '1.3 Sector económico (Colombia)',
        tipo: 'seleccion_unica',
        orden: 3,
        opciones: [
          { texto_opcion: 'Industria', valor_numerico: 1, orden: 1 },
          { texto_opcion: 'Construcción', valor_numerico: 2, orden: 2 },
          { texto_opcion: 'Comercio', valor_numerico: 3, orden: 3 },
          { texto_opcion: 'Servicios', valor_numerico: 4, orden: 4 },
          { texto_opcion: 'Agropecuario', valor_numerico: 5, orden: 5 },
          { texto_opcion: 'Otro', valor_numerico: 6, orden: 6 }
        ]
      },

      // II. INNOVACION
      { seccion: 'innovacion', texto: '2.1 Producto/servicio nuevo que responde a nuevas necesidades del mercado (Bien o servicio nuevo para la empresa que atiende una demanda emergente)', tipo: 'likert_1_5', orden: 1 },
      { seccion: 'innovacion', texto: '2.2 Mejora significativa de producto/servicio existente (materiales o componentes) (Cambios relevantes que mejoran funcionalidad, calidad o desempeno)', tipo: 'likert_1_5', orden: 2 },
      { seccion: 'innovacion', texto: '2.3 Nuevo modelo de negocio (Cambios importantes en la forma en que la empresa vende o gana dinero, por ejemplo: empezar a vender en linea, pasar de venta unica a suscripcion, ofrecer nuevos servicios complementarios o cambiar la forma de cobrar a los clientes)', tipo: 'likert_1_5', orden: 3 },
      { seccion: 'innovacion', texto: '2.4 Nuevo proceso de administracion y direccion (Nuevas practicas de gestion, planificacion o toma de decisiones)', tipo: 'likert_1_5', orden: 4 },
      { seccion: 'innovacion', texto: '2.5 Rediseno de flujos de trabajo para mejorar la calidad (Reorganizacion de tareas para reducir errores o reprocesos)', tipo: 'likert_1_5', orden: 5 },
      { seccion: 'innovacion', texto: '2.6 Rediseno de procesos para mejorar eficiencia operativa (Optimizacion para reducir tiempos o aumentar productividad)', tipo: 'likert_1_5', orden: 6 },

      // III. INTEGRACION DIGITAL
      { seccion: 'integracion_digital', texto: '3.1 Interconexion digital dentro de la produccion / prestacion de servicios (Uso de sistemas digitales para capturar y compartir informacion en tiempo real dentro de los procesos operativos. Ejemplo: cuando produccion, inventarios y ventas estan conectados en el mismo sistema y la informacion se actualiza automaticamente)', tipo: 'likert_1_5', orden: 1 },
      { seccion: 'integracion_digital', texto: '3.2 Interconexion digital entre produccion y logistica (Integracion digital entre operaciones productivas y gestion de inventarios, almacenamiento, transporte o distribucion. Ejemplo: cuando el sistema de produccion actualiza automaticamente el inventario y genera ordenes de despacho, o cuando logistica puede ver en tiempo real que se esta produciendo para programar entregas y transporte)', tipo: 'likert_1_5', orden: 2 },
      { seccion: 'integracion_digital', texto: '3.3 Interconexion digital con clientes (Uso de plataformas o sistemas digitales para intercambiar pedidos, informacion y retroalimentacion con clientes. Ejemplo: recibir pedidos por un portal web o app, que el cliente pueda ver el estado del pedido y la fecha de entrega en linea, y que pueda enviar comentarios o reportes de calidad desde esa misma plataforma)', tipo: 'likert_1_5', orden: 3 },
      { seccion: 'integracion_digital', texto: '3.4 Interconexion digital con proveedores (Uso de sistemas digitales integrados para coordinar compras, inventarios o entregas con proveedores. Ejemplo: el proveedor puede ver las necesidades de reposicion en el sistema y coordinar la entrega directamente desde la plataforma compartida)', tipo: 'likert_1_5', orden: 4 },

      // IV. INTELIGENCIA ARTIFICIAL
      { seccion: 'inteligencia_artificial', texto: '4.1 IA para Marketing (Servicio al cliente y ventas, automatizacion de redes sociales, analisis de datos de clientes, generacion de contenido, optimizacion de publicidad, analisis de mercado y tendencias)', tipo: 'likert_1_5', orden: 1 },
      { seccion: 'inteligencia_artificial', texto: '4.2 IA para Logistica (Optimizacion de inventarios, automatizacion de pedidos y envios, optimizacion de rutas)', tipo: 'likert_1_5', orden: 2 },
      { seccion: 'inteligencia_artificial', texto: '4.3 IA en Recursos Humanos (Reclutamiento y seleccion, gestion de nomina, evaluacion del desempeno de empleados)', tipo: 'likert_1_5', orden: 3 },
      { seccion: 'inteligencia_artificial', texto: '4.4 IA para Finanzas y Control Interno (Automatizacion contable, pronostico financiero, deteccion de fraude)', tipo: 'likert_1_5', orden: 4 },

      // V. BIG DATA
      { seccion: 'big_data', texto: '5.1 Almacenamiento de datos estructurados (La empresa puede guardar informacion en sistemas o bases de datos organizadas para consultarla y analizarla despues)', tipo: 'likert_1_5', orden: 1 },
      { seccion: 'big_data', texto: '5.2 Gestion de bases de datos (La empresa administra sus bases de datos: actualiza, ordena, respalda y protege la informacion)', tipo: 'likert_1_5', orden: 2 },
      { seccion: 'big_data', texto: '5.3 Procesamiento de datos en tiempo real (La empresa puede capturar y analizar datos casi al instante para responder rapido a situaciones)', tipo: 'likert_1_5', orden: 3 },

      // VI. CAPITAL HUMANO
      { seccion: 'capital_humano', texto: '6.1 La alta direccion promueve activamente el uso de tecnologias digitales como parte de la estrategia empresarial y fomenta una cultura de aprendizaje digital en el personal', tipo: 'likert_1_5', orden: 1 },
      { seccion: 'capital_humano', texto: '6.2 En la empresa existe disposicion y participacion del personal para adoptar nuevas tecnologias e implementar o mejorar soluciones digitales que optimicen los procesos', tipo: 'likert_1_5', orden: 2 },
      { seccion: 'capital_humano', texto: '6.3 La empresa cuenta con personal con habilidades suficientes para integrar tecnologias digitales y lograr una interconexion digital efectiva entre produccion, logistica, clientes y proveedores, facilitando el intercambio de informacion en tiempo real', tipo: 'likert_1_5', orden: 3 },
      { seccion: 'capital_humano', texto: '6.4 La empresa cuenta con personal que aplica IA en sus actividades laborales y cuyo uso contribuye significativamente a la automatizacion de procesos (marketing, ventas y servicio, logistica, recursos humanos, finanzas y control interno)', tipo: 'likert_1_5', orden: 4 },
      { seccion: 'capital_humano', texto: '6.5 La empresa cuenta con personal capacitado para gestionar datos: administrar bases de datos (organizacion, respaldo y proteccion) y capturar o procesar informacion en tiempo real para apoyar la toma de decisiones', tipo: 'likert_1_5', orden: 5 },

      // VII. COLABORACION U-E
      { seccion: 'colaboracion_universidad_empresa', texto: '7.1 Colaboracion con una universidad o centros de investigacion', tipo: 'si_no', orden: 1 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.2 Vinculacion con PCyT (Parque Cientifico y Tecnologico: espacio que conecta empresas con universidades y centros de investigacion para impulsar innovacion, desarrollo tecnologico y nuevos negocios)', tipo: 'si_no', orden: 2 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.3 Proyectos conjuntos de Investigacion y Desarrollo I+D con Universidad (Orientados a resolver problemas tecnicos especificos, desarrollar o mejorar productos o procesos y avanzar en el desarrollo tecnologico, incluida la validacion de prototipos)', tipo: 'likert_1_5', orden: 3 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.4 Servicios tecnologicos o consultoria con Universidad (Contratos de servicios o consultorias tecnologicas orientados a la mejora de procesos productivos o tecnologicos, la gestion empresarial y estrategica, o el cumplimiento normativo y certificaciones tecnicas)', tipo: 'likert_1_5', orden: 4 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.5 Formacion conjunta con Universidad (Cursos, talleres, seminarios, charlas, conferencias, diplomados, especializaciones, maestrias, doctorados)', tipo: 'likert_1_5', orden: 5 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.6 Movilidad de talento humano con Universidad (Participacion de estudiantes e investigadores en practicas, pasantias o proyectos de innovacion, digitalizacion y tecnologias emergentes en la empresa)', tipo: 'likert_1_5', orden: 6 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.7 Proyectos conjuntos de Investigacion y Desarrollo I+D con PCyT (Orientados a resolver problemas tecnicos especificos, desarrollar o mejorar productos o procesos y avanzar en el desarrollo tecnologico, incluida la validacion de prototipos)', tipo: 'likert_1_5', orden: 7 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.8 Servicios tecnologicos o consultoria con PCyT (Contratos de servicios o consultorias tecnologicas orientados a la mejora de procesos productivos o tecnologicos, la gestion empresarial y estrategica, o el cumplimiento normativo y certificaciones tecnicas)', tipo: 'likert_1_5', orden: 8 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.9 Formacion conjunta con PCyT (Cursos, talleres, seminarios, charlas, conferencias, diplomados, especializaciones, maestrias, doctorados)', tipo: 'likert_1_5', orden: 9 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.10 Movilidad de talento humano con PCyT (Participacion de estudiantes e investigadores en practicas, pasantias o proyectos de innovacion, digitalizacion y tecnologias emergentes en la empresa)', tipo: 'likert_1_5', orden: 10 }
    ];

    for (const p of preguntas) {
      const nuevaPregunta = await PreguntaEncuesta.create({
        id_seccion: mapaSecciones[p.seccion],
        texto_pregunta: p.texto,
        tipo_pregunta: p.tipo,
        requerida: true,
        orden: p.orden
      });

      const opciones = p.tipo === 'likert_1_5'
        ? opcionesLikert
        : (p.tipo === 'si_no'
          ? opcionesSiNo
          : (Array.isArray((p as { opciones?: unknown[] }).opciones)
            ? (p as { opciones: Array<{ texto_opcion: string; valor_numerico?: number; orden: number }> }).opciones
            : []));
      
      const opcionesConIdPregunta = opciones.map(opc => ({
        id_pregunta: nuevaPregunta._id,
        ...opc
      }));

      if(opcionesConIdPregunta.length > 0) {
          await OpcionPregunta.insertMany(opcionesConIdPregunta);
      }
    }

    console.log('💡 Insertando Recomendaciones Base...');

    const dimensionesRecomendaciones = [
      'innovacion', 'integracion_digital', 'inteligencia_artificial', 
      'big_data', 'capital_humano', 'colaboracion_universidad_empresa'
    ];

    const niveles = ['muy_bajo', 'bajo', 'intermedio', 'alto', 'avanzado'];
    
    for (const dim of dimensionesRecomendaciones) {
      for (const nv of niveles) {
        await Recomendacion.create({
          id_seccion: mapaSecciones[dim],
          nivel_asociado: nv,
          texto: `Recomendación automática para el nivel ${nv} en la dimensión de ${dim}. Consulte a los investigadores del semillero SIEDSS de la UCC para más detalles.`
        });
      }
    }

    console.log('✅ Base de datos sembrada correctamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error sembrando la base de datos:', error);
    process.exit(1);
  }
};

ejecutarSeed();
