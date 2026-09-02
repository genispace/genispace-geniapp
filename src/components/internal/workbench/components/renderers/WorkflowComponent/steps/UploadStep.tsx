import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@genispace/shared-ui';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { UploadStepConfig } from '../types';
import { getIconComponent } from '@/lib/utils/icon';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { useTranslation } from 'react-i18next';

interface UploadStepProps {
  config: UploadStepConfig;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  uploadedFile: File | null;
  isProcessing?: boolean;
  icon?: string;
  title: string;
  description: string;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  config,
  onFileSelect,
  onRemove,
  uploadedFile,
  isProcessing = false,
  icon = 'FileText',
  title,
  description
}) => {
  const { t } = useTranslation('common');
  const isMobileFlow = useMobileFlowLayout();
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (config.maxSize && file.size > config.maxSize) {
      alert(t('workflow.file_too_large', 'File size exceeds the maximum allowed size of {{size}} MB', {
        size: (config.maxSize / 1024 / 1024).toFixed(2),
      }));
      return;
    }

    if (config.preview && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    onFileSelect(file);
  }, [config, onFileSelect]);

  const handleRemoveFile = useCallback(() => {
    setPreview(null);
    onRemove();
  }, [onRemove]);

  const IconComponent = getIconComponent(icon, 5);

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          {IconComponent}
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0">
        {!uploadedFile ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50/80 p-10 text-center transition-colors dark:border-neutral-600 dark:bg-neutral-900/40">
            <Upload className="mx-auto mb-4 h-10 w-10 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden />
            <input
              type="file"
              accept={config.accept || 'image/*,.pdf'}
              onChange={handleFileUpload}
              className="hidden"
              id="workflow-upload"
              multiple={config.multiple}
            />
            <label
              htmlFor="workflow-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              {config.buttonText || t('workflow.select_file', 'Select file')}
            </label>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {config.placeholder || t('workflow.supported_formats', 'Supported formats: {{formats}}', {
                formats: config.accept || 'PDF, JPG, PNG',
              })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {preview && (
              <div className="relative">
                <img
                  src={preview}
                  alt={t('workflow.file_preview', 'File preview')}
                  className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className={isMobileFlow ? 'flex min-w-0 flex-1 items-center gap-2' : 'flex items-center gap-2'}>
                <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                {/* narrow only: min-w-0 down the flex chain so the long filename can truncate */}
                <div className={isMobileFlow ? 'min-w-0' : undefined}>
                  <p className={isMobileFlow ? 'truncate text-sm font-medium text-gray-900 dark:text-gray-100' : 'text-sm font-medium text-gray-900 dark:text-gray-100'} title={uploadedFile.name}>{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                disabled={isProcessing}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {config.onUpload && (
              <Button
                onClick={() => config.onUpload?.(uploadedFile)}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('workflow.processing', 'Processing...')}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t('workflow.upload', 'Upload')}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
