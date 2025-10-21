/**
 * Predictive Models Engine
 *
 * Provides AI-powered predictive analytics using time series analysis,
 * linear regression, and pattern recognition algorithms.
 */

// Types
export interface DataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface PredictionResult {
  predicted: number;
  confidence: number; // 0-1
  upperBound: number;
  lowerBound: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  impact: number; // -1 to 1
  description: string;
}

export interface TimeSeriesModel {
  type: 'linear' | 'exponential' | 'seasonal';
  coefficients: number[];
  accuracy: number;
  lastTrained: Date;
}

export interface AnomalyDetection {
  isAnomaly: boolean;
  score: number; // 0-1, higher = more anomalous
  expectedRange: [number, number];
  actualValue: number;
  severity: 'low' | 'medium' | 'high';
}

// Configuration
const CONFIG = {
  minDataPoints: 7, // Minimum data points required for prediction
  confidenceThreshold: 0.7, // Minimum confidence for reliable predictions
  anomalyThreshold: 2.5, // Standard deviations for anomaly detection
  seasonalityPeriod: 7, // Days for seasonal patterns
  predictionHorizon: 30, // Days to predict into future
};

/**
 * Linear Regression Model
 * Uses least squares method for trend prediction
 */
class LinearRegressionModel {
  private slope: number = 0;
  private intercept: number = 0;
  private rSquared: number = 0;

  train(data: DataPoint[]): void {
    if (data.length < 2) {
      throw new Error('Insufficient data points for linear regression');
    }

    // Convert timestamps to numeric x values (days from first point)
    const firstTime = data[0].timestamp.getTime();
    const points = data.map((d, i) => ({
      x: (d.timestamp.getTime() - firstTime) / (1000 * 60 * 60 * 24),
      y: d.value,
    }));

    // Calculate means
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (const point of points) {
      numerator += (point.x - meanX) * (point.y - meanY);
      denominator += Math.pow(point.x - meanX, 2);
    }

    this.slope = numerator / denominator;
    this.intercept = meanY - this.slope * meanX;

    // Calculate R-squared
    const ssRes = points.reduce((sum, p) => {
      const predicted = this.slope * p.x + this.intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);

    const ssTot = points.reduce((sum, p) => {
      return sum + Math.pow(p.y - meanY, 2);
    }, 0);

    this.rSquared = 1 - ssRes / ssTot;
  }

  predict(daysFromStart: number): number {
    return this.slope * daysFromStart + this.intercept;
  }

  getAccuracy(): number {
    return Math.max(0, Math.min(1, this.rSquared));
  }

  getTrend(): 'up' | 'down' | 'stable' {
    if (Math.abs(this.slope) < 0.01) return 'stable';
    return this.slope > 0 ? 'up' : 'down';
  }
}

/**
 * Exponential Smoothing Model
 * Better for data with trend and seasonality
 */
class ExponentialSmoothingModel {
  private alpha: number = 0.3; // Smoothing parameter
  private level: number = 0;
  private trend: number = 0;

  train(data: DataPoint[]): void {
    if (data.length < 2) {
      throw new Error('Insufficient data for exponential smoothing');
    }

    const values = data.map((d) => d.value);

    // Initialize level and trend
    this.level = values[0];
    this.trend = values[1] - values[0];

    // Apply exponential smoothing
    for (let i = 1; i < values.length; i++) {
      const prevLevel = this.level;
      this.level = this.alpha * values[i] + (1 - this.alpha) * (this.level + this.trend);
      this.trend = this.alpha * (this.level - prevLevel) + (1 - this.alpha) * this.trend;
    }
  }

  predict(stepsAhead: number): number {
    return this.level + stepsAhead * this.trend;
  }

  getTrend(): 'up' | 'down' | 'stable' {
    if (Math.abs(this.trend) < 0.01) return 'stable';
    return this.trend > 0 ? 'up' : 'down';
  }
}

/**
 * Moving Average Model
 * Simple baseline for comparison
 */
class MovingAverageModel {
  private windowSize: number = 7;
  private average: number = 0;

  train(data: DataPoint[]): void {
    const recentData = data.slice(-this.windowSize);
    this.average = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
  }

  predict(): number {
    return this.average;
  }
}

/**
 * Main Predictive Engine
 */
export class PredictiveEngine {
  private linearModel: LinearRegressionModel;
  private expModel: ExponentialSmoothingModel;
  private maModel: MovingAverageModel;

  constructor() {
    this.linearModel = new LinearRegressionModel();
    this.expModel = new ExponentialSmoothingModel();
    this.maModel = new MovingAverageModel();
  }

