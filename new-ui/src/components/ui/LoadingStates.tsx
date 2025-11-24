import React from 'react';
import { Loader2, Activity, Zap, Brain } from 'lucide-react';

// =============================================================================
// Loading Component Props
// =============================================================================

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  inline?: boolean;
  centered?: boolean;
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  children?: React.ReactNode;
}

interface SkeletonProps {
  lines?: number;
  className?: string;
}

// =============================================================================
// Main Loading Component
// =============================================================================

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text,
  inline = false,
  centered = true,
  variant = 'spinner',
  color = 'primary',
  children
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  };

  const containerClasses = inline
    ? 'inline-flex items-center gap-2'
    : centered
    ? 'flex flex-col items-center justify-center gap-3 p-4'
    : 'flex items-center gap-2';

  const renderSpinner = () => (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`} />
  );

  const renderDots = () => (
    <div className="flex gap-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`rounded-full bg-current ${colorClasses[color]} animate-pulse`}
          style={{
            width: size === 'sm' ? '4px' : size === 'md' ? '6px' : size === 'lg' ? '8px' : '12px',
            height: size === 'sm' ? '4px' : size === 'md' ? '6px' : size === 'lg' ? '8px' : '12px',
            animationDelay: `${index * 0.2}s`
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <Activity className={`animate-pulse ${sizeClasses[size]} ${colorClasses[color]}`} />
  );

  const renderSkeleton = () => (
    <div className="animate-pulse">
      <div
        className={`rounded ${colorClasses[color]} opacity-20`}
        style={{
          width: size === 'sm' ? '32px' : size === 'md' ? '48px' : size === 'lg' ? '64px' : '96px',
          height: size === 'sm' ? '32px' : size === 'md' ? '48px' : size === 'lg' ? '64px' : '96px'
        }}
      />
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'skeleton':
        return renderSkeleton();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={containerClasses}>
      {children || renderVariant()}
      {text && (
        <span className={`text-${size === 'sm' ? 'sm' : size === 'md' ? 'base' : size === 'lg' ? 'lg' : 'xl'} ${colorClasses[color]}`}>
          {text}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// Specialized Loading Components
// =============================================================================

export const PageLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Loading size="xl" text={message} />
    </div>
  </div>
);

export const CardLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
    <Loading text={message} centered />
  </div>
);

export const InlineLoading: React.FC<{ message?: string }> = ({ message }) => (
  <Loading size="sm" text={message} inline />
);

export const AnalysisLoading: React.FC<{ progress?: number; message?: string }> = ({
  progress,
  message = 'Analyzing plant health...'
}) => (
  <div className="bg-white rounded-lg p-6 border border-gray-200">
    <div className="flex items-center gap-3 mb-4">
      <Brain className="w-6 h-6 text-blue-600 animate-pulse" />
      <span className="font-medium text-gray-900">AI Analysis in Progress</span>
    </div>

    {progress !== undefined && (
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )}

    <p className="text-gray-600 text-sm">{message}</p>
  </div>
);

export const SensorLoading: React.FC<{ message?: string }> = ({ message = 'Reading sensors...' }) => (
  <div className="flex items-center gap-2 text-green-600">
    <Zap className="w-4 h-4 animate-pulse" />
    <span className="text-sm">{message}</span>
  </div>
);

// =============================================================================
// Skeleton Components
// =============================================================================

export const Skeleton: React.FC<SkeletonProps> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <div
        key={index}
        className="animate-pulse bg-gray-200 rounded"
        style={{
          width: index === lines - 1 ? '60%' : '100%',
          height: '1rem'
        }}
      />
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
    <Skeleton lines={lines} />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="divide-y divide-gray-200">
      {/* Header */}
      <div className="p-4 bg-gray-50">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse bg-gray-300 rounded h-4"
            />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="animate-pulse bg-gray-200 rounded h-4"
                style={{
                  width: colIndex === columns - 1 ? '70%' : '100%'
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index}>
        <div className="animate-pulse bg-gray-300 rounded h-4 w-24 mb-2" />
        <div className="animate-pulse bg-gray-200 rounded h-10 w-full" />
      </div>
    ))}
    <div className="animate-pulse bg-gray-300 rounded h-10 w-32" />
  </div>
);

// =============================================================================
// Loading Hook
// =============================================================================

interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  setProgress: (progress: number) => void;
  setLoadingMessage: (message: string) => void;
}

export function useLoading(initialState: boolean = false): LoadingState {
  const [isLoading, setIsLoading] = React.useState(initialState);
  const [loadingMessage, setLoadingMessage] = React.useState<string>();
  const [progress, setProgress] = React.useState<number>();

  const startLoading = React.useCallback((message?: string) => {
    setIsLoading(true);
    setLoadingMessage(message);
    setProgress(undefined);
  }, []);

  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(undefined);
    setProgress(undefined);
  }, []);

  const setProgressValue = React.useCallback((newProgress: number) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
  }, []);

  return {
    isLoading,
    loadingMessage,
    progress,
    startLoading,
    stopLoading,
    setProgress: setProgressValue,
    setLoadingMessage
  };
}

// =============================================================================
// Higher-Order Component for Loading
// =============================================================================

export function withLoading<P extends object>(
  Component: React.ComponentType<P & { loading?: boolean; loadingMessage?: string }>
) {
  const WrappedComponent = ({ loading, loadingMessage, ...props }: P & {
    loading?: boolean;
    loadingMessage?: string;
  }) => {
    if (loading) {
      return <Loading text={loadingMessage || 'Loading...'} centered />;
    }

    return <Component {...(props as P)} />;
  };

  WrappedComponent.displayName = `withLoading(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default Loading;