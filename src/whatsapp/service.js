// src/whatsapp/service.js
// Singleton WhatsApp client agar tidak diinisialisasi ulang
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");

const fs = require("fs");

let whatsappClient = null;
let isInitialized = false;

// Cari Chrome yang sudah terinstall di sistem Windows
function findChromePath() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null; // Biarkan puppeteer pakai default jika tidak ditemukan
}

async function startWhatsappService(io) {
  if (isInitialized) return;
  isInitialized = true;

  const chromePath = findChromePath();
  if (chromePath) {
    console.log(`[WA] Menggunakan Chrome: ${chromePath}`);
  } else {
    console.log("[WA] Chrome tidak ditemukan, menggunakan bundled Chromium...");
  }

  whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
    puppeteer: {
      headless: true,
      ...(chromePath ? { executablePath: chromePath } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    },
  });

  // Event: Loading bar saat starting
  whatsappClient.on("loading_screen", (percent, message) => {
    console.log(`WA Loading: ${percent}% - ${message}`);
    io.emit("wa:loading", { percent, message });
  });

  // Event: QR Code tersedia untuk di-scan
  whatsappClient.on("qr", async (qr) => {
    console.log("QR Code received, emitting to clients...");
    try {
      const qrDataUrl = await qrcode.toDataURL(qr, { width: 300 });
      io.emit("wa:qr", qrDataUrl);
      io.emit("wa:status", "QR_READY");
    } catch (err) {
      console.error("Failed to generate QR:", err);
    }
  });

  // Event: Authenticated (QR sudah di-scan, menunggu ready)
  whatsappClient.on("authenticated", () => {
    console.log("WA Authenticated!");
    io.emit("wa:status", "AUTHENTICATED");
  });

  // Event: auth_failure
  whatsappClient.on("auth_failure", (msg) => {
    console.error("WA Auth failure:", msg);
    io.emit("wa:status", "AUTH_FAILED");
    isInitialized = false;
  });

  // Event: Berhasil terkoneksi dan siap
  whatsappClient.on("ready", () => {
    console.log("WhatsApp client siap!");
    const info = whatsappClient.info;
    io.emit("wa:status", "READY");
    io.emit("wa:phone", info.wid.user);
  });

  // Event: Terputus
  whatsappClient.on("disconnected", (reason) => {
    console.log("WhatsApp disconnected:", reason);
    io.emit("wa:status", "DISCONNECTED");
    isInitialized = false;
    whatsappClient = null;
  });

  console.log("Initializing WhatsApp client...");
  whatsappClient.initialize();

  // Refresh status ke client yang baru connect
  io.on("connection", (socket) => {
    if (whatsappClient && whatsappClient.info) {
      socket.emit("wa:status", "READY");
      socket.emit("wa:phone", whatsappClient.info.wid.user);
    } else {
      socket.emit("wa:status", isInitialized ? "CONNECTING" : "DISCONNECTED");
    }
  });
}

function getClient() {
  return whatsappClient;
}

module.exports = { startWhatsappService, getClient };
