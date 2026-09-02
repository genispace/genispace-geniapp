# 多语言模板系统

## 目录结构

模板系统现在支持多语言，目录结构如下：

```
templates/
├── zh/          # 中文模板
│   ├── education/
│   ├── finance/
│   ├── general/
│   └── ...
├── en/          # 英文模板（可选，如果不存在会自动回退到中文模板）
│   ├── education/
│   ├── finance/
│   ├── general/
│   └── ...
└── README.md
```

## 工作原理

1. **语言检测**：系统会根据当前 i18n 语言设置自动选择对应的模板
2. **自动回退**：如果当前语言的模板不存在，会自动回退到中文模板
3. **模板元数据**：模板的名称、描述、标签等都支持多语言

## 添加新模板

### 1. 添加模板文件

将模板 JSON 文件放到对应语言的目录下：

```bash
# 中文模板
templates/zh/your-category/your-template.json

# 英文模板（可选）
templates/en/your-category/your-template.json
```

### 2. 注册模板元数据

在 `templateRegistry.ts` 中添加模板配置：

```typescript
{
  id: 'your-template-id',
  name: { 
    en: 'English Name', 
    zh: '中文名称' 
  },
  description: { 
    en: 'English description', 
    zh: '中文描述' 
  },
  category: TemplateCategory.YOUR_CATEGORY,
  icon: 'YourIcon',
  tags: [
    { en: 'Tag1', zh: '标签1' },
    { en: 'Tag2', zh: '标签2' }
  ],
  version: '1.0.0',
  filePath: 'your-category/your-template.json'
}
```

## 模板内容多语言

模板 JSON 文件中的内容（如 `appConfig.name`、`navigation.items[].title` 等）也需要根据语言分别创建：

- **中文模板** (`zh/`): 包含中文内容
- **英文模板** (`en/`): 包含英文内容

如果某个语言版本的模板不存在，系统会自动使用中文版本作为后备。

## 注意事项

1. 模板文件路径 (`filePath`) 不需要包含语言前缀，系统会自动根据当前语言添加
2. 模板元数据中的多语言字段使用 `LocalizedText` 类型
3. 系统会在语言切换时自动清除缓存并重新加载模板
