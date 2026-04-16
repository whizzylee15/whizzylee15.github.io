import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div 
      className={`animate-pulse bg-white/5 rounded-lg ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s infinite linear'
      }}
    />
  );
};

export const SkeletonCircle: React.FC<SkeletonProps> = ({ className = '' }) => {
  return <Skeleton className={`rounded-full ${className}`} />;
};

export const SkeletonText: React.FC<SkeletonProps> = ({ className = '' }) => {
  return <Skeleton className={`h-4 w-full ${className}`} />;
};
