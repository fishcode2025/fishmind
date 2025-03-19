# FishMind 应用布局设计

本文档描述了 FishMind 应用的布局设计方案和主题设计建议，作为开发团队的参考指南。

## 布局结构设计

### 1. 双栏式布局

FishMind 采用现代双栏式布局，这种布局特别适合功能丰富的桌面应用：

- **左侧导航栏**：固定宽度（200px），包含主要功能模块的导航项
- **中间内容区**：根据左侧选择显示不同的功能页面

这种布局能够提供清晰的导航结构，同时保持足够的内容显示空间。

### 2. 顶部应用栏

在布局顶部添加一个应用栏，包含：

- 应用标志和名称
- 全局搜索功能
- 用户设置/账户信息
- 主题切换按钮
- 其他全局操作按钮

### 3. 响应式设计考虑

- 在窗口变窄时，可以折叠左侧导航栏为图标模式
- 在非常窄的窗口下，可转为单栏布局，通过抽屉菜单访问导航

## 主题设计

### 1. 深色/浅色主题

实现完整的深色和浅色主题支持：

- 使用 MUI 的 ThemeProvider 和 createTheme 创建主题
- 设计符合品牌的主色调和强调色
- 确保所有组件在两种主题下都有良好的对比度

### 2. 主题切换机制

- 添加主题切换按钮在应用栏
- 支持跟随系统主题设置
- 使用 localStorage 保存用户主题偏好

### 3. 自定义主题选项

允许用户自定义某些主题元素：

- 主色调选择
- 字体大小调整
- 界面密度设置

## 具体组件设计

### 1. 左侧导航栏

- 使用 MUI 的 Drawer 组件实现
- 固定宽度为 200px
- 包含图标+文本的导航项
- 支持分组和嵌套导航
- 可折叠/展开的设计
- 导航项激活状态明显区分

#### 导航项目结构：

- 对话（主页）
- 助手管理
- 知识库
- 文件管理
- 翻译
- AI 绘画
- 小程序
- 设置

### 2. 内容区域

- 使用 MUI 的 Card、Paper 等组件构建内容区块
- 实现标签页系统，允许在同一区域切换不同内容
- 添加面包屑导航，帮助用户了解当前位置
- 内容区域顶部显示当前页面标题和操作按钮

### 3. 对话界面

- 类似聊天应用的消息气泡设计
- 清晰区分用户消息和 AI 回复
- 支持 Markdown 渲染和代码高亮
- 添加消息状态指示器（发送中、已发送等）
- 消息操作菜单（复制、编辑、删除等）

### 4. 设置界面

- 使用分类标签页组织不同类别的设置
- 提供搜索功能帮助用户快速找到特定设置
- 使用直观的表单控件（开关、滑块、下拉菜单等）

#### 设置页面布局结构

设置页面采用双栏式布局：

- **左侧设置导航**：与主应用的左侧导航无缝衔接，显示设置的各个分类，宽度为 200px
- **右侧设置内容**：根据左侧选择显示不同的设置项

设置页面的左侧导航包含以下分类：
- 模型服务
- 默认模型
- 网络搜索
- 常规设置
- 显示设置
- 快捷方式
- 快捷助手
- 数据设置
- 关于我们

##### 模型服务设置

模型服务设置页面采用双栏式布局：
- 左侧显示可用的模型服务列表，包含服务名称、图标和启用/禁用开关，宽度为 200px
- 右侧显示选中服务的详细配置，包括：
  - API 密钥设置
  - API 地址配置
  - 可用模型列表
  - 其他服务特定设置

##### 默认模型设置

默认模型设置页面包含以下内容：
- 默认助手模型选择
- 话题命名模型选择
- 翻译模型选择
- 其他特定功能的默认模型设置

#### 设置页面实现方案

设置页面的布局实现需要注意以下几点：
- 设置页面的左侧导航与主应用的左侧导航保持一致的视觉风格
- 设置页面的左侧导航与主应用的左侧导航无缝衔接，不留空隙
- 在主布局中为设置页面特别处理，移除内边距：
  ```jsx
  // 在 MainLayout 组件中
  const isSettingsPage = location.pathname === '/settings';
  
  // 主内容区域
  <Box component="main" sx={{ 
    flexGrow: 1, 
    p: isSettingsPage ? 0 : 3, // 设置页面不需要内边距
    // 其他样式...
  }}>
    <Toolbar /> {/* 占位符，防止内容被应用栏遮挡 */}
    <Outlet /> {/* 这里将渲染路由匹配的组件 */}
  </Box>
  ```

