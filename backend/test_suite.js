// Suite completa de pruebas de todos los endpoints del sistema SIEDSS
const BASE = 'http://localhost:4000/api';

const log = (icon, msg, data) => {
  const status = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
  console.log(`\n${icon} ${msg}`);
  if (data) console.log(status.substring(0, 300));
};

const prueba = async (nombre, fn) => {
  try {
    const resultado = await fn();
    log('✅', nombre, resultado);
    return resultado;
  } catch (e) {
    log('❌', `FALLÓ: ${nombre}`, e.message);
    return null;
  }
};

const ejecutarPruebas = async () => {
  console.log('='.repeat(60));
  console.log('   SUITE DE PRUEBAS — SIEDSS (MongoDB Atlas + Express)');
  console.log('='.repeat(60));
  
  // ─── 1. Health Check ────────────────────────────────────────
  console.log('\n📋 MÓDULO 1: HEALTH CHECK');
  await prueba('GET /api/health', async () => {
    const r = await fetch(`${BASE}/health`);
    return await r.json();
  });

  // ─── 2. Registro de Empresa ─────────────────────────────────
  console.log('\n📋 MÓDULO 2: AUTENTICACIÓN');

  const nit = `800${Date.now()}-1`;
  const correo = `test_${Date.now()}@siedss.com`;

  const empresa = await prueba('POST /api/auth/registro-empresa', async () => {
    const r = await fetch(`${BASE}/auth/registro-empresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nit,
        razon_social: 'PYME Prueba SIEDSS SAS',
        sector: 'Tecnología',
        tamano: 'Pequeña',
        ciudad: 'Bogotá',
        representante: 'Ana García',
        correo,
        password: 'Siedss2025!'
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || JSON.stringify(data));
    return { status: r.status, usuario: data.usuario?.correo, empresa: data.empresa?.razon_social };
  });

  // Login
  let token = null;
  await prueba('POST /api/auth/login (credenciales correctas)', async () => {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password: 'Siedss2025!' })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || JSON.stringify(data));
    token = data.tokens?.accessToken;
    return { status: r.status, token_recibido: !!token, rol: data.usuario?.rol };
  });

  await prueba('POST /api/auth/login (contraseña incorrecta → debe ser 401)', async () => {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password: 'MalaClave123' })
    });
    const data = await r.json();
    if (r.status !== 401) throw new Error(`Esperaba 401, recibí ${r.status}`);
    return { status: r.status, error: data.error };
  });

  await prueba('GET /api/encuestas/esquema (sin token → debe ser 401)', async () => {
    const r = await fetch(`${BASE}/encuestas/esquema`);
    if (r.status !== 401) throw new Error(`Esperaba 401, recibí ${r.status}`);
    return { status: r.status, protegida: true };
  });

  // ─── 3. Encuestas ────────────────────────────────────────────
  console.log('\n📋 MÓDULO 3: ENCUESTAS');

  let preguntas = [];
  await prueba('GET /api/encuestas/esquema (con token)', async () => {
    if (!token) throw new Error('Sin token disponible');
    const r = await fetch(`${BASE}/encuestas/esquema`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || JSON.stringify(data));
    const totalPreguntas = data.reduce((acc, s) => acc + (s.preguntas?.length || 0), 0);
    preguntas = data.flatMap(s => s.preguntas || []);
    return {
      status: r.status,
      secciones: data.length,
      total_preguntas: totalPreguntas,
      primera_seccion: data[0]?.descripcion,
      primera_pregunta: data[0]?.preguntas?.[0]?.texto_pregunta?.substring(0, 50)
    };
  });

  // ─── 4. Respuestas y Cálculo ─────────────────────────────────
  console.log('\n📋 MÓDULO 4: RESPUESTAS Y CÁLCULO');

  let hayResultado = false;
  if (preguntas.length > 0) {
    await prueba('POST /api/respuestas/guardar (todas las respuestas)', async () => {
      const respuestas = preguntas.map(p => ({
        id_pregunta: p._id,
        valor_numerico: Math.floor(Math.random() * 4) + 2 // valores 2-5
      }));
      const r = await fetch(`${BASE}/respuestas/guardar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ respuestas })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || JSON.stringify(data));
      hayResultado = true;
      return {
        status: r.status,
        nivel_global: data.resultadoGlobal?.nivel_global,
        porcentaje: data.resultadoGlobal?.porcentaje_global
      };
    });
  } else {
    log('⚠️', 'OMITIDO: No se pudieron cargar preguntas para probar respuestas', null);
  }

  // ─── 5. Resultados ───────────────────────────────────────────
  console.log('\n📋 MÓDULO 5: RESULTADOS');

  await prueba('GET /api/resultados/ultimo', async () => {
    const r = await fetch(`${BASE}/resultados/ultimo`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (!r.ok && r.status !== 404) throw new Error(data.error || JSON.stringify(data));
    if (r.status === 404) return { sin_evaluacion: true, mensaje: 'Primera vez - OK' };
    return {
      status: r.status,
      nivel_global: data.nivel_global,
      puntaje_global: data.puntaje_global,
      dimensiones: data.resultados_por_dimension?.length,
      recomendaciones: data.recomendaciones?.length
    };
  });

  // ─── Resumen ─────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('   FIN DE PRUEBAS');
  console.log('='.repeat(60));
};

ejecutarPruebas().catch(console.error);
