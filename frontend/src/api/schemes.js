// Scheme Matcher API calls (SetuDocs). Shapes: backend/app/routers/schemes.py.
import client from "./client";

export const getSchemeMatchesRequest = () => client.get("/schemes/matches");
// body: any of { entity_type, business_stage, sector, state, gender, social_category }
// (an empty string clears a field). Responds with the refreshed matches.
export const updateSchemeProfileRequest = (body) => client.put("/schemes/profile", body);
