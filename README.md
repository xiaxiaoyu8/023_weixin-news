# 每日新闻推送机器人

一个基于 Node.js 的自动新闻简报项目。程序会抓取多个 RSS 新闻源，严格筛选发送时刻之前 48 小时内的新闻，交给 DeepSeek 生成简体中文简报，再转换成 HTML，通过 QQ 邮箱 SMTP 发送。

项目适合放在 GitHub Actions 中定时运行，也可以在本地手动运行。

## 功能

- 抓取中新网国际、国内、财经、文娱，IT之家、Solidot、爱范儿、少数派、极客公园、Dezeen 等 RSS 源，也保留 BBC 中文、纽约时报中文等国际来源。
- 只保留近 48 小时新闻，排除无日期、无效日期、未来日期与旧闻，并按链接和标题做简单去重。
- 使用当前 DeepSeek V4.1 Flash（API 名 `deepseek-flash`，非思考模式）将新闻整理为「国际、国内、科技、财经、文化、学术、设计」分类简报。
- 自动将繁体内容转换为简体中文。
- AI 根据本期新闻联想生成最多 6 个汉字的轻松短标题，用于邮件顶部及页面标题；标题缺失或格式异常时使用「新闻来咯」，与正文在同一次请求中生成。
- 生成适合桌面和手机阅读的 HTML 邮件，包含北京时间日期、明确的统计范围、要闻速览、分类新闻与原文链接。
- 发送前检查 AI 完成状态和内容；空白、截断或格式不完整时取消发送并返回失败。
- 通过 QQ 邮箱 SMTP 发送到指定邮箱。
- GitHub Actions 每天北京时间 05:30 定时触发，并支持手动触发；实际执行可能因平台排队延迟。

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
│   ├── template.js                   # 邮件 HTML 模板
│   └── time.js                       # 北京时间与48小时时间窗口
├── test/news.test.js                 # 抓取、生成、邮件与失败退出测试
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

本地可以创建 `.env` 做记录，但当前代码不会自动读取 `.env` 文件。本地运行前需要把变量加载到当前终端环境；GitHub Actions 则从仓库 Secrets 注入。

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

运行隔离回归测试（不会调用真实 AI API 或发送邮件）：

```bash
npm test
```

所有日期按 `Asia/Shanghai` 显示。最近两天指发送时刻向前滚动 48 小时，例如北京时间 10 月 26 日 05:30 运行时，统计 10 月 24 日 05:30 至 10 月 26 日 05:30 发布的新闻。由于每天运行一次，相邻两天的窗口会有重叠。

## GitHub Actions 自动推送

工作流文件位于 `.github/workflows/daily-news.yml`。

当前定时配置：

GitHub Actions 的以下 cron 使用 UTC 时间，UTC 21:30 对应次日北京时间 05:30：
```yaml
- cron: "30 21 * * *"
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

单个 RSS 源失败不会中断整个任务，程序会打印警告并继续处理其他新闻源。若所有源都失败，本次以非零退出码失败；若至少一个源成功但没有近 48 小时的有效新闻，则正常跳过推送。

已移除新华网 2022 年旧 RSS、财新停更 RSS 及本次检查返回 404 或非 RSS 页面的一批旧地址，使用中新网、IT之家及 Dezeen 官方 Feed 补充。外部源可能随时变更，程序仅接纳能解析出有效发布时间的条目。

### AI 简报为空或未完成

只有 `finish_reason=stop`、正文非空且包含要闻速览和新闻原文链接时才会发送。达到输出上限、被过滤或格式不完整时，程序会取消发送并返回非零退出码，让 Actions 显示失败。检查日志后重新触发任务。

## 技术栈

- Node.js 20
- `rss-parser`：RSS 抓取
- `markdown-it`：安全的 Markdown 渲染，禁用原始 HTML 与图片
- `openai`：调用 DeepSeek 兼容 OpenAI 的 Chat Completions API
- `opencc-js`：繁体转简体
- `nodemailer`：邮件发送
- GitHub Actions：定时任务

## 安全说明

- 不要把 `.env`、API Key、SMTP 授权码提交到 GitHub。
- GitHub Actions 中使用 Repository Secrets 注入敏感信息。
- 如果日志里出现 API Key 后缀并提示无效，建议立即更换该 Key。
