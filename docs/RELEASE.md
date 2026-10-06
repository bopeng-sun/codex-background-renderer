在线预览：https://bopeng-sun.github.io/codex-background-renderer/

本次更新修复 Windows 启动时未沿用现有代理的连接路径，新增“恢复连接-Win11.cmd”。需要保存工作、完全退出 Codex，再从本项目入口启动；实际云端重连恢复情况需重启后验证。测试覆盖已启用/禁用代理、显式环境配置、协议设置和本机地址直连。

解压 `codex-background-renderer-win11.zip`，进入目录后双击 `预览动画-Win11.cmd` 或 `预览背景-Win11.cmd`。需要 Node.js 22+；日常使用不需要 npm install。

按 Ctrl+Alt+B 导入自己的头像、GIF/动态 WebP、背景和文字。公开版使用原创极光背景与机器人动图，私人鸣人素材不随包发布。

使用 `启动Codex-Win11.cmd` 前保存工作并完全退出 Codex。此功能为实验性的外部接入，实际官方页面接入尚未验证；详见 README-Win11.md。
