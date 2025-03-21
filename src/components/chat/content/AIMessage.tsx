import React, {
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  Box,
  Avatar,
  Paper,
  Typography,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
  Collapse,
  CircularProgress,
  LinearProgress,
  Chip,
} from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PsychologyIcon from "@mui/icons-material/Psychology";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import StopIcon from "@mui/icons-material/Stop";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { modelIconService } from "../../../services/modelService";
import { Model } from "../../../services/modelService/models/types";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  StreamEvent,
  StreamEventType,
} from "../../../services/chat/StreamEventHandler";

interface AIMessageProps {
  messageId: string;
  initialContent?: string;
  timestamp: string;
  isCode?: boolean;
  modelId?: string;
  providerId?: string;
  onRegenerate?: () => void;
  onCopy?: () => void;
}

interface AIMessageRef {
  handleStreamEvent: (event: StreamEvent) => void;
}

const AIMessage = forwardRef<AIMessageRef, AIMessageProps>(
  (
    {
      messageId,
      initialContent = "",
      timestamp,
      isCode = false,
      modelId,
      providerId,
      onRegenerate,
      onCopy,
    },
    ref
  ) => {
    const theme = useTheme();
    const [content, setContent] = useState(initialContent);
    const [isActive, setIsActive] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [modelIcon, setModelIcon] = useState<Model | null>(null);

    // 处理流事件
    const handleStreamEvent = useCallback((event: StreamEvent) => {
      console.log("AIMessage received event:", event);

      switch (event.type) {
        case StreamEventType.SESSION_START:
          console.log("Session started");
          setIsActive(true);
          setIsError(false);
          setContent("");
          break;

        case StreamEventType.MODEL_RESPONSE_WAITING:
          console.log("Waiting for model response");
          setIsWaiting(true);
          break;

        case StreamEventType.TEXT:
          if ("content" in event) {
            console.log("Received text:", event.content);
            setContent((prev) => prev + event.content);
            setIsWaiting(false);
          }
          break;

        case StreamEventType.SESSION_ERROR:
          console.error("Session error:", event.error);
          setIsError(true);
          setIsActive(false);
          setIsWaiting(false);
          break;

        case StreamEventType.ABORT:
          console.log("Session aborted");
          setIsActive(false);
          setIsWaiting(false);
          break;

        case StreamEventType.DONE:
          console.log("Session completed");
          setIsActive(false);
          setIsWaiting(false);
          break;

        default:
          console.log("Unknown event type:", event.type);
      }
    }, []);

    // 暴露事件处理方法
    useImperativeHandle(
      ref,
      () => ({
        handleStreamEvent,
      }),
      [handleStreamEvent]
    );

    // 加载模型图标
    useEffect(() => {
      if (modelId && providerId) {
        const model: Model = {
          id: modelId,
          name: modelId,
          provider: providerId,
          group_id: "",
          capabilities: [],
        };
        setModelIcon(model);
      }
    }, [modelId, providerId]);

    // 处理复制
    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        onCopy?.();
      } catch (error) {
        console.error("复制失败:", error);
      }
    }, [content, onCopy]);

    // 处理重新生成
    const handleRegenerate = useCallback(() => {
      onRegenerate?.();
    }, [onRegenerate]);

    // 处理展开/折叠
    const handleToggleExpand = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    // 格式化时间
    const formattedTime = useMemo(() => {
      return format(new Date(timestamp), "yyyy年M月d日 aaaa HH:mm", {
        locale: zhCN,
      });
    }, [timestamp]);

    // 格式化相对时间
    const relativeTime = useMemo(() => {
      const date = new Date(timestamp);
      if (isToday(date)) {
        return "今天 " + format(date, "HH:mm");
      } else if (isYesterday(date)) {
        return "昨天 " + format(date, "HH:mm");
      } else {
        return formatDistanceToNow(date, { locale: zhCN }) + "前";
      }
    }, [timestamp]);

    // 处理消息内容
    const processedContent = useMemo(() => {
      return content || initialContent;
    }, [content, initialContent]);

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          // opacity: 0,
          // animation: "fadeIn 0.3s ease forwards",
          // "@keyframes fadeIn": {
          //   from: { opacity: 0, transform: "translateY(10px)" },
          //   to: { opacity: 1, transform: "translateY(0)" },
          // },
        }}
      >

        {/* 状态指示器 */}
        {(isActive || isWaiting) && (
          <Box sx={{ mb: 1 }}>
            <LinearProgress
              sx={{
                height: 2,
                borderRadius: 1,
              }}
            />
          </Box>
        )}

        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 0,
            border: "none",
            width: "100%",
            bgcolor: "transparent",
          }}
        >


          {/* 消息内容 */}
          <Collapse in={isExpanded} collapsedSize={100}>
            {isCode ? (
              <Typography
                sx={{
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  bgcolor: (theme) =>
                    alpha(theme.palette.primary.main, 0.03),
                  p: 1,
                  borderRadius: 1,
                }}
              >
                {processedContent}
              </Typography>
            ) : (
              <Box
                // sx={{
                //   color: "text.primary",
                //   lineHeight: 1.6,
                //   wordBreak: "break-word",
                //   width: "100%",
                //   display: "block",
                //   textAlign: "left",
                //   "& pre": {
                //     borderRadius: 1,
                //     p: 1.5,
                //     overflowX: "auto",
                //     bgcolor: (theme) =>
                //       alpha(theme.palette.primary.main, 0.05),
                //   },
                //   "& code": {
                //     fontFamily: "monospace",
                //     fontSize: "0.9em",
                //     p: 0.3,
                //     borderRadius: 0.5,
                //     bgcolor: (theme) =>
                //       alpha(theme.palette.primary.main, 0.05),
                //   },
                //   "& blockquote": {
                //     borderLeft: "4px solid",
                //     borderColor: (theme) =>
                //       alpha(theme.palette.primary.main, 0.3),
                //     pl: 2,
                //     ml: 0,
                //     my: 1,
                //     color: "text.secondary",
                //   },
                //   "& table": {
                //     borderCollapse: "collapse",
                //     width: "100%",
                //     my: 2,
                //   },
                //   "& th, & td": {
                //     border: "1px solid",
                //     borderColor: (theme) =>
                //       alpha(theme.palette.divider, 0.7),
                //     p: 1,
                //   },
                //   "& th": {
                //     bgcolor: (theme) =>
                //       alpha(theme.palette.primary.main, 0.05),
                //     fontWeight: "bold",
                //   },
                //   "& img": {
                //     maxWidth: "100%",
                //     borderRadius: 1,
                //   },
                //   "& a": {
                //     color: "primary.main",
                //     textDecoration: "none",
                //     "&:hover": {
                //       textDecoration: "underline",
                //     },
                //   },
                //   "& ul, & ol": {
                //     pl: 3,
                //   },
                //   "& hr": {
                //     border: "none",
                //     height: "1px",
                //     bgcolor: "divider",
                //     my: 2,
                //   },
                // }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}
                  components={{
                    code: ({ className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline = !match;
                      return !isInline ? (
                        <SyntaxHighlighter
                          // @ts-ignore
                          style={materialLight}
                          language={match ? match[1] : ""}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {processedContent}
                </ReactMarkdown>
              </Box>
            )}
          </Collapse>

          {/* 操作按钮 */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              // mt: 1,
              gap: 1,
            }}
          >
            {/* 展开/折叠按钮 */}
            {/* <Tooltip title={isExpanded ? "折叠" : "展开"} placement="top">
              <IconButton
                size="small"
                onClick={handleToggleExpand}
                sx={{
                  color: "text.secondary",
                  opacity: 0.6,
                  "&:hover": {
                    opacity: 1,
                  },
                }}
              >
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip> */}

            {/* 复制按钮 */}
            {/* <Tooltip title={isCopied ? "已复制" : "复制"} placement="top">
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  color: "text.secondary",
                  opacity: 0.6,
                  "&:hover": {
                    opacity: 1,
                  },
                }}
              >
                {isCopied ? (
                  <CheckCircleOutlineIcon color="success" />
                ) : (
                  <ContentCopyIcon />
                )}
              </IconButton>
            </Tooltip> */}

            {/* 重新生成按钮 */}
            {onRegenerate && (
              <Tooltip title="重新生成" placement="top">
                <IconButton
                  size="small"
                  onClick={handleRegenerate}
                  disabled={isActive}
                  sx={{
                    color: "text.secondary",
                    opacity: 0.6,
                    "&:hover": {
                      opacity: 1,
                    },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}

            {/* 状态指示器 */}
            {isActive && (
              <Chip
                size="small"
                icon={<AutorenewIcon />}
                label="生成中"
                color="primary"
                variant="outlined"
              />
            )}
            {isWaiting && (
              <Chip
                size="small"
                icon={<PsychologyIcon />}
                label="思考中"
                color="primary"
                variant="outlined"
              />
            )}
            {isError && (
              <Chip
                size="small"
                icon={<ErrorOutlineIcon />}
                label="出错了"
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        </Paper>
      </Box>
    );
  }
);

AIMessage.displayName = "AIMessage";

export default AIMessage;
