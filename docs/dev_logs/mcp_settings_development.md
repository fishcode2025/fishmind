# MCP设置页面开发日志

## 概述

本文档记录了MCP设置页面的开发过程，包括UI设计、组件结构、状态管理、服务初始化和业务逻辑实现。

## 1. UI设计与实现

### 1.1 页面布局

MCP设置页面采用了垂直布局，包含以下主要部分：
- 标题区域（固定在顶部）
- 配置列表（可滚动）
- 添加/编辑配置对话框
- 删除确认对话框

页面使用了Material-UI组件库，实现了响应式设计和主题支持。

### 1.2 配置卡片组件

为了提高代码可维护性，我们将配置卡片提取为独立组件`McpConfigCard`：

```typescript
interface McpConfigCardProps {
  config: McpServerConfig;
  status?: ClientStatusResponse;
  enabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onToggle: () => void;
}

const McpConfigCard = ({ 
  config, 
  status, 
  enabled = true,
  onEdit, 
  onDelete, 
  onRefresh,
  onToggle 
}: McpConfigCardProps) => {
  // 组件实现...
};
```

卡片设计包括：
- 左侧边框颜色表示状态（绿色=已连接，红色=错误）
- 顶部显示名称和传输类型
- 中部显示配置详情（SSE URL或命令）
- 底部显示状态和操作按钮

### 1.3 UI优化

根据用户反馈，进行了多次UI优化：
- 弱化客户端名称和版本的展示
- 添加服务启用状态切换
- 优化错误消息显示样式
- 添加资源和工具列表展示
- 修复滚动条问题，确保内容可完全滚动

## 2. 组件结构与状态管理

### 2.1 主要状态

```typescript
// 配置列表和加载状态
const [loading, setLoading] = useState<boolean>(true);
const [configs, setConfigs] = useState<McpServerConfig[]>([]);

// 服务状态和启用状态
const [statuses, setStatuses] = useState<Record<string, ClientStatusResponse>>({});
const [enabledConfigs, setEnabledConfigs] = useState<Record<string, boolean>>({});

// 编辑状态
const [editingConfig, setEditingConfig] = useState<Partial<McpServerConfig>>({});
const [openDialog, setOpenDialog] = useState<boolean>(false);
const [formErrors, setFormErrors] = useState<FormErrors>({});
const [submitting, setSubmitting] = useState<boolean>(false);

// 删除状态
const [configToDelete, setConfigToDelete] = useState<string | null>(null);
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
```

### 2.2 服务引用

使用ServiceContainer获取MCP服务：

```typescript
const [mcpService, setMcpService] = useState<IMcpService | null>(null);

useEffect(() => {
  const loadService = async () => {
    try {
      const container = ServiceContainer.getInstance();
      if (container.has(SERVICE_KEYS.MCP)) {
        const service = container.get<IMcpService>(SERVICE_KEYS.MCP);
        setMcpService(service);
        loadConfigs(service);
      }
    } catch (error) {
      console.error('获取MCP服务失败:', error);
    }
  };
  
  loadService();
}, []);
```

## 3. 服务初始化与数据加载

### 3.1 应用启动时初始化服务

在App.tsx中初始化MCP服务：

```typescript
// 初始化MCP服务  
const mcpRepository = new McpServerConfigRepository(dbService);
const mcpService = new McpConfigService(mcpRepository);
serviceContainer.register(SERVICE_KEYS.MCP, mcpService);
await mcpService.initialize();
```

### 3.2 加载配置数据

```typescript
const loadConfigs = async (service?: IMcpService) => {
  try {
    setLoading(true);
    
    const configService = service || mcpService;
    if (!configService) {
      console.error('MCP服务未初始化');
      return;
    }
    
    // 获取配置列表
    const configs = await configService.getAllConfigs();
    setConfigs(configs);
    
    // 初始化启用状态
    const enabledMap: Record<string, boolean> = {};
    configs.forEach((config: McpServerConfig) => {
      enabledMap[config.id] = true; // 默认启用
    });
    setEnabledConfigs(enabledMap);
    
    // 模拟状态数据
    const statusMap: Record<string, ClientStatusResponse> = {};
    configs.forEach((config: McpServerConfig) => {
      // 根据传输类型生成不同的状态数据...
    });
    setStatuses(statusMap);
    
  } catch (error) {
    console.error('加载MCP配置失败:', error);
  } finally {
    setLoading(false);
  }
};
```

## 4. 业务逻辑实现

### 4.1 添加/编辑配置

