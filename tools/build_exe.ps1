$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$Python = $env:MATHCOPY_PYTHON
if (-not $Python) {
    $command = Get-Command python -ErrorAction SilentlyContinue
    if ($command) { $Python = $command.Source }
}
if (-not $Python) {
    throw "未找到 Python。请安装 Python 3.12，或设置 MATHCOPY_PYTHON 指向 python.exe。"
}

Write-Host "使用 Python: $Python"
& $Python -m PyInstaller `
    --noconfirm `
    --clean `
    --onefile `
    --windowed `
    --name MathSymbolCopier `
    --icon "assets\app.ico" `
    --version-file "version_info.txt" `
    --add-data "web;web" `
    --add-data "assets;assets" `
    --collect-all webview `
    "app.py"

if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller 构建失败（exit $LASTEXITCODE）。"
}

Write-Host ""
Write-Host "构建完成：$root\dist\MathSymbolCopier.exe"
