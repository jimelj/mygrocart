
const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();

chromium.use(stealth);

// Simulate a proxy configuration (replace with actual proxy details if available)
const proxyConfig = {
    server: process.env.PROXY_SERVER || null, // e.g., "http://username:password@proxy.example.com:8080"
};

// Placeholder for a CAPTCHA solving function
async function solveCaptcha(page) {
    console.log("Attempting to solve CAPTCHA...");
    // In a real scenario, you would integrate with a CAPTCHA solving service API here
    // For example, using 2Captcha, Anti-Captcha, CapSolver, etc.
    // This might involve:
    // 1. Detecting the CAPTCHA type (reCAPTCHA, hCaptcha, Cloudflare Turnstile)
    // 2. Sending the CAPTCHA image/sitekey to the service
    // 3. Waiting for the solution
    // 4. Injecting the solution back into the page
    console.log("CAPTCHA solving placeholder: Manual intervention or external service needed.");
    await page.waitForTimeout(10000); // Simulate CAPTCHA solving time
    return true; // Assume success for demonstration
}

async function scrapeShopRite(zipCode, searchTerm) {
    const browser = await chromium.launch({
        headless: false,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
        ],
    });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
        locale: "en-US"
    });
    const page = await context.newPage();

    try {
        console.log("Navigating to ShopRite...");
        await page.goto("https://www.shoprite.com/", { waitUntil: "domcontentloaded", timeout: 60000 });

        // Wait for Cloudflare to resolve, if present
        console.log("Checking for Cloudflare challenge...");
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries) {
            const title = await page.title();
            const currentUrl = page.url();

            if (title.includes("Just a moment...") || title.includes("Security Block") || currentUrl.includes("cloudflare.com")) {
                console.log(`Cloudflare challenge detected (Attempt ${retries + 1}/${maxRetries})...`);
                const challengeSolved = await solveCaptcha(page);
                if (challengeSolved) {
                    console.log("CAPTCHA solving initiated. Waiting for navigation...");
                    try {
                        await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 });
                        if (!page.url().includes("shoprite.com")) {
                            console.log("Still on Cloudflare after navigation, retrying...");
                            retries++;
                            continue;
                        }
                    } catch (navError) {
                        console.warn("Navigation after CAPTCHA timed out or failed, retrying...");
                        retries++;
                        continue;
                    }
                } else {
                    console.error("CAPTCHA solving failed.");
                    break; // Exit if CAPTCHA solving explicitly fails
                }
            } else if (currentUrl.includes("shoprite.com")) {
                console.log("Successfully bypassed initial security.");
                break; // Exit loop if on ShopRite page
            } else {
                console.log("No Cloudflare challenge detected, or already bypassed.");
                break; // Exit loop if no challenge and not on Cloudflare
            }
            retries++;
        }

        if (!page.url().includes("shoprite.com")) {
            console.error("Failed to bypass Cloudflare or navigate to ShopRite main page after multiple attempts. Current URL:", page.url());
            return null;
        }

        console.log("Current URL after bypass attempts:", page.url());

        // Now, handle ZIP code input if necessary
        console.log("Checking for ZIP code input...");
        const zipInputSelector = "input[name=\"zip\"]"; // Common selector for ZIP code input
        const zipSubmitSelector = "button[type=\"submit\"]"; // Common selector for submit button

        const zipInputExists = await page.$(zipInputSelector);
        if (zipInputExists) {
            console.log("ZIP code input found. Entering ZIP code:", zipCode);
            await page.fill(zipInputSelector, zipCode);
            const submitButton = await page.$(zipSubmitSelector);
            if (submitButton) {
                await submitButton.click();
                await page.waitForNavigation({ waitUntil: "domcontentloaded" });
                console.log("ZIP code submitted. Current URL:", page.url());
            } else {
                console.warn("ZIP code submit button not found.");
            }
        } else {
            console.log("No explicit ZIP code input found or already set.");
        }

        // Search for the product
        console.log("Searching for product:", searchTerm);
        const searchInputSelector = "input[placeholder*=\"Search\"]"; // Common search input placeholder
        const searchButtonSelector = "button[aria-label*=\"Search\"]"; // Common search button

        await page.waitForSelector(searchInputSelector, { timeout: 10000 });
        await page.fill(searchInputSelector, searchTerm);
        await page.press(searchInputSelector, "Enter"); // Press Enter to submit search
        await page.waitForNavigation({ waitUntil: "domcontentloaded" });

        console.log("Search results page URL:", page.url());

        // Extract product data (simplified for now)
        const products = await page.evaluate(() => {
            const productElements = document.querySelectorAll(".product-card"); // Adjust selector based on actual site
            const data = [];
            productElements.forEach(el => {
                const name = el.querySelector(".product-name")?.innerText.trim();
                const price = el.querySelector(".product-price")?.innerText.trim();
                // Add more fields like UPC, image, etc. as needed
                if (name && price) {
                    data.push({ name, price });
                }
            });
            return data;
        });

        console.log("Extracted Products:", products);
        return products;

    } catch (error) {
        console.error("Scraping failed:", error);
        return null;
    } finally {
        await browser.close();
    }
}

module.exports = { scrapeShopRite };


