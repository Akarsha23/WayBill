// lib/dispatcher/ml-forecaster.ts

export interface OrderRecord {
  created_at?: string;
  volume_m3: number | string;
  temp_class?: string;
}

export interface CapacityPrediction {
  predictedTotal: number;
  predictedChilled: number;
}

/**
 * Predicts total and chilled volume using Ordinary Least Squares (OLS)
 * and week-over-week seasonal growth factors.
 */
export function predictFutureCapacity(
  orders: OrderRecord[],
  weekOffset: number // 1 = Next Week, 2 = 2 Weeks Ahead, etc.
): CapacityPrediction {
  if (!orders || orders.length === 0) {
    return { predictedTotal: 150 * weekOffset, predictedChilled: 45 * weekOffset };
  }

  // Group historical volumes into weekly buckets
  const weeklyTotalMap: Record<number, number> = {};
  const weeklyChilledMap: Record<number, number> = {};

  orders.forEach((ord) => {
    const date = ord.created_at ? new Date(ord.created_at) : new Date();
    // Calculate week number relative to fixed epoch
    const weekBucket = Math.floor(date.getTime() / (1000 * 60 * 60 * 24 * 7));

    const vol = Number(ord.volume_m3) || 0;
    weeklyTotalMap[weekBucket] = (weeklyTotalMap[weekBucket] || 0) + vol;

    if (ord.temp_class === "reefer" || ord.temp_class === "Chilled") {
      weeklyChilledMap[weekBucket] = (weeklyChilledMap[weekBucket] || 0) + vol;
    }
  });

  const buckets = Object.keys(weeklyTotalMap).map(Number).sort((a, b) => a - b);
  
  if (buckets.length === 0) {
    return { predictedTotal: 180, predictedChilled: 50 };
  }

  const yTotals = buckets.map((b) => weeklyTotalMap[b]);
  const yChilled = buckets.map((b) => weeklyChilledMap[b] || 0);

  // Compute Linear Regression parameters (y = beta0 + beta1 * x)
  const n = buckets.length;
  const xMean = (n - 1) / 2;
  const yTotalMean = yTotals.reduce((a, b) => a + b, 0) / n;
  const yChilledMean = yChilled.reduce((a, b) => a + b, 0) / n;

  let numTotal = 0;
  let numChilled = 0;
  let den = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    numTotal += xDiff * (yTotals[i] - yTotalMean);
    numChilled += xDiff * (yChilled[i] - yChilledMean);
    den += xDiff * xDiff;
  }

  const beta1Total = den !== 0 ? numTotal / den : 0;
  const beta0Total = yTotalMean - beta1Total * xMean;

  const beta1Chilled = den !== 0 ? numChilled / den : 0;
  const beta0Chilled = yChilledMean - beta1Chilled * xMean;

  // Target time index
  const targetX = n + weekOffset - 1;

  // Calculate raw linear predictions
  let rawTotal = beta0Total + beta1Total * targetX;
  let rawChilled = beta0Chilled + beta1Chilled * targetX;

  // Fallback if trend yields negative/zero values due to sparse data
  if (rawTotal <= 0) rawTotal = yTotalMean || 120;
  if (rawChilled <= 0) rawChilled = yChilledMean || 40;

  // Apply seasonal festival ramp multipliers matching capacity weeks
  const seasonalFactors = [1.0, 1.25, 1.45, 1.10];
  const factor = seasonalFactors[weekOffset % seasonalFactors.length] || 1.15;

  return {
    predictedTotal: Math.round(rawTotal * factor),
    predictedChilled: Math.round(rawChilled * factor),
  };
}