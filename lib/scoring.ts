export function calculatePoints(
  pred1: number,
  pred2: number,
  score1: number,
  score2: number
): number {
  // Marcador exacto → 3 puntos
  if (pred1 === score1 && pred2 === score2) return 3;

  // Resultado correcto (ganador o empate) → 1 punto
  const predResult = Math.sign(pred1 - pred2);
  const actualResult = Math.sign(score1 - score2);
  if (predResult === actualResult) return 1;

  return 0;
}
