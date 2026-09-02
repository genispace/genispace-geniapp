# 通用工作流组件设计文档

## 1. 概述

### 1.1 设计目标

将发票识别演示组件抽象为通用的工作流组件，支持通过配置驱动不同的业务场景，实现高度可复用和可扩展的组件系统。

### 1.2 核心特性

- **配置驱动**：通过JSON配置定义工作流步骤和行为
- **插件化渲染**：支持多种提案渲染器（表格、表单、卡片等）
- **可扩展性**：支持自定义渲染器和数据转换逻辑
- **类型安全**：完整的TypeScript类型定义
- **预设配置**：提供常用业务场景的预设配置

## 2. 架构设计

### 2.1 组件层次结构

```
WorkflowComponent (主组件)
├── WorkflowStep (步骤组件)
│   ├── UploadStep (上传步骤)
│   ├── ProposalStep (提案步骤)
│   │   ├── ProposalRendererFactory (渲染器工厂)
│   │   │   ├── TableRenderer (系统表格渲染器 - 重用)
│   │   │   ├── SimpleSchemaForm (表单渲染器)
│   │   │   └── DataGridCard (系统卡片渲染器 - 重用)
│   │   └── ActionButtons (操作按钮组)
│   └── ResultStep (结果步骤)
└── WorkflowConfig (配置管理)
```

**注意**：表格和卡片渲染器重用了系统的 `TableRenderer` 和 `DataGridCard` 组件，提供更完整的功能（分页、排序、筛选等）。

### 2.2 数据流

```
1. 用户上传文件
   ↓
2. 调用Agent API识别
   ↓
3. 存储到 stepData['upload']
   ↓
4. 数据转换: transformStepData('upload', data) → stepData['proposal']
   ↓
5. 显示提案 (可编辑)
   ↓
6. 用户操作 (批准/编辑/拒绝)
   ↓
7. 数据转换: prepareStepOutput('proposal', data) → stepData['result']
   ↓
8. 提交/过账
   ↓
9. 显示结果
```

**关键特性**：
- 所有步骤数据统一存储在 `stepData` 对象中，key 为步骤ID
- 使用通用的 `transformStepData` 和 `prepareStepOutput` 函数，支持任意步骤ID
- 数据结构清晰简洁，便于扩展和维护

## 3. 类型定义

### 3.1 核心接口

#### WorkflowStep
```typescript
interface WorkflowStep {
  id: string;                    // 步骤唯一标识
  title: string;                 // 步骤标题
  description: string;           // 步骤描述
  icon?: string;                 // 图标名称（Lucide图标）
  component: StepComponentType;  // 步骤组件类型
  config: StepConfig;            // 步骤配置
  order?: number;                // 显示顺序（默认按数组顺序）
}
```

#### StepComponentType
```typescript
type StepComponentType = 
  | 'upload'      // 文件上传步骤
  | 'proposal'    // 提案展示步骤
  | 'result'      // 结果显示步骤
  | 'custom';     // 自定义步骤
```

#### StepConfig
```typescript
interface StepConfig {
  upload?: UploadStepConfig;
  proposal?: ProposalStepConfig;
  result?: ResultStepConfig;
  custom?: CustomStepConfig;
}
```

### 3.2 步骤配置

#### UploadStepConfig
```typescript
interface UploadStepConfig {
  accept?: string;              // 接受的文件类型，如 "image/*,.pdf"
  maxSize?: number;             // 最大文件大小（字节）
  multiple?: boolean;           // 是否支持多文件
  preview?: boolean;            // 是否显示预览
  buttonText?: string;         // 上传按钮文本
  placeholder?: string;        // 占位符文本
  onUpload?: (file: File) => Promise<any>; // 自定义上传处理
}
```

#### ProposalStepConfig
```typescript
interface ProposalStepConfig {
  renderer: ProposalRendererType;  // 渲染器类型
  rendererConfig: ProposalRendererConfig; // 渲染器配置
  actions: ActionButton[];         // 操作按钮配置
  metadata?: MetadataField[];      // 元数据字段
  alerts?: AlertConfig[];          // 警告/提示信息
  editable?: boolean;              // 是否可编辑
  editMode?: 'inline' | 'form';    // 编辑模式
}
```

#### ResultStepConfig
```typescript
interface ResultStepConfig {
  displayFormat: 'json' | 'table' | 'card' | 'custom'; // 显示格式
  showCopy?: boolean;            // 是否显示复制按钮
  successMessage?: string;       // 成功消息
  errorMessage?: string;         // 错误消息
  customRenderer?: string;       // 自定义渲染器ID
}
```

### 3.3 提案渲染器

