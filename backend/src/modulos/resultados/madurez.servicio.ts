export const clasificarNivel = (porcentaje: number): 'muy_bajo' | 'bajo' | 'intermedio' | 'alto' | 'avanzado' => {
  if (porcentaje <= 20) return 'muy_bajo';
  if (porcentaje <= 40) return 'bajo';
  if (porcentaje <= 60) return 'intermedio';
  if (porcentaje <= 80) return 'alto';
  return 'avanzado';
};

export const calcularPorcentaje = (puntaje: number): number => {
  return ((puntaje - 1) / 4) * 100; // Fórmula exigida en el informe
};

export const calcularPuntajeDimension = (sumaRespuestas: number, numeroPreguntas: number): number => {
  if (numeroPreguntas === 0) return 0;
  return sumaRespuestas / numeroPreguntas;
};
