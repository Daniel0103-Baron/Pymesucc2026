import dotenv from 'dotenv';
import app from './app';
import { conectarBaseDatos } from './configuracion/base_datos';

dotenv.config();

const PORT = process.env.PORT || 4000;

const iniciarServidor = async () => {
  // 1. Conectar a MongoDB
  await conectarBaseDatos();

  // 2. Iniciar Express
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
  });
};

iniciarServidor();
