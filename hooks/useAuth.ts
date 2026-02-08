'use client'

import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
    isAdmin: boolean
}

/**
 * Hook to get current auth state and subscribe to changes.
 * Use this in client components that need user info.
 */
export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        session: null,
        loading: true,
        isAdmin: false,
    })

    useEffect(() => {
        const supabase = getSupabaseBrowserClient()

        const checkAdminStatus = async (userId: string) => {
            const { data } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', userId)
                .single()
            return !!data?.is_admin
        }

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }: any) => {
            let isAdmin = false
            try {
                if (session?.user) {
                    isAdmin = await checkAdminStatus(session.user.id)
                }
            } catch (error) {
                console.error('Error checking admin status:', error)
            } finally {
                setAuthState({
                    user: session?.user ?? null,
                    session,
                    loading: false,
                    isAdmin,
                })
            }
        })

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: any, session: any) => {
                let isAdmin = false
                try {
                    if (session?.user) {
                        isAdmin = await checkAdminStatus(session.user.id)
                    }
                } catch (error) {
                    console.error('Error checking admin status:', error)
                } finally {
                    setAuthState({
                        user: session?.user ?? null,
                        session,
                        loading: false,
                        isAdmin,
                    })
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    return authState
}

/**
 * Hook to get the user's agency data.
 * Returns null if user is not associated with any agency.
 */
export function useUserAgency() {
    const { user, loading: authLoading } = useAuth()
    const [agency, setAgency] = useState<{
        id: number
        name: string
        slug: string
        logo_url: string | null
        tier_subscription: string
        total_properties: number
        total_views: number
    } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            setAgency(null)
            setLoading(false)
            return
        }

        const supabase = getSupabaseBrowserClient()

        // Get user's agency via agency_users junction table
        supabase
            .from('agency_users')
            .select(`
        agency_id,
        agencies (
          id,
          name,
          slug,
          logo_url,
          tier_subscription,
          total_properties,
          total_views
        )
      `)
            .eq('user_id', user.id)
            .single()
            .then(({ data, error }: any) => {
                if (error || !data) {
                    setAgency(null)
                } else {
                    // Type assertion for Supabase join result
                    setAgency((data as { agencies: typeof agency }).agencies)
                }
                setLoading(false)
            })
    }, [user, authLoading])

    return { agency, loading: loading || authLoading }
}
