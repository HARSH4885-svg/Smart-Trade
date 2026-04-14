import React from 'react';
import { cn } from '../../lib/utils';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-skeleton bg-border/50 rounded-md", className)}
      {...props}
    />
  );
};

export default Skeleton;
