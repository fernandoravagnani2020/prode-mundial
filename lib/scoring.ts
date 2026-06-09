export function calculatePoints(
  pred1: number,
  pred2: number,
  score1: number,
  score2: number,
  opts?: {
    predictedAdvancer?: string | null;
    actualAdvancer?: string | null;
  }
): number {
  let points = 0;

  // Marcador exacto → 3 puntos
  if (pred1 === score1 && pred2 === score2) {
    points = 3;
  } else {
    // Resultado correcto (ganador o empate) → 1 punto
    const predResult = Math.sign(pred1 - pred2);
    const actualResult = Math.sign(score1 - score2);
    if (predResult === actualResult) points = 1;
  }

  // Bonus eliminatorias: acertar quién clasifica → +1 punto
  if (
    opts?.actualAdvancer &&
    opts?.predictedAdvancer &&
    opts.predictedAdvancer === opts.actualAdvancer
  ) {
    points += 1;
  }

  return points;
}
