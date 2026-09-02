# Mock 数据系统使用指南

## 🎯 概述

通过 URL 路由自动匹配 mock 数据文件，无需修改代码即可预览新的工作台配置。

## 📝 URL 格式

```
http://localhost:5013/workbench/demo-{name}/{page-id}
```

- `demo-{name}`: Demo 工作台 ID
- `{page-id}`: 页面 ID（可选）

## 🚀 快速开始

### 1. 创建 Mock 数据文件

在 `workbench/src/mocks/` 目录下创建 JSON 文件：

```bash
touch workbench/src/mocks/myProjectMockData.json
```

**命名规则：** `{name}MockData.json`（驼峰命名）

### 2. 编写 Mock 数据

```json
{
  "appConfig": {
    "name": "我的项目工作台",
    "description": "项目描述",
    "defaultPage": "dashboard",
    "navigation": {
      "mode": "side",
      "items": [
        {
          "key": "home",
          "title": "首页",
          "icon": "Home",
          "linkedPage": "dashboard"
        }
      ]
    }
  },
  "pages": {
    "dashboard": {
      "title": "仪表盘",
      "layout": "fluid",
      "components": [
        {
          "id": "welcome",
          "type": "Text",
          "props": {
            "content": "欢迎使用我的项目！"
          }
        }
      ]
    }
  }
}
```

### 3. 注册 Mock 数据

编辑 `workbench/src/mocks/index.ts`：

```typescript
// 1. 导入你的 mock 数据
import myProjectMockData from './myProjectMockData.json';

// 2. 注册到 mockRegistry
export const mockRegistry: MockDataRegistry = {
  'myProject': myProjectMockData,  // ✅ 添加这一行
  'yueyang': yueyangMockData,
  // ... 其他 mock 数据
};
```

**注意：** 注册键名使用驼峰命名（camelCase），对应文件名中的 `{name}` 部分。

### 4. 访问 Mock 工作台

```
http://localhost:5013/workbench/demo-myProject/dashboard
```

## 📋 完整示例

### 文件结构

```
workbench/src/mocks/
├── index.ts                    # Mock 数据注册表
├── yueyangMockData.json        # 越洋教育 mock 数据
├── myProjectMockData.json      # 你的 mock 数据
└── USAGE.md                    # 本文档
```

### 示例：创建 HR 系统 Mock

**1. 创建文件：** `hrSystemMockData.json`

```json
{
  "appConfig": {
    "name": "HR管理系统",
    "description": "人力资源管理工作台",
    "navigation": {
      "mode": "side",
      "items": [
        {
          "key": "employees",
          "title": "员工管理",
          "icon": "Users",
          "linkedPage": "employee-list"
        }
      ]
    }
  },
  "pages": {
    "employee-list": {
      "title": "员工列表",
      "layout": "fluid",
      "components": [
        {
          "id": "employee-table",
          "type": "Table",
          "props": {
            "title": "员工信息",
            "columns": [
              { "title": "姓名", "dataIndex": "name", "key": "name" },
              { "title": "部门", "dataIndex": "department", "key": "department" }
            ]
          },
          "mockData": [
            { "id": "1", "name": "张三", "department": "技术部" },
            { "id": "2", "name": "李四", "department": "市场部" }
          ],
          "useMockData": true
        }
      ]
    }
  }
}
```

**2. 注册到 `index.ts`：**

```typescript
import hrSystemMockData from './hrSystemMockData.json';

export const mockRegistry: MockDataRegistry = {
  'hrSystem': hrSystemMockData,  // 新增
  'yueyang': yueyangMockData,
  // ...
};
```

**3. 访问：**

```
http://localhost:5013/workbench/demo-hrSystem/employee-list
```

## 🔧 高级功能

### 支持的 URL 格式

系统支持两种 URL 格式：

1. **新格式（推荐）：** `demo-{name}`
   ```
   /workbench/demo-myProject/dashboard
   ```

2. **兼容格式：** `{name}-demo`
   ```
   /workbench/yueyang-demo/dashboard
   ```

### 别名支持

一个 mock 数据可以有多个别名：

```typescript
export const mockRegistry: MockDataRegistry = {
  'yueyang': yueyangMockData,
  'yueyangjiaoyu': yueyangMockData,  // 别名
  'yyjy': yueyangMockData,           // 短别名
};
```

访问方式：
```
http://localhost:5013/workbench/demo-yueyang/dashboard
http://localhost:5013/workbench/demo-yueyangjiaoyu/dashboard
http://localhost:5013/workbench/demo-yyjy/dashboard
```

