const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { spawnSync } = require("node:child_process");
const { buildHtml } = require("../src/template");

const root = path.resolve(__dirname, "..");
const now = new Date("2026-10-25T21:30:00Z");
const quiet = { log() {}, warn() {}, error() {} };
const article = {
  title: "测试新闻",
  summary: "这是一条新闻摘要",
  sourceName: "测试来源",
  category: "科技",
  link: "https://example.com/news",
  pubDate: now.toISOString(),
};
const brief = "## 📌 两日要闻速览\n> 过去两天的重要进展。\n\n## 💻 科技（1条）\n- **测试新闻**：这是一条新闻摘要 — [阅读原文](https://example.com/news) `测试来源`";

function loadSource(name, mocks = {}, globals = {}) {
  const filename = path.join(root, "src", name);
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    module,
    require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : localRequire(id),
    console: quiet,
    process: { env: { DEEPSEEK_API_KEY: "test-key" } },
    AbortController,
    setTimeout,
    clearTimeout,
    ...globals,
  }, { filename });
  return module.exports;
}

function feedXml(items) {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title><link>https://example.com</link><description>Test</description>${items.map(({ title, date }, index) => `<item><title>${title}</title><link>https://example.com/${index}</link>${date ? `<pubDate>${date}</pubDate>` : ""}<description>Test</description></item>`).join("")}</channel></rss>`;
}

test("抓取仅保留过去48小时的有效日期，并按新到旧排序", async () => {
  const xml = feedXml([
    { title: "48小时前", date: new Date(now.getTime() - 48 * 3600000).toISOString() },
    { title: "无日期" },
    { title: "未来日期", date: new Date(now.getTime() + 1).toISOString() },
    { title: "无效日期", date: "not-a-date" },
    { title: "超过48小时", date: new Date(now.getTime() - 48 * 3600000 - 1).toISOString() },
    { title: "2022年旧闻", date: "2022-12-14T00:00:00Z" },
    { title: "刚刚发布", date: now.toISOString() },
    { title: "47小时前", date: new Date(now.getTime() - 47 * 3600000).toISOString() },
  ]);
  const { fetchAllNews } = loadSource("fetcher.js", {}, {
    fetch: async () => ({ ok: true, text: async () => xml }),
  });
  const result = await fetchAllNews({ now });
  assert.deepEqual(Array.from(result, (item) => item.title), ["刚刚发布", "47小时前", "48小时前"]);
  assert.equal(result[0].pubDate, now.toISOString());
});

test("单源失败仍保留其他源的新闻，所有源失败则报错", async () => {
  let calls = 0;
  const { fetchAllNews } = loadSource("fetcher.js", {}, {
    fetch: async () => ++calls === 1
      ? { ok: true, text: async () => feedXml([{ title: "有效新闻", date: now.toISOString() }]) }
      : { ok: false, status: 503 },
  });
  assert.equal((await fetchAllNews({ now })).length, 1);
  const failed = loadSource("fetcher.js", {}, { fetch: async () => { throw new Error("network down"); } });
  await assert.rejects(() => failed.fetchAllNews({ now }), /所有 RSS 新闻源均抓取失败/);
});

test("源可访问但没有近期新闻时返回空列表", async () => {
  const { fetchAllNews } = loadSource("fetcher.js", {}, {
    fetch: async () => ({ ok: true, text: async () => feedXml([]) }),
  });
  assert.equal((await fetchAllNews({ now })).length, 0);
});

function processorFor(response) {
  class MockOpenAI {
    constructor() {
      this.chat = { completions: { create: async () => response } };
    }
  }
  return loadSource("processor.js", { openai: MockOpenAI });
}

test("生成请求使用当前模型、非思考模式和同一北京时间窗口", async () => {
  let request;
  let endpoint;
  class InterceptedOpenAI extends require("openai") {
    constructor(options) {
      super({
        ...options,
        fetch: async (url, init) => {
          endpoint = String(url);
          request = JSON.parse(init.body);
          return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: brief } }] }), {
            headers: { "Content-Type": "application/json" },
          });
        },
      });
    }
  }
  const processor = loadSource("processor.js", { openai: InterceptedOpenAI });
  assert.equal(await processor.summarizeNews([article], { now }), brief);
  assert.equal(endpoint, "https://api.deepseek.com/v1/chat/completions");
  assert.equal(request.model, "deepseek-flash");
  assert.equal(request.thinking.type, "disabled");
  assert.match(request.messages[1].content, /2026\/10\/24 05:30:00 至 2026\/10\/26 05:30:00/);
  assert.match(request.messages[1].content, /发布时间：2026\/10\/26 05:30:00/);
});