- 设置页面组件结构：
  ```jsx
  <Box sx={{ display: 'flex', height: '100%' }}>
    {/* 左侧设置导航 */}
    <Paper sx={{ 
      width: 200, 
      height: '100%', 
      overflow: 'auto', 
      borderRadius: 0,
      borderRight: (theme) => `1px solid ${theme.palette.divider}`,
      boxShadow: 'none' // 移除阴影
    }}>
      <List component="nav" sx={{ p: 1 }}>
        {/* 设置导航项 */}
        <ListItemButton 
          selected={selectedSetting === 'modelService'}
          onClick={() => handleSettingSelect('modelService')}
        >
          <ListItemIcon><CloudIcon /></ListItemIcon>
          <ListItemText primary="模型服务" />
        </ListItemButton>
        {/* 其他设置导航项 */}
      </List>
    </Paper>
    
    {/* 右侧设置内容 */}
    <Box sx={{ 
      flexGrow: 1, 
      p: 0, 
      overflow: 'auto',
      ml: 0 // 确保没有左边距
    }}>
      {/* 根据选中的设置项渲染不同的设置内容 */}
    </Box>
  </Box>
  ```

## 布局实现方案

### 主布局组件结构

```jsx
// 导航栏宽度
const drawerWidth = 200;

<ThemeProvider theme={currentTheme}>
  <CssBaseline />
  <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
    {/* 左侧导航栏 */}
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar>
        <Logo />
      </Toolbar>
      <Divider />
      <NavigationMenu />
    </Drawer>
    
    {/* 主内容区域 */}
    <Box component="main" sx={{ 
      flexGrow: 1, 
      p: 0, // 移除所有页面的内边距，确保内容与左侧导航无缝衔接
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* 顶部应用栏 */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            FishMind
          </Typography>
          <SearchBar />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* 占位符，防止内容被应用栏遮挡 */}
      
      {/* 页面内容 */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', height: 'calc(100vh - 64px)' }}>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/assistants" element={<AssistantsPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          {/* 其他路由 */}
        </Routes>
      </Box>
    </Box>
  </Box>
</ThemeProvider>
```

## 全局滚动处理

为了防止应用出现全局滚动条，我们采用了以下策略：

1. 在 App.tsx 中设置全局样式：
```jsx
<GlobalStyles 
  styles={{
    'html, body': {
      height: '100vh',
      width: '100vw',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    },
    '#root': {
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    },
    '*::-webkit-scrollbar': {
      width: '8px',
      height: '8px'
    },
    '*::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '4px'
    },
    '*::-webkit-scrollbar-track': {
      backgroundColor: 'transparent'
    }
  }}
/>
```

2. 在主布局中，将内容区域设置为固定高度并处理溢出：
```jsx
<Box component="main" sx={{ 
  flexGrow: 1, 
  height: '100vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  p: 0 // 移除所有页面的内边距，确保内容与左侧导航无缝衔接
}}>
  <Toolbar /> {/* 占位符，防止内容被应用栏遮挡 */}
  <Box sx={{ 
    flexGrow: 1, 
    overflow: 'auto', 
    height: 'calc(100vh - 64px)' // 减去顶部工具栏的高度
  }}>
    <Outlet /> {/* 这里将渲染路由匹配的组件 */}
  </Box>
</Box>
```

3. 在各个页面组件中，确保内容区域正确处理滚动，防止内容溢出导致全局滚动条出现。

## 响应式设计实现

使用 MUI 的断点系统实现响应式设计：

```jsx
// 左侧导航栏响应式
<Drawer
  variant={isSmallScreen ? 'temporary' : 'permanent'}
  open={drawerOpen}
  onClose={handleDrawerToggle}
>
  {/* 导航内容 */}
</Drawer>


```

## 主题实现方案

使用 MUI 的主题系统实现深色/浅色主题：

```jsx
// 浅色主题
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
});

// 深色主题
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

// 主题上下文
const ThemeContext = createContext({
  toggleTheme: () => {},
  theme: 'light',
});

// 主题提供者组件
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <MuiThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
```

## 下一步实现计划

1. 创建基础布局组件 (`MainLayout.tsx`)
2. 实现主题系统 (`ThemeContext.tsx` 和 `theme/index.ts`)
3. 开发导航组件 (`NavigationMenu.tsx`)
4. 实现应用栏组件 (`AppBar.tsx`)
5. 创建上下文面板组件 (`ContextPanel.tsx`)
6. 添加响应式设计逻辑 

## 布局更新说明

### 2023-03-01 更新

为了确保所有页面（包括聊天页面）与左侧导航栏无缝衔接，我们已将 MainLayout 中的主内容区域 padding 设置为 0：

```jsx
// 在 MainLayout 组件中
// 主内容区域
<Box component="main" sx={{ 
  flexGrow: 1, 
  p: 0, // 移除所有页面的内边距，确保内容与左侧导航无缝衔接
  width: { 
    xs: '100%',
    md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` 
  },
  height: '100vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
}}>
  <Toolbar /> {/* 占位符，防止内容被应用栏遮挡 */}
  <Box sx={{ 
    flexGrow: 1, 
    overflow: 'auto', 
    height: 'calc(100vh - 64px)' // 减去顶部工具栏的高度
  }}>
    <Outlet /> {/* 这里将渲染路由匹配的组件 */}
  </Box>
</Box>
```

这一更改确保了所有页面（包括聊天页面和设置页面）都能与左侧导航栏无缝衔接，不会出现额外的间距，从而提供更加一致和紧凑的用户界面体验。 