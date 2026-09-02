# 工作台生成提示词

## 概述

本文档为智能体提供生成工作台配置的详细指南。工作台是一个基于JSON配置的可视化应用构建系统，支持多种组件类型、页面布局和导航结构。

## 工作台基本结构

工作台配置是一个JSON对象，包含两个主要部分：

```json
{
  "appConfig": {
    // 应用级配置：名称、描述、导航等
  },
  "pages": {
    // 页面配置：每个页面的组件和布局
  }
}
```

---

## 1. appConfig 配置规范

### 1.1 基本字段

```json
{
  "appConfig": {
    "name": "工作台名称",                    // 必需：工作台的显示名称
    "description": "工作台描述",             // 可选：工作台的描述信息
    "version": "1.0.0",                     // 可选：版本号
    "defaultPage": "dashboard"              // 必需：默认打开的页面ID
  }
}
```

### 1.2 导航配置

导航支持侧边栏模式，可以配置多级菜单：

```json
{
  "appConfig": {
    "navigation": {
      "mode": "side",                       // 导航模式：固定为 "side"
      "items": [
        {
          "key": "home",                    // 导航项唯一标识
          "title": "首页",                  // 显示文本
          "icon": "Home",                   // 图标名称（Lucide图标）
          "linkedPage": "dashboard"         // 链接的页面ID
        },
        {
          "key": "data",                    // 支持多级菜单
          "title": "数据管理",
          "icon": "Database",
          "children": [                     // 子菜单项
            {
              "key": "data-list",
              "title": "数据列表",
              "icon": "List",
              "linkedPage": "data-list"
            }
          ]
        }
      ]
    }
  }
}
```

**导航配置规则：**
- 每个导航项必须有唯一的 `key`
- 如果配置了 `linkedPage`，必须确保对应的页面存在于 `pages` 中
- 支持最多2级菜单（一级菜单 + children）
- 常用图标：`Home`, `Database`, `BarChart3`, `FileText`, `Users`, `Settings`, `List`, `Grid`, `Layout`, `Target`, `PieChart`, `Activity`, `Clock`, `CheckCircle`, `Plus`, `Upload`, `Download`, `Edit`, `Trash`, `Calendar`, `TrendingUp`, `AlertTriangle`, `Brain`, `Shield`, `FileText`, `GraduationCap`

---

## 2. pages 配置规范

### 2.1 页面基本结构

```json
{
  "pages": {
    "page-id": {                            // 页面唯一ID
      "title": "页面标题",                  // 必需：页面显示标题
      "layout": {                           // 必需：页面布局配置
        "type": "grid-24",                  // 固定为 "grid-24"（24 列栅格）
        "preset": "single",                 // 布局预设，默认 "single"（单列全宽）
        "columns": 24,                      // 固定 24 列
        "gap": 16,                          // 列间距（px），默认 16
        "rowGap": 16,                       // 行间距（px），默认 16
        "rowHeight": 50,                    // 行高（px），默认 50
        "components": [                     // 组件在栅格中的位置（id 须与 components 数组对应）
          {
            "id": "page-title",
            "colStart": 0,                  // 起始列（0–23）
            "colSpan": 24,                  // 跨列数（1–24）
            "rowStart": 0,                  // 起始行（从 0 起）
            "rowSpan": 1                    // 跨行数
          }
        ]
      },
      "components": [                       // 必需：组件数组
        // 组件配置...
      ]
    }
  }
}
```

**规则：**
- `layout.components` 中每个 `id` 必须在页面 `components` 数组中存在
- 每个页面组件都应在 `layout.components` 中有对应的栅格位置
- 新页面默认使用 `preset: "single"`，组件自上而下各占一行（`colSpan: 24`）

### 2.2 页面布局类型（24 列栅格）

页面布局默认且推荐使用 **24-column grid**（`type: "grid-24"`）。

**可用 preset：**