  /**
   * Generate prediction for future time point
   */
  async predict(
    historicalData: DataPoint[],
    daysAhead: number = 30
  ): Promise<PredictionResult> {
    if (historicalData.length < CONFIG.minDataPoints) {
      throw new Error(
        `Insufficient data: need at least ${CONFIG.minDataPoints} data points`
      );
    }

    // Train all models
    this.linearModel.train(historicalData);
    this.expModel.train(historicalData);
    this.maModel.train(historicalData);

    // Get predictions from each model
    const firstTime = historicalData[0].timestamp.getTime();
    const lastTime = historicalData[historicalData.length - 1].timestamp.getTime();
    const totalDays = (lastTime - firstTime) / (1000 * 60 * 60 * 24);

    const linearPred = this.linearModel.predict(totalDays + daysAhead);
    const expPred = this.expModel.predict(daysAhead);
    const maPred = this.maModel.predict();

    // Weighted average based on model accuracy
    const linearWeight = this.linearModel.getAccuracy();
    const expWeight = 0.7; // Fixed weight for exp smoothing
    const maWeight = 0.3; // Fixed weight for moving average

    const totalWeight = linearWeight + expWeight + maWeight;
    const predicted =
      (linearPred * linearWeight + expPred * expWeight + maPred * maWeight) / totalWeight;

    // Calculate confidence based on model agreement and R-squared
    const predictions = [linearPred, expPred, maPred];
    const stdDev = this.calculateStdDev(predictions);
    const mean = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
    const variance = stdDev / mean;
    const confidence = Math.max(
      0.5,
      Math.min(1, this.linearModel.getAccuracy() * (1 - Math.min(variance, 0.5)))
    );

    // Calculate bounds (confidence interval)
    const historicalStdDev = this.calculateStdDev(historicalData.map((d) => d.value));
    const upperBound = predicted + historicalStdDev * 1.96; // 95% confidence
    const lowerBound = Math.max(0, predicted - historicalStdDev * 1.96);

    // Determine trend
    const trend = this.linearModel.getTrend();

    // Calculate change percent
    const currentValue = historicalData[historicalData.length - 1].value;
    const changePercent = ((predicted - currentValue) / currentValue) * 100;

    // Identify prediction factors
    const factors = this.identifyFactors(historicalData, predicted);

    return {
      predicted: Math.round(predicted),
      confidence,
      upperBound: Math.round(upperBound),
      lowerBound: Math.round(lowerBound),
      trend,
      changePercent,
      factors,
    };
  }

