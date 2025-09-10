import React from 'react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '../../lib/utils';

interface ColorfulInputProps extends React.ComponentProps<typeof Input> {
  icon?: React.ReactNode;
  label?: string;
  error?: string;
  colorScheme?: 'purple' | 'blue' | 'pink' | 'emerald' | 'orange' | 'cyan';
  containerClassName?: string;
}

const ColorfulInput: React.FC<ColorfulInputProps> = ({
  icon,
  label,
  error,
  colorScheme = 'purple',
  containerClassName,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const colorSchemes = {
    purple: {
      focus: 'focus:border-vibrant-purple-500 focus:ring-vibrant-purple-500/20',
      error: 'border-vibrant-pink-500 focus:ring-vibrant-pink-500/20',
      icon: 'text-vibrant-purple-400',
    },
    blue: {
      focus: 'focus:border-vibrant-blue-500 focus:ring-vibrant-blue-500/20',
      error: 'border-vibrant-pink-500 focus:ring-vibrant-pink-500/20',
      icon: 'text-vibrant-blue-400',
    },
    pink: {
      focus: 'focus:border-vibrant-pink-500 focus:ring-vibrant-pink-500/20',
      error: 'border-vibrant-pink-500 focus:ring-vibrant-pink-500/20',
      icon: 'text-vibrant-pink-400',
    },
    emerald: {
      focus: 'focus:border-vibrant-emerald-500 focus:ring-vibrant-emerald-500/20',
      error: 'border-vibrant-pink-500 focus:ring-vibrant-pink-500/20',
      icon: 'text-vibrant-emerald-400',
    },
    orange: {
      focus: 'focus:border-vibrant-orange-500 focus:ring-vibrant-orange-500/20',
      error: 'border-vibrant-pink-500 focus:ring-vibrant-pink-500/20',
      icon: 'text-vibrant-orange-400',
    },
    cyan: {
      focus: 'focus:border-vibrant-cyan-500 focus:ring-vibrant-cyan-500/20',
      error: 'border-vibrant-pink-500 focus:ring-vibrant-pink-500/20',
      icon: 'text-vibrant-cyan-400',
    },
  };

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <Label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
          {label}
        </Label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className={cn('h-4 w-4', colorSchemes[colorScheme].icon)}>
              {icon}
            </div>
          </div>
        )}
        <Input
          id={inputId}
          className={cn(
            'transition-all duration-200 border-2',
            icon && 'pl-10',
            error ? colorSchemes[colorScheme].error : colorSchemes[colorScheme].focus,
            'focus:ring-2 focus:ring-offset-0',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-vibrant-pink-600 flex items-center gap-1 animate-fade-in">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default ColorfulInput;
