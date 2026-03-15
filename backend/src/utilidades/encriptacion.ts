import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const encriptarPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const compararPassword = async (passwordPlana: string, passwordHash: string): Promise<boolean> => {
  return await bcrypt.compare(passwordPlana, passwordHash);
};
