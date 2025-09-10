import React from 'react';
import { cn } from '../../lib/utils';

interface NeonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: 'purple' | 'blue' | 'pink' | 'emerald' | 'orange' | 'cyan';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  animated?: boolean;
}

const NeonText: React.FC<NeonTextProps> = ({
  children,
  color = 'purple',
  size = 'md',
  animated = true,
  className,
  ...props
}) => {
  const colorClasses = {
    purple: 'text-vibrant-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]',
    blue: 'text-vibrant-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    pink: 'text-vibrant-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]',
    emerald: 'text-vibrant-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    orange: 'text-vibrant-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]',
    cyan: 'text-vibrant-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]',
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  const animationClass = animated ? 'animate-glow' : '';

  return (
    <div
      className={cn(
        'font-bold transition-all duration-300',
        colorClasses[color],
        sizeClasses[size],
        animationClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default NeonText;
