import React, { useState, useEffect, useMemo } from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Divider,
  CircularProgress,
  Box,
  IconButton,
  Tooltip,
  alpha,
  InputBase,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import SettingsIcon from "@mui/icons-material/Settings";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Topic } from "../../../models/chat";
import { ServiceContainer } from "../../../services/ServiceContainer";
import { SERVICE_KEYS } from "../../../services/constants";
import { IChatService } from "../../../services/interfaces";
import { configService } from "../../../services/system/ConfigService";
import modelService, { modelIconService } from "../../../services/modelService";
import { useTheme } from "@mui/material/styles";

interface TopicListProps {
  onSelectTopic?: (topic: Topic) => void;
  selectedTopicId?: string;
  currentAssistantName?: string;
  currentAssistantId?: string;
}

const TopicList: React.FC<TopicListProps> = ({
  onSelectTopic,
  selectedTopicId,
  currentAssistantName,
  currentAssistantId,
}) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatService, setChatService] = useState<IChatService | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();

  // 新增：重命名对话框状态
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");

  // 新增：删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 新增：保存要操作的话题
  const [topicToRename, setTopicToRename] = useState<Topic | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);

  // 添加属性日志
  useEffect(() => {
    console.log("TopicList 组件属性:", {
      selectedTopicId,
      currentAssistantName,
      currentAssistantId,
      hasSelectTopicHandler: !!onSelectTopic,
    });
  }, [
    selectedTopicId,
    currentAssistantName,
    currentAssistantId,
    onSelectTopic,
  ]);

  // 初始化服务
  useEffect(() => {
    const serviceContainer = ServiceContainer.getInstance();
    try {
      const service = serviceContainer.get<IChatService>("chatService");
      setChatService(service);
    } catch (err) {
      console.error("获取聊天服务失败:", err);
      setError("获取聊天服务失败，请稍后重试");
    }
  }, []);

  // 辅助函数：按更新时间排序话题
  const sortTopicsByUpdateTime = (topics: Topic[]): Topic[] => {
    return [...topics].sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA; // 降序排序，最新的在前面
    });
  };

  // 获取话题列表
  const fetchTopics = async () => {
    if (!chatService) return;

    try {
      setLoading(true);
      let fetchedTopics: Topic[] = [];

      if (searchQuery.trim()) {
        // 如果有搜索关键词，使用搜索方法
        fetchedTopics = await chatService.searchTopics(searchQuery);
      } else {
        // 否则获取所有话题
        fetchedTopics = await chatService.getAllTopics(50, 0); // 获取最新的50个话题
      }

      // 按更新时间降序排序
      const sortedTopics = sortTopicsByUpdateTime(fetchedTopics);

      // console.log("获取到的话题列表 (已按更新时间排序):", sortedTopics);
      setTopics(sortedTopics);
      setError(null);
    } catch (err) {
      console.error("获取话题列表失败:", err);
      setError("获取话题列表失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 当服务初始化完成或搜索查询变化时，获取话题
  useEffect(() => {
    if (chatService) {
      fetchTopics();
    }
  }, [chatService, searchQuery]);

  // 格式化相对时间
  const formatRelativeTime = (dateString: string) => {
    try {
      if (!dateString) {
        console.error("日期字符串为空");
        return "未知时间";
      }

      // console.log("格式化时间:", dateString);
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        console.error("无效的日期字符串:", dateString);
        return "无效时间";
      }

      // console.log("转换后的日期对象:", date);

      if (isToday(date)) {
        const result = formatDistanceToNow(date, {
          locale: zhCN,
          addSuffix: true,
        });
        // console.log("今天的相对时间:", result);
        return result;
      } else if (isYesterday(date)) {
        const result = "昨天 " + format(date, "HH:mm", { locale: zhCN });
        // console.log("昨天的时间:", result);
        return result;
      } else {
        const result = format(date, "MM月dd日 HH:mm", { locale: zhCN });
        // console.log("其他日期:", result);
        return result;
      }
    } catch (e) {
      console.error("时间格式化错误:", e);
      return "时间格式化错误";
    }
  };

  // 处理话题点击
  const handleTopicClick = (topic: Topic) => {
    if (onSelectTopic) {
      onSelectTopic(topic);
    }
  };

  // 处理刷新
  const handleRefresh = () => {
    fetchTopics();
  };

  // 新增：处理菜单按钮点击
  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    topic: Topic
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTopic(topic);
  };

  // 新增：处理菜单关闭
  const handleMenuClose = () => {
    setAnchorEl(null);
    // 不要在这里重置selectedTopic，否则对话框无法获取到选中的话题
    // setSelectedTopic(null);
  };

  // 新增：处理菜单项点击
  const handleMenuItemClick = (action: string) => {
    if (!selectedTopic) return;

    // console.log(`执行操作: ${action}，话题ID: ${selectedTopic.id}`);
    switch (action) {
      case "settings":
        // 打开设置对话框
        break;
      case "export":
        // 导出话题
        break;
      case "saveAsAssistant":
        // 存为助手
        break;
      case "rename":
        // 重命名话题
        // console.log(`准备重命名话题: ${selectedTopic.title}`);
        setNewTopicName(selectedTopic.title);
        setRenameDialogOpen(true);
        setTopicToRename(selectedTopic);
        break;
      case "delete":
        // 删除话题
        // console.log(`准备删除话题: ${selectedTopic.title}`);
        setDeleteDialogOpen(true);
        setTopicToDelete(selectedTopic);
        break;
      default:
        break;
    }
    handleMenuClose();
  };

  // 新增：处理重命名对话框关闭
  const handleRenameDialogClose = () => {
    setRenameDialogOpen(false);
  };

  // 新增：处理重命名确认
  const handleRenameConfirm = async () => {
    if (!topicToRename || !newTopicName.trim()) {
      // console.log("无法重命名：话题为空或名称为空");
      return;
    }

    // console.log("开始重命名话题:", topicToRename.id, "新名称:", newTopicName);

    try {
      setRenameDialogOpen(false);

      // 显示加载状态
      setLoading(true);

      // 获取聊天服务
      const serviceContainer = ServiceContainer.getInstance();
      // console.log("获取服务容器:", serviceContainer);

      const chatService = serviceContainer.get<IChatService>(SERVICE_KEYS.CHAT);
      // console.log("获取聊天服务:", chatService);

      if (!chatService) {
        throw new Error("聊天服务未初始化");
      }

      // 调用更新话题API
      // console.log("调用updateTopic, 参数:", topicToRename.id, {
      //   title: newTopicName.trim(),
      // });
      const updatedTopic = await chatService.updateTopic(topicToRename.id, {
        title: newTopicName.trim(),
      });

      // console.log(
      //   `话题重命名成功: ${topicToRename.id}, 新名称: ${newTopicName}, 返回数据:`,
      //   updatedTopic
      // );

      // 更新本地话题列表并保持排序
      setTopics((prevTopics) => {
        const updatedTopics = prevTopics.map((topic) =>
          topic.id === updatedTopic.id ? updatedTopic : topic
        );

        // 使用辅助函数按更新时间排序
        return sortTopicsByUpdateTime(updatedTopics);
      });
    } catch (error) {
      console.error("重命名话题失败:", error);
      // 可以在这里添加错误提示
      alert(
        `重命名话题失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
      setTopicToRename(null); // 清除要重命名的话题
    }
  };

  // 新增：处理删除对话框关闭
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    // 不要重置topicToDelete，让它保持到确认按钮点击
    // setTopicToDelete(null);
  };

  // 新增：处理删除确认
  const handleDeleteConfirm = async () => {
    if (!topicToDelete) {
      // console.log("无法删除：话题为空");
      return;
    }

    // console.log(
    //   "开始删除话题:",
    //   topicToDelete.id,
    //   "标题:",
    //   topicToDelete.title
    // );

    try {
      setDeleteDialogOpen(false);

      // 显示加载状态
      setLoading(true);

      // 获取聊天服务
      const serviceContainer = ServiceContainer.getInstance();
      // console.log("获取服务容器:", serviceContainer);

      const chatService = serviceContainer.get<IChatService>(SERVICE_KEYS.CHAT);
      // console.log("获取聊天服务:", chatService);

      if (!chatService) {
        throw new Error("聊天服务未初始化");
      }

      // 调用删除话题API
      // console.log("调用deleteTopic, 参数:", topicToDelete.id);
      await chatService.deleteTopic(topicToDelete.id);

      // console.log(
      //   `话题删除成功: ${topicToDelete.id}, 标题: ${topicToDelete.title}`
      // );

      // 从本地话题列表中移除并保持排序
      setTopics((prevTopics) => {
        const filteredTopics = prevTopics.filter(
          (topic) => topic.id !== topicToDelete.id
        );
        // 使用辅助函数按更新时间排序（虽然删除操作不会改变排序，但为了一致性）
        return sortTopicsByUpdateTime(filteredTopics);
      });

      // 如果当前选中的话题被删除，需要清除选中状态
      if (selectedTopicId === topicToDelete.id && onSelectTopic) {
        // 选择另一个话题或清除选择
        const nextTopic = topics.find((topic) => topic.id !== topicToDelete.id);
        if (nextTopic) {
          // console.log("选择下一个话题:", nextTopic.id);
          onSelectTopic(nextTopic);
        } else {
          // console.log("没有其他话题可选");
          // 如果没有其他话题，可能需要处理空状态
          // 这里取决于你的应用逻辑
        }
      }
    } catch (error) {
      console.error("删除话题失败:", error);
      // 可以在这里添加错误提示
      alert(
        `删除话题失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
      setTopicToDelete(null); // 清除要删除的话题
    }
  };

  // 修改创建新话题的处理函数，添加更多日志
  const handleCreateNewTopic = async () => {
    // console.log("尝试创建新话题:", {
    //   currentAssistantId,
    //   hasChatService: !!chatService,
    // });

    if (!currentAssistantId) {
      console.warn("无法创建新话题: currentAssistantId 为空");
      return;
    }

    if (!chatService) {
      console.warn("无法创建新话题: chatService 未初始化");
      return;
    }

    try {
      setLoading(true);
      // console.log(`开始使用助手创建新话题: ${currentAssistantId}`);

      const newTopic = await chatService.createTopicFromAssistant(
        currentAssistantId
      );
      // console.log("新话题创建成功:", newTopic);

      // 刷新话题列表
      // console.log("开始刷新话题列表...");
      await fetchTopics();

      // 选择新创建的话题
      if (onSelectTopic) {
        // console.log("选择新创建的话题:", newTopic.id);
        onSelectTopic(newTopic);
      } else {
        // console.warn("onSelectTopic 处理函数未提供，无法选择新话题");
      }
    } catch (error) {
      console.error("创建新话题失败:", error);
      setError(
        `创建新话题失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // 过滤话题列表
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;

    const query = searchQuery.toLowerCase().trim();
    return topics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(query) ||
        (topic.preview && topic.preview.toLowerCase().includes(query))
    );
  }, [topics, searchQuery]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {/* 头部区域 */}
      <Box
        sx={{
          p: 1.5,
          pb: 1,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {/* 第一行：标题和按钮 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 0.5,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 500,
              color: "text.primary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "70%",
            }}
            title={
              currentAssistantName
                ? `${currentAssistantName}的对话`
                : "全部历史话题"
            }
          >
            {currentAssistantName
              ? `${currentAssistantName}的对话`
              : "全部历史话题"}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                userSelect: "none",
              }}
            >
              {searchQuery
                ? `${filteredTopics.length} 个结果`
                : topics.length > 0
                ? `${topics.length} 个话题`
                : ""}
            </Typography>
            <Tooltip title="刷新">
              <IconButton
                onClick={handleRefresh}
                size="small"
                sx={{
                  p: 0.5,
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  },
                }}
              >
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            {/* 修改创建新话题按钮的条件渲染，添加日志 */}
            {(() => {
              console.log("渲染创建话题按钮:", {
                currentAssistantId,
                shouldShow: !!currentAssistantId,
              });

              if (currentAssistantId) {
                return (
                  <Tooltip title="创建新话题">
                    <IconButton
                      onClick={handleCreateNewTopic}
                      size="small"
                      sx={{
                        p: 0.5,
                        "&:hover": {
                          bgcolor: (theme) =>
                            alpha(theme.palette.primary.main, 0.12),
                        },
                      }}
                    >
                      <AddIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                );
              }
              return null;
            })()}
          </Box>
        </Box>

        {/* 搜索框 */}
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1,
            py: 0.5,
            mx: 0.5, // 添加水平外边距，与列表项对齐
            bgcolor: (theme) => alpha(theme.palette.action.hover, 0.05),
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.action.hover, 0.1),
            },
          }}
        >
          <SearchIcon
            sx={{
              color: "text.secondary",
              fontSize: 18,
              mr: 0.5,
            }}
          />
          <InputBase
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话内容..."
            sx={{
              flex: 1,
              fontSize: "0.875rem",
              "& .MuiInputBase-input": {
                py: 0.5,
                "&::placeholder": {
                  color: "text.disabled",
                  opacity: 1,
                },
              },
            }}
          />
          {searchQuery && (
            <IconButton
              size="small"
              onClick={() => setSearchQuery("")}
              sx={{
                p: 0.5,
                ml: 0.5,
                "&:hover": {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                },
              }}
            >
              <ClearIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Paper>
      </Box>

      {/* 列表内容区域 */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2, color: "error.main" }}>
          <Typography variant="body2">{error}</Typography>
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <IconButton onClick={handleRefresh} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      ) : filteredTopics.length === 0 ? (
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <ChatIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {searchQuery ? "没有找到匹配的对话" : "开始一段新的对话吧"}
          </Typography>
        </Box>
      ) : (
        <List
          sx={{
            p: 0,
            flex: 1,
            overflow: "auto",
          }}
        >
          {filteredTopics.map((topic, index) => {
            return (
              <React.Fragment key={topic.id}>
                <ListItem
                  disablePadding
                  sx={{
                    borderLeft: "3px solid",
                    borderLeftColor:
                      selectedTopicId === topic.id
                        ? "primary.main"
                        : "transparent",
                  }}
                >
                  <ListItemButton
                    onClick={() => handleTopicClick(topic)}
                    selected={selectedTopicId === topic.id}
                    sx={{
                      py: 1.5,
                      px: 2,
                      transition: "all 0.2s",
                      "&.Mui-selected": {
                        backgroundColor: (theme) =>
                          alpha(theme.palette.primary.main, 0.08),
                      },
                      "&.Mui-selected:hover": {
                        backgroundColor: (theme) =>
                          alpha(theme.palette.primary.main, 0.12),
                      },
                      "&:hover": {
                        backgroundColor: (theme) =>
                          alpha(theme.palette.action.hover, 0.1),
                      },
                    }}
                  >
                    <Box sx={{ width: "100%" }}>
                      {/* 标题和菜单按钮 */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            color: "text.primary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            bgcolor:
                              selectedTopicId === topic.id
                                ? alpha(theme.palette.primary.main, 0.05)
                                : "transparent",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          {topic.title}
                        </Typography>
                        <Tooltip title="更多操作">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, topic)}
                            sx={{
                              ml: 1,
                              "&:hover": {
                                backgroundColor: (theme) =>
                                  alpha(theme.palette.primary.main, 0.08),
                              },
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* 预览内容 */}
                      {topic.preview && (
                        <Box
                          sx={{
                            bgcolor:
                              selectedTopicId === topic.id
                                ? alpha(theme.palette.primary.main, 0.03)
                                : alpha(theme.palette.action.hover, 0.03),
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              lineHeight: 1.4,
                              fontStyle: "italic",
                            }}
                          >
                            {topic.preview}
                          </Typography>
                        </Box>
                      )}

                      {/* 底部信息 - 时间和数量 */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mt: 0.5,
                          px: 1, // 添加水平内边距，与标题和预览对齐
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                          }}
                        >
                          {formatRelativeTime(topic.updatedAt)}
                        </Typography>
                        <Box
                          sx={{
                            backgroundColor: (theme) =>
                              alpha(theme.palette.primary.main, 0.08),
                            px: 1,
                            py: 0.2,
                            borderRadius: 1,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "primary.main",
                              fontWeight: 500,
                            }}
                          >
                            {topic.messageCount}条
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </ListItemButton>
                </ListItem>
                {index < filteredTopics.length - 1 && (
                  <Divider
                    component="li"
                    sx={{
                      ml: 2,
                      opacity: 0.5,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* 菜单 */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <MenuItem onClick={() => handleMenuItemClick("settings")}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              设置
            </MenuItem>
            <MenuItem onClick={() => handleMenuItemClick("export")}>
              <ListItemIcon>
                <FileDownloadIcon fontSize="small" />
              </ListItemIcon>
              导出
            </MenuItem>
            <MenuItem onClick={() => handleMenuItemClick("saveAsAssistant")}>
              <ListItemIcon>
                <SaveIcon fontSize="small" />
              </ListItemIcon>
              存为助手
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => handleMenuItemClick("rename")}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              重命名
            </MenuItem>
            <MenuItem
              onClick={() => handleMenuItemClick("delete")}
              sx={{ color: "error.main" }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" sx={{ color: "error.main" }} />
              </ListItemIcon>
              删除
            </MenuItem>
          </Menu>
        </List>
      )}

      {/* 重命名对话框 */}
      <Dialog open={renameDialogOpen} onClose={handleRenameDialogClose}>
        <DialogTitle>重命名话题</DialogTitle>
        <DialogContent>
          <DialogContentText>请输入新的话题名称：</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="话题名称"
            type="text"
            fullWidth
            variant="outlined"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRenameDialogClose}>取消</Button>
          <Button onClick={handleRenameConfirm} color="primary">
            确认
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>删除话题</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除话题 "{topicToDelete?.title}" 吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>取消</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TopicList;
