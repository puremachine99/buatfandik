// server.js — Custom Express + Socket.io + Next.js entry point
// HARUS dijalankan dengan `node server.js` atau `pnpm dev`
require("dotenv").config();

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { startWhatsappService, getClient } = require("./src/whatsapp/service");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Pasang Socket.io di atas HTTP server yang sama (port identik dengan Next.js)
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // --- Start WhatsApp Service ---
  startWhatsappService(io);

  // --- Broadcast Engine via Socket.io ---
  io.on("connection", (socket) => {
    console.log(`[Socket] Client terhubung: ${socket.id}`);

    // Trigger broadcast dari browser
    socket.on("broadcast:start", async ({ targets }) => {
      const client = getClient();

      if (!client || !client.info) {
        socket.emit("broadcast:error", "WhatsApp belum terkoneksi. Silakan scan QR terlebih dahulu.");
        return;
      }

      console.log(`[Broadcast] Memulai ke ${targets.length} target...`);
      socket.emit("broadcast:started", { total: targets.length });

      let sent = 0;
      let failed = 0;

      for (const target of targets) {
        // ANTI-BAN: Delay acak 10-25 detik setiap pesan
        const delayMs = (Math.random() * 15 + 10) * 1000;
        console.log(`[Broadcast] Menunggu ${(delayMs / 1000).toFixed(1)}s sebelum kirim ke ${target.no_wa}...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        try {
          await client.sendMessage(`${target.no_wa}@c.us`, target.pesan);
          sent++;
          io.emit("broadcast:log_update", {
            log_id: target.log_id,
            status: "SENT",
          });
          console.log(`[Broadcast] SENT -> ${target.no_wa}`);
        } catch (err) {
          failed++;
          io.emit("broadcast:log_update", {
            log_id: target.log_id,
            status: "FAILED",
            reason: err.message,
          });
          console.error(`[Broadcast] FAILED -> ${target.no_wa}: ${err.message}`);
        }
      }

      io.emit("broadcast:done", { sent, failed, total: targets.length });
      console.log(`[Broadcast] Selesai. Terkirim: ${sent}, Gagal: ${failed}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client putus: ${socket.id}`);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Mode: ${dev ? "development" : "production"}`);
    });
});
