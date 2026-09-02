import React, { useMemo, useState, useCallback, useRef } from 'react';
import { insertDatasetData } from '@/app/services/workbenchApi';
import { processInsertDataWithAutoId } from '@/utils/autoIdUtils';
import { buildInsertDataFromConfig, buildUpdateDataFromConfig, buildUpdateConditionsFromConfig, evaluateExpression } from '@/utils/dataConfigUtils';
import { useComponentCommunication } from '../../hooks/useComponentCommunication';
import { buildFilterString } from '../../hooks/useParameterHandler';
import { useDatabaseDataSource } from '../../hooks/useDatabaseDataSource';
import type { DatabaseDataSourceConfig } from '../../types/databaseDataSource';
import { Card, CardContent, CardHeader, CardTitle } from '@genispace/shared-ui';
import { Input } from '@genispace/shared-ui';
import { Button, MODAL_DIMENSIONS } from '@genispace/shared-ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/ui/dropdown-menu';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { useGrid24FillCell } from '@/layout/grid24CellContext';
import { TreeFormDialog } from '../../dialogs/TreeFormDialog';
import { Label } from '@genispace/shared-ui';
import { Skeleton } from '../../skeleton';

import { cn } from '@genispace/shared-utils';
import { toast } from '@genispace/shared-ui';
import apiClient from '@/lib/api/apiClient';
import { queryDatasetData } from '@/app/services/workbenchApi';
import { SEMANTIC_COLORS, ICON_COLORS } from '@/utils/colors';
import { renderLucideIcon } from '@/utils/iconUtils';
import { useTranslation } from 'react-i18next';
import { getSystemParameterValue } from '@/utils/systemParameters';
import { extractStrictWaitParameterKeysFromDatasourceParameters } from '@/utils/databaseDatasourceParams';

const TREE_CONFIG = {

  CLICK_PROTECTION_TIME: 500, 
  API_TIMEOUT: 10000, 

  PARAMETER_NAMES: {
    SELECTED_TREE_NODE: 'selectedTreeNode',
    SELECTED_PREFIX: 'selected_',
  },

  API_CONFIG: {
    OUTPUT_FIELDS: ['*'] as string[], 
  },

  DATA_FIELDS: {
    NESTED_PATHS: ['data', 'records', 'items'], 
  }
} as const;

interface SimpleTreeNode {
  id: string | number;
  name: string;
  children?: SimpleTreeNode[];
  expanded?: boolean;
  selected?: boolean;
  level?: number;
  _rawData?: Record<string, unknown>;

  matched?: boolean;
  hasMatchedChildren?: boolean;
}

interface SimpleTreeRendererProps {

  parentKey?: string;
  keyField?: string; 
  label?: string;
  sortKey?: string;

  dataSource?: Record<string, unknown>[];
  loading?: boolean;
  useMockData?: boolean;
  mockData?: Record<string, unknown>[];

  title?: string;
  searchable?: boolean;
  showIcon?: boolean;
  showCount?: boolean;
  defaultExpandLevel?: number;

  addable?: boolean;
  editable?: boolean;
  deletable?: boolean;

  className?: string;
  height?: number;

  datasetConfig?: {
    datasetId: string;
    params?: Record<string, unknown>;

    useAutoId?: boolean;
  };

  insertDatasetConfig?: any;
  updateDatasetConfig?: any;

  databaseDataSourceConfig?: DatabaseDataSourceConfig;

  onSelect?: (node: Record<string, unknown>) => void;
  onAdd?: (parentNode: Record<string, unknown> | null) => void;
  onEdit?: (node: Record<string, unknown>) => void;
  onDelete?: (node: Record<string, unknown>) => void;
  onMoveUp?: (node: Record<string, unknown>) => void;
  onMoveDown?: (node: Record<string, unknown>) => void;
  onRefresh?: () => void;
  onDataSourceChange?: (data: Record<string, unknown>[]) => void;

  parameterConfig?: any;

  onParameterChange?: (key: string, value: any) => void;
  componentId?: string;
  pageId?: string;
  tabId?: string;

  pageParams?: Record<string, any>;
}

interface ApiResponse {
  success: boolean;
  data?: {
    data: Record<string, unknown>[];
    affected_rows?: number;
  };
  message?: string;
  error?: string;
}

const defaultMockData = [
  { id: 1, name: 'Headquarters', parentId: null, sort: 1 },
  { id: 2, name: 'Engineering', parentId: 1, sort: 1 },
  { id: 3, name: 'Product', parentId: 1, sort: 2 },
  { id: 4, name: 'Marketing', parentId: 1, sort: 3 },
  { id: 5, name: 'Frontend Team', parentId: 2, sort: 1 },
  { id: 6, name: 'Backend Team', parentId: 2, sort: 2 },
  { id: 7, name: 'QA Team', parentId: 2, sort: 3 },
  { id: 8, name: 'Product Manager', parentId: 3, sort: 1 },
  { id: 9, name: 'Designer', parentId: 3, sort: 2 }
];

const EMPTY_TREE_DATA: Record<string, unknown>[] = [];

const convertToTreeData = (
  flatData: Record<string, unknown>[],
  config: {
    key: string;
    label: string;
    parentKey: string;
    sortKey: string;
  }
): SimpleTreeNode[] => {
  const { key, label, parentKey, sortKey } = config;

  const nodeMap = new Map<string | number, SimpleTreeNode>();
  const rootNodes: SimpleTreeNode[] = [];

  const sortedData = [...flatData].sort((a, b) => {
    const aSort = Number(a[sortKey]) || 0;
    const bSort = Number(b[sortKey]) || 0;
    return aSort - bSort;
  });

  sortedData.forEach(item => {
    const nodeId = String(item[key] ?? '');
    const nodeName = String(item[label] ?? '');
    const node: SimpleTreeNode = {
      id: nodeId,
      name: nodeName,
      children: [],
      expanded: false,
      selected: false,
      level: 0,
      _rawData: item
    };
    nodeMap.set(nodeId, node);
  });

  sortedData.forEach(item => {
    const nodeId = String(item[key] ?? '');
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const parentId = item[parentKey];
    if (parentId === null || parentId === undefined || parentId === '' || parentId === '0') {
      rootNodes.push(node);
    } else {
      const parentIdStr = String(parentId);
      const parent = nodeMap.get(parentIdStr);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {

        rootNodes.push(node);
      }
    }
  });

  const calculateLevels = (nodes: SimpleTreeNode[], level = 0) => {
    nodes.forEach(node => {
      node.level = level;
      if (node.children && node.children.length > 0) {
        calculateLevels(node.children, level + 1);
      }
    });
  };

  calculateLevels(rootNodes);

  return rootNodes;
};

const expandToLevel = (nodes: SimpleTreeNode[], level: number, currentLevel = 0) => {
  nodes.forEach(node => {
    if (currentLevel < level) {
      node.expanded = true;
      if (node.children && node.children.length > 0) {
        expandToLevel(node.children, level, currentLevel + 1);
      }
    }
  });
};

