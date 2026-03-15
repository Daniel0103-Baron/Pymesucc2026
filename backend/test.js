const main = async () => {
    try {
        console.log('Creando cuenta test...');
        const resReg = await fetch('http://localhost:4000/api/auth/registro-empresa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nit: '800124446-1',
                razon_social: 'Empresa Test',
                sector: 'Servicios',
                tamano: 'Pequeña',
                ciudad: 'Bogotá',
                representante: 'Daniel',
                correo: 'daniel2@test.com',
                password: 'password123'
            })
        });

        console.log('Iniciando sesión...');
        const resLogin = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: 'daniel2@test.com', password: 'password123' })
        });

        const dataLogin = await resLogin.json();
        console.log('Token recibido:', !!dataLogin.tokens?.accessToken);
        
        console.log('\\nSolicitando Esquema de Encuesta desde Atlas...');
        const resEncuesta = await fetch('http://localhost:4000/api/encuestas/esquema', {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${dataLogin.tokens.accessToken}` 
            }
        });

        const dataEncuesta = await resEncuesta.json();
        console.log(`Retornadas ${dataEncuesta.length} dimensiones.`);
        console.log('Ejemplo de la primera dimensión:', JSON.stringify(dataEncuesta[0].nombre, null, 2));
        console.log(`Numero de preguntas en la primera dimension:`, dataEncuesta[0].preguntas?.length);
    } catch (e) {
        console.error(e);
    }
}
main();
