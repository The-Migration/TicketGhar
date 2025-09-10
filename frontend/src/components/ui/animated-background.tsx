import React from 'react';
import { cn } from '../../lib/utils';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  variant?: 'gradient' | 'dots' | 'waves' | 'geometric';
  className?: string;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  variant = 'gradient',
  className
}) => {
  const backgroundVariants = {
    gradient: 'bg-gradient-to-br from-purple-50 via-white to-blue-50',
    dots: 'bg-gradient-to-br from-purple-50 via-white to-blue-50 relative overflow-hidden',
    waves: 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden',
    geometric: 'bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden'
  };

  return (
    <div className={cn('min-h-screen', backgroundVariants[variant], className)}>
      {variant === 'dots' && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      )}
      
      {variant === 'waves' && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full filter blur-3xl animate-pulse animation-delay-1000"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
        </div>
      )}

      {variant === 'geometric' && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-20 left-20 w-32 h-32 bg-indigo-200/30 rotate-45 animate-spin-slow"></div>
            <div className="absolute top-40 right-20 w-24 h-24 bg-cyan-200/30 rotate-12 animate-bounce-slow"></div>
            <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-purple-200/30 rounded-full animate-pulse"></div>
            <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-blue-200/30 rotate-45 animate-spin-slow animation-delay-2000"></div>
          </div>
        </div>
      )}

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AnimatedBackground;
