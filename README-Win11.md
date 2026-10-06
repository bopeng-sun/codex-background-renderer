# Windows 11 使用说明

[在线体验](https://bopeng-sun.github.io/codex-background-renderer/) · [下载 Windows ZIP](https://github.com/bopeng-sun/codex-background-renderer/releases/latest/download/codex-background-renderer-win11.zip)

## 解压与预览

1. 解压 ZIP，保留 codex-background-renderer 目录和全部文件。
2. 双击“预览动画-Win11.cmd”，体验完整 12 秒动画。
3. 双击“预览背景-Win11.cmd”，在模拟界面里查看动画结束后留下的背景。
4. 按 Ctrl+Alt+B 打开设置，导入头像、动图、背景和文字，点击“保存并预览”。

需要 Windows 11 和 Node.js 22+。优先使用已安装的 Node，也会查找 Codex 自带的 Node；无需 npm install、Python、Swift 或 Xcode。预览推荐使用已有的 Edge。

公开版默认使用原创极光背景与机器人动图，不包含私人鸣人图库。前半段支持 GIF 和动态 WebP，导入保留原始动画。背景按 3:2 居中裁切并自动生成描线，推荐通过设置面板换图。图片和文字保存在当前浏览器，不上传；暂停时显示动图首帧，继续时恢复播放。

## 经常显示“重新连接”

“恢复连接-Win11.cmd”会沿用你已启用的 Windows 静态代理或环境代理启动官方 Codex，并启用 Node 的环境代理支持；此入口不加载背景。原来的自定义背景入口也使用同样的网络修复。

先保存工作并完全退出 Codex，再双击该入口。正在运行的应用不会重新读取启动环境；打开已有窗口不代表新网络设置已经应用。代理软件需保持运行，重启后再检查是否仍显示重连。

本机诊断观察到：本机服务处于 connected 状态，云端 WebSocket 握手前关闭；直连 codex-cloud-backend.chatgpt.com 超时，现有代理可建立 TLS。Node 24.14.1 中启用环境代理后，请求约 1 秒收到未认证的 HTTP 响应；这只验证传输可达，实际带登录状态的 Codex 云端连接需重启后确认。Node 运行时需支持 NODE_USE_ENV_PROXY，见 [Node 官方说明](https://nodejs.org/api/cli.html#node_use_env_proxy1)。

若仍失败，检查代理软件是否将 codex-cloud-backend.chatgpt.com 分配到了可用线路；不要把未认证请求返回的 403 当成登录已经成功。

## 应用到真正的 Codex（自定义背景）

**这是非官方、实验性的外部接入，实际官方页面接入尚未验证。独立预览成功不代表真实官方页面已经接入。**

1. 保存工作，完全退出官方 Codex。
2. 双击“启动Codex-Win11.cmd”。
3. 若当前版本允许本机调试且主窗口地址仍为 app://-/index.html，动画会在主窗口播放，结束后保留背景。
4. 按 Ctrl+Alt+B 换图；选择“关闭美化，恢复 Codex 外观”可移除本次外观。

如果 Codex 已在运行，启动器只激活现有应用，不关闭进程或重新播放。官方应用更新后可能需要适配；接入失败时仍可使用独立预览。

动态检测 Microsoft Store 的 OpenAI.Codex 和部分桌面安装路径，使用 Windows Authenticode 校验 OpenAI 签名。特殊路径可通过 CODEX_STARTUP_EXE 指定桌面程序完整路径，不要指向 Codex CLI。Node 特殊路径可通过 CODEX_STARTUP_NODE 指定。

## 以后从图标启动

双击“创建快捷方式-Win11.cmd”，在当前目录生成 Codex - Custom Background.lnk。可将它复制到桌面，再从该快捷方式启动。源码目录需保留原位置，移动后重新生成快捷方式。

官方图标和其他启动路径不会自动加载背景。网页里的配置与 Windows 本机预览、官方应用分别保存，需要各自导入图片。

## 恢复与本机服务

不修改官方安装包或 app.asar。本机调试端口限定 127.0.0.1，连接前检查端口所属程序和用户；该端口随应用存活。完全退出，再从官方图标正常打开，可以结束本次调试状态。

独立预览服务只监听 127.0.0.1:18765，只提供指定动画资源，不公开工作区或 .git。辅助服务 30 分钟后退出；双击预览入口可重新启动。没有开机启动项或常驻服务。

手动运行 node windows/launcher.mjs --serve。动画预览：http://127.0.0.1:18765/；背景预览：http://127.0.0.1:18765/.build/extension-preview/。

双击“检查环境-Win11.cmd”可检测 Node、Codex 路径、签名和运行状态。来源与素材范围见 [NOTICE](NOTICE.md)。
