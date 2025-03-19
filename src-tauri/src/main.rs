// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod mcp;

use env_logger;
use log::info;
use mcp::{client::AppState, commands::*};
use std::sync::Arc;
use tauri::Manager;

// 添加一个命令，用于运行 SQLiteService 集成测试
#[tauri::command]
async fn run_sqlite_tests() -> Result<String, String> {
    // 这里我们只是返回一个消息，实际的测试会在前端运行
    Ok("SQLiteService 集成测试已启动，请查看控制台输出".to_string())
}

fn main() {
    // 设置日志级别
    std::env::set_var("RUST_LOG", "info");

    // 初始化日志系统
    env_logger::init();
    info!("应用启动");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 初始化应用状态
            app.manage(Arc::new(AppState::new()));
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            // MCP 客户端管理命令
            initialize_mcp_client,
            disconnect_mcp_client,
            delete_mcp_client,
            get_mcp_client_status,
            get_all_mcp_client_statuses,
            mcp_repair_client,
            // MCP 操作命令
            list_mcp_tools,
            call_mcp_tool,
            list_mcp_resources,
            read_mcp_resource,
            list_mcp_prompts,
            get_mcp_prompt,
            // 添加其他命令
            run_sqlite_tests,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
