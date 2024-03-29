"use strict";

const { ResultBuilder, priorities } = require("@koalati/result-builder");
const sslCertificate = require("get-ssl-certificate");
const SCORE_DEDUCTION_CRUCIAL = 1;
const SCORE_DEDUCTION_MINOR = .25;
const SCORE_DEDUCTION_CONSIDER = 0;

class Tool {
	constructor({ page }) {
		this.page = page;

		/** @type {ResultBuilder} */
		this.builder = new ResultBuilder();
	}

	async run() {
		await this._extractData();

		this.checkMetaTitle();
		this.checkMetaDescription();
		this.checkH1s();
		this.checkH2s();
		this.checkInlineStyles();
		this.checkAltlessImages();
		this.checkDeprecatedTags();
		this.checkSeoFriendlyUrl();
		await this.checkSslCertificate();
	}

	get results() {
		return this.builder.toArray();
	}

	async cleanup() {

	}

	checkMetaTitle() {
		let score = 1;
		const result = this.builder.newTest("meta-title");
		result.setTitle("Page title")
			.setDescription("Checks your page's title. A good page title should describe your page's content accurately and be under 60 characters long.")
			.setWeight(.2)
			.addSnippet(this._data.title);

		if (this._data.title.length < 1) {
			score -= SCORE_DEDUCTION_CRUCIAL;
			result.addRecommendation("Add a title tag to your page.", {}, priorities.ISSUE);
		} else if (this._data.title.length > 65) {
			score -= SCORE_DEDUCTION_MINOR;
			result.addRecommendation("Update your page title to contain 60 characters or less.", {}, priorities.OPTIMIZATION);
		}
		result.setScore(score);
	}

	checkMetaDescription() {
		let score = 1;
		const result = this.builder.newTest("meta-description");
		result.setTitle("Meta description")
			.setDescription("Checks your page's meta description. Your page description is displayed in search results, so it should be written to convince people to click your link.")
			.setWeight(.2)
			.addSnippet(this._data.description);
		if (this._data.description.length < 1) {
			score -= SCORE_DEDUCTION_CRUCIAL;
			result.addRecommendation("Add a meta description to your page.", {}, priorities.ESSENTIAL);
		} else if (this._data.description.length > 160) {
			score -= SCORE_DEDUCTION_MINOR;
			result.addRecommendation("Update your meta description to contain between 50 and 160 characters.", {}, priorities.OPTIMIZATION);
		}
		result.setScore(score);

	}

	checkH1s() {
		let score = 1;
		const result = this.builder.newTest("h1-heading");
		result.setTitle("H1 headings")
			.setDescription("Checks your page for H1 headings. Every page should include a single H1 heading tag that explains what the page is about.")
			.setWeight(.1)
			.addSnippets(this._data.h1s);
		if (this._data.h1s.length < 1) {
			score -= SCORE_DEDUCTION_CRUCIAL;
			result.addRecommendation("Add an H1 heading to your page", {}, priorities.ISSUE);
		} else if (this._data.h1s.length > 1) {
			score -= SCORE_DEDUCTION_MINOR;
			result.addRecommendation("Remove extra H1 headings so your page only contains one.", {}, priorities.ISSUE);
		}
		result.setScore(score);
	}

	checkH2s() {
		const charactersPerHeading = (this._data.contentText.length / (this._data.h2s.length + this._data.h3s.length + 1));
		const hasEnoughHeadings = charactersPerHeading <= 1000;

		const result = this.builder.newTest("h2-heading");
		result.setTitle("H2 headings")
			.setDescription("Checks your page for H2 headings. Pages should include H2 heading tags that explain what the different sections of a page are about.")
			.setWeight(.05)
			.setScore(1 - (!hasEnoughHeadings ? SCORE_DEDUCTION_CRUCIAL : 0))
			.addSnippets(this._data.h2s);

		if (!hasEnoughHeadings) {
			result.addRecommendation("Consider adding H2 headings to your page.", {}, priorities.OPTIMIZATION);
		}
	}

