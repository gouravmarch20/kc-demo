"use client";

import { useCallback, useEffect, useState } from "react";
import type { KycRole, KycRoomState } from "@/lib/kyc/types";

export function useKycRoom(roomId: string, role: KycRole, roomSecret = "") {
  const [room, setRoom] = useState<KycRoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const source = new EventSource(`/api/kyc/room/${roomId}/events`);

    source.onmessage = (event) => {
      try {
        const state = JSON.parse(event.data as string) as KycRoomState;
        setRoom(state);
        setConnected(true);
        setError(null);
      } catch {
        setError("Could not parse room updates");
      }
    };

    source.onerror = () => {
      setConnected(false);
      setError("Live sync disconnected — retrying…");
    };

    return () => {
      source.close();
    };
  }, [roomId]);

  const patchRoom = useCallback(
    async (patch: Partial<KycRoomState>) => {
      if (!roomId) return null;

      const response = await fetch(`/api/kyc/room/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, updatedBy: role, roomSecret: roomSecret || undefined }),
      });

      if (!response.ok) {
        throw new Error("Failed to update KYC room");
      }

      const next = (await response.json()) as KycRoomState & { roomSecret?: string };
      setRoom(next);
      return next;
    },
    [roomId, role, roomSecret],
  );

  const sendOtp = useCallback(async () => {
    const response = await fetch(`/api/kyc/room/${roomId}/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", role, roomSecret: roomSecret || undefined }),
    });
    return response.json() as Promise<{ ok: boolean; demoOtp?: string; error?: string }>;
  }, [roomId, role, roomSecret]);

  const verifyOtp = useCallback(
    async (code: string) => {
      const response = await fetch(`/api/kyc/room/${roomId}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          code,
          roomSecret: roomSecret || undefined,
        }),
      });
      return response.json() as Promise<{ ok: boolean; error?: string }>;
    },
    [roomId, roomSecret],
  );

  const fetchAgentOtp = useCallback(async () => {
    if (!roomSecret) return null;
    const params = new URLSearchParams({ roomSecret });
    const response = await fetch(`/api/kyc/room/${roomId}/otp?${params}`);
    if (!response.ok) return null;
    const payload = (await response.json()) as { code: string | null };
    return payload.code;
  }, [roomId, roomSecret]);

  return {
    room,
    connected,
    error,
    patchRoom,
    sendOtp,
    verifyOtp,
    fetchAgentOtp,
  };
}
