# Mock 数据使用指南

## 概述

这个目录包含了工作台的 Mock 数据，用于在没有后端 API 的情况下预览和测试工作台功能。

## 🚀 新特性：动态 Mock 数据加载

### URL 格式

```
http://localhost:5013/workbench/demo-{name}/{page-id}
```

通过 URL 自动匹配对应的 mock 数据文件，无需修改代码！

### 快速开始

1. **创建 Mock 数据文件**
   ```bash
   # 文件名格式：{name}MockData.json（驼峰命名）
   touch workbench/src/mocks/myProjectMockData.json
   ```

2. **注册 Mock 数据**
   
   在 `workbench/src/mocks/index.ts` 中注册：
   ```typescript
   import myProjectMockData from './myProjectMockData.json';
   
   export const mockRegistry: MockDataRegistry = {
     'myProject': myProjectMockData,  // 添加这一行
     // ...
   };
   ```

3. **访问 Mock 工作台**
   ```
   http://localhost:5013/workbench/demo-myProject/dashboard
   ```

**详细说明请查看：** [USAGE.md](./USAGE.md)

## 越洋教育升学规划工作台 Mock 数据

### 访问方式

支持两种 URL 格式：

1. **新格式（推荐）：**
   ```
   http://localhost:5013/workbench/demo-yueyang/dashboard
   ```

2. **兼容格式：**
   ```
   http://localhost:5013/workbench/yueyang-demo/dashboard
   或
   http://localhost:5013/workbench/yueyangjiaoyu-demo/dashboard
   ```

### 数据结构

Mock 数据遵循以下结构：

```json
{
  "appConfig": {
    "name": "工作台名称",
    "description": "工作台描述",
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

### 功能页面

#### 1. 工作台首页 (`dashboard`)

**组件：**
- `StatisticGroup`: 4个统计卡片
  - 总学生数（156）
  - 待生成报告（23）
  - 已完成报告（89）
  - 客户满意度（92%）
- `DataGridCard`: 最近咨询学生列表
- `Chart`: 报告生成趋势图

**访问路径：**
```
/workbench/yueyang-demo/dashboard
```

#### 2. 学生列表 (`student-list`)

**组件：**
- `Table`: 学生信息管理表格
  - 支持搜索、刷新、分页
  - 支持增删改查操作
  - 支持导出功能
  - 行操作：查看详情、生成报告

**Mock 数据字段：**
- id, name, gender, grade, gpa
- target, major, languageScore
- status, consultant, createdAt

**访问路径：**
```
/workbench/yueyang-demo/student-list
```

#### 3. 学生详情 (`student-detail`)

**组件：**
- `Form`: 学生详细信息表单
  - 基本信息：姓名、性别、年级、GPA
  - 留学信息：目标国家、意向专业、考试成绩
  - 背景信息：兴趣爱好、活动、获奖
  - 家庭信息：家庭背景、留学预算

**表单字段类型：**
- text: 文本输入
- number: 数字输入
- date: 日期选择
- select: 单选下拉
- radio: 单选按钮
- textarea: 多行文本
- switch: 开关

**访问路径：**
```
/workbench/yueyang-demo/student-detail?studentId=STU001
```

#### 4. 报告列表 (`report-list`)

**组件：**
- `Table`: 报告管理表格
  - 报告编号、学生姓名、报告类型
  - 生成状态（生成中、已完成、待修正、已交付）
  - 时间信息、负责顾问

**行操作：**
- 查看报告
- 编辑报告
- 导出PDF

**访问路径：**
```
/workbench/yueyang-demo/report-list
```

#### 5. 报告生成器 (`report-generator`)

**组件：**
- `Form`: 报告生成配置表单
  - 选择学生
  - 报告类型（完整/摘要）
  - 目标国家/地区（多选）
  - 专业偏好
  - 学校数量和层次分布
  - 特殊要求

**访问路径：**
```
/workbench/yueyang-demo/report-generator?studentId=STU001
```

#### 6. 报告编辑器 (`report-editor`)

**组件：**
- `Tabs`: 报告章节标签页
  - 报告摘要
  - 学生画像分析
  - 申请策略
  - 专业推荐
  - 学校推荐
  - 竞争力分析
  - 规划建议

每个标签页包含对应的 Form 或 Table 组件。

**访问路径：**
```
/workbench/yueyang-demo/report-editor?reportId=RPT001
```

#### 7. 学校管理 (`school-management`)

**组件：**
- `Tree`: 学校分类树形结构
  - 国家/地区 > 学校类型 > 具体学校
  - 支持增删改查、搜索
  - 支持拖拽排序
- `Table`: 学校详细信息表格
  - 学校名称、国家、排名
  - 录取率、学费

**访问路径：**
```
/workbench/yueyang-demo/school-management
```

#### 8. 专业管理 (`major-management`)

**组件：**
- `Table`: 专业信息管理表格
  - 专业名称、类别、学科领域
  - 就业前景、平均起薪
- `Chart`: 专业类别分布饼图

**访问路径：**
```
/workbench/yueyang-demo/major-management
```

#### 9. 模板管理 (`template-management`)

**组件：**
- `Table`: 报告模板管理表格
  - 模板名称、类型、适用国家
  - 版本、状态

**访问路径：**
```
/workbench/yueyang-demo/template-management
```

## 渲染器组件支持

所有渲染器组件都支持 `useMockData` 和 `mockData` 属性：

### StatisticGroup

```json
{
  "id": "statistics",
  "type": "StatisticGroup",
  "props": {
    "grid": { "cols": 4 },
    "items": [...]
  },
  "useMockData": true
}
```

### DataGridCard

```json
{
  "id": "data-grid",
  "type": "DataGridCard",
  "props": {
    "title": "数据列表",
    "columns": [...],
    "pagination": {...}
  },
  "mockData": [...],
  "useMockData": true
}
```

### Chart

```json
{
  "id": "chart",
  "type": "Chart",
  "props": {
    "chartType": "line",
    "xField": "date",
    "yField": "count"
  },
  "mockData": [...],
  "useMockData": true
}
```

### Table

```json
{
  "id": "table",
  "type": "Table",
  "props": {
    "title": "数据表格",
    "columns": [...],
    "actions": [...]
  },
  "mockData": [...],
  "useMockData": true
}
```

### Form

```json
{
  "id": "form",
  "type": "Form",
  "props": {
    "title": "表单",
    "fields": [...],
    "actions": [...]
  },
  "mockData": {...},
  "useMockData": true
}
```

### Tree

```json
{
  "id": "tree",
  "type": "Tree",
  "props": {
    "title": "树形结构",
    "parentKey": "parent_id",
    "keyField": "id",
    "label": "name"
  },
  "mockData": [...],
  "useMockData": true
}
```

## 创建新的 Mock 数据

### 1. 创建 JSON 文件

在 `workbench/src/mocks/` 目录下创建新的 JSON 文件：

```json
{
  "appConfig": {
    "name": "我的工作台",
    "navigation": {
      "mode": "side",
      "items": [...]
    }
  },
  "pages": {
    "my-page": {
      "title": "我的页面",
      "layout": "fluid",
      "components": [...]
    }
  }
}
```

### 2. 在 Workbench.tsx 中注册

```typescript
// 导入 mock 数据
import myMockData from '@/mocks/myMockData.json';

