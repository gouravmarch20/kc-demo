import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { dataUrl?: string; roomId?: string };
  if (!body.dataUrl?.startsWith("data:image/")) {
    return Response.json({ error: "Photo data URL is required" }, { status: 400 });
  }

  const [, encoded] = body.dataUrl.split(",");
  const buffer = Buffer.from(encoded, "base64");
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  // TODO: Replace local disk write with Azure Blob Storage upload.
  // TODO: Trigger Azure Face Verification, OCR, and liveness checks here.
  const filename = `${body.roomId || "customer"}-photo.jpg`;
  const filePath = path.join(uploadsDir, filename);
  await writeFile(filePath, buffer);

  return Response.json({ ok: true, url: `/uploads/${filename}` });
}
