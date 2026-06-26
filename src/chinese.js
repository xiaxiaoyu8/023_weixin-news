const OpenCC = require("opencc-js");

const convertToSimplified = OpenCC.Converter({ from: "t", to: "cn" });

function toSimplified(text) {
  return convertToSimplified(String(text || ""));
}

module.exports = { toSimplified };