// 在 loadAppConfig 中添加判断
if (workbenchId === 'my-demo') {
  setAppConfig(myMockData as unknown as Record<string, unknown>);
  return;
}
```

### 3. 访问 Mock 工作台

```
http://localhost:5173/workbench/my-demo/my-page
```

## Mock 数据最佳实践

### 1. 数据真实性

- 使用真实的业务场景数据
- 保持数据结构与 API 返回格式一致
- 包含足够的测试用例数据

### 2. 组件配置

- 所有需要 mock 的组件都设置 `useMockData: true`
- 为每个组件提供对应的 `mockData` 字段
- 确保 mockData 格式与 dataSource 返回格式一致

### 3. 关联数据

- 使用统一的 ID 格式（如 STU001, RPT001）
- 保持数据之间的引用关系（如学生ID和报告的关联）
- 在不同页面间保持数据一致性

### 4. 状态模拟

- 包含不同状态的数据（进行中、已完成、失败等）
- 模拟边界情况（空数据、大量数据）
- 提供完整的生命周期数据

## 注意事项

1. **性能考虑**
   - Mock 数据应保持适中的大小
   - 大量数据可以使用分页模拟
   - 避免在 JSON 中包含重复的大对象

2. **数据更新**
   - Mock 数据在运行时是只读的
   - 修改操作只会影响前端状态
   - 刷新页面会重置到初始 mock 数据

3. **类型安全**
   - 确保 JSON 数据格式正确
   - 使用 TypeScript 类型检查
   - 遵循组件的 props 接口定义

4. **开发调试**
   - 在控制台查看 mock 数据加载日志
   - 使用 React DevTools 检查组件状态
   - 验证组件是否正确使用 mockData

## 参考资源

- **Mock 数据**: `workbench/src/mocks/yueyangMockData.json`
- **Workbench 配置**: `workbench/src/pages/Workbench.tsx`
- **渲染器组件**: `workbench/src/components/renderers/`

## 常见问题

### Q: Mock 数据没有加载？

A: 检查以下几点：
1. workbenchId 是否匹配（yueyang-demo 或 yueyangjiaoyu-demo）
2. JSON 文件是否有语法错误
3. 控制台是否有错误信息
4. 是否正确导入了 mock 数据文件

### Q: 组件没有显示 mock 数据？

A: 确认：
1. 组件配置中设置了 `useMockData: true`
2. 提供了对应的 `mockData` 字段
3. mockData 格式符合组件要求
4. 检查组件的 dataSource 属性是否优先级更高

### Q: 如何调试 mock 数据？

A: 方法：
1. 在浏览器控制台查看 "使用越洋教育 Mock 数据" 日志
2. 使用 React DevTools 查看组件接收的 props
3. 在渲染器组件中添加 console.log 查看数据流
4. 检查 Network 面板确认没有发起 API 请求

### Q: 可以混合使用 mock 数据和真实 API 吗？

A: 可以，但需要注意：
1. 在组件级别通过 `useMockData` 控制
2. 当 `useMockData: false` 时使用真实 API
3. 确保 mock 数据和 API 返回格式一致
4. 考虑数据一致性和关联关系