| preset | 说明 |
|--------|------|
| `single` | 单列全宽（默认，最常用） |
| `two-equal` | 两列等宽（各 12 列） |
| `three-equal` | 三列等宽（各 8 列） |
| `two-ratio-1-2` | 1:2 两列（8 + 16） |
| `two-ratio-2-1` | 2:1 两列（16 + 8） |
| `two-ratio-3-1` | 3:1 两列（18 + 6） |
| `four-equal` | 四列等宽（各 6 列） |
| `top-bottom` | 顶部全宽 + 底部两列 |
| `top-three-bottom` | 顶部全宽 + 底部三列 |
| `dashboard` | 仪表盘常用布局 |
| `custom` | 自定义栅格位置 |

> 旧版 `"layout": "fluid"` 字符串布局仍兼容，但新生成的工作台应使用 `grid-24` 对象。

---

## 3. 组件类型详解

**当前支持的组件类型（共 17 种）：**

`Title` | `Paragraph` | `Typography` | `Container` | `Card` | `Tabs` | `Form` | `Table` | `EditableTable` | `StatisticGroup` | `Chart` | `EChartsChart` | `MapChart` | `List` | `Tree` | `TaskInput` | `FilterPanel`

> `Title` / `Paragraph` 专用于页面标题和页面描述，样式固定、不可配置尺寸；页面内的其他文本请使用 `Typography`。

### 3.1 基础组件

#### Title / Paragraph（页面标题 / 页面描述）

页面顶部的标题与描述专用组件。字号和字重由平台固定（标题 `text-xl sm:text-2xl font-bold`，描述 `text-sm` 弱化色），与控制台页面头部完全一致，**不提供也不要设置任何尺寸属性**（`level`、`fontSize` 均不生效）。每个页面通常在最前面放置一个 `Title` + 一个 `Paragraph`，渲染时二者会自动组合为紧凑的页头块。

```json
{ "id": "page-title", "type": "Title", "props": { "content": "页面标题" } }
```

```json
{ "id": "page-desc", "type": "Paragraph", "props": { "content": "页面描述文字" } }
```

#### Typography（文本 / 标题 / 段落）

统一文本组件，用于页面内容区的文本展示（卡片式外观）。**不要用它做页面标题**——页面标题请使用上面的 `Title` / `Paragraph`。

```json
{
  "id": "unique-typography-id",
  "type": "Typography",
  "props": {
    "type": "title",                      // 必需：文本类型 "title" | "paragraph" | "text" | "blockquote"
    "content": "标题文本",                  // 必需：文本内容
    "level": 4                            // 标题级别 1–6；仅 type="title" 时有效（内容区小节标题）
  }
}
```

**文本类型说明：**

| type | 用途 | 示例 |
|------|------|------|
| `title` | 内容区小节标题（配合 `level: 1–6`） | 卡片内小节标题 |
| `paragraph` | 段落 | 说明文字 |
| `text` | 普通文本 | 行内说明 |
| `blockquote` | 引用块 | 提示信息 |

> 页面级标题/描述请使用 `Title` / `Paragraph` 组件（固定样式），不要用 Typography 的 `level` 模拟页面标题。

**段落示例：**

```json
{
  "id": "unique-paragraph-id",
  "type": "Typography",
  "props": {
    "type": "paragraph",
    "content": "段落文本内容"
  }
}
```

> `Title` / `Paragraph` 仅用于页面标题和页面描述；页面内容区的文本一律使用 `Typography`。

#### Card（卡片）

```json
{
  "id": "unique-card-id",
  "type": "Card",
  "props": {
    "title": "卡片标题",                  // 可选：卡片标题
    "description": "卡片描述",            // 可选：卡片描述
    "icon": "Plus"                        // 可选：图标名称
  },
  "children": [                           // 可选：子组件（嵌套卡片时使用）
    {
      "id": "child-card",
      "type": "Card",
      "props": {
        "title": "子卡片"
      }
    }
  ]
}
```

#### Container（容器）

用于组织多个子组件，支持 grid / flex 布局；子组件也可使用嵌套的 `grid-24` 布局（最多 3 层嵌套）：

```json
{
  "id": "unique-container-id",
  "type": "Container",
  "props": {
    "layout": "grid",                     // 布局类型 "grid" | "flex"，默认 "grid"
    "cols": [                             // 列配置（grid 布局时使用）
      { "colWidth": 1 },
      { "colWidth": 1 },
      { "colWidth": 1 }
    ],
    "gutter": 16                          // 间距（px），默认 16
  },
  "children": [                           // 必需：子组件数组
    // 组件配置...
  ]
}
```

