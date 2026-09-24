const fs = require("node:fs");
const path = require("node:path");

module.exports = (request, options) => {
  if (request.startsWith(".") && request.endsWith(".js")) {
    const tsAbs = path.resolve(options.basedir, request.replace(/\.js$/, ".ts"));
    if (fs.existsSync(tsAbs)) {
      return tsAbs;
    }
  }
  return options.defaultResolver(request, options);
};