	checkInlineStyles() {
		const length = this._data.inlineStyleNodes.reduce((stylesLength, result) => stylesLength + result.styles.length + 10, 0);
		const lengthPercentage = length / this._data.documentLength;
		const tooMuchInlineStyles = lengthPercentage > .1 || length >= 1000;
		const scoreDeduction = length >= 1000 ? SCORE_DEDUCTION_CRUCIAL : SCORE_DEDUCTION_MINOR;

		const result = this.builder.newTest("inline-css");
		result.setTitle("Inline styles")
			.setDescription("Checks your page for inline styles. Inline styles should be kept to a minimum, as they slow down the loading speed of your page and make your site more difficult to maintain over time.")
			.setWeight(.1)
			.setScore(1 - (tooMuchInlineStyles ? scoreDeduction : 0))
			.addSnippets(this._data.inlineStyleNodes.map(result => result.openingTag));

		if (tooMuchInlineStyles) {
			result.addRecommendation(
				"Move inline styles to CSS files to reduce your page's size by %percentage%%.",
				{ "%percentage%": Math.round(lengthPercentage * 100, 2) / 100 },
				priorities.OPTIMIZATION
			);
		}
	}

	checkAltlessImages() {
		const result = this.builder.newTest("altless-imgs");
		result.setTitle("Alt text for images")
			.setDescription("Checks your page for images without an alt attribute. The alt attribute on `<img>` tags allows you to describe the contents of the image, which improves accessibility and improves your SEO for image search engines like Google Search.")
			.setWeight(.1)
			.setScore(1 - (this._data.deprecatedTags.length > 1 ? SCORE_DEDUCTION_CRUCIAL : 0))
			.addSnippets(this._data.altlessImgs);

		if (this._data.altlessImgs.length) {
			result.addRecommendation("Add an alt attribute to all of your `<img>` tags to describe their contents.", {}, priorities.ISSUE);
		}
	}

	checkDeprecatedTags() {
		const result = this.builder.newTest("deprecated-tags")
			.setTitle("Deprecated tags")
			.setDescription("Checks your page for deprecated HTML tags. There are tags that are not valid anymore, and that may be displayed incorrectly by modern browsers.")
			.setWeight(.05)
			.setScore(1 - (this._data.deprecatedTags.length > 1 ? SCORE_DEDUCTION_CRUCIAL : 0))
			.addSnippets(this._data.deprecatedTags);

		if (this._data.deprecatedTags.length) {
			result.addRecommendation("Remove or replace the deprecated HTML tags on your page.", {}, priorities.OPTIMIZATION);
		}
	}

