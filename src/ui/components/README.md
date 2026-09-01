# Shared UI Components

This directory contains all shared UI components used across GeniSpace applications (web, workbench, admin). Components are organized by their purpose and level of abstraction.

**此目录包含 GeniSpace 应用程序（web、workbench、admin）中使用的所有共享 UI 组件。组件按其用途和抽象级别进行组织。**

## Directory Structure

```
components/
├── ui/                    # Base UI components (shadcn/ui style)
├── primitives/            # Reusable components without business logic
│   ├── forms/            # Form-related primitives
│   ├── data-display/     # Data display primitives
│   ├── feedback/         # Feedback primitives
│   └── layout/           # Layout primitives
└── features/             # Business domain components
    ├── task/             # Task-related components
    ├── agent/            # Agent-related components
    ├── chat/             # Chat-related components
    ├── application/      # Application-related components
    ├── operator/         # Operator-related components
    ├── data/             # Data-related components
    ├── team/             # Team-related components
    └── rbac/             # RBAC-related components
```

## Component Categories

### 1. UI (`ui/`)

**Purpose**: Base UI components following shadcn/ui patterns.

**用途**: 遵循 shadcn/ui 模式的基础 UI 组件。

**Characteristics**:
- Lowest level components with no business logic
- Pure presentation components
- Highly reusable across all features
- Examples: `Button`, `Input`, `Dialog`, `Card`, `Select`

**When to use**: For any basic UI element that doesn't contain business logic.

**何时使用**: 任何不包含业务逻辑的基础 UI 元素。

### 2. Primitives (`primitives/`)

**Purpose**: Reusable components that provide functionality but don't contain specific business logic.

**用途**: 提供功能但不包含特定业务逻辑的可复用组件。

**Characteristics**:
- Functional components that can be used across multiple features
- No domain-specific logic
- Examples: `ArrayInput`, `JsonEditor`, `FileUpload`, `EmptyState`, `LoadingOverlay`