---

### 3.2 数据展示组件

#### StatisticGroup（统计组）

用于展示多个统计指标：

```json
{
  "id": "unique-statistic-id",
  "type": "StatisticGroup",
  "props": {
    "grid": {
      "cols": 4                          // 列数，通常2-4列
    },
    "items": [
      {
        "key": "total",                   // 唯一标识
        "title": "总数量",                // 指标标题
        "value": 1234,                    // 数值
        "icon": "Database",              // 可选：图标
        "trend": {                        // 可选：趋势信息
          "value": 12,                    // 趋势值
          "type": "up",                   // "up" | "down"
          "suffix": "%",                  // 后缀
          "status": "success",            // "success" | "error" | "warning"
          "description": "较上月"        // 描述文本
        }
      }
    ]
  },
  "useMockData": true                    // 是否使用Mock数据
}
```

#### EditableTable（可编辑表格）

支持行内编辑、增删改：

```json
{
  "id": "unique-editable-table-id",
  "type": "EditableTable",
  "props": {
    "title": "可编辑表格",
    "rowKey": "id",
    "columns": [
      {
        "title": "名称",
        "dataIndex": "name",
        "key": "name",
        "editable": true,
        "fieldType": "VARCHAR"
      }
    ],
    "pagination": {
      "pageSize": 10,
      "showTotal": true
    }
  },
  "mockData": [
    { "id": "1", "name": "示例" }
  ],
  "useMockData": true
}
```

#### Table（表格）

用于展示结构化数据，支持搜索、分页、编辑等：

```json
{
  "id": "unique-table-id",
  "type": "Table",
  "props": {
    "title": "数据表格",                  // 可选：表格标题
    "rowKey": "id",                      // 必需：行唯一标识字段
    "showSearch": true,                  // 可选：是否显示搜索
    "showRefresh": true,                 // 可选：是否显示刷新按钮
    "addable": true,                     // 可选：是否可添加
    "editable": true,                    // 可选：是否可编辑
    "deletable": true,                   // 可选：是否可删除
    "columns": [
      {
        "title": "列标题",               // 必需：列标题
        "dataIndex": "fieldName",        // 必需：数据字段名
        "key": "fieldName",              // 必需：列唯一标识
        "searchable": true               // 可选：是否可搜索
      },
      {
        "title": "状态",
        "dataIndex": "status",
        "key": "status",
        "render": {                      // 可选：自定义渲染
          "type": "Tag",
          "props": {
            "color": {
              "active": "green",
              "inactive": "default",
              "pending": "orange"
            }
          }
        }
      },
      {
        "title": "操作",
        "key": "action",
        "render": {
          "type": "Action",
          "props": {
            "actions": [
              {
                "label": "编辑",
                "icon": "Edit",
                "onClick": "handleEdit"
              },
              {
                "label": "删除",
                "icon": "Trash",
                "onClick": "handleDelete",
                "danger": true
              }
            ]
          }
        }
      }
    ]
  },
  "mockData": [                          // Mock数据
    {
      "id": "1",
      "fieldName": "值1",
      "status": "active"
    }
  ],
  "useMockData": true
}
```

#### Chart（基础图表，Recharts）

```json
{
  "id": "unique-chart-id",
  "type": "Chart",
  "props": {
    "chartType": "line",                  // 图表类型 "line" | "bar" | "pie" | "scatter"，默认 "line"
    "title": "图表标题",
    "height": 300,
    "xField": "date",                     // 必需：X 轴字段
    "yField": "value",                    // 必需：Y 轴字段
    "showTooltip": true,
    "showLegend": true,
    "colorScheme": "default"              // 可选：配色方案
  },
  "mockData": [
    { "date": "2025-01-01", "value": 100 }
  ],
  "useMockData": true
}
```

#### EChartsChart（高级图表）

支持漏斗图、仪表盘、饼图、柱状图、词云、桑基图等：

```json
{
  "id": "unique-echarts-id",
  "type": "EChartsChart",
  "props": {
    "title": "图表标题",
    "height": 400,
    "chartType": "pie",                   // funnel | gauge | pie | bar | line | treemap | sankey | wordcloud | scatter 等
    "nameField": "name",
    "valueField": "value"
  },
  "mockData": [
    { "name": "类别A", "value": 100 }
  ],
  "useMockData": true
}
```

