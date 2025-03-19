# ConfigRepository 改造技术细节

## 背景

在开发过程中，我们发现 ConfigRepository 存在几个问题：

1. 数据库字段名与 TypeScript 接口属性名不匹配（下划线命名法 vs 驼峰命名法）
2. 错误处理不够健壮，特别是对"表不存在"等特定错误的处理
3. 测试代码中缺乏足够的健壮性检查和调试信息

这些问题导致了测试失败和难以诊断的错误，特别是在处理配置变更历史和错误情况时。

## 改造内容

### 1. 数据访问层字段映射

我们修改了 `ConfigRepository` 中的所有查询方法，添加了显式的字段映射逻辑：

```typescript
// 修改前
async findById(key: string): Promise<Config | null> {
  try {
    return await this.db.get<Config>(
      'SELECT * FROM configs WHERE key = ?',
      [key]
    );
  } catch (error: unknown) {
    throw new DatabaseError(
      `查找配置失败: ${(error as Error).message}`,
      DatabaseErrorType.QUERY_ERROR
    );
  }
}

// 修改后
async findById(key: string): Promise<Config | null> {
  try {
    const result = await this.db.get<{
      key: string;
      value: string;
      updated_at: string;
      group_name: string | null;
      description: string | null;
    }>(
      'SELECT key, value, updated_at, group_name, description FROM configs WHERE key = ?',
      [key]
    );
    
    if (!result) {
      return null;
    }
    
    // 将数据库字段名映射到接口属性名
    return {
      key: result.key,
      value: result.value,
      updatedAt: result.updated_at,
      groupName: result.group_name || undefined,
      description: result.description || undefined
    };
  } catch (error: unknown) {
    throw new DatabaseError(
      `查找配置失败: ${(error as Error).message}`,
      DatabaseErrorType.QUERY_ERROR
    );
  }
}
```

类似的修改应用于以下方法：
- `findAll`
- `findByGroup`
- `getMetadata`
- `getAllMetadata`
- `getMetadataByGroup`
- `getChangeHistory`

这些修改确保了从数据库返回的对象属性名与 TypeScript 接口定义一致，解决了由于命名风格差异导致的问题。

### 2. 增强错误处理

我们对 `SQLiteService` 类中的三个主要数据库操作方法进行了改进：

```typescript
// query 方法中的错误处理
try {
  // 执行查询...
} catch (error: unknown) {
  console.error('查询失败:', error);
  
  // 获取详细的错误信息
  let errorMessage = '未知错误';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    errorMessage = JSON.stringify(error);
  }
  
  // 检查是否包含特定的错误类型
  const errorStr = String(error);
  if (errorStr.includes('no such table')) {
    throw new DatabaseError(
      `查询失败: 表不存在 - ${errorMessage}`,
      DatabaseErrorType.NOT_FOUND
    );
  }
  
  throw new DatabaseError(
    `查询失败: ${errorMessage}`,
    DatabaseErrorType.QUERY_ERROR
  );
}
```

类似的改进应用于 `execute` 和 `get` 方法，增加了对不同类型错误的识别和处理：
- 表不存在错误 (`no such table`)
- SQL 语法错误 (`syntax error`)
- 唯一约束冲突 (`UNIQUE constraint failed`)

这些修改使错误处理更加健壮，提供了更有用的错误信息，便于调试和问题排查。

### 3. 测试代码健壮性增强

我们增强了测试代码的健壮性，添加了更多的错误处理和调试信息：

```typescript
// 检查第一条记录的键是否为 app.theme
const firstRecord = history[0];
console.log('第一条记录:', firstRecord);
console.log('第一条记录的属性:', Object.keys(firstRecord));
console.log('第一条记录的旧值:', firstRecord.oldValue);
console.log('第一条记录的新值:', firstRecord.newValue);

// 添加更多健壮性检查
if (!firstRecord) {
  console.error('第一条记录不存在');
  throw new Error('第一条记录不存在');
}

if (typeof firstRecord !== 'object') {
  console.error('第一条记录不是对象:', typeof firstRecord);
  throw new Error(`第一条记录不是对象: ${typeof firstRecord}`);
}

// 检查所有必要的属性是否存在
const requiredProps = ['key', 'oldValue', 'newValue', 'timestamp'];
for (const prop of requiredProps) {
  if (!(prop in firstRecord)) {
    console.error(`第一条记录缺少必要的属性: ${prop}`);
    console.error('可用的属性:', Object.keys(firstRecord));
    throw new Error(`第一条记录缺少必要的属性: ${prop}`);
  }
}
```

这些修改提高了测试的可靠性和可诊断性，使问题更容易被发现和解决。

## 最佳实践总结

通过这次改造，我们总结了以下最佳实践：

1. **数据访问层字段映射**：
   - 在数据访问层中始终进行字段映射，确保返回的对象符合接口定义
   - 明确指定查询的字段，而不是使用 `SELECT *`
   - 为查询结果添加明确的类型定义

2. **错误处理**：
   - 提取详细的错误信息，处理不同类型的错误对象
   - 识别特定类型的错误，提供更有用的错误消息
   - 使用适当的错误类型，便于上层代码处理

3. **测试健壮性**：
   - 添加存在性检查和类型检查
   - 验证对象是否包含所有必要的属性
   - 添加详细的日志输出，便于诊断问题

4. **命名约定**：
   - 数据库层：使用下划线命名法（如 `group_name`, `updated_at`）
   - 接口层：使用驼峰命名法（如 `groupName`, `updatedAt`）
   - 在数据访问层进行显式映射，处理命名风格差异

## 未来改进方向

1. **创建映射工具函数**：
   - 可以考虑创建通用的映射工具函数，减少重复代码
   - 例如：`mapConfigFromDb`, `mapMetadataFromDb` 等

2. **考虑使用 ORM 框架**：
   - 如果项目规模扩大，可以考虑使用 TypeORM, Prisma 等 ORM 框架
   - 这些框架提供了自动的字段映射功能和更强大的查询能力

3. **统一命名约定文档**：
   - 创建项目命名约定文档，确保团队成员了解并遵循相同的规则
   - 明确规定数据库字段名和接口属性名的命名风格

通过这些改进，我们提高了代码的健壮性、可维护性和可测试性，为项目的长期发展奠定了更好的基础。 