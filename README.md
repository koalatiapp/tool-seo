# Koalati Tool Template

This repository contains everything you need to create a custom tool for Koalati.com.

To get started, clone this repository:
```
git clone https://github.com/koalatiapp/tool-template.git
```

Then, open `tool.js` in your preferred editor or IDE and get started building your own custom tool!

To see what completed tools might look like, take a look at our tool repositories on https://github.com/koalatiapp/


## Testing your tool

Once you have started developing your tool, you can easily test it and validate its results.

To do so, first make sure you have all of the devDependencies by running:
```bash
sudo npm install --unsafe-perm=true --allow-root
```

_It is important to have the extra arguments in there, because the testing script uses Puppeteer, which relies on the headless Chromium browser. Running in root and adding the `--unsafe-perm=true --allow-root` arguments is usually required for the Chromium browser to download and install itself along with Puppeteer._

Once the development dependencies are installed, there are two ways you can test your tool.

You can test it by running the following command, which will run your tool on Koalati's homepage by default:
```bash
npm test
```

Alternatively, you can use the following command and specify which webpage to try your tool on:
```bash
npx @koalati/dev-tool-tester --url="https://koalati.com/"
```


For more information on automated testing for your tools, check out the [dev-tool-tester repository](https://github.com/koalatiapp/dev-tool-tester).