for (const [label, response, expected] of [
  ["空正文", { choices: [{ finish_reason: "stop", message: { content: " \n " } }] }, /空白内容/],
  ["截断正文", { choices: [{ finish_reason: "length", message: { content: brief } }] }, /未完整完成/],
  ["内容被过滤", { choices: [{ finish_reason: "content_filter", message: { content: null } }] }, /未完整完成/],
  ["缺少choice", { choices: [] }, /未完整完成/],
  ["缺少要闻速览", { choices: [{ finish_reason: "stop", message: { content: "## 科技\n- [原文](https://example.com)" } }] }, /缺少要闻速览/],
  ["缺少新闻链接", { choices: [{ finish_reason: "stop", message: { content: "## 📌 两日要闻速览\n没有新闻" } }] }, /有效新闻链接/],
  ["包裹在代码块", { choices: [{ finish_reason: "stop", message: { content: "```markdown\n" + brief + "\n```" } }] }, /代码块/],
]) {
  test(`拒绝发送${label}`, async () => {
    await assert.rejects(() => processorFor(response).summarizeNews([article], { now }), expected);
  });
}

test("邮件使用北京时间和48小时窗口，保留语义化标题、列表和原文链接", () => {
  const html = buildHtml(brief, { now });
  assert.match(html, /2026年10月26日星期一/);
  assert.match(html, /10月24日 05:30 — 10月26日 05:30/);
  assert.match(html, /北京时间 05:30/);
  assert.match(html, /<h2[^>]*>📌 两日要闻速览<\/h2>/);
  assert.match(html, /<ul[^>]*>\s*<li/);
  assert.match(html, /<a href="https:\/\/example.com\/news"/);
  assert.doesNotMatch(html, /<p[^>]*>\s*<h2/);
});

test("邮件转义原始HTML，禁止追踪图片和危险链接", () => {
  const html = buildHtml('<img src="https://tracker.example/pixel">\n\n![追踪](https://tracker.example/image)\n\n[危险](javascript:alert%281%29)\n\n[原文](https://example.com/" data-injected="yes)', { now });
  assert.doesNotMatch(html, /<img\b/i);
  assert.doesNotMatch(html, /href="javascript:/i);
  assert.doesNotMatch(html, /" data-injected="yes"/i);
  assert.match(html, /&lt;img/);
});

function runMain(mode) {
  const script = `
    const fs = require('node:fs');
    const vm = require('node:vm');
    let sent = false, subject = '';
    class FixedDate extends Date {
      constructor(...args) { super(...(args.length ? args : ['2026-10-25T21:30:00Z'])); }
    }
    const fail = (stage) => { if (process.argv[1] === stage) throw new Error('simulated ' + stage); };
    const mocks = {
      './config': {},
      './time': require('./src/time'),
      './fetcher': { fetchAllNews: async () => { fail('fetch-error'); return process.argv[1] === 'no-news' ? [] : [{}]; } },
      './processor': { summarizeNews: async () => { fail('ai-error'); return 'brief'; } },
      './template': { buildHtml: (body, {now}) => { if (now.toISOString() !== '2026-10-25T21:30:00.000Z') throw Error('time mismatch'); return body; } },
      './mailer': { sendEmail: async (mail) => { fail('smtp-error'); sent = true; subject = mail.subject; } }
    };
    (async () => {
      await vm.runInNewContext(fs.readFileSync('src/index.js','utf8'), {require:id=>mocks[id], Date:FixedDate, process, console:{log(){},warn(){},error(){}}});
      process.stdout.write(JSON.stringify({sent,subject}));
    })();
  `;
  const child = spawnSync(process.execPath, ["-e", script, mode], { cwd: root, encoding: "utf8", env: { ...process.env, TZ: "UTC" } });
  assert.equal(child.error, undefined);
  assert.equal(child.stderr, "");
  return { status: child.status, ...JSON.parse(child.stdout) };
}

for (const stage of ["fetch-error", "ai-error", "smtp-error"]) {
  test(`${stage}使实际进程退出码非零且不发送邮件`, () => {
    const result = runMain(stage);
    assert.equal(result.status, 1);
    assert.equal(result.sent, false);
  });
}

test("UTC进程中的成功邮件仍使用北京时间日期", () => {
  const result = runMain("success");
  assert.equal(result.status, 0);
  assert.equal(result.sent, true);
  assert.equal(result.subject, "10月26日新闻简报");
});

test("没有近期新闻时正常跳过发送", () => {
  const result = runMain("no-news");
  assert.equal(result.status, 0);
  assert.equal(result.sent, false);
});
