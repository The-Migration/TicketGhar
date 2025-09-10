import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { cn } from '../../lib/utils';

interface ColorfulCardProps extends React.ComponentProps<typeof Card> {
  colorScheme?: 'purple' | 'blue' | 'pink' | 'emerald' | 'orange' | 'cyan';
  variant?: 'solid' | 'gradient' | 'outline' | 'glass';
  hover?: boolean;
}

const ColorfulCard: React.FC<ColorfulCardProps> = ({
  children,
  colorScheme = 'purple',
  variant = 'gradient',
  hover = true,
  className,
  ...props
}) => {
  const colorSchemes = {
    purple: {
      solid: 'bg-vibrant-purple-500 text-white',
      gradient: 'bg-gradient-to-br from-vibrant-purple-400 to-vibrant-purple-600 text-white',
      outline: 'border-2 border-vibrant-purple-500 bg-vibrant-purple-50 text-vibrant-purple-700',
      glass: 'bg-vibrant-purple-100/20 backdrop-blur-sm border border-vibrant-purple-200/30 text-vibrant-purple-800',
    },
    blue: {
      solid: 'bg-vibrant-blue-500 text-white',
      gradient: 'bg-gradient-to-br from-vibrant-blue-400 to-vibrant-blue-600 text-white',
      outline: 'border-2 border-vibrant-blue-500 bg-vibrant-blue-50 text-vibrant-blue-700',
      glass: 'bg-vibrant-blue-100/20 backdrop-blur-sm border border-vibrant-blue-200/30 text-vibrant-blue-800',
    },
    pink: {
      solid: 'bg-vibrant-pink-500 text-white',
      gradient: 'bg-gradient-to-br from-vibrant-pink-400 to-vibrant-pink-600 text-white',
      outline: 'border-2 border-vibrant-pink-500 bg-vibrant-pink-50 text-vibrant-pink-700',
      glass: 'bg-vibrant-pink-100/20 backdrop-blur-sm border border-vibrant-pink-200/30 text-vibrant-pink-800',
    },
    emerald: {
      solid: 'bg-vibrant-emerald-500 text-white',
      gradient: 'bg-gradient-to-br from-vibrant-emerald-400 to-vibrant-emerald-600 text-white',
      outline: 'border-2 border-vibrant-emerald-500 bg-vibrant-emerald-50 text-vibrant-emerald-700',
      glass: 'bg-vibrant-emerald-100/20 backdrop-blur-sm border border-vibrant-emerald-200/30 text-vibrant-emerald-800',
    },
    orange: {
      solid: 'bg-vibrant-orange-500 text-white',
      gradient: 'bg-gradient-to-br from-vibrant-orange-400 to-vibrant-orange-600 text-white',
      outline: 'border-2 border-vibrant-orange-500 bg-vibrant-orange-50 text-vibrant-orange-700',
      glass: 'bg-vibrant-orange-100/20 backdrop-blur-sm border border-vibrant-orange-200/30 text-vibrant-orange-800',
    },
    cyan: {
      solid: 'bg-vibrant-cyan-500 text-white',
      gradient: 'bg-gradient-to-br from-vibrant-cyan-400 to-vibrant-cyan-600 text-white',
      outline: 'border-2 border-vibrant-cyan-500 bg-vibrant-cyan-50 text-vibrant-cyan-700',
      glass: 'bg-vibrant-cyan-100/20 backdrop-blur-sm border border-vibrant-cyan-200/30 text-vibrant-cyan-800',
    },
  };

  const hoverEffects = {
    purple: 'hover:shadow-purple-500/25 hover:shadow-2xl',
    blue: 'hover:shadow-blue-500/25 hover:shadow-2xl',
    pink: 'hover:shadow-pink-500/25 hover:shadow-2xl',
    emerald: 'hover:shadow-emerald-500/25 hover:shadow-2xl',
    orange: 'hover:shadow-orange-500/25 hover:shadow-2xl',
    cyan: 'hover:shadow-cyan-500/25 hover:shadow-2xl',
  };

  return (
    <Card
      className={cn(
        'transition-all duration-300 ease-in-out transform',
        colorSchemes[colorScheme][variant],
        hover && hoverEffects[colorScheme],
        hover && 'hover:scale-105',
        'animate-in fade-in-0 slide-in-from-bottom-4',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
};

export { ColorfulCard, CardContent, CardDescription, CardHeader, CardTitle };
