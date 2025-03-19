# 修复 AiModel 创建时的 NOT NULL 约束问题

## 问题描述

在集成测试中，我们遇到了一个数据库 NOT NULL 约束失败的问题。具体来说，当尝试创建 AI 模型时，数据库报错表示 `model_id` 字段不能为 NULL，但我们的代码中似乎没有正确设置这个字段。

错误信息：
```
model_id 字段的 NOT NULL 约束失败
```

## 问题分析

通过检查代码和添加日志，我们发现了以下几个关键问题：

1. **字段命名不一致**：在接口层使用的是 `modelId`（驼峰命名法），而在数据库层使用的是 `model_id`（下划线命名法）。

2. **测试数据不完整**：在测试代码中，我们没有为模型对象提供 `modelId` 字段，导致映射到数据库时 `model_id` 为 NULL。

3. **类型定义问题**：在 `create` 方法的参数类型中，我们使用了 `Omit<AiModel, 'id' | 'createdAt' | 'updatedAt'>`，但在测试代码中仍然尝试传入 `createdAt` 和 `updatedAt` 字段。

## 解决方案

我们采取了以下步骤来解决这个问题：

1. **添加详细日志**：在 `mapModelToDb` 函数和 `AiModelRepository.create` 方法中添加了详细的日志记录，以便跟踪 `modelId` 字段的值和类型。

```typescript
// 在 mapModelToDb 函数中
console.log('mapModelToDb - 输入模型:', model);
console.log('mapModelToDb - modelId:', model.modelId);
console.log('mapModelToDb - modelId 类型:', typeof model.modelId);

// 在 AiModelRepository.create 方法中
console.log('AiModelRepository.create - 输入模型:', JSON.stringify(model, null, 2));
console.log('AiModelRepository.create - modelId:', model.modelId);
console.log('AiModelRepository.create - modelId 类型:', typeof model.modelId);
```

2. **添加字段验证**：在 `AiModelRepository.create` 方法中添加了对 `modelId` 字段的显式检查，如果为空则抛出错误。

```typescript
// 检查必需字段
if (!model.modelId) {
  throw new Error('modelId 字段不能为空，这将导致 NOT NULL 约束失败');
}
```

3. **修复测试数据**：在测试代码中，我们移除了不应该存在的 `createdAt` 和 `updatedAt` 字段，并添加了必需的字段，包括 `id`、`modelId`、`contextWindow` 和 `maxTokens`。

```typescript
// 修改前
const provider = await providerRepo.create({
  name: 'AI Provider',
  enabled: true,
  apiUrl: 'https://api.example.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// 修改后
const provider = await providerRepo.create({
  id: crypto.randomUUID(),
  name: 'AI Provider',
  enabled: true,
  apiUrl: 'https://api.example.com'
});

// 修改前
await modelRepo.create({
  name: 'Model A',
  providerId: provider.id,
  groupId: 'group-1',
  capabilities: ['text'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// 修改后
await modelRepo.create({
  name: 'Model A',
  providerId: provider.id,
  groupId: 'group-1',
  capabilities: ['text'],
  modelId: 'model-a',
  contextWindow: 4096,
  maxTokens: 1000
});
```

## 经验教训

1. **字段命名一致性**：在处理数据映射时，需要确保接口层和数据库层的字段命名映射正确。

2. **类型检查**：利用 TypeScript 的类型系统来确保传入的数据符合预期的结构。

3. **详细日志记录**：在调试复杂问题时，添加详细的日志记录可以帮助我们更好地理解数据流和问题所在。

4. **参数验证**：在关键方法中添加参数验证，可以提前发现问题并提供更明确的错误信息。

## 后续改进

1. **增强类型安全**：考虑使用更严格的类型定义，确保必需字段不能为 undefined。

2. **统一命名约定**：考虑在项目中统一使用一种命名约定，减少映射的复杂性。

3. **自动化测试**：增加更多的单元测试和集成测试，覆盖边缘情况和错误处理。 