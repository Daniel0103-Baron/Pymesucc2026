import mongoose from 'mongoose';

export const conectarBaseDatos = async (): Promise<void> => {
  try {
    const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/madurez_digital_pymes';
    await mongoose.connect(URI);
    console.log('✅ Conexión exitosa a la base de datos MongoDB Atlas');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB Atlas:', error);
    process.exit(1);
  }
};
