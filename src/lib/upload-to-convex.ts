import type { Id } from "../../convex/_generated/dataModel";

function mimeForFile(file: File): string {
  if (file.type) return file.type;
  if (/\.xlsx$/i.test(file.name)) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (/\.xls$/i.test(file.name)) {
    return "application/vnd.ms-excel";
  }
  return "application/octet-stream";
}

/**
 * Envia o arquivo para o Convex Storage via URL gerada no backend.
 */
export async function uploadFileToConvexStorage(
  uploadUrl: string,
  file: File
): Promise<Id<"_storage">> {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeForFile(file) },
    body: file,
    mode: "cors",
  });

  const text = await response.text();

  if (!response.ok) {
    let detail = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      detail = parsed.error ?? parsed.message ?? detail;
    } catch {
      // resposta não-JSON
    }
    throw new Error(
      `Falha ao enviar arquivo ao storage (${response.status}): ${detail}`
    );
  }

  let storageId: string;
  try {
    const json = JSON.parse(text) as { storageId?: string };
    if (!json.storageId) {
      throw new Error("Resposta sem storageId");
    }
    storageId = json.storageId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "JSON inválido";
    throw new Error(`Resposta inválida do storage: ${msg}`);
  }

  return storageId as Id<"_storage">;
}
