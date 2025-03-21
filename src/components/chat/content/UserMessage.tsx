import React, { forwardRef } from 'react';
import { Box, Paper, Typography, alpha, useTheme, IconButton, Tooltip, Divider } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface UserMessageProps {
  content: string;
  timestamp: string;
  tokens?: number;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

const UserMessage = forwardRef<HTMLDivElement, UserMessageProps>(
  ({ content, timestamp, tokens = 0, onRegenerate, onEdit, onCopy, onDelete }, ref) => {
    const theme = useTheme();

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

    return (
      <Box
        ref={ref}
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          // ...原有样式
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            // borderRadius: '6px 2px 6px 6px',
            // transition: 'all 0.2s ease',
            minWidth: 0,
            flexGrow: 1,
            // '&:hover': {
            //   bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            //   transform: 'scale(1.01)'
            // }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
              width: '100%',
              pb: 0.5,
              borderBottom: '1px dashed rgba(0, 0, 0, 0.1)'
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                opacity: 0.6,
                fontSize: '0.7rem',
                textAlign: 'left'
              }}
            >
              {format(new Date(timestamp), "yyyy年M月d日 aaaa HH:mm", { locale: zhCN })}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                opacity: 0.6,
                fontSize: '0.7rem',

                // mr: 1.5,
                textAlign: 'right'
              }}
            >
              {formatRelativeTime(timestamp)}
            </Typography>
          </Box>
          <Typography
            sx={{
              whiteSpace: 'pre-wrap',
              color: 'text.primary',
              textAlign: 'left',
              width: '100%',
              display: 'block'
            }}
          >
            {content}
          </Typography>
        </Paper>
      </Box>
    );
  }
);

export default UserMessage; 