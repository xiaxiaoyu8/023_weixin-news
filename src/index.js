require("./config");

const { fetchAllNews } = require("./fetcher");
const { summarizeNews } = require("./processor");
const { buildHtml } = require("./template");
const { sendEmail } = require("./mailer");

const dateStr = new Date().toLocaleDateString("zh-CN", {
  month: "long",
  day: "numeric",
});

async function main() {
  console.log(`\n📋 每日新闻推送 — ${dateStr}\n${"=".repeat(30)}`);

  try {
    const news = await fetchAllNews();
    if (news.length === 0) {
      console.warn("⚠️ 未抓取到新闻，跳过推送。");
      return;
    }

    const markdown = await summarizeNews(news);
    const html = buildHtml(markdown);

    await sendEmail({
      subject: `📰 每日新闻简报 · ${dateStr}`,
      html,
    });

    console.log("🎉 推送完成！");
  } catch (err) {
    console.error("❌ 推送失败:", err.message);
  }
}

main();
