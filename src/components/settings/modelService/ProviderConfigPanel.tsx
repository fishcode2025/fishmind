import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormLabel,
  useTheme,
  Avatar,
  Link,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloudIcon from "@mui/icons-material/Cloud";
import AddIcon from "@mui/icons-material/Add";
import LaunchIcon from "@mui/icons-material/Launch";

import {
  ModelServiceManager,
  Model,
  ModelServiceProvider,
  extractGroupId,
} from "../../../services/modelService";
import modelService, { modelIconService } from "../../../services/modelService";
import { getProviderLogo, PROVIDER_CONFIG } from "../../../config/providers";
import { ModelItem } from "./ModelItem";
import { configService } from "../../../services/system/ConfigService";

// 定义模型能力类型
type ModelCapability = "chat" | "image" | "embedding" | "reasoning";

// 定义能力标签配置
const CAPABILITY_LABELS: Record<ModelCapability, string> = {
  chat: "对话",
  image: "图像",
  embedding: "嵌入",
  reasoning: "推理",
};

// 获取供应商网站配置，如果不存在则使用OpenAI的配置作为默认值
const getProviderWebsites = (providerId: string) => {
  const defaultWebsites = PROVIDER_CONFIG["openai"]?.websites || {
    official: "https://openai.com/",
    apiKey: "https://platform.openai.com/api-keys",
    docs: "https://platform.openai.com/docs",
    models: "https://platform.openai.com/docs/models",
  };

  const config = PROVIDER_CONFIG[providerId as keyof typeof PROVIDER_CONFIG];
  return config && "websites" in config ? config.websites : defaultWebsites;
};

// 模型图标组件
const ModelIconImage: React.FC<{ model: Model; isDarkMode: boolean }> = ({
  model,
  isDarkMode,
}) => {
  const iconSrc = modelIconService.getModelIcon(model, isDarkMode);

  // 添加调试信息
  // console.log(`Model ${model.id} icon:`, iconSrc);

  return (
    <Avatar
      src={iconSrc}
      sx={{
        width: 24,
        height: 24,
        bgcolor: "transparent",
      }}
    >
      <CloudIcon fontSize="small" />
    </Avatar>
  );
};

// 供应商图标组件
const ProviderIconImage: React.FC<{
  providerId: string;
  isDarkMode: boolean;
}> = ({ providerId, isDarkMode }) => {
  const iconSrc = getProviderLogo(providerId);

  // 添加调试信息
  // console.log(`Provider ${providerId} icon:`, iconSrc);

  return (
    <Avatar
      src={iconSrc}
      sx={{
        width: 32,
        height: 32,
        bgcolor: "transparent",
        marginRight: 1,
      }}
    >
      <CloudIcon />
    </Avatar>
  );
};

interface ProviderConfigPanelProps {
  providerId: string;
  onConfigChange: () => void;
}