#### MapChart（地图图表）

```json
{
  "id": "unique-map-id",
  "type": "MapChart",
  "props": {
    "title": "地图标题",
    "height": 400,
    "mapType": "china",                   // china | province | usa | europe
    "nameField": "name",
    "valueField": "value",
    "visualMapMin": 0,
    "visualMapMax": 100
  },
  "mockData": [
    { "name": "北京", "value": 80 }
  ],
  "useMockData": true
}
```

#### List（列表）

用于展示列表数据：

```json
{
  "id": "unique-list-id",
  "type": "List",
  "props": {
    "title": "列表标题",                  // 可选：列表标题
    "dataSource": [                      // 可选：数据源（或使用mockData）
      {
        "title": "列表项标题",
        "description": "列表项描述"
      }
    ]
  },
  "mockData": [                          // 或使用mockData
    {
      "title": "列表项1",
      "description": "描述1"
    }
  ],
  "useMockData": true
}
```

---

### 3.3 交互组件

#### FilterPanel（筛选面板）

用于页面级数据筛选：

```json
{
  "id": "unique-filter-id",
  "type": "FilterPanel",
  "props": {
    "title": "筛选条件",
    "filters": [
      {
        "key": "status",
        "type": "select",
        "label": "状态",
        "options": [
          { "label": "全部", "value": "" },
          { "label": "启用", "value": "active" }
        ]
      },
      {
        "key": "dateRange",
        "type": "dateRange",
        "label": "日期范围"
      }
    ]
  }
}
```

**筛选项类型：** `select` | `dateRange` | `radio` | `text` | `number` | `tagInput`

#### Form（表单）

用于数据输入和编辑：

```json
{
  "id": "unique-form-id",
  "type": "Form",
  "props": {
    "title": "表单标题",                  // 可选：表单标题
    "layout": "vertical",                // 可选：布局 "vertical" | "horizontal"
    "fields": [
      {
        "name": "fieldName",             // 必需：字段名
        "label": "字段标签",              // 必需：字段标签
        "type": "input",                 // 必需：字段类型
        "required": true,                // 可选：是否必填
        "placeholder": "请输入..."       // 可选：占位符
      },
      {
        "name": "type",
        "label": "类型",
        "type": "select",                // 下拉选择
        "options": [
          {
            "label": "选项1",
            "value": "value1"
          }
        ]
      },
      {
        "name": "date",
        "label": "日期",
        "type": "date"                   // 日期选择
      },
      {
        "name": "description",
        "label": "描述",
        "type": "textarea"               // 多行文本
      },
      {
        "name": "status",
        "label": "状态",
        "type": "radio",                 // 单选
        "options": [
          {
            "label": "启用",
            "value": "active"
          }
        ]
      }
    ],
    "submitText": "提交",                // 可选：提交按钮文本
    "cancelText": "取消"                 // 可选：取消按钮文本
  }
}
```

**字段类型：**
- `input`: 文本输入
- `select`: 下拉选择
- `date`: 日期选择
- `textarea`: 多行文本
- `radio`: 单选
- `checkbox`: 多选
- `number`: 数字输入

#### TaskInput（任务输入）

用于任务输入和提交：

```json
{
  "id": "unique-taskinput-id",
  "type": "TaskInput",
  "props": {
    "taskId": "task-id",                 // 可选：任务ID
    "className": "custom-class"          // 可选：自定义样式类
  }
}
```

---

### 3.4 其他组件

#### Tabs（标签页）

```json
{
  "id": "unique-tabs-id",
  "type": "Tabs",
  "props": {
    "defaultActiveKey": "tab1",
    "type": "card",
    "size": "large",
    "children": [
      {
        "key": "tab1",
        "label": "标签1",
        "components": [
          {
            "id": "tab1-content",
            "type": "Typography",
            "props": {
              "type": "paragraph",
              "content": "标签1内容"
            }
          }
        ]
      }
    ]
  }
}
```

#### Tree（树形结构）

用于展示树形数据：

