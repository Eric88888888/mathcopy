# MathCopy · 数学符号复制器

一个完全离线的 Windows 桌面数学符号速查与复制工具。界面按 [SymbolDb 数学符号页](https://symboldb.org/zh/math/) 的暗色风格复刻，并补上了搜索、收藏、最近复制、符号详情和本地 LaTeX 编辑器。

![MathCopy 主界面](docs/screenshot.png)

> GitHub 仓库：<https://github.com/Eric88888888/mathcopy>

## 下载 / 直接运行

从 [Releases](https://github.com/Eric88888888/mathcopy/releases/latest) 下载 `MathSymbolCopier.exe`（或完整压缩包 `MathCopy-1.0.0-win64.zip`），双击即可运行，无需安装 Python，也无需联网。

- **系统**：Windows 10 1809+ / Windows 11
- **运行库**：Microsoft Edge WebView2 Runtime（Windows 11 自带；Windows 10 若缺失，安装微软官方 Evergreen Runtime 即可）
- **体积**：约 13.8 MB，单文件；首次启动会解包，通常需要 2–4 秒
- **数据**：333 个符号、11 个分类；「全部」页精选 50 个最常用符号
- **隐私**：所有符号、KaTeX 字体、界面资源都打包在 exe 内，不会上传任何内容
- **首次运行提示**：exe 未做代码签名，Windows SmartScreen 可能提示“已保护你的电脑”，点“更多信息 → 仍要运行”即可。SHA-256 校验值见 Release 页面或压缩包内的 `SHA256SUMS.txt`。

## 功能

- **点击即复制**：点卡片复制符号，顶部即时提示，右下角有绿色对勾反馈
- **11 个分类**：算术运算、比较关系、集合拓扑、分析微积分、数理逻辑、线性代数、几何三角、概率统计、数集常数、箭头映射、辅助结合
- **搜索**：支持中文名称、符号本身、Unicode 编码（如 `2211` / `U+2211`）、LaTeX 命令（如 `\sum`）和英文别名（如 `sum`、`arrow`）
- **符号详情**：右键卡片查看 Unicode、HTML 实体、UTF-8 字节、LaTeX 命令，可逐项复制
- **收藏与最近复制**：保存在本机，下次启动仍在；最近复制保留 24 条
- **LaTeX 公式编辑器**：本地 KaTeX 实时渲染，支持常用命令快捷插入与一键复制
- **自定义窗口栏**：无边框暗色窗口，可拖动、双击最大化、边缘拉伸，带最小化/最大化/关闭按钮
- **键盘操作**：搜索框回车直接复制第一条结果；卡片聚焦后按 `F` 收藏、`I` 看详情

## 快捷键

| 操作 | 快捷键 |
| --- | --- |
| 聚焦搜索 | `Ctrl + K` 或 `/` |
| 复制搜索结果第一项 | `Enter` |
| 收藏当前卡片 | `F` |
| 查看当前卡片详情 | `I` 或右键 |
| 关闭弹窗 / 清空搜索 | `Esc` |

## 数据说明

符号清单与中文名称整理自 SymbolDb 的数学符号分类页（算术运算、比较关系、集合拓扑、分析微积分、数理逻辑、线性代数、几何三角、概率统计、数集常数、箭头映射、辅助结合）。LaTeX 命令和英文搜索别名为本地补充，个别非常规符号没有标准 LaTeX 命令时会显示为 “—”。

本地数据位置：

```text
%APPDATA%\MathCopy\
├─ state.json     收藏、最近复制、复制次数
├─ app.log        运行日志
└─ webview\       WebView2 缓存
```

删除整个 `%APPDATA%\MathCopy` 文件夹即可恢复到初始状态。

## 从源码运行 / 构建

环境：Windows + Python 3.12。

```powershell
python -m pip install -r requirements.txt
python app.py
```

构建单文件 exe：

```powershell
powershell -ExecutionPolicy Bypass -File tools\build_exe.ps1
```

或手动执行：

```powershell
python -m PyInstaller --noconfirm --clean --onefile --windowed `
  --name MathSymbolCopier `
  --icon assets\app.ico `
  --version-file version_info.txt `
  --add-data "web;web" `
  --add-data "assets;assets" `
  --collect-all webview `
  app.py
```

## 文件结构

```text
app.py                 桌面壳、剪贴板、状态持久化、窗口控制
web/
├─ index.html          界面结构
├─ styles.css          暗色主题与响应式布局
├─ app.js              搜索、分类、复制、收藏、LaTeX
├─ data.js             333 个符号的数据集
└─ vendor/katex/       本地 KaTeX 运行时与字体
assets/app.ico         应用图标
tools/                 数据整理、图标生成、构建和测试脚本
```

## 说明

- 这是一个非官方本地复刻工具，与 SymbolDb 网站无隶属关系；符号数据版权归原网站所有，请遵守其使用条款。
- 符号字体优先使用 Windows 自带的 Segoe UI Symbol / Cambria Math。极少数符号若显示为方框，说明当前系统字体不含该字形，可换用支持更全的数学字体。
