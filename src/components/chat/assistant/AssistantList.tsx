import React, { useState, useEffect } from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
  Paper,
  IconButton,
  InputBase,
  Tooltip,
  Chip,
  alpha,
  Button,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { AiModel, AiModelProvider } from "../../../models/chat";
import { ServiceContainer } from "../../../services/ServiceContainer";
import { SERVICE_KEYS } from "../../../services/constants";
import { IChatService } from "../../../services/interfaces";
import { Assistant } from "../../../models/chat";
import { IAiModelService } from "../../../services/interfaces";

interface AssistantListProps {
  onSelectAssistant: (assistant: {
    provider: AiModelProvider;
    model: AiModel;
  }) => void;
  selectedAssistant: { provider: AiModelProvider; model: AiModel } | null;
  onCreateAssistant?: () => void;
  onAssistantSelected?: (assistantId: string, assistantName: string) => void;
}

const AssistantList: React.FC<AssistantListProps> = ({
  onSelectAssistant,
  selectedAssistant,
  onCreateAssistant,
  onAssistantSelected,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerMap, setProviderMap] = useState<
    Record<string, AiModelProvider>
  >({});
  const [modelMap, setModelMap] = useState<Record<string, AiModel>>({});

  // 获取助手列表
  useEffect(() => {
    const loadAssistants = async () => {
      try {
        const serviceContainer = ServiceContainer.getInstance();
        const chatService = serviceContainer.get<IChatService>(
          SERVICE_KEYS.CHAT
        );
        const aiModelService = serviceContainer.get<IAiModelService>(
          SERVICE_KEYS.AI_MODEL
        );

        if (!chatService || !aiModelService) {
          throw new Error("服务未初始化");
        }

        const assistantList = await chatService.getAllAssistants();
        // console.log("加载到的助手列表:", assistantList);

        const defaultModel = await aiModelService.getDefaultModel();
        // console.log("获取到的默认模型:", defaultModel);

        const updatedAssistants = assistantList.map((assistant) => {
          if (!assistant.providerId || !assistant.modelId) {
            // console.log("发现缺少 providerId 或 modelId 的助手:", assistant);

            // 如果没有默认模型，则保持原样
            if (!defaultModel) {
              // console.log("没有默认模型可用，保持助手原样:", assistant);
              return assistant;
            }

            // 如果有默认模型，使用默认值
            const updatedAssistant = {
              ...assistant,
              providerId: defaultModel.provider.id,
              modelId: defaultModel.model.id,
            };

            // console.log("更新后的助手:", updatedAssistant);
            return updatedAssistant;
          }
          return assistant;
        });

        // console.log("更新后的助手列表:", updatedAssistants);

        // 检查是否所有助手都有有效的 providerId 和 modelId
        const invalidAssistants = updatedAssistants.filter(
          (assistant) => !assistant.providerId || !assistant.modelId
        );

        if (invalidAssistants.length > 0) {
          console.warn(
            "仍有助手缺少 providerId 或 modelId:",
            invalidAssistants
          );
        } else {
          // console.log("所有助手都有有效的 providerId 和 modelId");
        }

        setAssistants(updatedAssistants);
      } catch (error) {
        console.error("加载助手失败:", error);
        setError(error instanceof Error ? error.message : "加载助手失败");
      } finally {
        setLoading(false);
      }
    };

    loadAssistants();
  }, []);

  // 在 useEffect 中加载 providers 和 models
  useEffect(() => {
    const loadProvidersAndModels = async () => {
      try {
        const serviceContainer = ServiceContainer.getInstance();
        const aiModelService = serviceContainer.get<IAiModelService>(
          SERVICE_KEYS.AI_MODEL
        );

        if (!aiModelService) {
          throw new Error("AI模型服务未初始化");
        }

        // 获取所有提供商
        const providers = await aiModelService.getAllProviders();
        // console.log(
        //   "加载到的提供商:",
        //   providers.map((p) => ({ id: p.id, name: p.name }))
        // );

        const providerMapping: Record<string, AiModelProvider> = {};
        const modelMapping: Record<string, AiModel> = {};

        // 构建提供商映射
        for (const provider of providers) {
          providerMapping[provider.id] = provider;
          // console.log(`处理提供商: ${provider.id}, ${provider.name}`);

          // 获取该提供商的所有模型
          const models = await aiModelService.getModelsByProvider(provider.id);
          // console.log(
          //   `提供商 ${provider.id} 的模型:`,
          //   models.map((m) => ({ id: m.id, name: m.name }))
          // );

          // 构建模型映射
          for (const model of models) {
            modelMapping[model.id] = model;
            // console.log(`添加模型映射: ${model.id} -> ${model.name}`);

            // 同时添加 modelId 作为键，以防助手使用的是 modelId 而不是 id
            if (model.modelId && model.modelId !== model.id) {
              modelMapping[model.modelId] = model;
              // console.log(
              //   `为模型添加额外映射: ${model.modelId} -> ${model.name}`
              // );
            }
          }
        }

        // console.log("提供商映射:", providerMapping);
        // console.log("模型映射:", modelMapping);

        setProviderMap(providerMapping);
        setModelMap(modelMapping);
      } catch (err) {
        console.error("加载提供商和模型失败:", err);
        setError(err instanceof Error ? err.message : "加载提供商和模型失败");
      }
    };

    loadProvidersAndModels();
  }, []);

  // 过滤助手列表
  const filteredAssistants = assistants.filter((assistant) => {
    const query = searchQuery.toLowerCase();
    return (
      assistant.name.toLowerCase().includes(query) ||
      assistant.description?.toLowerCase().includes(query) ||
      assistant.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const handleCreateAssistant = () => {
    // Implementation of handleCreateAssistant
  };

  // 修改助手点击处理函数
  const handleAssistantClick = (
    provider: AiModelProvider,
    model: AiModel,
    assistantId: string,
    assistantName: string
  ) => {
    if (provider.enabled) {
      onSelectAssistant({ provider, model });

      // 确保调用onAssistantSelected回调
      if (onAssistantSelected) {
        // console.log(
        //   `选择助手: ${assistantId}, 名称: ${assistantName}, 将创建新话题`
        // );
        onAssistantSelected(assistantId, assistantName);
      }
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 头部区域 */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {/* 标题和创建按钮 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            AI助手
          </Typography>
          <Tooltip title="创建新助手">
            <IconButton
              size="small"
              onClick={onCreateAssistant}
              sx={{
                p: 0.5,
                "&:hover": {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 搜索框 */}
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1.5,
            py: 0.5,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} />
          <InputBase
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索助手..."
            sx={{
              flex: 1,
              fontSize: "0.875rem",
              "& .MuiInputBase-input": {
                py: 0.5,
              },
            }}
          />
          {searchQuery && (
            <IconButton
              size="small"
              onClick={() => setSearchQuery("")}
              sx={{ p: 0.5 }}
            >
              <ClearIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Paper>
      </Box>

      {/* 助手列表 */}
      <List sx={{ flex: 1, overflowX: "hidden", py: 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          </Box>
        ) : filteredAssistants.length === 0 ? (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography color="textSecondary" variant="body2">
              没有找到助手
            </Typography>
          </Box>
        ) : (
          filteredAssistants.map((assistant) => {
            // console.log(`渲染助手: ${assistant.id}, providerId: ${assistant.providerId}, modelId: ${assistant.modelId}`);

            // 确保 providerId 和 modelId 存在
            if (!assistant.providerId || !assistant.modelId) {
              console.warn("助手缺少 providerId 或 modelId:", assistant);
              // console.log("当前选中的助手信息:", selectedAssistant);

              // 尝试使用当前选中的模型
              if (selectedAssistant) {
                //   console.log("使用当前选中的模型:", {
                //     providerId: selectedAssistant.provider.id,
                //     providerName: selectedAssistant.provider.name,
                //     modelId: selectedAssistant.model.id,
                //     modelName: selectedAssistant.model.name,
                //   }
                // );

                // 使用当前选中的模型和供应商
                const provider = selectedAssistant.provider;
                const model = selectedAssistant.model;
                const isSelected = selectedAssistant?.model.id === model.id;

                return (
                  <ListItem
                    key={assistant.id}
                    disablePadding
                    sx={{
                      borderLeft: "3px solid",
                      borderLeftColor: isSelected
                        ? "primary.main"
                        : "transparent",
                      my: isSelected ? 0.5 : 0,
                    }}
                  >
                    <ListItemButton
                      onClick={() =>
                        handleAssistantClick(
                          provider,
                          model,
                          assistant.id,
                          assistant.name
                        )
                      }
                      sx={{
                        py: 1.5,
                        px: 2,
                        opacity: provider.enabled ? 1 : 0.7,
                        cursor: provider.enabled ? "pointer" : "default",
                        position: "relative",
                        transition: "all 0.2s ease-in-out",

                        ...(isSelected && {
                          bgcolor: (theme) =>
                            alpha(theme.palette.primary.main, 0.08),
                          boxShadow: (theme) =>
                            `0 2px 8px ${alpha(
                              theme.palette.primary.main,
                              0.15
                            )}`,
                          transform: "translateX(2px)",
                          borderRadius: "4px",
                          border: (theme) =>
                            `1px solid ${alpha(
                              theme.palette.primary.main,
                              0.2
                            )}`,
                          borderLeft: "none",
                        }),

                        "&:hover": {
                          bgcolor: (theme) =>
                            provider.enabled
                              ? isSelected
                                ? alpha(theme.palette.primary.main, 0.12)
                                : alpha(theme.palette.primary.main, 0.04)
                              : "transparent",
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 0.5,
                              transform: isSelected
                                ? "translateX(4px)"
                                : "none",
                              transition: "transform 0.2s ease-in-out",
                            }}
                          >
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: isSelected ? 600 : 400,
                                color: provider.enabled
                                  ? isSelected
                                    ? "primary.main"
                                    : "text.primary"
                                  : "text.secondary",
                              }}
                            >
                              {assistant.name}
                            </Typography>
                            <Chip
                              label={model.name}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.75rem",
                                bgcolor: (theme) =>
                                  alpha(
                                    provider.enabled
                                      ? theme.palette.primary.main
                                      : theme.palette.warning.main,
                                    isSelected ? 0.12 : 0.08
                                  ),
                                color: provider.enabled
                                  ? isSelected
                                    ? "primary.dark"
                                    : "primary.main"
                                  : "warning.main",
                                fontWeight: isSelected ? 500 : 400,
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                              transform: isSelected
                                ? "translateX(4px)"
                                : "none",
                              transition: "transform 0.2s ease-in-out",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "0.75rem",
                                color: provider.enabled
                                  ? isSelected
                                    ? "text.primary"
                                    : "text.secondary"
                                  : "text.disabled",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {assistant.description}
                            </Typography>

                            {!provider.enabled && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  mt: 0.5,
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: (theme) =>
                                    alpha(theme.palette.warning.main, 0.08),
                                }}
                              >
                                <WarningAmberIcon
                                  sx={{
                                    fontSize: 16,
                                    color: "warning.main",
                                  }}
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "warning.main",
                                      display: "block",
                                      mb: 0.5,
                                    }}
                                  >
                                    需要配置 {provider.name} 访问权限
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              } else {
                console.log("没有默认模型可用，不显示此助手");
                return null; // 如果没有默认模型，则不显示此助手
              }
            }

            const provider = providerMap[assistant.providerId];
            const model = modelMap[assistant.modelId];

            // 如果没有找到对应的 provider 或 model，尝试使用默认模型
            if (!provider || !model) {
              console.warn("未找到对应的提供商或模型:", {
                assistantId: assistant.id,
                assistantName: assistant.name,
                providerId: assistant.providerId,
                modelId: assistant.modelId,
                providerFound: !!provider,
                modelFound: !!model,
                availableProviders: Object.keys(providerMap),
                availableModels: Object.keys(modelMap),
              });

              // 尝试使用当前选中的模型
              if (selectedAssistant) {
                console.log("尝试使用当前选中的模型作为回退:", {
                  providerId: selectedAssistant.provider.id,
                  providerName: selectedAssistant.provider.name,
                  modelId: selectedAssistant.model.id,
                  modelName: selectedAssistant.model.name,
                });

                const fallbackProvider = selectedAssistant.provider;
                const fallbackModel = selectedAssistant.model;
                const isSelected =
                  selectedAssistant?.model.id === fallbackModel.id;

                // 使用当前选中的模型和供应商渲染助手
                return (
                  <ListItem
                    key={assistant.id}
                    disablePadding
                    sx={{
                      borderLeft: "3px solid",
                      borderLeftColor: isSelected
                        ? "primary.main"
                        : "transparent",
                      my: isSelected ? 0.5 : 0,
                    }}
                  >
                    <ListItemButton
                      onClick={() =>
                        handleAssistantClick(
                          fallbackProvider,
                          fallbackModel,
                          assistant.id,
                          assistant.name
                        )
                      }
                      sx={{
                        py: 1.5,
                        px: 2,
                        opacity: fallbackProvider.enabled ? 1 : 0.7,
                        cursor: fallbackProvider.enabled
                          ? "pointer"
                          : "default",
                        position: "relative",
                        transition: "all 0.2s ease-in-out",

                        ...(isSelected && {
                          bgcolor: (theme) =>
                            alpha(theme.palette.primary.main, 0.08),
                          boxShadow: (theme) =>
                            `0 2px 8px ${alpha(
                              theme.palette.primary.main,
                              0.15
                            )}`,
                          transform: "translateX(2px)",
                          borderRadius: "4px",
                          border: (theme) =>
                            `1px solid ${alpha(
                              theme.palette.primary.main,
                              0.2
                            )}`,
                          borderLeft: "none",
                        }),

                        "&:hover": {
                          bgcolor: (theme) =>
                            fallbackProvider.enabled
                              ? isSelected
                                ? alpha(theme.palette.primary.main, 0.12)
                                : alpha(theme.palette.primary.main, 0.04)
                              : "transparent",
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 0.5,
                              transform: isSelected
                                ? "translateX(4px)"
                                : "none",
                              transition: "transform 0.2s ease-in-out",
                            }}
                          >
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: isSelected ? 600 : 400,
                                color: fallbackProvider.enabled
                                  ? isSelected
                                    ? "primary.main"
                                    : "text.primary"
                                  : "text.secondary",
                              }}
                            >
                              {assistant.name}
                            </Typography>
                            <Chip
                              label={fallbackModel.name}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.75rem",
                                bgcolor: (theme) =>
                                  alpha(
                                    fallbackProvider.enabled
                                      ? theme.palette.primary.main
                                      : theme.palette.warning.main,
                                    isSelected ? 0.12 : 0.08
                                  ),
                                color: fallbackProvider.enabled
                                  ? isSelected
                                    ? "primary.dark"
                                    : "primary.main"
                                  : "warning.main",
                                fontWeight: isSelected ? 500 : 400,
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                              transform: isSelected
                                ? "translateX(4px)"
                                : "none",
                              transition: "transform 0.2s ease-in-out",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "0.75rem",
                                color: fallbackProvider.enabled
                                  ? isSelected
                                    ? "text.primary"
                                    : "text.secondary"
                                  : "text.disabled",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {assistant.description}
                            </Typography>

                            {!fallbackProvider.enabled && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  mt: 0.5,
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: (theme) =>
                                    alpha(theme.palette.warning.main, 0.08),
                                }}
                              >
                                <WarningAmberIcon
                                  sx={{
                                    fontSize: 16,
                                    color: "warning.main",
                                  }}
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "warning.main",
                                      display: "block",
                                      mb: 0.5,
                                    }}
                                  >
                                    需要配置 {fallbackProvider.name} 访问权限
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              }

              return null;
            }

            const isSelected =
              selectedAssistant?.model.id === assistant.modelId;

            return (
              <ListItem
                key={assistant.id}
                disablePadding
                sx={{
                  borderLeft: "3px solid",
                  borderLeftColor: isSelected ? "primary.main" : "transparent",
                  my: isSelected ? 0.5 : 0,
                }}
              >
                <ListItemButton
                  onClick={() =>
                    handleAssistantClick(
                      provider,
                      model,
                      assistant.id,
                      assistant.name
                    )
                  }
                  sx={{
                    py: 1.5,
                    px: 2,
                    opacity: provider.enabled ? 1 : 0.7,
                    cursor: provider.enabled ? "pointer" : "default",
                    position: "relative",
                    transition: "all 0.2s ease-in-out",

                    ...(isSelected && {
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.08),
                      boxShadow: (theme) =>
                        `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
                      transform: "translateX(2px)",
                      borderRadius: "4px",
                      border: (theme) =>
                        `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      borderLeft: "none",
                    }),

                    "&:hover": {
                      bgcolor: (theme) =>
                        provider.enabled
                          ? isSelected
                            ? alpha(theme.palette.primary.main, 0.12)
                            : alpha(theme.palette.primary.main, 0.04)
                          : "transparent",
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                          transform: isSelected ? "translateX(4px)" : "none",
                          transition: "transform 0.2s ease-in-out",
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: isSelected ? 600 : 400,
                            color: provider.enabled
                              ? isSelected
                                ? "primary.main"
                                : "text.primary"
                              : "text.secondary",
                          }}
                        >
                          {assistant.name}
                        </Typography>
                        <Chip
                          label={model.name}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.75rem",
                            bgcolor: (theme) =>
                              alpha(
                                provider.enabled
                                  ? theme.palette.primary.main
                                  : theme.palette.warning.main,
                                isSelected ? 0.12 : 0.08
                              ),
                            color: provider.enabled
                              ? isSelected
                                ? "primary.dark"
                                : "primary.main"
                              : "warning.main",
                            fontWeight: isSelected ? 500 : 400,
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                          transform: isSelected ? "translateX(4px)" : "none",
                          transition: "transform 0.2s ease-in-out",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.75rem",
                            color: provider.enabled
                              ? isSelected
                                ? "text.primary"
                                : "text.secondary"
                              : "text.disabled",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {assistant.description}
                        </Typography>

                        {!provider.enabled && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mt: 0.5,
                              p: 1,
                              borderRadius: 1,
                              bgcolor: (theme) =>
                                alpha(theme.palette.warning.main, 0.08),
                            }}
                          >
                            <WarningAmberIcon
                              sx={{
                                fontSize: 16,
                                color: "warning.main",
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "warning.main",
                                  display: "block",
                                  mb: 0.5,
                                }}
                              >
                                需要配置 {provider.name} 访问权限
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })
        )}
      </List>
    </Box>
  );
};

export default AssistantList;