```json
{
  "id": "unique-tree-id",
  "type": "Tree",
  "props": {
    "title": "树形结构",
    "dataSource": [
      {
        "key": "node1",
        "title": "节点1",
        "children": [
          {
            "key": "node1-1",
            "title": "子节点1"
          }
        ]
      }
    ]
  },
  "mockData": [
    {
      "key": "1",
      "title": "根节点",
      "children": []
    }
  ],
  "useMockData": true
}
```

---

## 4. Mock数据配置

### 4.1 基本规则

**字段位置（规范）：**

`mockData` 与 `useMockData` 应放在**组件根级**（与 `id`、`type`、`props` 同级），不要写在 `props` 内。

```json
{
  "id": "data-table",
  "type": "Table",
  "props": {
    "title": "数据列表",
    "rowKey": "id"
  },
  "mockData": [
    { "id": "1", "name": "示例" }
  ],
  "useMockData": true
}
```

**说明：**

| 规则 | 说明 |
|------|------|
| 规范位置 | 根级 `mockData` + 根级 `useMockData` |
| 兼容位置 | `props.mockData` / `props.useMockData` 仍会被运行时读取，但新生成配置不要用 |
| 启用 Mock | 根级 `useMockData: true`，并配置根级 `mockData` |
| 关闭 Mock | 根级或 `props` 中任一处 `useMockData: false` 即关闭；显式关闭后，残留的 `mockData` 不会重新启用 |
| 省略标志 | 仅有 `mockData` 无 `useMockData` 时，运行时会推断为启用（旧版兼容）；新配置请显式写 `useMockData: true` |
| 数据源模式 | `useMockData: false` 时使用 `dataSource` 等真实数据源 |

- Mock 数据格式必须与组件期望的数据格式一致

### 4.2 Mock数据示例

**表格 Mock 数据（根级字段）：**
```json
{
  "id": "data-table",
  "type": "Table",
  "props": {
    "title": "数据列表",
    "rowKey": "id"
  },
  "mockData": [
    {
      "id": "1",
      "name": "项目A",
      "status": "active",
      "createdAt": "2025-01-15"
    }
  ],
  "useMockData": true
}
```

**图表 Mock 数据（根级字段）：**
```json
{
  "id": "trend-chart",
  "type": "Chart",
  "props": {
    "title": "趋势图",
    "xField": "date",
    "yField": "value"
  },
  "mockData": [
    {
      "date": "2025-01-01",
      "value": 100,
      "category": "类型A"
    },
    {
      "date": "2025-01-02",
      "value": 120,
      "category": "类型A"
    }
  ],
  "useMockData": true
}
```

---

## 5. 数据源配置

当 `useMockData: false` 时，可以配置数据源（字段同样在组件根级）：

```json
{
  "id": "component-id",
  "type": "Table",
  "props": {
    "title": "数据列表",
    "rowKey": "id"
  },
  "dataSource": {
    "type": "api",
    "url": "/api/data",
    "method": "GET"
  },
  "useMockData": false
}
```

---

## 6. 生成工作台的步骤指南

### 步骤1：分析用户需求

1. **识别核心功能**
   - 用户需要展示什么数据？
   - 需要哪些交互功能？
   - 涉及哪些业务流程？

2. **确定页面结构**
   - 需要几个页面？
   - 页面之间的导航关系？
   - 每个页面的主要功能？

3. **选择组件类型**
   - 数据展示：Table、EditableTable、Chart、EChartsChart、MapChart、StatisticGroup
   - 数据输入：Form、TaskInput、FilterPanel
   - 内容组织：Container、Card、Tabs
   - 文本展示：Typography（页面内容文本）；页面标题/描述用 `Title` / `Paragraph`（固定样式）

### 步骤2：设计导航结构

1. **确定一级菜单**
   - 根据主要功能模块划分
   - 每个模块对应一个页面或一组页面

2. **设计多级菜单**
   - 如果某个模块下有多个子功能，使用children配置子菜单
   - 最多支持2级菜单

3. **配置图标**
   - 选择语义化的图标名称
   - 确保图标名称在Lucide图标库中存在

### 步骤3：构建页面

1. **页面布局**
   - 默认使用 **24-column grid**（`layout.type: "grid-24"`, `preset: "single"`）
   - 为每个组件在 `layout.components` 中配置栅格位置（`colStart`, `colSpan`, `rowStart`, `rowSpan`）

