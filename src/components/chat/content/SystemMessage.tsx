import React, { useState } from 'react';
import { Box, Paper, Typography, alpha, useTheme, IconButton, Tooltip, Chip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

interface SystemMessageProps {
  content: string;
  timestamp: string;
  onCopy?: () => void;
}

const SystemMessage: React.FC<SystemMessageProps> = ({
  content,
  timestamp,
  onCopy
}) => {
  const theme = useTheme();
  const [isCopied, setIsCopied] = useState(false);

  // 格式化相对时间
  const formatRelativeTime = (dateString: string) => {
    try {
      if (!dateString) {
        console.error("日期字符串为空");
        return "未知时间";
      }

      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        console.error("无效的日期字符串:", dateString);
        return "无效时间";
      }

      if (isToday(date)) {
        return formatDistanceToNow(date, {
          locale: zhCN,
          addSuffix: true,
        });
      } else if (isYesterday(date)) {
        return "昨天 " + format(date, "HH:mm", { locale: zhCN });
      } else {
        return format(date, "MM月dd日 HH:mm", { locale: zhCN });
      }
    } catch (e) {
      console.error("时间格式化错误:", e);
      return "时间格式化错误";
    }
  };

  // 处理复制
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      onCopy?.();
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 2,
        opacity: 0,
        animation: 'fadeIn 0.3s ease forwards',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '90%',
          bgcolor: (theme) => alpha(theme.palette.info.light, 0.1),
          borderRadius: '6px',
          transition: 'all 0.2s ease',
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          '&:hover': {
            bgcolor: (theme) => alpha(theme.palette.info.light, 0.15),
            transform: 'scale(1.01)'
          },
          position: 'relative'
        }}
      >
        {/* 系统图标 */}
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            left: -10,
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: (theme) => theme.palette.info.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 1
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 16, color: 'white' }} />
        </Box>

        {/* 头部，包含时间和系统标签 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1,
            pb: 0.5,
            borderBottom: `1px dashed ${alpha(theme.palette.info.main, 0.3)}`
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              opacity: 0.7,
              fontSize: '0.7rem'
            }}
          >
            {format(new Date(timestamp), "yyyy年M月d日 aaaa HH:mm", { locale: zhCN })}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                opacity: 0.7,
                fontSize: '0.7rem'
              }}
            >
              {formatRelativeTime(timestamp)}
            </Typography>
            <Chip
              size="small"
              label="系统消息"
              color="info"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          </Box>
        </Box>

        {/* 消息内容 */}
        <Box
          sx={{
            color: 'text.primary',
            lineHeight: 1.6,
            my: 1,
            '& p': {
              my: 0.5
            }
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
          >
            {content}
          </ReactMarkdown>
        </Box>

        {/* 操作按钮区域 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            mt: 1
          }}
        >
          {/* 复制按钮 */}
          <Tooltip title={isCopied ? "已复制" : "复制内容"}>
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{
                color: 'text.secondary',
                opacity: 0.6,
                '&:hover': {
                  opacity: 1
                }
              }}
            >
              {isCopied ? (
                <CheckCircleOutlineIcon color="success" fontSize="small" />
              ) : (
                <ContentCopyIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </Box>
  );
};

export default SystemMessage; 