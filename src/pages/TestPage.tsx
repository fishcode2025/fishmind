import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Divider, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, CardActions } from '@mui/material';
import { runChatServiceIntegrationTests } from '../services/chat/__tests__/run-integration-tests';
import { runIntegrationTests } from '../services/database/__tests__/run-integration-tests';
import { runRepositoriesIntegrationTests } from '../repositories/__test__/run-integration-tests';
/**
 * 测试页面
 * 
 * 这个页面集成了所有的测试组件，用于在Tauri环境中运行各种集成测试。
 */

// 声明 Tauri 全局变量
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

// 检查是否在开发环境中运行
const isDev = process.env.NODE_ENV === 'development';

const TestPage: React.FC = () => {
  const [repositoriesTestOutput, setRepositoriesTestOutput] = useState<string>('');
  const [chatServiceTestOutput, setChatServiceTestOutput] = useState<string>('');
  const [sqliteServiceTestOutput, setSqliteServiceTestOutput] = useState<string>('');
  const [repositoriesComponentTestOutput, setRepositoriesComponentTestOutput] = useState<string>('');
  
  const [isRunningRepositoriesTests, setIsRunningRepositoriesTests] = useState(false);
  const [isRunningChatServiceTests, setIsRunningChatServiceTests] = useState(false);
  const [isRunningSqliteServiceTests, setIsRunningSqliteServiceTests] = useState(false);
  const [isRunningRepositoriesComponentTests, setIsRunningRepositoriesComponentTests] = useState(false);
  
  const [showRepositoriesOutput, setShowRepositoriesOutput] = useState<boolean>(false);
  const [showChatServiceOutput, setShowChatServiceOutput] = useState<boolean>(false);
  const [showSQLiteServiceOutput, setShowSQLiteServiceOutput] = useState<boolean>(false);
  const [showRepositoriesComponentOutput, setShowRepositoriesComponentOutput] = useState<boolean>(false);
  
  const [statsDialogOpen, setStatsDialogOpen] = useState<boolean>(false);
  const [resultDialogOpen, setResultDialogOpen] = useState<boolean>(false);
  const [currentResultOutput, setCurrentResultOutput] = useState<string>('');
  const [currentResultTitle, setCurrentResultTitle] = useState<string>('');
  const [testStatsSummary, setTestStatsSummary] = useState<string>('');

  // 捕获控制台输出
  const captureConsoleOutput = (callback: () => Promise<void>, setOutput: React.Dispatch<React.SetStateAction<string>>) => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    let output = '';
    
    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      output += message + '\n';
      originalConsoleLog(...args);
    };
    
    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      output += '错误: ' + message + '\n';
      originalConsoleError(...args);
    };
    
    return callback()
      .then(() => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        setOutput(output);
      })
      .catch((error) => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        setOutput(output + '\n运行测试时发生错误: ' + error.message);
      });
  };

  // 运行存储库集成测试
  const handleRunRepositoriesTests = async () => {
    setIsRunningRepositoriesTests(true);
    await captureConsoleOutput(runRepositoriesIntegrationTests, setRepositoriesTestOutput);
    setIsRunningRepositoriesTests(false);
    setShowRepositoriesOutput(true);
  };

  // 运行聊天服务集成测试
  const handleRunChatServiceTests = async () => {
    setIsRunningChatServiceTests(true);
    await captureConsoleOutput(runChatServiceIntegrationTests, setChatServiceTestOutput);
    setIsRunningChatServiceTests(false);
    setShowChatServiceOutput(true);
  };
  
  // 运行 SQLite 服务测试
  const handleRunSqliteServiceTests = async () => {
    setIsRunningSqliteServiceTests(true);
    await captureConsoleOutput(runIntegrationTests, setSqliteServiceTestOutput);
    // await captureConsoleOutput(async () => {
    //   // 这里可以添加实际的 SQLite 服务测试逻辑
    //   // 目前只是显示组件
    //   setShowSQLiteServiceOutput(true);
      
    //   // 生成一些测试输出
    //   return new Promise<void>((resolve) => {
    //     setTimeout(() => {
    //       setSqliteServiceTestOutput("SQLite 服务测试运行完成\n测试组件已显示");
    //       resolve();
    //     }, 500);
    //   });
    // }, setSqliteServiceTestOutput);
    setIsRunningSqliteServiceTests(false);
    setShowSQLiteServiceOutput(true);
  };
  
  // 运行存储库组件测试
  const handleRunRepositoriesComponentTests = async () => {
    setIsRunningRepositoriesComponentTests(true);
    // await captureConsoleOutput(async () => {
    //   // 这里可以添加实际的存储库组件测试逻辑
    //   // 目前只是显示组件
    //   setShowRepositoriesComponentOutput(true);
      
    //   // 生成一些测试输出
    //   return new Promise<void>((resolve) => {
    //     setTimeout(() => {
    //       setRepositoriesComponentTestOutput("存储库组件测试运行完成\n测试组件已显示");
    //       resolve();
    //     }, 500);
    //   });
    // }, setRepositoriesComponentTestOutput);
    await captureConsoleOutput(runRepositoriesIntegrationTests, setRepositoriesComponentTestOutput);
    setIsRunningRepositoriesComponentTests(false);
    setShowRepositoriesComponentOutput(true);
  };

  // 显示测试结果对话框
  const handleShowResultDialog = (output: string, title: string) => {
    setCurrentResultOutput(output);
    setCurrentResultTitle(title);
    setResultDialogOpen(true);
  };
  
  // 关闭测试结果对话框
  const handleCloseResultDialog = () => {
    setResultDialogOpen(false);
  };

  // 显示测试统计信息
  const handleShowTestStats = (output: string, title: string) => {
    // 解析测试输出，提取统计信息和测试结果
    const extractTestResults = (output: string) => {
      const lines = output.split('\n');
      const statsSection = lines.findIndex(line => line.includes('===== 测试结果统计 ====='));
      
      if (statsSection === -1) {
        return {
          stats: '尚未运行测试',
          passed: [],
          failed: []
        };
      }
      
      // 提取统计信息
      const statsLines = [];
      let i = statsSection;
      while (i < lines.length && !lines[i].includes('通过的测试:') && !lines[i].includes('失败的测试:')) {
        statsLines.push(lines[i]);
        i++;
      }
      
      // 提取通过的测试
      const passedTests = [];
      if (i < lines.length && lines[i].includes('通过的测试:')) {
        i++;
        while (i < lines.length && lines[i].includes('✅')) {
          passedTests.push(lines[i].replace(/^\d+\.\s*✅\s*/, '').trim());
          i++;
        }
      }
      
      // 提取失败的测试
      const failedTests = [];
      if (i < lines.length && lines[i].includes('失败的测试:')) {
        i++;
        while (i < lines.length && lines[i].includes('❌')) {
          failedTests.push(lines[i].replace(/^\d+\.\s*❌\s*/, '').trim());
          i++;
        }
      }
      
      return {
        stats: statsLines.join('\n'),
        passed: passedTests,
        failed: failedTests
      };
    };
    
    const results = extractTestResults(output);
    
    // 创建统计摘要
    let summary = `===== ${title}测试统计 =====\n\n`;
    
    summary += results.stats + '\n';
    
    if (results.passed.length > 0) {
      summary += '\n通过的测试:\n';
      results.passed.forEach((test, index) => {
        summary += `${index + 1}. ✅ ${test}\n`;
      });
    }
    
    if (results.failed.length > 0) {
      summary += '\n失败的测试:\n';
      results.failed.forEach((test, index) => {
        summary += `${index + 1}. ❌ ${test}\n`;
      });
    }
    
    // 设置统计摘要并打开对话框
    setTestStatsSummary(summary);
    setStatsDialogOpen(true);
  };
  
  // 显示所有测试的统计信息
  const handleShowAllTestStats = () => {
    const chatResults = extractTestResults(chatServiceTestOutput);
    const repoResults = extractTestResults(repositoriesTestOutput);
    const sqliteResults = extractTestResults(sqliteServiceTestOutput);
    const repoComponentResults = extractTestResults(repositoriesComponentTestOutput);
    
    // 创建统计摘要
    let summary = '===== 测试统计摘要 =====\n\n';
    
    // 聊天服务测试统计
    summary += '【聊天服务测试】\n';
    summary += chatResults.stats + '\n';
    
    if (chatResults.passed.length > 0) {
      summary += '\n通过的测试:\n';
      chatResults.passed.forEach((test, index) => {
        summary += `${index + 1}. ✅ ${test}\n`;
      });
    }
    
    if (chatResults.failed.length > 0) {
      summary += '\n失败的测试:\n';
      chatResults.failed.forEach((test, index) => {
        summary += `${index + 1}. ❌ ${test}\n`;
      });
    }
    
    // 存储库测试统计
    summary += '\n【存储库测试】\n';
    summary += repoResults.stats + '\n';
    
    if (repoResults.passed.length > 0) {
      summary += '\n通过的测试:\n';
      repoResults.passed.forEach((test, index) => {
        summary += `${index + 1}. ✅ ${test}\n`;
      });
    }
    
    if (repoResults.failed.length > 0) {
      summary += '\n失败的测试:\n';
      repoResults.failed.forEach((test, index) => {
        summary += `${index + 1}. ❌ ${test}\n`;
      });
    }
    
    // SQLite 服务测试统计
    if (sqliteServiceTestOutput) {
      summary += '\n【SQLite 服务测试】\n';
      summary += sqliteResults.stats + '\n';
      
      if (sqliteResults.passed.length > 0) {
        summary += '\n通过的测试:\n';
        sqliteResults.passed.forEach((test, index) => {
          summary += `${index + 1}. ✅ ${test}\n`;
        });
      }
      
      if (sqliteResults.failed.length > 0) {
        summary += '\n失败的测试:\n';
        sqliteResults.failed.forEach((test, index) => {
          summary += `${index + 1}. ❌ ${test}\n`;
        });
      }
    }
    
    // 存储库组件测试统计
    if (repositoriesComponentTestOutput) {
      summary += '\n【存储库组件测试】\n';
      summary += repoComponentResults.stats + '\n';
      
      if (repoComponentResults.passed.length > 0) {
        summary += '\n通过的测试:\n';
        repoComponentResults.passed.forEach((test, index) => {
          summary += `${index + 1}. ✅ ${test}\n`;
        });
      }
      
      if (repoComponentResults.failed.length > 0) {
        summary += '\n失败的测试:\n';
        repoComponentResults.failed.forEach((test, index) => {
          summary += `${index + 1}. ❌ ${test}\n`;
        });
      }
    }
    
    // 总体统计
    const totalTests = chatResults.passed.length + chatResults.failed.length + 
                       repoResults.passed.length + repoResults.failed.length +
                       sqliteResults.passed.length + sqliteResults.failed.length +
                       repoComponentResults.passed.length + repoComponentResults.failed.length;
    const totalPassed = chatResults.passed.length + repoResults.passed.length +
                        sqliteResults.passed.length + repoComponentResults.passed.length;
    const totalFailed = chatResults.failed.length + repoResults.failed.length +
                        sqliteResults.failed.length + repoComponentResults.failed.length;
    
    if (totalTests > 0) {
      const overallPassRate = (totalPassed / totalTests) * 100;
      
      summary += '\n===== 总体统计 =====\n';
      summary += `总测试数: ${totalTests}\n`;
      summary += `总通过: ${totalPassed}\n`;
      summary += `总失败: ${totalFailed}\n`;
      summary += `总通过率: ${overallPassRate.toFixed(2)}%\n`;
    }
    
    // 设置统计摘要并打开对话框
    setTestStatsSummary(summary);
    setStatsDialogOpen(true);
  };
  
  // 辅助函数：提取测试结果
  const extractTestResults = (output: string) => {
    if (!output) {
      return {
        stats: '尚未运行测试',
        passed: [],
        failed: []
      };
    }
    
    const lines = output.split('\n');
    const statsSection = lines.findIndex(line => line.includes('===== 测试结果统计 ====='));
    
    if (statsSection === -1) {
      return {
        stats: '尚未运行测试或无统计信息',
        passed: [],
        failed: []
      };
    }
    
    // 提取统计信息
    const statsLines = [];
    let i = statsSection;
    while (i < lines.length && !lines[i].includes('通过的测试:') && !lines[i].includes('失败的测试:')) {
      statsLines.push(lines[i]);
      i++;
    }
    
    // 提取通过的测试
    const passedTests = [];
    if (i < lines.length && lines[i].includes('通过的测试:')) {
      i++;
      while (i < lines.length && lines[i].includes('✅')) {
        passedTests.push(lines[i].replace(/^\d+\.\s*✅\s*/, '').trim());
        i++;
      }
    }
    
    // 提取失败的测试
    const failedTests = [];
    if (i < lines.length && lines[i].includes('失败的测试:')) {
      i++;
      while (i < lines.length && lines[i].includes('❌')) {
        failedTests.push(lines[i].replace(/^\d+\.\s*❌\s*/, '').trim());
        i++;
      }
    }
    
    return {
      stats: statsLines.join('\n'),
      passed: passedTests,
      failed: failedTests
    };
  };
  
  // 关闭统计对话框
  const handleCloseStatsDialog = () => {
    setStatsDialogOpen(false);
  };

  // 统一的输出显示组件
  const TestOutputDisplay = ({ output }: { output: string }) => (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 2, 
        maxHeight: '300px', 
        overflow: 'auto',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        fontSize: '0.875rem',
        mt: 2
      }}
    >
      {output}
    </Paper>
  );

  // 统一的测试卡片组件
  const TestCard = ({ 
    title, 
    description, 
    isRunning, 
    onRun, 
    output,
    showOutput,
    onToggleOutput,
    onShowStats
  }: { 
    title: string, 
    description?: string, 
    isRunning: boolean, 
    onRun: () => void, 
    output: string,
    showOutput: boolean,
    onToggleOutput: () => void,
    onShowStats: () => void
  }) => (
    <Card variant="outlined" sx={{ mb: 3, width: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {description}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          onClick={onRun}
          disabled={isRunning}
          startIcon={isRunning ? <CircularProgress size={20} /> : undefined}
        >
          {isRunning ? '运行中...' : '运行测试'}
        </Button>
        <Button 
          variant="outlined" 
          onClick={onToggleOutput}
          disabled={!output}
        >
          {showOutput ? '隐藏结果' : '显示结果'}
        </Button>
        <Button 
          variant="outlined" 
          onClick={onShowStats}
          disabled={!output}
        >
          显示测试统计
        </Button>
      </CardActions>
      {showOutput && output && (
        <CardContent>
          <TestOutputDisplay output={output} />
        </CardContent>
      )}
    </Card>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>集成测试页面</Typography>
      <Typography variant="body1" paragraph>
        此页面用于运行集成测试和测试组件。这些测试主要用于开发环境。
      </Typography>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h5" gutterBottom>集成测试</Typography>
      
      {/* 存储库集成测试卡片 */}
      <TestCard 
        title="存储库集成测试"
        isRunning={isRunningRepositoriesTests}
        onRun={handleRunRepositoriesTests}
        output={repositoriesTestOutput}
        showOutput={showRepositoriesOutput}
        onToggleOutput={() => setShowRepositoriesOutput(!showRepositoriesOutput)}
        onShowStats={() => handleShowTestStats(repositoriesTestOutput, "存储库集成")}
      />
      
      {/* 聊天服务集成测试卡片 */}
      <TestCard 
        title="聊天服务集成测试"
        description="注意：此测试会使用内存数据库进行测试，不会影响实际数据。"
        isRunning={isRunningChatServiceTests}
        onRun={handleRunChatServiceTests}
        output={chatServiceTestOutput}
        showOutput={showChatServiceOutput}
        onToggleOutput={() => setShowChatServiceOutput(!showChatServiceOutput)}
        onShowStats={() => handleShowTestStats(chatServiceTestOutput, "聊天服务集成")}
      />
      
      {/* SQLite 服务测试卡片 */}
      <TestCard 
        title="SQLite 服务测试"
        isRunning={isRunningSqliteServiceTests}
        onRun={handleRunSqliteServiceTests}
        output={sqliteServiceTestOutput}
        showOutput={showSQLiteServiceOutput}
        onToggleOutput={() => setShowSQLiteServiceOutput(!showSQLiteServiceOutput)}
        onShowStats={() => handleShowTestStats(sqliteServiceTestOutput || "尚未生成测试统计", "SQLite 服务")}
      />
      
      {/* 存储库组件测试卡片 */}
      <TestCard 
        title="存储库组件测试"
        isRunning={isRunningRepositoriesComponentTests}
        onRun={handleRunRepositoriesComponentTests}
        output={repositoriesComponentTestOutput}
        showOutput={showRepositoriesComponentOutput}
        onToggleOutput={() => setShowRepositoriesComponentOutput(!showRepositoriesComponentOutput)}
        onShowStats={() => handleShowTestStats(repositoriesComponentTestOutput || "尚未生成测试统计", "存储库组件")}
      />
      
      {/* 测试统计对话框 */}
      <Dialog
        open={statsDialogOpen}
        onClose={handleCloseStatsDialog}
        aria-labelledby="test-stats-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="test-stats-dialog-title">测试统计信息</DialogTitle>
        <DialogContent dividers>
          <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {testStatsSummary}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatsDialog} color="primary">
            关闭
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* {showSQLiteServiceOutput && (
        <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle1" gutterBottom>SQLite 服务测试组件</Typography>
          <SQLiteServiceTest />
        </Box>
      )}
      
      {showRepositoriesComponentOutput && (
        <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle1" gutterBottom>存储库组件测试</Typography>
          <RepositoriesTest />
        </Box>
      )} */}
    </Box>
  );
};

export default TestPage; 