**Subcategories**:
- **forms/**: Form-related primitives (inputs, editors, validators)
- **data-display/**: Data visualization primitives (tables, charts, code blocks)
- **feedback/**: User feedback primitives (loading states, error displays, status badges)
- **layout/**: Layout primitives (page headers, sections, containers)

**When to use**: When you need a functional component that could be reused across different features.

**何时使用**: 需要一个可在不同功能中复用的功能组件时。

### 3. Features (`features/`)

**Purpose**: Business domain components organized by feature area.

**用途**: 按功能领域组织的业务领域组件。

**Characteristics**:
- Contain specific business logic
- Organized by domain/feature
- Examples: `TaskInputForm`, `AgentCard`, `ChatMessage`, `PermissionTree`

**Feature Domains**:
- **task/**: Task management, execution, and monitoring components
- **agent/**: Agent management and interaction components
- **chat/**: Chat interface and messaging components
- **application/**: Application management components
- **operator/**: Operator management and configuration components
- **data/**: Data management, datasets, and data sources components
- **team/**: Team management and collaboration components
- **rbac/**: Role-based access control components

**When to use**: When creating components specific to a business domain or feature.

**何时使用**: 创建特定业务领域或功能的组件时。

## Decision Tree

When adding a new component, use this decision tree to determine where it should go:

**添加新组件时，使用此决策树确定应放置的位置：**

```
Is it a base UI component (Button, Input, Dialog, etc.)?
├─ Yes → ui/
└─ No
   │
   Does it contain specific business logic?
   ├─ Yes → features/{domain}/
   └─ No
      │
      Can it be reused across multiple features?
      ├─ Yes → primitives/{category}/
      └─ No → features/{domain}/ (or reconsider if it should be shared)
```

## Usage Examples

### Importing Base UI Components

```typescript
import { Button, Input, Dialog } from '@genispace/geniapp/ui';
```

### Importing Primitives

```typescript
import { ArrayInput, JsonEditor } from '@genispace/geniapp/ui/primitives/forms';
import { EmptyState } from '@genispace/geniapp/ui/primitives/data-display';
```

### Importing Feature Components (Namespace Style)

```typescript
import { Task, Agent, Chat } from '@genispace/geniapp/ui/features';

// Usage
<Task.TaskInputForm />
<Agent.AgentCard />
<Chat.ChatMessage />
```

### Importing Feature Components (Direct Style)

```typescript
import { TaskInputForm } from '@genispace/geniapp/ui/features/task';
import { AgentCard } from '@genispace/geniapp/ui/features/agent';
```

## Component Structure

Each component directory should follow this structure:

**每个组件目录应遵循以下结构：**

```
ComponentName/
├── ComponentName.tsx      # Main component file
├── ComponentName.types.ts # TypeScript types (optional)
├── hooks/                 # Component-specific hooks (optional)
│   └── useComponentName.ts
├── utils.ts              # Utility functions (optional)
└── index.ts              # Export file
```

## Naming Conventions

- **Directories**: PascalCase (e.g., `TaskInputForm/`)
- **Files**: PascalCase for components (e.g., `TaskInputForm.tsx`), camelCase for utilities (e.g., `utils.ts`)
- **Components**: PascalCase (e.g., `TaskInputForm`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTaskInputForm`)

**命名约定**:
- **目录**: PascalCase（例如：`TaskInputForm/`）
- **文件**: 组件使用 PascalCase（例如：`TaskInputForm.tsx`），工具函数使用 camelCase（例如：`utils.ts`）
- **组件**: PascalCase（例如：`TaskInputForm`）
- **Hooks**: camelCase，带 `use` 前缀（例如：`useTaskInputForm`）

## Export Strategy

### Component Directory Export (`index.ts`)

```typescript
// ComponentName/index.ts
export { ComponentName } from './ComponentName';
export { useComponentName } from './hooks/useComponentName';
export type { ComponentNameProps } from './ComponentName.types';
```

### Category Export (`index.ts`)

```typescript
// features/task/index.ts
export * from './TaskInputForm';
export * from './TaskOutputs';
export * from './TaskCard';
```

### Main Export (`components/index.ts`)

```typescript
// Re-exports all categories
export * from './ui';
export * from './primitives';
export * from './features';
```

## Best Practices

1. **Keep components focused**: Each component should have a single, well-defined responsibility
2. **Avoid business logic in primitives**: Primitives should be reusable and domain-agnostic
3. **Use TypeScript**: All components should be typed with TypeScript
4. **Document props**: Use JSDoc comments to document component props
5. **Export types**: Export TypeScript types alongside components
6. **Follow naming conventions**: Use consistent naming across all components
7. **Keep dependencies minimal**: Avoid heavy dependencies in shared components
8. **Consider accessibility**: Ensure components are accessible (ARIA labels, keyboard navigation, etc.)

**最佳实践**:
1. **保持组件专注**: 每个组件应该有单一、明确定义的职责
2. **避免在基础组件中包含业务逻辑**: 基础组件应该是可复用的且与领域无关
3. **使用 TypeScript**: 所有组件都应使用 TypeScript 类型
4. **文档化 props**: 使用 JSDoc 注释记录组件 props
5. **导出类型**: 与组件一起导出 TypeScript 类型
6. **遵循命名约定**: 在所有组件中使用一致的命名
7. **保持依赖最小**: 避免在共享组件中使用重依赖
8. **考虑可访问性**: 确保组件可访问（ARIA 标签、键盘导航等）

## Migration Guide

When migrating existing components:

**迁移现有组件时：**

1. **Identify component type**: Use the decision tree to determine the correct category
2. **Move component**: Place it in the appropriate directory
3. **Update exports**: Add exports to the relevant `index.ts` files
4. **Update imports**: Update all import statements in consuming applications
5. **Test**: Ensure all functionality still works after migration

1. **识别组件类型**: 使用决策树确定正确的分类
2. **移动组件**: 将其放置在适当的目录中
3. **更新导出**: 将导出添加到相关的 `index.ts` 文件
4. **更新导入**: 更新使用应用程序中的所有导入语句
5. **测试**: 确保迁移后所有功能仍然正常工作

## Contributing

When adding new components:

**添加新组件时：**

1. Create the component in the appropriate directory
2. Add exports to the relevant `index.ts` files
3. Update this README if adding a new category or feature domain
4. Add TypeScript types
5. Write documentation comments
6. Test the component in isolation and in context

1. 在适当的目录中创建组件
2. 将导出添加到相关的 `index.ts` 文件
3. 如果添加新分类或功能领域，请更新此 README
4. 添加 TypeScript 类型
5. 编写文档注释
6. 在隔离环境和上下文中测试组件
