const path = require("path");
const assert = require("assert");
const runTool = require("@koalati/dev-tool-tester");
const Tool = require("..");
const testFileName = path.join(__dirname, "sample.html");
const expectedResults = require("./expectation.json");

describe("SEO tool (@koalati/tool-seo)", async () => {
	it("Should receive the expected results from the test tool's execution", async () => {
		const results = await runTool(Tool, `file:${testFileName}`);
		assert.deepStrictEqual(results, expectedResults);
	});
});
