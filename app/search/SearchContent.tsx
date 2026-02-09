"use client"

import { Suspense, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Search, Map as MapIcon, List, Columns2, Filter, X, MapPinned, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Link from "next/link"
import { cn } from "@/lib/utils"

// Components
import { SearchFilters } from "@/components/search/SearchFilters"
import { PropertyCard } from "@/components/luxe/PropertyCard"
import { PropertyCardSkeleton } from "@/components/luxe/PropertyCardSkeleton"
import InteractiveMap from "@/components/features/interactive-map"

// Hooks
import { useSearchFilters } from "@/hooks/useSearchFilters"
import { usePropertySearch } from "@/hooks/usePropertySearch"
import { useMapBounds } from "@/hooks/useMapBounds"

type ViewMode = "split" | "list" | "map"

export default function SearchPage() {
    const [viewMode, setViewMode] = useState<ViewMode>("split")
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

    // Hooks
    const { filters, hasActiveFilters, setSortBy, isPending, setQuery } = useSearchFilters()
    const {
        viewport,
        isSearchAsMove,
        highlightedPropertyId,
        updateBounds,
        toggleSearchAsMove,
        highlightProperty
    } = useMapBounds()

    const { properties, isLoading, totalCount } = usePropertySearch({
        filters,
        bounds: isSearchAsMove ? viewport.bounds : undefined,
    })

    // Handlers
    const handlePropertyHover = useCallback((id: number | string | null) => {
        const numId = typeof id === 'string' ? Number(id) : id
        highlightProperty(numId || null) // Handle NaN or 0 if needed, but primarily cast valid number strings
    }, [highlightProperty])

    return (
        <div className="flex flex-col h-screen bg-white">

            {/* 1. HEADER (Sticky) */}
            <header className="flex-none h-16 border-b border-slate-100 flex items-center px-4 md:px-6 sticky top-0 bg-white/95 backdrop-blur-md z-50">
                <Link href="/" className="flex items-center mr-4 md:mr-8">
                    <div className="font-serif font-bold text-xl tracking-tight text-slate-900">
                        Luxe<span className="text-[#D4AF37]">Estate</span>
                    </div>
                </Link>

                {/* Compact Search Bar */}
                <div className="flex-1 max-w-xl hidden md:flex items-center bg-slate-50 rounded-full px-4 py-2 border border-transparent focus-within:border-[#D4AF37]/50 focus-within:bg-white transition-all">
                    {isPending || isLoading ? (
                        <Loader2 className="w-4 h-4 text-[#D4AF37] mr-2 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4 text-slate-400 mr-2" />
                    )}
                    <input
                        type="text"
                        placeholder="La Barra, José Ignacio, Vista al Mar..."
                        defaultValue={filters.query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none text-slate-900 placeholder:text-slate-500"
                    />
                </div>

                <nav className="ml-auto flex items-center gap-2 md:gap-4">
                    <Button variant="ghost" className="hidden md:flex">Ingresar</Button>
                    <Button className="rounded-full bg-slate-900 text-white hover:bg-slate-800 text-sm">
                        Publicar
                    </Button>
                </nav>
            </header>

            {/* 2. FILTERS/VIEW BAR */}
            <div className="flex-none h-14 border-b border-slate-100/50 flex items-center justify-between px-4 md:px-6 gap-3 sticky top-16 bg-white/95 backdrop-blur-md z-40">
                <div className="flex items-center gap-3">
                    {/* Mobile Filters Button */}
                    <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                className="lg:hidden rounded-full border-slate-200 text-slate-700 text-xs h-8 px-3"
                            >
                                <Filter className="w-3 h-3 mr-2" />
                                Filtros
                                {hasActiveFilters && (
                                    <span className="ml-1 w-2 h-2 rounded-full bg-[#D4AF37]" />
                                )}
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[320px] p-0">
                            <SearchFilters isSheet onClose={() => setMobileFiltersOpen(false)} />
                        </SheetContent>
                    </Sheet>

                    {/* Results Count */}
                    <div className="flex items-center gap-2">
                        {isLoading || isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : null}
                        <span className="text-sm font-medium text-slate-900">
                            {totalCount} propiedades
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Search as I move toggle */}
                    {viewMode !== "list" && (
                        <button
                            onClick={toggleSearchAsMove}
                            className={cn(
                                "hidden md:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all",
                                isSearchAsMove
                                    ? "bg-[#D4AF37] text-white border-[#D4AF37]"
                                    : "border-slate-200 text-slate-600 hover:border-[#D4AF37]"
                            )}
                        >
                            <MapPinned className="w-3 h-3" />
                            Buscar al mover
                        </button>
                    )}

                    {/* Sort Dropdown */}
                    <select
                        value={filters.sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof filters.sortBy)}
                        className="hidden md:block text-xs border border-slate-200 rounded-full px-3 py-1.5 bg-white focus:border-[#D4AF37] outline-none"
                    >
                        <option value="relevance">Relevancia</option>
                        <option value="price_asc">Precio: Menor a Mayor</option>
                        <option value="price_desc">Precio: Mayor a Menor</option>
                        <option value="newest">Más Recientes</option>
                    </select>

                    {/* View Mode Toggle */}
                    <div className="hidden md:flex items-center border border-slate-200 rounded-full overflow-hidden">
                        <button
                            onClick={() => setViewMode("split")}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === "split" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                            )}
                            title="Vista dividida"
                        >
                            <Columns2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                            )}
                            title="Solo lista"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("map")}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === "map" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                            )}
                            title="Solo mapa"
                        >
                            <MapIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. CONTENT AREA */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* LEFT: Desktop Sidebar Filters */}
                <div className="hidden lg:block flex-none">
                    <SearchFilters className="h-full" />
                </div>

                {/* CENTER: Scrollable Property List */}
                {viewMode !== "map" && (
                    <div
                        className={cn(
                            "overflow-y-auto p-4 md:p-6 scrollbar-thin",
                            viewMode === "list" ? "w-full" : "w-full md:w-[60%] lg:w-[50%]"
                        )}
                    >
                        {/* Property Grid */}
                        <div className={cn(
                            "grid gap-4 md:gap-6 pb-20",
                            viewMode === "list"
                                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                : "grid-cols-1 lg:grid-cols-2"
                        )}>
                            {isLoading ? (
                                // Skeleton Loading
                                Array.from({ length: 6 }).map((_, i) => (
                                    <PropertyCardSkeleton key={i} />
                                ))
                            ) : properties.length > 0 ? (
                                // Property Cards
                                properties.map((property) => (
                                    <PropertyCard
                                        key={property.id}
                                        property={property}
                                        onHover={(id) => handlePropertyHover(typeof id === 'string' ? parseInt(id) : id)}
                                    />
                                ))
                            ) : (
                                // No Results
                                <div className="col-span-full py-20 text-center">
                                    <MapIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                        No encontramos propiedades
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Intenta ajustar los filtros o explora otra zona en el mapa.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* RIGHT: Map */}
                {viewMode !== "list" && (
                    <div
                        className={cn(
                            "bg-slate-100 relative",
                            viewMode === "map" ? "w-full h-full" : "hidden md:block flex-1 h-full"
                        )}
                    >
                        <InteractiveMap
                            properties={properties}
                            highlightedPropertyId={highlightedPropertyId}
                            onBoundsChange={updateBounds}
                            onPropertyHover={handlePropertyHover}
                            isSearchAsMove={isSearchAsMove}
                            className="w-full h-full"
                        />
                    </div>
                )}

                {/* Mobile Map Toggle */}
                <div className="md:hidden absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                    <Button
                        onClick={() => setViewMode(viewMode === "map" ? "split" : "map")}
                        className="rounded-full shadow-2xl px-6 bg-slate-900 text-white"
                    >
                        {viewMode === "map" ? (
                            <>
                                <List className="w-4 h-4 mr-2" /> Lista
                            </>
                        ) : (
                            <>
                                <MapIcon className="w-4 h-4 mr-2" /> Mapa
                            </>
                        )}
                    </Button>
                </div>

            </div>
        </div>
    )
}
