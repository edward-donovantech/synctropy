import { z } from "zod"

export interface FileNode {
  name: string
  path: string
  type: "file" | "folder"
  mimeType?: string
  size?: number
  modifiedAt?: string
  children?: FileNode[]
}

export const FileNodeSchema: z.ZodType<FileNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    path: z.string(),
    type: z.enum(["file", "folder"]),
    mimeType: z.string().optional(),
    size: z.number().optional(),
    modifiedAt: z.string().optional(),
    children: z.array(FileNodeSchema).optional(),
  })
)

export const UserPreferencesSchema = z.object({
  archiveAfterDays: z.number().default(365),
  ignorePaths: z.array(z.string()).default([]),
})
export type UserPreferences = z.infer<typeof UserPreferencesSchema>

export const AnalyzeStructureInputSchema = z.object({
  root: FileNodeSchema,
  userPreferences: UserPreferencesSchema.optional(),
  userId: z.string().uuid().optional(),
})
export type AnalyzeStructureInput = z.infer<typeof AnalyzeStructureInputSchema>

export const DomainSchema = z.enum([
  "finance", "projects", "reference", "admin", "media", "comms", "inbox",
])
export type Domain = z.infer<typeof DomainSchema>

export const LifecycleSchema = z.enum(["active", "archive", "triage"])
export type Lifecycle = z.infer<typeof LifecycleSchema>

export const SeveritySchema = z.enum(["healthy", "needs_attention", "critical"])
export type Severity = z.infer<typeof SeveritySchema>

export const ClassificationSchema = z.object({
  path: z.string(),
  domain: DomainSchema,
  lifecycle: LifecycleSchema,
  confidence: z.number().min(0).max(1),
  suggestedPath: z.string(),
})
export type Classification = z.infer<typeof ClassificationSchema>

export const TriageCandidateSchema = z.object({
  domain: DomainSchema,
  lifecycle: LifecycleSchema,
  confidence: z.number().min(0).max(1),
})
export type TriageCandidate = z.infer<typeof TriageCandidateSchema>

export const TriageItemSchema = z.object({
  path: z.string(),
  topCandidates: z.array(TriageCandidateSchema),
  reason: z.string(),
})
export type TriageItem = z.infer<typeof TriageItemSchema>

export const EntropyEntrySchema = z.object({
  path: z.string(),
  score: z.number().min(0).max(100),
  severity: SeveritySchema,
  signals: z.array(z.string()),
})
export type EntropyEntry = z.infer<typeof EntropyEntrySchema>

export const OperationSchema = z.object({
  type: z.enum(["move", "rename", "create_folder"]),
  from: z.string(),
  to: z.string(),
  priority: z.enum(["high", "medium", "low"]),
})
export type Operation = z.infer<typeof OperationSchema>

export const AnalyzeStructureOutputSchema = z.object({
  entropyMap: z.array(EntropyEntrySchema),
  classifications: z.array(ClassificationSchema),
  triage: z.array(TriageItemSchema),
  operations: z.array(OperationSchema),
  summary: z.string(),
})
export type AnalyzeStructureOutput = z.infer<typeof AnalyzeStructureOutputSchema>
