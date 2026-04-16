import React, { useState } from 'react';
import { Skeleton } from './Skeleton';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  containerClassName?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  containerClassName = '',
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 text-white/20 text-[10px] font-bold uppercase tracking-widest">
          Image Not Found
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
          {...props}
        />
      )}
    </div>
  );
};
