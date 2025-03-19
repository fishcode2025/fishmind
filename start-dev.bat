@echo off
echo setting rust log level...
set RUST_LOG=debug,mcp=debug,tauri=info

echo starting dev server...
cd /d %~dp0
pnpm tauri dev 