'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Thermometer,
  Droplets,
  Wind,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Gauge,
  Target,
  Zap,
  Timer,
  Settings,
  CheckCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { SensorData, RoomConfig } from '../sensors/types';
import { ClimateZoneStatus, CO2SystemStatus } from './types';

interface EnvironmentalControlsProps {
  sensorData: SensorData;
  rooms: RoomConfig[];
  automationEnabled: boolean;
  className?: string;
}

export const EnvironmentalControls: React.FC<EnvironmentalControlsProps> = ({
  sensorData,
  rooms,
  automationEnabled,
  className = ''
}) => {
  const [climateZones, setClimateZones] = useState<ClimateZoneStatus[]>([]);
  const [co2System, setCo2System] = useState<CO2SystemStatus | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Calculate VPD (Vapor Pressure Deficit)
  const calculateVPD = (tempF: number, humidity: number): number => {
    const tempC = (tempF - 32) * 5 / 9;
    const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const vpd = svp * (1 - humidity / 100);
    return Math.round(vpd * 100) / 100;
  };

  const currentVPD = calculateVPD(sensorData.temperature, sensorData.humidity);

  // Get optimal ranges based on active rooms
  const getOptimalRanges = () => {
    if (rooms.length === 0) {
      return {
        temp: { min: 68, max: 78 },
        humidity: { min: 40, max: 60 },
        co2: { min: 400, max: 1200 },
        vpd: { min: 0.8, max: 1.2 }
      };
    }

    // Average the ranges from all active rooms
    const ranges = rooms.reduce((acc, room) => {
      const targets = room.targetEnvironment;
      acc.temp.min += targets.temperature.min;
      acc.temp.max += targets.temperature.max;
      acc.humidity.min += targets.humidity.min;
      acc.humidity.max += targets.humidity.max;
      acc.co2.min += targets.co2.min;
      acc.co2.max += targets.co2.max;
      acc.vpd.min += targets.vpd.min;
      acc.vpd.max += targets.vpd.max;
      return acc;
    }, {
      temp: { min: 0, max: 0 },
      humidity: { min: 0, max: 0 },
      co2: { min: 0, max: 0 },
      vpd: { min: 0, max: 0 }
    });

    const count = rooms.length;
    return {
      temp: { min: Math.round(ranges.temp.min / count), max: Math.round(ranges.temp.max / count) },
      humidity: { min: Math.round(ranges.humidity.min / count), max: Math.round(ranges.humidity.max / count) },
      co2: { min: Math.round(ranges.co2.min / count), max: Math.round(ranges.co2.max / count) },
      vpd: { min: Math.round(ranges.vpd.min / count * 100) / 100, max: Math.round(ranges.vpd.max / count * 100) / 100 }
    };
  };

  const optimalRanges = getOptimalRanges();

  // Calculate status indicators
  const getParameterStatus = (current: number, min: number, max: number) => {
    if (current < min) return { status: 'low', color: 'text-blue-400', bgColor: 'bg-blue-500/10' };
    if (current > max) return { status: 'high', color: 'text-red-400', bgColor: 'bg-red-500/10' };
    return { status: 'optimal', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' };
  };

  const tempStatus = getParameterStatus(sensorData.temperature, optimalRanges.temp.min, optimalRanges.temp.max);
  const humidityStatus = getParameterStatus(sensorData.humidity, optimalRanges.humidity.min, optimalRanges.humidity.max);
  const co2Status = getParameterStatus(sensorData.co2, optimalRanges.co2.min, optimalRanges.co2.max);
  const vpdStatus = getParameterStatus(currentVPD, optimalRanges.vpd.min, optimalRanges.vpd.max);

  // Calculate percentage within optimal range
  const getRangePercentage = (current: number, min: number, max: number) => {
    if (current < min) return 0;
    if (current > max) return 100;
    return ((current - min) / (max - min)) * 100;
  };

  const tempPercentage = getRangePercentage(sensorData.temperature, optimalRanges.temp.min, optimalRanges.temp.max);
  const humidityPercentage = getRangePercentage(sensorData.humidity, optimalRanges.humidity.min, optimalRanges.humidity.max);
  const co2Percentage = getRangePercentage(sensorData.co2, optimalRanges.co2.min, optimalRanges.co2.max);

  // Check for alerts
  useEffect(() => {
    const newAlerts = [];

    if (sensorData.temperature > 85 || sensorData.temperature < 60) {
      newAlerts.push({
        id: 'temp_extreme',
        type: 'warning',
        message: `Temperature (${sensorData.temperature}°F) outside safe range`,
        icon: AlertTriangle
      });
    }

    if (sensorData.humidity > 80 || sensorData.humidity < 30) {
      newAlerts.push({
        id: 'humidity_extreme',
        type: 'warning',
        message: `Humidity (${sensorData.humidity}%) outside optimal range`,
        icon: Droplets
      });
    }

    if (sensorData.co2 > 1500) {
      newAlerts.push({
        id: 'co2_high',
        type: 'warning',
        message: `CO₂ level (${sensorData.co2} ppm) above recommended maximum`,
        icon: Wind
      });
    }

    setAlerts(newAlerts);
  }, [sensorData]);

  return (
    <Card className={`border-slate-800 bg-slate-900/40 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-5 h-5 mr-2 text-emerald-400" />
            Environmental Controls
          </div>
          <Badge variant={automationEnabled ? 'default' : 'secondary'}
                 className={automationEnabled
                   ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                   : 'bg-slate-700/50 text-slate-400 border-slate-600/50'}>
            {automationEnabled ? 'Automated' : 'Manual'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Alert key={alert.id} className="border-yellow-500/20 bg-yellow-500/5">
                <alert.icon className="w-4 h-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Environmental Parameters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Thermometer className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-medium text-slate-300">Temperature</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-bold ${tempStatus.color}`}>
                  {sensorData.temperature}°F
                </span>
                {tempStatus.status === 'optimal' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{optimalRanges.temp.min}°F</span>
                <span>Optimal: {optimalRanges.temp.min}-{optimalRanges.temp.max}°F</span>
                <span>{optimalRanges.temp.max}°F</span>
              </div>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 bg-gradient-to-r from-blue-500 to-emerald-500" />
                  <div className="w-1/2 bg-gradient-to-r from-emerald-500 to-red-500" />
                </div>
                <motion.div
                  className="absolute top-0 h-full w-1 bg-white rounded-full"
                  style={{ left: `${tempPercentage}%` }}
                  animate={{ x: '-50%' }}
                />
              </div>
            </div>
          </div>

          {/* Humidity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Droplets className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">Humidity</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-bold ${humidityStatus.color}`}>
                  {sensorData.humidity}%
                </span>
                {humidityStatus.status === 'optimal' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{optimalRanges.humidity.min}%</span>
                <span>Optimal: {optimalRanges.humidity.min}-{optimalRanges.humidity.max}%</span>
                <span>{optimalRanges.humidity.max}%</span>
              </div>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 bg-gradient-to-r from-blue-500 to-emerald-500" />
                  <div className="w-1/2 bg-gradient-to-r from-emerald-500 to-red-500" />
                </div>
                <motion.div
                  className="absolute top-0 h-full w-1 bg-white rounded-full"
                  style={{ left: `${humidityPercentage}%` }}
                  animate={{ x: '-50%' }}
                />
              </div>
            </div>
          </div>

          {/* CO2 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wind className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-slate-300">CO₂</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-bold ${co2Status.color}`}>
                  {sensorData.co2} ppm
                </span>
                {co2Status.status === 'optimal' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{optimalRanges.co2.min} ppm</span>
                <span>Optimal: {optimalRanges.co2.min}-{optimalRanges.co2.max} ppm</span>
                <span>{optimalRanges.co2.max} ppm</span>
              </div>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 bg-gradient-to-r from-blue-500 to-emerald-500" />
                  <div className="w-1/2 bg-gradient-to-r from-emerald-500 to-red-500" />
                </div>
                <motion.div
                  className="absolute top-0 h-full w-1 bg-white rounded-full"
                  style={{ left: `${co2Percentage}%` }}
                  animate={{ x: '-50%' }}
                />
              </div>
            </div>
          </div>

          {/* VPD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gauge className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-slate-300">VPD</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-bold ${vpdStatus.color}`}>
                  {currentVPD} kPa
                </span>
                {vpdStatus.status === 'optimal' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{optimalRanges.vpd.min} kPa</span>
                <span>Optimal: {optimalRanges.vpd.min}-{optimalRanges.vpd.max} kPa</span>
                <span>{optimalRanges.vpd.max} kPa</span>
              </div>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 bg-gradient-to-r from-blue-500 to-emerald-500" />
                  <div className="w-1/2 bg-gradient-to-r from-emerald-500 to-red-500" />
                </div>
                <motion.div
                  className="absolute top-0 h-full w-1 bg-white rounded-full"
                  style={{
                    left: `${getRangePercentage(currentVPD, optimalRanges.vpd.min, optimalRanges.vpd.max)}%`
                  }}
                  animate={{ x: '-50%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
            disabled={!automationEnabled}
          >
            <Target className="w-4 h-4 mr-2" />
            Adjust Targets
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
            disabled={!automationEnabled}
          >
            <Timer className="w-4 h-4 mr-2" />
            Schedule Changes
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
            disabled={!automationEnabled}
          >
            <Settings className="w-4 h-4 mr-2" />
            Advanced Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnvironmentalControls;