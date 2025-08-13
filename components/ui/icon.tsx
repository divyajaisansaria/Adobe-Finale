import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
}

export const Icon = React.forwardRef<HTMLSpanElement, IconProps>(
  ({ name, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('material-symbols-outlined', className)}
        // --- THIS IS THE FIX ---
        // An inline style has the highest priority and will force the
        // browser to use the correct font for the icons, solving the
        // "PANEL_X" problem permanently.
        style={{ fontFamily: 'Material Symbols Outlined' }}
        {...props}
      >
        {name}
      </span>
    );
  }
);
Icon.displayName = 'Icon';