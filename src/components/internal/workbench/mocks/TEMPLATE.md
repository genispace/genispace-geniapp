# 工作台模板系统

## 概述

工作台模板系统提供了可复用的工作台配置模板，用户可以从模板一键创建工作台，快速启动项目开发。模板按行业分类组织，便于查找和使用。

## 目录结构

```
mocks/
├── templates/                    # 模板目录
│   ├── education/               # 教育行业模板
│   │   └── education-planning.json  # 升学规划工作台
│   ├── recruiting/              # 招聘行业模板
│   │   └── recruiting.json     # 猎头工作台
│   ├── logistics/               # 物流行业模板
│   │   └── logistics-dashboard.json  # 物流数据分析看板
│   ├── finance/                 # 财务行业模板
│   │   ├── invoice-recognition.json  # 发票识别系统
│   │   └── reconciliation.json       # 财务智能对账系统
│   ├── retail/                 # 零售/电商行业模板
│   │   └── ecommerce.json     # 电商运营工作台
│   ├── healthcare/             # 医疗健康行业模板
│   │   └── hospital.json      # 医院管理系统
│   ├── real-estate/            # 房地产行业模板
│   │   └── property-management.json  # 房地产管理系统
│   ├── restaurant/             # 餐饮行业模板
│   │   └── restaurant-management.json  # 餐饮管理系统
│   ├── manufacturing/          # 制造业模板
│   │   └── production-management.json  # 生产管理系统
│   └── general/                # 通用模板
│       ├── example.json        # 示例工作台
│       └── radar-chart.json   # 雷达图演示
├── templateRegistry.ts         # 模板注册表
├── types.ts                     # 模板类型定义
└── TEMPLATE.md                  # 本文档
```

## 行业分类

### 教育 (Education)

#### 升学规划工作台 (education-planning)

**用途**: 教育行业升学规划工作台

**适用场景**:
- 留学咨询机构
- 升学规划服务
- 学生管理系统

**包含页面**:
- `dashboard`: 工作台首页（统计卡片、最近学生列表、报告生成趋势图）
- `student-list`: 学生信息管理表格
- `student-detail`: 学生详细信息表单
- `report-list`: 报告管理表格
- `report-generator`: 报告生成配置表单
- `report-editor`: 报告编辑器（多标签页）
- `school-management`: 学校管理（树形结构 + 表格）
- `major-management`: 专业管理（表格 + 图表）
- `template-management`: 报告模板管理

**主要功能**:
- 学生信息管理（增删改查）
- 升学报告生成和编辑
- 学校和专业信息管理
- 数据统计和可视化

### 招聘 (Recruiting)

#### 猎头工作台 (recruiting)

**用途**: 招聘行业工作台

**适用场景**:
- 猎头公司
- HR 部门
- 招聘平台

**包含页面**:
- `dashboard`: 工作台首页（统计卡片、候选人列表、职位列表）
- `candidates`: 候选人搜索和管理
- `clients`: 客户管理
- `jobs`: 职位管理
- `reports`: 报表分析

**主要功能**:
- 候选人搜索和管理
- 客户关系管理
- 职位发布和管理
- 招聘数据分析和报表

### 物流 (Logistics)

#### 物流数据分析看板 (logistics-dashboard)

**用途**: 物流行业看板系统

**适用场景**:
- 物流公司
- 供应链管理
- 运输监控

**包含页面**:
- `pickup-dashboard`: 揽收时效看板

**主要功能**:
- B2B/B2C 业务统计
- 揽收时效分析
- 数据筛选和可视化
- 实时监控看板

### 财务 (Finance)

#### 发票识别系统 (invoice-recognition)

**用途**: 财务自动化处理系统

**适用场景**:
- 财务部门
- 会计事务所
- 自动化记账

**包含页面**:
- `invoice-demo`: 自动化会计流程演示

**主要功能**:
- 发票上传和识别
- OCR 文字识别
- 结构化数据提取
- 自动化记账流程

#### 财务智能对账系统 (reconciliation)

**用途**: 财务智能对账系统

**适用场景**:
- 财务部门
- 银行对账
- 账务核对

**包含页面**:
- `dashboard`: 对账管理首页
- `baseline-tables`: 对账基准管理
- `create-task`: 创建对账任务
- `reconciliation-result`: 对账结果详情

**主要功能**:
- 银行日记账管理
- 银行流水导入
- 自动匹配和差异分析
- 对账结果查看和导出

### 通用 (General)

#### 示例工作台 (example)

**用途**: 通用示例工作台

**适用场景**:
- 学习和演示
- 快速原型开发
- 功能测试

**包含页面**:
- `dashboard`: 首页
- `data-list`: 数据列表

**主要功能**:
- 基础组件演示
- 布局示例
- 数据绑定示例

#### 雷达图演示 (radar-chart)

