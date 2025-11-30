import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';

// =============================================================================
// Configuration
// =============================================================================

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes
const RETRY_DELAY = attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000);
const RETRY_COUNT = 3;

// =============================================================================
// Custom Error Classes
// =============================================================================

export class QueryError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public queryKey?: string[],
    public originalError?: Error
  ) {
    super(message);
    this.name = 'QueryError';
  }
}

// =============================================================================
// Global Query Client Configuration
// =============================================================================

const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        retry: RETRY_COUNT,
        retryDelay: RETRY_DELAY,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retryOnMount: true,
        errorRetryCount: RETRY_COUNT,
        errorRetryDelay: RETRY_DELAY,
        suspense: false,
        keepPreviousData: true,
        structuralSharing: true,
        notifyOnChangeProps: 'tracked',
        notifyOnChangePropsExclusions: ['isStale', 'isFetching', 'isRefetching']
      },
      mutations: {
        retry: 1,
        retryDelay: RETRY_DELAY,
        useErrorBoundary: false,
        throwOnError: false
      }
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Global query error handler
        console.error('Query error:', {
          error,
          queryKey: query.queryKey,
          queryHash: query.queryHash
        });

        // Log specific error types
        if (error instanceof QueryError) {
          console.error('QueryError details:', {
            status: error.status,
            code: error.code,
            queryKey: error.queryKey,
            originalError: error.originalError?.message
          });
        }
      },
      onSuccess: (data, query) => {
        // Global query success handler for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('Query success:', {
            queryKey: query.queryKey,
            dataSize: typeof data === 'object' ? JSON.stringify(data).length : String(data).length
          });
        }
      }
    }),
    mutationCache: new MutationCache({
      onError: (error, variables, context, mutation) => {
        // Global mutation error handler
        console.error('Mutation error:', {
          error,
          variables,
          mutationId: mutation.mutationId,
          mutationKey: mutation.options.mutationKey
        });
      },
      onSuccess: (data, variables, context, mutation) => {
        // Global mutation success handler for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('Mutation success:', {
            mutationKey: mutation.options.mutationKey,
            mutationId: mutation.mutationId,
            variables
          });
        }
      },
      onMutate: (variables, context, mutation) => {
        // Global mutation start handler
        console.log('Mutation started:', {
          mutationKey: mutation.options.mutationKey,
          mutationId: mutation.mutationId,
          variables
        });
      }
    })
  });
};

export const queryClient = createQueryClient();

// =============================================================================
// Provider Component
// =============================================================================

interface QueryProviderProps {
  children: React.ReactNode;
  client?: QueryClient;
}

