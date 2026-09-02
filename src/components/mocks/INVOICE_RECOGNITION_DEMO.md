# 发票识别演示说明

## 概述

这是一个使用任务型智能体识别发票并提取结构化数据的演示工作台。演示使用通用的 `WorkflowComponent` 组件，通过配置驱动的方式实现发票识别工作流。演示包含三个步骤：

1. **步骤1：文档上传** - 上传发票图片或PDF文件，使用智能体识别并提取结构化数据
2. **步骤2：会计科目提案** - 查看AI生成的会计科目提案（表格形式），可以编辑、批准或拒绝
3. **步骤3：自动化过账** - 显示最终提交的过账数据，包含完整的可追溯性信息

## 访问方式

```
http://localhost:5013/workbench/demo-invoiceRecognition/invoice-demo
```

## 功能说明

### 步骤1：文档上传

- 支持上传图片（jpg, png等）和PDF文件
- 点击"开始识别"按钮调用智能体API
- 识别成功后显示提取的字段数量
- 支持Mock数据模式（无需真实智能体）
- 支持文件预览和移除

### 步骤2：会计科目提案

- 以表格形式展示AI生成的会计科目分录
- 显示元数据信息：过账日期、VAT处理方式、置信度分数
- 支持三种操作：
  - **批准并过账**：确认提案并提交到会计系统
  - **编辑提案**：进入编辑模式，使用表单编辑提取的数据
  - **拒绝/请求澄清**：拒绝当前提案，重新开始流程
- 显示警告和提示信息
- 编辑模式下支持根据JSON Schema自动生成表单

### 步骤3：自动化过账

- 显示最终提交的JSON数据
- 包含完整的过账信息和元数据
- 支持复制到剪贴板
- 格式化的JSON显示

## Mock数据

演示使用Mock数据，包含：

- **upload**: 模拟的发票识别结果（从发票中提取的结构化数据，对应步骤ID为"upload"）
- **proposal**: 模拟的会计科目提案（由upload数据转换生成，对应步骤ID为"proposal"）
- **result**: 最终提交的数据（初始为null，批准后生成，对应步骤ID为"result"）

注意：`inputSchema` 和转换逻辑已内置在预设配置中，无需在mock数据中提供。Mock数据的key对应工作流步骤的ID。

## 配置说明

### 使用 JSON 配置（推荐）

所有工作流配置都存储在 JSON 文件中，包括步骤配置和数据转换逻辑：

```json
{
  "id": "invoice-recognition-demo",
  "type": "WorkflowComponent",
  "props": {
    "steps": [...完整的步骤配置...],
    "transforms": {
      "transformStepData": {
        "type": "function",
        "code": "..."
      },
      "prepareStepOutput": {
        "type": "function",
        "code": "..."
      },
      "validateStepData": {
        "type": "function",
        "code": "..."
      }
    }
  },
  "useMockData": true,
  "mockData": {
    "upload": {
      "invoiceNumber": "INV-2024-001234",
      "invoiceDate": "2025-03-12",
      "sellerName": "Example Supplier Company",
      "buyerName": "Example Buyer Company",
      "totalAmount": 1250.00,
      "taxAmount": 250.00,
      "amountWithoutTax": 1000.00,
      "taxRate": 25
    },
    "proposal": {
      "entries": [...],
      "postingDate": "2025-03-12",
      "vatHandling": "Domestic VAT 25%",
      "confidenceScore": 92
    },
    "result": null
  }
}
```

### 使用真实智能体

在组件配置中设置`agentId`，工作流配置通过`steps`和`transforms`传入：

```json
{
  "id": "invoice-recognition-demo",
  "type": "WorkflowComponent",
  "props": {
    "agentId": "your-agent-id",
    "steps": [...],
    "transforms": {...}
  },
  "useMockData": false
}
```

### 自定义配置

如果需要自定义工作流步骤或数据转换逻辑，可以直接传入`steps`和`transforms`配置：

```json
{
  "id": "invoice-recognition-demo",
  "type": "WorkflowComponent",
  "props": {
    "steps": [...],
    "transforms": {...}
  }
}
```

## 技术实现

### 组件架构

演示使用通用的 `WorkflowComponent` 组件，通过配置驱动的方式实现工作流：

- **WorkflowComponent**: 主组件，支持配置驱动的工作流
- **工作流配置**: 所有配置都存储在 `invoiceRecognitionMockData.json` 中，包括步骤配置和数据转换逻辑
  - 三个步骤：上传、提案、结果
  - 表格渲染器：用于显示会计科目分录
  - 数据转换逻辑：从提取数据生成提案，从提案生成最终payload
  - 操作按钮：批准、编辑、拒绝

