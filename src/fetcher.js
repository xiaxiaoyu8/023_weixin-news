const RssParser = require("rss-parser");
const { toSimplified } = require("./chinese");

const parser = new RssParser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
});

// const FEEDS = [
//   { name: "BBC中文", url: "https://feeds.bbci.co.uk/zhongwen/simp/rss.xml", category: "国际" },
//   { name: "36氪", url: "https://36kr.com/feed", category: "科技" },
//   { name: "华尔街见闻", url: "https://wallstreetcn.com/feed", category: "财经" },
//   { name: "纽约时报中文", url: "https://cn.nytimes.com/rss/", category: "国际" },
//   { name: "FT中文网", url: "https://rsshub.app/ft/chinese/hot", category: "财经" },
//   { name: "联合早报", url: "https://www.zaobao.com/news/china/rss.xml", category: "国内" },
//   { name: "环球科学", url: "https://rsshub.app/huanqiukexue", category: "科技" },
// ];

const FEEDS = [
  { name: "BBC中文", url: "https://feeds.bbci.co.uk/zhongwen/simp/rss.xml", category: "国际" },
  { name: "36氪", url: "https://36kr.com/feed", category: "科技" },
  { name: "华尔街见闻", url: "https://wallstreetcn.com/feed", category: "财经" },
  { name: "纽约时报中文", url: "https://cn.nytimes.com/rss/", category: "国际" },
  { name: "FT中文网", url: "https://rsshub.app/ft/chinese/hot", category: "财经" },
  { name: "联合早报", url: "https://www.zaobao.com/news/china/rss.xml", category: "国内" },
  { name: "环球科学", url: "https://rsshub.app/huanqiukexue", category: "科技" },
  { name: "财新网", url: "http://china.caixin.com/news/rss/100300241.xml", category: "国内" },
  { name: "澎湃新闻", url: "https://rsshub.app/thepaper/featured", category: "国内" },
  { name: "新京报", url: "http://www.bjnews.com.cn/feed", category: "国内" },
  { name: "南方周末", url: "https://feedx.net/rss/infzm.xml", category: "国内" },
  { name: "第一财经", url: "https://plink.anyfeeder.com/weixin/CBNweekly2008", category: "财经" },
  { name: "21世纪经济报道", url: "https://plink.anyfeeder.com/weixin/jjbd21", category: "财经" },
  { name: "界面新闻", url: "https://rsshub.app/jiemian", category: "财经" },
  { name: "财经杂志", url: "http://www.caijing.com.cn/rss/110827686.xml", category: "财经" },
  { name: "三联生活周刊", url: "http://feedmaker.kindle4rss.com/feeds/lifeweek.weixin.xml", category: "文化" },
];

function isWithin24h(pubDate) {
  if (!pubDate) return true; // keep if no date
  const then = new Date(pubDate).getTime();
  if (isNaN(then)) return true;
  return Date.now() - then < 24 * 60 * 60 * 1000;
}

async function fetchFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    const items = (result.items || [])
      .filter((item) => isWithin24h(item.pubDate || item.isoDate))
      .map((item) => ({
        title: toSimplified((item.title || "").trim()),
        link: item.link || "",
        summary: toSimplified((item.contentSnippet || item.summary || "").trim()).slice(0, 200),
        pubDate: item.pubDate || item.isoDate || "",
        sourceName: toSimplified(feed.name),
        category: toSimplified(feed.category),
      }));
    console.log(`  [${feed.name}] ${items.length} 条`);
    return items;
  } catch (err) {
    console.warn(`  [${feed.name}] 抓取失败: ${err.message}`);
    return [];
  }
}

async function fetchAllNews() {
  console.log("📡 抓取新闻...");
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const all = results.flat();

  // dedup by URL
  const seen = new Set();
  const deduped = all.filter((item) => {
    if (!item.link || seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  // dedup by similar title (first 20 chars)
  const titleSeen = new Set();
  const final = deduped.filter((item) => {
    const key = item.title.slice(0, 20);
    if (titleSeen.has(key)) return false;
    titleSeen.add(key);
    return true;
  });

  console.log(`✅ 抓取完成: 共 ${final.length} 条（去重后）\n`);
  return final;
}

module.exports = { fetchAllNews };
