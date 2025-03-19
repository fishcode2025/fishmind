import React, { useState } from "react";
import {
  Button,
  Box,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { runIntegrationTests } from "../services/database/__tests__/run-integration-tests";

/**
 * SQLiteService 测试组件
 *
 * 这个组件提供了一个按钮，用于触发 SQLiteService 集成测试。
 */
const SQLiteServiceTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log("开始运行 SQLiteService 集成测试...");

      // 调用 Tauri 命令
      const message = await invoke<string>("run_sqlite_tests");
      console.log("Tauri 命令返回:", message);

      // 运行集成测试
      await runIntegrationTests();

      setResult("测试完成，请查看控制台输出");
    } catch (err) {
      console.error("测试失败:", err);

      // 提取更有用的错误信息
      let errorMessage = "";
      if (err instanceof Error) {
        errorMessage = err.message;
        // 如果是 DatabaseError，可能有更详细的信息
        if (errorMessage.includes("数据库初始化失败")) {
          errorMessage += "\n\n请确保已正确安装 Tauri 的文件系统和 SQL 插件。";
          errorMessage += "\n参考: https://v2.tauri.app/plugin/file-system/";
        }
      } else {
        errorMessage = String(err);
      }

      setError(`测试失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        SQLiteService 集成测试
      </Typography>

      <Typography variant="body1" paragraph>
        点击下面的按钮运行 SQLiteService 集成测试。测试结果将显示在控制台中。
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={runTests}
          disabled={loading}
          startIcon={
            loading ? <CircularProgress size={20} color="inherit" /> : null
          }
        >
          {loading ? "测试运行中..." : "运行测试"}
        </Button>
      </Box>

      {result && (
        <Box sx={{ mt: 2, p: 2, bgcolor: "success.light", borderRadius: 1 }}>
          <Typography variant="body2" color="success.contrastText">
            {result}
          </Typography>
        </Box>
      )}

      {error && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: "error.light",
            borderRadius: 1,
            whiteSpace: "pre-line",
          }}
        >
          <Typography variant="body2" color="error.contrastText">
            {error}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default SQLiteServiceTest;
