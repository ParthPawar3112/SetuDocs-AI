// The top-bar search box hands its text to Smart Search through sessionStorage,
// so a search typed in the header lands on the results page already filled in.
// peek (used as a state initializer, which React StrictMode runs twice) never
// mutates; clear runs once in an effect after the seed has been used.
const KEY = "setu_search_seed";

export function setSearchSeed(query) {
  try {
    sessionStorage.setItem(KEY, query);
  } catch {
    /* storage unavailable - Smart Search just opens empty */
  }
}

export function peekSearchSeed() {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function clearSearchSeed() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