2. **组件顺序**
   - 通常先放置页面标题和描述（`Title` + `Paragraph`，样式固定、无需配置字号）
   - 然后是统计信息（StatisticGroup）
   - 接着是主要数据展示（Table、Chart等）
   - 最后是操作区域（Form、Card等）

3. **组件组合**
   - 使用Container组织相关组件
   - 使用Card包装功能模块
   - 使用Tabs组织多个相关内容

### 步骤4：配置组件

1. **必需字段**
   - 每个组件必须有唯一的 `id`
   - 必须有正确的 `type`
   - 必须有 `props` 对象

2. **Mock数据**
   - 为演示目的，通常设置 `useMockData: true`
   - 提供合理的Mock数据示例
   - 确保Mock数据格式正确

3. **组件属性**
   - 根据组件类型配置相应的props
   - 参考本文档中的组件配置示例

### 步骤5：验证配置

1. **结构验证**
   - 确保所有导航项链接的页面都存在
   - 确保defaultPage指向的页面存在
   - 确保所有组件ID唯一

2. **数据验证**
   - Mock数据格式正确
   - 表格列配置与Mock数据字段匹配
   - 图表字段配置正确

3. **完整性验证**
   - 所有必需字段都已配置
   - 页面标题和描述清晰
   - 导航结构合理

---

## 7. 常见场景模板

### 场景1：数据仪表盘

**特点：** 展示统计数据和图表

**组件组合：**
- `Title`（页面标题，固定样式）
- StatisticGroup（关键指标）
- Chart（趋势图表）

**示例结构：**
```json
{
  "pages": {
    "dashboard": {
      "title": "数据仪表盘",
      "layout": {
        "type": "grid-24",
        "preset": "single",
        "columns": 24,
        "gap": 16,
        "rowGap": 16,
        "rowHeight": 50,
        "components": [
          { "id": "page-title", "colStart": 0, "colSpan": 24, "rowStart": 0, "rowSpan": 1 },
          { "id": "statistics", "colStart": 0, "colSpan": 24, "rowStart": 1, "rowSpan": 1 },
          { "id": "trend-chart", "colStart": 0, "colSpan": 24, "rowStart": 2, "rowSpan": 1 }
        ]
      },
      "components": [
        {
          "id": "page-title",
          "type": "Typography",
          "props": {
            "type": "title",
            "content": "数据仪表盘",
            "level": 4
          }
        },
        {
          "id": "statistics",
          "type": "StatisticGroup",
          "props": {
            "grid": { "cols": 4 },
            "items": [
              {
                "key": "total",
                "title": "总数",
                "value": 1000,
                "icon": "Database"
              }
            ]
          },
          "useMockData": true
        },
        {
          "id": "trend-chart",
          "type": "Chart",
          "props": {
            "title": "趋势图",
            "height": 300,
            "xField": "date",
            "yField": "value",
            "showTooltip": true,
            "showLegend": true
          },
          "mockData": [],
          "useMockData": true
        }
      ]
    }
  }
}
```

### 场景2：数据管理

**特点：** 列表展示、搜索、增删改查

**组件组合：**
- `Title`（页面标题，固定样式）
- Table（数据表格，配置搜索、编辑、删除）

**示例结构：**
```json
{
  "pages": {
    "data-management": {
      "title": "数据管理",
      "layout": {
        "type": "grid-24",
        "preset": "single",
        "columns": 24,
        "gap": 16,
        "rowGap": 16,
        "rowHeight": 50,
        "components": [
          { "id": "page-title", "colStart": 0, "colSpan": 24, "rowStart": 0, "rowSpan": 1 },
          { "id": "data-table", "colStart": 0, "colSpan": 24, "rowStart": 1, "rowSpan": 1 }
        ]
      },
      "components": [
        {
          "id": "page-title",
          "type": "Typography",
          "props": {
            "type": "title",
            "content": "数据管理",
            "level": 4
          }
        },
        {
          "id": "data-table",
          "type": "Table",
          "props": {
            "title": "数据列表",
            "rowKey": "id",
            "showSearch": true,
            "showRefresh": true,
            "addable": true,
            "editable": true,
            "deletable": true,
            "columns": [
              {
                "title": "名称",
                "dataIndex": "name",
                "key": "name",
                "searchable": true
              }
            ]
          },
          "mockData": [],
          "useMockData": true
        }
      ]
    }
  }
}
```

