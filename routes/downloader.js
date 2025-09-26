// ✅ SudoR2spr → WOODcraft 
import { Router } from 'express';
import { instagramGetUrl } from 'instagram-url-direct';
import puppeteer from 'puppeteer';

const router = Router();
const cache = new Map();

function setCacheWithExpiry(key, value, ttl = 300000) {
  cache.set(key, value);
  setTimeout(() => cache.delete(key), ttl);
}

async function fetchWithPuppeteer(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  await page.goto(url, { waitUntil: 'networkidle2' });

  const mediaLinks = await page.evaluate(() => {
    const videos = [...document.querySelectorAll('video')].map(v => v.src);
    const images = [...document.querySelectorAll('img')].map(i => i.src);
    return [...videos, ...images].filter(link => link && link.startsWith('https://'));
  });

  await browser.close();
  return mediaLinks;
}

// ✅ Common function for both POST and GET
async function handleInstagramDownload(url, res) {
  if (!url) return res.json({ status: "error", details: "❗ ইন্সটাগ্রাম লিংক দেওয়া হয়নি" });

  if (cache.has(url)) return res.json(cache.get(url));

  try {
    const result = await instagramGetUrl(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/'
      }
    });

    if (result?.media_details?.length > 0) {
      const downloads = result.media_details.map(item => ({
        type: item.type,
        url: item.url,
        thumbnail: item.thumbnail || item.url
      }));

      const postType = url.includes("/reel/") ? "Reel" : url.includes("/tv/") ? "IGTV" : "Post";
      const caption = result.post_info?.caption || "";

      const response = {
        status: "success",
        postType,
        caption,
        totalMedia: downloads.length,
        downloads
      };

      setCacheWithExpiry(url, response);
      return res.json(response);
    }

    throw new Error("❗ instagram-url-direct এ কিছু পাওয়া যায়নি, Puppeteer দিয়ে চেষ্টা করছি...");
  } catch (error) {
    console.log("instagram-url-direct failed:", error.message);
  }

  // ✅ Fallback → Puppeteer
  try {
    const mediaLinks = await fetchWithPuppeteer(url);
    if (mediaLinks.length === 0) throw new Error("❗ Puppeteer দিয়েও কোনো ভিডিও বা ছবি পাওয়া যায়নি");

    const downloads = mediaLinks.map(link => ({
      type: link.endsWith('.mp4') ? 'video' : 'image',
      url: link,
      thumbnail: link
    }));

    const postType = url.includes("/reel/") ? "Reel" : url.includes("/tv/") ? "IGTV" : "Post";

    const response = {
      status: "success",
      postType,
      caption: "", // Puppeteer এ caption পাওয়া যায় না
      totalMedia: downloads.length,
      downloads
    };

    setCacheWithExpiry(url, response);
    return res.json(response);
  } catch (error) {
    return res.json({ status: "error", details: error.message || "❗ ইন্সটাগ্রাম থেকে ডাটা নিতে সমস্যা হয়েছে" });
  }
}

// ✅ POST method → body থেকে url
router.post("/", async (req, res) => {
  const { url } = req.body;
  await handleInstagramDownload(url, res);
});

// ✅ GET method → query থেকে url
router.get("/", async (req, res) => {
  const { url } = req.query;
  await handleInstagramDownload(url, res);
});

export default router;
