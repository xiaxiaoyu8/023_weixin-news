const TIME_ZONE = "Asia/Shanghai";
const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;

function getNewsWindow(now = new Date()) {
  return {
    start: new Date(now.getTime() - NEWS_WINDOW_MS),
    end: now,
  };
}

module.exports = { TIME_ZONE, getNewsWindow };
