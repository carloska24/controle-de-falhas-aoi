'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'table' | 'card' | 'chart';
  width?: string | number;
  height?: string | number;
  count?: number;
  animate?: boolean;
}

export default function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  count = 1,
  animate = true,
}: SkeletonProps) {
  const baseClasses = 'bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 bg-[length:200%_100%] rounded';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded-lg',
    table: 'h-12 rounded',
    card: 'rounded-xl h-32',
    chart: 'rounded-lg h-64',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  const skeletonContent = (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animate && 'animate-shimmer',
        className
      )}
      style={style}
      aria-busy="true"
      aria-label="Carregando..."
      role="status"
    />
  );

  if (count === 1) {
    return skeletonContent;
  }

  return (
    <div className="space-y-2" role="status" aria-busy="true" aria-label="Carregando...">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {skeletonContent}
        </div>
      ))}
    </div>
  );
}

