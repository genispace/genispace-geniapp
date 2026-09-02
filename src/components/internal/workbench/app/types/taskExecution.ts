export interface TaskExecution {
    id: string;
    taskId: string;
    userId: string;
    spaceId: string;
    taskType: string;
    startTime: string;
    endTime?: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'RETRY';
    outputs?: Record<string, unknown>;
    logs?: Array<{
        level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
        message: string;
        metadata?: Record<string, unknown>;
    }>;
    currentNodeId?: string;
    error?: string;
}

export interface LogEntry {
    id: string;
    level: string;
    message: string;
    metadata: Record<string, unknown>;
    timestamp: string;
    executionId: string;
}