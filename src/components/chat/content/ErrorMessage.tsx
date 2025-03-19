import React from 'react';
import { Box, Avatar, Paper, Typography, alpha, useTheme } from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { modelIconService } from '../../../services/modelService';
import { Model } from '../../../services/modelService/models/types';

interface ErrorMessageProps {
  error: any;
  timestamp: string;
  modelId?: string;
  providerId?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, timestamp, modelId, providerId }) => {
  const theme = useTheme();

  // 创建临时模型对象用于获取图标
  const model: Model = {
    id: modelId || '',
    name: '',
    provider: providerId || '',
    group_id: '',
    capabilities: [],
  };

  // 获取模型图标
  const modelIcon = modelId && providerId ? modelIconService.getModelIcon(model) : '';

  return (
    <Box
      sx={{
        alignSelf: 'flex-start',
        maxWidth: '70%',
        mb: 2,
        opacity: 0,
        animation: 'fadeIn 0.3s ease forwards',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            overflow: "hidden",
            bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1.5,
            boxShadow: 1,
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'scale(1.1)'
            },
          }}
        >
          {modelIcon ? (
            <img
              src={modelIcon}
              alt="AI"
              style={{
                width: "24px",
                height: "24px",
                objectFit: "contain",
              }}
            />
          ) : (
            <ErrorOutlineIcon
              sx={{
                width: 24,
                height: 24,
                color: "error.main",
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.04),
              borderRadius: '4px 16px 16px 16px',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                transform: 'scale(1.01)'
              }
            }}
          >
            <Typography sx={{ 
              fontFamily: 'monospace', 
              whiteSpace: 'pre-wrap',
              color: 'text.primary'
            }}>
              {typeof error === 'string' ? error : JSON.stringify(error, null, 2)}
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              p: 1,
              mt: 1,
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.04),
              borderRadius: 1,
              border: 1,
              borderColor: (theme) => alpha(theme.palette.error.main, 0.1)
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'error.main',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 16 }} />
              {error.message || '发生错误，请稍后重试'}
            </Typography>
          </Paper>
        </Box>
      </Box>
      <Typography 
        variant="caption" 
        sx={{ 
          display: 'block', 
          mt: 0.5, 
          ml: 7,
          color: 'text.secondary',
          opacity: 0.8
        }}
      >
        {timestamp}
      </Typography>
    </Box>
  );
};

export default ErrorMessage; 