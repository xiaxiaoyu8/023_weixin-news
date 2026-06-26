# 每日新闻推送机器人

一个基于 Node.js 的自动新闻简报项目。程序会抓取多个中文 RSS 新闻源，筛选近 24 小时新闻，交给 DeepSeek 生成 Markdown 简报，再转换成 HTML，通过 QQ 邮箱 SMTP 发送。

项目适合放在 GitHub Actions 中定时运行，也可以在本地手动运行。

## 功能

- 抓取 BBC 中文、36 氪、华尔街见闻、纽约时报中文、FT 中文网、联合早报、环球科学等 RSS 源。
- 只保留近 24 小时新闻，并按链接和标题做简单去重。
- 使用 DeepSeek Chat 将新闻整理为「国际、国内、科技、财经」分类简报。
- 自动将繁体内容转换为简体中文。
- 将 Markdown 简报转换为适合邮件阅读的 HTML。
- 通过 QQ 邮箱 SMTP 发送到指定邮箱。
- GitHub Actions 每天北京时间 7:30 自动推送，并支持手动触发。

## 项目结构

```text
.
├── .github/workflows/daily-news.yml  # GitHub Actions 定时任务
├── src/
│   ├── chinese.js                    # 繁体转简体工具
│   ├── config.js                     # 必要环境变量检查
│   ├── fetcher.js                    # RSS 新闻抓取与去重
│   ├── index.js                      # 主入口
│   ├── mailer.js                     # QQ 邮箱发送
│   ├── processor.js                  # DeepSeek 新闻整理
│   └── template.js                   # 邮件 HTML 模板
├── package.json
└── package-lock.json
```

## 环境变量

程序启动前必须提供以下环境变量：

| 变量名 | 说明 |
| --- | --- |
| `QQ_EMAIL` | 发件 QQ 邮箱，例如 `123456@qq.com` |
| `QQ_SMTP_CODE` | QQ 邮箱 SMTP 授权码，不是 QQ 密码 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `TO_EMAIL` | 收件邮箱 |

本地可以创建 `.env` 做记录，但当前代码不会自动读取 `.env` 文件。运行前需要把变量加载到GitHubAction环境变量中。

PowerShell 示例：

```powershell
$env:QQ_EMAIL="你的QQ邮箱"
$env:QQ_SMTP_CODE="你的QQ邮箱SMTP授权码"
$env:DEEPSEEK_API_KEY="你的DeepSeek API Key"
$env:TO_EMAIL="收件邮箱"
npm start
```

## 本地运行

安装依赖：

```bash
npm ci
```

设置环境变量后运行：

```bash
npm start
```

运行流程：

1. 检查必要环境变量。
2. 抓取并去重 RSS 新闻。
3. 调用 DeepSeek 生成新闻简报。
4. 转换为 HTML 邮件。
5. 通过 QQ 邮箱 SMTP 发送。

## GitHub Actions 自动推送

工作流文件位于 `.github/workflows/daily-news.yml`。

当前定时配置：

GitHub Actions 使用 UTC 时间，因此该配置等于北京时间每天 7:30 运行。
以下表示北京时间7:30
```yaml
- cron: "30 23 * * *"
```


需要在 GitHub 仓库中配置以下 Secrets：

进入仓库 `Settings` -> `Secrets and variables` -> `Actions` -> `Repository secrets`，添加：

```text
QQ_EMAIL
QQ_SMTP_CODE
DEEPSEEK_API_KEY
TO_EMAIL
```

## 手动触发推送

工作流已配置 `workflow_dispatch`，可以手动触发：

1. 打开 GitHub 仓库。
2. 点击 `Actions`。
3. 左侧选择 `每日新闻推送`。
4. 点击右侧 `Run workflow`。
5. 分支选择 `main`。
6. 点击绿色 `Run workflow` 按钮。

注意：不要在旧失败记录里点 `Re-run jobs` 来验证新代码。旧运行可能继续使用旧 commit。应从 workflow 页面新建一次 `Run workflow`。

## 常见问题

### `401 Authentication Fails`

DeepSeek API Key 无效。检查：

- `DEEPSEEK_API_KEY` 是否复制完整。
- 是否误填成 `platform.deepseek.com` 或其他网址。
- GitHub Actions 的 `DEEPSEEK_API_KEY` Secret 是否已更新。
- Key 是否已被删除、禁用或额度异常。

### `Missing required env`

缺少必要环境变量。根据日志中的变量名补齐本地环境变量或 GitHub Secrets。

### QQ 邮箱发送失败

检查：

- `QQ_EMAIL` 是否为发件 QQ 邮箱。
- `QQ_SMTP_CODE` 是否为 SMTP 授权码，不是登录密码。
- QQ 邮箱是否已开启 SMTP 服务。
- 收件邮箱 `TO_EMAIL` 是否正确。

### RSS 源抓取失败

单个 RSS 源失败不会中断整个任务，程序会打印警告并继续处理其他新闻源。若所有源都失败或没有近 24 小时新闻，本次会跳过推送。

## 技术栈

- Node.js 20
- `rss-parser`：RSS 抓取
- `openai`：调用 DeepSeek 兼容 OpenAI 的 Chat Completions API
- `opencc-js`：繁体转简体
- `nodemailer`：邮件发送
- GitHub Actions：定时任务

## 安全说明

- 不要把 `.env`、API Key、SMTP 授权码提交到 GitHub。
- GitHub Actions 中使用 Repository Secrets 注入敏感信息。
- 如果日志里出现 API Key 后缀并提示无效，建议立即更换该 Key。
