const RssParser = require("rss-parser");
const { toSimplified } = require("./chinese");

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

  // ===== 科技 =====
  { name: "36氪", url: "https://36kr.com/feed", category: "科技" },
  { name: "Solidot", url: "https://www.solidot.org/index.rss", category: "科技" },
  { name: "TechCrunch 中国", url: "https://techcrunch.cn/feed/", category: "科技" },
  { name: "爱范儿", url: "https://www.ifanr.com/feed", category: "科技" },
  { name: "少数派", url: "https://sspai.com/feed", category: "科技" },
  { name: "极客公园", url: "https://www.geekpark.net/rss", category: "科技" },
  { name: "机器之心", url: "https://www.jiqizhixin.com/rss", category: "科技" },
  { name: "虎嗅", url: "https://www.huxiu.com/rss/0.xml", category: "科技" },
  { name: "Engadget 中文", url: "https://chinese.engadget.com/rss.xml", category: "科技" },
  { name: "cnBeta", url: "https://www.cnbeta.com/backend.php", category: "科技" },

  // ===== 财经 =====
  { name: "华尔街见闻", url: "https://wallstreetcn.com/feed", category: "财经" },
  { name: "第一财经", url: "https://plink.anyfeeder.com/weixin/CBNweekly2008", category: "财经" },
  { name: "21世纪经济报道", url: "https://plink.anyfeeder.com/weixin/jjbd21", category: "财经" },
  { name: "财经杂志", url: "http://www.caijing.com.cn/rss/110827686.xml", category: "财经" },
  { name: "财新网", url: "http://china.caixin.com/news/rss/100300241.xml", category: "财经" },
  { name: "雪球", url: "https://xueqiu.com/hots/rss", category: "财经" },
  { name: "智通财经", url: "https://www.zhitongcaijing.com/rss.xml", category: "财经" },

  // ===== 国内 =====
  { name: "联合早报", url: "https://www.zaobao.com/news/china/rss.xml", category: "国内" },
  { name: "新京报", url: "http://www.bjnews.com.cn/feed", category: "国内" },
  { name: "南方周末", url: "https://feedx.net/rss/infzm.xml", category: "国内" },
  { name: "人民网", url: "https://www.people.com.cn/rss/politics.xml", category: "国内" },
  { name: "新华网", url: "http://www.xinhuanet.com/politics/news_politics.xml", category: "国内" },
  { name: "凤凰新闻", url: "https://news.ifeng.com/rss/index.xml", category: "国内" },

  // ===== 文化 =====
  { name: "三联生活周刊", url: "http://feedmaker.kindle4rss.com/feeds/lifeweek.weixin.xml", category: "文化" },
  { name: "豆瓣读书", url: "https://www.douban.com/feed/review/book", category: "文化" },

  // ===== 学术 =====
  { name: "arxiv CS", url: "https://rss.arxiv.org/rss/cs", category: "学术" },
  { name: "阮一峰的网络日志", url: "http://www.ruanyifeng.com/blog/atom.xml", category: "学术" },
  { name: "Matrix67", url: "http://www.matrix67.com/blog/feed", category: "学术" },

  // ===== 设计 & 创意 =====
  { name: "优设", url: "https://www.uisdc.com/feed", category: "设计" },
  { name: "Dezeen 中文", url: "https://www.dezeen.com/cn/rss", category: "设计" },
];

function isWithin24h(pubDate) {
  if (!pubDate) return true; // keep if no date
  const then = new Date(pubDate).getTime();
  if (isNaN(then)) return true;
  return Date.now() - then < 24 * 60 * 60 * 1000;
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

async function fetchFeed(feed) {
  try {
    const xml = await fetchFeedXml(feed.url);
    const result = await parser.parseString(xml);
    const items = (result.items || [])
      .filter((item) => isWithin24h(item.pubDate || item.isoDate))
      .slice(0, MAX_ITEMS_PER_FEED)
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
