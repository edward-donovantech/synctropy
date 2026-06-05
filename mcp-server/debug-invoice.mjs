import path from "path";

// Simulating the taxonomy maps (read from source)
const EXTENSION_DOMAIN_MAP = {
  ".pdf": ["finance", "admin", "projects"],
};

const NAME_PATTERNS = [
  {
    pattern: /(?:^|_|-)invoice(?:s)?(?:_|-|\.)/i,
    domain: "finance",
    weight: 0.8,
  },
  {
    pattern: /(?:^|_|-)resume(?:s)?(?:_|-|\.)/i,
    domain: "admin",
    weight: 0.9,
  },
];

const PATH_CONTEXT_PATTERNS = [
  { pattern: /Clients/, domain: "projects", weight: 0.7 },
];

// Test file
const file = {
  name: "invoice_acme_jan.pdf",
  path: "/Clients/Acme/invoice_acme_jan.pdf",
  type: "file",
};

// Score extension
const ext = path.extname(file.name).toLowerCase();
console.log("Extension:", ext);
const extVotes = EXTENSION_DOMAIN_MAP[ext]?.map((domain, i) => ({
  domain,
  weight: 0.2 / (i + 1),
})) || [];
console.log("Extension votes:", extVotes);

// Score name pattern
const nameVotes = NAME_PATTERNS
  .filter(({ pattern }) => pattern.test(file.name))
  .map(({ domain, weight }) => ({ domain, weight }));
console.log("Name pattern votes:", nameVotes);

// Score path context
const parentPath = file.path.split("/").slice(0, -1).join("/");
console.log("Parent path:", parentPath);
const pathVotes = PATH_CONTEXT_PATTERNS
  .filter(({ pattern }) => pattern.test(parentPath))
  .map(({ domain, weight }) => ({ domain, weight }));
console.log("Path context votes:", pathVotes);

// Aggregate
const allVotes = [...extVotes, ...nameVotes, ...pathVotes];
const domainTotals = new Map();
let totalDomainWeight = 0;
for (const { domain, weight } of allVotes) {
  domainTotals.set(domain, (domainTotals.get(domain) ?? 0) + weight);
  totalDomainWeight += weight;
}

console.log("\nDomain totals:", Object.fromEntries(domainTotals));
console.log("Total weight:", totalDomainWeight);

const sortedDomains = [...domainTotals.entries()].sort((a, b) => b[1] - a[1]);
console.log("\nSorted domains:", sortedDomains);

const topScore = sortedDomains[0][1];
const secondScore = sortedDomains[1]?.[1] ?? 0;
console.log("Top score:", topScore, "Second score:", secondScore);

const domainConfidence = topScore / (topScore + secondScore || 1);
console.log("Domain confidence (pairwise margin):", domainConfidence);
console.log("Is >= 0.6?", domainConfidence >= 0.6);

// Lifecycle (active, weight 0.5)
const lifecycleConfidence = 0.5 / 0.5;
const finalConfidence = (domainConfidence + lifecycleConfidence) / 2;
console.log("\nLifecycle confidence:", lifecycleConfidence);
console.log("Final confidence:", finalConfidence);
