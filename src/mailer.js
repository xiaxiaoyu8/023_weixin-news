const nodemailer = require("nodemailer");

async function sendEmail({ subject, html }) {
  const transporter = nodemailer.createTransport({
    host: "smtp.qq.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.QQ_EMAIL,
      pass: process.env.QQ_SMTP_CODE,
    },
  });

  console.log("📧 发送邮件...");
  const info = await transporter.sendMail({
    from: `"每日新闻" <${process.env.QQ_EMAIL}>`,
    to: process.env.TO_EMAIL,
    subject,
    html,
  });

  console.log(`✅ 邮件已发送: ${info.messageId}\n`);
  return info;
}

module.exports = { sendEmail };
