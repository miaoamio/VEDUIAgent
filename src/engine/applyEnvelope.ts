import { parseAiSceneEnvelope } from "../protocol/scene";
import { applyCreate } from "./applyCreate";
import { applyPatch } from "./applyPatch";
import type { ApplyEnvelopeOptions, ApplyResult } from "./types";

export async function applyEnvelope(
  envelope: import("../protocol/scene").AiSceneEnvelope,
  options: ApplyEnvelopeOptions = {}
): Promise<ApplyResult> {
  if (envelope.intent === "create") {
    return applyCreate(envelope, options);
  }
  return applyPatch(envelope, options);
}

export async function applyEnvelopeUnknown(
  payload: unknown,
  options: ApplyEnvelopeOptions = {}
): Promise<ApplyResult> {
  const parsed = parseAiSceneEnvelope(payload);
  if (!parsed.ok) {
    return {
      ok: false,
      intent: "create",
      errors: parsed.errors.map((error) => ({
        code: error.code,
        message: error.message,
        path: error.path,
        operationIndex: error.operationIndex,
        recoverable: error.recoverable
      })),
      durationMs: 0
    };
  }

  return applyEnvelope(parsed.data, options);
}