**用途**: 图表组件演示

**适用场景**:
- 图表功能展示
- 数据可视化学习

**包含页面**:
- 雷达图演示页面

**主要功能**:
- 雷达图展示
- 图表配置示例

## 使用模板

### 在 Welcome 页面使用

1. 进入 Welcome 页面
2. 切换到"模板库"标签页
3. 浏览模板（可按行业分类筛选）
4. 点击模板卡片查看详情
5. 点击"基于此模板创建"按钮
6. 系统会自动创建工作台并跳转

### 编程方式使用

```typescript
import { createWorkbenchFromTemplate } from '@/app/services/templateService';

// 从模板创建工作台
const workbench = await createWorkbenchFromTemplate('education-planning', {
  customName: '我的升学规划工作台',
  status: 'DRAFT'
});
```

## 添加新模板

### 步骤 1: 创建模板数据文件

在对应的行业目录下创建 JSON 文件：

```bash
# 例如：添加一个新的教育模板
touch mocks/templates/education/my-education-template.json
```

**注意**: 文件名应使用小写字母和连字符，避免使用公司名称。

### 步骤 2: 编写模板数据

模板数据应遵循以下结构：

```json
{
  "appConfig": {
    "name": "模板名称",
    "description": "模板描述",
    "defaultPage": "dashboard",
    "navigation": {
      "mode": "side",
      "items": [...]
    }
  },
  "pages": {
    "page-id": {
      "title": "页面标题",
      "layout": "fluid",
      "components": [...]
    }
  }
}
```

### 步骤 3: 注册模板

在 `templateRegistry.ts` 中注册新模板：

```typescript
import myEducationTemplate from './templates/education/my-education-template.json';

registerTemplate({
  metadata: {
    id: 'my-education-template',
    name: '教育管理模板',
    description: '模板描述',
    category: TemplateCategory.EDUCATION,
    icon: 'GraduationCap',
    tags: ['教育', '学生管理'],
    version: '1.0.0'
  },
  mockData: myEducationTemplate
});
```

### 步骤 4: 更新 Mock 注册表（可选）

如果需要支持 demo 工作台访问，在 `index.ts` 中添加：

```typescript
import myEducationTemplate from './templates/education/my-education-template.json';

export const mockRegistry: MockDataRegistry = {
  // ... 其他模板
  'my-education-template': myEducationTemplate,
};
```

## 模板元数据说明

### TemplateMetadata 字段

- `id`: 模板唯一标识符（必填）
- `name`: 模板显示名称（必填）
- `description`: 模板描述（必填）
- `category`: 行业分类（必填）
- `icon`: 图标名称（可选，使用 Lucide React 图标）
- `previewImage`: 预览图片 URL（可选）
- `tags`: 标签数组（可选，用于搜索）
- `version`: 模板版本（可选）
- `author`: 作者信息（可选）

### 行业分类枚举

- `EDUCATION`: 教育
- `RECRUITING`: 招聘
- `LOGISTICS`: 物流
- `FINANCE`: 财务
- `RETAIL`: 零售/电商
- `HEALTHCARE`: 医疗健康
- `REAL_ESTATE`: 房地产
- `RESTAURANT`: 餐饮
- `MANUFACTURING`: 制造业
- `GENERAL`: 通用

## 最佳实践

1. **模板命名**: 使用有意义的名称，便于识别
2. **分类准确**: 确保模板分类正确，便于用户查找
3. **描述清晰**: 提供清晰的模板描述和使用场景
4. **标签完整**: 添加相关标签，提高搜索命中率
5. **版本管理**: 对模板进行版本管理，便于更新和维护
6. **测试验证**: 创建模板后，验证模板可以正常工作

## 注意事项

1. 模板数据文件应保持 JSON 格式正确
2. 确保模板中的页面和组件配置有效
3. 模板创建的工作台默认为 DRAFT 状态
4. 模板系统与 demo 工作台系统兼容，可以同时使用

## 相关文件

- `templateRegistry.ts`: 模板注册和查询逻辑
- `types.ts`: 模板类型定义
- `templateService.ts`: 模板服务（创建工作台）
- `TemplateCard.tsx`: 模板卡片组件
- `TemplateLibrary.tsx`: 模板库组件
- `Welcome.tsx`: Welcome 页面（集成模板库）

## 更新日志

### v1.1.0 (2024-01-XX)
- 新增 5 个行业模板（零售/电商、医疗健康、房地产、餐饮、制造业）
- 完善现有模板功能
- 支持 12 个模板
- 按行业分类组织
- 支持模板搜索和筛选
- 支持一键从模板创建工作台

### v1.0.0 (2024-01-XX)
- 初始版本
- 支持 7 个模板
- 按行业分类组织
- 支持模板搜索和筛选
- 支持一键从模板创建工作台
