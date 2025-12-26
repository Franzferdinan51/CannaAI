'use client';

import React from 'react';
import { Trash2, Download, Bot, Cloud, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChatSidebarProps {
  onClearChat: () => void;
  onExportChat: () => void;
  sensorData: {
    temperature: number;
    humidity: number;
    ph: number;
    soilMoisture: number;
    lightIntensity: number;
    ec: number;
  };
  currentModel?: {
    name: string;
    provider: string;
    hasVision: boolean;
  };
}

export function ChatSidebar({
  onClearChat,
  onExportChat,
  sensorData,
  currentModel
}: ChatSidebarProps) {
  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card className="bg-emerald-900/30 border-emerald-700 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-emerald-200 text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearChat}
            className="w-full justify-start text-emerald-300 hover:text-emerald-100 hover:bg-emerald-800/30"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Chat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExportChat}
            className="w-full justify-start text-emerald-300 hover:text-emerald-100 hover:bg-emerald-800/30"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Chat
          </Button>
        </CardContent>
      </Card>

      {/* Current Sensor Data */}
      <Card className="bg-emerald-900/30 border-emerald-700 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-emerald-200 text-sm font-medium">Current Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-emerald-400 text-sm">Temperature</span>
            <span className="text-emerald-200 text-sm font-medium">
              {Math.round((sensorData.temperature * 9/5) + 32)}°F
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-emerald-400 text-sm">Humidity</span>
            <span className="text-emerald-200 text-sm font-medium">{sensorData.humidity}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-emerald-400 text-sm">pH Level</span>
            <span className="text-emerald-200 text-sm font-medium">{sensorData.ph}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-emerald-400 text-sm">Soil Moisture</span>
            <span className="text-emerald-200 text-sm font-medium">{sensorData.soilMoisture}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Model Info */}
      {currentModel && (
        <Card className="bg-emerald-900/30 border-emerald-700 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-emerald-200 text-sm font-medium">Current Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-200 text-sm font-medium">{currentModel.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300 text-sm capitalize">{currentModel.provider}</span>
            </div>
            {currentModel.hasVision && (
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-400" />
                <span className="text-purple-300 text-sm">Vision Capable</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}