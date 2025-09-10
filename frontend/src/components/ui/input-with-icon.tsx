import React from 'react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '../../lib/utils';

interface InputWithIconProps extends React.ComponentProps<typeof Input> {
  icon: React.ReactNode;
  label?: string;
  error?: string;
  containerClassName?: string;
}

const InputWithIcon: React.FC<InputWithIconProps> = ({
  icon,
  label,
  error,
  containerClassName,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <Label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
          {label}
        </Label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <div className="h-4 w-4 text-gray-400">
            {icon}
          </div>
        </div>
        <Input
          id={inputId}
          className={cn(
            'pl-10 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default InputWithIcon;
