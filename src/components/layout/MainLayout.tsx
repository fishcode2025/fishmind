import React, { useState } from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, Divider, IconButton, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Outlet, useLocation } from 'react-router-dom';
import NavigationMenu from './NavigationMenu';

// 导航栏宽度
const drawerWidth = 200;

interface MainLayoutProps {
  toggleTheme: () => void;
  themeMode: 'light' | 'dark';
}

const MainLayout: React.FC<MainLayoutProps> = ({ toggleTheme, themeMode }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  
  // 检查当前是否在设置页面
  const isSettingsPage = location.pathname === '/settings';
  
  // 导航抽屉的开关状态
  const [drawerOpen, setDrawerOpen] = useState(!isSmallScreen);

  // 处理导航抽屉的开关
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      
      {/* 顶部应用栏 */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            FishMind
          </Typography>
          
          {/* 搜索按钮 */}
          <IconButton color="inherit">
            <SearchIcon />
          </IconButton>
          
          {/* 主题切换按钮 */}
          <IconButton color="inherit" onClick={toggleTheme}>
            {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          
          {/* 用户菜单按钮 */}
          <IconButton color="inherit">
            <AccountCircleIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* 左侧导航抽屉 */}
      <Drawer
        variant={isSmallScreen ? "temporary" : "permanent"}
        open={drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Toolbar />
        <Divider />
        <NavigationMenu />
      </Drawer>
      
      {/* 主内容区域 */}
      <Box component="main" sx={{ 
        flexGrow: 1, 
        // p: isSettingsPage ? 0 : 3, // 设置页面不需要内边距
        p:0,
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
    </Box>
  );
};

export default MainLayout; 