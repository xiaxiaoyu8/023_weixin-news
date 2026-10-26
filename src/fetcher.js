const RssParser = require("rss-parser");
const { toSimplified } = require("./chinese");
const { getNewsWindow } = require("./time");

const parser = new RssParser();
const FEED_TIMEOUT_MS = 12000;
const MAX_ITEMS_PER_FEED = 12;
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
};

const FEEDS = [
  // ===== 国际 =====
  { name: "BBC中文", url: "https://feeds.bbci.co.uk/zhongwen/simp/rss.xml", category: "国际" },
  { name: "纽约时报中文", url: "https://cn.nytimes.com/rss/", category: "国际" },
  { name: "半岛电视台中文", url: "https://chinese.aljazeera.net/rss", category: "国际" },
  { name: "新加坡 CNA", url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", category: "国际" },
  { name: "中新网国际", url: "https://www.chinanews.com.cn/rss/world.xml", category: "国际" },

  // ===== 科技 =====
  { name: "IT之家", url: "https://www.ithome.com/rss/", category: "科技" },
  { name: "Solidot", url: "https://www.solidot.org/index.rss", category: "科技" },
  { name: "爱范儿", url: "https://www.ifanr.com/feed", category: "科技" },
  { name: "少数派", url: "https://sspai.com/feed", category: "科技" },
  { name: "极客公园", url: "https://www.geekpark.net/rss", category: "科技" },

  // ===== 财经 =====
  { name: "中新网财经", url: "https://www.chinanews.com.cn/rss/finance.xml", category: "财经" },
  { name: "第一财经", url: "https://plink.anyfeeder.com/weixin/CBNweekly2008", category: "财经" },
  { name: "21世纪经济报道", url: "https://plink.anyfeeder.com/weixin/jjbd21", category: "财经" },

  // ===== 国内 =====
  { name: "中新网国内", url: "https://www.chinanews.com.cn/rss/china.xml", category: "国内" },
  { name: "南方周末", url: "https://feedx.net/rss/infzm.xml", category: "国内" },

  // ===== 文化 =====
  { name: "中新网文娱", url: "https://www.chinanews.com.cn/rss/ent.xml", category: "文化" },
  { name: "豆瓣读书", url: "https://www.douban.com/feed/review/book", category: "文化" },

  // ===== 学术 =====
  { name: "arxiv CS", url: "https://rss.arxiv.org/rss/cs", category: "学术" },
  { name: "阮一峰的网络日志", url: "http://www.ruanyifeng.com/blog/atom.xml", category: "学术" },

  // ===== 设计 & 创意 =====
  { name: "Dezeen", url: "https://www.dezeen.com/feed/", category: "设计" },
];

function isWithinWindow(pubDate, { start, end }) {
  if (!pubDate) return false;
  const timestamp = new Date(pubDate).getTime();
  return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= end.getTime();
}

async function fetchFeedXml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: FETCH_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`timeout after ${FEED_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFeed(feed, window) {
  try {
    const xml = await fetchFeedXml(feed.url);
    const result = await parser.parseString(xml);
    const items = (result.items || [])
      .filter((item) => isWithinWindow(item.isoDate || item.pubDate, window))
      .sort((a, b) => new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate))
      .slice(0, MAX_ITEMS_PER_FEED)
      .map((item) => ({
        title: toSimplified((item.title || "").trim()),
        link: item.link || "",
        summary: toSimplified((item.contentSnippet || item.summary || "").trim()).slice(0, 200),
        pubDate: new Date(item.isoDate || item.pubDate).toISOString(),
        sourceName: toSimplified(feed.name),
        category: toSimplified(feed.category),
      }));
    console.log(`  [${feed.name}] ${items.length} 条`);
    return items;
  } catch (err) {
    console.warn(`  [${feed.name}] 抓取失败: ${err.message}`);
    return null;
  }
}

async function fetchAllNews({ now = new Date() } = {}) {
  console.log("📡 抓取新闻...");
  const window = getNewsWindow(now);
  const results = await Promise.all(FEEDS.map((feed) => fetchFeed(feed, window)));
  const successful = results.filter((items) => items !== null);
  if (successful.length === 0) {
    throw new Error("所有 RSS 新闻源均抓取失败");
  }
  const all = successful.flat();

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
