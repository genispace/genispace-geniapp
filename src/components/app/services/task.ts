import { Edge, MarkerType, Node } from "reactflow";
import { TaskNodeData } from "../types/task";
import apiClient from "@/lib/api/apiClient";
import i18n from "../../locales/i18n";

export function transformTaskData(data: {
  workflow?: {
    nodes?: Record<string, {
      type: string;
      position?: { x: number; y: number };
      config: {
        id: string;
        name: string;
        description?: string;
        inputPorts?: Array<{ name: string; type: string; label?: string; required?: boolean }>;
        outputPorts?: Array<{ name: string; type: string; label?: string }>;
      };
      defaultInputs?: Record<string, unknown>;
    }>;
    edges?: Array<{
      source: string;
      target: string;
      dataPath?: string;
      mergeStrategy?: string;
      separator?: string;
      isControlFlow?: boolean;
    }>;
  };
}) {
  const nodes: Node[] = [];
  const validNodeIds = new Set(); 
  const nodePortsMap = new Map(); 
  const edges: Edge[] = [];

  if (data.workflow && data.workflow.nodes) {
    Object.entries(data.workflow.nodes).forEach(([id, nodeData]) => {

      const inputPorts = nodeData.config.inputPorts?.map((port) => ({
        id: port.name,
        type: port.type,
        label: port.label || port.name,
        required: port.required
      })) || [];

      const outputPorts = nodeData.config.outputPorts?.map((port) => ({
        id: port.name,
        type: port.type,
        label: port.label || port.name
      })) || [];

      const inputPortIds = new Set(inputPorts.map((p) => p.id));

      if (nodeData.type !== 'control') {
        inputPortIds.add('_control');
      }

      nodePortsMap.set(id, {
        inputPortIds,
        outputPortIds: new Set(outputPorts.map((p) => p.id))
      });

      const node = {
        id,
        type: nodeData.type,
        position: nodeData.position || { x: Math.random() * 500, y: Math.random() * 500 },
        data: {
          ...nodeData.config,
          id: nodeData.config.id,
          name: nodeData.config.name,
          description: nodeData.config.description,
          inputPorts,
          outputPorts,
          defaultInputs: nodeData.defaultInputs || {}
        }
      };

      nodes.push(node as Node);
      validNodeIds.add(id); 
    });
  }

  if (data.workflow && data.workflow.edges) {
    data.workflow.edges.forEach((edge) => {
      if (!edge.source || !edge.target) return;

      const [sourceNodeId, sourcePortId] = edge.source.split(':');
      const [targetNodeId, targetPortId] = edge.target.split(':');

      if (validNodeIds.has(sourceNodeId) && validNodeIds.has(targetNodeId)) {

        const sourceNodePorts = nodePortsMap.get(sourceNodeId);
        const targetNodePorts = nodePortsMap.get(targetNodeId);

        if (sourceNodePorts.outputPortIds.has(sourcePortId) && 
            targetNodePorts.inputPortIds.has(targetPortId)) {

          edges.push({
            id: `${sourceNodeId}-${sourcePortId}-to-${targetNodeId}-${targetPortId}`,
            source: sourceNodeId,
            sourceHandle: sourcePortId,
            target: targetNodeId,
            targetHandle: targetPortId,
            animated: true,
            style: {
              stroke: '#64748b',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#64748b',
              width: 20,
              height: 20
            },
            data: {
              dataPath: edge.dataPath || '',
              mergeStrategy: edge.mergeStrategy || undefined,
              separator: edge.separator || undefined,
              isControlFlow: edge.isControlFlow || false
            }
          });
        } else {
          console.warn(
            i18n.t('task:skip_port_mismatch_edge', 'Skipping edge with port type mismatch: {{source}} -> {{target}}. Source port {{sourcePort}} should be output port, target port {{targetPort}} should be input port', {
              source: edge.source,
              target: edge.target,
              sourcePort: sourcePortId,
              targetPort: targetPortId
            })
          );
        }
      } else {
        console.warn(
          i18n.t('task:skip_invalid_node_edge', 'Skipping invalid node edge: {{source}} -> {{target}}', {
            source: edge.source,
            target: edge.target
          })
        );
      }
    });
  }

  return { nodes, edges };
}

export const deleteTask = async (taskId: string): Promise<boolean> => {
  try {
    const response = await apiClient.delete<{ success: boolean }>(`/tasks/${taskId}`);

    return response.success;
  } catch (error) {
    console.error('Delete task error:', error);
    return false;
  }
};