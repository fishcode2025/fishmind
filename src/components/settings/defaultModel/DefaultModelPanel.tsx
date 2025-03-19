import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Avatar,
  Snackbar,
  Alert,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloudIcon from "@mui/icons-material/Cloud";
import ModelSearchDialog from "../../chat/models/ModelSearchDialog";
import { ServiceContainer } from "../../../services/ServiceContainer";
import { AiModel, AiModelProvider } from "../../../models/chat";
import { ConfigService } from "../../../services/system/ConfigService";

// 默认模型类型
export type DefaultModelType = "assistant" | "topicNaming" | "translation";

// 默认模型配置
export interface DefaultModelConfig {
  providerId: string;
  modelId: string;
  name: string;
}

const DefaultModelPanel: React.FC = () => {
  const configService = ConfigService.getInstance();

  // 默认模型配置
  const [defaultModels, setDefaultModels] = useState<
    Record<DefaultModelType, DefaultModelConfig>
  >({
    assistant: { providerId: "", modelId: "", name: "加载中..." },
    topicNaming: { providerId: "", modelId: "", name: "加载中..." },
    translation: { providerId: "", modelId: "", name: "加载中..." },
  });

  // 可用的模型提供商
  const [availableProviders, setAvailableProviders] = useState<
    AiModelProvider[]
  >([]);

  // 模型搜索对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentModelType, setCurrentModelType] =
    useState<DefaultModelType | null>(null);

  // 当前选中的模型和提供商
  const [currentModel, setCurrentModel] = useState<AiModel | null>(null);
  const [currentProvider, setCurrentProvider] =
    useState<AiModelProvider | null>(null);

  // 所有模型的映射
  const [modelsMap, setModelsMap] = useState<Map<string, AiModel[]>>(new Map());

  // 通知消息
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // 是否为暗黑模式
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 检测暗黑模式
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener("change", handleChange);
    return () => {
      darkModeMediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // 加载模型提供商
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const aiModelService =
          ServiceContainer.getInstance().getAiModelService();
        const providers = await aiModelService.getEnabledProviders();
        setAvailableProviders(providers);

        // 加载每个提供商的模型
        const modelsMap = new Map<string, AiModel[]>();
        for (const provider of providers) {
          const providerModels = await aiModelService.getModelsByProvider(
            provider.id
          );
          modelsMap.set(provider.id, providerModels);
        }
        setModelsMap(modelsMap);
      } catch (error) {
        console.error("加载模型提供商失败", error);
        showNotification("加载模型提供商失败", "error");
      }
    };

    loadProviders();
  }, []);

  // 获取推荐的默认模型
  const getRecommendedDefaultModel = (
    type: DefaultModelType
  ): DefaultModelConfig | null => {
    if (availableProviders.length === 0) return null;

    // 根据不同类型推荐不同的模型
    let recommendedProvider: AiModelProvider | undefined;
    let recommendedModel: AiModel | undefined;

    if (type === "assistant") {
      recommendedProvider = availableProviders.find(
        (p) => p.id === "deepseek" && p.enabled
      );
      if (recommendedProvider) {
        const models = modelsMap.get(recommendedProvider.id) || [];
        recommendedModel = models.find((m) => m.modelId === "deepseek-r1");
      }
    } else if (type === "topicNaming") {
      recommendedProvider = availableProviders.find(
        (p) => p.id === "qwen" && p.enabled
      );
      if (recommendedProvider) {
        const models = modelsMap.get(recommendedProvider.id) || [];
        recommendedModel = models.find(
          (m) => m.modelId === "Qwen2.5-7B-Instruct"
        );
      }
    } else if (type === "translation") {
      recommendedProvider = availableProviders.find(
        (p) => p.id === "meta-llama" && p.enabled
      );
      if (recommendedProvider) {
        const models = modelsMap.get(recommendedProvider.id) || [];
        recommendedModel = models.find(
          (m) => m.modelId === "Llama-3.3-70B-Instruct"
        );
      }
    }

    // 如果找不到推荐的模型，使用第一个启用的提供商的第一个模型
    if (!recommendedProvider || !recommendedModel) {
      recommendedProvider = availableProviders.find((p) => p.enabled);
      if (recommendedProvider) {
        const models = modelsMap.get(recommendedProvider.id) || [];
        if (models.length > 0) {
          recommendedModel = models[0];
        }
      }
    }

    return recommendedProvider && recommendedModel
      ? {
          providerId: recommendedProvider.id,
          modelId: recommendedModel.id,
          name: recommendedModel.name,
        }
      : null;
  };

  // 加载默认模型配置
  useEffect(() => {
    const loadDefaultModels = async () => {
      try {
        const userSettings = configService.getUserSettings();
        const defaultModels = userSettings.models.defaultModels;

        // 设置所有默认模型
        setDefaultModels({
          assistant: defaultModels.assistant ||
            getRecommendedDefaultModel("assistant") || {
              providerId: "",
              modelId: "",
              name: "请选择模型",
            },
          topicNaming: defaultModels.topicNaming ||
            getRecommendedDefaultModel("topicNaming") || {
              providerId: "",
              modelId: "",
              name: "请选择模型",
            },
          translation: defaultModels.translation ||
            getRecommendedDefaultModel("translation") || {
              providerId: "",
              modelId: "",
              name: "请选择模型",
            },
        });
      } catch (error) {
        console.error("加载默认模型配置失败", error);
        showNotification("加载默认模型配置失败", "error");
      }
    };

    if (availableProviders.length > 0 && modelsMap.size > 0) {
      loadDefaultModels();
    }
  }, [availableProviders, modelsMap]);

  // 保存默认模型配置
  const saveDefaultModel = async (
    type: DefaultModelType,
    providerId: string,
    modelId: string
  ) => {
    try {
      const provider = availableProviders.find((p) => p.id === providerId);
      const models = modelsMap.get(providerId) || [];
      const model = models.find((m) => m.id === modelId);

      if (!provider || !model) {
        throw new Error("无效的模型或提供商");
      }

      // 获取当前设置
      const currentSettings = configService.getUserSettings();
      const newModelConfig = {
        providerId,
        modelId,
        name: model.name,
      };

      // 更新对应类型的默认模型
      await configService.updateUserSettings({
        models: {
          ...currentSettings.models,
          defaultModels: {
            ...currentSettings.models.defaultModels,
            [type]: newModelConfig,
          },
        },
      });

      // 更新本地状态
      setDefaultModels((prev) => ({
        ...prev,
        [type]: newModelConfig,
      }));

      showNotification("默认模型设置已保存", "success");
    } catch (error) {
      console.error("保存默认模型失败", error);
      showNotification("保存默认模型失败", "error");
    }
  };

  // 打开模型选择对话框
  const handleOpenDialog = (type: DefaultModelType) => {
    setCurrentModelType(type);

    // 设置当前选中的模型和提供商
    const modelConfig = defaultModels[type];
    if (modelConfig.providerId && modelConfig.modelId) {
      const provider = availableProviders.find(
        (p) => p.id === modelConfig.providerId
      );
      if (provider) {
        setCurrentProvider(provider);

        const models = modelsMap.get(provider.id) || [];
        const model = models.find((m) => m.id === modelConfig.modelId);
        if (model) {
          setCurrentModel(model);
        }
      }
    }

    setDialogOpen(true);
  };

  // 关闭模型选择对话框
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentModelType(null);
  };

  // 选择模型
  const handleSelectModel = (providerId: string, modelId: string) => {
    if (currentModelType) {
      saveDefaultModel(currentModelType, providerId, modelId);
      handleCloseDialog();
    }
  };

  // 显示通知
  const showNotification = (message: string, severity: "success" | "error") => {
    setNotification({ open: true, message, severity });
  };

  // 关闭通知
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // 获取模型图标
  const getModelIcon = (providerId: string, modelId: string) => {
    // 这里需要根据实际情况实现获取图标的逻辑
    return "";
  };

  // 渲染模型选择器
  const renderModelSelector = (
    type: DefaultModelType,
    label: string,
    description: string
  ) => {
    const modelConfig = defaultModels[type];

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>

        <Button
          onClick={() => handleOpenDialog(type)}
          variant="outlined"
          sx={{
            display: "flex",
            alignItems: "center",
            textTransform: "none",
            borderColor: "divider",
            px: 2,
            py: 1,
          }}
        >
          <Avatar
            src={getModelIcon(modelConfig.providerId, modelConfig.modelId)}
            sx={{
              width: 24,
              height: 24,
              fontSize: "0.75rem",
              bgcolor: "transparent",
              mr: 1,
            }}
          >
            <CloudIcon fontSize="small" />
          </Avatar>
          <Typography variant="body2" sx={{ flexGrow: 1, textAlign: "left" }}>
            {modelConfig.name || "请选择模型"}
          </Typography>
          <KeyboardArrowDownIcon fontSize="small" sx={{ ml: 1 }} />
        </Button>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        默认模型设置
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        为不同功能设置默认使用的AI模型
      </Typography>

      {renderModelSelector(
        "assistant",
        "对话助手",
        "设置新建对话时默认使用的AI模型"
      )}

      {renderModelSelector(
        "topicNaming",
        "话题命名",
        "设置自动为对话生成标题时使用的AI模型"
      )}

      {renderModelSelector("translation", "翻译", "设置翻译功能使用的AI模型")}

      <ModelSearchDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSelectModel={handleSelectModel}
        currentModel={currentModel}
        currentProvider={currentProvider}
      />

      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DefaultModelPanel;
