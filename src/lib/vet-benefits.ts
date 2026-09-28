// Veteran benefits checklist (free): benefits veterans often miss, each with
// the official page to apply or learn more. Links only go to official
// government sites. Checked items are remembered per person in this browser.

export type BenefitGroup = "money" | "health" | "home" | "work" | "everyday";

export type Benefit = {
  id: string;
  group: BenefitGroup;
  url: string; // official page
  inApp?: string; // our own tool for it, if any
};

export const BENEFIT_GROUPS: BenefitGroup[] = ["money", "health", "home", "work", "everyday"];

export const BENEFITS: Benefit[] = [
  { id: "disability", group: "money", url: "https://www.va.gov/disability/how-to-file-claim/", inApp: "/app/veteranos" },
  { id: "pension", group: "money", url: "https://www.va.gov/pension/" },
  { id: "state", group: "money", url: "https://www.va.gov/statedva.htm" },
  { id: "health", group: "health", url: "https://www.va.gov/health-care/how-to-apply/" },
  { id: "life", group: "health", url: "https://www.va.gov/life-insurance/" },
  { id: "homeLoan", group: "home", url: "https://www.va.gov/housing-assistance/home-loans/", inApp: "/app/metas/plan/home" },
  { id: "fundingFee", group: "home", url: "https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/" },
  { id: "giBill", group: "work", url: "https://www.va.gov/education/", inApp: "/app/veteranos/gi-bill" },
  { id: "vre", group: "work", url: "https://www.va.gov/careers-employment/vocational-rehabilitation/" },
  { id: "business", group: "work", url: "https://www.sba.gov/business-guide/grow-your-business/veteran-owned-businesses" },
  { id: "records", group: "everyday", url: "https://www.va.gov/records/get-military-service-records/" },
  { id: "id", group: "everyday", url: "https://www.va.gov/records/get-veteran-id-cards/" },
  { id: "parks", group: "everyday", url: "https://www.nps.gov/planyourvisit/veterans-and-gold-star-families-free-access.htm" },
  { id: "burial", group: "everyday", url: "https://www.va.gov/burials-memorials/" },
];

const key = (userId: string) => `cc-vet-checklist-${userId}`;

export function loadChecked(userId: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveChecked(userId: string, ids: string[]) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(ids));
  } catch {
    // storage blocked: the checklist still works for this visit
  }
}
