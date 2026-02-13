/**
 * TemperatureMonitor Component
 * Real-time temperature display with history chart
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Thermometer } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TemperatureMonitorProps, TEMPERATURE_PRESETS } from '@/types/printing';
import { cn } from '@/lib/utils';

/**
 * Get temperature status color
 */
const getTempStatusColor = (actual: number, target: number): string => {
  const diff = Math.abs(actual - target);

  if (target === 0) return 'text-neutral-500'; // Cooling/idle
  if (diff < 3) return 'text-success-600'; // At target
  if (actual < target) return 'text-error-500'; // Heating
  return 'text-info-500'; // Cooling down
};

/**
 * Format chart data from temperature history
 */
const formatChartData = (readings: Array<{ time: number; bed: { actual: number; target: number }; tool0: { actual: number; target: number } }>) => {
  if (!readings || readings.length === 0) return [];

  return readings.map((reading) => ({
    time: new Date(reading.time).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    bed: reading.bed.actual,
    bedTarget: reading.bed.target,
    hotend: reading.tool0.actual,
    hotendTarget: reading.tool0.target,
  }));
};

export const TemperatureMonitor: React.FC<TemperatureMonitorProps> = ({
  status,
  history,
  loading = false,
  error = null,
  showChart = true,
  onPreheat,
  className = '',
}) => {
  const [isSettingTemp, setIsSettingTemp] = React.useState(false);

  const bedTemp = status?.temperature.bed;
  const hotendTemp = status?.temperature.tool0;

  /**
   * Handle preheat preset button click
   */
  const handlePreheat = async (preset: 'PLA' | 'ABS' | 'PETG') => {
    if (!onPreheat) return;

    setIsSettingTemp(true);
    try {
      const temps = TEMPERATURE_PRESETS[preset];
      await onPreheat('hotend', temps.hotend);
      await onPreheat('bed', temps.bed);
    } catch (err) {
      console.error('Preheat error:', err);
    } finally {
      setIsSettingTemp(false);
    }
  };

  /**
   * Handle cool down button click
   */
  const handleCoolDown = async () => {
    if (!onPreheat) return;

    setIsSettingTemp(true);
    try {
      await onPreheat('hotend', 0);
      await onPreheat('bed', 0);
    } catch (err) {
      console.error('Cool down error:', err);
    } finally {
      setIsSettingTemp(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Temperature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          {showChart && <Skeleton className="h-48 w-full" />}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Temperature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-error-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!status || !bedTemp || !hotendTemp) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Temperature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">No temperature data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = history ? formatChartData(history.readings) : [];

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          Temperature
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Temperature Display */}
        <div className="grid grid-cols-2 gap-4">
          {/* Hotend Temperature */}
          <div className="space-y-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-xs font-medium text-neutral-600 uppercase">Hotend</p>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'text-3xl font-bold',
                  getTempStatusColor(hotendTemp.actual, hotendTemp.target)
                )}
              >
                {Math.round(hotendTemp.actual)}
              </span>
              <span className="text-lg text-neutral-500">°C</span>
            </div>
            <p className="text-xs text-neutral-500">
              Target: {Math.round(hotendTemp.target)}°C
            </p>
          </div>

          {/* Bed Temperature */}
          <div className="space-y-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-xs font-medium text-neutral-600 uppercase">Bed</p>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'text-3xl font-bold',
                  getTempStatusColor(bedTemp.actual, bedTemp.target)
                )}
              >
                {Math.round(bedTemp.actual)}
              </span>
              <span className="text-lg text-neutral-500">°C</span>
            </div>
            <p className="text-xs text-neutral-500">
              Target: {Math.round(bedTemp.target)}°C
            </p>
          </div>
        </div>

        {/* Preheat Presets */}
        {onPreheat && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-600 uppercase">Quick Presets</p>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreheat('PLA')}
                disabled={isSettingTemp}
                className="text-xs"
              >
                PLA
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreheat('ABS')}
                disabled={isSettingTemp}
                className="text-xs"
              >
                ABS
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreheat('PETG')}
                disabled={isSettingTemp}
                className="text-xs"
              >
                PETG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCoolDown}
                disabled={isSettingTemp}
                className="text-xs"
              >
                Cool
              </Button>
            </div>
          </div>
        )}

        {/* Temperature History Chart */}
        {showChart && chartData.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-600 uppercase">
              Temperature History (Last 5 min)
            </p>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="time"
                    stroke="#6b7280"
                    style={{ fontSize: '10px' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '10px' }}
                    tickLine={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="hotend"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="Hotend"
                  />
                  <Line
                    type="monotone"
                    dataKey="hotendTarget"
                    stroke="#ef4444"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Hotend Target"
                  />
                  <Line
                    type="monotone"
                    dataKey="bed"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Bed"
                  />
                  <Line
                    type="monotone"
                    dataKey="bedTarget"
                    stroke="#3b82f6"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Bed Target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* No chart data message */}
        {showChart && chartData.length === 0 && (
          <div className="h-48 flex items-center justify-center bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-500">
              Collecting temperature data...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TemperatureMonitor;
