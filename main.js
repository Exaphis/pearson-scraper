const puppeteer = require('puppeteer');
const config = require('./config');

async function main() {
    console.log('[+] starting pearson-scraper...');

    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();

    // Must set viewport width larger than 800 to avoid cutting off end of longer pages (why?)
    await page.setViewport({width: 1440, height: 900});

    console.log('[+] logging in...');
    await page.goto('https://console.pearson.com', {waitUntil: 'networkidle0'});

    await page.type('#username', config.PEARSON_USERNAME);
    await page.type('#password', config.PEARSON_PASSWORD);
    await page.click('#mainButton');
    await page.waitForNavigation();

    console.log('[+] logged in.\n');

    await page.goto(config.PEARSON_EBOOK_FIRST_PAGE_URL);

    let page_num = 0;
    while (true) {
        page_num++;
        console.log('[+] loading page ' + page_num + '...');

        await page.waitForSelector('.vega-reader-content');
        await page.waitForSelector('.vega-pxe-frame');

        // Page has loaded when vega-reader-content class stops changing and scroll height is equal
        let duplicates = 0;
        let prev_class_name = null;
        let scroll_height = null;
        while (duplicates < 10) {  // Use 10 for 5 second wait (waits for math typesetting, etc.)
            let class_name = await page.evaluate("document.getElementsByClassName('vega-reader-content')[0].className");
            let new_height = await page.evaluate("document.getElementsByClassName('vega-pxe-frame')[0].contentDocument.body.scrollHeight").catch(err => duplicates = 0);
            if (class_name === prev_class_name && scroll_height === new_height) {
                duplicates++;
            }
            else {
                duplicates = 0;
            }

            prev_class_name = class_name;
            scroll_height = new_height;
            await page.waitFor(500);
        }

        console.log('[+] page ' + page_num + ' loaded.');

        if (await page.$('.button-skip') !== null) {
            await page.click('.button-skip');
        }

        let chapter = await page.evaluate("document.getElementById('vega-app-bar-title').innerHTML");
        console.log('[+] chapter: ' + chapter);

        // Disable reader header and page navigation so they don't show up in resulting PDF
        await page.evaluate("document.getElementsByClassName('vega-reader-header')[0].style.display = 'none'");
        await page.evaluate("document.getElementsByClassName('pageNavigation')[0].style.display = 'none'");

        // await page.setViewport({width: 800, height: scroll_height + 50});
        // await page.screenshot({path: 'output/' + page_num + '_' + chapter + '.png', fullPage: true});
        await page.pdf({
            path: 'output/' + page_num + '__' + chapter + '.pdf',
            width: 1440, height: scroll_height + 150,  // + 150 for add space on bottom (different from margins)
            margin: {right: 50, left: 50}
        });

        await page.evaluate("document.getElementsByClassName('pageNavigation')[0].style.display = 'block'");
        await page.evaluate("document.getElementsByClassName('vega-reader-header')[0].style.display = 'block'");
        // await page.setViewport({width: 800, height: 600});

        console.log('[+] page ' + page_num + ' complete.\n');

        // Move on to next page if exists
        if (await page.$('[aria-label="next page"]') === null) {
            break;
        }
        await page.click('[aria-label="next page"]');

        await page.waitFor(500);
    }

    console.log('[+] finished.');
}

main();
