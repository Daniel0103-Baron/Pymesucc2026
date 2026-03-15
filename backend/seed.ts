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

      // II. INNOVACIÓN
      { seccion: 'innovacion', texto: '2.1 Producto/servicio nuevo que responde a nuevas necesidades del mercado', tipo: 'likert_1_5', orden: 1 },
      { seccion: 'innovacion', texto: '2.2 Mejora significativa de producto/servicio existente', tipo: 'likert_1_5', orden: 2 },
      { seccion: 'innovacion', texto: '2.3 Nuevo modelo de negocio', tipo: 'likert_1_5', orden: 3 },
      { seccion: 'innovacion', texto: '2.4 Nuevo proceso de administración y dirección', tipo: 'likert_1_5', orden: 4 },
      { seccion: 'innovacion', texto: '2.5 Rediseño de flujos de trabajo para mejorar la calidad', tipo: 'likert_1_5', orden: 5 },
      { seccion: 'innovacion', texto: '2.6 Rediseño de procesos para mejorar eficiencia operativa', tipo: 'likert_1_5', orden: 6 },
      
      // III. INTEGRACIÓN DIGITAL
      { seccion: 'integracion_digital', texto: '3.1 Interconexión digital dentro de la producción / prestación de servicios', tipo: 'likert_1_5', orden: 1 },
      { seccion: 'integracion_digital', texto: '3.2 Interconexión digital entre producción y logística', tipo: 'likert_1_5', orden: 2 },
      { seccion: 'integracion_digital', texto: '3.3 Interconexión digital con clientes', tipo: 'likert_1_5', orden: 3 },
      { seccion: 'integracion_digital', texto: '3.4 Interconexión digital con proveedores', tipo: 'likert_1_5', orden: 4 },

      // IV. INTELIGENCIA ARTIFICIAL
      { seccion: 'inteligencia_artificial', texto: '4.1 IA para Marketing', tipo: 'likert_1_5', orden: 1 },
      { seccion: 'inteligencia_artificial', texto: '4.2 IA para Logística', tipo: 'likert_1_5', orden: 2 },
      { seccion: 'inteligencia_artificial', texto: '4.3 IA en Recursos Humanos', tipo: 'likert_1_5', orden: 3 },
      { seccion: 'inteligencia_artificial', texto: '4.4 IA para Finanzas y Control Interno', tipo: 'likert_1_5', orden: 4 },

      // V. BIG DATA
      { seccion: 'big_data', texto: '5.1 Almacenamiento de datos estructurados', tipo: 'likert_1_5', orden: 1 },
      { seccion: 'big_data', texto: '5.2 Gestión de bases de datos', tipo: 'likert_1_5', orden: 2 },
      { seccion: 'big_data', texto: '5.3 Procesamiento de datos en tiempo real', tipo: 'likert_1_5', orden: 3 },

      // VI. CAPITAL HUMANO
      { seccion: 'capital_humano', texto: '6.1 La alta dirección promueve activamente el uso de tecnologías digitales', tipo: 'likert_1_5', orden: 1 },
      { seccion: 'capital_humano', texto: '6.2 Disposición y participación del personal para adoptar nuevas tecnologías', tipo: 'likert_1_5', orden: 2 },
      { seccion: 'capital_humano', texto: '6.3 Personal con habilidades para integrar tecnologías digitales', tipo: 'likert_1_5', orden: 3 },
      { seccion: 'capital_humano', texto: '6.4 Personal que aplica IA en sus actividades laborales', tipo: 'likert_1_5', orden: 4 },
      { seccion: 'capital_humano', texto: '6.5 Personal capacitado para gestionar datos', tipo: 'likert_1_5', orden: 5 },

      // VII. COLABORACIÓN U-E
      { seccion: 'colaboracion_universidad_empresa', texto: '7.1 Colaboración con una universidad/centros de investigación', tipo: 'si_no', orden: 1 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.2 Vinculación con PCyT', tipo: 'si_no', orden: 2 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.3 Proyectos conjuntos de Investigación y Desarrollo I+D con Universidad', tipo: 'likert_1_5', orden: 3 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.4 Servicios tecnológicos o consultoría con Universidad', tipo: 'likert_1_5', orden: 4 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.5 Formación conjunta con Universidad', tipo: 'likert_1_5', orden: 5 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.6 Movilidad de talento humano con Universidad', tipo: 'likert_1_5', orden: 6 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.7 Proyectos conjuntos de Investigación y Desarrollo I+D con PCyT', tipo: 'likert_1_5', orden: 7 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.8 Servicios tecnológicos o consultoría con PCyT', tipo: 'likert_1_5', orden: 8 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.9 Formación conjunta con PCyT', tipo: 'likert_1_5', orden: 9 },
      { seccion: 'colaboracion_universidad_empresa', texto: '7.10 Movilidad de talento humano con PCyT', tipo: 'likert_1_5', orden: 10 }
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
