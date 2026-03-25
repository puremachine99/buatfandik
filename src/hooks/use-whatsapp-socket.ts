"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

export type WAStatus =
  | "CONNECTING"
  | "QR_READY"
  | "AUTHENTICATED"
  | "READY"
  | "DISCONNECTED"
  | "AUTH_FAILED";

export interface BroadcastTarget {
  log_id: string;
  no_wa: string;
  pesan: string;
}

export interface BroadcastLogUpdate {
  log_id: string;
  status: "SENT" | "FAILED";
  reason?: string;
}

export function useWhatsappSocket() {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [waStatus, setWaStatus] = useState<WAStatus>("CONNECTING");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loadingPercent, setLoadingPercent] = useState<number>(0);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Konek ke server Socket.io yang berjalan di port yang sama
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
    });

    socket.on("wa:loading", ({ percent }: { percent: number; message: string }) => {
      setLoadingPercent(percent);
    });

    socket.on("wa:qr", (dataUrl: string) => {
      setQrImage(dataUrl);
      setWaStatus("QR_READY");
    });

    socket.on("wa:status", (status: WAStatus) => {
      setWaStatus(status);
      if (status === "READY") {
        setQrImage(null); // QR tidak perlu ditampilkan lagi
      }
    });

    socket.on("wa:phone", (phone: string) => {
      setPhoneNumber(`+${phone}`);
    });

    socket.on("broadcast:started", ({ total }: { total: number }) => {
      setIsBroadcasting(true);
      console.log(`[Broadcast] Dimulai, total: ${total}`);
    });

    socket.on("broadcast:done", ({ sent, failed, total }: { sent: number; failed: number; total: number }) => {
      setIsBroadcasting(false);
      console.log(`[Broadcast] Selesai. Terkirim: ${sent}/${total}, Gagal: ${failed}`);
    });

    socket.on("broadcast:error", (msg: string) => {
      setIsBroadcasting(false);
      console.error("[Broadcast Error]", msg);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const startBroadcast = (targets: BroadcastTarget[]) => {
    if (!socketRef.current) return;
    socketRef.current.emit("broadcast:start", { targets });
  };

  const onLogUpdate = (cb: (update: BroadcastLogUpdate) => void) => {
    socketRef.current?.on("broadcast:log_update", cb);
    return () => {
      socketRef.current?.off("broadcast:log_update", cb);
    };
  };

  return {
    qrImage,
    waStatus,
    phoneNumber,
    loadingPercent,
    isBroadcasting,
    startBroadcast,
    onLogUpdate,
  };
}
