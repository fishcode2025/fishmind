import React, { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Badge,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import LanguageIcon from "@mui/icons-material/Language";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import BuildIcon from "@mui/icons-material/Build";
import ModelSelector from "../models/ModelSelector";
import { AiModel, AiModelProvider } from "../../../models/chat";
import { ToolInfo } from "../../../models/mcpToolTypes";
import { useMcpTool } from "../../../contexts/McpToolContext";

interface InputToolbarProps {
  onToolAction?: (action: string) => void;
  disabled?: boolean;
  selectedAssistant?: { provider: AiModelProvider; model: AiModel } | null;
  onMcpToolCall?: (
    configId: string,
    toolName: string,
    params: Record<string, any>
  ) => Promise<any>;
  currentTopicId?: string;
}

const InputToolbar: React.FC<InputToolbarProps> = ({
  onToolAction,
  disabled = false,
  selectedAssistant = null,
  onMcpToolCall,
  currentTopicId,
}) => {
  // MCP工具相关状态
  const [mcpAnchorEl, setMcpAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [selectedTools, setSelectedTools] = useState<ToolInfo[]>([]);

  // 获取MCP工具上下文
  const { availableTools, loadTools, callTool, isLoading } = useMcpTool();

  // 加载所有可用的MCP工具
  useEffect(() => {
    const loadAllTools = async () => {
      // 获取所有配置的工具
      const configIds = Object.keys(availableTools);
      console.log(`当前可用工具配置数量: ${configIds.length}`);

      // 如果没有工具，尝试加载
      if (configIds.length === 0) {
        console.log("没有可用工具配置，尝试加载...");
        // 这里可以添加加载逻辑，但通常在McpToolProvider初始化时已经加载了
      } else {
        console.log(`可用工具配置: ${configIds.join(", ")}`);
        configIds.forEach((id) => {
          const tools = availableTools[id] || [];
          console.log(`配置 ${id} 有 ${tools.length} 个工具`);
          tools.forEach((tool) => {
            console.log(`- 工具: ${tool.name}, 描述: ${tool.description}`);
          });
        });
      }

      // 如果有配置，默认选择第一个
      if (configIds.length > 0 && !selectedConfigId) {
        console.log(`默认选择第一个配置: ${configIds[0]}`);
        setSelectedConfigId(configIds[0]);
        setSelectedTools(availableTools[configIds[0]] || []);
      }
    };

    loadAllTools();
  }, [availableTools, selectedConfigId]);

  // 处理MCP工具菜单打开
  const handleMcpMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    console.log("打开MCP工具菜单");
    setMcpAnchorEl(event.currentTarget);
  };

  // 处理MCP工具菜单关闭
  const handleMcpMenuClose = () => {
    console.log("关闭MCP工具菜单");
    setMcpAnchorEl(null);
  };

  // 处理MCP工具选择
  const handleMcpToolSelect = async (configId: string, toolName: string) => {
    console.log(`选择MCP工具: ${toolName}, 配置ID: ${configId}`);
    handleMcpMenuClose();

    // 这里可以添加参数收集逻辑，例如弹出对话框让用户输入参数
    // 简化版本：假设工具不需要参数
    try {
      if (onMcpToolCall) {
        console.log(`通过回调调用工具: ${toolName}, 配置ID: ${configId}`);
        const result = await onMcpToolCall(configId, toolName, {});
        console.log(`工具调用结果:`, result);
      } else {
        // 如果没有提供回调，直接调用工具
        console.log(`直接调用工具: ${toolName}, 配置ID: ${configId}`);
        const result = await callTool(configId, toolName, {});
        console.log(`工具调用结果:`, result);
        // 这里可以添加结果处理逻辑
      }
    } catch (error) {
      console.error(`工具调用失败: ${toolName}, 配置ID: ${configId}`, error);
    }
  };

  const handleToolClick = (action: string) => {
    console.log(`点击工具按钮: ${action}`);
    if (onToolAction) {
      onToolAction(action);
    }
  };

  // 计算可用工具数量
  const toolCount = Object.values(availableTools).reduce(
    (count, tools) => count + tools.length,
    0
  );
  // console.log(`可用工具总数: ${toolCount}`);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        borderTop: "1px solid rgba(0, 0, 0, 0.1)",
        mb: 1,
      }}
    >
      <IconButton
        size="small"
        onClick={() => handleToolClick("edit")}
        disabled={disabled}
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handleToolClick("mention")}
        disabled={disabled}
      >
        @
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handleToolClick("web")}
        disabled={disabled}
      >
        <LanguageIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handleToolClick("tree")}
        disabled={disabled}
      >
        <AccountTreeIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handleToolClick("file")}
        disabled={disabled}
      >
        <InsertDriveFileIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handleToolClick("attach")}
        disabled={disabled}
      >
        <AttachFileIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handleToolClick("format")}
        disabled={disabled}
      >
        <FormatAlignCenterIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handleToolClick("fullscreen")}
        disabled={disabled}
      >
        <FullscreenIcon fontSize="small" />
      </IconButton>

      {/* MCP工具按钮 */}
      <Tooltip title="MCP工具">
        <IconButton
          size="small"
          onClick={handleMcpMenuOpen}
          disabled={disabled || isLoading}
          color={mcpAnchorEl ? "primary" : "default"}
        >
          <Badge
            badgeContent={toolCount}
            color="primary"
            invisible={toolCount === 0}
          >
            <BuildIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* MCP工具菜单 */}
      <Menu
        anchorEl={mcpAnchorEl}
        open={Boolean(mcpAnchorEl)}
        onClose={handleMcpMenuClose}
      >
        {Object.entries(availableTools).map(([configId, tools]) => (
          <div key={configId}>
            {tools.map((tool: ToolInfo) => (
              <MenuItem
                key={`${configId}-${tool.name}`}
                onClick={() => handleMcpToolSelect(configId, tool.name)}
              >
                <ListItemIcon>
                  <BuildIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={tool.name}
                  secondary={tool.description || "无描述"}
                />
              </MenuItem>
            ))}
          </div>
        ))}
        {Object.keys(availableTools).length === 0 && (
          <MenuItem disabled>
            <ListItemText primary="没有可用的工具" />
          </MenuItem>
        )}
      </Menu>

      {/* 模型选择器 - 放在最右侧 */}
      <ModelSelector
        selectedAssistant={selectedAssistant}
        currentTopicId={currentTopicId}
      />
    </Box>
  );
};

export default InputToolbar;
