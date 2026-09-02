import { useCallback, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
  type OnNodesChange,
  type OnEdgesChange,
} from 'reactflow';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

export interface UseWorkflowCanvasOptions {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  defaultEdgeColor?: string;
  snapGrid?: [number, number];
  requirePorts?: boolean;
  onConnectionError?: (message: string) => void;
}

export interface UseWorkflowCanvasReturn {
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (params: Connection) => void;
  reactFlowInstanceRef: MutableRefObject<ReactFlowInstance | null>;
  connectionLineStyle: React.CSSProperties;
  defaultEdgeOptions: {
    animated: boolean;
    style: { stroke: string; strokeWidth: number };
    markerEnd: {
      type: MarkerType;
      color: string;
      width: number;
      height: number;
    };
  };
}

const DEFAULT_EDGE_COLOR = '#64748b';

export function useWorkflowCanvas(
  options: UseWorkflowCanvasOptions = {}
): UseWorkflowCanvasReturn {
  const {
    initialNodes = [],
    initialEdges = [],
    defaultEdgeColor = DEFAULT_EDGE_COLOR,
    requirePorts = false,
    onConnectionError,
  } = options;

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      if (requirePorts && (!params.sourceHandle || !params.targetHandle)) {
        onConnectionError?.('Please select specific input/output ports');
        return;
      }

      const newEdge: Edge = {
        ...params,
        source: params.source ?? '',
        target: params.target ?? '',
        id: `${params.source}-${params.sourceHandle || 'out'}-to-${params.target}-${params.targetHandle || 'in'}`,
        animated: true,
        style: {
          stroke: defaultEdgeColor,
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: defaultEdgeColor,
          width: 20,
          height: 20,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, requirePorts, defaultEdgeColor, onConnectionError]
  );

  const connectionLineStyle: React.CSSProperties = {
    stroke: '#22c55e',
    strokeDasharray: '5 5',
    strokeWidth: 2,
  };

  const defaultEdgeOptions = {
    animated: true,
    style: { stroke: defaultEdgeColor, strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: defaultEdgeColor,
      width: 20,
      height: 20,
    },
  };

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    reactFlowInstanceRef,
    connectionLineStyle,
    defaultEdgeOptions,
  };
}
