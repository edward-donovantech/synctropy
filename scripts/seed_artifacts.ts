/**
 * Seeds pipeline_artifacts with realistic dummy data for 3 historical runs.
 * Each run includes skill 00, 01, 02, 03, and 04 artifacts.
 * Run with: npx ts-node --esm scripts/seed_artifacts.ts
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js'

const USER_ID = '938cb9b2-55e4-47a6-9e77-348635db5af0' // ejoseph.donovan@gmail.com

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

const CATEGORIES = ['projects', 'finance', 'admin', 'media', 'reference', 'comms', 'inbox']
const ISSUES = ['vague_name', 'duplicate', 'stale', 'root_clutter', 'unreadable'] as const
const LIFECYCLES = ['active', 'archive', 'triage'] as const

function randomCategory() { return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)] }
function randomLifecycle() { return LIFECYCLES[Math.floor(Math.random() * LIFECYCLES.length)] }
function randomIssues(): string[] {
  return ISSUES.filter(() => Math.random() < 0.15)
}

function makeInventoryItems(count: number, runDate: string) {
  const sampleFiles = [
    { name: 'Q4 Budget Review.xlsx', category: 'finance', size: 84200 },
    { name: 'Tax Return 2024.pdf', category: 'finance', size: 1240000 },
    { name: 'Invoice #1042 - Acme Corp.pdf', category: 'finance', size: 92000 },
    { name: 'Project Alpha Proposal.docx', category: 'projects', size: 234000 },
    { name: 'Client Meeting Notes Jun.md', category: 'projects', size: 8400 },
    { name: 'Roadmap 2026 - FINAL.pptx', category: 'projects', size: 4200000 },
    { name: 'Roadmap 2026 - FINAL (1).pptx', category: 'projects', size: 4200000 },
    { name: 'Roadmap 2026 - FINAL v2.pptx', category: 'projects', size: 4210000 },
    { name: 'Contract - Vendor Agreement.pdf', category: 'admin', size: 340000 },
    { name: 'Insurance Policy 2025.pdf', category: 'admin', size: 890000 },
    { name: 'NDA Template.docx', category: 'admin', size: 45000 },
    { name: 'headshot-2024.jpg', category: 'media', size: 2400000 },
    { name: 'team-photo-offsite.jpg', category: 'media', size: 6800000 },
    { name: 'product-demo-v3.mp4', category: 'media', size: 142000000 },
    { name: 'API Docs - Stripe Integration.md', category: 'reference', size: 32000 },
    { name: 'Architecture Diagram.png', category: 'reference', size: 890000 },
    { name: 'Untitled document', category: 'inbox', size: 4200 },
    { name: 'Copy of Untitled', category: 'inbox', size: 4200 },
    { name: 'Final', category: 'inbox', size: 12000 },
    { name: 'New Document', category: 'inbox', size: 2100 },
    { name: 'test', category: 'inbox', size: 1200 },
    { name: 'Slack Export 2023-01.zip', category: 'comms', size: 48000000 },
    { name: 'Email Archive Q1.mbox', category: 'comms', size: 24000000 },
  ]

  return Array.from({ length: count }, (_, i) => {
    const template = sampleFiles[i % sampleFiles.length]
    const issues = randomIssues()
    // Force some realistic issue patterns
    if (template.name.includes('FINAL') || template.name.startsWith('Copy')) issues.push('duplicate')
    if (['Untitled document', 'Copy of Untitled', 'Final', 'New Document', 'test'].includes(template.name)) issues.push('vague_name')

    return {
      id: `drive_${Math.random().toString(36).slice(2, 12)}`,
      name: template.name,
      path: `/My Drive/${template.category}/${template.name}`,
      type: 'file' as const,
      size_bytes: template.size,
      modified_at: daysAgo(Math.floor(Math.random() * 730)),
      category: template.category,
      lifecycle: randomLifecycle(),
      summary: `A ${template.category} file related to ${template.name.split('.')[0].toLowerCase()}.`,
      confidence: 0.7 + Math.random() * 0.3,
      issues: [...new Set(issues)],
    }
  })
}

function makeCategoryBreakdown(items: ReturnType<typeof makeInventoryItems>) {
  const counts: Record<string, { count: number; bytes: number }> = {}
  for (const item of items) {
    if (!counts[item.category]) counts[item.category] = { count: 0, bytes: 0 }
    counts[item.category].count++
    counts[item.category].bytes += item.size_bytes
  }
  return Object.entries(counts).map(([name, { count, bytes }]) => ({ name, count, bytes }))
}

// ─── artifact builders ─────────────────────────────────────────────────────────

function makeConnectorsArtifact(runId: string, scannedAt: string) {
  return {
    run_id: runId,
    scanned_at: scannedAt,
    platforms: {
      google_drive: { connected: true, mcp: 'Google Drive MCP', account: 'ejoseph.donovan@gmail.com' },
      dropbox: { connected: false, mcp: null, account: null },
      onedrive: { connected: false, mcp: null, account: null },
      local_filesystem: { connected: false, tool: null, account: null },
    },
    synctropy: { connected: true },
    recommended_platform: 'google_drive',
  }
}

function makeScanSurfaceArtifact(runId: string, scannedAt: string, fileCount: number) {
  return {
    run_id: runId,
    scanned_at: scannedAt,
    platform: 'google_drive',
    root: 'My Drive',
    root_id: 'root',
    summary: {
      total_items: fileCount + 12,
      files: fileCount,
      folders: 12,
      shared_items: 8,
    },
    items: CATEGORIES.map(cat => ({
      id: `folder_${cat}`,
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      type: 'folder',
      parent_name: 'My Drive',
      file_count: Math.floor(fileCount / CATEGORIES.length),
    })),
  }
}

function makeScanDeepArtifact(runId: string, scannedAt: string, fileCount: number, totalBytes: number) {
  return {
    run_id: runId,
    scanned_at: scannedAt,
    platform: 'google_drive',
    total_files: fileCount,
    total_folders: 28,
    total_bytes: totalBytes,
    depth_reached: 3,
    shared_items: 8,
    orphaned_items: 2,
  }
}

function makeReadUnknownsArtifact(runId: string, scannedAt: string, fileCount: number) {
  return {
    run_id: runId,
    scanned_at: scannedAt,
    processed: fileCount,
    skipped: Math.floor(fileCount * 0.08),
    failed: 3,
  }
}

function makeInventoryArtifact(runId: string, scannedAt: string, itemCount: number) {
  const items = makeInventoryItems(itemCount, scannedAt)
  const totalBytes = items.reduce((sum, i) => sum + i.size_bytes, 0)
  const issueGroups = {
    vague_name: items.filter(i => i.issues.includes('vague_name')).length,
    duplicate: items.filter(i => i.issues.includes('duplicate')).length,
    stale: items.filter(i => i.issues.includes('stale')).length,
    root_clutter: items.filter(i => i.issues.includes('root_clutter')).length,
    unreadable: items.filter(i => i.issues.includes('unreadable')).length,
  }
  return {
    run_id: runId,
    scanned_at: scannedAt,
    platform: 'google_drive',
    root: 'My Drive',
    total_files: itemCount,
    total_folders: 28,
    storage_bytes: totalBytes,
    categories: makeCategoryBreakdown(items),
    issue_summary: issueGroups,
    total_issues: Object.values(issueGroups).reduce((a, b) => a + b, 0),
    items,
  }
}

// ─── runs ──────────────────────────────────────────────────────────────────────

const RUNS = [
  { runId: '2026-04-15T09:00:00.000Z', daysAgoVal: 67, fileCount: 187 },
  { runId: '2026-05-20T09:00:00.000Z', daysAgoVal: 32, fileCount: 204 },
  { runId: '2026-06-10T09:00:00.000Z', daysAgoVal: 11, fileCount: 221 },
]

const SKILLS = [
  { name: '00-scan-connectors', pos: 0, artifactFn: (runId: string, scannedAt: string, fc: number) => makeConnectorsArtifact(runId, scannedAt) },
  { name: '01-scan-surface', pos: 1, artifactFn: makeScanSurfaceArtifact },
  { name: '02-scan-deep', pos: 2, artifactFn: (runId: string, scannedAt: string, fc: number) => makeScanDeepArtifact(runId, scannedAt, fc, fc * 3_200_000) },
  { name: '03-read-unknowns', pos: 3, artifactFn: makeReadUnknownsArtifact },
  { name: '04-build-inventory', pos: 4, artifactFn: makeInventoryArtifact },
]

async function seed() {
  console.log('Seeding pipeline_artifacts...')

  // Clear existing seed data for this user
  const { error: deleteError } = await supabase
    .from('pipeline_artifacts')
    .delete()
    .eq('user_id', USER_ID)
  if (deleteError) throw deleteError
  console.log('Cleared existing artifacts')

  const rows = []
  for (const run of RUNS) {
    const scannedAt = daysAgo(run.daysAgoVal)
    for (const skill of SKILLS) {
      rows.push({
        user_id: USER_ID,
        run_id: run.runId,
        skill_name: skill.name,
        pipeline_pos: skill.pos,
        artifact: skill.artifactFn(run.runId, scannedAt, run.fileCount),
        created_at: scannedAt,
      })
    }
  }

  const { error } = await supabase.from('pipeline_artifacts').insert(rows)
  if (error) throw error

  console.log(`✓ Inserted ${rows.length} artifact rows across ${RUNS.length} runs`)
  console.log('Runs seeded:')
  RUNS.forEach(r => console.log(`  ${r.runId} — ${r.fileCount} files`))
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
