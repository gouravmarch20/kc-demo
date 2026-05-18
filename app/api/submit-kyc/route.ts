import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { KycJourneyState } from "@/lib/kyc/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = (await request.json()) as KycJourneyState;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  // TODO: Persist final KYC package to Azure Cosmos DB or workflow service.
  // TODO: Attach Azure Blob URLs for photo, audio tracks, and mixed session recording.
  await writeFile(
    path.join(uploadsDir, `${payload.roomId || "kyc"}-summary.json`),
    JSON.stringify({ ...payload, submittedAt: new Date().toISOString() }, null, 2),
  );

  return Response.json({
    ok: true,
    referenceId: `MLI-KYC-${Date.now()}`,
  });
}
