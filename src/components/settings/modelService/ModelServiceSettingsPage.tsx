import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Collapse,
  Tooltip,
  Switch,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CloudIcon from "@mui/icons-material/Cloud";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { ServiceContainer } from "../../../services/ServiceContainer";
import { IAiModelService } from "../../../services/interfaces";
import { AiModel, AiModelProvider } from "../../../models/chat";
import ProviderPanel from "./ProviderPanel";
import ModelPanel from "./ModelPanel";
import ProviderDialog from "./ProviderDialog";

// 编辑模式
type EditMode = "none" | "provider" | "model";

/**
 * 模型服务设置页面
 */
const ModelServiceSettingsPage: React.FC = () => {
  // 获取服务
  const aiModelService =
    ServiceContainer.getInstance().get<IAiModelService>("aiModelService");

  // 状态定义
  const [providers, setProviders] = useState<AiModelProvider[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [currentProvider, setCurrentProvider] =
    useState<AiModelProvider | null>(null);
  const [currentModel, setCurrentModel] = useState<AiModel | null>(null);
  const [editMode, setEditMode] = useState<"none" | "provider" | "model">(
    "none"
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [providerDialogOpen, setProviderDialogOpen] = useState<boolean>(false);
  const [defaultModel, setDefaultModel] = useState<{
    providerId: string;
    modelId: string;
  } | null>(null);
  const [defaultProviderId, setDefaultProviderId] = useState<string>("");

  // 加载数据
  useEffect(() => {
    loadData();
    loadDefaultModel();
  }, []);

  useEffect(() => {
    const selectDefaultProvider = () => {
      if (defaultProviderId) {
        setSelectedProviderId(defaultProviderId);
      } else if (providers.length > 0) {
        setSelectedProviderId(providers[0].id);
      }
    };

    selectDefaultProvider();
  }, [defaultProviderId, providers]);

  // 加载数据
  const loadData = async () => {
    try {
      setIsLoading(true);

      // 获取所有提供商
      const allProviders = await aiModelService.getAllProviders();
      setProviders(allProviders);

      // 获取所有模型
      const allModels = await aiModelService.getAllModels();
      setModels(allModels);

      // 选择默认供应商或第一个供应商
      if (allProviders.length > 0) {
        setSelectedProviderId(defaultProviderId || allProviders[0].id);
      }

      setIsLoading(false);
    } catch (err) {
      setError(
        `加载数据失败: ${err instanceof Error ? err.message : String(err)}`
      );
      setIsLoading(false);
    }
  };

  // 在初始加载时获取默认模型信息
  const loadDefaultModel = async () => {
    try {
      const currentModel = await aiModelService.getCurrentModel();
      if (currentModel) {
        setDefaultModel({
          providerId: currentModel.provider.id,
          modelId: currentModel.model.id,
        });
        setDefaultProviderId(currentModel.provider.id);
      }
    } catch (error) {
      console.error("获取默认模型失败:", error);
    }
  };

  // 处理提供商选择
  const handleSelectProvider = (providerId: string) => {
    setSelectedProviderId(providerId);
    const provider = providers.find((p) => p.id === providerId);
    setCurrentProvider(provider || null);
    setEditMode("provider");
  };

  // 处理添加提供商
  const handleAddProvider = () => {
    setCurrentProvider(null);
    setProviderDialogOpen(true);
  };

  // 处理编辑提供商
  const handleEditProvider = (provider: AiModelProvider) => {
    setCurrentProvider(provider);
    setProviderDialogOpen(true);
  };

  // 处理关闭提供商对话框
  const handleCloseProviderDialog = () => {
    setProviderDialogOpen(false);
  };

  // 处理添加模型
  const handleAddModel = (providerId: string) => {
    setCurrentModel({
      id: "",
      name: "",
      providerId,
      groupId: "default",
      capabilities: ["chat"],
      modelId: "",
      contextWindow: 2048,
      maxTokens: 1024,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setEditMode("model");
  };

  // 处理编辑模型
  const handleEditModel = (model: AiModel) => {
    setCurrentModel(model);
    setEditMode("model");
  };

  // 处理删除提供商
  const handleDeleteProvider = async (provider: AiModelProvider) => {
    if (!window.confirm(`确定要删除提供商 "${provider.name}" 吗？`)) {
      return;
    }

    try {
      setIsLoading(true);
      await aiModelService.deleteProvider(provider.id);

      // 更新列表
      setProviders((prev) => prev.filter((p) => p.id !== provider.id));

      // 如果当前选中的是这个提供商，清除选择
      if (selectedProviderId === provider.id) {
        setSelectedProviderId("");
        setCurrentProvider(null);
        setEditMode("none");
      }

      setSuccess(`提供商 "${provider.name}" 已删除`);
      setIsLoading(false);
    } catch (err) {
      setError(
        `删除提供商失败: ${err instanceof Error ? err.message : String(err)}`
      );
      setIsLoading(false);
    }
  };

  // 处理删除模型
  const handleDeleteModel = async (model: AiModel) => {
    if (!window.confirm(`确定要删除模型 "${model.name}" 吗？`)) {
      return;
    }

    try {
      setIsLoading(true);
      await aiModelService.deleteModel(model.id);

      // 更新列表
      setModels((prev) => prev.filter((m) => m.id !== model.id));

      setSuccess(`模型 "${model.name}" 已删除`);
      setIsLoading(false);
    } catch (err) {
      setError(
        `删除模型失败: ${err instanceof Error ? err.message : String(err)}`
      );
      setIsLoading(false);
    }
  };

  // 处理检查API密钥
  const handleCheckApiKey = async (
    apiKey: string,
    apiUrl: string,
    adapterType?: string
  ): Promise<boolean> => {
    try {
      console.log("检查API密钥，使用传入的值:", apiKey, apiUrl, adapterType);

      // 创建临时提供商对象，用于测试连接
      // 如果是编辑现有提供商，使用现有ID；如果是新增，使用临时ID
      const tempProvider: AiModelProvider = {
        id: currentProvider?.id || `temp-${Date.now()}`,
        name: currentProvider?.name || "临时提供商",
        enabled: true,
        apiKey,
        apiUrl,
        config: {
          ...(currentProvider?.config || {}),
          adapterType:
            adapterType || currentProvider?.config?.adapterType || "auto",
        },
        createdAt: currentProvider?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      console.log("使用临时提供商进行测试:", tempProvider);

      // 直接使用临时提供商对象进行测试，而不是先保存到数据库
      const result = await aiModelService.testProviderConnectionWithProvider(
        tempProvider
      );
      console.log("连接测试结果:", result);

      return result;
    } catch (error) {
      console.error("检查API密钥失败:", error);
      return false;
    }
  };

  // 处理获取所有模型
  const handleAddAllModels = async (providerId: string) => {
    try {
      setIsLoading(true);
      const newModels = await aiModelService.fetchModelsFromProvider(
        providerId
      );

      // 更新模型列表
      setModels((prev) => {
        // 移除该提供商的旧模型
        const filtered = prev.filter((m) => m.providerId !== providerId);
        // 添加新模型
        return [...filtered, ...newModels];
      });

      setSuccess(`已成功获取 ${newModels.length} 个模型`);
      setIsLoading(false);
    } catch (err) {
      setError(
        `获取模型失败: ${err instanceof Error ? err.message : String(err)}`
      );
      setIsLoading(false);
    }
  };

  // 处理提供商启用/禁用切换
  const handleToggleProviderEnabled = async (provider: AiModelProvider) => {
    try {
      setIsLoading(true);
      const updatedProvider = await aiModelService.updateProvider(provider.id, {
        enabled: !provider.enabled,
      });

      // 更新提供商列表
      setProviders((prev) =>
        prev.map((p) => (p.id === provider.id ? updatedProvider : p))
      );

      // 如果当前选中的是这个提供商，更新当前提供商
      if (selectedProviderId === provider.id) {
        setCurrentProvider(updatedProvider);
      }

      setSuccess(
        `提供商 "${updatedProvider.name}" 已${updatedProvider.enabled ? "启用" : "禁用"
        }`
      );
      setIsLoading(false);
    } catch (err) {
      setError(
        `更新提供商状态失败: ${err instanceof Error ? err.message : String(err)
        }`
      );
      setIsLoading(false);
    }
  };

  // 处理保存提供商
  const handleSaveProvider = async (
    provider: Omit<AiModelProvider, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      setIsLoading(true);

      let updatedProvider: AiModelProvider;

      if (currentProvider) {
        // 更新现有提供商
        updatedProvider = await aiModelService.updateProvider(
          currentProvider.id,
          provider
        );
        setSuccess(`提供商 "${updatedProvider.name}" 已更新`);
      } else {
        // 添加新提供商
        updatedProvider = await aiModelService.addProvider(provider);
        setSuccess(`提供商 "${updatedProvider.name}" 已添加`);
      }

      // 更新提供商列表
      setProviders((prev) => {
        if (currentProvider) {
          return prev.map((p) =>
            p.id === currentProvider.id ? updatedProvider : p
          );
        } else {
          return [...prev, updatedProvider];
        }
      });

      // 选中新添加/更新的提供商
      setSelectedProviderId(updatedProvider.id);
      setCurrentProvider(updatedProvider);

      setIsLoading(false);
    } catch (err) {
      setError(
        `保存提供商失败: ${err instanceof Error ? err.message : String(err)}`
      );
      setIsLoading(false);
    }
  };

  // 处理保存模型
  const handleSaveModel = async (
    model: Omit<AiModel, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      setIsLoading(true);

      let updatedModel: AiModel;

      if (currentModel && currentModel.id) {
        // 更新现有模型
        updatedModel = await aiModelService.updateModel(currentModel.id, model);
        setSuccess(`模型 "${updatedModel.name}" 已更新`);
      } else {
        // 添加新模型
        updatedModel = await aiModelService.addModel(model);
        setSuccess(`模型 "${updatedModel.name}" 已添加`);
      }

      // 更新模型列表
      setModels((prev) => {
        if (currentModel && currentModel.id) {
          return prev.map((m) => (m.id === currentModel.id ? updatedModel : m));
        } else {
          return [...prev, updatedModel];
        }
      });

      // 返回提供商详情
      setEditMode("provider");
      setCurrentModel(null);

      setIsLoading(false);
    } catch (err) {
      setError(
        `保存模型失败: ${err instanceof Error ? err.message : String(err)}`
      );
      setIsLoading(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    if (editMode === "model") {
      // 如果是取消编辑模型，返回到提供商详情页面
      setEditMode("none");
      setCurrentModel(null);
    } else {
      // 其他情况，返回到无编辑状态
      setEditMode("none");
      setCurrentModel(null);
    }
  };

  // 获取提供商的模型
  const getProviderModels = (providerId: string): AiModel[] => {
    return models.filter((model) => model.providerId === providerId);
  };

  // 过滤提供商列表
  const filteredProviders = providers.filter((provider) =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 渲染提供商列表
  const renderProviderList = () => {
    if (providers.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography color="text.secondary">暂无提供商</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditMode("provider");
              setCurrentProvider(null);
            }}
            sx={{ mt: 2 }}
          >
            添加提供商
          </Button>
        </Box>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ p: 1 }}>
          <TextField
            fullWidth
            placeholder="搜索提供商..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1 }}
          />
        </Box>

        <Box sx={{ flex: "1 1 auto", overflow: "auto" }}>
          <List
            component="nav"
            dense
            sx={{
              width: "100%",
              bgcolor: "background.paper",
            }}
          >
            {providers.map((provider) => {
              const isSelected = selectedProviderId === provider.id;
              const isDefaultProvider = defaultProviderId === provider.id;

              return (
                <ListItemButton
                  key={provider.id}
                  selected={isSelected}
                  onClick={() => handleSelectProvider(provider.id)}
                  sx={{
                    borderLeft: isSelected
                      ? "3px solid"
                      : "3px solid transparent",
                    borderColor: isSelected ? "primary.main" : "transparent",
                    pl: 2,
                    py: 1,
                  }}
                >
                  <ListItemText
                    primary={
                      <>
                        {provider.name}
                        {isDefaultProvider && (
                          <Chip
                            label="默认"
                            size="small"
                            color="primary"
                            icon={<StarIcon fontSize="small" />}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </>
                    }
                    primaryTypographyProps={{ fontSize: "0.9rem" }}
                  />
                  <Switch
                    size="small"
                    checked={provider.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleProviderEnabled(provider);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        <Box sx={{ p: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddProvider}
            fullWidth
            size="small"
          >
            添加提供商
          </Button>
        </Box>
      </Box>
    );
  };

  // 渲染详情面板
  const renderDetailPanel = () => {
    // 如果是模型编辑模式，显示模型编辑面板
    if (editMode === "model") {
      return (
        <Box sx={{ height: "100%", overflow: "auto" }}>
          <ModelPanel
            model={currentModel}
            providers={providers}
            providerId={selectedProviderId}
            onSave={handleSaveModel}
            onCancel={handleCancel}
          />
        </Box>
      );
    }

    // 如果有选中的提供商，显示提供商详情
    if (selectedProviderId) {
      const provider = providers.find((p) => p.id === selectedProviderId);
      if (provider) {
        const providerModels = getProviderModels(provider.id);
        return (
          <Box sx={{ height: "100%", overflow: "auto" }}>
            <ProviderPanel
              provider={provider}
              models={providerModels}
              onSave={handleSaveProvider}
              onFetchModels={() => loadData()}
              onAddModel={() => handleAddModel(provider.id)}
              onAddAllModels={() => handleAddAllModels(provider.id)}
              onEditModel={handleEditModel}
              onDeleteModel={handleDeleteModel}
              onCheckApiKey={handleCheckApiKey}
              onSetDefaultModel={handleSetDefaultModel}
              defaultModel={defaultModel}
            />
          </Box>
        );
      }
    }

    // 默认显示提示信息
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography color="text.secondary">
          请选择一个提供商或添加新提供商
        </Typography>
      </Box>
    );
  };

  // 修改渲染模型卡片的逻辑，显示当前默认模型的标记
  const renderModelCard = (model: AiModel) => {
    const isDefault = defaultModel &&
      defaultModel.providerId === model.providerId &&
      defaultModel.modelId === model.id;

    return (
      <Card key={model.id} sx={{ position: "relative" }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" component="div">
              {model.name}
              {isDefault && (
                <Chip
                  label="默认"
                  size="small"
                  color="primary"
                  icon={<StarIcon fontSize="small" />}
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>

            <Tooltip title={isDefault ? "当前默认模型" : "设为默认模型"}>
              <IconButton
                color={isDefault ? "primary" : "default"}
                onClick={() => handleSetDefaultModel(model)}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  bgcolor: "background.paper",
                  boxShadow: 1,
                  "&:hover": {
                    bgcolor: "action.hover",
                  }
                }}
              >
                {isDefault ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* 其他模型信息 */}
        </CardContent>

        {/* 卡片操作按钮 */}
      </Card>
    );
  };

  // 处理设置默认模型的操作
  const handleSetDefaultModel = async (model: AiModel) => {
    try {
      setIsLoading(true);

      // 调用服务设置默认模型
      await aiModelService.setDefaultModel(model);

      // 更新本地状态
      setDefaultModel({
        providerId: model.providerId,
        modelId: model.id
      });

      // 更新默认供应商状态
      setDefaultProviderId(model.providerId);

      // 显示成功消息
      setSuccess(`已将 "${model.name}" 设置为默认模型`);
    } catch (error) {
      setError(`设置默认模型失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          height: "calc(100vh - 200px)",
          minHeight: "500px",
        }}
      >
        <Box
          sx={{
            flex: { xs: "1 1 auto", md: "0 0 250px" },
            bgcolor: "background.paper",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {renderProviderList()}
        </Box>

        <Box
          sx={{
            flex: "1 1 auto",
            bgcolor: "background.paper",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {renderDetailPanel()}
        </Box>
      </Box>

      {/* 提供商对话框 */}
      <ProviderDialog
        open={providerDialogOpen}
        provider={currentProvider}
        onClose={handleCloseProviderDialog}
        onSave={handleSaveProvider}
        onCheckApiKey={handleCheckApiKey}
      />
    </Box>
  );
};

export default ModelServiceSettingsPage;