### 场景3：表单录入

**特点：** 数据输入和提交

**组件组合：**
- `Title`（页面标题，固定样式）
- Typography（说明文字，`type: "paragraph"`）
- Form（表单组件）

**示例结构：**
```json
{
  "pages": {
    "form-input": {
      "title": "表单录入",
      "layout": {
        "type": "grid-24",
        "preset": "single",
        "columns": 24,
        "gap": 16,
        "rowGap": 16,
        "rowHeight": 50,
        "components": [
          { "id": "page-title", "colStart": 0, "colSpan": 24, "rowStart": 0, "rowSpan": 1 },
          { "id": "form-description", "colStart": 0, "colSpan": 24, "rowStart": 1, "rowSpan": 1 },
          { "id": "input-form", "colStart": 0, "colSpan": 24, "rowStart": 2, "rowSpan": 1 }
        ]
      },
      "components": [
        {
          "id": "page-title",
          "type": "Typography",
          "props": {
            "type": "title",
            "content": "表单录入",
            "level": 4
          }
        },
        {
          "id": "form-description",
          "type": "Typography",
          "props": {
            "type": "paragraph",
            "content": "请填写以下信息"
          }
        },
        {
          "id": "input-form",
          "type": "Form",
          "props": {
            "title": "录入表单",
            "layout": "vertical",
            "fields": [
              {
                "name": "name",
                "label": "名称",
                "type": "input",
                "required": true
              }
            ],
            "submitText": "提交",
            "cancelText": "取消"
          }
        }
      ]
    }
  }
}
```

---

## 8. 最佳实践

### 8.1 命名规范

- **页面ID：** 使用小写字母和连字符，如 `"dashboard"`, `"data-management"`
- **组件ID：** 使用小写字母和连字符，如 `"page-title"`, `"data-table"`
- **导航key：** 使用小写字母和连字符，如 `"home"`, `"data-list"`

### 8.2 组件组织

- **页面开头：** 使用 `Title` + `Paragraph` 作为页面标题和描述（样式固定，勿设置尺寸属性）
- **内容说明：** 页面内容区的说明文字使用 Typography（`type: "paragraph"`）
- **数据展示：** 优先使用StatisticGroup展示关键指标
- **详细数据：** 使用 Table 展示列表数据
- **可视化：** 使用 Chart、EChartsChart 或 MapChart 展示图表数据

### 8.3 Mock数据设计

- **数据量：** Mock数据建议5-10条，足够展示效果即可
- **数据真实性：** 使用符合业务场景的真实数据示例
- **数据完整性：** 确保Mock数据包含所有必需字段

### 8.4 用户体验

- **页面标题：** 每个页面都应有清晰的 `Title` 页面标题（固定样式，与控制台页头一致）
- **页面布局：** 默认使用 24-column grid，为每个组件配置栅格位置
- **导航清晰：** 导航结构要符合用户使用习惯
- **组件顺序：** 按照重要性从上到下排列组件
- **响应式：** 考虑不同屏幕尺寸下的显示效果

### 8.5 错误预防

- **必填字段：** 确保所有必需字段都已配置
- **页面引用：** 确保导航链接的页面都存在
- **数据格式：** 确保Mock数据格式与组件配置匹配
- **唯一性：** 确保所有ID都是唯一的

---

## 9. 完整示例

### 示例：简单数据仪表盘工作台

