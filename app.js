const express = require("express");
const app = express();
const port = 3000;
const { router } = require("bull-board");
const Queue = require("bull");
const { setQueues, BullAdapter } = require("bull-board");
app.use("/bull", router);
app.use(express.static("public"));

const queue = new Queue("Example", {
  redis: { port: 6379, host: "redis" },
});
const puppeteer = require("puppeteer");

async function xtype(page, xpath, value, withEnter = false) {
  try {
    const elem = await page.$x(xpath);
    await elem[0].type(value);
    if (withEnter) {
      page.keyboard.press("Enter");
    }
  } catch (error) {
    throw new Error("Cannot type in: " + xpath);
  }
}
async function xclick(page, xpath) {
  try {
    const elem = await page.$x(xpath);
    await elem[0].click();
  } catch (error) {
    throw new Error("Cannot click on " + xpath);
  }
}

async function xtext(page, xpath) {
  try {
    const element = await page.$x(xpath);
    const text = await page.evaluate((el) => el.textContent, element[0]);
    return text;
  } catch (error) {
    throw new Error("Cannot get text from: " + xpath);
  }
}

async function xInnerText(page, xpath) {
  try {
    const element = await page.$x(xpath);
    const innerText = await page.evaluate((el) => el.innerText, element[0]);
    return innerText;
  } catch (error) {
    throw new Error("Cannot get innerText from: " + xpath);
  }
}

async function exampleJob(job, done) {
  const browser = await puppeteer.launch({
    headless: true,
    slowMo: 10,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const [page] = await browser.pages();
  try {
    page.on("error", (err) => {});
    page.on("pageerror", (err) => {});
    browser.on("done(new Error(", (err) => {});
    browser.on("targetdestroyed", (err) => {});

    page.on("dialog", async (dialog) => {
      await page.close();
      await browser.close();
      done(new Error("dialog: alert"));
    });

    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto("https://www.python.org/");
    job.progress(10);
    await xtype(page, '//*[@id="id-search-field"]', "async");
    await xclick(page, '//*[@id="submit"]');
    job.progress(50);
    await page.waitForXPath(
      '//*[@id="content"]/div/section/form/ul/li[1]/h3/a'
    );
    await xclick(page, '//*[@id="content"]/div/section/form/ul/li[1]/h3/a');
    job.progress(75);
    await page.waitForXPath('//*[@id="content"]/div/section/article/header/h1');
    const result = await xInnerText(
      page,
      '//*[@id="content"]/div/section/article/header/h1'
    );

    job.progress(100);
    done(null, { result: result });
  } catch (error) {
    done(error);
  } finally {
    try {
      await page.close();
    } catch (err) {}
    try {
      await browser.close();
    } catch (err) {}
  }
}

queue.process(function (job, done) {
  exampleJob(job, done);
});

setQueues([new BullAdapter(queue)]);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

async function process() {
  const job = await queue.add();
}

app.post("/task", (req, res) => {
  process();
  res.redirect("/bull");
});

app.listen(port, () => {
  console.log(
    `Example Puppeter+Bull app listening at http://localhost:${port}`
  );
});
