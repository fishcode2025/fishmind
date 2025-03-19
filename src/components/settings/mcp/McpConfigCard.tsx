import { Theme, alpha } from "@mui/material/styles";
import {
  McpServerConfig,
  ClientStatusResponse,
  TransportType,
  ClientStatus,
  ResourceInfo,
  ToolInfo,
} from "../../../models/mcpTypes";
import {
  Card,
  Box,
  Typography,
  Chip,
  IconButton,
  Switch,
  Tooltip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  CardHeader,
  CardContent,
  CardActions,
  Grid,
  FormControlLabel,
  Alert,
  Paper,
  Divider,
  Avatar,
  Badge,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import CodeIcon from "@mui/icons-material/Code";
import ListIcon from "@mui/icons-material/List";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import DescriptionIcon from "@mui/icons-material/Description";
import BuildIcon from "@mui/icons-material/Build";
import RepairIcon from "@mui/icons-material/BuildCircle";
import StorageIcon from "@mui/icons-material/Storage";
import DnsIcon from "@mui/icons-material/Dns";
import HttpIcon from "@mui/icons-material/Http";
import TerminalIcon from "@mui/icons-material/Terminal";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface McpConfigCardProps {
  config: McpServerConfig;
  status?: ClientStatusResponse;
  onEdit: (config: McpServerConfig) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onToggle: (id: string) => void;
  onRepair?: (id: string) => void;
  onDisconnect?: (id: string) => void;
}

// 添加缺失的辅助函数
const getStatusText = (status?: ClientStatus) => {
  switch (status) {
    case ClientStatus.Connected:
      return "已连接";
    case ClientStatus.Disconnected:
      return "未连接";
    case ClientStatus.Error:
      return "错误";
    case ClientStatus.Connecting:
      return "正在连接";
    default:
      return "未知";
  }
};

// 添加状态指示器组件
const StatusIndicator = ({
  status,
  size = 10,
}: {
  status?: ClientStatus;
  size?: number;
}) => {
  let color = "grey";
  let pulseAnimation = false;

  switch (status) {
    case ClientStatus.Connected:
      color = "#4caf50";
      break;
    case ClientStatus.Error:
      color = "#f44336";
      break;
    case ClientStatus.Connecting:
      color = "#ff9800";
      pulseAnimation = true;
      break;
    default:
      color = "#9e9e9e";
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 0 rgba(${color}, 0.4)`,
        animation: pulseAnimation ? "pulse 2s infinite" : "none",
        "@keyframes pulse": {
          "0%": {
            boxShadow: `0 0 0 0 ${alpha(color, 0.7)}`,
          },
          "70%": {
            boxShadow: `0 0 0 10px ${alpha(color, 0)}`,
          },
          "100%": {
            boxShadow: `0 0 0 0 ${alpha(color, 0)}`,
          },
        },
      }}
    />
  );
};

// 获取传输类型图标
const getTransportIcon = (type: TransportType) => {
  switch (type) {
    case TransportType.SSE:
      return <HttpIcon />;
    case TransportType.Stdio:
      return <TerminalIcon />;
    default:
      return <DnsIcon />;
  }
};

const McpConfigCard = ({
  config,
  status,
  onEdit,
  onDelete,
  onRefresh,
  onToggle,
  onRepair,
  onDisconnect,
}: McpConfigCardProps) => {
  const theme = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected =
    config.enabled && status?.status === ClientStatus.Connected;
  const isError = config.enabled && status?.status === ClientStatus.Error;
  const isDisconnected = status?.status === ClientStatus.Disconnected;
  const isConnecting = status?.status === ClientStatus.Connecting;

  // 组件挂载或连接状态变化时自动加载工具和资源
  useEffect(() => {
    if (isConnected) {
      // 自动加载工具和资源
      loadTools();
      loadResources();
    }
  }, [isConnected, config.id]);

  // 处理标签切换
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // 如果切换到工具标签且尚未加载工具，则加载工具
    if (newValue === 0 && tools.length === 0) {
      loadTools();
    }

    // 如果切换到资源标签且尚未加载资源，则加载资源
    if (newValue === 1 && resources.length === 0) {
      loadResources();
    }
  };

  // 加载工具列表
  const loadTools = async (forceRefresh = false) => {
    if (!isConnected) return;

    // 如果已经有工具数据且不是强制刷新，则不重新加载
    if (tools.length > 0 && !forceRefresh) return;

    setLoadingTools(true);
    setError(null);

    try {
      const result = await invoke("list_mcp_tools", {
        request: { client_id: config.id, filter: "" },
      });

      console.log("工具列表:", result);

      // 处理返回结果
      if (result && (result as any).success && (result as any).data) {
        setTools((result as any).data);
      } else {
        setError((result as any).error || "获取工具列表失败");
      }
    } catch (err) {
      console.error("获取工具列表失败:", err);
      setError(err instanceof Error ? err.message : "获取工具列表失败");
    } finally {
      setLoadingTools(false);
    }
  };

  // 加载资源列表
  const loadResources = async (forceRefresh = false) => {
    if (!isConnected) return;

    // 如果已经有资源数据且不是强制刷新，则不重新加载
    if (resources.length > 0 && !forceRefresh) return;

    setLoadingResources(true);
    setError(null);

    try {
      const result = await invoke("list_mcp_resources", {
        request: { client_id: config.id, filter: "" },
      });

      console.log("资源列表:", result);

      // 处理返回结果
      if (result && (result as any).success && (result as any).data) {
        setResources((result as any).data);
      } else {
        setError((result as any).error || "获取资源列表失败");
      }
    } catch (err) {
      console.error("获取资源列表失败:", err);
      setError(err instanceof Error ? err.message : "获取资源列表失败");
    } finally {
      setLoadingResources(false);
    }
  };

  // 读取资源内容
  const handleReadResource = async (uri: string) => {
    if (!isConnected) return;

    setLoadingResources(true);
    setError(null);

    try {
      const result = await invoke("read_mcp_resource", {
        request: { client_id: config.id, resource_uri: uri },
      });

      console.log("资源内容:", result);

      // 这里可以添加处理资源内容的逻辑，例如显示在对话框中
      // 暂时只在控制台输出

      if (!(result as any).success) {
        setError((result as any).error || "读取资源失败");
      }
    } catch (err) {
      console.error("读取资源失败:", err);
      setError(err instanceof Error ? err.message : "读取资源失败");
    } finally {
      setLoadingResources(false);
    }
  };

  // 调用工具
  const handleCallTool = async (toolName: string) => {
    if (!isConnected) return;

    setLoadingResources(true);
    setError(null);

    try {
      const result = await invoke("call_mcp_tool", {
        request: {
          client_id: config.id,
          tool_name: toolName,
          params: {}, // 这里可以传入工具参数，暂时为空
        },
      });

      console.log("工具调用结果:", result);

      // 这里可以添加处理工具调用结果的逻辑，例如显示在对话框中
      // 暂时只在控制台输出

      if (!(result as any).success) {
        setError((result as any).error || "调用工具失败");
      }
    } catch (err) {
      console.error("调用工具失败:", err);
      setError(err instanceof Error ? err.message : "调用工具失败");
    } finally {
      setLoadingResources(false);
    }
  };

  // 打开资源和工具对话框
  const handleOpenResourcesTools = (defaultTab: number = 1) => {
    setShowDetails(true);
    setTabValue(defaultTab); // 设置默认标签页

    // 根据默认标签页加载相应数据，强制刷新
    if (defaultTab === 0) {
      loadTools(true); // 工具标签页
    } else if (defaultTab === 1) {
      loadResources(true); // 资源标签页
    }
  };

  // 打开资源对话框
  const handleOpenResources = () => {
    handleOpenResourcesTools(1); // 默认显示资源标签
  };

  // 打开工具对话框
  const handleOpenTools = () => {
    handleOpenResourcesTools(0); // 默认显示工具标签
  };

  // 关闭资源和工具对话框
  const handleCloseDialog = () => {
    setShowDetails(false);
  };

  // 处理刷新状态
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh(config.id);
      // 刷新连接状态后，强制刷新工具和资源列表
      if (isConnected) {
        loadTools(true);
        loadResources(true);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // 获取实际资源数量
  const getResourceCount = () => {
    if (isConnected && status?.server_info?.capabilities?.resources) {
      if (Array.isArray(status.server_info.capabilities.resources)) {
        return status.server_info.capabilities.resources.length;
      } else if (
        typeof status.server_info.capabilities.resources === "number"
      ) {
        return status.server_info.capabilities.resources;
      }
    }
    return resources.length;
  };

  // 获取实际工具数量
  const getToolCount = () => {
    if (isConnected && status?.server_info?.capabilities?.tools) {
      if (Array.isArray(status.server_info.capabilities.tools)) {
        return status.server_info.capabilities.tools.length;
      } else if (typeof status.server_info.capabilities.tools === "number") {
        return status.server_info.capabilities.tools;
      }
    }
    return tools.length;
  };

  // 格式化服务器版本显示
  const formatServerInfo = () => {
    if (!status?.server_info) return "";

    const { name, version } = status.server_info;

    // 如果版本号已经包含在名称中，则只显示名称
    if (name && name.includes(version)) {
      return name;
    }

    // 否则显示名称和版本
    return `${name} ${version}`;
  };

  // 处理修复连接
  const handleRepair = async () => {
    if (!onRepair) return;
    setRepairing(true);
    try {
      await onRepair(config.id);
    } finally {
      setRepairing(false);
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    if (isConnected) return theme.palette.success.main;
    if (isError) return theme.palette.error.main;
    if (isConnecting) return theme.palette.warning.main;
    return theme.palette.grey[500];
  };

  // 处理断开连接
  const handleDisconnect = async () => {
    if (!onDisconnect || !isConnected) return;
    try {
      await onDisconnect(config.id);
    } catch (error) {
      console.error("断开连接失败:", error);
      setError(error instanceof Error ? error.message : "断开连接失败");
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        opacity: config.enabled ? 1 : 0.6,
        transition: "all 0.3s ease",
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: config.enabled
          ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`
          : "none",
        "&:hover": {
          boxShadow: config.enabled
            ? `0 6px 16px ${alpha(theme.palette.primary.main, 0.15)}`
            : "none",
          transform: config.enabled ? "translateY(-2px)" : "none",
        },
        position: "relative",
      }}
    >
      {/* 状态指示条 */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          bgcolor: getStatusColor(),
          transition: "background-color 0.3s ease",
        }}
      />

      <CardHeader
        avatar={
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={<StatusIndicator status={status?.status} size={12} />}
          >
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              }}
            >
              {getTransportIcon(config.transportType)}
            </Avatar>
          </Badge>
        }
        title={
          <Box display="flex" alignItems="center">
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              {config.name}
            </Typography>
            {isConnected && (
              <Chip
                size="small"
                label="已连接"
                color="success"
                sx={{ ml: 1, height: "20px" }}
              />
            )}
            {isError && (
              <Chip
                size="small"
                label="错误"
                color="error"
                sx={{ ml: 1, height: "20px" }}
              />
            )}
            {isConnecting && (
              <Chip
                size="small"
                label="连接中"
                color="warning"
                sx={{ ml: 1, height: "20px" }}
              />
            )}
          </Box>
        }
        subheader={
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {config.transportType === TransportType.SSE
              ? config.sseUrl
              : config.command +
                (config.args && config.args.length > 0
                  ? " " + config.args.join(" ")
                  : "")}
          </Typography>
        }
        action={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {isConnected && onDisconnect && (
              <Tooltip title="断开连接">
                <IconButton
                  aria-label="断开连接"
                  onClick={handleDisconnect}
                  disabled={refreshing || repairing || !isConnected}
                  size="small"
                  sx={{
                    color: theme.palette.error.main,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    mr: 1,
                    "&:hover": {
                      bgcolor: alpha(theme.palette.error.main, 0.2),
                    },
                  }}
                >
                  <PowerSettingsNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="刷新状态">
              <IconButton
                aria-label="刷新"
                onClick={handleRefresh}
                disabled={refreshing || repairing}
                size="small"
                sx={{
                  color: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  mr: 1,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                {refreshing ? (
                  <CircularProgress size={18} />
                ) : (
                  <RefreshIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            {onRepair && (
              <Tooltip title="修复连接">
                <span>
                  <IconButton
                    aria-label="修复连接"
                    onClick={handleRepair}
                    disabled={refreshing || repairing || isConnected}
                    size="small"
                    sx={{
                      color: theme.palette.warning.main,
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      mr: 1,
                      "&:hover": {
                        bgcolor: alpha(theme.palette.warning.main, 0.2),
                      },
                    }}
                  >
                    {repairing ? (
                      <CircularProgress size={18} />
                    ) : (
                      <RepairIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Tooltip title="编辑配置">
              <IconButton
                aria-label="编辑"
                onClick={() => onEdit(config)}
                disabled={refreshing || repairing}
                size="small"
                sx={{
                  color: theme.palette.info.main,
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  mr: 1,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.info.main, 0.2),
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="删除配置">
              <IconButton
                aria-label="删除"
                onClick={() => onDelete(config.id)}
                disabled={refreshing || repairing}
                size="small"
                sx={{
                  color: theme.palette.error.main,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  "&:hover": {
                    bgcolor: alpha(theme.palette.error.main, 0.2),
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      <Divider sx={{ mx: 2 }} />

      <CardContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <DnsIcon
                fontSize="small"
                color="primary"
                sx={{ mr: 1, opacity: 0.7 }}
              />
              <Typography variant="subtitle2" color="text.secondary">
                类型
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ pl: 4 }}>
              {config.transportType}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <StorageIcon
                fontSize="small"
                color="primary"
                sx={{ mr: 1, opacity: 0.7 }}
              />
              <Typography variant="subtitle2" color="text.secondary">
                状态
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" sx={{ pl: 4 }}>
              <StatusIndicator status={status?.status} />
              <Typography variant="body2" sx={{ ml: 1, fontWeight: 500 }}>
                {getStatusText(status?.status)}
              </Typography>
              {status?.error && (
                <Tooltip title={status.error}>
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{
                      ml: 1,
                      maxWidth: "150px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      cursor: "help",
                      textDecoration: "underline",
                      textDecorationStyle: "dotted",
                    }}
                  >
                    {status.error}
                  </Typography>
                </Tooltip>
              )}
            </Box>
          </Grid>

          {isConnected && status?.server_info && (
            <>
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mt: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderColor: alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Typography
                      variant="subtitle2"
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    >
                      服务器信息
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {formatServerInfo()}
                    </Typography>
                  </Box>

                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          cursor: isConnected ? "pointer" : "default",
                          "&:hover": {
                            bgcolor: isConnected
                              ? alpha(theme.palette.primary.main, 0.1)
                              : "transparent",
                            borderRadius: 1,
                          },
                          p: 1,
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.1
                          )}`,
                          borderRadius: 1,
                        }}
                        onClick={isConnected ? handleOpenTools : undefined}
                      >
                        <BuildIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="body2" fontWeight={500}>
                          {loadingTools ? (
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <CircularProgress size={14} sx={{ mr: 1 }} />
                              加载中...
                            </Box>
                          ) : (
                            `${getToolCount()} 个工具`
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          cursor: isConnected ? "pointer" : "default",
                          "&:hover": {
                            bgcolor: isConnected
                              ? alpha(theme.palette.primary.main, 0.1)
                              : "transparent",
                            borderRadius: 1,
                          },
                          p: 1,
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.1
                          )}`,
                          borderRadius: 1,
                        }}
                        onClick={isConnected ? handleOpenResources : undefined}
                      >
                        <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="body2" fontWeight={500}>
                          {loadingResources ? (
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <CircularProgress size={14} sx={{ mr: 1 }} />
                              加载中...
                            </Box>
                          ) : (
                            `${getResourceCount()} 个资源`
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </>
          )}
        </Grid>
      </CardContent>

      <Divider sx={{ mx: 2 }} />

      <CardActions sx={{ justifyContent: "space-between", px: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={config.enabled}
              onChange={() => onToggle(config.id)}
              disabled={refreshing || repairing}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" fontWeight={500}>
              {config.enabled ? "已启用" : "已禁用"}
            </Typography>
          }
        />
      </CardActions>

      {/* 资源和工具对话框 */}
      <Dialog
        open={showDetails}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            py: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                mr: 1.5,
              }}
            >
              {tabValue === 0 ? <BuildIcon /> : <DescriptionIcon />}
            </Avatar>
            <Typography variant="h6">
              {config.name} - {tabValue === 0 ? "工具" : "资源"}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                "& .MuiTab-root": {
                  py: 2,
                },
              }}
            >
              <Tab label="工具" icon={<BuildIcon />} iconPosition="start" />
              <Tab
                label="资源"
                icon={<DescriptionIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <Box sx={{ p: 2 }}>
            {(loadingTools && tabValue === 0) ||
            (loadingResources && tabValue === 1) ? (
              <Box display="flex" justifyContent="center" my={3}>
                <CircularProgress />
              </Box>
            ) : null}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* 工具列表 */}
            {tabValue === 0 && !loadingTools && (
              <>
                {tools.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      textAlign: "center",
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                    }}
                  >
                    <BuildIcon
                      sx={{
                        fontSize: 48,
                        color: alpha(theme.palette.text.secondary, 0.3),
                        mb: 1,
                      }}
                    />
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      align="center"
                    >
                      没有可用的工具
                    </Typography>
                  </Paper>
                ) : (
                  <List
                    sx={{
                      "& .MuiListItem-root": {
                        borderRadius: 1,
                        mb: 1,
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                        },
                      },
                    }}
                  >
                    {tools.map((tool) => (
                      <ListItem
                        key={tool.name}
                        onClick={() => handleCallTool(tool.name)}
                        sx={{
                          border: `1px solid ${alpha(
                            theme.palette.divider,
                            0.5
                          )}`,
                          borderRadius: 1,
                          mb: 1,
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                          },
                        }}
                      >
                        <ListItemIcon>
                          <BuildIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2">
                              {tool.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {tool.description || "无描述"}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            )}

            {/* 资源列表 */}
            {tabValue === 1 && !loadingResources && (
              <>
                {resources.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      textAlign: "center",
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                    }}
                  >
                    <DescriptionIcon
                      sx={{
                        fontSize: 48,
                        color: alpha(theme.palette.text.secondary, 0.3),
                        mb: 1,
                      }}
                    />
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      align="center"
                    >
                      没有可用的资源
                    </Typography>
                  </Paper>
                ) : (
                  <List
                    sx={{
                      "& .MuiListItem-root": {
                        borderRadius: 1,
                        mb: 1,
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                        },
                      },
                    }}
                  >
                    {resources.map((resource) => (
                      <ListItem
                        key={resource.uri}
                        onClick={() => handleReadResource(resource.uri)}
                        sx={{
                          border: `1px solid ${alpha(
                            theme.palette.divider,
                            0.5
                          )}`,
                          borderRadius: 1,
                          mb: 1,
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                          },
                        }}
                      >
                        <ListItemIcon>
                          <DescriptionIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2">
                              {resource.uri}
                            </Typography>
                          }
                          secondary={
                            resource.description ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {resource.description}
                              </Typography>
                            ) : null
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            p: 2,
          }}
        >
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            startIcon={<CloseIcon />}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default McpConfigCard;
