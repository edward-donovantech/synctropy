import { Domain, Lifecycle } from "./types"

export const EXTENSION_DOMAIN_MAP: Record<string, Domain[]> = {
  ".pdf":  ["finance", "reference", "admin", "projects"],
  ".xlsx": ["finance", "projects"],
  ".xls":  ["finance", "projects"],
  ".csv":  ["finance", "projects"],
  ".docx": ["projects", "reference", "admin"],
  ".doc":  ["projects", "reference", "admin"],
  ".pptx": ["projects", "reference"],
  ".ppt":  ["projects", "reference"],
  ".jpg":  ["media"],
  ".jpeg": ["media"],
  ".png":  ["media"],
  ".gif":  ["media"],
  ".mp4":  ["media"],
  ".mov":  ["media"],
  ".mp3":  ["media"],
  ".psd":  ["media"],
  ".ai":   ["media"],
  ".txt":  ["reference", "projects"],
  ".md":   ["reference", "projects"],
}

export const NAME_PATTERNS: Array<{ pattern: RegExp; domain: Domain; weight: number }> = [
  { pattern: /invoice|receipt|statement|payment/i,        domain: "finance",   weight: 0.8 },
  { pattern: /(?<![a-z])tax(?![a-z])|w-?2\b|1099/i,      domain: "finance",   weight: 0.9 },
  { pattern: /bank|balance|budget/i,                      domain: "finance",   weight: 0.7 },
  { pattern: /contract|agreement|sow|proposal|quote/i,   domain: "projects",  weight: 0.7 },
  { pattern: /brief|deliverable|milestone/i,              domain: "projects",  weight: 0.6 },
  { pattern: /(?<![a-z])resume(?![a-z])|(?<![a-z])cv(?![a-z])|curriculum.vitae/i, domain: "admin", weight: 0.9 },
  { pattern: /license|insurance|passport|(?<![a-z])ida?(?![a-z])|legal/i, domain: "admin", weight: 0.8 },
  { pattern: /img_|dsc_|screenshot|photo|pic_/i,          domain: "media",     weight: 0.7 },
  { pattern: /readme|notes|meeting|how.?to|tutorial/i,    domain: "reference", weight: 0.7 },
  { pattern: /email|message|(?<![a-z])chat(?![a-z])|slack/i, domain: "comms", weight: 0.8 },
]

export const PATH_CONTEXT_PATTERNS: Array<{ pattern: RegExp; domain: Domain; weight: number }> = [
  { pattern: /client|clients|project|projects/i,          domain: "projects",  weight: 0.5 },
  { pattern: /tax|taxes|finance|financial|accounting/i,   domain: "finance",   weight: 0.6 },
  { pattern: /legal|admin|insurance|license/i,            domain: "admin",     weight: 0.5 },
  { pattern: /photo|photos|video|videos|media|assets/i,   domain: "media",     weight: 0.5 },
  { pattern: /reference|resources|research|articles/i,    domain: "reference", weight: 0.5 },
  { pattern: /inbox|downloads|unsorted|misc/i,            domain: "inbox",     weight: 0.6 },
]

export const DOMAIN_BASE_PATHS: Record<Domain, { active: string; archive: string }> = {
  finance:   { active: "Active/Finance",  archive: "Archive/Finance"  },
  projects:  { active: "Active/Projects", archive: "Archive/Projects" },
  admin:     { active: "Active/Admin",    archive: "Archive/Admin"    },
  reference: { active: "Reference",       archive: "Reference"        },
  media:     { active: "Media",           archive: "Media"            },
  comms:     { active: "Active/Comms",    archive: "Archive/Comms"    },
  inbox:     { active: "Inbox",           archive: "Inbox"            },
}

export function buildCanonicalPath(domain: Domain, lifecycle: Lifecycle, filename: string): string {
  if (lifecycle === "triage") return `Inbox/${filename}`
  const base = DOMAIN_BASE_PATHS[domain]
  const folder = lifecycle === "archive" ? base.archive : base.active
  return `${folder}/${filename}`
}
