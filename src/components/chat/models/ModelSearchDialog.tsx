import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Avatar,
  Typography,
  Box,
  Divider,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import LightModeIcon from "@mui/icons-material/LightMode";
import CloudIcon from "@mui/icons-material/Cloud";
import { ServiceContainer } from "../../../services/ServiceContainer";
import { AiModel, AiModelProvider } from "../../../models/chat";

interface ModelSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectModel: (providerId: string, modelId: string) => void;
  currentModel?: AiModel | null;
  currentProvider?: AiModelProvider | null;
}

const ModelSearchDialog: React.FC<ModelSearchDialogProps> = ({
  open,
  onClose,
  onSelectModel,
  currentModel,
  currentProvider,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [providers, setProviders] = useState<AiModelProvider[]>([]);
  const [models, setModels] = useState<Map<string, AiModel[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // 加载所有提供商和模型
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        const aiModelService =
          ServiceContainer.getInstance().getAiModelService();
        const allProviders = await aiModelService.getEnabledProviders();
        setProviders(allProviders);

        // 加载每个提供商的模型
        const modelsMap = new Map<string, AiModel[]>();
        for (const provider of allProviders) {
          const providerModels = await aiModelService.getModelsByProvider(
            provider.id
          );
          modelsMap.set(provider.id, providerModels);
        }
        setModels(modelsMap);
      } catch (err) {
        console.error("加载模型提供商失败", err);
        setError("加载模型提供商失败");
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadProviders();
    }
  }, [open]);

  // 处理搜索输入
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  // 过滤模型
  const filterModels = (
    provider: AiModelProvider,
    providerModels: AiModel[]
  ) => {
    if (!searchTerm) return providerModels;

    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    // 如果搜索词匹配提供商名称，返回所有模型
    if (provider.name.toLowerCase().includes(lowerSearchTerm)) {
      return providerModels;
    }

    // 否则，只返回名称匹配的模型
    return providerModels.filter((model) => {
      // 搜索模型名称
      if (model.name.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }

      // 搜索模型ID
      if (model.id.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }

      // 搜索模型分组
      if (model.groupId.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }

      return false;
    });
  };

  // 检查是否有搜索结果
  const hasSearchResults = () => {
    return providers.some((provider) => {
      const providerModels = models.get(provider.id) || [];
      const filteredModels = filterModels(provider, providerModels);
      return filteredModels.length > 0;
    });
  };

  // 检查模型是否为当前选中的模型
  const isCurrentModel = (providerId: string, modelId: string) => {
    return currentProvider?.id === providerId && currentModel?.id === modelId;
  };

  // 获取模型图标
  const getModelIcon = (model: AiModel) => {
    // 这里需要根据实际情况实现获取图标的逻辑
    return "";
  };

  // 获取提供商图标
  const getProviderIcon = (providerId: string) => {
    // 这里需要根据实际情况实现获取图标的逻辑
    return "";
  };

  // 检查模型是否为最新版本
  const isLatestVersion = (modelId: string) => {
    return modelId.includes(":latest");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "80vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6">选择模型</Typography>
        <IconButton edge="end" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 2 }}>
        <TextField
          fullWidth
          placeholder="搜索模型或提供商..."
          value={searchTerm}
          onChange={handleSearchChange}
          variant="outlined"
          size="small"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (searchTerm) {
                handleClearSearch();
              } else {
                onClose();
              }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  edge="end"
                  aria-label="clear search"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />
        {searchTerm && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 0.5,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {hasSearchResults()
                ? `搜索结果: "${searchTerm}"`
                : `没有找到匹配 "${searchTerm}" 的结果`}
            </Typography>
            {hasSearchResults() && (
              <Typography variant="caption" color="text.secondary">
                按 ESC 清除搜索
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <DialogContent sx={{ pt: 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center" sx={{ py: 2 }}>
            {error}
          </Typography>
        ) : (
          <List sx={{ pt: 0 }}>
            {providers.map((provider) => {
              const providerModels = models.get(provider.id) || [];
              const filteredModels = filterModels(provider, providerModels);

              // 如果没有匹配的模型，不显示此提供商
              if (filteredModels.length === 0) return null;

              return (
                <React.Fragment key={provider.id}>
                  <ListItem sx={{ py: 1 }}>
                    <Avatar
                      src={getProviderIcon(provider.id)}
                      sx={{
                        width: 28,
                        height: 28,
                        bgcolor: "transparent",
                        mr: 1,
                      }}
                    >
                      <CloudIcon fontSize="small" />
                    </Avatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight="bold">
                          {provider.name}
                          {searchTerm &&
                            provider.name
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) && (
                              <Box
                                component="span"
                                sx={{
                                  ml: 1,
                                  color: "primary.main",
                                  fontSize: "0.8rem",
                                }}
                              >
                                (匹配)
                              </Box>
                            )}
                        </Typography>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />

                  {filteredModels.map((model) => (
                    <ListItem key={model.id} disablePadding>
                      <ListItemButton
                        onClick={() => onSelectModel(provider.id, model.id)}
                        selected={isCurrentModel(provider.id, model.id)}
                        sx={{
                          py: 1.5,
                          "&.Mui-selected": {
                            backgroundColor: "action.selected",
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            src={getModelIcon(model)}
                            sx={{
                              width: 24,
                              height: 24,
                              bgcolor: "transparent",
                            }}
                          >
                            <CloudIcon fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Typography variant="body1">
                                {model.name}
                                {searchTerm &&
                                  !provider.name
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase()) &&
                                  model.name
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase()) && (
                                    <Box
                                      component="span"
                                      sx={{
                                        ml: 1,
                                        color: "primary.main",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      (匹配)
                                    </Box>
                                  )}
                              </Typography>
                              {isLatestVersion(model.id) && (
                                <LightModeIcon
                                  color="primary"
                                  fontSize="small"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          }
                        />
                        {isCurrentModel(provider.id, model.id) && (
                          <CheckIcon color="primary" />
                        )}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </React.Fragment>
              );
            })}

            {providers.length === 0 && (
              <Typography align="center" sx={{ py: 4 }}>
                没有启用的模型提供商。请在设置中启用至少一个提供商。
              </Typography>
            )}

            {providers.length > 0 && searchTerm && !hasSearchResults() && (
              <Typography align="center" sx={{ py: 4 }}>
                没有找到匹配"{searchTerm}"的模型或提供商。
              </Typography>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModelSearchDialog;
