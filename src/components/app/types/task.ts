export interface Task {
    id: string;
    name: string;
    description: string;
    type: 'SCHEDULED' | 'EVENT' | 'MANUAL';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    schedule?: string;
    startDate?: string;
    endDate?: string;
    tags: string[];
    webhookUrl?: string;
    webhookSecret?: string;
    webhookPayloadTemplate?: string;
}

export interface Port {
    id: string;
    type: string;
    label?: string;
    required?: boolean;
}

export interface Schema {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
}

export interface TaskNode extends Node {
    id: string;
    type: 'agent' | 'operator' | 'control';
    data: {
        id: string;
        identifier: string;
        type: string;
        name: string;
        status?: string;
        description?: string;
        category?: string;
        icon?: string;
        iconColor?: string;
        inputSchema?: Schema;
        outputSchema?: Schema;
        inputPorts?: Port[];
        outputPorts?: Port[];
        [key: string]: unknown; 
    };
    position?: { x: number; y: number };
    [key: string]: unknown; 
}

export interface TaskNodeData {
    identifier: string;
    name: string;
    description: string;
    inputSchema?: Schema;
    outputSchema?: Schema;
    metadata?: {
        locales?: Record<string, {
            name: string;
            description: string;
        }>;
    };
}
