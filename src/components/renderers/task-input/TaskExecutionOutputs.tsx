import React, { useState, useEffect } from 'react';
import { 
  Code, Copy, Check, ChevronDown, ChevronRight, FileText, 
  Image as ImageIcon, Video as VideoIcon, ExternalLink, Download
} from 'lucide-react';
import { toast } from '@genispace/shared-ui';
import apiClient from '@/lib/api/apiClient';
import { cn } from '@genispace/shared-utils';
import { useTranslation } from 'react-i18next';

interface ExecutionStatus {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'RETRY' | 'TIMEOUT';
  outputs?: Record<string, any>;
  [key: string]: unknown;
}

interface TaskExecutionOutputsProps {
  executionStatus: ExecutionStatus | null;
  taskId?: string;
  compact?: boolean;
}

const TaskExecutionOutputs: React.FC<TaskExecutionOutputsProps> = ({ 
  executionStatus, 
  taskId,
  compact = false
}) => {
  const { t } = useTranslation(['renderers', 'common', 'execution']);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [workflowNodes, setWorkflowNodes] = useState<Record<string, any>>({});
  const [nodeOutputsWithMetadata, setNodeOutputsWithMetadata] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadWorkflow = async () => {
      if (!taskId) return;

      try {
        const response = await apiClient.get<any>(`/tasks/${taskId}`);

        const workflowData = response.data as any;
        if (workflowData?.workflow?.nodes) {
          setWorkflowNodes(workflowData.workflow.nodes);
        }
      } catch (error) {
        console.error(t('task_outputs.load_workflow_failed', 'Failed to load workflow information'), error);
      }
    };

    loadWorkflow();
  }, [taskId]);

  useEffect(() => {
    if (executionStatus?.outputs && Object.keys(executionStatus.outputs).length > 0) {
      setNodeOutputsWithMetadata(executionStatus.outputs);
    }
  }, [executionStatus?.outputs]);

  const extractBaseNodeId = (nodeId: string): string => {
    const match = nodeId.match(/^(.+)_(\d+)$/);
    return match ? match[1] : nodeId;
  };

  const getNodeOutputSchemaFromWorkflow = (nodeId: string, _nodeType?: string, identifier?: string): any | null => {
    if (!workflowNodes || Object.keys(workflowNodes).length === 0) {
      return null;
    }

    const baseNodeId = extractBaseNodeId(nodeId);
    let nodeInfo = workflowNodes[baseNodeId] || workflowNodes[nodeId];

    if (!nodeInfo && identifier) {
      nodeInfo = Object.values(workflowNodes).find((node: any) => 
        node.config?.identifier === identifier || node.config?.id === identifier
      ) as any;
    }

    if (!nodeInfo) {
      return null;
    }

    const outputSchema = nodeInfo.config?.outputSchema;
    if (outputSchema) {
      return outputSchema;
    }

    const outputPorts = nodeInfo.config?.outputPorts || [];
    if (outputPorts.length > 0) {
      const properties: Record<string, any> = {};
      outputPorts.forEach((port: any) => {
        if (port.name) {
          properties[port.name] = {
            type: Array.isArray(port.type) ? port.type[0] : port.type || 'any',
            description: port.label || port.name
          };
        }
      });

      if (Object.keys(properties).length > 0) {
        return {
          type: 'object',
          properties
        };
      }
    }

    return null;
  };

  const getNodeInfo = (nodeId: string, identifier?: string): any | null => {

    let nodeInfo = workflowNodes[nodeId];

    if (!nodeInfo) {
      const baseNodeId = extractBaseNodeId(nodeId);
      nodeInfo = workflowNodes[baseNodeId];
    }

    if (!nodeInfo && identifier) {
      nodeInfo = Object.values(workflowNodes).find((node: any) => 
        node.config?.identifier === identifier || node.config?.id === identifier
      ) as any;
    }

    if (!nodeInfo) {
      const baseNodeId = extractBaseNodeId(nodeId);

      const matchingKey = Object.keys(workflowNodes).find(key => 
        key === baseNodeId || key.startsWith(baseNodeId) || baseNodeId.startsWith(key)
      );
      if (matchingKey) {
        nodeInfo = workflowNodes[matchingKey];
      }
    }

    return nodeInfo || null;
  };

  const getNodeSchema = (nodeId: string, nodeType?: string, identifier?: string): any | null => {
    return getNodeOutputSchemaFromWorkflow(nodeId, nodeType, identifier);
  };

  const hasRequiredOutputPorts = (nodeId: string, identifier?: string): boolean => {
    const nodeInfo = getNodeInfo(nodeId, identifier);
    if (!nodeInfo) {

      const directNodeInfo = workflowNodes[nodeId];
      if (directNodeInfo) {
        const outputPorts = directNodeInfo.config?.outputPorts || [];
        const hasRequired = outputPorts.some((port: any) => port.required === true);
        return hasRequired;
      }

      if (identifier) {
        const nodeByIdentifier = Object.values(workflowNodes).find((node: any) => 
          node.config?.identifier === identifier || node.config?.id === identifier
        ) as any;
        if (nodeByIdentifier) {
          const outputPorts = nodeByIdentifier.config?.outputPorts || [];
          const hasRequired = outputPorts.some((port: any) => port.required === true);
          return hasRequired;
        }
      }

      return false;
    }

    const outputPorts = nodeInfo.config?.outputPorts || [];
    const hasRequired = outputPorts.some((port: any) => port.required === true);
    return hasRequired;
  };

  const getRequiredOutputPortNames = (nodeId: string, identifier?: string): string[] => {
    const nodeInfo = getNodeInfo(nodeId, identifier);
    if (!nodeInfo) {

      const directNodeInfo = workflowNodes[nodeId];
      if (directNodeInfo) {
        const outputPorts = directNodeInfo.config?.outputPorts || [];
        return outputPorts
          .filter((port: any) => port.required === true && port.name)
          .map((port: any) => port.name);
      }
      return [];
    }

    const outputPorts = nodeInfo.config?.outputPorts || [];
    return outputPorts
      .filter((port: any) => port.required === true && port.name)
      .map((port: any) => port.name);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  useEffect(() => {
    if (nodeOutputsWithMetadata && Object.keys(nodeOutputsWithMetadata).length > 0) {
      const firstNodeId = Object.keys(nodeOutputsWithMetadata)[0];
      // Output records are commonly execution-suffixed (for example `agent_report_2`),
      // while their rendered defined-node section is keyed by the base workflow node id.
      setExpandedSections({[extractBaseNodeId(firstNodeId)]: true});
    }
  }, [nodeOutputsWithMetadata]);

  const copyToClipboard = async (text: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable');
      await navigator.clipboard.writeText(text);
      toast({
        title: t('task_outputs.copy_success', 'Copy successful'),
        description: t('task_outputs.copy_to_clipboard', 'Content copied to clipboard')
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('task_outputs.copy_failed', 'Copy failed'),
      });
    }
  };

  const getOutputTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
      case 'file':
        return <FileText className="w-5 h-5" />;
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'video':
        return <VideoIcon className="w-5 h-5" />;
      default:
        return <Code className="w-5 h-5" />;
    }
  };

  const getOutputTypeFromData = (data: any): string => {
    if (!data) return 'text';

    if (typeof data === 'string') return 'text';

    if (data.type) return data.type;

    if (data.url) {
      if (data.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
      if (data.url.match(/\.(mp4|webm|mkv|avi|mov)$/i)) return 'video';
      if (data.url.match(/\.(mp3|wav|ogg|m4a)$/i)) return 'audio';
      return 'document';
    }

    if (data.content) return 'text';

    if (data.base64) return 'base64file';

    return 'json';
  };

  const renderOutputContent = (data: any, type: string, key: string) => {
    if (!data) {
      return (
        <div className="text-sm text-neutral-500 dark:text-neutral-400 italic">
          {t('task_outputs.no_output_content', 'No output content')}
        </div>
      );
    }

    if (typeof data === 'string') {
      return (
        <div className="relative bg-neutral-50 dark:bg-neutral-800 rounded-md p-4 mt-2">
          <button 
            className="btn btn-ghost btn-icon absolute top-2 right-2 rounded"
            onClick={() => copyToClipboard(data)}
            title={t('task_outputs.copy_content', 'Copy content')}
          >
            <Copy className="w-4 h-4" />
          </button>
          <div className="whitespace-pre-wrap text-sm">{data}</div>
        </div>
      );
    }

    switch (type) {
      case 'text':
        return (
          <div className="relative bg-neutral-50 dark:bg-neutral-800 rounded-md p-4 mt-2">
            <button 
              className="btn btn-ghost btn-icon absolute top-2 right-2 rounded"
              onClick={() => copyToClipboard(data.content || JSON.stringify(data))}
              title={t('task_outputs.copy_content', 'Copy content')}
            >
              <Copy className="w-4 h-4" />
            </button>
            <div className="whitespace-pre-wrap text-sm">{data.content || JSON.stringify(data, null, 2)}</div>
          </div>
        );

      case 'image':
        return (
          <div className="mt-2">
            <div className="rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <img 
                src={data.url} 
                alt={data.name || data.fileName || key} 
                className="max-w-full h-auto max-h-[300px] object-contain"
              />
            </div>
            {(data.name || data.fileName) && (
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  {data.name || data.fileName}
                </div>
                <div className="flex gap-1">
                  <a 
                    href={data.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-primary"
                    title={t('task_outputs.open_in_new_window', 'Open in new window')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a 
                    href={data.url} 
                    download={data.name || data.fileName}
                    className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-primary"
                    title={t('task_outputs.download_file', 'Download file')}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="mt-2">
            <div className="relative rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <video 
                src={data.url}
                controls
                className="w-full max-h-[300px]"
              ></video>
            </div>
            {(data.name || data.fileName) && (
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center">
                  <VideoIcon className="w-4 h-4 mr-1" />
                  {data.name || data.fileName}
                </div>
                <a 
                  href={data.url} 
                  download={data.name || data.fileName}
                  className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-primary"
                  title={t('task_outputs.download_video', 'Download video')}
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg mt-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium truncate text-sm" title={data.fileName || data.name}>
                  {data.fileName || data.name}
                </span>
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {(data.size || data.metadata?.fileSize) ? 
                  `${((data.size || data.metadata?.fileSize) / 1024 / 1024).toFixed(2)} MB` : ""}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {data.url && (
                <>
                  <a 
                    href={data.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full"
                    title={t('task_outputs.open_in_new_window', 'Open in new window')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a 
                    href={data.url} 
                    download={data.fileName || data.name}
                    className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full"
                    title={t('task_outputs.download_file', 'Download file')}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
          </div>
        );

      default:

        return (
          <div className="relative bg-neutral-50 dark:bg-neutral-800 rounded-md p-4 mt-2">
            <button 
              className="btn btn-ghost btn-icon absolute top-2 right-2 rounded"
              onClick={() => copyToClipboard(JSON.stringify(data, null, 2))}
              title={t('task_outputs.copy_content', 'Copy content')}
            >
              <Copy className="w-4 h-4" />
            </button>
            <pre className="text-sm overflow-auto max-h-[300px] whitespace-pre-wrap break-words">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const renderDefinedNodeWithOutput = (schemaNodeId: string, nodeOutputs: any) => {
    const isExpanded = expandedSections[schemaNodeId] || false;

    // The caller may already have selected the newest execution record for this logical node.
    // Prefer it over a broad base-id lookup, which otherwise returns the first (often stale)
    // suffixed execution record from the metadata object.
    let nodeOutputData = nodeOutputs || nodeOutputsWithMetadata[schemaNodeId];
    if (!nodeOutputData) {

      const matchingKey = Object.keys(nodeOutputsWithMetadata).find(key => {
        const baseId = extractBaseNodeId(key);
        return baseId === schemaNodeId;
      });
      if (matchingKey) {
        nodeOutputData = nodeOutputsWithMetadata[matchingKey];
      }
    }

    if (!nodeOutputData) {
      nodeOutputData = nodeOutputs;
    }

    const nodeType = nodeOutputData?.nodeType;
    const identifier = nodeOutputData?.identifier;

    const nodeSchema = getNodeSchema(schemaNodeId, nodeType, identifier);
    const nodeInfo = getNodeInfo(schemaNodeId, identifier);

    const nodeTitle = nodeInfo?.config?.name || nodeSchema?.nodeName || nodeSchema?.description || schemaNodeId;
    const nodeDescription = nodeInfo?.config?.description || nodeSchema?.description || '';

    let requiredPortNames = getRequiredOutputPortNames(schemaNodeId, identifier);
    if (requiredPortNames.length === 0 && nodeOutputData) {

      const originalNodeId = Object.keys(nodeOutputsWithMetadata).find(key => {
        const baseId = extractBaseNodeId(key);
        return baseId === schemaNodeId;
      });
      if (originalNodeId) {
        requiredPortNames = getRequiredOutputPortNames(originalNodeId, identifier);
      }
    }

    const actualOutput = nodeOutputData?.output || nodeOutputs;

    let outputData = actualOutput;
    if (actualOutput && typeof actualOutput === 'object' && actualOutput.result !== undefined) {
      outputData = actualOutput.result;
    }

    let filteredOutputData = outputData;
    if (typeof outputData === 'object' && outputData !== null && requiredPortNames.length > 0) {
      const filtered: Record<string, any> = {};
      Object.entries(outputData).forEach(([key, value]) => {
        if (requiredPortNames.includes(key)) {
          filtered[key] = value;
        }
      });
      filteredOutputData = filtered;
    }

    const outputCount = typeof filteredOutputData === 'object' && filteredOutputData !== null 
      ? Object.keys(filteredOutputData).length 
      : 1;

    return (
      <div key={schemaNodeId} className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
        <div 
          className="flex items-center justify-between p-3 cursor-pointer bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          onClick={() => toggleSection(schemaNodeId)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <h3 className="font-medium text-sm">{nodeTitle}</h3>
            <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full flex items-center">
              <Check className="w-3 h-3 mr-1" />
              {t('task_outputs.completed', 'Completed')}
            </span>
          </div>
          <div className="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded-full">
            {outputCount} {t('task_outputs.outputs', 'outputs')}
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
            {nodeDescription && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 italic">
                {nodeDescription}
              </div>
            )}

            <div className="space-y-4">
              {typeof filteredOutputData === 'object' && filteredOutputData !== null && Object.keys(filteredOutputData).length > 0 ? (
                Object.entries(filteredOutputData).map(([outputKey, outputValue], index) => {

                  const outputSchema = nodeSchema?.properties?.[outputKey];
                  const outputType = outputSchema?.type || getOutputTypeFromData(outputValue);
                  const outputTitle = outputSchema?.description || outputKey;

                  return (
                    <div key={`${schemaNodeId}-${outputKey}-${index}`} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                        {getOutputTypeIcon(outputType)}
                        <span>{outputTitle}</span>
                      </h4>

                      {renderOutputContent(outputValue, outputType, outputKey)}
                    </div>
                  );
                })
              ) : (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  {renderOutputContent(filteredOutputData, getOutputTypeFromData(filteredOutputData), 'output')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOutputs = () => {
    const outputs = nodeOutputsWithMetadata;
    const hasOutputs = outputs && Object.keys(outputs).length > 0;

    if (!hasOutputs) {
      return (
        <div className="flex flex-col items-center justify-center py-8 p-4">
          <Code className="w-12 h-12 text-neutral-400 mb-4" />
          <p className="text-sm font-medium text-center text-neutral-600 dark:text-neutral-400">
            {t('task_outputs.no_output_results', 'Current task has no output results yet')}
          </p>
        </div>
      );
    }

    const definedOutputs: Array<{nodeId: string, sourceNodeId: string, output: any, timestamp: number}> = [];
    const undefinedOutputs: Array<{nodeId: string, output: any, timestamp: number}> = [];

    Object.entries(outputs).forEach(([nodeId, nodeOutputData]: [string, any]) => {

      if (['userId', 'execution', '_processedNodes'].includes(nodeId)) {
        return;
      }

      if (!nodeId.startsWith('agent') && !nodeId.startsWith('operator') && !nodeId.startsWith('dataset') && !nodeId.startsWith('datasource')) {
        return;
      }

      if (nodeOutputData == null) {
        return;
      }

      const identifier = nodeOutputData.identifier;
      const output = nodeOutputData.output || nodeOutputData;

      const timestamp = nodeOutputData.updatedAt 
        ? new Date(nodeOutputData.updatedAt).getTime()
        : nodeOutputData.createdAt 
          ? new Date(nodeOutputData.createdAt).getTime()
          : Date.now();

      const baseNodeId = extractBaseNodeId(nodeId);

      let hasRequired = false;
      if (Object.keys(workflowNodes).length > 0) {

        hasRequired = hasRequiredOutputPorts(nodeId, identifier);
        if (!hasRequired && baseNodeId !== nodeId) {
          hasRequired = hasRequiredOutputPorts(baseNodeId, identifier);
        }

        if (!hasRequired && identifier) {
          const nodeByIdentifier = Object.values(workflowNodes).find((node: any) => 
            node.config?.identifier === identifier || node.config?.id === identifier
          ) as any;
          if (nodeByIdentifier) {
            const outputPorts = nodeByIdentifier.config?.outputPorts || [];
            hasRequired = outputPorts.some((port: any) => port.required === true);
          }
        }
      }

      if (hasRequired) {

        const existingIndex = definedOutputs.findIndex(item => item.nodeId === baseNodeId);
        if (existingIndex >= 0) {
          if (timestamp > definedOutputs[existingIndex].timestamp) {
            definedOutputs[existingIndex] = { nodeId: baseNodeId, sourceNodeId: nodeId, output, timestamp };
          }
        } else {
          definedOutputs.push({ nodeId: baseNodeId, sourceNodeId: nodeId, output, timestamp });
        }
      } else {

        undefinedOutputs.push({ nodeId, output, timestamp });
      }
    });

    definedOutputs.sort((a, b) => b.timestamp - a.timestamp);
    undefinedOutputs.sort((a, b) => b.timestamp - a.timestamp);

    const hasUndefinedOutputs = undefinedOutputs.length > 0;
    const isOtherSectionExpanded = expandedSections['__other_outputs__'] || false;

    return (
      <div className="space-y-4">
        {definedOutputs.map(({ nodeId, sourceNodeId, output }) => {
          const fullNodeData = nodeOutputsWithMetadata[sourceNodeId] || { output };
          return renderDefinedNodeWithOutput(nodeId, fullNodeData);
        })}

        {hasUndefinedOutputs && (
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden border-dashed">
            <div 
              className="flex items-center justify-between p-3 cursor-pointer bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              onClick={() => toggleSection('__other_outputs__')}
            >
              <div className="flex items-center gap-2">
                {isOtherSectionExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <h3 className="font-medium text-sm text-neutral-600 dark:text-neutral-400">{t('task_outputs.other_node_outputs', 'Other node outputs')}</h3>
              </div>
              <div className="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                {undefinedOutputs.length} {t('task_outputs.nodes', 'nodes')}
              </div>
            </div>

            {isOtherSectionExpanded && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 italic">
                  {t('task_outputs.undefined_outputs_description', 'The following node outputs are not explicitly declared in the task definition and may be generated by plugins or dynamic nodes')}
                </div>

                <div className="space-y-4">
                  {undefinedOutputs.map(({ nodeId, output }) => (
                    <div key={nodeId} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <h4 className="font-medium mb-2 text-sm">{nodeId}</h4>

                      <div className="space-y-3">
                        {typeof output === 'object' && output !== null ? (
                          Object.entries(output).map(([outputKey, outputData], index) => {
                            const outputType = getOutputTypeFromData(outputData);

                            return (
                              <div key={`${nodeId}-${outputKey}-${index}`} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                <h5 className="text-xs font-medium mb-2 flex items-center gap-2">
                                  {getOutputTypeIcon(outputType)}
                                  <span>{outputKey}</span>
                                </h5>

                                {renderOutputContent(outputData, outputType, outputKey)}
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            {renderOutputContent(output, getOutputTypeFromData(output), 'output')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!executionStatus || !executionStatus.outputs || Object.keys(executionStatus.outputs).length === 0) {
    return null;
  }

  return (
    <div className={cn("mt-4", compact && "mt-2")}>
      <div className="text-sm font-medium mb-3 text-neutral-700 dark:text-neutral-300">
        {t('task_outputs.execution_outputs', 'Execution outputs')}
      </div>
      {renderOutputs()}
    </div>
  );
};

export default TaskExecutionOutputs;