```json
{
  "appConfig": {
    "name": "数据仪表盘",
    "description": "展示关键业务数据和趋势",
    "version": "1.0.0",
    "defaultPage": "dashboard",
    "navigation": {
      "mode": "side",
      "items": [
        {
          "key": "home",
          "title": "首页",
          "icon": "Home",
          "linkedPage": "dashboard"
        },
        {
          "key": "analysis",
          "title": "数据分析",
          "icon": "BarChart3",
          "linkedPage": "analysis"
        }
      ]
    }
  },
  "pages": {
    "dashboard": {
      "title": "数据仪表盘",
      "layout": {
        "type": "grid-24",
        "preset": "single",
        "columns": 24,
        "gap": 16,
        "rowGap": 16,
        "rowHeight": 50,
        "components": [
          { "id": "page-title", "colStart": 0, "colSpan": 24, "rowStart": 0, "rowSpan": 1 },
          { "id": "statistics", "colStart": 0, "colSpan": 24, "rowStart": 1, "rowSpan": 1 },
          { "id": "trend-chart", "colStart": 0, "colSpan": 24, "rowStart": 2, "rowSpan": 1 }
        ]
      },
      "components": [
        {
          "id": "page-title",
          "type": "Typography",
          "props": {
            "type": "title",
            "content": "数据仪表盘",
            "level": 4
          }
        },
        {
          "id": "statistics",
          "type": "StatisticGroup",
          "props": {
            "grid": {
              "cols": 4
            },
            "items": [
              {
                "key": "total",
                "title": "总数量",
                "value": 1234,
                "icon": "Database",
                "trend": {
                  "value": 12,
                  "type": "up",
                  "suffix": "%",
                  "status": "success",
                  "description": "较上月"
                }
              },
              {
                "key": "active",
                "title": "活跃数",
                "value": 856,
                "icon": "Activity",
                "trend": {
                  "value": 5,
                  "type": "up",
                  "suffix": "%",
                  "status": "success",
                  "description": "较上周"
                }
              },
              {
                "key": "pending",
                "title": "待处理",
                "value": 42,
                "icon": "Clock"
              },
              {
                "key": "completed",
                "title": "已完成",
                "value": 336,
                "icon": "CheckCircle"
              }
            ]
          },
          "useMockData": true
        },
        {
          "id": "trend-chart",
          "type": "Chart",
          "props": {
            "title": "数据趋势图",
            "height": 300,
            "smooth": true,
            "xField": "date",
            "yField": "value",
            "seriesField": "category",
            "showTooltip": true,
            "showLegend": true,
            "colors": ["#1890ff", "#52c41a"]
          },
          "mockData": [
            { "date": "2025-01-01", "value": 120, "category": "访问量" },
            { "date": "2025-01-02", "value": 132, "category": "访问量" },
            { "date": "2025-01-03", "value": 145, "category": "访问量" },
            { "date": "2025-01-01", "value": 80, "category": "转化率" },
            { "date": "2025-01-02", "value": 85, "category": "转化率" },
            { "date": "2025-01-03", "value": 92, "category": "转化率" }
          ],
          "useMockData": true
        }
      ]
    },
    "analysis": {
      "title": "数据分析",
      "layout": {
        "type": "grid-24",
        "preset": "single",
        "columns": 24,
        "gap": 16,
        "rowGap": 16,
        "rowHeight": 50,
        "components": [
          { "id": "analysis-title", "colStart": 0, "colSpan": 24, "rowStart": 0, "rowSpan": 1 },
          { "id": "analysis-chart", "colStart": 0, "colSpan": 24, "rowStart": 1, "rowSpan": 1 }
        ]
      },
      "components": [
        {
          "id": "analysis-title",
          "type": "Typography",
          "props": {
            "type": "title",
            "content": "数据分析",
            "level": 4
          }
        },
        {
          "id": "analysis-chart",
          "type": "EChartsChart",
          "props": {
            "title": "分类占比",
            "height": 400,
            "chartType": "pie",
            "nameField": "name",
            "valueField": "value"
          },
          "mockData": [
            { "name": "移动端", "value": 120 },
            { "name": "桌面端", "value": 80 },
            { "name": "其他", "value": 45 }
          ],
          "useMockData": true
        }
      ]
    }
  }
}
```

---

## 10. 总结

生成工作台配置时，请遵循以下原则：

1. **理解需求：** 仔细分析用户需求，确定功能模块和页面结构
2. **合理组织：** 使用清晰的导航结构和 24-column grid 页面布局
3. **组件选择：** 根据功能需求选择合适的组件类型（Typography 替代 Title/Paragraph）
4. **数据配置：** 提供合理的Mock数据用于演示
5. **验证完整：** 确保配置完整、正确，layout.components 与 components 数组 id 一一对应

参考本文档中的组件配置示例和场景模板，可以快速生成符合要求的工作台配置。
