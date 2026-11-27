import { useEffect, useRef } from "react";
import { realtimeSync } from "../services/realtime";

export interface ErpApiResponse {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

/** Perform an authenticated GET request against the hospital ERP API. */
export async function erpGet<T extends ErpApiResponse = ErpApiResponse>(path: string): Promise<T> {
  const res = await fetch(path);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json as T;
}

/** Perform a JSON POST or PUT mutation against the hospital ERP API. */
export async function erpMutate<T extends ErpApiResponse = ErpApiResponse>(
  path: string,
  payload: Record<string, unknown>,
  method: "POST" | "PUT" = "POST"
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Save failed (${res.status})`);
  }
  return json as T;
}

/** Subscribe to live WebSocket updates for a given ERP module and re-run loader. */
export function useErpRealtime(moduleName: string, onUpdate: () => void) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    return realtimeSync.subscribe((msg) => {
      if (msg?.type === "ERP_MODULE_UPDATED" && msg?.payload?.module === moduleName) {
        callbackRef.current();
      }
    });
  }, [moduleName]);
}

/** Download arbitrary text content (XML, TXT, etc.) as a file in browser. */
export function downloadTextFile(filename: string, content: string, mime = "application/xml;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
