import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import buildLogger from "./logger.js";
import imaps from 'imap-simple'
import * as _ from 'underscore'
import my_utils from "./utils/file_parse.js";

const DELAY = 20000;
const PASSWORD_EXTRA = "39tt!";
const KEEP_OPEN = false;

const DIR_PATH = dirname(fileURLToPath(import.meta.url));
let emails = my_utils.get_array_from_file(`${DIR_PATH}\\email.txt`).map(my_utils.format_email)
let proxies = my_utils.get_array_from_file(`${DIR_PATH}\\proxy.txt`).map(my_utils.format_proxy)
puppeteer.use(StealthPlugin());
process.setMaxListeners(0);

async function get_codes_droppp(user, pass, imap, port) {
    let codes = []
    var config = {
        imap: {
            user: user,
            password: pass,
            host: imap,
            port: port,
            tls: true,
            authTimeout: 20000
        }
    };
    let connection = await imaps.connect(config)
    await connection.openBox('INBOX')
    var searchCriteria = ['1:*'];
    var fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
    };
    const MAX_RETRIES = 5;
    let current_attempt = 0;
    const sleep_time = 2000;
    while (current_attempt < MAX_RETRIES) {
        let messages = await connection.search(searchCriteria, fetchOptions)

        messages.forEach(function (item) {
            var headers = _.find(item.parts, { "which": "HEADER" })
            let sender = String((headers['body']['from']))
            if (sender.includes('support@droppp.io')) {
                var text = _.find(item.parts, { "which": "TEXT" })['body']
                let reg = />\d\d\d\d\d\d</g
                let code = text.match(reg)
                code = code[0].replace(">", "").replace("<", "")
                codes.push(code)
            }
        });
        if (codes != []) break;
        current_attempt += 1;
        await new Promise(resolve => setTimeout(resolve, sleep_time))
    }
    connection.end()
    return codes
}

async function wait_and_click(page, selector) {
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.focus(selector)
    await Promise.all([
        await page.click(selector)
    ]);

    await new Promise(r => setTimeout(r, 400));

}



async function create_funko_account(email_obj, proxy_obj, i) {
    const loggers = buildLogger(DIR_PATH + "\\logs\\", email_obj[0]);
    let { logScreen } = loggers;
    let browser;
    let args = ['--disable-extensions-http-throttling', '--auto-open-devtools-for-tabs', `--proxy-server=${proxy_obj[2]}`,
        //`--disable-extensions-except=${DIR_PATH}\\anticaptcha`,
        `--load-extension=${DIR_PATH}\\anticaptcha`,]

    let page = '';
    logScreen.info("Starting");
    try {
        browser = await puppeteer.launch({
            userDataDir: `${DIR_PATH}\\profiles\\${email_obj[0]}\\`,
            headless: false,
            ignoreDefaultArgs: ["--enable-automation"],
            args: args
        });
        //logScreen.info("Starting")
        [page] = await browser.pages();
        await page.authenticate({ username: proxy_obj[0], password: proxy_obj[1] })
        await page.goto('https://droppp.io/', { waitUntil: 'load', timeout: 120000 });
        await page.setDefaultTimeout(500000);
        await new Promise(r => setTimeout(r, 5000));
    }
    catch (e) {
        logScreen.error("connection error, check proxy" + e)
        return;
    }

    try {

        logScreen.info("Started")

        if ((await page.content()).match(`>Profile<`)) {
            logScreen.info('Has auth');

            await wait_and_click(page, "#__next > div.styles_header__I2p04 > div > a")
        } else {
            try {
                await wait_and_click(page, "#__next > div.styles_wrap__1GWKR > div.styles_container__HCN49 > div.styles_contentWrap__3vhmC > div.styles_intro__1eSrO > div.styles_links__3SQHD > button")
                await wait_and_click(page, "#__next > div.styles_container__20C00 > div > div.styles_container__F3xbE > form > input")
                await page.keyboard.type(email_obj[0])
                await wait_and_click(page, "#__next > div.styles_container__20C00 > div > div.styles_container__F3xbE > form > button")
                await wait_and_click(page, '#__next > div.styles_container__20C00 > div > div.styles_container__F3xbE > form > div > div > input')
                await page.keyboard.type((email_obj[1] + PASSWORD_EXTRA))
                await wait_and_click(page, "#__next > div.styles_container__20C00 > div > div.styles_container__F3xbE > form > button")
            }
            catch (e) {
                logScreen.error(page, "Already in")
            }
        }
        try {
            await page.waitForSelector("#__next > div.styles_container__1cJGR > div.styles_logoContainer__2lTns > div.styles_container__2gBt_.styles_logo__2ZC3F > div > svg", { timeout: 8000 })
            logScreen.info("Logged in")
            if (!KEEP_OPEN) browser.close()
            return;
        } catch (e) {
            logScreen.info("Have to complete email check")
        }
        let passed = false;
        for (let retry = 0; retry < 5 && !passed; retry++) {
            logScreen.info("Email code, attempt # " + retry)
            await page.focus('#__next > div.styles_container__20C00 > div > div.styles_container__1DJtJ > form > div.styles_container__3tX-w > div > input[type=tel]:nth-child(1)')
            logScreen.info("Waiting for code")
            await new Promise(r => setTimeout(r, 5000));
            let codes = await get_codes_droppp(email_obj[0], email_obj[1], email_obj[2], email_obj[3])
            logScreen.info("Codes:    " + codes)
            let code = codes[codes.length - 1]
            logScreen.info("Received: " + code)
            await page.keyboard.type(code)
            await new Promise(r => setTimeout(r, 500));
            // next button
            await wait_and_click(page, "#__next > div.styles_container__20C00 > div > div.styles_container__1DJtJ > form > button")
            // invalid
            await new Promise(r => setTimeout(r, 2000));
            if ((await page.content()).match(`Invalid code. Please try again.`)) {
                continue;
            }
            passed = true;
            break;
        }
        if (passed == false) {
            logScreen.info("Can't pass email check")
            if (!KEEP_OPEN) browser.close()
            return;
        }

        //mailing list
        await new Promise(r => setTimeout(r, 500));
        await page.waitForSelector("#__next > div.styles_container__20C00 > div > form > div > a")
        await Promise.all([
            await page.click("#__next > div.styles_container__20C00 > div > form > div > a")
        ]);
        //custom address
        await new Promise(r => setTimeout(r, 500));
        await page.waitForSelector("#__next > div.styles_container__20C00 > div > form > button")
        await Promise.all([
            await page.click("#__next > div.styles_container__20C00 > div > form > button")
        ]);
        //mailing list 2
        try {
            await new Promise(r => setTimeout(r, 2000));
            await Promise.all([
                await page.click("#modal > div.styles_wrapper__231s9.enter-done > div > div.styles_content__2RKgv > div.styles_linkClose__2rHUF.styles_container__1pkou.styles_container__URLF_")
            ]);
            await new Promise(r => setTimeout(r, 2000));
        }
        catch (e) {
            let _ = 1;
        }
        logScreen.info('Created')
    }
    catch (e) {
        logScreen.error(e)
    }
    if (!KEEP_OPEN) browser.close()
    return;
}
const O = 0
const N = 1
for (let i = O; i < N; i++) {
    try {
        create_funko_account(emails[i], proxies[i % proxies.length], i)
    }
    catch (e) {
        console.log("unexpected error", e)
    }
    await new Promise(resolve => setTimeout(resolve, DELAY))
}