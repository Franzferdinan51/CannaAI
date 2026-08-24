import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sensorsService } from '@/services/sensorsService';
import { queryKeys, createMutationHook } from '@/lib/query/client';
import {
  SensorData,
  Room,
  AutomationSettings,
  SensorActionRequest,
  ApiResponse
} from '@/types/api';

// =============================================================================
// Query Hooks
// =============================================================================

export function useSensorData(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.sensors,
    queryFn: () => sensorsService.getSensorData(),
    staleTime: 10 * 1000, // 10 seconds for real-time data
    cacheTime: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    enabled
  });
}

export function useRooms() {
  return useQuery({
    queryKey: queryKeys.rooms,
    queryFn: () => sensorsService.getRooms(),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

export function useRoom(roomId: string, enabled: boolean = !!roomId) {
  return useQuery({
    queryKey: queryKeys.room(roomId),
    queryFn: () => sensorsService.getRoom(roomId),
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
    retry: 2,
    enabled
  });
}

export function useAutomationSettings() {
  return useQuery({
    queryKey: queryKeys.automation,
    queryFn: () => sensorsService.getAutomationSettings(),
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });
}

export function useSensorHistory(sensor: keyof SensorData, timeRange: '1h' | '24h' | '7d' | '30d' = '24h') {
  return useQuery({
    queryKey: queryKeys.sensorHistory(sensor, timeRange),
    queryFn: () => sensorsService.getSensorHistory(sensor, timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    enabled: !!sensor
  });
}

export function useSensorAlerts(severity?: 'info' | 'warning' | 'error') {
  return useQuery({
    queryKey: [...queryKeys.sensorAlerts, severity].filter(Boolean),
    queryFn: () => sensorsService.getSensorAlerts(severity),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

export function useSensorCalibration(roomId?: string) {
  return useQuery({
    queryKey: [...queryKeys.sensorCalibration, roomId].filter(Boolean),
    queryFn: () => sensorsService.getSensorCalibration(roomId),
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    retry: 1
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useExecuteSensorAction() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse, Error, SensorActionRequest>({
    mutationFn: (action) => sensorsService.executeAction(action),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.sensors });

      // Snapshot the previous value
      const previousSensorData = queryClient.getQueryData(queryKeys.sensors);

      return { previousSensorData };
    },
    onError: (error, variables, context) => {
      console.error('Sensor action failed:', error);

      // Rollback on error
      if (context?.previousSensorData) {
        queryClient.setQueryData(queryKeys.sensors, context.previousSensorData);
      }
    },
    onSuccess: (data, variables, context) => {
      console.log(`Sensor action "${variables.action}" completed successfully`);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.sensors });
      queryClient.invalidateQueries({ queryKey: queryKeys.automation });

      // Update specific queries based on action type
      switch (variables.action) {
        case 'toggle_room':
          queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
          if (variables.data.roomId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.room(variables.data.roomId) });
          }
          break;
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.sensors });
    }
  });
}

export function useToggleRoom() {
  return useMutation({
    mutationFn: (roomId: string) => sensorsService.toggleRoom(roomId),
    onSuccess: () => {
      console.log('Room toggled successfully');
    },
    onError: (error) => {
      console.error('Failed to toggle room:', error);
    }
  });
}

export function useWaterNow() {
  return createMutationHook(
    (roomId?: string) => sensorsService.waterNow(roomId),
    {
      onSuccess: () => console.log('Watering triggered successfully'),
      onError: (error) => console.error('Failed to trigger watering:', error),
      invalidateQueries: [queryKeys.sensors]
    }
  )();
}

export function useToggleLights() {
  return createMutationHook(
    (roomId?: string) => sensorsService.toggleLights(roomId),
    {
      onSuccess: () => console.log('Lights toggled successfully'),
      onError: (error) => console.error('Failed to toggle lights:', error),
      invalidateQueries: [queryKeys.sensors]
    }
  )();
}

export function useAdjustClimate() {
  return createMutationHook(
    (adjustments: { temperature?: number; humidity?: number; roomId?: string }) =>
      sensorsService.adjustClimate(adjustments),
    {
      onSuccess: () => console.log('Climate adjusted successfully'),
      onError: (error) => console.error('Failed to adjust climate:', error),
      invalidateQueries: [queryKeys.sensors]
    }
  )();
}

export function useUpdateAutomationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<AutomationSettings>) =>
      sensorsService.updateAutomationSettings(settings),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.automation });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData(queryKeys.automation);

      // Optimistically update
      queryClient.setQueryData(queryKeys.automation, (old: any) => ({
        ...old,
        ...variables
      }));

      return { previousSettings };
    },
    onError: (error, variables, context) => {
      console.error('Failed to update automation settings:', error);

      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKeys.automation, context.previousSettings);
      }
    },
    onSuccess: () => {
      console.log('Automation settings updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automation });
    }
  });
}

