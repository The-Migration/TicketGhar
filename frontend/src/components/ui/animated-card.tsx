import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { cn } from '../../lib/utils';

interface AnimatedCardProps extends React.ComponentProps<typeof Card> {
  hover?: boolean;
  delay?: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  hover = true,
  delay = 0,
  className,
  ...props
}) => {
  return (
    <Card
      className={cn(
        'transition-all duration-300 ease-in-out transform',
        hover && 'hover:scale-105 hover:shadow-2xl',
        'animate-in fade-in-0 slide-in-from-bottom-4',
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'both'
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

export { AnimatedCard, CardContent, CardDescription, CardHeader, CardTitle };
