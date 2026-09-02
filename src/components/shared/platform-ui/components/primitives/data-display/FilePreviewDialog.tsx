import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog';
import { MODAL_DIMENSIONS } from '../../../styles/design-tokens';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { X, Download, FileSpreadsheet, Loader2, Copy, Check, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import * as XLSX from 'xlsx';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTranslation } from 'react-i18next';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 

// 

//   node scripts/setup-pdf-worker.js
//

//   cp node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs

if (typeof window !== 'undefined') {

  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface FilePreviewDialogProps {

  open: boolean;

  onClose: () => void;

  fileUrl?: string;

  fileName: string;

  mimeType?: string;

  fileSize?: number;

  showDownload?: boolean;

  onDownload?: () => void | Promise<void>;

  fileId?: string;

  getFileUrl?: (fileId: string) => Promise<string>;

  publicUrl?: string;

  onCopyLink?: (publicUrl: string) => void | Promise<void>;

  getAuthToken?: () => string | null;
}

interface SheetData {
  name: string;
  data: unknown[][];
}

function getFileExtension(fileName: string) {
  return fileName.toLowerCase().split('.').pop() || '';
}

function isImageFile(mimeType: string, fileName: string) {
  const ext = getFileExtension(fileName);
  return (
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)
  );
}

function isVideoFile(mimeType: string, fileName: string) {
  const ext = getFileExtension(fileName);
  return (
    mimeType.startsWith('video/') ||
    ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)
  );
}

function isAudioFile(mimeType: string, fileName: string) {
  const ext = getFileExtension(fileName);
  return (
    mimeType.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)
  );
}

function isPdfFile(mimeType: string, fileName: string) {
  const ext = getFileExtension(fileName);
  return mimeType === 'application/pdf' || ext === 'pdf';
}

function isExcelFile(mimeType: string, fileName: string) {
  const ext = getFileExtension(fileName);
  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ['xlsx', 'xls'].includes(ext)
  );
}

function isWordFile(mimeType: string, fileName: string) {
  const ext = getFileExtension(fileName);
  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    ['docx', 'doc'].includes(ext)
  );
}

function isPowerPointFile(mimeType: string, fileName: string) {
  const ext = getFileExtension(fileName);
  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    ['pptx', 'ppt'].includes(ext)
  );
}

function isMarkdownFile(mimeType: string, fileName: string) {
  const ext = getFileExtension(fileName);
  return mimeType === 'text/markdown' || ext === 'md' || ext === 'markdown';
}

function isTextFile(mimeType: string, fileName: string) {
  const ext = getFileExtension(fileName);
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    ['txt', 'json', 'xml', 'csv', 'log'].includes(ext)
  );
}

