# Codex 背景渲染

在线播放 12 秒启动动画，导入自己的图片或角色动图，并预览动画结束后的静态背景。提供 Windows 11 外部启动器。

**[打开在线页面](https://bopeng-sun.github.io/codex-background-renderer/)** · **[下载 Windows 版](https://github.com/bopeng-sun/codex-background-renderer/releases/latest/download/codex-background-renderer-win11.zip)** · **[Windows 使用说明](README-Win11.md)**

![公开版默认极光背景](assets/artwork.jpg)

## 在线使用

1. 打开在线页面，选择“播放启动动画”或“体验背景预览”。
2. 点“上传自己的图片 / 动图”，或按 Ctrl+Alt+B 打开设置。
3. 选择头像和背景，修改标题、字幕，点击“保存并预览”。

前半段支持 GIF、动态 WebP、PNG 和 JPEG，动图保留原始动画。背景使用静态图片并自动生成描线。图片和文字只保存在当前浏览器，不上传。不同设备、浏览器、Windows 本机预览和真实 Codex 的配置需各自设置。

## Windows 11

下载 ZIP 并解压，进入 codex-background-renderer 目录：

| 入口 | 功能 |
| --- | --- |
| 预览动画-Win11.cmd | 独立窗口播放动画、换图、保存文字 |
| 预览背景-Win11.cmd | 在明确标识的模拟界面体验背景 |
| 检查环境-Win11.cmd | 检测 Node、Codex 安装与签名 |
| 恢复连接-Win11.cmd | 沿用已启用的代理启动官方 Codex，方便排查云端重连 |
| 创建快捷方式-Win11.cmd | 在当前目录生成自定义启动快捷方式 |
| 启动Codex-Win11.cmd | 实验性外部接入官方 Codex |

需要 Node.js 22+。无需 npm install、Python、Swift 或 Xcode；预览使用已有的 Edge/Chrome。

**真实 Codex 接入为实验功能，实际官方页面接入尚未验证。** 首次使用前保存工作并完全退出 Codex，再运行启动入口。如果应用已经运行，启动器只激活现有窗口。网页预览不会直接修改已安装的应用。详情见 [Windows 使用说明](README-Win11.md)。

新启动会将现有环境代理或 Windows 已开启的静态代理传给 Codex 的子进程，供支持 Node 环境代理的桌面版本使用。正在运行的应用需要完全退出后，重新从本项目入口打开才能加载设置；这不代表已经验证了带登录状态的实际云端连接。

## 公开默认素材

公开版使用原创的极光山景和会眨眼、挥手的机器人动图，不包含本机私人鸣人图库。可在设置面板导入自己的图片和动图。

默认背景 3240×2160；机器人 GIF 为 640×360、40 帧、约 2.4 秒循环。暂停时显示动图静态首帧；系统减少动态效果开启时使用静态头像。

## 开发与部署

运行 node --test tools/extension.test.mjs tools/windows.test.mjs tools/proxy.test.mjs 验证基础检查。

运行 node tools/build-web.mjs，将静态网站构建到 .build/site。GitHub Pages 发布源设为 GitHub Actions，main 更新后自动部署；v* 版本标签自动构建并发布 Windows ZIP。静态页面使用相对资源地址。

浏览器验证：tools/web-qa.mjs，维护时需要已有的 Playwright 和浏览器。原创素材生成：tools/generate-public-assets.mjs，需要 sharp。日常使用不依赖这些工具。

## 来源

基于 [panding999/codex-startup-animation](https://github.com/panding999/codex-startup-animation)，保留 fork 关系、原作者 Git 历史、[原项目说明](docs/README-upstream.md)和[参考说明](docs/references.md)。原项目未指定代码开源许可证，本仓库没有代替原作者添加 MIT 等授权。详见 [NOTICE](NOTICE.md)。本项目与 OpenAI 无隶属关系。
