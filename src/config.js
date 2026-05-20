const required = ["QQ_EMAIL", "QQ_SMTP_CODE", "DEEPSEEK_API_KEY", "TO_EMAIL"];

const config = {
  qqEmail: process.env.QQ_EMAIL,
  qqSmtpCode: process.env.QQ_SMTP_CODE,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  toEmail: process.env.TO_EMAIL,
};

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
}

module.exports = config;