export function QueryProvider({ children, client = queryClient }: QueryProviderProps) {
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// =============================================================================
// Query Key Factory
// =============================================================================

export const queryKeys = {
  // Analysis
  analysis: ['analysis'] as const,
  analysisHistory: ['analysis', 'history'] as const,
  analysisStatus: ['analysis', 'status'] as const,

  // Chat
  chat: ['chat'] as const,
  chatProviders: ['chat', 'providers'] as const,
  chatModels: (provider: string) => ['chat', 'models', provider] as const,

  // Sensors
  sensors: ['sensors'] as const,
  sensorHistory: (sensor: string, timeRange: string) => ['sensors', 'history', sensor, timeRange] as const,
  rooms: ['sensors', 'rooms'] as const,
  room: (id: string) => ['sensors', 'rooms', id] as const,
  automation: ['sensors', 'automation'] as const,
  sensorAlerts: ['sensors', 'alerts'] as const,
  sensorCalibration: ['sensors', 'calibration'] as const,

  // Strains
  strains: ['strains'] as const,
  strain: (id: string) => ['strains', id] as const,
  strainSearch: (query: string) => ['strains', 'search', query] as const,
  strainStats: ['strains', 'stats'] as const,
  strainComparison: (ids: string[]) => ['strains', 'compare', ...ids.sort()] as const,

  // Settings
  settings: ['settings'] as const,
  settingsProviders: ['settings', 'providers'] as const,
  agentEvolver: ['settings', 'agent-evolver'] as const,
  providerModels: (provider: string) => ['settings', 'models', provider] as const,
  providerTest: (provider: string) => ['settings', 'test', provider] as const,

  // Health/System
  health: ['health'] as const,
  version: ['version'] as const,
  aiProviders: ['ai', 'providers'] as const
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a custom query hook with error handling
 */
export function createQueryHook<TData, TError = Error>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options: {
    staleTime?: number;
    cacheTime?: number;
    retry?: number;
    retryDelay?: (attemptIndex: number) => number;
    enabled?: boolean;
    select?: (data: TData) => any;
    onSuccess?: (data: TData) => void;
    onError?: (error: TError) => void;
  } = {}
) {
  return function useCustomQuery(queryOptions = {}) {
    return React.useQuery({
      queryKey,
      queryFn,
      ...options,
      ...queryOptions,
      onError: (error: TError) => {
        console.error(`Query error for ${queryKey.join('.')}:`, error);
        options.onError?.(error);
      }
    });
  };
}

/**
 * Create a custom mutation hook with optimistic updates
 */
export function createMutationHook<TData, TError = Error, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onMutate?: (variables: TVariables) => Promise<TContext> | TContext;
    onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
    onError?: (error: TError, variables: TVariables, context: TContext) => void;
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext | undefined) => void;
    invalidateQueries?: string[][];
    optimisticUpdate?: {
      queryKey: string[];
      updateFn: (oldData: unknown, variables: TVariables) => unknown;
    };
  } = {}
) {
  return function useCustomMutation(mutationOptions = {}) {
    const queryClientInstance = React.useQueryClient();

    return React.useMutation({
      mutationFn,
      ...options,
      ...mutationOptions,
      onMutate: async (variables) => {
        // Cancel any outgoing refetches
        if (options.optimisticUpdate) {
          await queryClientInstance.cancelQueries({
            queryKey: options.optimisticUpdate.queryKey
          });
        }

        // Snapshot the previous value
        let previousData: unknown;
        if (options.optimisticUpdate) {
          previousData = queryClientInstance.getQueryData(options.optimisticUpdate.queryKey);
        }

        // Optimistically update to the new value
        if (options.optimisticUpdate && previousData !== undefined) {
          queryClientInstance.setQueryData(
            options.optimisticUpdate.queryKey,
            options.optimisticUpdate.updateFn(previousData, variables)
          );
        }

        // Call the original onMutate
        const context = await options.onMutate?.(variables);

        return { previousData, ...context };
      },
      onError: (error, variables, context) => {
        // Rollback on error
        if (options.optimisticUpdate && context?.previousData !== undefined) {
          queryClientInstance.setQueryData(
            options.optimisticUpdate.queryKey,
            context.previousData
          );
        }

        options.onError?.(error, variables, context);
      },
      onSettled: (data, error, variables, context) => {
        // Invalidate related queries
        if (options.invalidateQueries) {
          options.invalidateQueries.forEach(queryKey => {
            queryClientInstance.invalidateQueries({ queryKey });
          });
        }

        options.onSettled?.(data, error, variables, context);
      }
    });
  };
}

/**
 * Prefetch queries for better UX
 */
export function prefetchQueries(queryClient: QueryClient) {
  // Prefetch commonly accessed data
  queryClient.prefetchQuery({
    queryKey: queryKeys.sensors,
    staleTime: 30 * 1000, // 30 seconds for real-time data
    cacheTime: 5 * 60 * 1000 // 5 minutes
  });

  queryClient.prefetchQuery({
    queryKey: queryKeys.settings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000 // 30 minutes
  });

  queryClient.prefetchQuery({
    queryKey: queryKeys.strains,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 60 * 60 * 1000 // 1 hour
  });
}

/**
 * Invalidate queries after mutations
 */
export function invalidateAfterMutation(queryClient: QueryClient, mutationType: string) {
  const invalidationMap: Record<string, string[]> = {
    'analysis': [queryKeys.analysis, queryKeys.analysisHistory],
    'sensor': [queryKeys.sensors, queryKeys.sensorHistory('', ''), queryKeys.rooms, queryKeys.automation],
    'strain': [queryKeys.strains, queryKeys.strainStats],
    'settings': [queryKeys.settings, queryKeys.agentEvolver],
    'chat': [queryKeys.chatProviders]
  };

  const keysToInvalidate = invalidationMap[mutationType] || [];
  keysToInvalidate.forEach(queryKey => {
    queryClient.invalidateQueries({ queryKey });
  });
}

/**
 * Reset query client for logout/refresh scenarios
 */
export function resetQueries(queryClient: QueryClient) {
  queryClient.clear();
  prefetchQueries(queryClient);
}

/**
 * Get query stats for monitoring
 */
export function getQueryStats(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache();
  const mutationCache = queryClient.getMutationCache();

  return {
    queries: {
      total: cache.getAll().length,
      fetching: cache.getAll().filter(q => q.state.fetchStatus === 'fetching').length,
      stale: cache.getAll().filter(q => q.isStale()).length,
      error: cache.getAll().filter(q => q.state.status === 'error').length
    },
    mutations: {
      total: mutationCache.getAll().length,
      pending: mutationCache.getAll().filter(m => m.state.status === 'pending').length,
      error: mutationCache.getAll().filter(m => m.state.status === 'error').length
    }
  };
}

// =============================================================================
// Development Tools
// =============================================================================

if (process.env.NODE_ENV === 'development') {
  // Expose query client to window for debugging
  (window as any).__queryClient = queryClient;

  // Add global error listener for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message?.includes('Query')) {
      console.error('Unhandled query promise rejection:', event.reason);
    }
  });
}

export { queryKeys };