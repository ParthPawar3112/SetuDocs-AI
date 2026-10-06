// The API sends each scheme's "reasons" as English sentences
// ("Entity type: Micro enterprise", "You have: Udyam registration"). The
// profile answers are a fixed vocabulary, so they can be shown in the chosen
// language; document and scheme names come from the catalog and stay as sent.
import { optionLabel } from "./setu";

const FIELD_BY_LABEL = {
  "Entity type": "entity_type",
  "Business stage": "business_stage",
  Sector: "sector",
  State: "state",
  Gender: "gender",
  "Social category": "social_category",
};

const OPTION_VALUES = [
  "individual", "farmer", "street_vendor", "artisan", "micro_enterprise", "small_enterprise", "startup",
  "planning", "running",
  "manufacturing", "services", "trading", "agriculture",
  "female", "male", "other",
  "general", "sc", "st", "obc",
];
const VALUE_BY_LABEL = Object.fromEntries(OPTION_VALUES.map((value) => [optionLabel(value), value]));

export function translateReason(reason, { t, tOr }) {
  const have = reason.match(/^You have: (.+?)( \(helps your application\))?$/);
  if (have) {
    return have[2] ? t("schemes.reason.haveHelps", { doc: have[1] }) : t("schemes.reason.have", { doc: have[1] });
  }
  const profile = reason.match(/^([A-Za-z ]+): (.+)$/);
  if (profile && FIELD_BY_LABEL[profile[1]]) {
    const field = FIELD_BY_LABEL[profile[1]];
    const value = VALUE_BY_LABEL[profile[2]];
    return `${t(`profile.field.${field}`)}: ${value ? tOr(`opt.${value}`, profile[2]) : profile[2]}`;
  }
  return reason;
}
