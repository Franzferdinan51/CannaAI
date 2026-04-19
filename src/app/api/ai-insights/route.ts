/**
 * /api/ai-insights - Predictive AI co-pilot for CannaAI
 * Analyzes recent sensor trends and predicts problems before they happen.
 * This is the API that OpenClaw agents call for proactive grow monitoring.
 *
 * GET /api/ai-insights
 *   ?room=all|grow-tent|flower-room
 *   &hours=24  (lookback window)
 *
 * Response:
 * {
 *   insights: [
 *     {
 *       id, severity (low/medium/high/critical),
 *       type: "vpd|humidity|temperature|co2|light|nutrient",
 *       title, description,
 *       predicted_cause: "...",
 *       recommended_actions: string[],
 *       timestamp, source_readings: number
 *     }
 *   ],
 *   summary: "...",
 *   co_pilot_response: "..."  <- natural language for OpenClaw agent
 * }
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VPD_IDEAL = { min: 1.0, max: 1.5 };
const VPD_WARN = { min: 0.8, max: 1.6 };
const TEMP_IDEAL = { min: 72, max: 80 };
const TEMP_WARN = { min: 65, max: 85 };
const HUM_IDEAL = { min: 40, max: 55 };
const HUM_WARN = { min: 30, max: 65 };

interface Insight {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  title: string;
  description: string;
  predicted_cause: string;
  recommended_actions: string[];
  timestamp: string;
  source_readings: number;
}

function severityScore(current: number, warn: {min:number,max:number}, ideal: {min:number,max:number}): number {
  if (current < warn.min) return Math.max(0, (warn.min - current) / (warn.min - ideal.min));
  if (current > warn.max) return Math.max(0, (current - warn.max) / (ideal.max - warn.max));
  return 0;
}

function trend(readings: number[]): 'rising' | 'falling' | 'stable' {
  if (readings.length < 3) return 'stable';
  const recent = readings.slice(0, 3);
  const older = readings.slice(3, 6);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const diff = avg(recent) - avg(older);
  if (Math.abs(diff) < 0.05) return 'stable';
  return diff > 0 ? 'rising' : 'falling';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get('room') || 'all';
  const hours = Math.min(parseInt(searchParams.get('hours') || '24', 10), 168);

  const since = new Date(Date.now() - hours * 3600 * 1000);

  const readings = await prisma.sensorReading.findMany({
    where: { timestamp: { gte: since } },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  if (!readings.length) {
    return NextResponse.json({
      insights: [],
      summary: 'No sensor data available for the requested time window.',
      co_pilot_response: 'I don\'t have recent sensor data to analyze. Make sure sensors are reporting.',
    });
  }

  const insights: Insight[] = [];
  const vpds = readings.map((r) => r.vpd ?? r.vpd_daily).filter(Boolean);
  const temps = readings.map((r) => r.temperature ?? r.temp_avg).filter(Boolean);
  const hums = readings.map((r) => r.humidity ?? r.humidity_avg).filter(Boolean);

  // --- VPD Analysis ---
  if (vpds.length) {
    const currentVPD = vpds[0];
    const vpdScore = severityScore(currentVPD, VPD_WARN, VPD_IDEAL);
    const vpdTrend = trend(vpds);
    const vpdAvg3 = vpds.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, vpds.length);

    if (vpdScore > 0.7 || (vpdScore > 0.4 && vpdTrend === 'rising')) {
      insights.push({
        id: 'vpd-danger',
        severity: vpdScore > 0.8 ? 'critical' : 'high',
        type: 'vpd',
        title: vpdScore > 0.7 && currentVPD > VPD_IDEAL.max
          ? '🔥 VPD dangerously HIGH — leaf transpiration stressed'
          : '❄️ VPD dangerously LOW — condensation + mold risk',
        description: `Current VPD: ${currentVPD.toFixed(2)} kPa (ideal: ${VPD_IDEAL.min}–${VPD_IDEAL.max}). ${vpdTrend === 'rising' ? 'Trending UP.' : vpdTrend === 'falling' ? 'Trending DOWN.' : 'Stable.'}`,
        predicted_cause: currentVPD > VPD_IDEAL.max
          ? 'Low humidity or high temperature causing leaf moisture stress and reduced nutrient uptake.'
          : 'High humidity preventing adequate transpiration, creating mold/bud-rot conditions.',
        recommended_actions: currentVPD > VPD_IDEAL.max
          ? ['Increase airflow/exhaust fan speed', 'Lower temperature 2-3°F', 'Reduce humidity if above 55%']
          : ['Decrease airflow slightly', 'Increase target temperature 1-2°F', 'Check dehumidifier operation'],
        timestamp: new Date().toISOString(),
        source_readings: vpds.length,
      });
    } else if (vpdTrend === 'rising' && currentVPD > 1.3) {
      insights.push({
        id: 'vpd-rising',
        severity: 'medium',
        type: 'vpd',
        title: '⚠️ VPD trending up — monitor closely',
        description: `Current VPD: ${currentVPD.toFixed(2)} kPa. Averaging ${vpdAvg3.toFixed(2)} kPa over last 3 readings. Rising trend.`,
        predicted_cause: 'Environmental conditions shifting — may reach warning threshold within 1-2 hours without adjustment.',
        recommended_actions: ['Check current humidity/temp', 'Prepare exhaust fan adjustment', 'Monitor every 30 min'],
        timestamp: new Date().toISOString(),
        source_readings: vpds.length,
      });
    }
  }

  // --- Humidity Analysis ---
  if (hums.length) {
    const currentHum = hums[0];
    const humTrend = trend(hums);

    if (currentHum > HUM_WARN.max) {
      insights.push({
        id: 'humidity-high',
        severity: humTrend === 'rising' ? 'high' : 'medium',
        type: 'humidity',
        title: '💧 Humidity too HIGH — mold/bud-rot risk',
        description: `Current humidity: ${currentHum.toFixed(0)}% (ideal: ${HUM_IDEAL.min}–${HUM_IDEAL.max}%). ${humTrend} trend.`,
        predicted_cause: 'Excess moisture in grow space from transpiration. High humidity in flower stage is the #1 cause of bud rot.',
        recommended_actions: ['Increase exhaust fan speed', 'Run dehumidifier', 'Reduce watering frequency', 'Improve air circulation'],
        timestamp: new Date().toISOString(),
        source_readings: hums.length,
      });
    } else if (currentHum < HUM_WARN.min) {
      insights.push({
        id: 'humidity-low',
        severity: humTrend === 'falling' ? 'medium' : 'low',
        type: 'humidity',
        title: '🏜️ Humidity too LOW — plant stress risk',
        description: `Current humidity: ${currentHum.toFixed(0)}% (ideal: ${HUM_IDEAL.min}–${HUM_IDEAL.max}%). ${humTrend} trend.`,
        predicted_cause: 'Dry air causing increased transpiration, potential nutrient lockout and leaf curl.',
        recommended_actions: ['Add humidifier', 'Reduce exhaust fan speed', 'Misting cycle'],
        timestamp: new Date().toISOString(),
        source_readings: hums.length,
      });
    }
  }

  // --- Temperature Analysis ---
  if (temps.length) {
    const currentTemp = temps[0];
    const tempTrend = trend(temps);

    if (currentTemp > TEMP_WARN.max) {
      insights.push({
        id: 'temp-high',
        severity: tempTrend === 'rising' ? 'critical' : 'high',
        type: 'temperature',
        title: '🌡️ Temperature too HIGH — heat stress',
        description: `Current temperature: ${currentTemp.toFixed(0)}°F (ideal: ${TEMP_IDEAL.min}–${TEMP_IDEAL.max}°F). ${tempTrend} trend.`,
        predicted_cause: 'Lights, equipment, or poor ventilation producing excess heat. Affects nutrient uptake and terpene.',
        recommended_actions: ['Increase exhaust flow', 'Lower room temperature', 'Check light distance', 'Check fan operation'],
        timestamp: new Date().toISOString(),
        source_readings: temps.length,
      });
    } else if (currentTemp < TEMP_WARN.min) {
      insights.push({
        id: 'temp-low',
        severity: tempTrend === 'falling' ? 'high' : 'medium',
        type: 'temperature',
        title: '❄️ Temperature too LOW — slow growth',
        description: `Current temperature: ${currentTemp.toFixed(0)}°F (ideal: ${TEMP_IDEAL.min}–${TEMP_IDEAL.max}°F). ${tempTrend} trend.`,
        predicted_cause: 'Cold ambient temperature affecting metabolic rate. Growth slows significantly below 72°F.',
        recommended_actions: ['Increase HVAC setting', 'Check heater operation', 'Reduce exhaust until temp recovers'],
        timestamp: new Date().toISOString(),
        source_readings: temps.length,
      });
    }
  }

  // Build natural language co-pilot response
  const critical = insights.filter((i) => i.severity === 'critical' || i.severity === 'high');
  const medium = insights.filter((i) => i.severity === 'medium');

  let co_pilot_response = '';
  if (!insights.length) {
    co_pilot_response = `✅ All clear for the last ${hours}h. Your grow room environment is within acceptable ranges. VPD average: ${vpds.length ? (vpds.reduce((a, b) => a + b, 0) / vpds.length).toFixed(2) : 'N/A'} kPa. No action needed.`;
  } else {
    co_pilot_response = `⚠️ ${insights.length} issue${insights.length > 1 ? 's' : ''} detected. `;
    if (critical.length) co_pilot_response += `🚨 ${critical.length} require immediate attention: ` + critical.map((i) => i.title).join(' | ') + '. ';
    if (medium.length) co_pilot_response += `⚠️ ${medium.length} worth monitoring: ` + medium.map((i) => i.title).join(' | ') + '.';
  }

  return NextResponse.json({
    insights,
    summary: `${insights.length} insight${insights.length !== 1 ? 's' : ''} generated from ${readings.length} sensor readings over ${hours}h.`,
    co_pilot_response,
    latest_readings: {
      vpd: vpds[0] ? +vpds[0].toFixed(2) : null,
      temperature: temps[0] ? +temps[0].toFixed(1) : null,
      humidity: hums[0] ? +hums[0].toFixed(0) : null,
    },
  });
}
