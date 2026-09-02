import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Z_INDEX_CLASSES } from '@genispace/shared-ui';
import Loading from '../Loading';
import { cn } from '@genispace/shared-utils';
import { useTranslation } from 'react-i18next';

interface LoadingRendererProps {
  text?: string;
  size?: 'small' | 'default' | 'large';
  className?: string;
  title?: string;
  height?: number;
  mode?: 'standalone' | 'overlay' | 'inline';
  showCard?: boolean;
  children?: React.ReactNode;
}

const LoadingRenderer: React.FC<LoadingRendererProps> = ({
  text,
  size = 'default',
  className = '',
  title,
  height = 400,
  mode = 'standalone',
  showCard = true,
  children,
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const loadingText = text || t('loading.text', 'Loading...');
  const getLoadingSize = () => {
    switch (size) {
      case 'small':
        return 'sm';
      case 'large':
        return 'lg';
      case 'default':
      default:
        return 'md';
    }
  };

  if (mode === 'inline') {
    return (
      <div className={cn("flex items-center justify-center gap-2 py-4", className)}>
        <Loading size={getLoadingSize()} />
        <span className="text-sm text-muted-foreground">{loadingText}</span>
      </div>
    );
  }

  if (mode === 'overlay') {
    return (
      <div className="relative">
        {children}
        <div className={`absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center ${Z_INDEX_CLASSES.STICKY_HEADER}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loading size={getLoadingSize()} />
            <span>{loadingText}</span>
          </div>
        </div>
      </div>
    );
  }

  const LoadingContent = (
    <div 
      className="flex flex-col items-center justify-center gap-3"
      style={{ height: mode === 'standalone' ? `${height}px` : 'auto' }}
    >
      <Loading size={getLoadingSize()} className="mx-auto" />
      <span className="text-sm text-muted-foreground">{loadingText}</span>
    </div>
  );

  if (!showCard) {
    return <div className={cn("p-4", className)}>{LoadingContent}</div>;
  }

  return (
    <Card className={cn("bg-white dark:bg-neutral-800", className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-6">
        {LoadingContent}
      </CardContent>
    </Card>
  );
};

export default LoadingRenderer; 