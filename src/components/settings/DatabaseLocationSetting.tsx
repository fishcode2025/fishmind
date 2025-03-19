// src/components/settings/DatabaseLocationSetting.tsx

import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Typography,
  Box,
  Paper,
  Alert,
} from "@mui/material";
import { ServiceContainer } from "../../services/ServiceContainer";
import { IConfigService } from "../../services/interfaces";
import { open, save } from "@tauri-apps/plugin-dialog";

const DatabaseLocationSetting: React.FC = () => {
  const [dbLocation, setDbLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 使用try-catch获取服务，避免服务不存在时崩溃
  let configService: IConfigService;
  try {
    configService =
      ServiceContainer.getInstance().get<IConfigService>("configService");
  } catch (error) {
    console.error("获取配置服务失败:", error);
    return <div>配置服务未初始化，无法加载设置</div>;
  }

  // 加载当前数据库位置
  useEffect(() => {
    const loadDbLocation = async () => {
      try {
        setIsLoading(true);
        const location = await configService.getDatabaseLocation();
        setDbLocation(location);
        setError(null);
      } catch (err) {
        setError(
          `加载数据库位置失败: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDbLocation();
  }, []);

  // 浏览文件
  const handleBrowse = async () => {
    try {
      const selected = await save({
        filters: [
          {
            name: "SQLite数据库",
            extensions: ["db", "sqlite", "sqlite3"],
          },
        ],
        defaultPath: dbLocation,
      });

      if (selected) {
        setDbLocation(selected as string);
      }
    } catch (err) {
      setError(
        `选择文件失败: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  // 保存设置
  const handleSave = async () => {
    try {
      setIsLoading(true);
      await configService.setDatabaseLocation(dbLocation);
      setSuccess("数据库位置已更新，将在下次启动应用时生效");
      setError(null);
    } catch (err) {
      setError(
        `保存数据库位置失败: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setSuccess(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 重置为默认位置
  const handleReset = async () => {
    try {
      setIsLoading(true);
      await configService.setDatabaseLocation(""); // 传入空字符串，让服务使用默认路径
      const location = await configService.getDatabaseLocation();
      setDbLocation(location);
      setSuccess("数据库位置已重置为默认位置");
      setError(null);
    } catch (err) {
      setError(
        `重置数据库位置失败: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setSuccess(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        数据库位置
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        设置数据库文件的存储位置。更改位置将迁移现有数据。
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <TextField
          fullWidth
          label="数据库位置"
          value={dbLocation}
          onChange={(e) => setDbLocation(e.target.value)}
          disabled={isLoading}
          size="small"
          sx={{ mr: 1 }}
        />
        <Button variant="outlined" onClick={handleBrowse} disabled={isLoading}>
          浏览
        </Button>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          disabled={isLoading}
          sx={{ mr: 1 }}
        >
          重置为默认
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={isLoading}>
          保存
        </Button>
      </Box>
    </Paper>
  );
};

export default DatabaseLocationSetting;
