import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import sharp from "sharp";
import multer from "multer";
import pako from "pako";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs/promises";
import os from "os";
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const upload = multer({ 
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit for video/animations
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * ANIMATED VIDEO CONVERTER
 * Converts WebM (or other formats) to Animated WebP
 */
async function convertVideoToWebP(inputBuffer: Buffer): Promise<Buffer> {
  const tempId = uuidv4();
  const inputPath = path.join(os.tmpdir(), `${tempId}.webm`);
  const outputPath = path.join(os.tmpdir(), `${tempId}.webp`);

  try {
    await fs.writeFile(inputPath, inputBuffer);
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .size('512x512')
        .fps(15) // Optimized for stickers
        .duration(3) // Cap at 3 seconds for stability
        .outputOptions([
          '-vcodec libwebp',
          '-lossless 0',
          '-compression_level 4',
          '-q:v 70',
          '-loop 0',
          '-preset default',
          '-an', // No audio
          '-vsync 0'
        ])
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    return await fs.readFile(outputPath);
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}

/**
 * ADVANCED WHATSAPP CONVERSION ENGINE
 * Optimized for: 512x512, Strict Limits, 16px padding, Smooth Playback
 */
async function processStickerBuffer(inputBuffer: Buffer, isAnimated: boolean = false): Promise<Buffer> {
  const WHATSAPP_SIZE = 512;
  const PADDING = 16;
  const INNER_SIZE = WHATSAPP_SIZE - (PADDING * 2);

  // Get initial metadata to check frame count and delays
  const metadata = await sharp(inputBuffer, { animated: isAnimated }).metadata();
  const frameCount = metadata.pages || 1;
  
  // Update isAnimated based on actual metadata
  const reallyAnimated = isAnimated || frameCount > 1;

  let quality = reallyAnimated ? 60 : 80;
  const sizeLimit = reallyAnimated ? 490 * 1024 : 99 * 1024;

  const getPipeline = (q: number) => {
    let p = sharp(inputBuffer, { animated: reallyAnimated })
      .resize(INNER_SIZE, INNER_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extend({
        top: PADDING,
        bottom: PADDING,
        left: PADDING,
        right: PADDING,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });

    if (reallyAnimated) {
      return p.webp({ 
        effort: 6, 
        quality: q, 
        loop: 0, 
        smartSubsample: true
      });
    } else {
      return p.webp({ effort: 6, quality: q, smartSubsample: true });
    }
  };

  let buffer = await getPipeline(quality).toBuffer();

  // Recursive compression loop with better fallbacks
  while (buffer.length > sizeLimit && quality > 5) {
    quality -= 5;
    buffer = await getPipeline(quality).toBuffer();
  }

  return buffer;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * Enhanced Processing Endpoint (Step 2)
 */
app.post("/api/sticker/process", upload.single("image"), async (req, res) => {
  try {
    let buffer = req.file ? req.file.buffer : (req.body.image ? Buffer.from(req.body.image, 'base64') : null);
    if (!buffer) return res.status(400).json({ error: "No image provided" });

    const originalName = req.file?.originalname || "";
    let isAnimated = req.body.isAnimated === 'true' || req.body.isAnimated === true || originalName.endsWith('.webm') || originalName.endsWith('.tgs');

    // 1. Handle TGS (Lottie)
    if (buffer[0] === 0x1f && buffer[1] === 0x8b || originalName.endsWith('.tgs')) {
      try {
        const decompressed = pako.ungzip(buffer);
        buffer = Buffer.from(decompressed);
        // Note: Full TGS rendering usually needs a Lottie player.
        // Sharp might only take the first frame of raw JSON if it treats as SVG,
        // but for now we prioritize not crashing and attempting a fallback.
      } catch (e) {
        console.warn("Decompression failed");
      }
    }

    // 2. Handle Video (WebM)
    if (originalName.endsWith('.webm') || (buffer.slice(0, 4).toString() === 'E\x1f\xa3g')) { // Simple WebM signature
      try {
        buffer = await convertVideoToWebP(buffer);
        isAnimated = true;
      } catch (videoErr) {
        console.error("Video conversion failed:", videoErr);
      }
    }

    const optimized = await processStickerBuffer(buffer, isAnimated);
    
    res.setHeader("Content-Type", "image/webp");
    res.send(optimized);
  } catch (error: any) {
    console.error("Processing Error:", error);
    res.status(500).json({ error: "Failed to process sticker" });
  }
});

app.post("/api/sticker/bundle", async (req, res) => {
  const { title, author, stickers, isAnimatedPack } = req.body;
  try {
    const bundle = {
      identifier: `pack_${Date.now()}`,
      name: title,
      publisher: author,
      tray_image: stickers[0]?.data,
      is_animated_pack: isAnimatedPack || false,
      stickers: stickers.map((s: any) => ({
        image_data: s.data,
        emojis: s.emojis || ["✨"]
      }))
    };
    res.json(bundle);
  } catch (error) {
    res.status(500).json({ error: "Failed to create bundle" });
  }
});

app.post("/api/telegram/pack", async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN) return res.status(500).json({ error: "No token" });
  let { packName } = req.body;
  
  // Resolve pack name from link if necessary
  if (packName.includes('t.me/addstickers/')) {
    packName = packName.split('t.me/addstickers/')[1].split('/')[0].split('?')[0];
  }

  try {
    const response = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getStickerSet`, {
      params: { name: packName }
    });
    if (!response.data.ok) return res.status(400).json({ error: response.data.description });
    res.json(response.data.result);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch from Telegram." });
  }
});

app.get("/api/telegram/file", async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN) return res.status(500).json({ error: "Token missing" });
  const { fileId } = req.query;
  try {
    const info = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile`, {
      params: { file_id: fileId }
    });
    const url = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${info.data.result.file_path}`;
    const fileResponse = await axios({ url, method: "GET", responseType: "arraybuffer" });
    
    // Check extension for animation detection
    const isAnimated = info.data.result.file_path.endsWith('.tgs') || info.data.result.file_path.endsWith('.webm');
    
    res.setHeader("Content-Type", isAnimated ? "application/x-tgsticker" : "image/webp");
    res.send(Buffer.from(fileResponse.data));
  } catch (error) {
    res.status(500).json({ error: "Proxy failed" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
