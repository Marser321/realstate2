'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Target,
    MessageCircle,
    CheckCircle,
    Clock,
    ArrowLeft,
    Loader2
} from 'lucide-react'
import { ProspectsTable, ProspectRow } from '@/components/partners/ProspectsTable'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { ProspectProperty } from '@/types/database.types'

// Stat Card Component
function StatCard({
    icon: Icon,
    label,
    value,
    subtext,
    color = 'gold'
}: {
    icon: React.ElementType
    label: string
    value: string | number
    subtext?: string
    color?: 'gold' | 'green' | 'blue' | 'purple'
}) {
    const colorClasses = {
        gold: 'from-gold/20 to-gold/5 border-gold/20 text-gold',
        green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-500',
        blue: 'from-sky-500/20 to-sky-500/5 border-sky-500/20 text-sky-500',
        purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-500',
    }

    return (
        <div className={`rounded-xl border bg-gradient-to-br ${colorClasses[color]} p-5`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-foreground/70 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    {subtext && (
                        <p className="text-xs opacity-70 mt-1">
                            {subtext}
                        </p>
                    )}
                </div>
                <div className={`p-2 rounded-lg bg-background/50`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    )
}

export default function SniperDashboard() {
    const [prospects, setProspects] = useState<ProspectRow[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    // Subscribe to realtime changes
    useEffect(() => {
        const fetchProspects = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('prospect_properties')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)

            // MOCK DATA FOR VISUAL REVIEW
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && (!data || data.length === 0)) {
                setProspects([
                    {
                        id: '1',
                        address: 'Rambla Lorenzo Batlle Pacheco, Parada 8',
                        owner_name: 'Inversiones del Sur S.A.',
                        listed_price: 850000,
                        market_estimate: 780000,
                        source: 'mercadolibre',
                        status: 'new',
                        quality_score: 92,
                        days_on_market: 5,
                        last_contact: new Date().toISOString()
                    },
                    {
                        id: '2',
                        address: 'Av. Pedragosa Sierra s/n',
                        owner_name: 'María Fernández',
                        listed_price: 1200000,
                        market_estimate: 1150000,
                        source: 'mercadolibre',
                        status: 'contacted',
                        quality_score: 88,
                        days_on_market: 14,
                        last_contact: new Date(Date.now() - 86400000 * 2).toISOString()
                    },
                    {
                        id: '3',
                        address: 'Calle 20 y 24, Península',
                        owner_name: 'Carlos Rodriguez',
                        listed_price: 320000,
                        market_estimate: 310000,
                        source: 'google_maps',
                        status: 'qualified',
                        quality_score: 75,
                        days_on_market: 30,
                        last_contact: new Date(Date.now() - 86400000 * 5).toISOString()
                    }
                ])
                setLoading(false)
                return
            }

            if (data) {
                // Map DB columns to UI types
                const mappedProspects: ProspectRow[] = (data as ProspectProperty[]).map(p => ({
                    id: p.id,
                    address: p.address || 'Sin dirección',
                    owner_name: p.owner_name || 'Desconocido',
                    listed_price: p.listed_price || 0,
                    market_estimate: p.market_price_estimate || 0,
                    source: (p.source as ProspectRow['source']) || 'google_maps',
                    status: (p.status as ProspectRow['status']) || 'new',
                    quality_score: p.quality_score || 0,
                    days_on_market: p.days_on_market || 0,
                    last_contact: p.updated_at // using updated_at as proxy for last contact
                }))
                setProspects(mappedProspects)
            }
            if (error) console.error('Error fetching prospects:', error)
            setLoading(false)
        }

        fetchProspects()

        const channel = supabase
            .channel('realtime_prospects')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prospect_properties' }, (payload) => {
                const newProspect = payload.new as ProspectProperty
                const mapped: ProspectRow = {
                    id: newProspect.id,
                    address: newProspect.address || 'Sin dirección',
                    owner_name: newProspect.owner_name || 'Desconocido',
                    listed_price: newProspect.listed_price || 0,
                    market_estimate: newProspect.market_price_estimate || 0,
                    source: (newProspect.source as ProspectRow['source']) || 'google_maps',
                    status: (newProspect.status as ProspectRow['status']) || 'new',
                    quality_score: newProspect.quality_score || 0,
                    days_on_market: newProspect.days_on_market || 0,
                    last_contact: newProspect.updated_at
                }
                setProspects((current) => [mapped, ...current])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    const handleAction = async (id: string, action: string) => {
        // Implement status update logic
        if (action === 'approve') {
            const { error: updateError } = await (supabase
                .from('prospect_properties') as any)
                .update({ status: 'qualified' } as any)
                .eq('id', id) as any

            if (!updateError) {
                // Insert into outreach queue to trigger N8N flow
                await (supabase
                    .from('outreach_queue') as any)
                    .insert({
                        lead_id: id,
                        channel: 'whatsapp',
                        status: 'pending',
                        scheduled_for: new Date().toISOString()
                    })
            }

            // Optimistic update
            setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'qualified' } : p))
        } else if (action === 'video_audit') {
            await (supabase.from('prospect_properties') as any).update({ status: 'contacted' }).eq('id', id)
            // Optimistic update
            setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'contacted' } : p))
        } else if (action === 'reject') {
            await (supabase.from('prospect_properties') as any).update({ status: 'disqualified' }).eq('id', id)
            // Optimistic update
            setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'disqualified' } : p))
        }
    }

    // Stats Calculations (Derived from fetched data for simplicity)
    const stats = {
        total: prospects.length,
        qualified: prospects.filter(p => p.status === 'qualified').length,
        contacted: prospects.filter(p => p.status === 'contacted').length,
        new: prospects.filter(p => p.status === 'new').length
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2"
                >
                    <Link
                        href="/partners/dashboard"
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-gold transition-colors w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Dashboard
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground flex items-center gap-3">
                                <Target className="w-8 h-8 text-gold" />
                                Growth Engine <span className="text-muted-foreground font-normal text-lg ml-2">| Sniper</span>
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Motor de generación de inventario automático
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs text-emerald-500 font-medium">
                                    N8N Listening
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <StatCard
                        icon={Target}
                        label="Oportunidades Hoy"
                        value={loading ? "-" : stats.total}
                        subtext="Detectadas por IA"
                        color="blue"
                    />
                    <StatCard
                        icon={Clock}
                        label="Pendientes Revisión"
                        value={loading ? "-" : stats.new}
                        subtext="Requieren Aprobación"
                        color="purple"
                    />
                    <StatCard
                        icon={MessageCircle}
                        label="En Secuencia"
                        value={loading ? "-" : stats.contacted}
                        subtext="Outreach Activo"
                        color="gold"
                    />
                    <StatCard
                        icon={CheckCircle}
                        label="Calificados"
                        value={loading ? "-" : stats.qualified}
                        subtext="Listos para cierre"
                        color="green"
                    />
                </motion.div>

                {/* Main Content */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card rounded-xl overflow-hidden min-h-[400px]"
                >
                    <div className="p-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Oportunidades Recientes
                        </h2>
                        <div className="flex gap-2">
                            <button className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-gold/50 bg-background transition-colors">
                                Exportar CSV
                            </button>
                        </div>
                    </div>

                    <ProspectsTable
                        prospects={prospects}
                        onAction={handleAction}
                    />
                </motion.div>
            </div>
        </div>
    )
}
