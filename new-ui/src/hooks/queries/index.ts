// Analysis Queries
export {
  useAnalysisServiceStatus,
  useAnalysisHistory,
  useAnalyzePlant,
  useAnalyzePlantImage,
  useSaveToHistory,
  useDeleteFromHistory,
  useBatchAnalysis,
  useLatestAnalysis,
  useAnalysisStatistics,
  useAnalysisWithValidation,
  invalidateAnalysisQueries,
  prefetchAnalysisData
} from './useAnalysisQueries';

// Sensors Queries
export {
  useSensorData,
  useRooms,
  useRoom,
  useAutomationSettings,
  useSensorHistory,
  useSensorAlerts,
  useSensorCalibration,
  useExecuteSensorAction,
  useToggleRoom,
  useWaterNow,
  useToggleLights,
  useAdjustClimate,
  useUpdateAutomationSettings,
  useRoomControls,
  useSensorOptimalRanges,
  useSensorHealthCheck,
  useRealtimeSensorMonitor,
  invalidateSensorQueries,
  prefetchSensorData
} from './useSensorsQueries';