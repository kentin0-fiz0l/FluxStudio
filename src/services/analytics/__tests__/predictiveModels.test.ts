import { describe, it, expect, beforeEach } from 'vitest';
import {
  PredictiveEngine,
  DataPoint,
  generateSyntheticData,
  calculateAccuracy,
} from '../predictiveModels';

describe('Predictive Models Engine', () => {
  let engine: PredictiveEngine;

  beforeEach(() => {
    engine = new PredictiveEngine();
  });

  describe('Linear Prediction', () => {
    it('should predict upward trend correctly', async () => {
      const data = generateSyntheticData(30, 100, 'up', 0.05);
      const result = await engine.predict(data, 7);

      expect(result.predicted).toBeGreaterThan(data[data.length - 1].value);
      expect(result.trend).toBe('up');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should predict downward trend correctly', async () => {
      const data = generateSyntheticData(30, 100, 'down', 0.05);
      const result = await engine.predict(data, 7);

      expect(result.predicted).toBeLessThan(data[data.length - 1].value);
      expect(result.trend).toBe('down');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should predict stable trend correctly', async () => {
      const data = generateSyntheticData(30, 100, 'stable', 0.05);
      const result = await engine.predict(data, 7);

      const currentValue = data[data.length - 1].value;
      const percentChange = Math.abs((result.predicted - currentValue) / currentValue);
      expect(percentChange).toBeLessThan(0.1); // Within 10%
    });
  });

  describe('Confidence Calculation', () => {
    it('should have high confidence for consistent data', async () => {
      const data = generateSyntheticData(30, 100, 'up', 0.02); // Low noise
      const result = await engine.predict(data, 7);

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should have lower confidence for noisy data', async () => {
      const data = generateSyntheticData(30, 100, 'up', 0.3); // High noise
      const result = await engine.predict(data, 7);

      expect(result.confidence).toBeLessThan(0.9);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect anomalies in data', () => {
      const normalData = generateSyntheticData(30, 100, 'stable', 0.05);
      const anomalyValue = 500; // Way above normal

      const result = engine.detectAnomaly(normalData, anomalyValue);

      expect(result.isAnomaly).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.severity).toBe('high');
    });

    it('should not flag normal values as anomalies', () => {
      const data = generateSyntheticData(30, 100, 'stable', 0.05);
      const normalValue = data[data.length - 1].value;

      const result = engine.detectAnomaly(data, normalValue);

      expect(result.isAnomaly).toBe(false);
      expect(result.score).toBeLessThan(0.3);
    });
  });

  describe('Forecasting', () => {
    it('should generate forecast for multiple periods', async () => {
      const data = generateSyntheticData(30, 100, 'up', 0.05);
      const forecast = await engine.forecast(data, 10);

      expect(forecast).toHaveLength(10);
      expect(forecast[0].timestamp).toBeInstanceOf(Date);
      expect(forecast[0].value).toBeGreaterThan(0);
      expect(forecast[0].metadata?.confidence).toBeDefined();
    });

    it('should show increasing values for upward trend', async () => {
      const data = generateSyntheticData(30, 100, 'up', 0.05);
      const forecast = await engine.forecast(data, 5);

      const values = forecast.map((d) => d.value);
      expect(values[values.length - 1]).toBeGreaterThan(values[0]);
    });
  });

  describe('Trend Strength', () => {
    it('should calculate strong trend for consistent data', () => {
      const data = generateSyntheticData(30, 100, 'up', 0.02);
      const strength = engine.calculateTrendStrength(data);

      expect(strength).toBeGreaterThan(0.8);
    });

    it('should calculate weak trend for stable data', () => {
      const data = generateSyntheticData(30, 100, 'stable', 0.1);
      const strength = engine.calculateTrendStrength(data);

      expect(strength).toBeLessThan(0.5);
    });
  });

  describe('Seasonality Detection', () => {
    it('should detect weekly patterns', () => {
      const data: DataPoint[] = [];
      const now = new Date();

      for (let i = 0; i < 28; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (28 - i));
        const value = 100 + (i % 7 === 0 ? 50 : 0); // Weekly spike

        data.push({ timestamp: date, value });
      }

      const result = engine.detectSeasonality(data);
      expect(result.hasSeason).toBe(true);
      expect(result.period).toBeGreaterThan(0);
    });
  });

  describe('Accuracy Metrics', () => {
    it('should calculate MAPE and RMSE correctly', () => {
      const predicted = [100, 105, 110, 115, 120];
      const actual = [102, 104, 112, 114, 122];

      const accuracy = calculateAccuracy(predicted, actual);

      expect(accuracy.mape).toBeGreaterThan(0);
      expect(accuracy.mape).toBeLessThan(0.1); // Good predictions
      expect(accuracy.rmse).toBeGreaterThan(0);
    });
  });

  describe('Synthetic Data Generation', () => {
    it('should generate correct number of data points', () => {
      const data = generateSyntheticData(30, 100, 'up');
      expect(data).toHaveLength(30);
    });

    it('should apply trend correctly', () => {
      const upData = generateSyntheticData(30, 100, 'up', 0.01);
      expect(upData[upData.length - 1].value).toBeGreaterThan(upData[0].value);

      const downData = generateSyntheticData(30, 100, 'down', 0.01);
      expect(downData[downData.length - 1].value).toBeLessThan(downData[0].value);
    });
  });

  describe('Edge Cases', () => {
    it('should throw error for insufficient data', async () => {
      const data = generateSyntheticData(3, 100, 'stable'); // Less than minimum
      await expect(engine.predict(data, 7)).rejects.toThrow('Insufficient data');
    });

    it('should handle zero values correctly', async () => {
      const data: DataPoint[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - (10 - i) * 86400000),
        value: i === 0 ? 0 : 100,
      }));

      const result = await engine.predict(data, 7);
      expect(result.predicted).toBeGreaterThanOrEqual(0);
    });
  });
});