export const ProviderConfigPanel: React.FC<ProviderConfigPanelProps> = ({
  providerId,
  onConfigChange,
}) => {
  const [provider, setProvider] = useState<ModelServiceProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "none" | "success" | "error"
  >("none");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // 添加模型对话框状态
  const [isAddModelDialogOpen, setIsAddModelDialogOpen] = useState(false);
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [newModelGroup, setNewModelGroup] = useState("");
  const [addModelError, setAddModelError] = useState("");

  // 模型能力设置对话框状态
  const [isCapabilityDialogOpen, setIsCapabilityDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedCapabilities, setSelectedCapabilities] = useState<
    ModelCapability[]
  >([]);

  const serviceManager = useMemo(() => new ModelServiceManager(), []);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  // 加载提供商配置
  useEffect(() => {
    loadProviderConfig();
  }, [providerId]);

  const loadProviderConfig = async () => {
    setIsLoading(true);
    setConnectionStatus("none");
    setErrorMessage("");

    try {
      const providerConfig = await serviceManager.getProvider(providerId);
      if (providerConfig) {
        setProvider(providerConfig);
        setApiKey(providerConfig.apiKey || "");
        setApiUrl(providerConfig.apiUrl || "");
        setModels(providerConfig.models || []);
      }
    } catch (error) {
      console.error("Failed to load provider config", error);
      setErrorMessage("加载配置失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!provider) return;

    setIsLoading(true);
    try {
      // 获取当前设置
      const currentSettings = configService.getUserSettings();

      // 更新供应商信息
      const configProvider = {
        id: provider.id,
        enabled: provider.enabled ?? true,
        apiKey,
        apiUrl,
        models: provider.models || [],
      };

      // 在 providers 数组中查找并更新供应商
      const providerIndex = currentSettings.models.providers.findIndex(
        (p) => p.id === providerId
      );
      const newProviders = [...currentSettings.models.providers];

      if (providerIndex >= 0) {
        newProviders[providerIndex] = configProvider;
      } else {
        newProviders.push(configProvider);
      }

      // 通过 ConfigService 保存更新
      await configService.updateUserSettings({
        models: {
          ...currentSettings.models,
          providers: newProviders,
        },
      });

      // 更新本地状态
      setProvider({
        ...provider,
        apiKey,
        apiUrl,
      });

      onConfigChange();

      // 显示成功通知
      setSuccessMessage("配置已保存");
    } catch (error) {
      console.error("Failed to save provider config", error);
      setErrorMessage("保存配置失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus("none");
    setErrorMessage("");

    try {
      // 先保存当前配置
      if (provider) {
        const updatedProvider = {
          ...provider,
          apiKey,
          apiUrl,
        };
        await serviceManager.saveProvider(updatedProvider);
        setProvider(updatedProvider);
      }

      const isConnected = await serviceManager.testConnection(providerId);
      setConnectionStatus(isConnected ? "success" : "error");
      if (!isConnected) {
        setErrorMessage("连接失败，请检查API密钥和地址");
      }
    } catch (error) {
      console.error("Connection test failed", error);
      setConnectionStatus("error");
      setErrorMessage(
        `连接测试失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  // 获取模型列表
  const handleFetchModels = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      // 先保存当前配置
      if (provider) {
        const updatedProvider = {
          ...provider,
          apiKey,
          apiUrl,
        };
        await serviceManager.saveProvider(updatedProvider);
        setProvider(updatedProvider);
      }

      const fetchedModels = await serviceManager.fetchModels(providerId);
      setModels(fetchedModels);

      // 更新提供商配置中的模型列表
      if (provider) {
        const updatedProvider = {
          ...provider,
          models: fetchedModels,
        };
        await serviceManager.saveProvider(updatedProvider);
        setProvider(updatedProvider);
        onConfigChange();
      }
    } catch (error) {
      console.error("Failed to fetch models", error);
      setErrorMessage(
        `获取模型列表失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 打开添加模型对话框
  const handleOpenAddModelDialog = () => {
    setIsAddModelDialogOpen(true);
    setNewModelId("");
    setNewModelName("");
    setNewModelGroup("");
    setAddModelError("");
  };

  // 关闭添加模型对话框
  const handleCloseAddModelDialog = () => {
    setIsAddModelDialogOpen(false);
  };

  // 添加新模型
  const handleAddModel = () => {
    // 验证模型ID是否填写
    if (!newModelId.trim()) {
      setAddModelError("模型ID不能为空");
      return;
    }

    // 检查模型ID是否已存在
    if (models.some((model) => model.id === newModelId)) {
      setAddModelError("模型ID已存在");
      return;
    }

    // 创建新模型对象
    const newModel: Model = {
      id: newModelId,
      name: newModelName || newModelId, // 如果没有填写名称，使用ID作为名称
      provider: providerId,
      group_id: newModelGroup || extractGroupId(newModelId), // 如果没有填写分组，使用从ID提取的分组
      capabilities: ["chat"], // 默认能力
      config: {},
    };

    // 更新模型列表
    const updatedModels = [...models, newModel];
    setModels(updatedModels);

    // 更新提供商配置
    if (provider) {
      const updatedProvider = {
        ...provider,
        models: updatedModels,
      };

      serviceManager
        .saveProvider(updatedProvider)
        .then(() => {
          setProvider(updatedProvider);
          onConfigChange();
          handleCloseAddModelDialog();
        })
        .catch((error: Error) => {
          console.error("Failed to add model", error);
          setAddModelError(`添加模型失败: ${error.message}`);
        });
    }
  };

  // 打开模型能力设置对话框
  const handleOpenCapabilityDialog = (model: Model) => {
    setSelectedModel(model);
    setSelectedCapabilities(
      (model.capabilities as ModelCapability[]) || ["chat"]
    );
    setIsCapabilityDialogOpen(true);
  };

  // 关闭模型能力设置对话框
  const handleCloseCapabilityDialog = () => {
    setIsCapabilityDialogOpen(false);
    setSelectedModel(null);
  };

  // 处理能力复选框变化
  const handleCapabilityChange = (capability: ModelCapability) => {
    setSelectedCapabilities((prev) => {
      if (prev.includes(capability)) {
        return prev.filter((cap) => cap !== capability);
      } else {
        return [...prev, capability];
      }
    });
  };

  // 保存模型能力设置
  const handleSaveCapabilities = () => {
    if (!selectedModel) return;

    // 确保至少选择了一个能力
    if (selectedCapabilities.length === 0) {
      setSelectedCapabilities(["chat"]); // 默认至少有chat能力
      return;
    }

    // 更新模型能力
    const updatedModels = models.map((model) => {
      if (model.id === selectedModel.id) {
        return {
          ...model,
          capabilities: selectedCapabilities,
        };
      }
      return model;
    });

    setModels(updatedModels);

    // 更新提供商配置
    if (provider) {
      const updatedProvider = {
        ...provider,
        models: updatedModels,
      };

      serviceManager
        .saveProvider(updatedProvider)
        .then(() => {
          setProvider(updatedProvider);
          onConfigChange();
          handleCloseCapabilityDialog();
        })
        .catch((error: Error) => {
          console.error("Failed to update model capabilities", error);
          setErrorMessage("更新模型能力失败");
        });
    }
  };

  // 按分组对模型进行分组
  const groupedModels = useMemo(() => {
    const groups: Record<string, Model[]> = {};

    models.forEach((model) => {
      if (!groups[model.group_id]) {
        groups[model.group_id] = [];
      }
      groups[model.group_id].push(model);
    });

    return groups;
  }, [models]);

  // 渲染UI
  return (
    <Box sx={{ p: 2 }}>
      {isLoading && !provider ? (
        <CircularProgress />
      ) : provider ? (
        <>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <ProviderIconImage
              providerId={providerId}
              isDarkMode={isDarkMode}
            />
            <Typography variant="h6">{provider.name}</Typography>
            <IconButton
              size="small"
              sx={{ ml: 1 }}
              onClick={() =>
                window.open(getProviderWebsites(providerId).official, "_blank")
              }
              title="访问官方网站"
            >
              <LaunchIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* API密钥输入 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              API密钥
            </Typography>
            <TextField
              fullWidth
              type={isKeyVisible ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setIsKeyVisible(!isKeyVisible)}>
                      {isKeyVisible ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Typography
              variant="caption"
              sx={{
                mt: 0.5,
                display: "block",
                cursor: "pointer",
                color: "primary.main",
              }}
            >
              <Box
                component="span"
                onClick={() =>
                  window.open(
                    getProviderWebsites(providerId).official,
                    "_blank"
                  )
                }
                sx={{ textDecoration: "underline" }}
              >
                点击这里获取密钥
              </Box>
            </Typography>
          </Box>

          {/* API地址输入 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              API地址
            </Typography>
            <TextField
              fullWidth
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder={
                provider.id === "openai"
                  ? "https://api.openai.com"
                  : "http://localhost:11434"
              }
            />
            {apiUrl && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                {apiUrl.endsWith("/")
                  ? apiUrl + "v1/chat/completions"
                  : apiUrl + "/v1/chat/completions"}
              </Typography>
            )}
          </Box>

          {/* 连接状态 */}
          {connectionStatus !== "none" && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 1,
                bgcolor:
                  connectionStatus === "success"
                    ? "success.light"
                    : "error.light",
              }}
            >
              <Typography
                color={
                  connectionStatus === "success" ? "success.dark" : "error.dark"
                }
              >
                {connectionStatus === "success" ? "连接成功" : "连接失败"}
              </Typography>
              {errorMessage && (
                <Typography variant="body2" color="error">
                  {errorMessage}
                </Typography>
              )}
            </Box>
          )}

          {/* 操作按钮 */}
          <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isLoading}
            >
              保存
            </Button>
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
            >
              测试连接
              {isTestingConnection && (
                <CircularProgress size={20} sx={{ ml: 1 }} />
              )}
            </Button>
            <Button
              variant="outlined"
              onClick={handleFetchModels}
              disabled={isLoading}
            >
              获取模型列表
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* 模型列表 */}
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">模型列表</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleOpenAddModelDialog}
              >
                添加
              </Button>
            </Box>

            {models.length > 0 ? (
              <Box>
                {Object.entries(groupedModels).map(([groupId, groupModels]) => (
                  <Box
                    key={groupId}
                    sx={{
                      mb: 3,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    {/* 分组标题 */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "grey.800"
                            : "grey.100", // 根据主题调整背景色
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Avatar
                        src={modelIconService.getGroupIcon(groupId, isDarkMode)}
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: "transparent",
                          marginRight: 1,
                        }}
                      >
                        <CloudIcon fontSize="small" />
                      </Avatar>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: "bold" }}
                      >
                        {groupId}
                      </Typography>
                    </Box>

                    {/* 分组内的模型列表 */}
                    <Box sx={{ p: 1, bgcolor: "background.paper" }}>
                      {groupModels.map((model) => (
                        <ModelItem
                          key={model.id}
                          name={model.name}
                          id={model.id}
                          icon={
                            <ModelIconImage
                              model={model}
                              isDarkMode={isDarkMode}
                            />
                          }
                          capabilities={model.capabilities as ModelCapability[]}
                          onRemove={() => {
                            // 实现移除模型的逻辑
                            const updatedModels = models.filter(
                              (m) => m.id !== model.id
                            );
                            setModels(updatedModels);
                            if (provider) {
                              const updatedProvider = {
                                ...provider,
                                models: updatedModels,
                              };
                              serviceManager
                                .saveProvider(updatedProvider)
                                .then(() => {
                                  setProvider(updatedProvider);
                                  onConfigChange();
                                })
                                .catch((error: Error) => {
                                  console.error(
                                    "Failed to remove model",
                                    error
                                  );
                                  setErrorMessage("移除模型失败");
                                });
                            }
                          }}
                          onSettings={() => {
                            // 打开模型能力设置对话框
                            handleOpenCapabilityDialog(model);
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">
                暂无模型，请点击"获取模型列表"按钮或手动添加模型
              </Typography>
            )}
          </Box>
        </>
      ) : (
        <Typography>请选择一个模型服务</Typography>
      )}

      {/* 添加模型对话框 */}
      <Dialog open={isAddModelDialogOpen} onClose={handleCloseAddModelDialog}>
        <DialogTitle>添加模型</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, width: "500px" }}>
            <TextField
              fullWidth
              label="模型 ID"
              value={newModelId}
              onChange={(e) => setNewModelId(e.target.value)}
              margin="normal"
              required
              error={!!addModelError && !newModelId}
              helperText={
                !newModelId && addModelError
                  ? addModelError
                  : "必填 例如 gpt-3.5-turbo"
              }
              InputProps={{
                endAdornment: newModelId ? (
                  <InputAdornment position="end">
                    <Avatar
                      src={modelIconService.getModelIconById(
                        newModelId,
                        isDarkMode
                      )}
                      sx={{
                        width: 24,
                        height: 24,
                        bgcolor: "transparent",
                      }}
                    >
                      <CloudIcon fontSize="small" />
                    </Avatar>
                  </InputAdornment>
                ) : undefined,
              }}
            />
            <TextField
              fullWidth
              label="模型名称"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              margin="normal"
              helperText="例如 GPT-3.5"
            />
            <TextField
              fullWidth
              label="分组名称"
              value={newModelGroup}
              onChange={(e) => setNewModelGroup(e.target.value)}
              margin="normal"
              helperText="例如 ChatGPT"
              InputProps={{
                endAdornment: newModelGroup ? (
                  <InputAdornment position="end">
                    <Avatar
                      src={modelIconService.getGroupIcon(
                        newModelGroup,
                        isDarkMode
                      )}
                      sx={{
                        width: 24,
                        height: 24,
                        bgcolor: "transparent",
                      }}
                    >
                      <CloudIcon fontSize="small" />
                    </Avatar>
                  </InputAdornment>
                ) : undefined,
              }}
            />
            {addModelError && newModelId && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {addModelError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddModelDialog}>取消</Button>
          <Button onClick={handleAddModel} variant="contained" color="primary">
            添加模型
          </Button>
        </DialogActions>
      </Dialog>

      {/* 模型能力设置对话框 */}
      <Dialog
        open={isCapabilityDialogOpen}
        onClose={handleCloseCapabilityDialog}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {selectedModel && (
              <Avatar
                src={modelIconService.getModelIcon(selectedModel, isDarkMode)}
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: "transparent",
                  marginRight: 1,
                }}
              >
                <CloudIcon fontSize="small" />
              </Avatar>
            )}
            选择模型类型
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, width: "300px" }}>
            <FormGroup>
              {(Object.keys(CAPABILITY_LABELS) as ModelCapability[]).map(
                (capability) => (
                  <FormControlLabel
                    key={capability}
                    control={
                      <Checkbox
                        checked={selectedCapabilities.includes(capability)}
                        onChange={() => handleCapabilityChange(capability)}
                      />
                    }
                    label={CAPABILITY_LABELS[capability]}
                  />
                )
              )}
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCapabilityDialog}>取消</Button>
          <Button
            onClick={handleSaveCapabilities}
            variant="contained"
            color="primary"
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
