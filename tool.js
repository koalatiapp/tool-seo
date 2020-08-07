'use strict';

class Tool {
    /**
     * Creates and initializes an instance of your tool
     *
     * @param {Object} data Object containing the data that is made available to the tool.
     * @param {Object} data.page The current Puppeteer page's instance (https://pptr.dev/#?product=Puppeteer&version=main&show=api-class-page)
     * @param {Object} data.devices A list of devices to be used with page.emulate(). This is a reference to puppeteer.devices.
     * @param {Object} data.consoleMessages An object containing the messages from the browser's console
     */
    constructor({ page, devices }) {
        // set up properties and connections if needed
        this.page = page;
        this.devices = devices;
    }

    /**
     * Runs your tool on the page stored in `this.page`
     */
    async run() {
        // run the tool on the page/website
        // use the Puppeteer page object store in this.page to interact with the active page

        // Ex.: execute a function within the page to get or to analyze data
        const pageTitle = await this.page.evaluate(() => {
            const titleNode = document.querySelector('title');
            return titleNode ? titleNode.textContent : null;
        });

        // Ex.: emulate an iPhone's viewport and user agent
        await this.page.emulate(this.devices['iPhone 8']);

        // Ex.: type inside an input
        await this.page.type('input[name="email"]', 'info@koalati.com', { delay: 50 });

        // Ex.: wait for a selector to appear in the page
        await this.page.waitForSelector('img', { timeout: 5000 });
    }

    get results() {
        // returns an array of formatted Result objects
        // this method will always be called after run()
        // this getter should contain little to no logic or processing: it's only goal is to return the results in the Koalati's desired format

        return [
            {
                'uniqueName': 'your_test_unique_name', // a test name that is unique within your tool. this will be prefixed with your tool's name to generate a Koalati-wide unique name for this test.
                'title': 'Your test\'s user-friendly title',
                'description': 'Your test\'s user-friendly description.', // This can be a static description of what your test looks for, or a dynamic one that describes the results.
                'weight': 1, // the weight of this test's score as a float. the sum of the weights of all your results should be 1.0
                'score': 1, // the score obtained as a float: 0.5 is 50%, 1.0 is 100%, etc.
                // 'snippets': [], // a one-dimensional array of strings and/or ElementHandle that can be represented as code snippets in Koalati's results
                // 'table': [], // a two-dimensional array of data that will be represented as a table in Koalati's results. The first row should contain the column's headings.
                // 'recommendations': '', // a string or an array of string that gives recommendations, telling the user what can be done to improve the page
            },
            // ...
        ];
    };

    async cleanup() {
        // cleans up the variables and connections
        // this will be called once your tool has been executed and its results have been collected
        // your goal here is to put everything back the way it was before your tool was initialized
    };
}

module.exports = Tool;
