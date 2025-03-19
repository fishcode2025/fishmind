import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  TextField,
  Divider,
  Grid,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  styled,
  ListItemButton,
  Avatar,
  useTheme,
  SelectChangeEvent,
} from "@mui/material";
import CloudIcon from "@mui/icons-material/Cloud";
import CubeIcon from "@mui/icons-material/ViewInAr";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import DisplaySettingsIcon from "@mui/icons-material/DisplaySettings";
import SpeedIcon from "@mui/icons-material/Speed";
import ExtensionIcon from "@mui/icons-material/Extension";
import StorageIcon from "@mui/icons-material/Storage";
import InfoIcon from "@mui/icons-material/Info";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AddIcon from "@mui/icons-material/Add";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import TranslateIcon from "@mui/icons-material/Translate";
import TitleIcon from "@mui/icons-material/Title";
import CodeIcon from "@mui/icons-material/Code";
import { Theme } from "@mui/material/styles";
import { getProviderLogo } from "../config/providers";
import { ConfigService } from "../services/system/ConfigService";
import { McpServerConfig, TransportType } from "../models/mcpTypes";

// 自定义样式组件
const StyledListItem = styled(ListItemButton)(({ theme }) => ({
  borderRadius: 8,
  marginBottom: 4,
  "&.Mui-selected": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.04)",
    "&:hover": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.12)"
          : "rgba(0, 0, 0, 0.08)",
    },
  },
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.04)",
  },
}));

const ModelCard = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(2),
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  marginBottom: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
}));

// 模型服务项组件
interface ModelServiceItemProps {
  name: string;
  icon?: string;
  providerId?: string;
  enabled: boolean;
  onToggle: () => void;
  onClick: () => void;
}

const ModelServiceItem: React.FC<ModelServiceItemProps> = ({
  name,
  icon,
  providerId,
  enabled,
  onToggle,
  onClick,
}) => {
  // 获取供应商图标
  const providerLogo = providerId ? getProviderLogo(providerId) : undefined;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: 1,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Box sx={{ mr: 2 }}>
        {icon ? (
          <img src={icon} alt={name} style={{ width: 24, height: 24 }} />
        ) : providerLogo ? (
          <Avatar
            src={providerLogo}
            alt={name}
            sx={{ width: 24, height: 24 }}
          />
        ) : (
          <CloudIcon />
        )}
      </Box>
      <Typography sx={{ flexGrow: 1 }}>{name}</Typography>
      <Switch
        checked={enabled}
        onChange={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        color="primary"
      />
    </Box>
  );
};

// 模型项组件
interface ModelItemProps {
  name: string;
  icon: React.ReactNode;
  onRemove: () => void;
  onSettings: () => void;
}

const ModelItem: React.FC<ModelItemProps> = ({
  name,
  icon,
  onRemove,
  onSettings,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: 1,
        borderRadius: 2,
        mb: 1,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ mr: 2 }}>{icon}</Box>
      <Typography sx={{ flexGrow: 1 }}>{name}</Typography>
      <IconButton onClick={onSettings} size="small">
        <SettingsSuggestIcon fontSize="small" />
      </IconButton>
      <IconButton onClick={onRemove} size="small" color="error">
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "error.main",
            color: "white",
          }}
        >
          -
        </Box>
      </IconButton>
    </Box>
  );
};

// 导入我们创建的模型服务组件
import { ModelServiceManager } from "../services/modelService";
import { ProviderConfigPanel } from "../components/settings/modelService/ProviderConfigPanel";
import ModelServiceSettings from "../components/settings/ModelServiceSettings";
import DefaultModelSettings from "../components/settings/DefaultModelSettings";

