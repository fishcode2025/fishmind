import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

// 创建浅色主题
const createLightTheme = () => createTheme({
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

// 创建深色主题
const createDarkTheme = () => createTheme({
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

// 主题上下文类型
type ThemeContextType = {
  toggleTheme: () => void;
  themeMode: PaletteMode;
};

// 创建主题上下文
const ThemeContext = createContext<ThemeContextType>({
  toggleTheme: () => {},
  themeMode: 'light',
});

// 主题提供者组件属性
interface ThemeProviderProps {
  children: ReactNode;
}

// 主题提供者组件
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 从本地存储获取主题模式，默认为浅色
  const [themeMode, setThemeMode] = useState<PaletteMode>('light');
  
  // 根据主题模式创建主题
  const theme = themeMode === 'light' ? createLightTheme() : createDarkTheme();
  
  // 切换主题模式
  const toggleTheme = () => {
    const newThemeMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newThemeMode);
    localStorage.setItem('themeMode', newThemeMode);
  };
  
  // 初始化时从本地存储加载主题模式
  useEffect(() => {
    const savedThemeMode = localStorage.getItem('themeMode') as PaletteMode | null;
    if (savedThemeMode) {
      setThemeMode(savedThemeMode);
    } else {
      // 如果没有保存的主题模式，尝试使用系统偏好
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeMode(prefersDarkMode ? 'dark' : 'light');
    }
  }, []);
  
  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// 自定义钩子，用于在组件中访问主题上下文
export const useThemeContext = () => useContext(ThemeContext); 