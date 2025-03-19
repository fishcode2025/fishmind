import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Avatar,
  CircularProgress,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloudIcon from "@mui/icons-material/Cloud";
import { ServiceContainer } from "../../../services/ServiceContainer";
import { SERVICE_KEYS } from "../../../services/constants";
import { AiModel, AiModelProvider, Topic } from "../../../models/chat";
import { IChatService } from "../../../services/interfaces";
import ModelSearchDialog from "./ModelSearchDialog";

interface ModelSelectorProps {
  selectedAssistant?: { provider: AiModelProvider; model: AiModel } | null;
  currentTopicId?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedAssistant = null,
  currentTopicId = null,
}) => {
  // 状态管理
  const [loading, setLoading] = useState<boolean>(true);
  const [currentModel, setCurrentModel] = useState<AiModel | null>(null);
  const [currentProvider, setCurrentProvider] =
    useState<AiModelProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

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

  // 加载当前模型
  useEffect(() => {
    const loadCurrentModel = async () => {
      try {
        setLoading(true);
        // 获取 AiModelService
        const aiModelService =
          ServiceContainer.getInstance().getAiModelService();

        // 如果有选择的助手，优先使用助手的模型
        if (selectedAssistant) {
          console.log("使用助手指定的模型:", selectedAssistant);
          setCurrentModel(selectedAssistant.model);
          setCurrentProvider(selectedAssistant.provider);
        } else {
          // 否则加载系统当前模型
          const result = await aiModelService.getCurrentModel();
          if (result) {
            setCurrentModel(result.model);
            setCurrentProvider(result.provider);
          }
        }
      } catch (err) {
        console.error("加载模型失败", err);
        setError("加载模型失败");
      } finally {
        setLoading(false);
      }
    };

    loadCurrentModel();
  }, [selectedAssistant]); // 当 selectedAssistant 变化时重新加载

  // 获取模型显示名称
  const getDisplayName = () => {
    if (currentModel) {
      return currentModel.name;
    }
    return "选择模型";
  };

  // 获取模型图标
  const getModelIcon = () => {
    if (currentModel && currentProvider) {
      // 这里需要根据实际情况实现获取图标的逻辑
      // 可能需要根据提供商和模型信息来确定图标
      return "";
    }
    return "";
  };

  // 打开对话框
  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // 选择模型
  const handleSelectModel = async (providerId: string, modelId: string) => {
    try {
      setLoading(true);
      const aiModelService = ServiceContainer.getInstance().getAiModelService();

      // 获取模型详情
      const models = await aiModelService.getModelsByProvider(providerId);
      // 使用传入的 modelId 参数作为模型的 id 属性进行查找
      const model = models.find((m) => m.id === modelId);

      if (model) {
        console.log(
          `选择模型: ${model.name}, id=${model.id}, modelId=${model.modelId}`
        );

        // 设置当前模型
        await aiModelService.setCurrentModel(model);

        // 如果有当前话题ID，更新话题的模型配置
        if (currentTopicId) {
          console.log(`更新话题 ${currentTopicId} 的模型配置`);
          const chatService = ServiceContainer.getInstance().get<IChatService>(
            SERVICE_KEYS.CHAT
          );
          if (chatService) {
            // 获取当前话题
            const topic = await chatService.getTopic(currentTopicId);
            if (topic) {
              // 准备更新数据
              const updateData: Partial<Topic> = {
                lastModelId: model.id,
                lastProviderId: providerId,
              };

              // 如果话题有 currentConfig，更新它
              if (topic.currentConfig) {
                updateData.currentConfig = {
                  ...topic.currentConfig,
                  modelId: model.id,
                  providerId: providerId,
                };
              } else {
                // 如果话题没有 currentConfig，创建一个新的
                updateData.currentConfig = {
                  modelId: model.id,
                  providerId: providerId,
                };
              }

              console.log(`更新话题配置:`, updateData);

              // 更新话题
              await chatService.updateTopic(currentTopicId, updateData);
            }
          }
        }

        // 重新加载当前模型
        const result = await aiModelService.getCurrentModel();
        if (result) {
          setCurrentModel(result.model);
          setCurrentProvider(result.provider);
        }
      }

      // 关闭对话框
      setDialogOpen(false);
    } catch (err) {
      console.error("设置模型失败", err);
      setError("设置模型失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenDialog}
        sx={{
          display: "flex",
          alignItems: "center",
          textTransform: "none",
          color: "text.primary",
          ml: "auto", // 将按钮推到右侧
          "&:hover": {
            backgroundColor: "action.hover",
          },
        }}
      >
        {loading ? (
          <CircularProgress size={24} sx={{ mr: 1 }} />
        ) : (
          <Avatar
            src={getModelIcon()}
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
        )}
        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
          {loading ? "加载中..." : getDisplayName()}
        </Typography>
        <KeyboardArrowDownIcon fontSize="small" sx={{ ml: 0.5 }} />
      </Button>

      <ModelSearchDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSelectModel={handleSelectModel}
        currentModel={currentModel}
        currentProvider={currentProvider}
      />
    </>
  );
};

export default ModelSelector;
