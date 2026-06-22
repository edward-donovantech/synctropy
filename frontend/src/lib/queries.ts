import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { UserPreferences } from '../types'

export function usePreferences() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      return data as UserPreferences | null
    },
  })

  const mutation = useMutation({
    mutationFn: async (prefs: Omit<UserPreferences, 'id' | 'updated_at' | 'is_premium'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({ id: user.id, ...prefs, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return data as UserPreferences
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
  })

  return {
    ...query,
    save: mutation.mutate,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  }
}
