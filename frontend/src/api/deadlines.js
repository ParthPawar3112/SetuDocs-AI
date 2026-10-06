// Deadline Guard API calls (SetuDocs). Shapes: backend/app/routers/deadlines.py.
import client from "./client";

// status: "open" | "done" | "dismissed" | "all"
export const listDeadlinesRequest = (status = "open") =>
  client.get("/deadlines", { params: { status } });
// body: { label, due_date: "YYYY-MM-DD", kind, notes?, document_id? }
export const createDeadlineRequest = (body) => client.post("/deadlines", body);
// body: any of { label, due_date, status: "open"|"done"|"dismissed", notes }
export const updateDeadlineRequest = (id, body) => client.patch(`/deadlines/${id}`, body);
export const deleteDeadlineRequest = (id) => client.delete(`/deadlines/${id}`);
// -> { documents_scanned, deadlines_found, new_deadlines }
export const rescanDeadlinesRequest = () => client.post("/deadlines/rescan");
