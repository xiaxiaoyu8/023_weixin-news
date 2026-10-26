require("./config");

const { fetchAllNews } = require("./fetcher");
const { summarizeNews } = require("./processor");
const { buildHtml } = require("./template");
const { sendEmail } = require("./mailer");
const { TIME_ZONE } = require("./time");

async function main() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", {
    timeZone: TIME_ZONE,
    month: "long",
    day: "numeric",
  });
  console.log(`\n📋 每日新闻推送 — ${dateStr}\n${"=".repeat(30)}`);

  try {
    const news = await fetchAllNews({ now });
    if (news.length === 0) {
      console.warn("⚠️ 未抓取到新闻，跳过推送。");
      return;
    }

    const markdown = await summarizeNews(news, { now });
    const html = buildHtml(markdown, { now });

    await sendEmail({
      subject: `${dateStr}新闻简报`,
      html,
    });

    console.log("🎉 推送完成！");
  } catch (err) {
    console.error("❌ 推送失败:", err.message);
    process.exitCode = 1;
  }
}

main();
