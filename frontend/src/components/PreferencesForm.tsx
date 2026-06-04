import { useState, useEffect } from 'react'
import { z } from 'zod'
import { usePreferences } from '../lib/queries'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { toast } from 'sonner'

export const preferencesSchema = z.object({
  root_path: z.string().nullable().optional(),
  ignore_paths: z.array(z.string()).default([]),
  archive_after_days: z.number().int().min(30).max(730),
  taxonomy_domains: z.array(z.string().min(1)).min(1),
})

export type PreferencesFormValues = z.infer<typeof preferencesSchema>

const DEFAULTS: PreferencesFormValues = {
  root_path: null,
  ignore_paths: [],
  archive_after_days: 365,
  taxonomy_domains: ['projects', 'finance', 'admin', 'media', 'reference'],
}

export function PreferencesForm() {
  const { data: saved, isSaving, save } = usePreferences()

  const [values, setValues] = useState<PreferencesFormValues>(() =>
    saved
      ? {
          root_path: saved.root_path,
          ignore_paths: saved.ignore_paths,
          archive_after_days: saved.archive_after_days,
          taxonomy_domains: saved.taxonomy_domains,
        }
      : DEFAULTS
  )
  useEffect(() => {
    if (saved) {
      setValues({
        root_path: saved.root_path,
        ignore_paths: saved.ignore_paths,
        archive_after_days: saved.archive_after_days,
        taxonomy_domains: saved.taxonomy_domains,
      })
    }
  }, [saved])

  const [pathInput, setPathInput] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleSave() {
    const result = preferencesSchema.safeParse(values)
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        errs[String(issue.path[0])] = issue.message
      })
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    save({
      root_path: result.data.root_path ?? null,
      ignore_paths: result.data.ignore_paths,
      archive_after_days: result.data.archive_after_days,
      taxonomy_domains: result.data.taxonomy_domains,
    }, {
      onSuccess: () => toast('Preferences saved'),
      onError: () => toast.error("Couldn't save — try again"),
    })
  }

  function addIgnorePath() {
    const trimmed = pathInput.trim()
    if (!trimmed || values.ignore_paths.includes(trimmed)) return
    setValues(v => ({ ...v, ignore_paths: [...v.ignore_paths, trimmed] }))
    setPathInput('')
  }

  function removeIgnorePath(path: string) {
    setValues(v => ({ ...v, ignore_paths: v.ignore_paths.filter(p => p !== path) }))
  }

  function addDomain() {
    const trimmed = domainInput.trim()
    if (!trimmed || values.taxonomy_domains.includes(trimmed)) return
    setValues(v => ({ ...v, taxonomy_domains: [...v.taxonomy_domains, trimmed] }))
    setDomainInput('')
  }

  function removeDomain(domain: string) {
    setValues(v => ({ ...v, taxonomy_domains: v.taxonomy_domains.filter(d => d !== domain) }))
  }

  return (
    <div className="space-y-8 max-w-lg">

      {/* Scan root */}
      <div className="space-y-1">
        <Label className="text-slate-300">Scan root</Label>
        <p className="text-xs text-slate-500">The folder Synctropy analyses. Empty means your entire Drive.</p>
        <Input
          value={values.root_path ?? ''}
          onChange={e => setValues(v => ({ ...v, root_path: e.target.value || null }))}
          placeholder="/path/to/folder"
          className="bg-[#13131f] border-[#2a2a3e] text-slate-200 font-mono text-sm"
        />
      </div>

      {/* Ignore paths */}
      <div className="space-y-2">
        <Label className="text-slate-300">Ignore paths</Label>
        <p className="text-xs text-slate-500">Folders excluded from every scan.</p>
        <div className="flex flex-wrap gap-2">
          {values.ignore_paths.map(path => (
            <span
              key={path}
              className="flex items-center gap-1.5 bg-[#1e1e35] border border-[#3a3a5c] rounded px-2 py-0.5 text-xs text-violet-400 font-mono"
            >
              {path}
              <button onClick={() => removeIgnorePath(path)} className="text-slate-500 hover:text-slate-300">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={pathInput}
            onChange={e => setPathInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIgnorePath() } }}
            placeholder="node_modules"
            className="bg-[#13131f] border-[#2a2a3e] text-slate-200 font-mono text-sm"
          />
          <Button variant="outline" onClick={addIgnorePath} className="border-[#2a2a3e] text-slate-300 shrink-0">
            Add
          </Button>
        </div>
      </div>

      {/* Archive threshold */}
      <div className="space-y-2">
        <Label className="text-slate-300">
          Archive after{' '}
          <span className="text-violet-400 font-mono">{values.archive_after_days}</span>{' '}
          days
        </Label>
        <p className="text-xs text-slate-500">Files untouched longer than this are flagged as archive candidates.</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={30}
            max={730}
            value={values.archive_after_days}
            onChange={e => setValues(v => ({ ...v, archive_after_days: Number(e.target.value) }))}
            className="flex-1 accent-violet-400"
          />
          <span className="text-sm font-mono text-slate-200 w-12 text-right">{values.archive_after_days}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>30 days</span>
          <span>2 years</span>
        </div>
        {fieldErrors.archive_after_days && (
          <p className="text-xs text-red-400">{fieldErrors.archive_after_days}</p>
        )}
      </div>

      {/* Taxonomy domains */}
      <div className="space-y-2">
        <Label className="text-slate-300">Taxonomy domains</Label>
        <p className="text-xs text-slate-500">Top-level categories Synctropy organises around.</p>
        <div className="grid grid-cols-2 gap-2">
          {values.taxonomy_domains.map(domain => (
            <div
              key={domain}
              className="flex items-center justify-between bg-[#13131f] border border-[#2a2a3e] rounded px-3 py-1.5 font-mono text-sm text-slate-200"
            >
              {domain}
              <button onClick={() => removeDomain(domain)} className="text-slate-600 hover:text-slate-400 ml-2">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={domainInput}
            onChange={e => setDomainInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDomain() } }}
            placeholder="matters"
            className="bg-[#13131f] border-[#2a2a3e] text-slate-200 font-mono text-sm"
          />
          <Button variant="outline" onClick={addDomain} className="border-[#2a2a3e] text-slate-300 shrink-0">
            Add
          </Button>
        </div>
        {fieldErrors.taxonomy_domains && (
          <p className="text-xs text-red-400">{fieldErrors.taxonomy_domains}</p>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-violet-500 hover:bg-violet-600"
        >
          {isSaving ? 'Saving…' : 'Save preferences'}
        </Button>
        <span className="text-xs text-slate-500">Changes apply to next scan</span>
      </div>
    </div>
  )
}