#### ProposalRendererType
```typescript
type ProposalRendererType = 
  | 'table'   // 表格渲染器
  | 'form'    // 表单渲染器
  | 'card'    // 卡片渲染器
  | 'custom'; // 自定义渲染器
```

#### ProposalRendererConfig
```typescript
interface ProposalRendererConfig {
  type: ProposalRendererType;
  
  // 表格配置
  table?: {
    columns: TableColumn[];
    dataPath?: string;           // JSON路径，如 "entries"
    showHeader?: boolean;         // 是否显示表头
    striped?: boolean;           // 是否显示斑马纹
  };
  
  // 表单配置
  form?: {
    schema: JSONSchema;          // JSON Schema定义
    layout?: 'vertical' | 'horizontal' | 'grid';
    showOptionalFields?: boolean; // 是否显示可选字段
  };
  
  // 卡片配置
  card?: {
    fields: CardField[];
    layout?: 'grid' | 'list';   // 布局方式
  };
  
  // 自定义渲染器配置
  custom?: {
    rendererId: string;          // 自定义渲染器ID
    props?: Record<string, any>;  // 传递给渲染器的props
  };
}
```

#### TableColumn
```typescript
interface TableColumn {
  key: string;                   // 数据字段key
  label: string;                 // 列标题
  type?: 'text' | 'number' | 'currency' | 'date' | 'boolean';
  format?: string;              // 格式化字符串，如 "YYYY-MM-DD"
  align?: 'left' | 'center' | 'right';
  width?: string | number;       // 列宽
  render?: (value: any, record: any) => React.ReactNode; // 自定义渲染
}
```

#### CardField
```typescript
interface CardField {
  key: string;                   // 数据字段key
  label: string;                 // 字段标签
  type: 'text' | 'badge' | 'progress' | 'link' | 'custom';
  valuePath?: string;           // JSON路径
  format?: string;              // 格式化
  icon?: string;                // 图标
  color?: string;               // 颜色（用于badge）
}
```

### 3.4 操作按钮

#### ActionButton
```typescript
interface ActionButton {
  id: string;                    // 按钮唯一标识
  label: string;                 // 按钮文本
  variant: 'primary' | 'secondary' | 'destructive' | 'outline';
  icon?: string;                 // 图标名称
  action: ActionType;            // 操作类型
  handler?: string;              // 自定义处理函数名
  confirmMessage?: string;       // 确认消息
  disabled?: boolean | ((data: any) => boolean); // 禁用条件
  loading?: boolean;             // 是否显示加载状态
}
```

#### ActionType
```typescript
type ActionType = 
  | 'approve'    // 批准操作
  | 'edit'       // 编辑操作
  | 'reject'     // 拒绝操作
  | 'submit'     // 提交操作
  | 'cancel'     // 取消操作
  | 'custom';    // 自定义操作
```

### 3.5 元数据和警告

#### MetadataField
```typescript
interface MetadataField {
  key: string;                   // 字段key
  label: string;                 // 字段标签
  valuePath: string;             // JSON路径，如 "postingDate"
  icon?: string;                 // 图标
  format?: 'date' | 'currency' | 'percentage' | 'text' | 'number';
  color?: string;                // 显示颜色
}
```

#### AlertConfig
```typescript
interface AlertConfig {
  type: 'warning' | 'info' | 'success' | 'error';
  message: string;              // 消息内容
  icon?: string;                 // 图标（可选，默认根据type）
  dismissible?: boolean;         // 是否可关闭
}
```

### 3.6 数据转换

#### DataTransformConfig
```typescript
interface DataTransformConfig {
  // 通用的步骤间数据转换函数
  // stepId: 步骤ID（如 'upload', 'proposal', 'result'）
  // data: 当前步骤的数据
  // context: 上下文信息（包含其他步骤的数据等）
  transformStepData?: (stepId: string, data: any, context?: any) => any;
  
  // 准备步骤输出数据
  // 用于生成最终提交的数据
  prepareStepOutput?: (stepId: string, data: any, context?: any) => any;
  
  // 验证步骤数据
  // 返回验证结果和错误信息
  validateStepData?: (stepId: string, data: any) => { valid: boolean; errors?: string[] };
  
  // API 调用处理器配置
  // key 为步骤ID，value 为处理函数
  apiHandlers?: {
    [stepId: string]: (data: any, config: any) => Promise<any>;
  };
}
```

**优势**：
- 通用性强：支持任意步骤ID，不局限于特定业务场景
- 易于扩展：新增步骤类型无需修改核心逻辑
- 结构清晰：统一的数据转换接口，便于理解和维护

### 3.7 主组件Props