### 获取可用的 Demo 列表

使用辅助函数获取所有可用的 demo：

```typescript
import { getAvailableDemos } from '@/mocks/index';

const demos = getAvailableDemos();
// 返回:
// [
//   { id: 'demo-yueyang', name: '越洋升学规划工作台', url: '/workbench/demo-yueyang/dashboard' },
//   { id: 'demo-hrSystem', name: 'HR管理系统', url: '/workbench/demo-hrSystem/employee-list' },
//   ...
// ]
```

## 📚 Mock 数据结构

### 基本结构

```json
{
  "appConfig": {
    "name": "工作台名称",
    "description": "工作台描述",
    "defaultPage": "默认页面ID",
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

### 组件 Mock 数据

每个组件都可以包含 `mockData` 和 `useMockData` 属性：

```json
{
  "id": "my-component",
  "type": "Table",
  "props": {
    "columns": [...]
  },
  "mockData": [...],
  "useMockData": true
}
```

## 🎨 最佳实践

### 1. 命名规范

- **文件名：** 驼峰命名 + `MockData.json` 后缀
  - ✅ `yueyangMockData.json`
  - ✅ `hrSystemMockData.json`
  - ❌ `yueyang-mock-data.json`
  - ❌ `hr_system_mock.json`

- **注册键名：** 驼峰命名，与文件名保持一致
  - ✅ `'yueyang'`
  - ✅ `'hrSystem'`
  - ❌ `'yueyang-demo'`
  - ❌ `'hr_system'`

### 2. 数据组织

- 保持数据结构清晰，使用合理的缩进
- 为每个页面提供完整的示例数据
- 使用真实的业务场景数据
- 包含不同状态的数据（如：进行中、已完成、失败等）

### 3. 性能考虑

- Mock 数据文件不要过大（建议 < 2MB）
- 大量数据使用分页模拟
- 避免重复的大对象

### 4. 维护性

- 添加详细的注释说明
- 保持与实际 API 返回格式一致
- 定期更新和维护 mock 数据

## 🐛 常见问题

### Q1: Mock 数据没有加载？

**检查清单：**
1. ✅ 文件名是否正确：`{name}MockData.json`
2. ✅ 是否已在 `index.ts` 中导入和注册
3. ✅ JSON 文件是否有语法错误
4. ✅ URL 格式是否正确：`demo-{name}`

**调试方法：**
```typescript
// 在浏览器控制台执行
import { getMockData } from '@/mocks/index';
getMockData('demo-myProject'); // 查看是否返回数据
```

### Q2: 页面显示空白？

**可能原因：**
1. `appConfig.defaultPage` 未配置或配置错误
2. `pages` 对象中没有对应的页面配置
3. 组件配置有误

**解决方案：**
```json
{
  "appConfig": {
    "defaultPage": "dashboard"  // 确保这个页面存在
  },
  "pages": {
    "dashboard": {  // ✅ 页面ID必须匹配
      "title": "仪表盘",
      "components": [...]
    }
  }
}
```

### Q3: 如何调试 Mock 数据？

**方法 1：** 查看控制台日志
```
✅ 加载 Mock 数据: demo-myProject → myProjectMockData.json
```

**方法 2：** 使用 React DevTools
- 查看 `Workbench` 组件的 `appConfig` state
- 检查是否正确加载了 mock 数据

**方法 3：** 检查网络请求
- 打开 Chrome DevTools Network 面板
- 确认没有发起后端 API 请求

### Q4: 可以混合使用 Mock 和真实 API 吗？

**可以！** 在组件级别控制：

```json
{
  "components": [
    {
      "id": "mock-table",
      "type": "Table",
      "mockData": [...],
      "useMockData": true  // 使用 mock
    },
    {
      "id": "real-table",
      "type": "Table",
      "dataSource": {
        "datasetId": "ds_001"  // 使用真实 API
      },
      "useMockData": false
    }
  ]
}
```

## 🔗 相关文档

- [Mock 数据详细说明](./README.md)
- [组件配置指南](../components/)
- [工作台配置文档](../../docs/)

## 💡 提示

- Mock 数据在浏览器刷新后会重置
- Demo 工作台是只读模式，不支持编辑和保存
- 修改 mock 数据文件后需要刷新页面才能生效

---

**祝你使用愉快！** 如有问题，请查看控制台日志或联系开发团队。

