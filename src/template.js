function buildHtml(markdownBody) {
  const date = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // simple markdown-to-HTML conversion
  const htmlBody = markdownBody
    .replace(/^### (.+)/gm, '<h3 style="margin:16px 0 8px;font-size:15px;color:#333;">$1</h3>')
    .replace(/^## (.+)/gm, '<h2 style="margin:20px 0 10px;font-size:17px;color:#1a1a1a;border-bottom:1px solid #eee;padding-bottom:6px;">$1</h2>')
    .replace(/^# (.+)/gm, '<h1 style="margin:0 0 16px;font-size:20px;color:#111;">$1</h1>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#1a73e8;text-decoration:none;">$1</a>')
    .replace(/\n\n/g, "</p><p style='margin:4px 0;'>")
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<span style="color:#999;font-size:12px;">$1</span>');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>每日新闻简报</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
  <tr>
    <td style="padding:24px 20px 12px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-align:center;border-radius:0 0 12px 12px;">
      <h1 style="margin:0;font-size:22px;">📰 每日新闻简报</h1>
      <p style="margin:8px 0 0;font-size:13px;opacity:0.9;">${date}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 20px 24px;font-size:14px;line-height:1.8;color:#333;">
      <p style='margin:4px 0;'>${htmlBody}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 20px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999;">
      由 AI 自动生成 · 每日 7:30 推送 · <a href="https://github.com" style="color:#999;">GitHub Actions</a>
    </td>
  </tr>
</table>
</body>
</html>`;
}

module.exports = { buildHtml };