export const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
  open,
  onClose,
  fileUrl: providedFileUrl,
  fileName,
  mimeType = '',
  fileSize,
  showDownload = true,
  onDownload,
  fileId,
  getFileUrl,
  publicUrl,
  onCopyLink,
  getAuthToken,
}: FilePreviewDialogProps) => {
  const { t } = useTranslation('common');
  const [excelData, setExcelData] = useState<SheetData[]>([]);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [loadingText, setLoadingText] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const imageBlobUrlRef = useRef<string | null>(null);
  imageBlobUrlRef.current = imageBlobUrl;
  const blobUrlRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const pdfFileUrlRef = useRef<string>('');

  const pdfSource = useMemo(() => fileUrl, [fileUrl]);

  useEffect(() => {
    if (!open) {

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setFileUrl('');
      setLoadingFile(false);
      setLoadError(null);

      setNumPages(null);
      setPageNumber(1);
      setScale(1.0);
      setPdfLoading(false);
      setPdfError(null);
      pdfFileUrlRef.current = '';

      setImageLoading(true);
      setImageError(null);
      setCurrentImageUrl('');

      const imageBlobToRevoke = imageBlobUrlRef.current;
      if (imageBlobToRevoke) {
        URL.revokeObjectURL(imageBlobToRevoke);
        setImageBlobUrl(null);
      }
      return;
    }

    if (providedFileUrl && providedFileUrl.trim()) {

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setFileUrl(providedFileUrl);
      setLoadingFile(false);
      setLoadError(null);

      return;
    }

    if (fileId && getFileUrl && !loadingRef.current) {
      loadingRef.current = true;
      setLoadingFile(true);
      setLoadError(null);

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      getFileUrl(fileId)
        .then(url => {
          blobUrlRef.current = url;
          setFileUrl(url);
          setLoadingFile(false);
        })
        .catch(error => {
          console.error('Failed to get file URL:', error);
          setLoadError(error.message || t('file_preview.failed_to_load_file', 'Failed to load file'));
          setLoadingFile(false);
        })
        .finally(() => {
          loadingRef.current = false;
        });
      return;
    }

    if (!providedFileUrl && (!fileId || !getFileUrl)) {
      setFileUrl('');
      setLoadingFile(false);
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      loadingRef.current = false;
    };
  }, [open, fileId, getFileUrl, providedFileUrl, t]);

  useEffect(() => {
    return () => {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
      }
    };
  }, [imageBlobUrl]);

  useEffect(() => {
    if (open && isImageFile(mimeType, fileName) && fileUrl) {
      const loadImageFromContent = async () => {
        try {
          setImageLoading(true);
          setImageError(null);

          const prevBlob = imageBlobUrlRef.current;
          if (prevBlob) {
            URL.revokeObjectURL(prevBlob);
            setImageBlobUrl(null);
          }

          const headers: HeadersInit = {};
          if (getAuthToken) {
            try {
              const token = getAuthToken();
              if (token) {
                headers['Authorization'] = `Bearer ${token}`;
              } else {
                console.warn('getAuthToken 返回 null，请求可能失败');
              }
            } catch (error) {
              console.error('获取认证 token 失败:', error);
            }
          } else {
            console.warn('getAuthToken 函数未提供，请求可能失败');
          }

          const response = await fetch(fileUrl, {
            credentials: 'include',
            headers
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const contentType = response.headers.get('Content-Type') || mimeType || 'image/jpeg';

          const arrayBuffer = await response.arrayBuffer();

          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error(t('file_preview.image_data_empty', 'Image data is empty'));
          }

          const blob = new Blob([arrayBuffer], { type: contentType });

          const blobUrl = URL.createObjectURL(blob);

          setImageBlobUrl(blobUrl);
          setCurrentImageUrl(blobUrl);
          setImageLoading(false);
        } catch (error) {
          console.error('Failed to load image via /content endpoint:', error);
          setImageError(t('file_preview.image_load_failed', 'Image load failed: {{error}}', { error: error instanceof Error ? error.message : t('file_preview.unknown_error', 'Unknown error') }));
          setImageLoading(false);

          setCurrentImageUrl('');
          const failedBlob = imageBlobUrlRef.current;
          if (failedBlob) {
            URL.revokeObjectURL(failedBlob);
            setImageBlobUrl(null);
          }
        }
      };

      loadImageFromContent();
    } else if (!open) {

      setCurrentImageUrl('');
      setImageLoading(true);
      setImageError(null);
      const closeBlob = imageBlobUrlRef.current;
      if (closeBlob) {
        URL.revokeObjectURL(closeBlob);
        setImageBlobUrl(null);
      }
    }
  }, [open, fileUrl, mimeType, fileName, getAuthToken, t]);

  const handleCopyLink = async () => {
    if (!publicUrl) return;

    if (onCopyLink) {
      await onCopyLink(publicUrl);
    } else {
      try {
        await navigator.clipboard.writeText(publicUrl);
      } catch {

        const textArea = document.createElement('textarea');
        textArea.value = publicUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (open && isExcelFile(mimeType, fileName) && fileUrl) {
      setLoadingExcel(true);
      fetch(fileUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheets: SheetData[] = workbook.SheetNames.map(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
            return { name: sheetName, data };
          });
          setExcelData(sheets);
        })
        .catch(error => {
          console.error('Failed to parse Excel file:', error);
          setLoadError(t('file_preview.failed_to_parse_excel', 'Failed to parse Excel file'));
        })
        .finally(() => {
          setLoadingExcel(false);
        });
    }
  }, [open, fileUrl, mimeType, fileName, t]);

  useEffect(() => {
    if (open && (isTextFile(mimeType, fileName) || isMarkdownFile(mimeType, fileName)) && fileUrl) {
      setLoadingText(true);
      fetch(fileUrl)
        .then(res => res.text())
        .then(text => {
          setTextContent(text);
        })
        .catch(error => {
          console.error('Failed to load text file:', error);
          setLoadError(t('file_preview.failed_to_load_text_file', 'Failed to load text file'));
        })
        .finally(() => {
          setLoadingText(false);
        });
    }
  }, [open, fileUrl, mimeType, fileName, t]);

  const handleDownload = async () => {
    if (onDownload) {
      await onDownload();
      return;
    }

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const renderPreview = () => {
    if (loadingFile) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-neutral-500" />
            <p className="text-neutral-500">{t('file_preview.loading_file', 'Loading file...')}</p>
          </div>
        </div>
      );
    }

    const isImage = isImageFile(mimeType, fileName);
    if (loadError && !isImage) {
      return (
        <div className="flex flex-col items-center justify-center p-12 gap-4 text-neutral-500">
          <p className="text-lg font-medium">{t('file_preview.failed_to_load_file', 'Failed to load file')}</p>
          <p className="text-sm text-neutral-400">{loadError}</p>
        </div>
      );
    }

    if (!fileUrl && !publicUrl) {
      return (
        <div className="flex flex-col items-center justify-center p-12 gap-4 text-neutral-500">
          <p className="text-lg font-medium">{t('file_preview.failed_to_load_file', 'Failed to load file')}</p>
          <p className="text-sm text-neutral-400">{t('file_preview.file_url_unavailable', 'File URL unavailable')}</p>
        </div>
      );
    }

    if (isPdfFile(mimeType, fileName)) {

      if (!fileUrl || !fileUrl.trim()) {
        return (
          <div className="flex flex-col items-center justify-center p-12 gap-4 text-neutral-500">
            <p className="text-lg font-medium">{t('file_preview.failed_to_load_file', 'Failed to load file')}</p>
            <p className="text-sm text-neutral-400">{t('file_preview.file_url_unavailable', 'File URL unavailable')}</p>
          </div>
        );
      }

      const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);

        if (!pdfFileUrlRef.current || pdfFileUrlRef.current !== fileUrl) {
          setPageNumber(1);
          pdfFileUrlRef.current = fileUrl;
        }
        setPdfLoading(false);
        setPdfError(null);
      };

      const onDocumentLoadError = (error: Error) => {
        console.error('PDF load failed:', error);

        let errorMessage = t('file_preview.failed_to_load_pdf', 'Failed to load PDF file');
        if (error.message) {
          if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
            errorMessage = t('file_preview.cors_error', 'CORS error: Please check the CORS settings of the file URL');
          } else if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage = t('file_preview.auth_error', 'Authentication error: Please ensure you are logged in');
          } else if (error.message.includes('404')) {
            errorMessage = t('file_preview.file_not_found', 'File not found: Please check the file URL');
          } else {
            errorMessage = error.message;
          }
        }
        setPdfError(errorMessage);
        setPdfLoading(false);
      };

      const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.25, 3.0));
      };

      const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.25, 0.5));
      };

      const goToPrevPage = () => {
        setPageNumber(prev => Math.max(1, prev - 1));
      };

      const goToNextPage = () => {
        setPageNumber(prev => (numPages ? Math.min(numPages, prev + 1) : prev));
      };

      return (
        <div className="flex flex-col h-[70vh] bg-neutral-100 dark:bg-neutral-900">
          <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="h-8 px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-neutral-600 dark:text-neutral-400 min-w-[100px] text-center">
                {pageNumber} / {numPages || '--'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={!numPages || pageNumber >= numPages}
                className="h-8 px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="h-8 px-2"
                title={t('file_preview.zoom_out', 'Zoom out')}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-neutral-600 dark:text-neutral-400 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
                className="h-8 px-2"
                title={t('file_preview.zoom_in', 'Zoom in')}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 flex justify-center custom-scrollbar">
            {pdfError ? (
              <div className="flex flex-col items-center justify-center p-12 gap-4 text-neutral-500">
                <p className="text-lg font-medium">{t('file_preview.failed_to_load_pdf', 'Failed to load PDF file')}</p>
                <p className="text-sm text-neutral-400">{pdfError}</p>
                <p className="text-xs text-neutral-400 mt-4">
                  {t('file_preview.auth_hint', 'Tip: If the file requires authentication, please ensure you are logged in')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Document
                  key={pdfSource} 
                  file={pdfSource}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center justify-center p-12 gap-4">
                      <Loader2 className="w-12 h-12 animate-spin text-neutral-500" />
                      <p className="text-neutral-500">{t('file_preview.loading_pdf', 'Loading PDF file...')}</p>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center p-12 gap-4 text-neutral-500">
                      <p className="text-lg font-medium">{t('file_preview.failed_to_load_pdf', 'Failed to load PDF file')}</p>
                      <p className="text-sm text-neutral-400">
                        {pdfError || t('file_preview.check_file_or_auth', 'Please check if the file is corrupted or requires authentication')}
                      </p>
                    </div>
                  }
                  options={{

                    httpHeaders: (() => {
                      const headers: Record<string, string> = {};
                      if (getAuthToken) {
                        const token = getAuthToken();
                        if (token) {
                          headers['Authorization'] = `Bearer ${token}`;
                        }
                      }
                      return headers;
                    })(),
                  }}
                >
                  <Page
                    key={`page-${pageNumber}-${scale}`} 
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-lg"
                    loading={
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
                      </div>
                    }
                  />
                </Document>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (isExcelFile(mimeType, fileName)) {
      if (loadingExcel) {
        return (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-green-600 animate-pulse" />
              <p className="text-neutral-500">{t('file_preview.loading_excel', 'Loading Excel file...')}</p>
            </div>
          </div>
        );
      }

      if (excelData.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center p-12 gap-4 text-neutral-500">
            <FileSpreadsheet className="w-12 h-12 text-neutral-400" />
            <p>{t('file_preview.cannot_parse_excel_or_empty', 'Cannot parse Excel file or file is empty')}</p>
          </div>
        );
      }

      return (
        <div className="p-4">
          <Tabs defaultValue={excelData[0]?.name} className="w-full">
            <TabsList className="mb-4">
              {excelData.map((sheet) => (
                <TabsTrigger key={sheet.name} value={sheet.name}>
                  {sheet.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {excelData.map((sheet) => (
              <TabsContent key={sheet.name} value={sheet.name}>
                <div className="border rounded-lg overflow-auto max-h-[60vh] custom-scrollbar">
                  {sheet.data.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {sheet.data[0]?.map((cell: unknown, idx: number) => (
                            <TableHead key={idx} className="whitespace-nowrap font-semibold bg-neutral-50 dark:bg-neutral-800">
                              {cell != null && cell !== ''
                                ? String(cell)
                                : t('file_preview.column_number', 'Column {{number}}', { number: idx + 1 })}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheet.data.slice(1).map((row: unknown[], rowIdx: number) => (
                          <TableRow key={rowIdx}>
                            {row.map((cell: unknown, cellIdx: number) => (
                              <TableCell key={cellIdx} className="whitespace-nowrap">
                                {cell !== null && cell !== undefined ? String(cell) : ''}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-neutral-500">
                      {t('file_preview.sheet_empty', 'Sheet is empty')}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      );
    }

    if (isMarkdownFile(mimeType, fileName)) {
      if (loadingText) {
        return (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-12 h-12 animate-spin text-neutral-500" />
          </div>
        );
      }

      return (
        <div className="p-6 overflow-auto max-h-[70vh] custom-scrollbar">
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                code: (props) => {
                  const { node: _n, inline, className, children, ...rest } = props as {
                    node?: unknown;
                    inline?: boolean;
                    className?: string;
                    children?: React.ReactNode;
                  } & React.HTMLAttributes<HTMLElement>;
                  void _n;
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="my-4 rounded-lg overflow-hidden">
                      <pre className="bg-neutral-900 text-neutral-100 p-4 overflow-x-auto custom-scrollbar">
                        <code {...rest}>{String(children).replace(/\n$/, '')}</code>
                      </pre>
                    </div>
                  ) : (
                    <code className={`${className} bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded`} {...rest}>
                      {children}
                    </code>
                  );
                },
                a: (all: unknown) => {
                  const { node, ...props } = all as { node?: unknown; [key: string]: unknown };
                  void node;
                  return (
                    <a className="text-brand-primary dark:text-neutral-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                  );
                },
                img: (all: unknown) => {
                  const { node, ...props } = all as { node?: unknown; alt?: string; [key: string]: unknown };
                  void node;
                  return (
                    <img className="max-w-full h-auto rounded-md" {...props} alt={props.alt || ''} />
                  );
                },
              }}
            >
              {textContent}
            </ReactMarkdown>
          </div>
        </div>
      );
    }

    if (isImageFile(mimeType, fileName)) {

      if (!fileUrl) {
        return (
          <div className="flex flex-col items-center justify-center p-12 gap-4 text-neutral-500">
            <p className="text-lg font-medium">{t('file_preview.failed_to_load_image', 'Failed to load image')}</p>
            <p className="text-sm text-neutral-400">{t('file_preview.image_url_unavailable', 'Image URL unavailable')}</p>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-900 relative">
          {imageLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-neutral-500" />
                <p className="text-neutral-500">{t('file_preview.loading_image', 'Loading image...')}</p>
              </div>
            </div>
          )}
          {imageError ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4 text-neutral-500">
              <p className="text-lg font-medium">{t('file_preview.failed_to_load_image', 'Failed to load image')}</p>
              <p className="text-sm text-neutral-400">{imageError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setImageError(null);
                  setImageLoading(true);

                  try {

                    if (imageBlobUrl) {
                      URL.revokeObjectURL(imageBlobUrl);
                      setImageBlobUrl(null);
                    }

                    const headers: HeadersInit = {};
                    if (getAuthToken) {
                      const token = getAuthToken();
                      if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                      }
                    }

                    const response = await fetch(fileUrl, {
                      credentials: 'include',
                      headers
                    });

                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const contentType = response.headers.get('Content-Type') || mimeType || 'image/jpeg';

                    const arrayBuffer = await response.arrayBuffer();
                    const blob = new Blob([arrayBuffer], { type: contentType });
                    const blobUrl = URL.createObjectURL(blob);
                    setImageBlobUrl(blobUrl);
                    setCurrentImageUrl(blobUrl);
                  } catch (error) {
                    console.error('Failed to retry loading image:', error);
                    setImageError(t('file_preview.image_load_failed_check_auth', 'Image load failed, please check authentication or network connection'));
                    setImageLoading(false);
                  }
                }}
              >
                {t('file_preview.retry', 'Retry')}
              </Button>
            </div>
          ) : currentImageUrl ? (
            <img
              key={currentImageUrl}
              src={currentImageUrl}
              alt={fileName}
              className={`max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
              onLoad={() => {
                setImageLoading(false);
                setImageError(null);
              }}
              onError={(e) => {
                console.error('图片显示失败:', {
                  currentImageUrl: currentImageUrl?.substring(0, 50) + '...',
                  error: e,
                  target: e.currentTarget
                });

                if (currentImageUrl && currentImageUrl.startsWith('blob:')) {

                  const img = e.currentTarget;
                  const newBlobUrl = currentImageUrl;

                  img.src = '';
                  setTimeout(() => {
                    img.src = newBlobUrl;
                  }, 100);
                } else {
                  setImageError(t('file_preview.image_display_failed', 'Image display failed, please check if the image format is correct'));
                  setImageLoading(false);
                }
              }}
            />
          ) : null}
        </div>
      );
    }

    if (isVideoFile(mimeType, fileName)) {
      return (
        <div className="flex items-center justify-center p-4 bg-neutral-900">
          <video
            controls
            className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
            src={fileUrl}
          >
            {t('file_preview.browser_not_support_video', 'Your browser does not support video playback')}
          </video>
        </div>
      );
    }

    if (isAudioFile(mimeType, fileName)) {
      return (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">{fileName}</p>
          </div>
          <audio controls className="w-full max-w-md">
            <source src={fileUrl} type={mimeType} />
            {t('file_preview.browser_not_support_audio', 'Your browser does not support audio playback')}
          </audio>
        </div>
      );
    }

    if (isWordFile(mimeType, fileName) || isPowerPointFile(mimeType, fileName)) {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4 p-8">
          <div className="text-center">
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-brand-primary" />
            <p className="text-lg font-medium mb-2">{fileName}</p>
            <p className="text-sm text-neutral-500 mb-4">
              {isWordFile(mimeType, fileName)
                ? t('file_preview.word_download_hint', 'Word documents need to be downloaded and opened with Microsoft Word or other compatible software')
                : t('file_preview.powerpoint_download_hint', 'PowerPoint documents need to be downloaded and opened with Microsoft PowerPoint or other compatible software')}
            </p>
            {showDownload && (
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                {t('file_preview.download_file', 'Download File')}
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (isTextFile(mimeType, fileName)) {
      if (loadingText) {
        return (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-12 h-12 animate-spin text-neutral-500" />
          </div>
        );
      }

      return (
        <div className="p-6 overflow-auto max-h-[70vh] custom-scrollbar">
          <pre className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900/50 rounded p-4 font-mono">
            {textContent}
          </pre>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4 text-neutral-500">
        <p className="text-lg font-medium">{t('file_preview.cannot_preview_file_type', 'Cannot preview this file type')}</p>
        <p className="text-sm text-neutral-400">
          {t('file_preview.supported_formats', 'Supported file formats: Images, Videos, Audio, PDF, Excel, Word, PowerPoint, Markdown, Text files')}
        </p>
        {showDownload && (
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            {t('file_preview.download_file', 'Download File')}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.xl.width, maxHeight: MODAL_DIMENSIONS.xl.maxHeight }} className="p-0 gap-0 flex flex-col [&>button]:hidden overflow-hidden">
        <DialogTitle className="sr-only">{fileName}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('file_preview.dialog_description', 'File preview dialog - {{fileName}}', { fileName })} {fileSize && `(${formatBytes(fileSize)})`}
        </DialogDescription>

        <div className="flex items-center justify-between px-6 py-4 border-b bg-neutral-50 dark:bg-neutral-800">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="font-semibold truncate text-base">{fileName}</h3>
            {fileSize && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {formatBytes(fileSize)} {mimeType && `• ${mimeType}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {publicUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                title={t('file_preview.copy_link', 'Copy Link')}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            )}
            {showDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                title={t('file_preview.download_file', 'Download File')}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
                title={t('file_preview.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-auto max-h-[calc(90vh-80px)] custom-scrollbar">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}