  /**
   * Detect anomalies in recent data
   */
  detectAnomaly(data: DataPoint[], recentValue: number): AnomalyDetection {
    if (data.length < CONFIG.minDataPoints) {
      return {
        isAnomaly: false,
        score: 0,
        expectedRange: [recentValue, recentValue],
        actualValue: recentValue,
        severity: 'low',
      };
    }

    const values = data.map((d) => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = this.calculateStdDev(values);

    const zScore = Math.abs((recentValue - mean) / stdDev);
    const isAnomaly = zScore > CONFIG.anomalyThreshold;

    const expectedRange: [number, number] = [
      mean - CONFIG.anomalyThreshold * stdDev,
      mean + CONFIG.anomalyThreshold * stdDev,
    ];

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (zScore > 4) severity = 'high';
    else if (zScore > 3) severity = 'medium';

    return {
      isAnomaly,
      score: Math.min(1, zScore / 5), // Normalize to 0-1
      expectedRange,
      actualValue: recentValue,
      severity,
    };
  }

  /**
   * Generate time series forecast
   */
  async forecast(
    historicalData: DataPoint[],
    periods: number = CONFIG.predictionHorizon
  ): Promise<DataPoint[]> {
    const forecast: DataPoint[] = [];
    const lastTimestamp = historicalData[historicalData.length - 1].timestamp;

    for (let i = 1; i <= periods; i++) {
      const prediction = await this.predict(historicalData, i);
      const futureDate = new Date(lastTimestamp);
      futureDate.setDate(futureDate.getDate() + i);

      forecast.push({
        timestamp: futureDate,
        value: prediction.predicted,
        metadata: {
          confidence: prediction.confidence,
          upperBound: prediction.upperBound,
          lowerBound: prediction.lowerBound,
          trend: prediction.trend,
        },
      });
    }

    return forecast;
  }

  /**
   * Calculate trend strength (0-1)
   */
  calculateTrendStrength(data: DataPoint[]): number {
    if (data.length < 2) return 0;

    this.linearModel.train(data);
    return this.linearModel.getAccuracy();
  }

  /**
   * Detect seasonal patterns
   */
  detectSeasonality(data: DataPoint[]): {
    hasSeason: boolean;
    period: number;
    strength: number;
  } {
    if (data.length < CONFIG.seasonalityPeriod * 2) {
      return { hasSeason: false, period: 0, strength: 0 };
    }

    // Simple autocorrelation for weekly patterns
    const values = data.map((d) => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    let maxCorr = 0;
    let bestPeriod = 0;

    for (let lag = 1; lag <= Math.min(14, values.length / 2); lag++) {
      let numerator = 0;
      let denominator = 0;

      for (let i = lag; i < values.length; i++) {
        numerator += (values[i] - mean) * (values[i - lag] - mean);
      }

      for (let i = 0; i < values.length; i++) {
        denominator += Math.pow(values[i] - mean, 2);
      }

      const correlation = numerator / denominator;

      if (Math.abs(correlation) > Math.abs(maxCorr)) {
        maxCorr = correlation;
        bestPeriod = lag;
      }
    }

    const hasSeason = Math.abs(maxCorr) > 0.5;
    return {
      hasSeason,
      period: bestPeriod,
      strength: Math.abs(maxCorr),
    };
  }

  // Helper methods
  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private identifyFactors(
    historicalData: DataPoint[],
    predicted: number
  ): PredictionFactor[] {
    const factors: PredictionFactor[] = [];
    const currentValue = historicalData[historicalData.length - 1].value;
    const trend = this.linearModel.getTrend();

    // Historical trend factor
    const trendStrength = this.calculateTrendStrength(historicalData);
    factors.push({
      name: 'Historical Trend',
      impact: trend === 'up' ? trendStrength : trend === 'down' ? -trendStrength : 0,
      description: `${trend === 'up' ? 'Upward' : trend === 'down' ? 'Downward' : 'Stable'} trend with ${Math.round(trendStrength * 100)}% consistency`,
    });

    // Growth rate factor
    const growthRate = (predicted - currentValue) / currentValue;
    factors.push({
      name: 'Growth Rate',
      impact: Math.max(-1, Math.min(1, growthRate)),
      description: `${growthRate > 0 ? 'Positive' : 'Negative'} growth of ${Math.abs(Math.round(growthRate * 100))}%`,
    });

    // Volatility factor
    const stdDev = this.calculateStdDev(historicalData.map((d) => d.value));
    const mean = historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length;
    const volatility = stdDev / mean;
    factors.push({
      name: 'Data Volatility',
      impact: -Math.min(1, volatility),
      description: `${volatility > 0.3 ? 'High' : volatility > 0.15 ? 'Moderate' : 'Low'} variability in historical data`,
    });

    // Seasonality factor
    const seasonality = this.detectSeasonality(historicalData);
    if (seasonality.hasSeason) {
      factors.push({
        name: 'Seasonal Pattern',
        impact: seasonality.strength * 0.5,
        description: `${seasonality.period}-day seasonal cycle detected`,
      });
    }

    return factors;
  }
}

/**
 * Utility functions
 */

/**
 * Generate synthetic data for testing
 */
export function generateSyntheticData(
  days: number,
  baseValue: number,
  trend: 'up' | 'down' | 'stable',
  noise: number = 0.1
): DataPoint[] {
  const data: DataPoint[] = [];
  let value = baseValue;
  const trendFactor = trend === 'up' ? 1.02 : trend === 'down' ? 0.98 : 1.0;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));

    // Apply trend
    value = value * trendFactor;

    // Add noise
    const noiseFactor = 1 + (Math.random() - 0.5) * noise;
    const noisyValue = value * noiseFactor;

    data.push({
      timestamp: date,
      value: Math.round(noisyValue),
    });
  }

  return data;
}

/**
 * Calculate prediction accuracy
 */
export function calculateAccuracy(
  predicted: number[],
  actual: number[]
): { mape: number; rmse: number } {
  if (predicted.length !== actual.length) {
    throw new Error('Predicted and actual arrays must have same length');
  }

  const n = predicted.length;

  // Mean Absolute Percentage Error
  const mape =
    predicted.reduce((sum, pred, i) => {
      return sum + Math.abs((actual[i] - pred) / actual[i]);
    }, 0) / n;

  // Root Mean Squared Error
  const rmse = Math.sqrt(
    predicted.reduce((sum, pred, i) => {
      return sum + Math.pow(actual[i] - pred, 2);
    }, 0) / n
  );

  return { mape, rmse };
}

// Export singleton instance
export const predictiveEngine = new PredictiveEngine();
