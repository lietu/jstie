var fs = require("fs");

var DIST = "dist/";
var SOURCE = DIST + "commonjs/tie.js";
var BROWSER = DIST + "tie.js";

var commonjs = String(fs.readFileSync(SOURCE));

generate_browser(commonjs);

function generate_browser(sourceCode) {
    var header = String(fs.readFileSync("dist/browser/header.js"));
    var footer = String(fs.readFileSync("dist/browser/footer.js"));
    sourceCode = sourceCode.replace("exports.Tie = Tie;", "return Tie;");

    var full = header + "\n" + sourceCode + "\n" + footer;

    fs.writeFileSync(BROWSER, full);
}
