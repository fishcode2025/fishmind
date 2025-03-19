import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Grid,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SystemSettings from "./SystemSettings";
import AiModelSettings from "./AiModelSettings";
import McpSettings from "./mcp/McpSettings";

// 设置页面类型
type SettingTab = "system" | "aimodel" | "mcp" | "appearance" | "account" | "advanced";

const SettingsLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<SettingTab>("system");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: SettingTab
  ) => {
    setCurrentTab(newValue);
  };

  // 渲染当前选中的设置页面
  const renderSettingsContent = () => {
    switch (currentTab) {
      case "system":
        return <SystemSettings />;
      case "aimodel":
        return <AiModelSettings />;
      case "mcp":
        return <McpSettings />;
      case "appearance":
        return <Box>外观设置（待实现）</Box>;
      case "account":
        return <Box>账户设置（待实现）</Box>;
      case "advanced":
        return <Box>高级设置（待实现）</Box>;
      default:
        return <SystemSettings />;
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {/* 设置导航 */}
      <Paper
        elevation={1}
        sx={{
          p: 1,
          width: "100%",
          borderRadius: 0,
          position: "sticky",
          top: 0,
          zIndex: 1100,
          backgroundColor: "background.paper",
        }}
      >
        <Tabs
          orientation="horizontal"
          variant="scrollable"
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            alignItems: "flex-start",
            minHeight: 40,
          }}
        >
          <Tab label="系统" value="system" />
          <Tab label="模型" value="aimodel" />
          <Tab label="MCP" value="mcp" />
          <Tab label="外观" value="appearance" />
          <Tab label="账户" value="account" />
          <Tab label="高级" value="advanced" />
        </Tabs>
      </Paper>

      {/* 设置内容 */}
      <Paper
        elevation={1}
        sx={{ flex: 1, borderRadius: 0, overflow: "hidden" }}
      >
        {renderSettingsContent()}
      </Paper>
    </Box>
  );
};

export default SettingsLayout;