// 主题设置组件
const ThemeSettings: React.FC = () => {
  const theme = useTheme();
  const configService = ConfigService.getInstance();
  const [currentTheme, setCurrentTheme] = useState(
    configService.getUserSettings().ui.theme
  );

  const handleThemeChange = async (event: SelectChangeEvent<string>) => {
    const newTheme = event.target.value as "light" | "dark" | "system";
    setCurrentTheme(newTheme);
    await configService.updateUserSettings({
      ui: {
        ...configService.getUserSettings().ui,
        theme: newTheme,
      },
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        主题设置
      </Typography>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <Select value={currentTheme} onChange={handleThemeChange}>
          <MenuItem value="light">浅色主题</MenuItem>
          <MenuItem value="dark">深色主题</MenuItem>
          <MenuItem value="system">跟随系统</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

// 语言设置组件
const LanguageSettings: React.FC = () => {
  const configService = ConfigService.getInstance();
  const [currentLanguage, setCurrentLanguage] = useState(
    configService.getUserSettings().ui.language
  );

  const handleLanguageChange = async (event: SelectChangeEvent<string>) => {
    const newLanguage = event.target.value;
    setCurrentLanguage(newLanguage);
    await configService.updateUserSettings({
      ui: {
        ...configService.getUserSettings().ui,
        language: newLanguage,
      },
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        语言设置
      </Typography>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <Select value={currentLanguage} onChange={handleLanguageChange}>
          <MenuItem value="zh-CN">简体中文</MenuItem>
          <MenuItem value="en-US">English</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

// MCP设置组件
const McpSettings: React.FC = () => {
  const [configs, setConfigs] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载MCP配置
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        setLoading(true);
        // 这里应该从服务中获取配置
        // 示例: const result = await mcpConfigService.getAllConfigs();
        // setConfigs(result);

        // 模拟数据
        setConfigs([
          {
            id: "1",
            name: "SSE服务器",
            transportType: TransportType.SSE,
            sseUrl: "http://localhost:8080/events",
            timeoutSecs: 30,
            clientName: "FishMind",
            enabled: true,
            clientVersion: "1.0.0",
          },
          {
            id: "2",
            name: "本地命令行",
            transportType: TransportType.Stdio,
            command: "node",
            args: ["server.js"],
            timeoutSecs: 60,
            clientName: "FishMind",
            clientVersion: "1.0.0",
            enabled: true,
          },
        ]);
      } catch (error) {
        console.error("加载MCP配置失败:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConfigs();
  }, []);

  // 处理添加配置
  const handleAddConfig = () => {
    // 打开添加配置对话框
    console.log("添加新配置");
  };

  // 处理编辑配置
  const handleEditConfig = (config: McpServerConfig) => {
    console.log("编辑配置:", config);
  };

  // 处理删除配置
  const handleDeleteConfig = (id: string) => {
    console.log("删除配置:", id);
    setConfigs(configs.filter((config) => config.id !== id));
  };

  // 渲染配置项
  const renderConfigItem = (config: McpServerConfig) => {
    return (
      <Paper key={config.id} sx={{ p: 2, mb: 2, position: "relative" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", flexGrow: 1 }}
          >
            {config.name}
          </Typography>
          <Box>
            <IconButton size="small" onClick={() => handleEditConfig(config)}>
              <SettingsIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteConfig(config.id)}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "error.main",
                  color: "white",
                }}
              >
                -
              </Box>
            </IconButton>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          传输类型: {config.transportType}
        </Typography>

        {config.transportType === TransportType.SSE && (
          <Typography variant="body2" color="text.secondary">
            SSE URL: {config.sseUrl}
          </Typography>
        )}

        {config.transportType === TransportType.Stdio && (
          <Typography variant="body2" color="text.secondary">
            命令: {config.command} {config.args?.join(" ")}
          </Typography>
        )}

        <Typography variant="body2" color="text.secondary">
          超时: {config.timeoutSecs}秒
        </Typography>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        MCP设置
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        管理MCP服务器配置
      </Typography>

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ mb: 2 }}
          onClick={handleAddConfig}
        >
          添加新配置
        </Button>

        {loading ? (
          <Typography>加载中...</Typography>
        ) : configs.length > 0 ? (
          <Box>{configs.map(renderConfigItem)}</Box>
        ) : (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              现有配置
            </Typography>
            <Typography variant="body2" color="text.secondary">
              暂无配置，请点击上方按钮添加
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

// 设置页面组件
const SettingsPage: React.FC = () => {
  // 当前选中的设置项
  const [selectedSetting, setSelectedSetting] = useState("modelService");

  // 处理设置项选择
  const handleSettingSelect = (setting: string) => {
    setSelectedSetting(setting);
  };

  // 渲染设置内容
  const renderSettingContent = () => {
    switch (selectedSetting) {
      case "modelService":
        return <ModelServiceSettings />;
      case "defaultModel":
        return <DefaultModelSettings />;
      case "theme":
        return <ThemeSettings />;
      case "language":
        return <LanguageSettings />;
      case "mcp":
        return <McpSettings />;
      case "webSearch":
        return (
          <Box sx={{ p: 3 }}>
            <Typography>网络搜索设置未实现</Typography>
          </Box>
        );
      case "general":
        return (
          <Box sx={{ p: 3 }}>
            <Typography>常规设置未实现</Typography>
          </Box>
        );
      case "display":
        return (
          <Box sx={{ p: 3 }}>
            <Typography>显示设置未实现</Typography>
          </Box>
        );
      case "shortcut":
        return (
          <Box sx={{ p: 3 }}>
            <Typography>快捷方式未实现</Typography>
          </Box>
        );
      case "assistant":
        return (
          <Box sx={{ p: 3 }}>
            <Typography>快捷助手未实现</Typography>
          </Box>
        );
      case "data":
        return (
          <Box sx={{ p: 3 }}>
            <Typography>数据设置未实现</Typography>
          </Box>
        );
      case "about":
        return (
          <Box sx={{ p: 3 }}>
            <Typography>关于我们未实现</Typography>
          </Box>
        );
      default:
        return (
          <Box sx={{ p: 3 }}>
            <Typography>设置内容未实现</Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ display: "flex", height: "100%" }}>
      {/* 左侧设置导航 */}
      <Paper
        sx={{
          width: 200,
          height: "100%",
          overflow: "auto",
          borderRadius: 0,
          borderRight: (theme: Theme) => `1px solid ${theme.palette.divider}`,
          boxShadow: "none", // 移除阴影
        }}
      >
        <List component="nav" sx={{ p: 1 }}>
          <StyledListItem
            selected={selectedSetting === "modelService"}
            onClick={() => handleSettingSelect("modelService")}
          >
            <ListItemIcon>
              <CloudIcon />
            </ListItemIcon>
            <ListItemText primary="模型服务" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "defaultModel"}
            onClick={() => handleSettingSelect("defaultModel")}
          >
            <ListItemIcon>
              <CubeIcon />
            </ListItemIcon>
            <ListItemText primary="默认模型" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "mcp"}
            onClick={() => handleSettingSelect("mcp")}
          >
            <ListItemIcon>
              <CodeIcon />
            </ListItemIcon>
            <ListItemText primary="MCP" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "theme"}
            onClick={() => handleSettingSelect("theme")}
          >
            <ListItemIcon>
              <DisplaySettingsIcon />
            </ListItemIcon>
            <ListItemText primary="主题设置" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "language"}
            onClick={() => handleSettingSelect("language")}
          >
            <ListItemIcon>
              <TranslateIcon />
            </ListItemIcon>
            <ListItemText primary="语言设置" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "webSearch"}
            onClick={() => handleSettingSelect("webSearch")}
          >
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            <ListItemText primary="网络搜索" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "general"}
            onClick={() => handleSettingSelect("general")}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="常规设置" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "display"}
            onClick={() => handleSettingSelect("display")}
          >
            <ListItemIcon>
              <DisplaySettingsIcon />
            </ListItemIcon>
            <ListItemText primary="显示设置" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "shortcut"}
            onClick={() => handleSettingSelect("shortcut")}
          >
            <ListItemIcon>
              <SpeedIcon />
            </ListItemIcon>
            <ListItemText primary="快捷方式" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "assistant"}
            onClick={() => handleSettingSelect("assistant")}
          >
            <ListItemIcon>
              <ExtensionIcon />
            </ListItemIcon>
            <ListItemText primary="快捷助手" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "data"}
            onClick={() => handleSettingSelect("data")}
          >
            <ListItemIcon>
              <StorageIcon />
            </ListItemIcon>
            <ListItemText primary="数据设置" />
          </StyledListItem>

          <StyledListItem
            selected={selectedSetting === "about"}
            onClick={() => handleSettingSelect("about")}
          >
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="关于我们" />
          </StyledListItem>
        </List>
      </Paper>

      {/* 右侧设置内容 */}
      <Box
        sx={{
          flexGrow: 1,
          p: 0,
          overflow: "auto",
          ml: 0, // 确保没有左边距
          display: "flex",
          flexDirection: "column",
        }}
      >
        {renderSettingContent()}
      </Box>
    </Box>
  );
};

export default SettingsPage;
