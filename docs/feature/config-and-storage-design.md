# 配置管理与数据存储方案设计

## 1. 背景与问题
### 1.1 现状
- 应用配置（如 APP_CHATS_DATA）硬编码在代码中，分散在多个文件里
- 用户设置存储在浏览器本地存储中，与桌面应用的特性不符
- 缺乏统一的配置管理机制

### 1.2 目标
- 统一管理应用配置和用户设置
- 提供可靠的本地数据持久化
- 优化用户设置的存取体验

## 2. 解决方案
### 2.1 目录结构设计
```
$APPDATA/
├── config/              # 配置目录
│   ├── system.json     # 系统配置
│   └── settings.json   # 用户设置
├── data/               # 数据目录
│   ├── chats/         # 聊天记录
│   │   └── topics/    # 话题数据
│   └── db/            # SQLite数据库
└── logs/              # 应用日志
```

### 2.2 Tauri 权限配置
#### 2.2.1 文件系统权限
```json
{
  "permissions": [
    "core:default",
    "fs:default",
    {
      "identifier": "fs:allow-exists",
      "allow": [
        {
          "path": "$APPDATA/config/**/*"
        },
        {
          "path": "$APPDATA/data/**/*"
        }
      ]
    },
    {
      "identifier": "fs:allow-app-read",
      "allow": [
        {
          "path": "$APPDATA/config/**/*"
        },
        {
          "path": "$APPDATA/data/**/*"
        }
      ]
    },
    {
      "identifier": "fs:allow-app-write",
      "allow": [
        {
          "path": "$APPDATA/config/**/*"
        },
        {
          "path": "$APPDATA/data/**/*"
        }
      ]
    },
    {
      "identifier": "fs:allow-mkdir",
      "allow": [
        {
          "path": "$APPDATA/config"
        },
        {
          "path": "$APPDATA/data"
        },
        {
          "path": "$APPDATA/data/chats"
        },
        {
          "path": "$APPDATA/data/db"
        }
      ]
    }
  ]
}
```

#### 2.2.2 数据库权限
```json
{
  "permissions": [
    "sql:default",
    "sql:allow-execute",
    "sql:allow-load",
    "sql:allow-select"
  ]
}
```

### 2.3 配置系统设计
#### 2.3.1 系统配置（system.json）
```typescript
interface SystemConfig {
  paths: {
    data: string;      // 数据根目录
    chats: string;     // 聊天数据目录
    database: string;  // 数据库文件路径
    logs: string;      // 日志目录
  };
  database: {
    filename: string;  // 数据库文件名
    maxSize: number;  // 数据库大小限制
  };
  logging: {
    level: string;    // 日志级别
    maxFiles: number; // 最大日志文件数
  };
}
```

#### 2.3.2 用户配置（settings.json）
```typescript
interface UserSettings {
  models: {
    defaultModel: string;
    providers: Array<{
      id: string;
      apiKey?: string;
      baseUrl?: string;
    }>;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    language: string;
  };
  shortcuts: Record<string, string>;
  chat: {
    maxHistorySize: number;
    autoSave: boolean;
  };
}
```

### 2.4 初始化流程
1. 应用启动时：
   - 检查并创建必要的目录结构
   - 验证权限设置
   - 加载系统配置
   - 加载用户设置

2. 目录创建顺序：
   ```typescript
   const dirs = [
     'config',
     'data',
     'data/chats',
     'data/db',
     'logs'
   ];
   
   for (const dir of dirs) {
     await ensureDir(`$APPDATA/${dir}`);
   }
   ```

## 3. 实现计划
### 3.1 第一阶段：基础设施
1. 配置 Tauri 权限
   - 更新 default.json 权限配置
   - 测试文件系统访问权限
   - 验证数据库操作权限

2. 实现目录结构
   - 创建目录管理服务
   - 实现目录初始化逻辑
   - 添加权限检查

3. 实现配置管理
   - 创建配置读写服务
   - 实现配置验证
   - 添加默认配置

### 3.2 第二阶段：功能迁移
1. 迁移现有配置
   - 将硬编码配置迁移到配置文件
   - 更新配置访问方式
   - 测试配置读写

2. 迁移数据存储
   - 更新数据库路径配置
   - 更新文件存储路径
   - 测试数据访问

## 4. 注意事项
1. 权限管理
   - 严格遵循最小权限原则
   - 定期审查权限配置
   - 及时更新权限需求

2. 数据安全
   - 实现配置文件加密
   - 添加敏感数据保护
   - 实现自动备份机制

3. 错误处理
   - 权限不足的友好提示
   - 配置损坏的恢复机制
   - 完善的错误日志 