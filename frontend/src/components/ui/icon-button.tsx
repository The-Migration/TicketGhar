import React from 'react';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface IconButtonProps extends Omit<React.ComponentProps<typeof Button>, 'size'> {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'outline',
  size = 'md',
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  return (
    <Button
      variant={variant}
      size="icon"
      className={cn(
        sizeClasses[size],
        'transition-all duration-200 hover:scale-105 hover:shadow-lg',
        className
      )}
      aria-label={label}
      {...props}
    >
      {icon}
    </Button>
  );
};

export default IconButton;
