import React, { useCallback } from 'react';
import { Upload, X, FileText, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import { useTranslation } from 'react-i18next';

interface FileUploadValue {
  name: string;
  size: number;
  type: string;
  url: string;
  fileId: string;
  status: 'uploaded';
}

interface FileUploadDropzoneProps {
  fieldId: string;
  value: FileUploadValue | null;
  isUploading?: { file: File; progress: number };
  accept?: Record<string, string[]>;
  description?: string;
  onUpload: (fieldId: string, file: File) => void;
  onRemove: (fieldId: string) => void;
}

const FileUploadDropzone: React.FC<FileUploadDropzoneProps> = ({
  fieldId,
  value,
  isUploading,
  accept,
  description,
  onUpload,
  onRemove
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(fieldId, acceptedFiles[0]);
    }
  }, [fieldId, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
    disabled: !!isUploading || Boolean(value && value.status === 'uploaded')
  });

  if (value && value.status === 'uploaded') {
    return (
      <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.name}</p>
            <p className="text-xs text-muted-foreground">{(value.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(fieldId)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'flex min-h-[200px] cursor-pointer flex-col rounded-lg border-2 border-dashed p-10 transition-all',
          'border-neutral-300 bg-neutral-50/80 dark:border-neutral-600 dark:bg-neutral-900/40',
          isDragActive
            ? 'border-primary bg-primary/10 dark:border-primary dark:bg-primary/15'
            : 'hover:border-neutral-400 hover:bg-neutral-100/90 dark:hover:border-neutral-500 dark:hover:bg-neutral-800/55',
          isUploading && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Upload
            className="mb-4 h-10 w-10 shrink-0 text-neutral-500 dark:text-neutral-400"
            aria-hidden
          />
          <p className="mb-1.5 text-sm font-medium text-foreground">
            {isDragActive ? t('file_upload.drop_active', 'Release to upload file') : t('file_upload.drop_zone', 'Drag file here or click to upload')}
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            {description || t('file_upload.supported_formats', 'Supports various document formats')}
          </p>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate flex-1 mr-2">{isUploading.file.name}</span>
            <span className="text-muted-foreground text-xs flex-shrink-0">{isUploading.progress}%</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${isUploading.progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadDropzone;