	checkSeoFriendlyUrl() {
		let score = 1;
		const pageUrl = this.page.url();
		const pathParts = this._data.urlPath.split("/");
		const result = this.builder.newTest("seo-friendly-url")
			.setTitle("SEO friendly URL")
			.setDescription("Checks your URL to see if it's SEO and user friendly. Good URLs are concise, descriptive and easy to read. Bad URLs are long and often composed of IDs and numbers that don't mean anything to users and search engines.")
			.setWeight(.1);

		if (pageUrl.indexOf("file:") === 0) {
			result.setScore(1);
			return;
		}

		// Unsafe characters
		if (this._data.urlPath.replace(/['"<>#%{}|\\^~[]`]/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "") != this._data.urlPath) {
			score -= SCORE_DEDUCTION_CRUCIAL;
			result.addRecommendation("Remove special characters from your page's URL. Your base URL should only use alphanumeric characters without accents, dashes and hyphens.", {}, priorities.ISSUE);
		}

		// Numeric parts
		if (pathParts.filter(part => /^\d*$/.test(part)).length > 1 ||
              this._data.urlPath.replace(/\D/g, "").length / this._data.urlPath.length > .3 ||
              /\.[a-z0-9]{2,5}$/.test(this._data.urlPath) && this._data.urlQuery.replace(/\D/g, "").length > 0) {
			score -= SCORE_DEDUCTION_CRUCIAL;
			result.addRecommendation("Change your URL format to word-based slugs instead of numerical identifiers.", {}, priorities.ESSENTIAL);
		}

		// URL length
		if (pageUrl.length > 70) {
			score -= SCORE_DEDUCTION_MINOR;
			result.addRecommendation("Update your page's URL to be 50-60 characters long.", {}, priorities.ESSENTIAL);
		} else if (pageUrl.length > 60) {
			score -= SCORE_DEDUCTION_CONSIDER;
			result.addRecommendation("Consider updating your page's URL to be 50-60 characters long.", {}, priorities.OPTIMIZATION);
		}

		// URL "folders" (2 max)
		if (pathParts.length > 3) {
			score -= SCORE_DEDUCTION_MINOR;
			result.addRecommendation("Reduce the amount of \"folders\" in your page's URL. Use at most 2 folders in your URLs for improved readability.", {}, priorities.OPTIMIZATION);
		}

		// Uppercase characters
		if (this._data.urlPath.replace(/[A-Z]/g, "") != this._data.urlPath) {
			score -= SCORE_DEDUCTION_MINOR;
			result.addRecommendation("Replace uppercase characters in your page's URL by lowercase ones.", {}, priorities.OPTIMIZATION);
		}

		// Hyphens > underscores
		if (this._data.urlPath.replace(/_/g, "") != this._data.urlPath) {
			score -= SCORE_DEDUCTION_MINOR;
			result.addRecommendation("Replace underscores in your page's URL by hyphens. Hyphens are the Google-preferred standard for URLs.", {}, priorities.OPTIMIZATION);
		}

		result.setScore(Math.max(0, score));
	}

	async checkSslCertificate() {
		let hasSslCertificate = false;
		let certificate = null;
		let certificateIssuer = null;
		let certificateExpirationDate = null;

		if (this.page.url().indexOf("https://") === 0) {
			certificate = await sslCertificate.get(this._data.urlHostname, 1000);
			if (certificate && certificate.valid_to && new Date(certificate.valid_to) > new Date()) {
				hasSslCertificate = true;
				certificateExpirationDate = new Date(certificate.valid_to).toLocaleString();
				certificateIssuer = certificate.issuer.CN || certificate.issuer.O || Object.values(certificate.infoAccess)[0] || "Unknown";
			}
		}
		const result = this.builder.newTest("ssl-certificate");
		result.setTitle("SSL certificate")
			.setDescription("Checks if your URL uses the https protocol with a valid SSL certificate. This is important for security, SEO and user trust.")
			.setWeight(.1)
			.setScore(hasSslCertificate ? 1 : 0)
			.addSnippets(hasSslCertificate ? [`Your website has a valid SSL certificate provided by ${certificateIssuer}. It is valid until ${certificateExpirationDate}.`] : []);

		if (!hasSslCertificate) {
			result.addRecommendation("Set up an SSL certificate for your website and update your pages to use the `https` protocol.", {}, priorities.ISSUE);
		}
	}

	async _extractData() {
		this._data = await this.page.evaluate(() => {
			const getOpeningTag = (node) => { return node.outerHTML.replace(node.innerHTML, "").replace(/<\/[a-zA-Z]+>$/, ""); };

			const titleNode = document.querySelector("title");
			const descriptionNode = document.querySelector("meta[name=\"description\"]");
			const robotsMetaNode = document.querySelector("meta[name=\"robots\"]");

			return {
				title: titleNode ? titleNode.textContent.trim() : "",
				description: descriptionNode ? descriptionNode.getAttribute("content").trim() : "",
				robots: robotsMetaNode ? robotsMetaNode.getAttribute("content").trim() : "",
				documentLength: document.documentElement.outerHTML.length,
				contentText: document.body.innerText,
				h1s: [...document.querySelectorAll("h1")].map(node => node.innerText.replace("\n", " ").trim()),
				h2s: [...document.querySelectorAll("h2")].map(node => node.innerText.replace("\n", " ").trim()),
				h3s: [...document.querySelectorAll("h3")].map(node => node.innerText.replace("\n", " ").trim()),
				inlineStyleNodes: [...document.querySelectorAll("[style]:not([style=\"\"])")].map(node => { return { styles: node.getAttribute("style"), openingTag: getOpeningTag(node) }; }),
				deprecatedTags: [...document.querySelectorAll("acronym, applet, basefont, big, center, dir, font, frame, frameset, isindex, noframes, s, strike, tt, u")].map(getOpeningTag),
				altlessImgs: [...document.querySelectorAll("img:not([alt])")].map(getOpeningTag),
				urlPath: decodeURI(window.location.pathname.replace(/^\//, "")),
				urlQuery: window.location.search,
				urlHostname: window.location.hostname,
			};
		});
	}
}

module.exports = Tool;
