import { randomUUID } from "crypto";
import { sanitizeRoomState } from "@/lib/kyc/room-auth";
import { defaultKycRoomState, type KycRoomState } from "@/lib/kyc/types";

const rooms = new Map<string, KycRoomState>();
const roomOtps = new Map<string, { code: string; expiresAt: number }>();
const listeners = new Map<string, Set<(state: KycRoomState) => void>>();

function notify(roomId: string, state: KycRoomState) {
  const publicState = sanitizeRoomState(state);
  listeners.get(roomId)?.forEach((listener) => listener(publicState));
}

export function getRoom(roomId: string): KycRoomState | null {
  return rooms.get(roomId) ?? null;
}

export function ensureRoom(roomId: string, seed?: Partial<KycRoomState>): KycRoomState {
  const existing = rooms.get(roomId);
  if (existing) {
    return existing;
  }

  const created: KycRoomState = {
    ...defaultKycRoomState,
    roomId,
    roomSecret: seed?.roomSecret ?? randomUUID(),
    ...seed,
    updatedAt: Date.now(),
  };
  rooms.set(roomId, created);
  return created;
}

export function updateRoom(
  roomId: string,
  patch: Partial<KycRoomState>,
): KycRoomState {
  const current = ensureRoom(roomId);
  const { roomSecret: _ignored, ...safePatch } = patch;
  const next: KycRoomState = {
    ...current,
    ...safePatch,
    roomId,
    roomSecret: current.roomSecret,
    updatedAt: Date.now(),
  };
  rooms.set(roomId, next);
  notify(roomId, next);
  return next;
}

export function subscribeRoom(
  roomId: string,
  listener: (state: KycRoomState) => void,
): () => void {
  if (!listeners.has(roomId)) {
    listeners.set(roomId, new Set());
  }
  listeners.get(roomId)!.add(listener);
  return () => listeners.get(roomId)?.delete(listener);
}

export function setRoomOtp(roomId: string, code: string, ttlMs = 5 * 60 * 1000) {
  roomOtps.set(roomId, { code, expiresAt: Date.now() + ttlMs });
}

export function verifyRoomOtp(roomId: string, code: string): boolean {
  const entry = roomOtps.get(roomId);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    roomOtps.delete(roomId);
    return false;
  }
  return entry.code === code;
}

export function getRoomOtpForAgent(roomId: string): string | null {
  return roomOtps.get(roomId)?.code ?? null;
}
