import React from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import BookIcon from '@mui/icons-material/Book';
import FolderIcon from '@mui/icons-material/Folder';
import TranslateIcon from '@mui/icons-material/Translate';
import BrushIcon from '@mui/icons-material/Brush';
import AppsIcon from '@mui/icons-material/Apps';
import SettingsIcon from '@mui/icons-material/Settings';
import BugReportIcon from '@mui/icons-material/BugReport';

// 导航菜单项定义
const menuItems = [
  { text: '对话', icon: <ChatIcon />, path: '/' },
  { text: '助手', icon: <PeopleIcon />, path: '/assistants' },
  // { text: '知识库', icon: <BookIcon />, path: '/knowledge' },
  // { text: '文件管理', icon: <FolderIcon />, path: '/files' },
  // { text: '翻译', icon: <TranslateIcon />, path: '/translation' },
  // { text: 'AI绘画', icon: <BrushIcon />, path: '/drawing' },
  // { text: '小程序', icon: <AppsIcon />, path: '/apps' },
];

const NavigationMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 处理导航项点击
  const handleNavItemClick = (path: string) => {
    navigate(path);
  };
  
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      {/* 主要功能导航项 */}
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton 
              selected={location.pathname === item.path}
              onClick={() => handleNavItemClick(item.path)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      {/* 底部固定菜单项 */}
      <List>
        <Divider />
        {/* 设置导航项 */}
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/settings'}
            onClick={() => handleNavItemClick('/settings')}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="设置" />
          </ListItemButton>
        </ListItem>
        
        {/* 测试页面导航项 - 仅在开发环境显示 */}
        {import.meta.env.DEV && (
          <ListItem disablePadding>
            <ListItemButton 
              selected={location.pathname === '/test'}
              onClick={() => handleNavItemClick('/test')}
            >
              <ListItemIcon>
                <BugReportIcon />
              </ListItemIcon>
              <ListItemText primary="测试" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );
};

export default NavigationMenu; 