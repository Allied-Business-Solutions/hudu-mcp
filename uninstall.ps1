# Hudu MCP Server - Uninstaller
# Removes the server and its Claude Desktop configuration.
# Usage: Right-click → Run with PowerShell  (or: powershell -ExecutionPolicy Bypass -File uninstall.ps1)

Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
$InstallDir   = "$env:LOCALAPPDATA\Programs\HuduMCP"
$ClaudeConfig = "$env:APPDATA\Claude\claude_desktop_config.json"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Hudu MCP Server Uninstaller" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Remove installed files
if (Test-Path $InstallDir) {
    Remove-Item $InstallDir -Recurse -Force
    Write-Host "Removed $InstallDir" -ForegroundColor Green
} else {
    Write-Host "Install directory not found — skipping." -ForegroundColor Yellow
}

# Remove from Claude Desktop config
if (Test-Path $ClaudeConfig) {
    $config = Get-Content $ClaudeConfig -Raw | ConvertFrom-Json
    if ($config.PSObject.Properties['mcpServers'] -and $config.mcpServers.PSObject.Properties['hudu']) {
        $config.mcpServers.PSObject.Properties.Remove('hudu')
        $config | ConvertTo-Json -Depth 10 | Set-Content $ClaudeConfig -Encoding UTF8
        Write-Host "Removed Hudu from Claude Desktop configuration." -ForegroundColor Green
    } else {
        Write-Host "Hudu entry not found in Claude Desktop config — skipping." -ForegroundColor Yellow
    }
} else {
    Write-Host "Claude Desktop config not found — skipping." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  Uninstall complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Restart Claude Desktop to apply the changes." -ForegroundColor White
Write-Host ""
pause
