'use strict';

const sslCertificate = require('get-ssl-certificate')
const SCORE_DEDUCTION_CRUCIAL = 1;
const SCORE_DEDUCTION_MAJOR = .5;
const SCORE_DEDUCTION_MINOR = .25;
const SCORE_DEDUCTION_CONSIDER = 0;

class Tool {
    constructor({ page }) {
        this.page = page;
        this._results = [];
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
        return this._results;
    }

    async cleanup() {

    }

    checkMetaTitle() {
        const recommendations = [];
        let score = 1;

        if (this._data.title.length < 1 ) {
            score -= SCORE_DEDUCTION_CRUCIAL;
            recommendations.push("Add a title tag to your page. A good page title should be consise (about 60 characters long), and describe your page's content accurately.");
        } else if (this._data.title.length > 65) {
            score -= SCORE_DEDUCTION_MINOR;
            recommendations.push("Update your page title to contain 60 characters or less.");
        }

        this._results.push({
            'uniqueName': 'meta-title',
            'title': 'Page title',
            'description': 'Checks your page\'s title. A good page title should describe your page\'s content accurately and be under 60 characters long.',
            'weight': .2,
            'score': score,
            'snippets': [this._data.title],
            'recommendations': recommendations
        });
    }

    checkMetaDescription() {
        const recommendations = [];
        let score = 1;

        if (this._data.description.length < 1) {
            score -= SCORE_DEDUCTION_CRUCIAL;
            recommendations.push("Add a meta description to your page.");
        } else if (this._data.description.length > 160) {
            score -= SCORE_DEDUCTION_MINOR;
            recommendations.push("Update your meta description to contain between 50 and 160 characters.");
        }

        this._results.push({
            'uniqueName': 'meta-description',
            'title': 'Meta description',
            'description': 'Checks your page\'s meta description. Your page description is displayed in search results, so it should be written to convince people to click your link.',
            'weight': .2,
            'score': score,
            'snippets': [this._data.description],
            'recommendations': recommendations
        });
    }

    checkH1s() {
        const recommendations = [];
        let score = 1;

        if (this._data.h1s.length < 1) {
            score -= SCORE_DEDUCTION_CRUCIAL;
            recommendations.push("Add an H1 heading to your page");
        } else if (this._data.h1s.length > 1) {
            score -= SCORE_DEDUCTION_MINOR;
            recommendations.push("Remove extra H1 headings so your page only contains one.");
        }

        this._results.push({
            'uniqueName': 'h1-heading',
            'title': 'H1 headings',
            'description': 'Checks your page for H1 headings. Every page should include a single H1 heading tag that explains what the page is about.',
            'weight': .1,
            'score': score,
            'snippets': this._data.h1s,
            'recommendations': recommendations
        });
    }

    checkH2s() {
        const charactersPerHeading = (this._data.contentText.length / (this._data.h2s.length + this._data.h3s.length + 1));
        const hasEnoughHeadings = charactersPerHeading <= 1000;

        this._results.push({
            'uniqueName': 'h2-heading',
            'title': 'H2 headings',
            'description': 'Checks your page for H2 headings. Pages should include H2 heading tags that explain what the different sections of a page are about.',
            'weight': .05,
            'score': 1 - (!hasEnoughHeadings ? SCORE_DEDUCTION_CRUCIAL : 0),
            'snippets': this._data.h2s,
            'recommendations': !hasEnoughHeadings ? "Consider adding H2 headings to your page." : ''
        });
    }

    checkInlineStyles() {
        const lengthPercentage = this._data.inlineStyleNodes.reduce((stylesLength, result) => stylesLength + result.styles.length + 10, 0) / this._data.documentLength;
        const tooMuchInlineStyles = lengthPercentage > .01;

        this._results.push({
            'uniqueName': 'inline-css',
            'title': 'Inline styles',
            'description': 'Checks your page for inline styles. Inline styles should be kept to a minimum, as they slow down the loading speed of your page and make your site more difficult to maintain over time.',
            'weight': .1,
            'score': 1 - (tooMuchInlineStyles ? SCORE_DEDUCTION_CRUCIAL : 0),
            'snippets': this._data.inlineStyleNodes.map(result => result.openingTag),
            'recommendations': tooMuchInlineStyles ? `Move inline styles to CSS files to reduce your page's size by ${Math.round(lengthPercentage * 100, 2) / 100}%.` : ''
        });
    }

    checkAltlessImages() {
        this._results.push({
            'uniqueName': 'altless-imgs',
            'title': 'Alt text for images',
            'description': 'Checks your page for images without an alt attribute. The alt attribute on \`<img>\` tags allows you to describe the contents of the image, which improves accessibility and improves your SEO for image search engines like Google Search.',
            'weight': .1,
            'score': 1 - (this._data.deprecatedTags.length > 1 ? SCORE_DEDUCTION_CRUCIAL : 0),
            'snippets': this._data.altlessImgs,
            'recommendations': this._data.altlessImgs.length ? `Add an alt attribute to all of your <img> tags to describe their contents.` : ''
        });
    }

    checkDeprecatedTags() {
        this._results.push({
            'uniqueName': 'deprecated-tags',
            'title': 'Deprecated tags',
            'description': 'Checks your page for deprecated HTML tags. There are tags that are not valid anymore, and that may be displayed incorrectly by modern browsers.',
            'weight': .05,
            'score': 1 - (this._data.deprecatedTags.length > 1 ? SCORE_DEDUCTION_CRUCIAL : 0),
            'snippets': this._data.deprecatedTags,
            'recommendations': this._data.deprecatedTags.length ? `Remove or replace the deprecated HTML tags on your page.` : ''
        });
    }

