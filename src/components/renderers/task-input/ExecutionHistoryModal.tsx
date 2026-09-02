import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CheckCircle2, Eye, ChevronLeft, ChevronRight, RotateCw, Copy, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '@/lib/api/apiClient';
import { Button, toast, Skeleton, Z_INDEX_CLASSES } from '@genispace/shared-ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@genispace/shared-ui';
import { getTaskStatusIconColor } from '@/utils/colors';
import type { TaskExecution } from '@/app/types/taskExecution';

type TaskExecutionStatus = TaskExecution['status'];

interface TaskExecutionsResponse {
  success: boolean;
  data: TaskExecution[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface ExecutionHistoryModalProps {
  taskId: string;
  taskName: string;
  onClose: () => void;
}

const ExecutionHistoryModal: React.FC<ExecutionHistoryModalProps> = ({ taskId, taskName, onClose }) => {
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<TaskExecution | null>(null);
  const [executionDetail, setExecutionDetail] = useState<TaskExecution | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 10;
  const { t } = useTranslation(['console', 'execution', 'common']);

  const getStatusIcon = (status: TaskExecutionStatus) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className={`w-4 h-4 ${getTaskStatusIconColor(status)}`} />;
      case 'FAILED': return <X className={`w-4 h-4 ${getTaskStatusIconColor(status)}`} />;
      case 'PENDING': return <Loader2 className={`w-4 h-4 ${getTaskStatusIconColor(status)}`} />;
      case 'RUNNING': return <Loader2 className={`w-4 h-4 ${getTaskStatusIconColor(status)} animate-spin`} />;
      case 'RETRY': return <RotateCw className={`w-4 h-4 ${getTaskStatusIconColor(status)} animate-spin`} />;
      case 'CANCELED': return <X className={`w-4 h-4 ${getTaskStatusIconColor(status)}`} />;
      default: return <X className={`w-4 h-4 ${getTaskStatusIconColor(status as any)}`} />;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-';

    if (seconds < 60) {
      const formattedSeconds = parseFloat(seconds.toFixed(2));
      return `${formattedSeconds}${t('common:time.seconds_unit', 's')}`;
    }

    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      if (remainingSeconds === 0) {
        return `${minutes}${t('common:time.minutes_unit', 'min')}`;
      }
      return `${minutes}${t('common:time.minutes_unit', 'min')}${remainingSeconds}${t('common:time.seconds_unit', 's')}`;
    }

    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    if (remainingMinutes === 0) {
      return `${hours}${t('common:time.hours_unit', 'h')}`;
    }
    return `${hours}${t('common:time.hours_unit', 'h')}${remainingMinutes}${t('common:time.minutes_unit', 'min')}`;
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const fetchExecutions = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<TaskExecutionsResponse>(`/tasks/executes?taskId=${taskId}&page=${page}&limit=${pageSize}`);

      if (response.success && response.data) {

        setExecutions(Array.isArray(response.data) ? response.data : []);
        const pag = (response as { pagination?: { pages?: number } }).pagination;
        setTotalPages(pag?.pages || 1);
      }
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } } };
      const errorMessage = errorObj?.response?.data?.message || t('execution:history.get_failed', 'Failed to get execution history');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, t]);

  useEffect(() => {
    fetchExecutions(currentPage);
  }, [fetchExecutions, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const fetchExecutionDetail = useCallback(async (executionId: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const response = await apiClient.get<TaskExecution>(`/tasks/executions/${executionId}`);
      if (response.data) {
        setExecutionDetail(response.data);
      }
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } } };
      const errorMessage = errorObj?.response?.data?.message || t('execution:details.get_failed', 'Failed to get execution details');
      setDetailError(errorMessage);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [t]);

  const handleViewDetails = (execution: TaskExecution) => {
    setSelectedExecution(execution);
    setExecutionDetail(null);
    setDetailError(null);

    fetchExecutionDetail(execution.id);
  };

  const handleDeleteExecution = async (execution: TaskExecution, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        t(
          'execution:history.confirm_delete',
          'Delete this execution record? It will no longer appear in the list.'
        )
      )
    )
      return;
    setDeletingId(execution.id);
    try {
      const res = await apiClient.delete<{ success?: boolean }>(`/tasks/executions/${execution.id}`);
      if (res?.success !== false) {
        setExecutions(prev => prev.filter(e => e.id !== execution.id));
        toast({
          title: t('common:success', 'Success'),
          description: t('execution:history.delete_success', 'Execution record deleted'),
        });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('execution:history.delete_failed', 'Delete failed');
      toast({ variant: 'destructive', title: t('common:error', 'Error'), description: msg });
    } finally {
      setDeletingId(null);
    }
  };

  const ExecutionDetailModal = ({ execution, detail, isLoadingDetail, detailError, onClose }: { 
    execution: TaskExecution | null; 
    detail: TaskExecution | null;
    isLoadingDetail: boolean;
    detailError: string | null;
    onClose: () => void;
  }) => {
    if (!execution) return null;

    const displayData = detail || execution;

    const formatJson = (obj: Record<string, unknown>) => {
      return JSON.stringify(obj, null, 2);
    };

    const handleCopy = async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: t('common:copied', 'Copied'),
          description: t('common:copied_to_clipboard', '{{label}} copied to clipboard', { label }),
        });
      } catch (err) {
        console.error('复制失败:', err);
        toast({
          variant: "destructive",
          title: t('common:copy_failed', 'Copy Failed'),
          description: t('common:cannot_copy_to_clipboard', 'Unable to copy to clipboard'),
        });
      }
    };

    return createPortal(
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center ${Z_INDEX_CLASSES.MODAL} p-4`}>
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
          <CardHeader className="flex-shrink-0 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{t('execution:details.title', 'Execution Details')}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">{t('execution:details.loading', 'Loading...')}</span>
              </div>
            ) : detailError ? (
              <div className="text-center py-12">
                <div className="text-destructive mb-4 text-sm">{detailError}</div>
                <Button variant="outline" onClick={() => execution && fetchExecutionDetail(execution.id)}>
                  {t('common:retry', 'Retry')}
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">{t('execution:details.task_name', 'Task Name')}</div>
                    <div className="font-medium text-sm">{(displayData as any).task?.name || taskName}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">{t('execution:details.status_label', 'Status')}</div>
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {getStatusIcon(displayData.status)}
                      <span>{t(`execution:status.${displayData.status.toLowerCase()}`, displayData.status)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">{t('execution:details.executor', 'Executor')}</div>
                    <div className="font-medium text-sm">{(displayData as any).user?.name || '-'}</div>
                  </div>
                  {(displayData as any).scheduledTime && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">{t('execution:details.scheduled_time', 'Scheduled Time')}</div>
                      <div className="font-medium text-sm">{formatDateTime((displayData as any).scheduledTime)}</div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">{t('execution:details.start_time', 'Start Time')}</div>
                    <div className="font-medium text-sm">{formatDateTime(displayData.startTime)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">{t('execution:details.end_time', 'End Time')}</div>
                    <div className="font-medium text-sm">{formatDateTime(displayData.endTime || null)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">{t('execution:details.duration', 'Duration')}</div>
                    <div className="font-medium text-sm">{formatDuration((displayData as any).duration ?? null)}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold">{t('execution:details.inputs', 'Input Parameters')}</h4>
                    <button
                      onClick={() => handleCopy(formatJson((displayData as any).inputs || {}), t('execution:details.inputs', 'Input Parameters'))}
                      className="btn btn-ghost btn-icon"
                      title={t('common:copy', 'Copy')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto border border-border custom-scrollbar">
                    <pre className="text-xs font-mono">{formatJson((displayData as any).inputs || {})}</pre>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold">{t('execution:details.outputs', 'Output Results')}</h4>
                    <button
                      onClick={() => handleCopy((displayData as any).outputs && Object.keys((displayData as any).outputs).length > 0 ? formatJson((displayData as any).outputs) : t('execution:details.no_outputs', 'No output results'), t('execution:details.outputs', 'Output Results'))}
                      className="btn btn-ghost btn-icon"
                      title={t('common:copy', 'Copy')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto border border-border custom-scrollbar">
                    <pre className="text-xs font-mono">{(displayData as any).outputs && Object.keys((displayData as any).outputs).length > 0 ? formatJson((displayData as any).outputs) : t('execution:details.no_outputs', 'No output results')}</pre>
                  </div>
                </div>

                {(displayData as any).error && (
                  <div>
                    <h4 className="text-base font-semibold mb-3">{t('execution:details.error', 'Error Information')}</h4>
                    <div className="bg-destructive/10 text-destructive rounded-lg p-4 overflow-x-auto border border-destructive/20 custom-scrollbar">
                      <pre className="text-xs font-mono">{typeof (displayData as any).error === 'object' ? formatJson((displayData as any).error as Record<string, unknown>) : (displayData as any).error}</pre>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
          <div className="flex-shrink-0 border-t border-border p-4 flex justify-end">
            <Button 
              variant="outline"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
          </div>
        </Card>
      </div>,
      document.body
    );
  };

  return createPortal(
    <>
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center ${Z_INDEX_CLASSES.MODAL} p-4`}>
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
          <CardHeader className="flex-shrink-0 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{t('execution:history.modal_title', { taskName, defaultValue: '{{taskName}} - Execution History' })}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {error ? (
              <div className="text-center py-12">
                <div className="text-destructive mb-4 text-sm">{error}</div>
                <Button variant="outline" onClick={() => fetchExecutions(currentPage)}>
                  {t('common:retry', 'Retry')}
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-10">{t('execution:history.status_column', 'Status')}</TableHead>
                        <TableHead className="h-10">{t('execution:history.start_time_column', 'Start Time')}</TableHead>
                        <TableHead className="h-10">{t('execution:history.end_time_column', 'End Time')}</TableHead>
                        <TableHead className="h-10">{t('execution:history.duration_column', 'Duration')}</TableHead>
                        <TableHead className="h-10">{t('execution:history.executor_column', 'Executor')}</TableHead>
                        <TableHead className="h-10 text-right">{t('execution:history.actions_column', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        // Loading skeleton
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={`skeleton-${index}`}>
                            <TableCell>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-8 w-8 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : executions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="text-muted-foreground text-sm">{t('execution:history.no_executions', 'No execution records')}</div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        executions.map(execution => (
                          <TableRow key={execution.id}>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5">
                                {getStatusIcon(execution.status)}
                                <span className="text-sm">{t(`execution:status.${execution.status.toLowerCase()}`, execution.status)}</span>
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(execution.startTime)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(execution.endTime || null)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDuration((execution as any).duration ?? null)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(execution as any).user?.name || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(execution)}
                                  className="h-8 w-8 p-0"
                                  title={t('execution:history.view_details', 'View details')}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleDeleteExecution(execution, e)}
                                  disabled={deletingId === execution.id}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  title={t('execution:history.delete', 'Delete record')}
                                >
                                  {deletingId === execution.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {!isLoading && !error && totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t('common:pagination.previous', 'Previous')}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {t('common:pagination.page_info', 'Page {{current}} of {{total}}', { current: currentPage, total: totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="gap-2"
                    >
                      {t('common:pagination.next', 'Next')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedExecution && (
        <ExecutionDetailModal 
          execution={selectedExecution}
          detail={executionDetail}
          isLoadingDetail={isLoadingDetail}
          detailError={detailError}
          onClose={() => {
            setSelectedExecution(null);
            setExecutionDetail(null);
            setDetailError(null);
          }} 
        />
      )}
    </>,
    document.body
  );
};

export default ExecutionHistoryModal;
