# App 目录说明

`app` 目录包含了应用的核心功能和全局状态管理相关的代码。

## 目录结构

```
app/
├── context/          # 业务相关的全局状态管理
│   ├── TeamContext.tsx    # 团队相关的状态管理
│   └── UserContext.tsx    # 用户相关的状态管理
│
├── providers/        # 应用级别的全局功能提供者
│   ├── theme-provider.tsx    # 主题管理
│   └── toast-provider.tsx    # 通知系统
│
└── services/         # 业务相关的 API 服务和数据处理
    ├── operator.ts      # 算子相关的 API 服务
    ├── task.ts          # 任务相关的 API 服务
    ├── workbenchApi.ts  # 工作台相关的 API 服务
    └── auth.ts          # 认证相关的工具函数

lib/                  # 通用工具库和基础设施
├── api/              # API 相关的基础设施
│   ├── apiClient.ts    # API 客户端封装
│   └── apiKey.ts       # API 密钥管理
│
├── hooks/            # 可复用的 React Hooks
│   ├── useOperator.ts  # 算子相关的 Hook
│   └── useTheme.ts     # 主题相关的 Hook
│
└── utils/            # 通用工具函数
    ├── color.ts        # 颜色处理工具
    ├── formatting.ts   # 格式化工具
    ├── icon.tsx        # 图标组件
    └── permissions.ts  # 权限处理工具
```

## 功能说明

### Context 目录

`context` 目录包含业务相关的全局状态管理：

- `TeamContext.tsx`
  - 管理团队相关的全局状态
  - 提供团队列表、当前团队、团队成员等状态
  - 包含团队切换、成员管理等功能
  - 提供 `useTeam` hook 方便组件使用

- `UserContext.tsx`
  - 管理用户相关的全局状态
  - 处理用户登录状态
  - 提供用户信息存储和登出功能
  - 使用 localStorage 持久化存储用户信息

### Providers 目录

`providers` 目录包含应用级别的全局功能提供者：

- `theme-provider.tsx`
  - 管理应用的主题状态
  - 提供深色/浅色模式切换功能
  - 管理全局样式主题配置

- `toast-provider.tsx`
  - 管理全局的通知/提示系统
  - 提供统一的 toast 消息展示功能
  - 支持不同类型的提示（成功、错误、警告等）

### Services 目录

`services` 目录包含业务相关的 API 服务和数据处理：

- `task.ts`
  - 任务相关的 API 服务
  - 处理任务数据的转换和处理
  - 提供任务的创建、更新、删除等操作
  - 管理任务节点的数据转换

- `workbenchApi.ts`
  - 工作台相关的 API 服务
  - 提供应用配置、页面配置的获取
  - 处理数据集查询和组件数据获取
  - 包含缓存管理和请求处理

- `auth.ts`
  - 认证相关的工具函数
  - 提供 token 的获取和清除功能
  - 管理用户认证状态

### Lib 目录

`lib` 目录包含通用的工具库和基础设施：

#### API 目录

- `apiClient.ts`
  - 封装 HTTP 请求客户端
  - 提供统一的请求/响应处理
  - 处理认证和错误处理
  - 支持请求拦截和响应拦截

- `apiKey.ts`
  - 管理 API 密钥
  - 提供密钥的加密存储
  - 处理密钥的轮换和更新

#### Hooks 目录

- `useOperator.ts`
  - 提供算子相关的状态管理
  - 封装算子的常用操作
  - 处理算子的状态更新

- `useTheme.ts`
  - 提供主题相关的状态管理
  - 处理主题切换和持久化
  - 提供主题相关的工具函数

#### Utils 目录

- `color.ts`
  - 提供颜色处理工具
  - 支持颜色转换和计算
  - 处理主题相关的颜色

- `formatting.ts`
  - 提供数据格式化工具
  - 处理日期、数字等格式化
  - 支持多语言格式化

- `icon.tsx`
  - 提供图标组件
  - 支持自定义图标
  - 处理图标样式和动画

- `permissions.ts`
  - 提供权限处理工具
  - 处理用户权限验证
  - 支持权限组合和检查

## 使用方式

这些 Context、Providers、Services 和 Lib 通常在应用的根组件中使用：

```tsx
function App() {
  return (
    <UserProvider>
      <TeamProvider>
        <ThemeProvider>
          <ToastProvider>
            {/* 应用内容 */}
          </ToastProvider>
        </ThemeProvider>
      </TeamProvider>
    </UserProvider>
  );
}
```

在组件中使用时，可以通过对应的 hook 来访问状态：

```tsx
// 使用团队相关的状态
const { currentTeam, switchTeam } = useTeam();

// 使用用户相关的状态
const { user, signOut } = useUser();

// 使用服务
import { transformTaskData } from '../services/task';

// 使用工具函数
import { formatDate } from '../../lib/utils/formatting';
import { checkPermission } from '../../lib/utils/permissions';
```

## 最佳实践

1. 优先使用 Context 来管理全局状态，避免 prop drilling
2. 将相关的状态和逻辑组织在同一个 Context 中
3. 使用 TypeScript 类型定义来确保类型安全
4. 通过自定义 hook 来封装 Context 的使用
5. 合理使用 localStorage 来持久化必要的状态
6. 将 API 调用和数据处理逻辑封装在 services 中
7. 使用统一的错误处理和响应格式
8. 合理使用缓存来提高性能
9. 将通用工具函数放在 utils 目录中
10. 使用 hooks 来封装可复用的逻辑
11. 保持 API 客户端的一致性和可配置性 