```typescript
const handleSubmit = async () => {
  if (!validateForm(editingConfig)) {
    return;
  }
  
  try {
    setSubmitting(true);
    
    if (!mcpService) {
      throw new Error('MCP服务未初始化');
    }
    
    // 准备配置数据
    const configData: Partial<McpServerConfig> = {
      name: editingConfig.name || '',
      transportType: editingConfig.transportType || TransportType.SSE,
      timeoutSecs: Number(editingConfig.timeoutSecs) || 30,
      clientName: editingConfig.clientName || 'FishMind',
      clientVersion: editingConfig.clientVersion || '1.0.0'
    };
    
    // 根据传输类型添加特定字段...
    
    let savedConfig: McpServerConfig;
    
    if (editingConfig.id) {
      // 更新现有配置
      savedConfig = await mcpService.updateConfig(editingConfig.id, configData);
    } else {
      // 创建新配置
      savedConfig = await mcpService.createConfig(configData as McpServerConfig);
    }
    
    // 更新本地状态
    setConfigs(prev => prev.map(config => 
      config.id === savedConfig.id ? savedConfig : config
    ));
    
    // 关闭对话框
    setOpenDialog(false);
    
  } catch (error) {
    console.error(`MCP配置${editingConfig.id ? '更新' : '创建'}失败:`, error);
  } finally {
    setSubmitting(false);
  }
};
```

### 4.2 删除配置

```typescript
const confirmDelete = async () => {
  if (!configToDelete || !mcpService) {
    return;
  }
  
  try {
    // 从数据库删除
    await mcpService.deleteConfig(configToDelete);
    
    // 更新本地状态
    setConfigs(configs.filter(config => config.id !== configToDelete));
  } catch (error) {
    console.error('删除配置失败:', error);
  } finally {
    setDeleteConfirmOpen(false);
    setConfigToDelete(null);
  }
};
```

### 4.3 表单验证

```typescript
const validateForm = (config: Partial<McpServerConfig>): boolean => {
  const errors: FormErrors = {};
  
  // 验证名称
  if (!config.name?.trim()) {
    errors.name = '请输入配置名称';
  }
  
  // 根据传输类型验证
  if (config.transportType === TransportType.SSE) {
    if (!config.sseUrl?.trim()) {
      errors.sseUrl = '请输入SSE服务器URL';
    }
  } else {
    if (!config.command?.trim()) {
      errors.command = '请输入命令';
    }
  }
  
  // 验证超时时间
  if (!config.timeoutSecs) {
    errors.timeoutSecs = '请输入超时时间';
  } else if (isNaN(Number(config.timeoutSecs)) || Number(config.timeoutSecs) <= 0) {
    errors.timeoutSecs = '超时时间必须是正数';
  }
  
  // 设置错误状态
  setFormErrors(errors);
  
  // 如果有错误，返回false
  return Object.keys(errors).length === 0;
};
```

## 5. 遇到的问题与解决方案

### 5.1 TypeScript类型错误

#### 问题1: 枚举类型不匹配

```
Type '"Connected" | "Error"' is not assignable to type 'ClientStatus'.
```

**解决方案**: 使用枚举值而非字符串字面量

```typescript
status: Math.random() > 0.3 ? ClientStatus.Connected : ClientStatus.Error,
```

#### 问题2: 隐式any类型

```
Parameter 'config' implicitly has an 'any' type.
```

**解决方案**: 添加明确的类型注解

```typescript
configs.forEach((config: McpServerConfig) => {
  // ...
});
```

#### 问题3: 访问私有属性

```
Property 'repository' is private and only accessible within class 'McpConfigService'.
```

**解决方案**: 使用公共方法而非直接访问私有属性

```typescript
// 错误
const configs = await configService.repository.findAll();

// 正确
const configs = await configService.getAllConfigs();
```

### 5.2 服务初始化问题

#### 问题: 服务不存在

```
初始化MCP服务失败: Error: 服务 mcpService 不存在
```

**解决方案**: 在应用启动时初始化服务，确保使用正确的服务键名

```typescript
// 在App.tsx中初始化
const mcpService = new McpConfigService(mcpRepository);
serviceContainer.register(SERVICE_KEYS.MCP, mcpService);
await mcpService.initialize();
```

### 5.3 UI问题

#### 问题: 滚动条不能滚到底

**解决方案**: 调整容器高度和内边距

```typescript
<Box sx={{ 
  flex: 1,
  overflowY: 'auto',
  px: 3,
  pb: 4, // 增加底部填充确保最后元素可见
}}>
  {/* 内容 */}
</Box>
```

## 6. 后续优化方向

1. 实现实时状态更新，替代模拟数据
2. 添加连接测试功能
3. 优化表单验证和错误处理
4. 实现配置导入/导出功能
5. 添加详细的工具和资源管理界面

## 7. 总结

MCP设置页面实现了基本的配置管理功能，包括添加、编辑、删除和状态显示。通过组件拆分和状态管理优化，提高了代码可维护性。在开发过程中解决了多个TypeScript类型错误和服务初始化问题，优化了UI交互体验。

后续将继续完善功能，提升用户体验。 