### 工作流步骤

1. **上传步骤 (UploadStep)**: 文件上传和识别
2. **提案步骤 (ProposalStep)**: 显示AI生成的提案，支持编辑和操作
3. **结果步骤 (ResultStep)**: 显示最终提交结果

### 数据转换流程

```
上传文件 → 调用Agent API → stepData['upload']
  ↓
transformStepData('upload', data) → stepData['proposal'] (会计科目提案)
  ↓
用户操作（批准/编辑/拒绝）
  ↓
prepareStepOutput('proposal', data) → stepData['result']
```

所有步骤数据统一存储在 `stepData` 对象中，key 为步骤ID（如 'upload'、'proposal'、'result'）。

### 智能体API调用

当使用真实智能体时，组件会：

1. 获取智能体配置（`GET /agents/{agentId}`）
2. 提取`inputSchema`（如果Agent配置中包含）
3. 将上传的文件转换为base64
4. 调用智能体执行API（`POST /agents/{agentId}/execute`）
5. 解析返回的结构化数据
6. 使用JSON配置中的数据转换逻辑生成会计科目提案

### JSON配置结构

发票识别工作流配置存储在 `invoiceRecognitionMockData.json` 中，包含：

- **步骤配置**: 三个步骤的完整配置
- **表格渲染器配置**: 会计科目表格的列定义
- **操作按钮配置**: 批准、编辑、拒绝按钮
- **元数据字段**: 过账日期、VAT处理、置信度
- **警告提示**: 安全提示和学习提示
- **数据转换函数**: 
  - `transformStepData`: 通用的步骤间数据转换函数（根据 stepId 处理不同步骤的数据转换）
  - `prepareStepOutput`: 准备步骤输出数据（用于生成最终提交的数据）
  - `validateStepData`: 验证步骤数据（根据 stepId 验证不同步骤的数据）

## 使用示例

1. 访问演示页面
2. 在步骤1中上传发票文件（或使用Mock数据自动填充）
3. 点击"开始识别"按钮
4. 在步骤2中查看AI生成的会计科目提案：
   - 查看表格中的会计科目分录
   - 查看元数据信息（过账日期、VAT处理、置信度）
   - 选择操作：批准并过账、编辑提案、或拒绝提案
5. 如果选择编辑，可以修改提取的数据，然后保存更新提案
6. 如果选择批准，在步骤3中查看最终的过账Payload

## JSON配置说明

发票识别工作流配置存储在 `invoiceRecognitionMockData.json` 中，包含：

- **步骤配置 (steps)**: 三个步骤的标题、描述、图标等
- **渲染器配置**: 表格渲染器的列定义和样式
- **操作按钮**: 三个操作按钮的配置
- **数据转换 (transforms)**: 以代码字符串形式存储，运行时转换为函数
  - `transformStepData`: 处理步骤间数据转换（如从 upload 数据生成 proposal）
  - `prepareStepOutput`: 准备步骤输出（如从 proposal 生成 result）
  - `validateStepData`: 验证步骤数据
- **Mock数据**: 用于演示的测试数据（key 对应步骤ID：upload、proposal、result）

## 注意事项

- Mock模式下不需要真实的智能体ID，会自动使用JSON配置中的转换逻辑
- 文件上传仅支持图片和PDF格式
- 表单验证会检查所有必填字段（根据预设配置中的inputSchema）
- 数组和对象字段在编辑模式下需要输入有效的JSON格式
- JSON配置中的转换逻辑会自动计算会计科目分录
- 所有配置都存储在JSON文件中，完全由配置驱动，无需修改代码
- 所有步骤数据统一存储在 `stepData` 对象中，key 为步骤ID，便于扩展和维护
- 数据转换函数使用通用的 `transformStepData`、`prepareStepOutput`、`validateStepData`，支持任意步骤ID

## 配置说明

**工作流配置**: 所有工作流配置都存储在 JSON 文件中，包括：
- 步骤配置（steps）：定义工作流的各个步骤
- 数据转换逻辑（transforms）：以代码字符串形式存储，运行时转换为函数
  - 使用通用的 `transformStepData`、`prepareStepOutput`、`validateStepData` 函数
  - 支持任意步骤ID，便于扩展新的工作流步骤
- Mock数据：用于演示的测试数据（key 对应步骤ID）

**优势**:
- 完全配置驱动，无需修改代码
- 每个客户可以根据需求定制自己的工作流
- 配置集中管理，易于维护和版本控制
- 通用的数据转换函数，支持任意步骤类型和ID
- 统一的数据存储结构（stepData），便于扩展和维护

