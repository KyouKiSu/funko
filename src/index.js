import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import buildLogger from "./logger.js";
import { default as ImapClient } from 'emailjs-imap-client'
import my_utils from "./utils/file_parse.js";

const DELAY = 10000;
const PASSWORD_EXTRA = "39tt!";
const EXIT_AFTER_FINISHED = true;

const DIR_PATH = dirname(fileURLToPath(import.meta.url));
let emails = my_utils.get_array_from_file(`${DIR_PATH}\\email.txt`).map(my_utils.format_email)
let proxies = my_utils.get_array_from_file(`${DIR_PATH}\\proxy.txt`).map(my_utils.format_proxy)
puppeteer.use(StealthPlugin());
process.setMaxListeners(0);

async function get_codes_droppp(user, pass, imap, port) {
    let codes = [];
    var client = new ImapClient.default(imap, port, {
        logLevel: 40,
        auth: {
            user: user,
            pass: pass,
        }
    });
    await client.connect()
    const MAX_RETRIES = 10;
    let current_attempt = 0;
    const sleep_time = 2000;
    while (current_attempt < MAX_RETRIES) {
        await client.listMessages('INBOX', '1:*', ['uid', 'flags', 'envelope', 'body[]'], { valueAsString: true }).then((messages) => {
            messages.slice().reverse().forEach((message) => {
                if (message.envelope.from[0].address == "support@droppp.io") {
                    let reg = />\d\d\d\d\d\d</g
                    let code = message["body[]"].match(reg)
                    code = code[0].replace(">", "").replace("<", "")
                    codes.push(code)
                }
            });
        })
        if (codes != []) break;
        current_attempt += 1;
        await new Promise(resolve => setTimeout(resolve, sleep_time))
    }
    await client.close()
    return codes;
}
async function create_funko_account(email_obj, proxy_obj, i) {
    const loggers = buildLogger(DIR_PATH + "\\logs\\", email_obj[0]);
    let { logScreen } = loggers;
    let browser;
    let args = ['--disable-extensions-http-throttling', '--auto-open-devtools-for-tabs', `--proxy-server=${proxy_obj[2]}`,
        `--disable-extensions-except=${DIR_PATH}\\anticaptcha`,
        `--load-extension=${DIR_PATH}\\anticaptcha`,]

    let page = '';
    try {
        browser = await puppeteer.launch({
            userDataDir: `${DIR_PATH}\\profiles\\${i}\\`,
            headless: false,
            ignoreDefaultArgs: ["--enable-automation"],
            args: args
        });
        [page] = await browser.pages();
        await page.authenticate({ username: proxy_obj[0], password: proxy_obj[1] })
        await page.goto('https://droppp.io/', { waitUntil: 'load' });
        await page.setDefaultTimeout(500000);
        await new Promise(r => setTimeout(r, 5000));
    }
    catch (e) {
        logScreen.error("connection error, check proxy" + e)
        return;
    }

    try {
        logScreen.info("started creation")
        try {
            await Promise.all([
                await page.click("#__next > div.styles_wrap__1GWKR > div.styles_container__HCN49 > div.styles_contentWrap__3vhmC > div.styles_intro__1eSrO > div.styles_links__3SQHD > button")
            ]);
            await new Promise(r => setTimeout(r, 2000));
            await page.focus('#__next > div.styles_container__20C00 > div > div.styles_container__2vQ2_ > form > input:nth-child(1)')
            await page.keyboard.type(email_obj[0])
            await page.focus('#__next > div.styles_container__20C00 > div > div.styles_container__2vQ2_ > form > input:nth-child(2)')
            await page.keyboard.type((email_obj[1] + PASSWORD_EXTRA))
            await Promise.all([
                await page.click("#__next > div.styles_container__20C00 > div > div.styles_container__2vQ2_ > form > button")
            ]);
        }
        catch (e) {
            //logScreen.error(e)
            //prly awaiting for email
            await Promise.all([
                await page.click("#__next > div.styles_header__I2p04 > div > a")
            ]);

        }

        try {
            //await page.waitForNavigation({ waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, 1500));
            if ((await page.content()).match('An account is already associated with this email.')) {
                throw 'rip'
            }


            await page.waitForSelector("#__next > div.styles_container__20C00 > div > div.styles_container__1DJtJ > form > div.styles_container__3tX-w > div > input[type=tel]:nth-child(1)")
        }
        catch (e) {
            logScreen.info("already registered")
            await page.goto('https://droppp.io/login/', { waitUntil: 'load' })
            await page.focus('#__next > div.styles_container__20C00 > div > div.styles_container__37UFk > form > input:nth-child(1)')
            await page.keyboard.type(email_obj[0])
            await page.focus('#__next > div.styles_container__20C00 > div > div.styles_container__37UFk > form > input:nth-child(2)')
            await page.keyboard.type((email_obj[1] + PASSWORD_EXTRA))
            await Promise.all([
                await page.click("#__next > div.styles_container__20C00 > div > div.styles_container__37UFk > form > button")
            ]);
            await new Promise(r => setTimeout(r, 1500));
            if (EXIT_AFTER_FINISHED) {
                browser.close()
            }
        }
        let passed = false;
        for (let retry = 0; retry < 5 && !passed; retry++) {
            let resend_exists = false;
            try {
                await page.waitForSelector("#__next > div.styles_container__20C00 > div > div.styles_container__1DJtJ > form > div.styles_links__31NJI > div", { timeout: 1000 });
                if (retry > 0) {
                    await Promise.all([
                        await page.click("#__next > div.styles_container__20C00 > div > div.styles_container__1DJtJ > form > div.styles_links__31NJI > div")
                    ]);
                }
                resend_exists = true;
            } catch (error) {
                passed = true;
            }
            if (resend_exists) {
                await page.focus('#__next > div.styles_container__20C00 > div > div.styles_container__1DJtJ > form > div.styles_container__3tX-w > div > input[type=tel]:nth-child(1)')
                logScreen.info("waiting for code")
                await new Promise(r => setTimeout(r, 5000));
                let code = await get_codes_droppp(email_obj[0], email_obj[1], email_obj[2], email_obj[3])
                code = code[0]
                logScreen.info("received " + code)
                await page.keyboard.type(code)
                await new Promise(r => setTimeout(r, 500));
                await page.waitForSelector("#__next > div.styles_container__20C00 > div > div.styles_container__1DJtJ > form > button")
                await Promise.all([
                    await page.click("#__next > div.styles_container__20C00 > div > div.styles_container__1DJtJ > form > button")
                ]);
                await new Promise(r => setTimeout(r, 500));
            }
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
            let sr = 1;
        }
        logScreen.info('created')
    }
    catch (e) {
        logScreen.error(e)
    }
    if (EXIT_AFTER_FINISHED) {
        browser.close()
    }
}
const O = 0
const N = emails.length;
for (let i = O; i < N; i++) {
    try {
        create_funko_account(emails[i], proxies[i % proxies.length], i)
    }
    catch (e) {
        console.log("unexpected error", e)
    }
    await new Promise(resolve => setTimeout(resolve, DELAY))
}