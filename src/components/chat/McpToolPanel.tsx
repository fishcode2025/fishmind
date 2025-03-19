import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  TextField,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useMcpTool } from "../../contexts/McpToolContext";
import { ToolInfo, PromptInfo } from "../../models/mcpTypes";
import { ResourceInfo } from "../../models/mcpToolTypes";

interface McpToolPanelProps {
  configId: string;
  onToolResult: (result: any) => void;
}

const McpToolPanel: React.FC<McpToolPanelProps> = ({
  configId,
  onToolResult,
}) => {
  // 使用MCP工具上下文
  const {
    availableTools,
    loadTools,
    callTool,
    refreshTools,
    availableResources,
    loadResources,
    readResource,
    refreshResources,
    availablePrompts,
    loadPrompts,
    getPrompt,
    refreshPrompts,
    isLoading,
    error,
  } = useMcpTool();

  // 状态
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceInfo | null>(
    null
  );
  const [selectedPrompt, setSelectedPrompt] = useState<PromptInfo | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);

  // 加载数据
  useEffect(() => {
    if (configId) {
      loadTools(configId);
      loadResources(configId);
      loadPrompts(configId);
    }
  }, [configId]);

  // 处理标签页切换
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    setSelectedTool(null);
    setSelectedResource(null);
    setSelectedPrompt(null);
    setParams({});
    setResult(null);
  };

  // 选择工具
  const handleSelectTool = (tool: ToolInfo) => {
    setSelectedTool(tool);
    setParams({});
    setResult(null);
  };

  // 选择资源
  const handleSelectResource = (resource: ResourceInfo) => {
    setSelectedResource(resource);
    setParams({});
    setResult(null);
  };

  // 选择提示
  const handleSelectPrompt = (prompt: PromptInfo) => {
    setSelectedPrompt(prompt);
    setParams({});
    setResult(null);
  };

  // 更新参数
  const handleParamChange = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 调用工具
  const handleCallTool = async () => {
    if (!selectedTool) return;

    try {
      const toolResult = await callTool(configId, selectedTool.name, params);
      setResult(toolResult);
      onToolResult(toolResult);
    } catch (err) {
      console.error("工具调用失败:", err);
    }
  };

  // 读取资源
  const handleReadResource = async () => {
    if (!selectedResource) return;

    try {
      const resourceContent = await readResource(
        configId,
        selectedResource.uri
      );
      setResult(resourceContent);
      onToolResult(resourceContent);
    } catch (err) {
      console.error("资源读取失败:", err);
    }
  };

  // 获取提示
  const handleGetPrompt = async () => {
    if (!selectedPrompt) return;

    try {
      const promptContent = await getPrompt(
        configId,
        selectedPrompt.name,
        params
      );
      setResult(promptContent);
      onToolResult(promptContent);
    } catch (err) {
      console.error("提示获取失败:", err);
    }
  };

  // 刷新数据
  const handleRefresh = async () => {
    if (!configId) return;

    if (tabIndex === 0) {
      await refreshTools(configId);
    } else if (tabIndex === 1) {
      await refreshResources(configId);
    } else if (tabIndex === 2) {
      await refreshPrompts(configId);
    }
  };

  // 渲染参数输入表单
  const renderParamsForm = () => {
    let schema: any = null;

    if (tabIndex === 0 && selectedTool?.parameters_schema) {
      schema = selectedTool.parameters_schema;
    } else if (tabIndex === 2 && selectedPrompt?.parameters_schema) {
      schema = selectedPrompt.parameters_schema;
    }

    if (!schema) return null;

    const properties = schema.properties || {};

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1">参数</Typography>
        {Object.entries(properties).map(([key, prop]: [string, any]) => (
          <TextField
            key={key}
            label={prop.title || key}
            helperText={prop.description || ""}
            fullWidth
            margin="normal"
            value={params[key] || ""}
            onChange={(e) => handleParamChange(key, e.target.value)}
            type={prop.type === "number" ? "number" : "text"}
          />
        ))}
        <Button
          variant="contained"
          onClick={
            tabIndex === 0
              ? handleCallTool
              : tabIndex === 1
              ? handleReadResource
              : handleGetPrompt
          }
          disabled={isLoading}
          sx={{ mt: 2 }}
        >
          {isLoading ? (
            <CircularProgress size={24} />
          ) : tabIndex === 0 ? (
            "调用工具"
          ) : tabIndex === 1 ? (
            "读取资源"
          ) : (
            "获取提示"
          )}
        </Button>
      </Box>
    );
  };

  // 渲染结果
  const renderResult = () => {
    if (!result) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1">结果</Typography>
        <Paper
          sx={{
            p: 2,
            bgcolor: "background.paper",
            borderRadius: 1,
            maxHeight: "200px",
            overflow: "auto",
          }}
        >
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </Paper>
      </Box>
    );
  };

  // 渲染工具列表
  const renderToolsList = () => {
    const tools = availableTools[configId] || [];

    return (
      <List dense>
        {tools.length === 0 ? (
          <ListItem>
            <ListItemText primary="没有可用的工具" />
          </ListItem>
        ) : (
          tools.map((tool) => (
            <ListItem key={tool.name} disablePadding>
              <ListItemButton
                selected={selectedTool?.name === tool.name}
                onClick={() => handleSelectTool(tool)}
              >
                <ListItemText
                  primary={tool.name}
                  secondary={tool.description}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    );
  };

  // 渲染资源列表
  const renderResourcesList = () => {
    const resources = availableResources[configId] || [];

    return (
      <List dense>
        {resources.length === 0 ? (
          <ListItem>
            <ListItemText primary="没有可用的资源" />
          </ListItem>
        ) : (
          resources.map((resource) => (
            <ListItem key={resource.uri} disablePadding>
              <ListItemButton
                selected={selectedResource?.uri === resource.uri}
                onClick={() => handleSelectResource(resource)}
              >
                <ListItemText
                  primary={resource.uri}
                  secondary={resource.description}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    );
  };

  // 渲染提示列表
  const renderPromptsList = () => {
    const prompts = availablePrompts[configId] || [];

    return (
      <List dense>
        {prompts.length === 0 ? (
          <ListItem>
            <ListItemText primary="没有可用的提示" />
          </ListItem>
        ) : (
          prompts.map((prompt) => (
            <ListItem key={prompt.name} disablePadding>
              <ListItemButton
                selected={selectedPrompt?.name === prompt.name}
                onClick={() => handleSelectPrompt(prompt)}
              >
                <ListItemText
                  primary={prompt.name}
                  secondary={prompt.description}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>MCP 工具</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Box
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              mb: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Tabs value={tabIndex} onChange={handleTabChange}>
              <Tab label="工具" />
              <Tab label="资源" />
              <Tab label="提示" />
            </Tabs>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="刷新">
              <IconButton onClick={handleRefresh} disabled={isLoading}>
                {isLoading ? <CircularProgress size={24} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          <Box display="flex">
            <Box
              sx={{
                width: "30%",
                borderRight: "1px solid",
                borderColor: "divider",
                pr: 2,
              }}
            >
              <Typography variant="subtitle1">
                {tabIndex === 0
                  ? "可用工具"
                  : tabIndex === 1
                  ? "可用资源"
                  : "可用提示"}
              </Typography>
              {isLoading && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <CircularProgress size={24} />
                </Box>
              )}
              {tabIndex === 0
                ? renderToolsList()
                : tabIndex === 1
                ? renderResourcesList()
                : renderPromptsList()}
            </Box>

            <Box sx={{ width: "70%", pl: 2 }}>
              {tabIndex === 0 && selectedTool && (
                <Box>
                  <Typography variant="h6">{selectedTool.name}</Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {selectedTool.description}
                  </Typography>
                  {renderParamsForm()}
                </Box>
              )}

              {tabIndex === 1 && selectedResource && (
                <Box>
                  <Typography variant="h6">{selectedResource.uri}</Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {selectedResource.description}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    类型: {selectedResource.content_type}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleReadResource}
                    disabled={isLoading}
                    sx={{ mt: 1 }}
                  >
                    {isLoading ? <CircularProgress size={24} /> : "读取资源"}
                  </Button>
                </Box>
              )}

              {tabIndex === 2 && selectedPrompt && (
                <Box>
                  <Typography variant="h6">{selectedPrompt.name}</Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {selectedPrompt.description}
                  </Typography>
                  {renderParamsForm()}
                </Box>
              )}

              {renderResult()}
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default McpToolPanel;