#### WorkflowComponentProps
```typescript
interface WorkflowComponentProps {
  // 基础配置
  agentId?: string;              // Agent ID（用于调用API）
  className?: string;            // 自定义样式类
  
  // 工作流配置
  steps: WorkflowStep[];         // 工作流步骤配置
  
  // 数据转换配置
  transforms?: DataTransformConfig; // 数据转换函数
  
  // 回调函数
  onStepComplete?: (stepId: string, data: any) => void;
  onWorkflowComplete?: (finalData: any) => void;
  onError?: (error: Error, stepId?: string) => void;
  onAction?: (actionId: string, data: any) => void | Promise<void>;
  
  // Mock数据
  useMockData?: boolean;
  // Mock数据（key 为步骤ID，如 'upload', 'proposal', 'result'）
  mockData?: Record<string, any>;
  
  // 自定义渲染器
  customRenderers?: {
    [rendererId: string]: React.ComponentType<any>;
  };
  
  // 布局配置
  layout?: {
    columns?: number;            // 列数（默认3）
    gap?: string;                // 间距（默认"gap-4"）
  };
}
```

#### WorkflowState
```typescript
interface WorkflowState {
  // 当前步骤索引
  currentStep: number;
  // 步骤数据（key 为步骤ID）
  stepData: Record<string, any>;
  // 上传的文件
  uploadedFile: File | null;
  // 是否正在处理
  isProcessing: boolean;
  // 错误信息
  error: Error | null;
  // 编辑模式
  isEditing?: boolean;
  // 操作状态
  actionStatus: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
}
```

## 4. 实现计划

### 4.1 第一阶段：核心类型和基础组件

1. ✅ 创建类型定义文件 `types.ts`
2. ✅ 实现基础步骤组件框架
3. ✅ 实现UploadStep组件
4. ✅ 实现ResultStep组件

### 4.2 第二阶段：提案渲染器

1. ✅ 实现ProposalRendererFactory
2. ✅ 集成系统TableRenderer（重用现有组件）
3. ✅ 实现FormRenderer（复用SimpleSchemaForm）
4. ✅ 集成系统DataGridCard（重用现有组件）

### 4.3 第三阶段：主组件和集成

1. ✅ 实现WorkflowComponent主组件
2. ✅ 实现数据转换管道
3. ✅ 实现操作按钮处理逻辑
4. ✅ 集成到工作台系统

### 4.4 第四阶段：预设配置和文档

1. ✅ 创建发票识别预设配置
2. ✅ 创建其他业务场景预设配置
3. ✅ 编写使用文档和示例
4. ✅ 更新组件注册

## 5. 使用示例

### 5.1 基础使用

```typescript
import { WorkflowComponent } from './WorkflowComponent';
import { invoiceRecognitionSteps, invoiceRecognitionTransforms } from './configs/invoiceRecognition';

<WorkflowComponent
  steps={invoiceRecognitionSteps}
  transforms={invoiceRecognitionTransforms}
  agentId="agent-123"
  onWorkflowComplete={(data) => {
    console.log('Workflow completed:', data);
  }}
/>
```

### 5.2 自定义配置

```typescript
<WorkflowComponent
  steps={[
    {
      id: 'upload',
      title: 'Upload Document',
      description: 'Upload your document',
      icon: 'Upload',
      component: 'upload',
      config: {
        upload: {
          accept: 'image/*,.pdf',
          maxSize: 10 * 1024 * 1024
        }
      }
    },
    {
      id: 'review',
      title: 'Review Proposal',
      description: 'Review the AI proposal',
      icon: 'Brain',
      component: 'proposal',
      config: {
        proposal: {
          renderer: 'table',
          rendererConfig: {
            type: 'table',
            table: {
              columns: [
                { key: 'field1', label: 'Field 1', type: 'text' },
                { key: 'field2', label: 'Field 2', type: 'number' }
              ]
            }
          },
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              variant: 'primary',
              action: 'approve'
            }
          ]
        }
      }
    }
  ]}
  transforms={{
    transformStepData: (stepId, data, context) => {
      // 自定义转换逻辑
      if (stepId === 'upload') {
        // 从上传数据生成提案
        return { /* ... */ };
      }
      return data;
    },
    prepareStepOutput: (stepId, data, context) => {
      // 准备输出数据
      if (stepId === 'proposal') {
        return { /* ... */ };
      }
      return data;
    }
  }}
/>
```

### 5.3 自定义渲染器

```typescript
const CustomReviewRenderer: React.FC<{ data: any }> = ({ data }) => {
  return <div>Custom Review UI</div>;
};

<WorkflowComponent
  steps={steps}
  customRenderers={{
    'custom-review': CustomReviewRenderer
  }}
/>
```