const HighlightText: React.FC<{ text: string; searchText: string }> = ({ text, searchText }) => {
  if (!searchText.trim()) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <span>
      {parts.map((part, index) => 
        part.toLowerCase() === searchText.toLowerCase() ? (
                          <mark key={index} className={`${SEMANTIC_COLORS.background.warning} ${SEMANTIC_COLORS.text.warning} px-0.5 rounded`}>
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};

const filterTreeNodes = (nodes: SimpleTreeNode[], searchText: string): SimpleTreeNode[] => {
  const filtered: SimpleTreeNode[] = [];

  nodes.forEach(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchText.toLowerCase());
    const filteredChildren = node.children ? filterTreeNodes(node.children, searchText) : [];

    if (matchesSearch || filteredChildren.length > 0) {
      const newNode: SimpleTreeNode = {
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
        expanded: filteredChildren.length > 0 || matchesSearch, 
        matched: matchesSearch,
        hasMatchedChildren: filteredChildren.length > 0
      };
      filtered.push(newNode);
    }
  });

  return filtered;
};

const TreeNodeComponent: React.FC<{
  node: SimpleTreeNode;
  searchText?: string;
  showIcon?: boolean;
  showCount?: boolean;
  addable?: boolean;
  editable?: boolean;
  deletable?: boolean;
  hoveredNodeId?: string | number | null;
  siblings?: SimpleTreeNode[];
  nodeIndex?: number;
  isMobileFlow?: boolean;
  onToggle: (node: SimpleTreeNode) => void;
  onSelect: (node: SimpleTreeNode) => void;
  onAdd?: (parentNode: SimpleTreeNode) => void;
  onEdit?: (node: SimpleTreeNode) => void;
  onDelete?: (node: SimpleTreeNode) => void;
  onMoveUp?: (node: SimpleTreeNode) => void;
  onMoveDown?: (node: SimpleTreeNode) => void;
  onHover?: (nodeId: string | number | null) => void;
}> = ({
  node,
  searchText = '',
  showIcon = true,
  showCount = true,
  addable = true,
  editable = true,
  deletable = true,
  hoveredNodeId,
  siblings = [],
  nodeIndex = 0,
  isMobileFlow = false,
  onToggle,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onHover
}) => {
  const { t } = useTranslation('renderers');
  const hasChildren = node.children && node.children.length > 0;
  // Narrow flow: smaller indent step, capped at 5 levels so deep nodes keep usable width.
  const indentLevel = isMobileFlow
    ? Math.min(node.level || 0, 5) * 12
    : (node.level || 0) * 20;
  const isHovered = hoveredNodeId === node.id;

  const canMoveUp = nodeIndex > 0;
  const canMoveDown = nodeIndex < siblings.length - 1;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node);
  }, [node, onToggle]);

  const handleSelect = useCallback(() => {
    onSelect(node);
  }, [node, onSelect]);

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd?.(node);
  }, [node, onAdd]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(node);
  }, [node, onEdit]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(node);
  }, [node, onDelete]);

  const handleMouseEnter = useCallback(() => {
    onHover?.(node.id);
  }, [node.id, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors",
          node.selected && "bg-primary/10 text-primary"
        )}
        style={{ marginLeft: `${indentLevel}px` }}
        onClick={handleSelect}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="w-5 h-5 flex items-center justify-center" onClick={handleToggle}>
          {hasChildren ? (
            node.expanded ? (
              renderLucideIcon('chevron-down', 'h-4 w-4')
            ) : (
              renderLucideIcon('chevron-right', 'h-4 w-4')
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {showIcon && (
          <div className="w-5 h-5 flex items-center justify-center ml-1">
            {hasChildren ? (
              node.expanded ? (
                renderLucideIcon('folder-open', `h-4 w-4 ${ICON_COLORS.folder}`)
              ) : (
                renderLucideIcon('folder', `h-4 w-4 ${ICON_COLORS.folder}`)
              )
            ) : (
              renderLucideIcon('file', `h-4 w-4 ${ICON_COLORS.file}`)
            )}
          </div>
        )}

        <span className="flex-1 ml-2 text-sm">
          {searchText ? (
            <HighlightText text={node.name} searchText={searchText} />
          ) : (
            node.name
          )}
        </span>

        {showCount && hasChildren && (
          <span className="text-xs text-muted-foreground ml-2">
            ({node.children?.length})
          </span>
        )}

        {!isMobileFlow && isHovered && (addable || editable || deletable || onMoveUp || onMoveDown) && (
          <div className="flex items-center gap-1 ml-2">
            {addable && (
              <Button
                variant="ghost"
                size="sm"
                                  className={`h-6 w-6 p-0 ${SEMANTIC_COLORS.hover.info}`}
                onClick={handleAdd}
                title={t('tree.add_child_node', 'Add Child Node')}
              >
                {renderLucideIcon('plus', 'h-3 w-3')}
              </Button>
            )}
            {editable && (
              <Button
                variant="ghost"
                size="sm"
                                  className={`h-6 w-6 p-0 ${SEMANTIC_COLORS.hover.success}`}
                onClick={handleEdit}
                title={t('tree.edit_node', 'Edit Node')}
              >
                {renderLucideIcon('edit', 'h-3 w-3')}
              </Button>
            )}
            {deletable && (
              <Button
                variant="ghost"
                size="sm"
                                  className={`h-6 w-6 p-0 ${SEMANTIC_COLORS.hover.error}`}
                onClick={handleDelete}
                title={t('tree.delete_node', 'Delete Node')}
              >
                {renderLucideIcon('trash-2', 'h-3 w-3')}
              </Button>
            )}
            {onMoveUp && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 w-6 p-0",
                  canMoveUp 
                    ? SEMANTIC_COLORS.hover.info
                    : "text-muted-foreground cursor-not-allowed"
                )}
                onClick={canMoveUp ? (e) => { e.stopPropagation(); onMoveUp(node); } : undefined}
                disabled={!canMoveUp}
                title={canMoveUp ? t('tree.move_up', 'Move Up') : t('tree.already_first', 'Already First Node')}
              >
                {renderLucideIcon('arrow-up', 'h-3 w-3')}
              </Button>
            )}
            {onMoveDown && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 w-6 p-0",
                  canMoveDown 
                    ? SEMANTIC_COLORS.hover.warning
                    : "text-muted-foreground cursor-not-allowed"
                )}
                onClick={canMoveDown ? (e) => { e.stopPropagation(); onMoveDown(node); } : undefined}
                disabled={!canMoveDown}
                title={canMoveDown ? t('tree.move_down', 'Move Down') : t('tree.already_last', 'Already Last Node')}
              >
                {renderLucideIcon('arrow-down', 'h-3 w-3')}
              </Button>
            )}
          </div>
        )}

        {/* Narrow flow: no hover — expose the same actions via an always-visible ellipsis menu */}
        {isMobileFlow && (addable || editable || deletable || onMoveUp || onMoveDown) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-2"
                onClick={(e) => e.stopPropagation()}
                title={t('tree.node_actions', 'Node Actions')}
              >
                {renderLucideIcon('more-vertical', 'h-4 w-4')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {addable && (
                <DropdownMenuItem onClick={handleAdd}>
                  {renderLucideIcon('plus', 'h-4 w-4 mr-2')}
                  {t('tree.add_child_node', 'Add Child Node')}
                </DropdownMenuItem>
              )}
              {editable && (
                <DropdownMenuItem onClick={handleEdit}>
                  {renderLucideIcon('edit', 'h-4 w-4 mr-2')}
                  {t('tree.edit_node', 'Edit Node')}
                </DropdownMenuItem>
              )}
              {deletable && (
                <DropdownMenuItem onClick={handleDelete}>
                  {renderLucideIcon('trash-2', 'h-4 w-4 mr-2')}
                  {t('tree.delete_node', 'Delete Node')}
                </DropdownMenuItem>
              )}
              {onMoveUp && (
                <DropdownMenuItem
                  disabled={!canMoveUp}
                  onClick={canMoveUp ? (e) => { e.stopPropagation(); onMoveUp(node); } : undefined}
                >
                  {renderLucideIcon('arrow-up', 'h-4 w-4 mr-2')}
                  {t('tree.move_up', 'Move Up')}
                </DropdownMenuItem>
              )}
              {onMoveDown && (
                <DropdownMenuItem
                  disabled={!canMoveDown}
                  onClick={canMoveDown ? (e) => { e.stopPropagation(); onMoveDown(node); } : undefined}
                >
                  {renderLucideIcon('arrow-down', 'h-4 w-4 mr-2')}
                  {t('tree.move_down', 'Move Down')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {hasChildren && node.expanded && (
        <div>
          {node.children?.map((child, index) => (
            <TreeNodeComponent
              key={`${child.id}-${index}`}
              node={child}
              searchText={searchText}
              showIcon={showIcon}
              showCount={showCount}
              addable={addable}
              editable={editable}
              deletable={deletable}
              hoveredNodeId={hoveredNodeId}
              siblings={node.children || []}
              nodeIndex={index}
              isMobileFlow={isMobileFlow}
              onToggle={onToggle}
              onSelect={onSelect}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onHover={onHover}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SimpleTreeRenderer: React.FC<SimpleTreeRendererProps> = (props) => {
  const {
    parentKey = 'p_id',
    keyField = 'id',
    label = 'value',
    sortKey = 'sort_order',
    dataSource = EMPTY_TREE_DATA,
    loading = false,
    useMockData = false,
    mockData = EMPTY_TREE_DATA,
    title,
    searchable = true,
    showIcon = true,
    showCount = true,
    defaultExpandLevel = 1,
    addable = true,
    editable = true,
    deletable = true,
    className,
    height = 400,
    datasetConfig,
    insertDatasetConfig,
    updateDatasetConfig,
    databaseDataSourceConfig,
    onSelect,
    onAdd,
    onEdit,
    onDelete: _onDelete,
    onMoveUp,
    onMoveDown,
    onRefresh: _onRefresh,
    onDataSourceChange,
    parameterConfig = {},
    onParameterChange,
    componentId = '',
    pageId: _pageId = '',
    tabId: _tabId = '',
    pageParams = {}
  } = props;

  const { t } = useTranslation(['renderers', 'common']);
  const isMobileFlow = useMobileFlowLayout();
  const fillCell = useGrid24FillCell();

  const [searchText, setSearchText] = useState('');
  const [treeData, setTreeData] = useState<SimpleTreeNode[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [selectedParent, setSelectedParent] = useState<SimpleTreeNode | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);

  const [isTreeFormDialogOpen, setIsTreeFormDialogOpen] = useState(false);
  const [treeFormMode, setTreeFormMode] = useState<'add' | 'edit'>('add');
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState<any>(null);

  const [internalData, setInternalData] = useState<Record<string, unknown>[]>([]);

  const [isInitialDataLoading, setIsInitialDataLoading] = useState(false);

  const onDataSourceChangeRef = useRef(onDataSourceChange);
  onDataSourceChangeRef.current = onDataSourceChange;

  const [hasLoadError, setHasLoadError] = useState(false);
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);

  const fetchDataFromApiRef = useRef<(() => Promise<void>) | null>(null);
  const autoFetchedDatasetIdRef = useRef<string | null>(null);

  const handleTreeFormSubmit = useCallback(async (formData: Record<string, any>) => {

    if (treeFormMode === 'add' && insertDatasetConfig?.targetDatasetId) {
      try {
        setIsApiLoading(true);

        const targetDatasetId = typeof insertDatasetConfig.targetDatasetId === 'string' 
          ? insertDatasetConfig.targetDatasetId 
          : insertDatasetConfig.targetDatasetId.value || '';

        if (!targetDatasetId) {
          throw new Error(t('tree.target_dataset_id_not_configured', 'Target dataset ID not configured'));
        }

        const finalFormData = { ...formData };

        if (insertDatasetConfig.insertFields) {
          Object.entries(insertDatasetConfig.insertFields).forEach(([fieldName, fieldConfig]) => {
            const config = fieldConfig as { source: string; value: string; [key: string]: any };
            if (config.source === 'computed') {
              const newValue = evaluateExpression(config.value, finalFormData, {});
              finalFormData[fieldName] = newValue;
            }
          });
        }

        const hasTargetDataset = !!insertDatasetConfig?.targetDatasetId;
        let shouldUseTimestampId = false;

        if (hasTargetDataset) {
          const targetDatasetId = typeof insertDatasetConfig.targetDatasetId === 'string' 
            ? insertDatasetConfig.targetDatasetId 
            : insertDatasetConfig.targetDatasetId.value;

          if (targetDatasetId) {
            try {

              const response = await apiClient.get(`/datasets/${targetDatasetId}`) as any;
              const datasetInfo = response.data?.data || response.data;
              const autoIdDisabled = datasetInfo?.dbConfig?.autoId === false;
              shouldUseTimestampId = autoIdDisabled;

            } catch (error) {
              console.error('获取数据集配置失败:', error);

              shouldUseTimestampId = false;
            }
          }
        }

        const shouldGenerateTimestampId = hasTargetDataset && shouldUseTimestampId;

        const needsId = !finalFormData[keyField] || finalFormData[keyField] === '';

        if (shouldGenerateTimestampId || needsId) {

          const { generateAutoId } = await import('../../utils/autoIdUtils');
          const timestampId = generateAutoId();
          finalFormData[keyField] = timestampId;

        }

        const insertData = buildInsertDataFromConfig(
          insertDatasetConfig.insertFields,
          finalFormData,
        );

        if (finalFormData[keyField] && !insertData[keyField]) {
          insertData[keyField] = finalFormData[keyField];
        }

        const responseData = await insertDatasetData(targetDatasetId, [insertData]);

        if (responseData?.success) {
          toast({
            title: t('tree.add_success', 'Add Success'),
            description: t('tree.add_success_description', 'Node has been successfully added'),
          });

          setIsTreeFormDialogOpen(false);
          setSelectedParent(null);

          const fetchFn = fetchDataFromApiRef.current;

          if (fetchFn && typeof fetchFn === 'function') {

            lastClickTimeRef.current = 0;
            try {
              await fetchFn();
            } catch (error) {
              console.error('树数据刷新失败:', error);
            }
          }
        } else {
          throw new Error(responseData?.message || t('tree.add_data_failed', 'Failed to add data'));
        }
      } catch (error: unknown) {
        console.error('TreeFormDialog添加失败:', error);
        const errorMessage = error instanceof Error ? error.message : t('tree.add_data_failed', 'Failed to add data');
        toast({
          variant: "destructive",
          title: t('tree.add_failed_title', 'Add Failed'),
          description: errorMessage,
        });
      } finally {
        setIsApiLoading(false);
      }
    } else if (treeFormMode === 'edit' && updateDatasetConfig?.targetDatasetId) {

      setIsApiLoading(true);

      try {
        const targetDatasetId = typeof updateDatasetConfig.targetDatasetId === 'string' 
          ? updateDatasetConfig.targetDatasetId 
          : updateDatasetConfig.targetDatasetId.value;

        if (!targetDatasetId) {
          throw new Error(t('tree.target_dataset_id_not_configured', 'Target dataset ID not configured'));
        }

        if (updateDatasetConfig.updateFields) {
          Object.entries(updateDatasetConfig.updateFields).forEach(([fieldName, fieldConfig]) => {
            if ((fieldConfig as any).source === 'computed') {
              const config = fieldConfig as { source: string; value: string; [key: string]: any };
              const newValue = evaluateExpression(config.value, formData, {});
              formData[fieldName] = newValue;
              }
          });
        }

        const updateData = buildUpdateDataFromConfig(
          updateDatasetConfig.updateFields,
          formData,
        );

        const updateConditions = buildUpdateConditionsFromConfig(
          updateDatasetConfig.updateConditions || {},
          formData,
        );

        const filterConditions: Record<string, any> = {};
        Object.entries(updateConditions).forEach(([fieldName, condition]: [string, any]) => {
          if (condition && typeof condition === 'object' && condition.value !== undefined) {
            filterConditions[fieldName] = condition.value;
            }
        });

        if (Object.keys(filterConditions).length === 0) {
          const primaryKeyValue = formData[keyField];
          if (primaryKeyValue !== undefined && primaryKeyValue !== null && primaryKeyValue !== '') {
            filterConditions[keyField] = primaryKeyValue;
            } else {
            console.error(` [FALLBACK] 主键字段${keyField}的值无效:`, primaryKeyValue);
          }
        }

        const fieldTypes: Record<string, string> = {
          [keyField]: 'INT32',  
          [label]: 'VARCHAR', 
          [parentKey]: 'VARCHAR',
          [sortKey]: 'INT32'
        };

        const filterString = buildFilterString(filterConditions, fieldTypes);

        const response = await apiClient.post(
          `/datasets/${targetDatasetId}/data/update`,
          {
            filter: filterString,
            update_data: updateData
          }
        );

        const responseData = response.data as { success: boolean; message?: string };

        if (responseData?.success) {
          toast({
            title: t('tree.edit_success', 'Edit Success'),
            description: t('tree.edit_success_description', 'Node has been successfully updated'),
          });

          setIsTreeFormDialogOpen(false);
          setSelectedNodeForEdit(null);

          const fetchFn = fetchDataFromApiRef.current;
          if (fetchFn && typeof fetchFn === 'function') {

            lastClickTimeRef.current = 0;
            await fetchFn();
          }
        } else {
          throw new Error(responseData?.message || t('tree.update_data_failed', 'Failed to update data'));
        }
      } catch (error: unknown) {
        console.error('TreeFormDialog编辑失败:', error);
        const errorMessage = error instanceof Error ? error.message : t('tree.update_data_failed', 'Failed to update data');
        toast({
          variant: "destructive",
          title: t('tree.edit_failed_title', 'Edit Failed'),
          description: errorMessage,
        });
      } finally {
        setIsApiLoading(false);
      }
    }
  }, [treeFormMode, insertDatasetConfig, updateDatasetConfig, keyField, datasetConfig]);

  const stableDataSource = useMemo(() => {
    if (!dataSource || dataSource.length === 0) {
      return null;
    }

    const firstItem = dataSource[0];
    let extractedData;

    const extractDataFromExternalSource = (sourceData: any): any[] => {
      if (!sourceData) return dataSource;

      if (sourceData.success && sourceData.data) {
        return extractDataFromNestedResponse(sourceData.data);
      }

      return extractDataFromNestedResponse(sourceData);
    };

    const extractDataFromNestedResponse = (responseData: any): any[] => {
      if (Array.isArray(responseData)) {
        return responseData;
      }

      for (const path of TREE_CONFIG.DATA_FIELDS.NESTED_PATHS) {
        if (responseData && responseData[path] && Array.isArray(responseData[path])) {
          return responseData[path];
        }
      }

      return [];
    };

    extractedData = extractDataFromExternalSource(firstItem);

    if (!Array.isArray(extractedData) || extractedData.length === 0) {
      extractedData = dataSource;
    }

    return extractedData;
  }, [dataSource?.length, JSON.stringify(dataSource?.[0])]);

  const resolvedDatabaseDataSourceConfig = useMemo(() => {
    if (!databaseDataSourceConfig) return null;

    if (!databaseDataSourceConfig.parameters || Object.keys(databaseDataSourceConfig.parameters).length === 0) {
      return databaseDataSourceConfig;
    }

    const resolvedParameters: Record<string, any> = {};

    Object.entries(databaseDataSourceConfig.parameters).forEach(([key, value]) => {

      if (value && typeof value === 'object' && (value as any).type === 'parameter') {
        const paramConfig = value as { type: 'parameter'; source: string; value?: any };
        const paramName = paramConfig.source;

        let actualValue = pageParams[paramName];

        // Multi-select params are real arrays — keep them as-is; the API expands
        // them into the SQL IN list (JSON.stringify would send the string '[]').
        if (Array.isArray(actualValue)) {
          // pass through
        } else if (actualValue && typeof actualValue === 'object') {

          if ('id' in actualValue) {
            actualValue = actualValue.id;
          } else if ('value' in actualValue) {
            actualValue = actualValue.value;
          } else {

            actualValue = JSON.stringify(actualValue);
          }
        }

        resolvedParameters[key] = actualValue !== undefined && actualValue !== null ? actualValue : paramConfig.value;
      } else if (value && typeof value === 'object' && (value as any).type === 'system') {

        const systemParamConfig = value as { type: 'system'; systemParam: string; value?: any };
        const systemValue = getSystemParameterValue(
          systemParamConfig.systemParam as any
        );

        resolvedParameters[key] = systemValue || systemParamConfig.value || '';
      } else {

        resolvedParameters[key] = value;
      }
    });

    return {
      ...databaseDataSourceConfig,
      parameters: resolvedParameters
    };
  }, [databaseDataSourceConfig, pageParams]);

  // waitForValue: bindings marked waitForValue:true must have resolved into the request body
  // before the first fetch (gate == payload; this renderer resolves params from pageParams).
  // autoFetch is reactive to this flag, so the fetch fires once the values land.
  const strictWaitKeys = useMemo(
    () => extractStrictWaitParameterKeysFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [databaseDataSourceConfig?.parameters]
  );
  const strictParamsSatisfied = useMemo(() => {
    const resolvedP = (resolvedDatabaseDataSourceConfig?.parameters || {}) as Record<string, unknown>;
    return strictWaitKeys.every(k => resolvedP[k] !== undefined && resolvedP[k] !== null);
  }, [strictWaitKeys, resolvedDatabaseDataSourceConfig]);

  const {
    data: databaseData,
    loading: databaseLoading,
    error: databaseError,
    isInitialized: databaseInitialized,
    refetch: refetchDatabaseData
  } = useDatabaseDataSource(
    resolvedDatabaseDataSourceConfig || null,
    'Tree',

    resolvedDatabaseDataSourceConfig ? {
      idField: keyField || 'id',
      parentField: parentKey || 'parentId',
      labelField: label || 'name',
      sortField: sortKey || 'sort'
    } : undefined,
    {
      autoFetch: strictParamsSatisfied,
      errorConfig: {
        showToast: true,
        retryAttempts: 2,
        retryDelay: 1000
      }
    }
  );

  const allowedEmitParameters = useMemo(() => {

    const baseParams = [TREE_CONFIG.PARAMETER_NAMES.SELECTED_TREE_NODE];
    const customFields = parameterConfig?.customEmitFields?.['onNodeSelect'] || [];
    const customParams = customFields.map((field: any) => `${TREE_CONFIG.PARAMETER_NAMES.SELECTED_PREFIX}${field.fieldName}`);
    return [...baseParams, ...customParams];
  }, [parameterConfig?.customEmitFields]);

  const communication = useComponentCommunication({
    componentId: componentId,
    emitParameters: allowedEmitParameters, 

    listenParameters: [], 
    onParameterChange: (key, value) => {

      if (onParameterChange) {
        onParameterChange(key, value);
      }
    }
  });

  const finalData = useMemo(() => {

    if (useMockData && mockData.length > 0) {
      return mockData;
    }

    if (useMockData) {
      return defaultMockData;
    }

    if (datasetConfig?.datasetId) {

      if (internalData && internalData.length > 0) {
        return internalData;
      }

      if (isInitialDataLoading) {
        return []; 
      }

      return []; 
    }

    if (databaseDataSourceConfig?.datasourceId) {

      if (!databaseInitialized && databaseLoading) {
        return []; 
      }

      if (databaseError) {
        return []; 
      }

      const result = databaseData || [];
      return result;
    }

    if (stableDataSource && stableDataSource.length > 0) {
      return stableDataSource;
    }

    return defaultMockData;
  }, [useMockData, mockData, datasetConfig?.datasetId, databaseDataSourceConfig?.datasourceId, internalData, databaseData, databaseLoading, databaseInitialized, databaseError, stableDataSource, isInitialDataLoading, keyField]);

  const countAllNodes = useCallback((nodes: SimpleTreeNode[]): number => {
    let count = 0;
    const traverse = (nodeList: SimpleTreeNode[]) => {
      nodeList.forEach(node => {
        count++;
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return count;
  }, []);

  const processedTreeData = useMemo(() => {
    if (!finalData?.length) {
      return [];
    }

    const converted = convertToTreeData(finalData, {
      key: keyField, label, parentKey, sortKey
    });

    if (defaultExpandLevel > 0) {
      expandToLevel(converted, defaultExpandLevel);
    }

    return converted;
  }, [finalData, keyField, label, parentKey, sortKey, defaultExpandLevel, countAllNodes]);

  const filteredTreeData = useMemo(() => {
    if (!searchText.trim()) return processedTreeData;
    return filterTreeNodes(processedTreeData, searchText);
  }, [processedTreeData, searchText]);

  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  const lastClickTimeRef = useRef(0);

  const getAllNodeIds = useCallback((nodes: SimpleTreeNode[]): (string | number)[] => {
    const ids: (string | number)[] = [];
    const traverse = (nodeList: SimpleTreeNode[]) => {
      nodeList.forEach(node => {
        ids.push(node.id);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return ids;
  }, []);

  React.useEffect(() => {

    const timeSinceClick = Date.now() - lastClickTimeRef.current;

    if (timeSinceClick < TREE_CONFIG.CLICK_PROTECTION_TIME && lastClickTimeRef.current > 0) {
      return;
    }

    if (filteredTreeData.length === 0) {
      setTreeData([]);
      return;
    }

    setTreeData(prevData => {

        if (prevData.length === 0 || isInitialLoad) {
        setIsInitialLoad(false);
        return filteredTreeData;
      }

      if (prevData.length !== filteredTreeData.length) {
        void 0;
      } else {
        const prevIds = new Set(getAllNodeIds(prevData));
        const newIds = new Set(getAllNodeIds(filteredTreeData));

        const hasNewIds = [...newIds].some(id => !prevIds.has(id));
        const hasMissingIds = [...prevIds].some(id => !newIds.has(id));

        if (!hasNewIds && !hasMissingIds) {

          const hasContentChange = checkNodeContentChange(prevData, filteredTreeData);

          if (!hasContentChange) {
            return prevData; 
          }

        }
      }

      function checkNodeContentChange(oldNodes: SimpleTreeNode[], newNodes: SimpleTreeNode[]): boolean {
        const oldNodeMap = createNodeMap(oldNodes);
        const newNodeMap = createNodeMap(newNodes);

        for (const [id, newNode] of newNodeMap) {
          const oldNode = oldNodeMap.get(id);
          if (oldNode && oldNode.name !== newNode.name) {
            return true;
          }
        }
        return false;
      }

      function createNodeMap(nodes: SimpleTreeNode[]): Map<string | number, SimpleTreeNode> {
        const map = new Map<string | number, SimpleTreeNode>();
        const traverse = (nodeList: SimpleTreeNode[]) => {
          nodeList.forEach(node => {
            map.set(node.id, node);
            if (node.children && node.children.length > 0) {
              traverse(node.children);
            }
          });
        };
        traverse(nodes);
        return map;
      }

      const stateMap = new Map<string | number, { expanded: boolean; selected: boolean }>();

      const collectStates = (nodes: SimpleTreeNode[]) => {
        nodes.forEach(node => {
          stateMap.set(node.id, {
            expanded: node.expanded || false,
            selected: node.selected || false
          });
          if (node.children) {
            collectStates(node.children);
          }
        });
      };

      collectStates(prevData);

      const applyStates = (nodes: SimpleTreeNode[]): SimpleTreeNode[] => {
        return nodes.map(node => {
          const savedState = stateMap.get(node.id);
          return {
            ...node,
            expanded: savedState?.expanded ?? false,
            selected: savedState?.selected ?? false,
            children: node.children ? applyStates(node.children) : node.children
          };
        });
      };

      return applyStates(filteredTreeData);
    });
  }, [filteredTreeData, isInitialLoad, getAllNodeIds]); 

  const fetchDataFromApi = useCallback(async () => {

    const now = Date.now();
    const MIN_RETRY_INTERVAL = 5000; 

    if (hasLoadError && (now - lastErrorTime) < MIN_RETRY_INTERVAL) {
      return;
    }

    if (!datasetConfig?.datasetId) {
      return;
    }

    setIsApiLoading(true);

    if ((!internalData || internalData.length === 0)) {
      setIsInitialDataLoading(true);
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(t('tree.api_timeout_error', 'API call timeout ({{seconds}}s)', { seconds: TREE_CONFIG.API_TIMEOUT/1000 })));
        }, TREE_CONFIG.API_TIMEOUT);
      });

      const apiPromise = queryDatasetData(datasetConfig.datasetId, {
        outputFields: TREE_CONFIG.API_CONFIG.OUTPUT_FIELDS
      });

      const result = await Promise.race([apiPromise, timeoutPromise]) as any;

      if (result?.success && result.data) {

        const extractDataFromResponse = (responseData: any): any[] => {

          if (Array.isArray(responseData)) {
            return responseData;
          }

          for (const path of TREE_CONFIG.DATA_FIELDS.NESTED_PATHS) {
            if (responseData && responseData[path] && Array.isArray(responseData[path])) {
              return responseData[path];
            }
          }

          return [];
        };

        const extractedData = extractDataFromResponse(result.data);

        setInternalData(extractedData);

        setHasLoadError(false);
        setLastErrorTime(0);

        if (onDataSourceChangeRef.current) {
          onDataSourceChangeRef.current([{ success: true, data: { data: result.data } }]);
        }
      }

    } catch (error) {

      setHasLoadError(true);
      setLastErrorTime(Date.now());

      toast({
        variant: "destructive",
        title: t('tree.refresh_failed', 'Refresh Failed'),
        description: error instanceof Error && (error.message.includes('timeout') || error.message.toLowerCase().includes('timeout')) 
          ? t('tree.refresh_timeout', 'API call timeout, please check network connection') 
          : t('tree.refresh_failed_description', 'Unable to get latest data'),
      });
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      setIsApiLoading(false);

      setIsInitialDataLoading(false);
    }
  }, [datasetConfig?.datasetId, hasLoadError, lastErrorTime, t]); 

  fetchDataFromApiRef.current = fetchDataFromApi;

  React.useEffect(() => {

    const datasetId = datasetConfig?.datasetId;
    if (!datasetId || useMockData || internalData.length > 0) {
      if (!datasetId || useMockData) {
        autoFetchedDatasetIdRef.current = null;
      }
      return;
    }

    // Effects may rerun while the request itself updates loading state. Start
    // one initial request per dataset rather than spawning concurrent fetches.
    if (autoFetchedDatasetIdRef.current === datasetId) {
      return;
    }

    autoFetchedDatasetIdRef.current = datasetId;
    if (fetchDataFromApiRef.current) {
      void fetchDataFromApiRef.current();
    }
  }, [datasetConfig?.datasetId, useMockData, internalData?.length]); 

  const handleToggle = useCallback((node: SimpleTreeNode) => {
    setTreeData(prevData => {
      const updateNode = (nodes: SimpleTreeNode[]): SimpleTreeNode[] => {
        return nodes.map(n => {
          if (n.id === node.id) {
            return { ...n, expanded: !n.expanded };
          }
          if (n.children) {
            return { ...n, children: updateNode(n.children) };
          }
          return n;
        });
      };
      return updateNode(prevData);
    });
  }, []);

  const handleSelect = useCallback((node: SimpleTreeNode) => {

    lastClickTimeRef.current = Date.now();

    setTreeData(prevData => {
      const updateNode = (nodes: SimpleTreeNode[]): SimpleTreeNode[] => {
        return nodes.map(n => {
          const selected = n.id === node.id;
          if (n.children) {
            return { ...n, selected, children: updateNode(n.children) };
          }
          return { ...n, selected };
        });
      };
      return updateNode(prevData);
    });

    if (parameterConfig?.enableCommunication && parameterConfig?.enableEmit) {
      const triggers = parameterConfig?.triggers || {};

      if (triggers['onNodeSelect']?.enabled) {
        const nodeData = node._rawData || node;

        const selectedTreeNodeData = {
          id: node.id,
          name: node.name,
          parentId: (nodeData as any)[parentKey],
          level: node.level,
          rawData: nodeData
        };

        communication.emit(TREE_CONFIG.PARAMETER_NAMES.SELECTED_TREE_NODE, selectedTreeNodeData);

        const customFields = parameterConfig?.customEmitFields?.['onNodeSelect'] || [];

        customFields.forEach((field: any) => {

          if (field.fieldName && (nodeData as any)[field.fieldName] !== undefined) {
            const paramName = `${TREE_CONFIG.PARAMETER_NAMES.SELECTED_PREFIX}${field.fieldName}`;
            const paramValue = String((nodeData as any)[field.fieldName]);

            communication.emit(paramName, paramValue);
          }
        });

      } 
    }

    onSelect?.(node._rawData || (node as any));
  }, [onSelect, parameterConfig?.enableCommunication, parameterConfig?.enableEmit, parameterConfig?.triggers, communication, parentKey]); 

  const handleAdd = useCallback((parentNode?: SimpleTreeNode) => {

    if (insertDatasetConfig?.targetDatasetId) {
      setSelectedParent(parentNode || null);
      setTreeFormMode('add');
      setIsTreeFormDialogOpen(true);
      return;
    }

    setSelectedParent(parentNode || null);
    setFormData({
      [label]: '',
      [parentKey]: parentNode?.id || null, 
      [sortKey]: 1
    });
    setIsAddDialogOpen(true);
  }, [insertDatasetConfig, label, parentKey, sortKey]);

  const handleAddSubmit = useCallback(async () => {
    if (datasetConfig?.datasetId) {
      setIsApiLoading(true);
      try {

        const useAutoId = datasetConfig.useAutoId !== undefined ? datasetConfig.useAutoId : true;

        const dataToInsert = processInsertDataWithAutoId(
          formData, 
          keyField, 
          useAutoId
        );

        const responseData = await insertDatasetData(datasetConfig.datasetId, [dataToInsert]);

        if (responseData?.success) {
          toast({
            title: t('tree.add_success', 'Add Success'),
            description: t('tree.add_success_new', 'New node has been added'),
          });

          if (parameterConfig?.enableCommunication && parameterConfig?.enableEmit) {
            const triggers = parameterConfig?.triggers || {};
            if (triggers['onNodeAdd']?.enabled) {

              // communication.emit('treeRefreshTrigger', Date.now());

              const customFields = parameterConfig?.customEmitFields?.['onNodeAdd'] || [];
              customFields.forEach((field: any) => {
                if (field.fieldName && (dataToInsert as any)[field.fieldName] !== undefined) {
                  const paramName = `${TREE_CONFIG.PARAMETER_NAMES.SELECTED_PREFIX}${field.fieldName}`;
                  communication.emit(paramName, String((dataToInsert as any)[field.fieldName]));
                }
              });
            }
          }

          if (fetchDataFromApiRef.current) {
            await fetchDataFromApiRef.current();
          }
        } else {
          toast({
            variant: "destructive",
            title: t('tree.add_failed', 'Add Failed'),
            description: responseData?.message || t('tree.add_data_failed', 'Failed to add data'),
          });
        }
      } catch (error: unknown) {
        console.error('添加数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : t('tree.add_data_failed', 'Failed to add data');
        toast({
          variant: "destructive",
          title: t('tree.add_failed_title', 'Add Failed'),
          description: errorMessage,
        });
      } finally {
        setIsApiLoading(false);
      }
    } else {

      if (onAdd) {
        onAdd(selectedParent?._rawData || null);
      }
      toast({
        title: t('tree.add_success', 'Add Success'),
        description: t('tree.add_success_local', 'New node has been added to local data'),
      });
    }

    setIsAddDialogOpen(false);
    setFormData({});
    setSelectedParent(null);
  }, [datasetConfig, formData, keyField, selectedParent, onAdd, parameterConfig?.enableCommunication, parameterConfig?.enableEmit, parameterConfig?.triggers, communication]); 

  const handleEdit = useCallback((node: SimpleTreeNode) => {

    if (updateDatasetConfig?.targetDatasetId) {
      setSelectedNodeForEdit(node);
      setTreeFormMode('edit');
      setIsTreeFormDialogOpen(true);
      return;
    }

    setSelectedRecord(node._rawData || null);
    setFormData({
      [keyField]: node.id,
      [label]: node.name,
      [parentKey]: node._rawData?.[parentKey],
      [sortKey]: node._rawData?.[sortKey] || 1
    });
    setIsEditDialogOpen(true);
  }, [updateDatasetConfig, keyField, label, parentKey, sortKey]);

  const handleEditSubmit = useCallback(async () => {
    if (!selectedRecord) return;

    if (datasetConfig?.datasetId) {
      setIsApiLoading(true);
      try {
        const recordId = selectedRecord[keyField];

        const updateData = { ...formData };
        delete updateData[keyField];

        const response = await apiClient.post(
          `/datasets/${datasetConfig.datasetId}/data/update`,
          {
            filter: `${keyField}=${recordId}`,
            update_data: updateData
          }
        );

        const responseData = response.data as ApiResponse;

        if (responseData.success) {
          toast({
            title: t('tree.edit_success', 'Edit Success'),
            description: t('tree.edit_success_updated', 'Node has been updated'),
          });

          if (parameterConfig?.enableCommunication && parameterConfig?.enableEmit) {
            const triggers = parameterConfig?.triggers || {};
            if (triggers['onNodeEdit']?.enabled) {
              const updatedData = { ...selectedRecord, ...updateData };

              const customFields = parameterConfig?.customEmitFields?.['onNodeEdit'] || [];
              customFields.forEach((field: any) => {
                if (field.fieldName && (updatedData as any)[field.fieldName] !== undefined) {
                  const paramName = `${TREE_CONFIG.PARAMETER_NAMES.SELECTED_PREFIX}${field.fieldName}`;
                  communication.emit(paramName, String((updatedData as any)[field.fieldName]));
                }
              });
            }
          }

          if (fetchDataFromApiRef.current) {
            await fetchDataFromApiRef.current();
          }
        } else {
          toast({
            variant: "destructive",
            title: t('tree.edit_failed', 'Edit Failed'),
            description: responseData.message || responseData.error || t('tree.update_data_failed', 'Failed to update data'),
          });
        }
      } catch (error: unknown) {
        console.error('更新数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : t('tree.update_data_failed', 'Failed to update data');
        toast({
          variant: "destructive",
          title: t('tree.edit_failed_title', 'Edit Failed'),
          description: errorMessage,
        });
      } finally {
        setIsApiLoading(false);
      }
    } else {

      if (onEdit) {
        onEdit(selectedRecord);
      }
      toast({
        title: t('tree.edit_success', 'Edit Success'),
        description: t('tree.edit_success_local', 'Node has been updated locally'),
      });
    }

    setIsEditDialogOpen(false);
    setSelectedRecord(null);
    setFormData({});
  }, [selectedRecord, datasetConfig?.datasetId, formData, keyField, onEdit, parameterConfig?.enableCommunication, parameterConfig?.enableEmit, parameterConfig?.triggers, communication, label, parentKey]); 

  const handleDeleteNode = useCallback((node: SimpleTreeNode) => {
    setSelectedRecord(node._rawData || null);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedRecord) return;

    if (datasetConfig?.datasetId) {
      setIsApiLoading(true);
      try {
        const recordId = selectedRecord[keyField];

        const response = await apiClient.post(
          `/datasets/${datasetConfig.datasetId}/data/delete`,
          {
            filter: `${keyField}==${recordId}`
          }
        );

        const responseData = response.data as ApiResponse;

        if (responseData.success) {
          toast({
            title: t('tree.delete_success', 'Delete Success'),
            description: t('tree.delete_success_description', 'Node has been deleted'),
          });

          if (fetchDataFromApiRef.current) {
            await fetchDataFromApiRef.current();
          }
        } else {
          toast({
            variant: "destructive",
            title: t('tree.delete_failed', 'Delete Failed'),
            description: responseData.message || responseData.error || t('tree.delete_data_failed', 'Failed to delete data'),
          });
        }
      } catch (error: unknown) {
        console.error('删除数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : t('tree.delete_data_failed', 'Failed to delete data');
        toast({
          variant: "destructive",
          title: t('tree.delete_failed_title', 'Delete Failed'),
          description: errorMessage,
        });
      } finally {
        setIsApiLoading(false);
      }
    } else {

      if (onDataSourceChangeRef.current && dataSource) {
        const newData = dataSource.filter(item => item[keyField] !== selectedRecord[keyField]);
        onDataSourceChangeRef.current(newData);
      }
      toast({
        title: t('tree.delete_success', 'Delete Success'),
        description: t('tree.delete_success_local', 'Node has been deleted from local data'),
      });
    }

    setIsDeleteDialogOpen(false);
    setSelectedRecord(null);
  }, [selectedRecord, datasetConfig?.datasetId, keyField, dataSource]); 

  const handleFormChange = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const expandAll = useCallback(() => {
    setTreeData(prevData => {
      const expandAllNodes = (nodes: SimpleTreeNode[]): SimpleTreeNode[] => {
        return nodes.map(node => ({
          ...node,
          expanded: true,
          children: node.children ? expandAllNodes(node.children) : node.children
        }));
      };
      return expandAllNodes(prevData);
    });
  }, []);

  const collapseAll = useCallback(() => {
    setTreeData(prevData => {
      const collapseAllNodes = (nodes: SimpleTreeNode[]): SimpleTreeNode[] => {
        return nodes.map(node => ({
          ...node,
          expanded: false,
          children: node.children ? collapseAllNodes(node.children) : node.children
        }));
      };
      return collapseAllNodes(prevData);
    });
  }, []);

  const handleHover = useCallback((nodeId: string | number | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  const handleRefresh = useCallback(() => {

    if (datasetConfig?.datasetId) {

      setHasLoadError(false);
      setLastErrorTime(0);

      if (fetchDataFromApiRef.current) {
        fetchDataFromApiRef.current();
      }
      return;
    }

    if (databaseDataSourceConfig?.datasourceId) {
      refetchDatabaseData();
      return;
    }

    _onRefresh?.();
  }, [datasetConfig?.datasetId, databaseDataSourceConfig?.datasourceId, refetchDatabaseData, _onRefresh]);

  const searchResultCount = useMemo(() => {
    if (!searchText) return 0;
    let count = 0;
    const countMatches = (nodes: SimpleTreeNode[]) => {
      nodes.forEach(node => {
        if (node.matched) count++;
        if (node.children) countMatches(node.children);
      });
    };
    countMatches(treeData);
    return count;
  }, [treeData, searchText]);

  const isTreeLoading = loading || isInitialDataLoading || databaseLoading;

  const showEmptyState = !isTreeLoading && !treeData.length && (!dataSource || dataSource.length === 0);

  const showSearchEmpty = !isTreeLoading && searchText && treeData.length === 0;

  return (
    <Card className={cn(fillCell && 'flex h-full min-h-0 flex-col', className)}>
      <CardHeader className="pb-3">
        <div className={isMobileFlow ? 'flex flex-wrap items-center justify-between gap-2' : 'flex items-center justify-between'}>
          <CardTitle className={isMobileFlow ? 'text-sm min-w-0 flex-1 truncate' : 'text-sm'}>{title}</CardTitle>
          {addable && (
            <Button
              variant="outline"
              size="sm"
              className={isMobileFlow ? 'shrink-0' : undefined}
              onClick={() => handleAdd()}
            >
              {renderLucideIcon('plus', 'h-3 w-3 mr-1')}
              {t('tree.add_root_node', 'Add Root Node')}
            </Button>
          )}
        </div>

        {searchable && (
          <div className={isMobileFlow ? 'flex flex-wrap gap-2' : 'flex gap-2'}>
            <div className="relative flex-1">
              {renderLucideIcon('search', 'absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground')}
              <Input
                placeholder={t('tree.search_node_placeholder', 'Search node...')}
                value={searchText}
                onChange={(e) => {
                  // A selection temporarily protects its local expanded/selected state.
                  // Filtering is an explicit user action and must take effect immediately.
                  lastClickTimeRef.current = 0;
                  setSearchText(e.target.value);
                }}
                className="pl-9 pr-8 h-8"
              />
              {searchText && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0", SEMANTIC_COLORS.hover.secondary)}
                  onClick={() => {
                    lastClickTimeRef.current = 0;
                    setSearchText('');
                  }}
                  title={t('tree.clear_search', 'Clear Search')}
                >
                  {renderLucideIcon('x', 'h-3 w-3')}
                </Button>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="h-8 px-2"
                title={t('tree.expand_all', 'Expand All')}
              >
                {renderLucideIcon('expand', 'h-3 w-3')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="h-8 px-2"
                title={t('tree.collapse_all', 'Collapse All')}
              >
                {renderLucideIcon('shrink', 'h-3 w-3')}
              </Button>
              {_onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-8 px-2"
                  title={t('tree.refresh_data', 'Refresh Data')}
                  disabled={isTreeLoading}
                >
                  {renderLucideIcon('refresh-cw', cn('h-3 w-3', isTreeLoading && 'animate-spin'))}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className={cn('pt-0', fillCell && 'flex min-h-0 flex-1 flex-col')}>
        {isTreeLoading ? (
          <div className={cn('relative', fillCell && 'flex min-h-0 flex-1 flex-col')}>
            {!isInitialDataLoading && (
              <div className="absolute right-3 top-3 z-10">
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            )}
            {isInitialDataLoading ? (
              <div
                className={cn('tree-container overflow-auto border rounded-lg custom-scrollbar', fillCell && 'min-h-0 flex-1')}
                style={fillCell ? undefined : { height: `${height}px` }}
                aria-busy="true"
              >
                <div className="p-2 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 py-1"
                      style={{ paddingLeft: `${(i % 4) * 16 + 8}px` }}
                    >
                      <Skeleton className="h-4 w-4 shrink-0 rounded" />
                      <Skeleton className="h-4" style={{ width: `${48 + ((i * 13) % 36)}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
            <div
              className={cn('tree-container overflow-auto border rounded-lg group custom-scrollbar', fillCell && 'min-h-0 flex-1')}
              style={fillCell ? undefined : { height: `${height}px` }}
            >
              <div className="p-2 space-y-1">
                {searchText && (
                  <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                    {searchResultCount > 0 ? (
                      <span>{t('tree.search_results_found', 'Found {{count}} matching results', { count: searchResultCount })}</span>
                    ) : (
                      <span>{t('tree.no_matching_nodes', 'No matching nodes found')}</span>
                    )}
                  </div>
                )}

                {showEmptyState ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {renderLucideIcon('file', 'h-8 w-8 mx-auto mb-2 opacity-50')}
                    <p className="text-sm">{t('tree.no_data', 'No data')}</p>
                  </div>
                ) : showSearchEmpty ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {renderLucideIcon('search', 'h-8 w-8 mx-auto mb-2 opacity-50')}
                    <p className="text-sm">{t('tree.no_matching_nodes', 'No matching nodes found')}</p>
                    <p className="text-xs mt-1">{t('tree.try_different_keywords', 'Try using different keywords to search')}</p>
                  </div>
                ) : (
                  treeData.map((node, index) => (
                    <TreeNodeComponent
                      key={`${node.id}-${index}`}
                      node={node}
                      searchText={searchText}
                      showIcon={showIcon}
                      showCount={showCount}
                      addable={false} 
                      editable={false} 
                      deletable={false} 
                      hoveredNodeId={hoveredNodeId}
                      siblings={treeData}
                      nodeIndex={index}
                      isMobileFlow={isMobileFlow}
                      onToggle={() => {}}
                      onSelect={() => {}} 
                      onAdd={undefined}
                      onEdit={undefined}
                      onDelete={undefined}
                      onMoveUp={undefined}
                      onMoveDown={undefined}
                      onHover={handleHover}
                    />
                  ))
                )}
              </div>
            </div>
            )}
          </div>
        ) : (
          <div
            className={cn('tree-container overflow-auto border rounded-lg group custom-scrollbar', fillCell && 'min-h-0 flex-1')}
            style={fillCell ? undefined : { height: `${height}px` }}
          >
            <div className="p-2 space-y-1">
              {searchText && (
                <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                  {searchResultCount > 0 ? (
                    <span>{t('tree.search_results_found', 'Found {{count}} matching results', { count: searchResultCount })}</span>
                  ) : (
                    <span>{t('tree.no_matching_nodes', 'No matching nodes found')}</span>
                  )}
                </div>
              )}

              {showEmptyState ? (
                <div className="text-center py-8 text-muted-foreground">
                  {renderLucideIcon('file', 'h-8 w-8 mx-auto mb-2 opacity-50')}
                  <p className="text-sm">{t('tree.no_data', 'No data')}</p>
                </div>
              ) : showSearchEmpty ? (
                <div className="text-center py-8 text-muted-foreground">
                  {renderLucideIcon('search', 'h-8 w-8 mx-auto mb-2 opacity-50')}
                  <p className="text-sm">{t('tree.no_matching_nodes', 'No matching nodes found')}</p>
                  <p className="text-xs mt-1">{t('tree.try_different_keywords', 'Try using different keywords to search')}</p>
                </div>
              ) : (
                treeData.map((node, index) => (
                  <TreeNodeComponent
                    key={`${node.id}-${index}`}
                    node={node}
                    searchText={searchText}
                    showIcon={showIcon}
                    showCount={showCount}
                    addable={addable}
                    editable={editable}
                    deletable={deletable}
                    hoveredNodeId={hoveredNodeId}
                    siblings={treeData}
                    nodeIndex={index}
                    isMobileFlow={isMobileFlow}
                    onToggle={handleToggle}
                    onSelect={handleSelect}
                                          onAdd={handleAdd}
                      onEdit={handleEdit}
                      onDelete={deletable ? handleDeleteNode : undefined}
                      onMoveUp={onMoveUp ? (node) => onMoveUp(node._rawData || (node as any)) : undefined}
                      onMoveDown={onMoveDown ? (node) => onMoveDown(node._rawData || (node as any)) : undefined}
                    onHover={handleHover}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.md.width, maxHeight: MODAL_DIMENSIONS.md.maxHeight }} className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedParent ? t('tree.add_child_node_title', 'Add Child Node') : t('tree.add_root_node_title', 'Add Root Node')}</DialogTitle>
            <DialogDescription>
              {selectedParent ? t('tree.add_child_node_description', 'Add a new child node under "{{name}}"', { name: selectedParent.name }) : t('tree.add_root_node_description', 'Add a new root node')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t('tree.node_name', 'Node Name')}</Label>
              <Input
                id="name"
                value={formData[label] || ''}
                onChange={(e) => handleFormChange(label, e.target.value)}
                placeholder={t('tree.node_name_placeholder', 'Please enter node name')}
              />
            </div>
            <div>
              <Label htmlFor="sort">{t('tree.sort', 'Sort')}</Label>
              <Input
                id="sort"
                type="number"
                value={formData[sortKey] || 1}
                onChange={(e) => handleFormChange(sortKey, parseInt(e.target.value) || 1)}
                placeholder={t('tree.sort_placeholder', 'Sort value')}
              />
            </div>
            {selectedParent && (
              <div>
                <Label>{t('tree.parent_node', 'Parent Node')}</Label>
                <Input
                  value={selectedParent.name || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button onClick={handleAddSubmit} disabled={isApiLoading}>
              {isApiLoading ? t('tree.adding', 'Adding...') : t('common:confirm', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.md.width, maxHeight: MODAL_DIMENSIONS.md.maxHeight }} className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('tree.edit_node_title', 'Edit Node')}</DialogTitle>
            <DialogDescription>
              {t('tree.edit_node_description', 'Modify the node name and sort information')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{t('tree.node_name', 'Node Name')}</Label>
              <Input
                id="edit-name"
                value={formData[label] || ''}
                onChange={(e) => handleFormChange(label, e.target.value)}
                placeholder={t('tree.node_name_placeholder', 'Please enter node name')}
              />
            </div>
            <div>
              <Label htmlFor="edit-sort">{t('tree.sort', 'Sort')}</Label>
              <Input
                id="edit-sort"
                type="number"
                value={formData[sortKey] || 1}
                onChange={(e) => handleFormChange(sortKey, parseInt(e.target.value) || 1)}
                placeholder={t('tree.sort_placeholder', 'Sort value')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button onClick={handleEditSubmit} disabled={isApiLoading}>
              {isApiLoading ? t('tree.saving', 'Saving...') : t('common:save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.sm.width, maxHeight: MODAL_DIMENSIONS.sm.maxHeight }} className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('tree.confirm_delete', 'Confirm Delete')}</DialogTitle>
            <DialogDescription>
              {t('tree.confirm_delete_description', 'This operation will permanently delete the selected node. Please confirm to continue')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t('tree.delete_node_confirm', 'Are you sure you want to delete node {{name}}?', { name: selectedRecord?.[label] })}
            </p>
            <p className="text-xs text-destructive mt-2">
              {t('tree.delete_warning', 'This operation cannot be undone. If this node has child nodes, please delete them first.')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isApiLoading}>
              {isApiLoading ? t('tree.deleting', 'Deleting...') : t('tree.confirm_delete_button', 'Confirm Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TreeFormDialog
        isOpen={isTreeFormDialogOpen}
        mode={treeFormMode}
        onClose={() => {
          setIsTreeFormDialogOpen(false);
          setSelectedParent(null);
          setSelectedNodeForEdit(null);
        }}
        onSubmit={handleTreeFormSubmit}
        insertConfig={treeFormMode === 'add' ? insertDatasetConfig : undefined}
        updateConfig={treeFormMode === 'edit' ? updateDatasetConfig : undefined}
        treeColumns={[
          {
            title: t('tree.unique_id', 'Unique ID'),
            dataIndex: keyField,
            key: keyField,
            type: 'INT32' as const  
          },
          {
            title: t('tree.display_name', 'Display Name'),
            dataIndex: label,
            key: label,
            type: 'VARCHAR' as const
          },
          {
            title: t('tree.parent_id', 'Parent ID'),
            dataIndex: parentKey,
            key: parentKey,
            type: 'VARCHAR' as const
          },
          {
            title: t('tree.sort', 'Sort'),
            dataIndex: sortKey,
            key: sortKey,
            type: 'INT32' as const
          }
        ]}
        selectedNode={selectedNodeForEdit}
        selectedParent={treeFormMode === 'add' ? selectedParent : undefined}
        parentKey={parentKey}
        availableParameters={[]} 
      />
    </Card>
  );
};

export default SimpleTreeRenderer;
