import React from 'react';
import { cn } from '../../lib/utils';

interface ColorfulBackgroundProps {
  children: React.ReactNode;
  variant?: 'rainbow' | 'aurora' | 'sunset' | 'ocean' | 'forest' | 'cosmic';
  className?: string;
}

const ColorfulBackground: React.FC<ColorfulBackgroundProps> = ({
  children,
  variant = 'rainbow',
  className
}) => {
  const variants = {
    rainbow: 'bg-gradient-to-br from-vibrant-pink-50 via-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-emerald-50',
    aurora: 'bg-gradient-to-br from-vibrant-purple-50 via-vibrant-pink-50 to-vibrant-orange-50',
    sunset: 'bg-gradient-to-br from-vibrant-orange-50 via-vibrant-pink-50 to-vibrant-purple-50',
    ocean: 'bg-gradient-to-br from-vibrant-blue-50 via-vibrant-cyan-50 to-vibrant-emerald-50',
    forest: 'bg-gradient-to-br from-vibrant-emerald-50 via-vibrant-cyan-50 to-vibrant-blue-50',
    cosmic: 'bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50',
  };

  return (
    <div className={cn('min-h-screen relative overflow-hidden', variants[variant], className)}>
      {/* Animated floating orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-vibrant-purple-300/30 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-vibrant-blue-300/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-vibrant-pink-300/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-40 right-40 w-80 h-80 bg-vibrant-emerald-300/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-vibrant-orange-300/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-3000"></div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent"></div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default ColorfulBackground;
