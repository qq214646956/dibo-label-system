# 地博标签打印系统 Dibo Label System

基于 QR Layout Tool 深度定制的条码标签设计/打印系统，集成 SAP RFC 出货数据查询。

## 功能

- **SAP 出货数据查询** — 通过 RFC `ZFM_ZSDELIVERY_DETAILS` 实时查询交货单数据
- **标签模板设计** — 拖拽式可视化设计器，支持文本、二维码、条形码、图片、随机数、序列号
- **多格式导出** — ZPL 热敏打印、PDF 高清输出、PNG 图片、浏览器直接打印
- **MySQL 模板共享** — 模板存储于 MySQL，局域网内多用户共享
- **用户权限管理** — admin / designer / operator 三级角色

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite + Tailwind CSS |
| 标签引擎 | qrlayout-core / qrlayout-ui |
| 后端 | Python Flask + waitress |
| 数据库 | MySQL |
| SAP 接口 | pyrfc (NW RFC SDK) |

## 项目结构

```
├── qrlayout/              # 标签设计引擎（monorepo）
│   ├── packages/core/     # 核心渲染引擎
│   ├── packages/ui/       # 可视化设计器 UI
│   └── examples/react-demo/  # 前端应用
├── demo/                  # 独立演示版
├── deploy/                # Windows 服务部署脚本
│   ├── 安装服务.bat
│   ├── 卸载服务.bat
│   ├── 启动服务.bat
│   ├── 停止服务.bat
│   └── config.example.json
├── sap_server.py          # Flask 后端主程序
└── schema.sql             # 数据库建表脚本
```

## 快速开始

### 开发环境

```bash
cd qrlayout
npm install
npm run dev:ui
```

后端：

```bash
pip install -r deploy/requirements.txt
python sap_server.py
```

### 生产部署

参见 `deploy/` 目录下的 Windows 服务部署脚本。

## License

MIT