## 6. 预设配置

### 6.1 发票识别配置

位置：`mocks/invoiceRecognitionMockData.json`

包含：
- 三步工作流配置（steps）
- 会计科目表格渲染器配置（使用系统TableRenderer）
- 表单配置（用于编辑模式）
- 三个操作按钮配置
- 数据转换逻辑（transforms，以代码字符串形式存储）
  - `transformStepData`: 通用的步骤间数据转换
  - `prepareStepOutput`: 准备步骤输出
  - `validateStepData`: 验证步骤数据
- Mock数据（key对应步骤ID：upload、proposal、result）

### 6.2 其他预设配置（未来扩展）

- 合同审核工作流
- 文档分类工作流
- 数据提取工作流

## 7. 扩展点

### 7.1 自定义步骤组件

通过 `component: 'custom'` 和 `customRenderers` 支持自定义步骤组件。

### 7.2 自定义渲染器

通过 `renderer: 'custom'` 和 `customRenderers` 支持自定义提案渲染器。

### 7.3 自定义数据转换

通过 `transforms` 配置自定义数据转换逻辑。

### 7.4 自定义操作处理

通过 `onAction` 回调处理自定义操作。

## 8. 注意事项

1. **数据路径**：使用JSON路径（如 "entries[0].account"）访问嵌套数据
2. **类型安全**：所有配置都有完整的TypeScript类型定义
3. **错误处理**：所有异步操作都应该有错误处理
4. **性能优化**：大数据量时考虑虚拟滚动和分页
5. **可访问性**：确保所有交互元素都有适当的ARIA标签
6. **组件重用**：表格和卡片渲染器重用了系统的 `TableRenderer` 和 `DataGridCard`，提供更完整的功能
7. **数据存储**：所有步骤数据统一存储在 `stepData` 对象中，key 为步骤ID，便于扩展和维护
8. **通用函数**：使用 `transformStepData`、`prepareStepOutput`、`validateStepData` 等通用函数，支持任意步骤ID
9. **JSON配置转换**：JSON配置中的函数代码会在运行时通过 `createTransformsFromConfig` 转换为实际函数

## 9. 测试策略

1. **单元测试**：测试各个渲染器和转换函数
2. **集成测试**：测试完整工作流
3. **E2E测试**：测试用户交互流程
4. **性能测试**：测试大数据量场景

## 10. 实现细节

### 10.1 组件重用

- **TableRenderer**: 重用了系统的 `TableRenderer` 组件（`@/renderers/table/TableRenderer`）
  - 提供完整功能：分页、排序、筛选、编辑等
  - 通过适配器将 WorkflowComponent 的配置转换为系统组件需要的格式
- **DataGridCard**: 重用了系统的 `DataGridCard` 组件（`@/renderers/data-grid-card/DataGridCard`）
  - 用于卡片式数据展示
  - 支持搜索、分页等功能

### 10.2 数据转换

历史版本允许在 JSON 配置的 `transforms.*.code` 中保存 JavaScript，并在浏览器主上下文执行。该能力现已禁用：`createTransformsFromConfig` 对旧的可执行字段只记录告警并返回 `undefined`，不会解释或执行代码。

```typescript
// 历史配置（仅用于识别和迁移，不会执行）
{
  "transforms": {
    "transformStepData": {
      "type": "function",
      "code": "if (stepId === 'upload') { return {...}; } return data;"
    }
  }
}

// 当前行为
createTransformsFromConfig(config); // => undefined；不执行 code
```

后续如需恢复转换能力，应使用版本化、可在 API 侧校验的声明式操作 DSL；在该 DSL 上线并完成旧配置迁移前，不得恢复任意 JavaScript 执行。

### 10.3 编辑模式切换

当 `editMode === 'form'` 且存在 `form` 配置时，`ProposalStep` 会自动将渲染器类型切换为 `'form'`：

```typescript
config={
  config.editMode === 'form' && config.rendererConfig.form
    ? { ...config.rendererConfig, type: 'form' as const }
    : config.rendererConfig
}
```

## 11. 未来优化

1. **工作流状态持久化**：支持保存和恢复工作流状态
2. **步骤依赖**：支持步骤之间的依赖关系
3. **条件分支**：支持基于条件的工作流分支
4. **并行步骤**：支持并行执行的步骤
5. **工作流模板**：提供更多业务场景模板
6. **更多步骤类型**：扩展步骤类型（如 `review`、`approval` 等）
7. **API配置化**：通过 `apiHandlers` 配置替代硬编码的API调用
