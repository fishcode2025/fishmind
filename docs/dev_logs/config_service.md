# 开发日志：数据库服务与配置系统实现

## 日期：2023-11-15

### 完成内容

1. **服务层架构重构**
   - 实现了基础`IService`接口，定义了服务生命周期方法
   - 创建了`ServiceContainer`单例类，用于管理服务实例和依赖注入
   - 实现了`IConfigService`、`IAiModelService`和`IChatService`接口

2. **配置服务实现**
   - 实现了`ConfigService`类，提供配置的存储和检索功能
   - 添加了配置变更通知机制，支持监听器模式
   - 实现了类型安全的配置访问方法

3. **数据库位置管理**
   - 将数据库位置管理集成到配置服务中
   - 默认数据库位置设置为`$APPDATA/data/db/fishmind.db`
   - 实现了数据库位置变更和迁移功能

4. **系统设置界面**
   - 创建了系统设置页面，包含数据库位置设置
   - 实现了数据库位置的浏览、保存和重置功能
   - 添加了设置页面的布局和导航

5. **修复的问题**
   - 修复了服务注册顺序问题，确保服务在使用前正确初始化
   - 解决了Windows系统上的路径格式问题，使用Tauri的`join`函数正确处理路径
   - 修复了数据库表创建失败的问题，确保数据库初始化完成后再创建表

### 技术细节

1. **路径处理**
   ```typescript
   const { appDataDir, join } = await import('@tauri-apps/api/path');
   const appData = await appDataDir();
   const dbDir = await join(appData, 'data', 'db');
   this.dbPath = await join(dbDir, 'fishmind.db');
   ```

2. **数据库初始化**
   ```typescript
   // 打开数据库连接
   this.db = await Database.load(`sqlite:${this.dbPath}`);
   this.initialized = true;
   
   // 创建表结构
   await createTables(this);
   ```

3. **配置服务中的数据库位置管理**
   ```typescript
   async getDatabaseLocation(): Promise<string> {
     const location = await this.getValue(ConfigService.DB_LOCATION_KEY);
     return location || this.defaultDbPath;
   }
   
   async setDatabaseLocation(location: string): Promise<void> {
     const oldLocation = await this.getDatabaseLocation();
     const newLocation = location || this.defaultDbPath;
     
     await this.setValue(ConfigService.DB_LOCATION_KEY, newLocation);
     
     if (oldLocation && oldLocation !== newLocation) {
       try {
         await this.dbService.changeLocation(newLocation);
       } catch (error) {
         await this.setValue(ConfigService.DB_LOCATION_KEY, oldLocation);
         throw new Error(`数据库位置更改失败`);
       }
     }
   }
   ```

4. **服务容器初始化**
   ```typescript
   const container = ServiceContainer.getInstance();
   
   // 创建数据库服务
   const dbService = new SQLiteService();
   container.register("database", dbService);
   
   // 初始化数据库服务
   await dbService.initialize();
   
   // 创建并注册配置服务
   const configRepository = new ConfigRepository(dbService);
   const configService = new ConfigService(configRepository, dbService);
   container.register("config", configService);
   
   // 初始化配置服务
   await configService.initialize();
   ```

### 遇到的挑战

1. **服务依赖关系**：服务之间存在复杂的依赖关系，需要确保初始化顺序正确。解决方案是使用服务容器管理依赖，并确保在使用服务前完成初始化。

2. **路径格式问题**：在Windows系统上，路径分隔符与Unix系统不同，导致路径格式错误。解决方案是使用Tauri的`join`函数处理路径，确保跨平台兼容性。

3. **数据库初始化问题**：数据库表创建失败，原因是在数据库完全初始化前尝试创建表。解决方案是确保在调用`createTables`前设置`initialized = true`。

4. **UI组件与服务集成**：UI组件需要访问后端服务，但服务可能尚未初始化。解决方案是在组件中添加错误处理，优雅地处理服务不可用的情况。

### 下一步计划

1. 完成AI模型服务实现
2. 实现聊天服务
3. 更新应用初始化逻辑
4. 创建服务单元测试和集成测试
5. 清理旧代码，确保代码库的整洁和一致性

### 总结

本次开发完成了服务层架构重构的关键部分，包括服务接口定义、服务容器实现和配置服务实现。特别是实现了数据库位置管理功能，允许用户自定义数据库存储位置。通过解决路径格式和初始化顺序问题，确保了应用在不同平台上的稳定运行。
