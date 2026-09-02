import React from 'react';
import { Z_INDEX_CLASSES } from '@genispace/shared-ui';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  className = '',
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const loadingElement = (
    <div className={`animate-spin rounded-full border-b-2 border-accent ${sizeClasses[size]} ${className}`}></div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 flex justify-center items-center bg-white dark:bg-neutral-800 bg-opacity-75 dark:bg-opacity-75 ${Z_INDEX_CLASSES.MODAL_BACKDROP}`}>
        {loadingElement}
      </div>
    );
  }

  return loadingElement;
};

export default Loading; 