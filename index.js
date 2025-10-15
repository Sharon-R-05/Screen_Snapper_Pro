import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from 'url';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const minimal_args = [
  "--autoplay-policy=user-gesture-required",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-breakpad",
  "--disable-client-side-phishing-detection",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-dev-shm-usage",
  "--disable-domain-reliability",
  "--disable-extensions",
  "--disable-features=AudioServiceOutOfProcess",
  "--disable-hang-monitor",
  "--disable-ipc-flooding-protection",
  "--disable-notifications",
  "--disable-offer-store-unmasked-wallet-cards",
  "--disable-popup-blocking",
  "--disable-print-preview",
  "--disable-prompt-on-repost",
  "--disable-renderer-backgrounding",
  "--disable-setuid-sandbox",
  "--disable-speech-api",
  "--disable-sync",
  "--hide-scrollbars",
  "--ignore-gpu-blacklist",
  "--metrics-recording-only",
  "--mute-audio",
  "--no-default-browser-check",
  "--no-first-run",
  "--no-pings",
  "--no-sandbox",
  "--no-zygote",
  "--password-store=basic",
  "--use-gl=swiftshader",
  "--use-mock-keychain",
];

const app = express();

app.use(express.json());
app.use(cors());
// Serve frontend files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Viewport configurations
const viewportConfigs = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
  custom: { width: 1280, height: 720 }
};

app.post("/fetch-screen", async (req, res) => {
  const { url, options = {} } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  console.log("Capturing screenshot for:", url, "with options:", options);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: minimal_args,
      userDataDir: "./temp",
    });

    const page = await browser.newPage();
    
    // Set viewport based on options
    const viewportType = options.viewPort || 'desktop';
    const viewport = viewportConfigs[viewportType] || viewportConfigs.desktop;
    await page.setViewport(viewport);

    // Set user agent for better mobile rendering
    if (viewportType === 'mobile') {
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
    }

    // Navigate with options
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Add delay if specified
    if (options.delay && options.delay > 0) {
      await page.waitForTimeout(options.delay * 1000);
    }

    // Capture screenshot
    let screenshot;
    if (options.fullPage) {
      screenshot = await page.screenshot({ encoding: "base64" });
    } else {
      const content = await page.$("body");
      screenshot = await content?.screenshot({ encoding: "base64" });
    }

    await browser.close();

    res.setHeader("cache-control", "public, max-age=3600");
    res.send(`data:image/jpeg;base64,${screenshot}`);

  } catch (error) {
    console.error("Screenshot capture error:", error);
    
    if (browser) {
      await browser.close();
    }

    // Send JSON error response
    res.status(500).json({ 
      error: "Failed to capture screenshot",
      details: error.message 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Serve frontend for root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 6969;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`📸 Screenshot API available at http://localhost:${PORT}/fetch-screen`);
  console.log(`❤️  Health check at http://localhost:${PORT}/health`);
  console.log(`🌐 Frontend served at http://localhost:${PORT}`);
  
  // Auto-open browser
  const url = `http://localhost:${PORT}`;
  console.log(`🔄 Opening browser automatically...`);
  
  setTimeout(async () => {
    try {
      await open(url);
      console.log('✅ Browser opened automatically!');
    } catch (error) {
      console.log('⚠️  Could not auto-open browser. Please manually visit:', url);
    }
  }, 1000);
});