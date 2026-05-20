const OpenAI = require("openai");

const SYSTEM_PROMPT = `你是一位资深新闻编辑。用户会给你若干条今日新闻（标题+摘要+来源+链接），请完成：

1. 按「🌍 国际」「🇨🇳 国内」「💻 科技」「📈 财经」四类归类
2. 为每条新闻写一行摘要（30字以内），保留链接
3. 每个分类精选最重要的 5-8 条
4. 末尾添加「📌 今日要闻速览」版块，用 3-5 句话总结今日最值得关注的事
5. 每个分类标题下方标注新闻条数

输出纯 Markdown 格式，格式如下：

## 🌍 国际（X条）
- **[标题]**：摘要 — [查看详情](链接) `[来源]`

不要在代码块内输出，直接输出 Markdown。每条新闻末尾标注来源如 \`[BBC中文]\`。`;

function buildPrompt(newsList) {
  const items = newsList.map(
    (n, i) => `${i + 1}. 标题：${n.title}\n   摘要：${n.summary}\n   来源：${n.sourceName}\n   链接：${n.link}`
  );
  return `以下是今日新闻列表，请按要求整理成新闻简报：\n\n${items.join("\n\n")}`;
}

async function summarizeNews(newsList) {
  if (newsList.length === 0) {
    return "今日暂无新闻。";
  }

  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1",
  });

  console.log("🤖 AI 处理新闻...");
  const resp = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(newsList) },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });

  const content = resp.choices[0]?.message?.content || "";
  console.log(`✅ AI 处理完成（${content.length} 字符）\n`);
  return content;
}

module.exports = { summarizeNews };
