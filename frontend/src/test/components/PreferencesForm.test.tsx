import { describe, it, expect } from 'vitest'
import { preferencesSchema } from '../../components/PreferencesForm'

const valid = {
  root_path: '/Users/test',
  ignore_paths: ['node_modules', '.git'],
  archive_after_days: 180,
  taxonomy_domains: ['projects', 'finance'],
}

describe('preferencesSchema', () => {
  it('accepts valid preferences', () => {
    expect(preferencesSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts null root_path', () => {
    expect(preferencesSchema.safeParse({ ...valid, root_path: null }).success).toBe(true)
  })

  it('rejects archive_after_days below 30', () => {
    expect(preferencesSchema.safeParse({ ...valid, archive_after_days: 29 }).success).toBe(false)
  })

  it('rejects archive_after_days above 730', () => {
    expect(preferencesSchema.safeParse({ ...valid, archive_after_days: 731 }).success).toBe(false)
  })

  it('rejects empty taxonomy_domains', () => {
    expect(preferencesSchema.safeParse({ ...valid, taxonomy_domains: [] }).success).toBe(false)
  })

  it('rejects blank domain name', () => {
    expect(preferencesSchema.safeParse({ ...valid, taxonomy_domains: ['projects', ''] }).success).toBe(false)
  })
})
