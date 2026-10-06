// Impact dashboard API calls (SetuDocs). Shapes: backend/app/routers/impact.py.
import client from "./client";

export const getImpactRequest = () => client.get("/impact");
export const listTrialsRequest = () => client.get("/impact/trials");
// body: { method: "manual" | "setudocs", seconds: number (0-3600], note? }
export const createTrialRequest = (body) => client.post("/impact/trials", body);
// The API only supports clearing the caller's own trials -> { removed }.
export const clearTrialsRequest = () => client.delete("/impact/trials");
