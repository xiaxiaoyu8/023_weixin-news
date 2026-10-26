const MarkdownIt = require("markdown-it");
const { TIME_ZONE, getNewsWindow } = require("./time");

const markdown = new MarkdownIt({ html: false }).disable("image");
const styles = {
  heading_open: "margin:30px 0 12px;padding-bottom:10px;border-bottom:1px solid #e3e9ee;color:#182d43;font-size:19px;line-height:1.5;font-weight:700;",
  paragraph_open: "margin:10px 0;color:#35485b;line-height:1.9;",
  bullet_list_open: "list-style:none;margin:0;padding:0;",
  ordered_list_open: "margin:0;padding-left:24px;",
  list_item_open: "margin:0;padding:16px 0;border-bottom:1px solid #edf0f3;line-height:1.9;overflow-wrap:anywhere;word-break:break-word;",
  blockquote_open: "margin:14px 0 24px;padding:10px 18px;background:#f0f7f7;border-left:3px solid #287d7b;border-radius:0 8px 8px 0;",
  strong_open: "color:#182d43;font-weight:700;",
  link_open: "display:inline-block;max-width:100%;color:#176c8a;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere;word-break:break-word;",
};

for (const [rule, style] of Object.entries(styles)) {
  markdown.renderer.rules[rule] = (tokens, index, options, env, renderer) => {
    tokens[index].attrSet("style", style);
    return renderer.renderToken(tokens, index, options);
  };
}

markdown.renderer.rules.code_inline = (tokens, index) =>
  `<span style="display:inline-block;padding:1px 7px;background:#f1f4f7;border-radius:4px;color:#536579;font-size:12px;line-height:1.7;">${markdown.utils.escapeHtml(tokens[index].content)}</span>`;

function buildHtml(markdownBody, { now = new Date() } = {}) {
  const body = markdownBody.trimStart();
  const heading = body.match(/^#(?:[ \t]+([^\r\n]*))?(?:\r?\n|$)/);
  const generatedTitle = (heading?.[1] || "").trim();
  const validTitle = /^\p{Script=Han}{1,6}$/u.test(generatedTitle) && generatedTitle !== "晨间简报";
  const title = validTitle ? generatedTitle : "新闻来咯";
  if (!validTitle) {
    console.warn("⚠️ AI 标题缺失或格式不符合要求，使用备用标题。");
  }
  console.log(`🗞️ 本期标题：${title}`);
  const date = now.toLocaleDateString("zh-CN", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const { start, end } = getNewsWindow(now);
  const format = (value) => value.toLocaleString("zh-CN", {
    timeZone: TIME_ZONE,
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const htmlBody = markdown.render(heading ? body.slice(heading[0].length).trimStart() : body);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${date} · ${title}</title>
<style>
@media screen and (max-width:480px) {
  .header { padding:24px 20px !important; }
  .content { padding:4px 20px 24px !important; }
  .period { padding:14px 20px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:#f1f4f8;color:#35485b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${date}，最近48小时新闻精选与要闻速览。</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#fff;border:1px solid #e1e7ee;border-radius:14px;overflow:hidden;">
        <tr><td style="height:5px;background:#287d7b;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td class="header" style="padding:30px 32px 26px;">
            <p style="margin:0 0 10px;color:#287d7b;font-size:12px;font-weight:700;letter-spacing:2px;">每日新闻 · 早间阅读</p>
            <h1 style="margin:0 0 12px;color:#182d43;font-size:32px;font-weight:750;line-height:1.25;letter-spacing:1px;">${title}</h1>
            <p style="margin:0;color:#536579;font-size:14px;line-height:1.7;">${date}</p>
          </td>
        </tr>
        <tr>
          <td class="content" style="padding:4px 32px 30px;font-size:16px;line-height:1.9;overflow-wrap:anywhere;word-break:break-word;">
            ${htmlBody}
          </td>
        </tr>
        <tr>
          <td style="padding:20px;border-top:1px solid #e3e9ee;background:#fafbfc;text-align:center;">
            <p style="margin:0 0 5px;color:#536579;font-size:12px;line-height:1.8;">每天五点半 · 最近新闻集</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

module.exports = { buildHtml };