// =============================================================================
// Compound Hooks
// =============================================================================

export function useRoomControls(roomId: string) {
  const roomQuery = useRoom(roomId);
  const toggleRoomMutation = useToggleRoom();
  const waterNowMutation = useWaterNow();
  const toggleLightsMutation = useToggleLights();
  const adjustClimateMutation = useAdjustClimate();

  const toggleRoom = () => {
    if (roomId) {
      toggleRoomMutation.mutate(roomId);
    }
  };

  const water = () => {
    waterNowMutation.mutate(roomId);
  };

  const toggleLights = () => {
    toggleLightsMutation.mutate(roomId);
  };

  const adjustClimate = (adjustments: { temperature?: number; humidity?: number }) => {
    adjustClimateMutation.mutate({ ...adjustments, roomId });
  };

  return {
    room: roomQuery.data,
    isLoading: roomQuery.isLoading,
    error: roomQuery.error,
    isOnline: roomQuery.data?.active ?? false,
    toggleRoom,
    water,
    toggleLights,
    adjustClimate,
    isToggling: toggleRoomMutation.isLoading,
    isWatering: waterNowMutation.isLoading,
    isTogglingLights: toggleLightsMutation.isLoading,
    isAdjustingClimate: adjustClimateMutation.isLoading
  };
}

export function useSensorOptimalRanges() {
  return useQuery({
    queryKey: ['sensors', 'optimal-ranges'],
    queryFn: () => sensorsService.getOptimalRanges(),
    staleTime: Infinity, // These don't change often
    cacheTime: Infinity
  });
}

export function useSensorHealthCheck() {
  const sensorDataQuery = useSensorData();
  const optimalRangesQuery = useSensorOptimalRanges();

  return useQuery({
    queryKey: ['sensors', 'health-check'],
    queryFn: () => {
      if (!sensorDataQuery.data?.sensors || !optimalRangesQuery.data) {
        return null;
      }

      return sensorsService.checkOptimalRanges(sensorDataQuery.data.sensors);
    },
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!sensorDataQuery.data?.sensors && !!optimalRangesQuery.data
  });
}

export function useRealtimeSensorMonitor() {
  const sensorDataQuery = useSensorData();
  const sensorAlertsQuery = useSensorAlerts();

  // Calculate sensor health status
  const sensorHealth = React.useMemo(() => {
    if (!sensorDataQuery.data?.sensors) return null;

    const sensors = sensorDataQuery.data.sensors;
    const health = {
      overall: 'healthy' as 'healthy' | 'warning' | 'critical',
      issues: [] as string[],
      lastUpdate: sensors.lastUpdated
    };

    // Check for critical issues
    if (sensors.temperature < 60 || sensors.temperature > 90) {
      health.overall = 'critical';
      health.issues.push('Temperature out of safe range');
    }

    if (sensors.humidity < 30 || sensors.humidity > 80) {
      health.overall = 'critical';
      health.issues.push('Humidity out of safe range');
    }

    // Check for warnings
    if (health.overall === 'healthy') {
      if (sensors.soilMoisture < 30) {
        health.overall = 'warning';
        health.issues.push('Low soil moisture');
      }

      if (sensors.ph < 5.5 || sensors.ph > 7.5) {
        health.overall = 'warning';
        health.issues.push('pH level needs adjustment');
      }
    }

    return health;
  }, [sensorDataQuery.data?.sensors]);

  return {
    sensorData: sensorDataQuery.data,
    alerts: sensorAlertsQuery.data,
    health: sensorHealth,
    isLoading: sensorDataQuery.isLoading || sensorAlertsQuery.isLoading,
    error: sensorDataQuery.error || sensorAlertsQuery.error,
    refetch: () => {
      sensorDataQuery.refetch();
      sensorAlertsQuery.refetch();
    }
  };
}

// =============================================================================
// Utilities
// =============================================================================

export function invalidateSensorQueries(queryClient: any) {
  queryClient.invalidateQueries({ queryKey: queryKeys.sensors });
  queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
  queryClient.invalidateQueries({ queryKey: queryKeys.automation });
  queryClient.invalidateQueries({ queryKey: queryKeys.sensorAlerts });
}

export function prefetchSensorData(queryClient: any) {
  queryClient.prefetchQuery({
    queryKey: queryKeys.sensors,
    queryFn: () => sensorsService.getSensorData(),
    staleTime: 10 * 1000
  });

  queryClient.prefetchQuery({
    queryKey: queryKeys.rooms,
    queryFn: () => sensorsService.getRooms(),
    staleTime: 30 * 1000
  });

  queryClient.prefetchQuery({
    queryKey: queryKeys.automation,
    queryFn: () => sensorsService.getAutomationSettings(),
    staleTime: 60 * 1000
  });
}