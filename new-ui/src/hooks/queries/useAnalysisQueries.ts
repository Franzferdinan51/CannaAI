import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisService } from '@/services/analysisService';
import { queryKeys, createMutationHook, QueryError } from '@/lib/query/client';
import {
  PlantAnalysisRequest,
  PlantAnalysisResponse,
  HistoryEntry,
  CreateHistoryEntryRequest
} from '@/types/api';

// =============================================================================
// Query Hooks
// =============================================================================

export function useAnalysisServiceStatus() {
  return useQuery({
    queryKey: queryKeys.analysisStatus,
    queryFn: () => analysisService.getServiceStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });
}

export function useAnalysisHistory() {
  return useQuery({
    queryKey: queryKeys.analysisHistory,
    queryFn: () => analysisService.getAnalysisHistory(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useAnalyzePlant() {
  const queryClient = useQueryClient();

  return useMutation<PlantAnalysisResponse, Error, PlantAnalysisRequest>({
    mutationFn: (request) => analysisService.analyzePlant(request),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.analysis });

      // Snapshot the previous value
      const previousAnalyses = queryClient.getQueryData(queryKeys.analysisHistory);

      return { previousAnalyses };
    },
    onError: (error, variables, context) => {
      console.error('Plant analysis failed:', error);

      // Don't rollback on error since analysis is a standalone operation
    },
    onSuccess: (data, variables, context) => {
      console.log('Plant analysis completed successfully');

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.analysisHistory });

      // Optionally update analysis cache
      queryClient.setQueryData(['analysis', 'latest'], data);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.analysisHistory });
    }
  });
}

export function useAnalyzePlantImage() {
  const queryClient = useQueryClient();

  return useMutation<PlantAnalysisResponse, Error, {
    file: File;
    analysisData: Omit<PlantAnalysisRequest, 'plantImage'>;
    onProgress?: (progress: number) => void;
  }>({
    mutationFn: async ({ file, analysisData, onProgress }) => {
      return analysisService.analyzePlantImage(file, analysisData, onProgress);
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.analysis });

      return { timestamp: Date.now() };
    },
    onError: (error, variables, context) => {
      console.error('Plant image analysis failed:', error);
    },
    onSuccess: (data, variables, context) => {
      console.log('Plant image analysis completed successfully');

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.analysisHistory });
      queryClient.setQueryData(['analysis', 'latest'], data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analysisHistory });
    }
  });
}

export function useSaveToHistory() {
  const queryClient = useQueryClient();

  return createMutationHook(
    (data: CreateHistoryEntryRequest) => analysisService.saveToHistory(data),
    {
      onSuccess: () => {
        console.log('Analysis saved to history');
      },
      onError: (error) => {
        console.error('Failed to save analysis to history:', error);
      },
      invalidateQueries: [queryKeys.analysisHistory]
    }
  )();
}

export function useDeleteFromHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => analysisService.deleteFromHistory(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.analysisHistory });

      // Snapshot the previous value
      const previousHistory = queryClient.getQueryData(queryKeys.analysisHistory);

      // Optimistically remove from history
      queryClient.setQueryData(queryKeys.analysisHistory, (old: any) => {
        if (!old?.history) return old;
        return {
          ...old,
          history: old.history.filter((entry: HistoryEntry) => entry.id !== id),
          count: old.count - 1
        };
      });

      return { previousHistory, deletedId: id };
    },
    onError: (error, id, context) => {
      console.error('Failed to delete analysis from history:', error);

      // Rollback on error
      if (context?.previousHistory) {
        queryClient.setQueryData(queryKeys.analysisHistory, context.previousHistory);
      }
    },
    onSuccess: () => {
      console.log('Analysis deleted from history successfully');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.analysisHistory });
    }
  });
}

export function useBatchAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<PlantAnalysisResponse[], Error, PlantAnalysisRequest[]>({
    mutationFn: (requests) => analysisService.batchAnalyze(requests),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.analysis });

      return { requestCount: variables.length };
    },
    onError: (error, variables, context) => {
      console.error(`Batch analysis failed for ${variables.length} requests:`, error);
    },
    onSuccess: (data, variables, context) => {
      console.log(`Batch analysis completed successfully for ${data.length} requests`);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.analysisHistory });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analysisHistory });
    }
  });
}

// =============================================================================
// Compound Hooks
// =============================================================================

export function useLatestAnalysis() {
  return useQuery({
    queryKey: ['analysis', 'latest'],
    queryFn: async () => {
      const history = await analysisService.getAnalysisHistory();
      return history.success && history.history?.length > 0
        ? history.history[0]
        : null;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    enabled: true // Only fetch if we have history
  });
}

export function useAnalysisStatistics() {
  return useQuery({
    queryKey: ['analysis', 'statistics'],
    queryFn: async () => {
      const history = await analysisService.getAnalysisHistory();

      if (!history.success || !history.history) {
        return {
          totalAnalyses: 0,
          averageConfidence: 0,
          averageHealthScore: 0,
          purpleStrainAnalyses: 0,
          commonDiagnoses: {},
          analysesByMonth: {}
        };
      }

      const analyses = history.history;
      const totalAnalyses = analyses.length;
      const averageConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / totalAnalyses;
      const averageHealthScore = analyses.reduce((sum, a) => sum + a.healthScore, 0) / totalAnalyses;
      const purpleStrainAnalyses = analyses.filter(a => a.isPurpleStrain).length;

      // Common diagnoses
      const diagnosisCounts: Record<string, number> = {};
      analyses.forEach(analysis => {
        const diagnosis = analysis.diagnosis.toLowerCase();
        diagnosisCounts[diagnosis] = (diagnosisCounts[diagnosis] || 0) + 1;
      });

      // Analyses by month
      const analysesByMonth: Record<string, number> = {};
      analyses.forEach(analysis => {
        const month = new Date(analysis.date).toISOString().slice(0, 7); // YYYY-MM
        analysesByMonth[month] = (analysesByMonth[month] || 0) + 1;
      });

      return {
        totalAnalyses,
        averageConfidence: Math.round(averageConfidence),
        averageHealthScore: Math.round(averageHealthScore),
        purpleStrainAnalyses,
        commonDiagnoses: Object.entries(diagnosisCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .reduce((obj, [diagnosis, count]) => ({ ...obj, [diagnosis]: count }), {}),
        analysesByMonth
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000 // 15 minutes
  });
}

export function useAnalysisWithValidation() {
  const analysisMutation = useAnalyzePlant();

  const analyzeWithValidation = (request: PlantAnalysisRequest) => {
    const validation = analysisService.validateRequest(request);

    if (!validation.isValid) {
      const error = new QueryError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        queryKeys.analysis,
        new Error(validation.errors.join(', '))
      );
      throw error;
    }

    return analysisMutation.mutateAsync(request);
  };

  return {
    ...analysisMutation,
    analyzeWithValidation,
    validateRequest: analysisService.validateRequest
  };
}

// =============================================================================
// Utilities
// =============================================================================

export function invalidateAnalysisQueries(queryClient: any) {
  queryClient.invalidateQueries({ queryKey: queryKeys.analysis });
  queryClient.invalidateQueries({ queryKey: queryKeys.analysisHistory });
  queryClient.invalidateQueries({ queryKey: queryKeys.analysisStatus });
}

export function prefetchAnalysisData(queryClient: any) {
  queryClient.prefetchQuery({
    queryKey: queryKeys.analysisStatus,
    queryFn: () => analysisService.getServiceStatus()
  });

  queryClient.prefetchQuery({
    queryKey: queryKeys.analysisHistory,
    queryFn: () => analysisService.getAnalysisHistory()
  });
}