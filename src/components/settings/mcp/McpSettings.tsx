import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SelectChangeEvent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import Tooltip from "@mui/material/Tooltip";
import {
  McpServerConfig,
  TransportType,
  ClientStatus,
  ClientStatusResponse,
  ToolInfo,
  ResourceInfo,
  PromptInfo,
} from "../../../models/mcpTypes";
import McpConfigCard from "./McpConfigCard";
import { ServiceContainer } from "../../../services/ServiceContainer";
import { SERVICE_KEYS } from "../../../services/constants";
import { IMcpService } from "../../../services/interfaces";
import { invoke } from "@tauri-apps/api/core";

// 默认配置
const defaultConfig: Omit<McpServerConfig, "id"> = {
  name: "",
  transportType: TransportType.Stdio,
  timeoutSecs: 30,
  clientName: "FishMind",
  clientVersion: "1.0.0",
  enabled: true,
};

// 表单字段验证接口
interface FormErrors {
  name?: string;
  sseUrl?: string;
  command?: string;
  timeoutSecs?: string;
  clientName?: string;
  clientVersion?: string;
}

const McpSettings: React.FC = () => {
  // 状态定义
  const [loading, setLoading] = useState<boolean>(true);
  const [configs, setConfigs] = useState<McpServerConfig[]>([]);
  const [statuses, setStatuses] = useState<
    Record<string, ClientStatusResponse>
  >({});
  const [mcpService, setMcpService] = useState<any>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingConfig, setEditingConfig] =
    useState<Partial<McpServerConfig> | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  // 组件加载时从服务容器获取服务
  useEffect(() => {
    const loadService = async () => {
      try {
        setLoading(true);
        console.log("开始加载MCP服务...");

        // 获取服务容器实例
        const container = ServiceContainer.getInstance();

        // 获取已初始化的MCP服务
        if (container.has(SERVICE_KEYS.MCP)) {
          const service = container.get<IMcpService>(SERVICE_KEYS.MCP);
          setMcpService(service);

          // 加载配置
          const configs = await service.getAllConfigs();
          setConfigs(configs);
          console.log("MCP配置加载完成，数量:", configs.length);

          // 获取所有服务器状态
          console.log("获取所有服务器状态...");
          try {
            // 直接使用服务的 getAllServerStatuses 方法获取所有状态
            // 这将包括在服务初始化时已经自动连接的服务状态
            const allStatuses = await service.getAllServerStatuses();
            console.log("获取所有服务器状态成功:", allStatuses);
            setStatuses(allStatuses);
          } catch (error) {
            console.error("获取所有服务器状态失败:", error);

            // 创建默认状态作为后备
            const defaultStatuses: Record<string, ClientStatusResponse> = {};
            configs.forEach((config) => {
              defaultStatuses[config.id] = {
                id: config.id,
                status: ClientStatus.Disconnected,
                connected_at: new Date().toISOString(),
              };
            });
            setStatuses(defaultStatuses);
          }
        } else {
          console.error("MCP服务未初始化");
        }
      } catch (error) {
        console.error("获取MCP服务失败:", error);
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, []);

  // 表单验证
  const validateForm = (config: Partial<McpServerConfig>): boolean => {
    const errors: FormErrors = {};

    if (!config.name?.trim()) {
      errors.name = "名称不能为空";
    }

    if (config.transportType === TransportType.SSE && !config.sseUrl?.trim()) {
      errors.sseUrl = "SSE URL不能为空";
    }

    if (
      config.transportType === TransportType.Stdio &&
      !config.command?.trim()
    ) {
      errors.command = "命令不能为空";
    }

    if (!config.timeoutSecs || config.timeoutSecs <= 0) {
      errors.timeoutSecs = "超时时间必须大于0";
    }

    if (!config.clientName?.trim()) {
      errors.clientName = "客户端名称不能为空";
    }

    if (!config.clientVersion?.trim()) {
      errors.clientVersion = "客户端版本不能为空";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理添加配置
  const handleAddConfig = () => {
    setEditingConfig({ ...defaultConfig });
    setFormErrors({});
    setOpenDialog(true);
  };

  // 处理编辑配置
  const handleEditConfig = (config: McpServerConfig) => {
    setEditingConfig({ ...config });
    setFormErrors({});
    setOpenDialog(true);
  };

  // 处理删除配置
  const handleDeleteConfig = (id: string) => {
    setConfigToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (configToDelete) {
      try {
        // 使用服务的公共方法删除配置
        await mcpService?.deleteConfig(configToDelete);

        // 更新本地状态
        setConfigs(configs.filter((config) => config.id !== configToDelete));
      } catch (error) {
        console.error("删除配置失败:", error);
      } finally {
        setDeleteConfirmOpen(false);
        setConfigToDelete(null);
      }
    }
  };

  // 处理表单提交
  const handleSubmit = async () => {
    if (!editingConfig) return;

    if (!validateForm(editingConfig)) {
      return;
    }

    try {
      setSubmitting(true);

      if (!mcpService) {
        throw new Error("MCP服务未初始化");
      }

      // 准备配置数据
      const configData: Partial<McpServerConfig> = {
        name: editingConfig.name || "",
        transportType: editingConfig.transportType || TransportType.Stdio,
        timeoutSecs: Number(editingConfig.timeoutSecs) || 30,
        clientName: editingConfig.clientName || "FishMind",
        clientVersion: editingConfig.clientVersion || "1.0.0",
        enabled: editingConfig.enabled !== false, // 默认为启用
      };

      // 根据传输类型添加特定字段
      if (configData.transportType === TransportType.SSE) {
        configData.sseUrl = editingConfig.sseUrl;
        if (editingConfig.sseHeaders) {
          configData.sseHeaders = editingConfig.sseHeaders;
        }
      } else {
        configData.command = editingConfig.command;
        if (editingConfig.args) {
          configData.args = editingConfig.args;
        }
        if (editingConfig.envVars) {
          configData.envVars = editingConfig.envVars;
        }
      }

      let savedConfig: McpServerConfig;

      if (editingConfig.id) {
        // 更新现有配置
        savedConfig = await mcpService.updateConfig(
          editingConfig.id,
          configData
        );
      } else {
        // 创建新配置
        savedConfig = await mcpService.createConfig(
          configData as McpServerConfig
        );
      }

      // 更新本地状态
      setConfigs((prev) => {
        if (editingConfig.id) {
          // 如果是更新，替换现有配置
          return prev.map((config) =>
            config.id === savedConfig.id ? savedConfig : config
          );
        } else {
          // 如果是新建，添加到列表开头
          return [savedConfig, ...prev];
        }
      });

      // 初始化新配置的状态
      if (!editingConfig.id) {
        // 获取新配置的状态
        try {
          const status = await mcpService.getServerStatus(savedConfig.id);
          setStatuses((prev) => ({
            ...prev,
            [savedConfig.id]: status,
          }));
        } catch (error) {
          console.error(`获取新配置状态失败(ID: ${savedConfig.id}):`, error);
          // 设置默认状态
          setStatuses((prev) => ({
            ...prev,
            [savedConfig.id]: {
              id: savedConfig.id,
              status: ClientStatus.Disconnected,
              connected_at: new Date().toISOString(),
            },
          }));
        }
      }

      // 关闭对话框
      setOpenDialog(false);
    } catch (error) {
      console.error(`MCP配置${editingConfig.id ? "更新" : "创建"}失败:`, error);
    } finally {
      setSubmitting(false);
    }
  };

  // 处理表单字段变更
  const handleFormChange = (field: keyof McpServerConfig, value: any) => {
    if (!editingConfig) return;

    // 特殊处理transportType变更
    if (field === "transportType") {
      const newConfig = { ...editingConfig, [field]: value };

      // 根据传输类型重置相关字段
      if (value === TransportType.SSE) {
        delete newConfig.command;
        delete newConfig.args;
        delete newConfig.envVars;
      } else if (value === TransportType.Stdio) {
        delete newConfig.sseUrl;
        delete newConfig.sseHeaders;
      }

      setEditingConfig(newConfig);
    } else {
      setEditingConfig({ ...editingConfig, [field]: value });
    }
  };

  // 处理刷新状态
  const handleRefreshStatus = async (configId: string) => {
    try {
      // 设置对应配置的加载状态
      setStatuses((prev) => ({
        ...prev,
        [configId]: {
          ...prev[configId],
          isRefreshing: true,
        },
      }));

      if (!mcpService) {
        throw new Error("MCP服务未初始化");
      }

      // 调用服务获取最新状态
      const status = await mcpService.getServerStatus(configId);

      // 更新状态
      setStatuses((prev) => ({
        ...prev,
        [configId]: {
          ...status,
          isRefreshing: false,
        },
      }));

      console.log(`刷新MCP服务器状态成功(ID: ${configId}):`, status);
    } catch (error) {
      console.error(`刷新MCP服务器状态失败(ID: ${configId}):`, error);

      // 更新为错误状态
      setStatuses((prev) => ({
        ...prev,
        [configId]: {
          id: configId,
          status: ClientStatus.Error,
          connected_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : "刷新状态失败",
          isRefreshing: false,
        },
      }));
    }
  };

  // 处理修复连接
  const handleRepairConnection = async (configId: string) => {
    try {
      // 设置对应配置的加载状态
      setStatuses((prev) => ({
        ...prev,
        [configId]: {
          ...prev[configId],
          isRepairing: true,
        },
      }));

      // 直接调用修复命令
      const result = await invoke("mcp_repair_client", { clientId: configId });
      console.log(`修复MCP连接结果(ID: ${configId}):`, result);

      // 更新状态
      setStatuses((prev) => ({
        ...prev,
        [configId]: {
          ...(result as ClientStatusResponse),
          isRepairing: false,
        },
      }));

      console.log(`修复MCP连接成功(ID: ${configId})`);
    } catch (error) {
      console.error(`修复MCP连接失败(ID: ${configId}):`, error);

      // 更新为错误状态
      setStatuses((prev) => ({
        ...prev,
        [configId]: {
          ...prev[configId],
          status: ClientStatus.Error,
          error: error instanceof Error ? error.message : "修复连接失败",
          isRepairing: false,
        },
      }));
    }
  };

  // 处理断开连接
  const handleDisconnect = async (configId: string) => {
    try {
      console.log(`断开连接(ID: ${configId})`);

      // 更新状态为正在断开连接
      setStatuses((prev) => ({
        ...prev,
        [configId]: {
          ...prev[configId],
          isDisconnecting: true,
        },
      }));

      // 调用 Tauri 命令断开连接
      await invoke("disconnect_mcp_client", { clientId: configId });

      // 更新状态
      setStatuses((prev) => ({
        ...prev,
        [configId]: {
          ...prev[configId],
          status: ClientStatus.Disconnected,
          connected_at: undefined,
          isDisconnecting: false,
        },
      }));

      console.log(`断开连接成功(ID: ${configId})`);
    } catch (error) {
      console.error(`断开连接失败(ID: ${configId}):`, error);

      // 更新为错误状态
      setStatuses((prev) => ({
        ...prev,
        [configId]: {
          ...prev[configId],
          error: error instanceof Error ? error.message : "断开连接失败",
          isDisconnecting: false,
        },
      }));
    }
  };

  // 处理切换启用状态
  const handleToggleEnabled = async (configId: string) => {
    try {
      // 获取当前配置
      const config = configs.find((c) => c.id === configId);
      if (!config) {
        console.error(`找不到配置(ID: ${configId})`);
        return;
      }

      // 先更新本地UI状态，提高响应速度
      const newEnabled = !config.enabled;
      const updatedConfigs = configs.map((c) =>
        c.id === configId ? { ...c, enabled: newEnabled } : c
      );
      setConfigs(updatedConfigs);

      if (!mcpService) {
        console.error("MCP服务未初始化");
        return;
      }

      // 更新数据库中的启用状态
      console.log(`更新配置启用状态(ID: ${configId}, enabled: ${newEnabled})`);

      try {
        // 尝试更新配置
        await mcpService.updateConfig(configId, { enabled: newEnabled });

        // 如果禁用了配置，断开连接
        if (!newEnabled) {
          await handleDisconnect(configId);
        } else {
          // 如果启用了配置，尝试连接
          handleRefreshStatus(configId);
        }
      } catch (error) {
        console.error(`更新配置启用状态失败(ID: ${configId}):`, error);

        // 回滚本地状态
        setConfigs((prev) =>
          prev.map((c) =>
            c.id === configId ? { ...c, enabled: config.enabled } : c
          )
        );

        // 显示错误提示
        // 这里可以添加一个Toast或Alert组件来显示错误信息
      }
    } catch (error) {
      console.error(`切换启用状态失败(ID: ${configId}):`, error);

      // 回滚本地状态
      const config = configs.find((c) => c.id === configId);
      if (config) {
        const updatedConfigs = configs.map((c) =>
          c.id === configId ? { ...c, enabled: config.enabled } : c
        );
        setConfigs(updatedConfigs);
      }
    }
  };

  // 渲染编辑对话框
  const renderEditDialog = () => {
    if (!editingConfig) return null;

    const isEditing = Boolean(editingConfig.id);
    const title = isEditing ? "编辑MCP服务器配置" : "添加MCP服务器配置";

    return (
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* 基本信息 */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                基本信息
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="名称"
                fullWidth
                value={editingConfig.name || ""}
                onChange={(e) => handleFormChange("name", e.target.value)}
                error={Boolean(formErrors.name)}
                helperText={formErrors.name}
                required
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl
                fullWidth
                required
                disabled={submitting}
                sx={{ m: 0 }}
              >
                <InputLabel id="transport-type-label">传输类型</InputLabel>
                <Select
                  labelId="transport-type-label"
                  value={editingConfig.transportType || TransportType.Stdio}
                  label="传输类型"
                  onChange={(e: SelectChangeEvent<TransportType>) =>
                    handleFormChange("transportType", e.target.value)
                  }
                >
                  <MenuItem value={TransportType.Stdio}>Stdio</MenuItem>
                  <MenuItem value={TransportType.SSE}>SSE</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* SSE 特定配置 */}
            {editingConfig.transportType === TransportType.SSE && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    SSE 配置
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="SSE URL"
                    fullWidth
                    value={editingConfig.sseUrl || ""}
                    onChange={(e) => handleFormChange("sseUrl", e.target.value)}
                    error={Boolean(formErrors.sseUrl)}
                    helperText={formErrors.sseUrl}
                    required
                    placeholder="http://localhost:8080/events"
                    disabled={submitting}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    SSE 请求头 (可选)
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2">
                      请求头配置功能将在后续版本中实现
                    </Typography>
                  </Paper>
                </Grid>
              </>
            )}

            {/* Stdio 特定配置 */}
            {editingConfig.transportType === TransportType.Stdio && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Stdio 配置
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="命令"
                    fullWidth
                    value={editingConfig.command || ""}
                    onChange={(e) =>
                      handleFormChange("command", e.target.value)
                    }
                    error={Boolean(formErrors.command)}
                    helperText={formErrors.command}
                    required
                    placeholder="node"
                    disabled={submitting}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="参数"
                    fullWidth
                    value={editingConfig.args?.join(" ") || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 允许末尾空格，只在非空格字符之间分割
                      const args =
                        value.length > 0
                          ? value.split(/\s+/).filter((arg) => arg !== "")
                          : [];
                      // 如果输入以空格结尾，添加一个空字符串表示正在输入新参数
                      if (value.endsWith(" ") && value.length > 0) {
                        args.push("");
                      }
                      handleFormChange("args", args);
                    }}
                    placeholder="server.js --debug"
                    helperText="多个参数用空格分隔"
                    disabled={submitting}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    环境变量 (可选)
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2">
                      环境变量配置功能将在后续版本中实现
                    </Typography>
                  </Paper>
                </Grid>
              </>
            )}

            {/* 通用配置 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                通用配置
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="超时时间(秒)"
                type="number"
                fullWidth
                value={editingConfig.timeoutSecs || ""}
                onChange={(e) =>
                  handleFormChange("timeoutSecs", parseInt(e.target.value))
                }
                error={Boolean(formErrors.timeoutSecs)}
                helperText={formErrors.timeoutSecs}
                required
                inputProps={{ min: 1 }}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="客户端名称"
                fullWidth
                value={editingConfig.clientName || "FishMind"}
                InputProps={{ readOnly: true }}
                sx={{ display: "none" }} // 完全隐藏
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="客户端版本"
                fullWidth
                value={editingConfig.clientVersion || "1.0.0"}
                InputProps={{ readOnly: true }}
                sx={{ display: "none" }} // 完全隐藏
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? "保存中..." : "保存"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // 渲染删除确认对话框
  const renderDeleteConfirmDialog = () => {
    const configName = configs.find((c) => c.id === configToDelete)?.name;

    return (
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除配置 "{configName}" 吗？此操作无法撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 48px)", // 减去标签栏高度
        position: "relative",
        overflow: "hidden", // 防止整体出现滚动条
      }}
    >
      {/* 标题部分固定 */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          bgcolor: "background.paper",
          p: 3,
          pb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h6" gutterBottom>
            MCP服务器配置
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理与MCP服务器的连接配置
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddConfig}
        >
          添加配置
        </Button>
      </Box>

      {/* 可滚动内容区域 */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 3,
          pb: 4, // 增加底部填充确保最后元素可见
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "rgba(0,0,0,0.05)",
          },
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        ) : configs.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
            {configs.map((config) => {
              // 确保 status 对象是有效的
              const status = statuses[config.id] || {
                id: config.id,
                status: ClientStatus.Disconnected,
                connected_at: new Date().toISOString(),
              };

              return (
                <McpConfigCard
                  key={config.id}
                  config={config}
                  status={status}
                  onEdit={() => handleEditConfig(config)}
                  onDelete={() => handleDeleteConfig(config.id)}
                  onRefresh={() => handleRefreshStatus(config.id)}
                  onToggle={() => handleToggleEnabled(config.id)}
                  onRepair={() => handleRepairConnection(config.id)}
                  onDisconnect={handleDisconnect}
                />
              );
            })}
          </Box>
        ) : (
          <Paper sx={{ p: 3, textAlign: "center", my: 2 }}>
            <Typography variant="body1" gutterBottom>
              暂无MCP服务器配置
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              点击"添加配置"按钮创建新的MCP服务器配置
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddConfig}
            >
              添加配置
            </Button>
          </Paper>
        )}
      </Box>

      {renderEditDialog()}
      {renderDeleteConfirmDialog()}
    </Box>
  );
};

export default McpSettings;