    checkSeoFriendlyUrl() {
        let score = 1;
        const recommendations = [];
        const pageUrl = this.page.url();
        const pathParts = this._data.urlPath.split('/');

        // Unsafe characters
        if (this._data.urlPath.replace(/['"<>#%{}|\\^~[]`]/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "") != this._data.urlPath) {
            score -= SCORE_DEDUCTION_CRUCIAL;
            recommendations.push("Remove special characters from your page's URL. Your base URL should only use alphanumeric characters without accents, dashes and hyphens.");
        }

        // Numeric parts
        if (pathParts.filter(part => /^\d*$/.test(part)).length > 1 ||
            this._data.urlPath.replace(/\D/g, '').length / this._data.urlPath.length > .3 ||
            /\.[a-z0-9]{2,5}$/.test(this._data.urlPath) && this._data.urlQuery.replace(/\D/g, '').length > 0) {
            score -= SCORE_DEDUCTION_CRUCIAL;
            recommendations.push("Change your URL format to word-based slugs instead of numerical identifiers.");
        }

        // URL length
        if (pageUrl.length > 70) {
            score -= SCORE_DEDUCTION_MINOR;
            recommendations.push("Update your page's URL to be 50-60 characters long.");
        } else if (pageUrl.length > 60) {
            score -= SCORE_DEDUCTION_CONSIDER;
            recommendations.push("Consider updating your page's URL to be 50-60 characters long.");
        }

        // URL "folders" (2 max)
        if (pathParts.length > 3) {
            score -= SCORE_DEDUCTION_MINOR;
            recommendations.push("Reduce the amount of \"folders\" in your page's URL. Use at most 2 folders in your URLs for improved readability.");
        }

        // Uppercase characters
        if (this._data.urlPath.replace(/[A-Z]/g, '') != this._data.urlPath) {
            score -= SCORE_DEDUCTION_MINOR;
            recommendations.push("Replace uppercase characters in your page's URL by lowercase ones.");
        }

        // Hyphens > underscores
        if (this._data.urlPath.replace(/_/g, '') != this._data.urlPath) {
            score -= SCORE_DEDUCTION_MINOR;
            recommendations.push("Replace underscores in your page's URL by hyphens. Hyphens are the Google-preferred standard for URLs.");
        }

        this._results.push({
            'uniqueName': 'seo-friendly-url',
            'title': 'SEO friendly URL',
            'description': 'Checks your URL to see if it\'s SEO and user friendly. Good URLs are concise, descriptive and easy to read. Bad URLs are long and often composed of IDs and numbers that don\'t mean anything to users and search engines.',
            'weight': .1,
            'score': Math.max(0, score),
            'recommendations': recommendations
        });
    }

    async checkSslCertificate() {
        let hasSslCertificate = false;
        let certificate = null;
        let certificateIssuer = null;
        let certificateExpirationDate = null;

        if (this.page.url().indexOf('https://') === 0) {
            certificate = await sslCertificate.get(this._data.urlHostname, 1000);
            if (certificate && certificate.valid_to && new Date(certificate.valid_to) > new Date()) {
                hasSslCertificate = true;
                certificateExpirationDate = new Date(certificate.valid_to).toLocaleString();
                certificateIssuer = certificate.issuer.CN || certificate.issuer.O || Object.values(certificate.infoAccess)[0] || 'Unknown';
            }
        }

        this._results.push({
            'uniqueName': 'ssl-certificate',
            'title': 'SSL certificate',
            'description': 'Checks if your URL uses the https protocol with a valid SSL certificate. This is important for security, SEO and user trust.',
            'weight': .1,
            'score': hasSslCertificate ? 1 : 0,
            'snippets': hasSslCertificate ? [`Your website has a valid SSL certificate provided by ${certificateIssuer}. It is valid until ${certificateExpirationDate}.`] : [],
            'recommendations': !hasSslCertificate ? "Set up an SSL certificate for your website and update your pages to use the https protocol." : '',
        });
    }

    async _extractData() {
        this._data = await this.page.evaluate(() => {
            const getOpeningTag = (node) => { return node.outerHTML.replace(node.innerHTML, '').replace(/<\/[a-zA-Z]+>$/, '') };

            const titleNode = document.querySelector('title');
            const descriptionNode = document.querySelector('meta[name="description"]');
            const robotsMetaNode = document.querySelector('meta[name="robots"]');

            return {
                title: titleNode ? titleNode.textContent.trim() : '',
                description: descriptionNode ? descriptionNode.getAttribute('content').trim() : '',
                robots: robotsMetaNode ? robotsMetaNode.getAttribute('content').trim() : '',
                documentLength: document.documentElement.outerHTML.length,
                contentText: document.body.innerText,
                h1s: [...document.querySelectorAll('h1')].map(node => node.innerText.replace('\n', ' ').trim()),
                h2s: [...document.querySelectorAll('h2')].map(node => node.innerText.replace('\n', ' ').trim()),
                h3s: [...document.querySelectorAll('h3')].map(node => node.innerText.replace('\n', ' ').trim()),
                inlineStyleNodes: [...document.querySelectorAll('[style]:not([style=""])')].map(node => { return { styles: node.getAttribute('style'), openingTag: getOpeningTag(node) }}),
                deprecatedTags: [...document.querySelectorAll('acronym, applet, basefont, big, center, dir, font, frame, frameset, isindex, noframes, s, strike, tt, u')].map(getOpeningTag),
                altlessImgs: [...document.querySelectorAll('img:not([alt]), img[alt=""]')].map(getOpeningTag),
                urlPath: decodeURI(window.location.pathname.replace(/^\//, '')),
                urlQuery: window.location.search,
                urlHostname: window.location.hostname,
            };
        });
    }
}

module.exports = Tool;
