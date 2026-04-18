import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sighting {
  id: string
  lat: number
  lng: number
  animal: string
  note?: string
  timestamp: number
  category: string
}

interface Mission {
  id: string
  title: string
  description: string
  emoji: string
  target: number
  current: number
  completed: boolean
}

interface Insights {
  total: number
  uniqueSpecies: number
  topSpecies: { name: string; count: number; emoji: string }[]
  categoryBreakdown: { category: string; count: number; color: string }[]
  recentActivity: Sighting[]
  biodiversityScore: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  bird:      '#00d4ff',
  mammal:    '#ff6b35',
  reptile:   '#39ff14',
  amphibian: '#bf5fff',
  insect:    '#ffd700',
  other:     '#00ff88',
}

const CATEGORY_EMOJI: Record<string, string> = {
  bird:      '🦅',
  mammal:    '🦊',
  reptile:   '🦎',
  amphibian: '🐸',
  insect:    '🦋',
  other:     '🌿',
}

const ANIMAL_EMOJI_MAP: Record<string, string> = {
  eagle: '🦅', hawk: '🦅', owl: '🦉', robin: '🐦', sparrow: '🐦',
  crow: '🐦', duck: '🦆', goose: '🪿', heron: '🐦', pigeon: '🕊️',
  cardinal: '🐦', woodpecker: '🐦', seagull: '🐦', gull: '🐦',
  fox: '🦊', deer: '🦌', rabbit: '🐰', squirrel: '🐿️', raccoon: '🦝',
  coyote: '🐺', skunk: '🦨', opossum: '🐾', bat: '🦇', beaver: '🦫',
  chipmunk: '🐿️', otter: '🦦', snake: '🐍', lizard: '🦎',
  turtle: '🐢', gecko: '🦎', frog: '🐸', toad: '🐸',
  butterfly: '🦋', moth: '🦋', bee: '🐝', dragonfly: '🪲',
  firefly: '✨', ladybug: '🐞', grasshopper: '🦗',
}

function getAnimalEmoji(animal: string): string {
  const lower = animal.toLowerCase()
  for (const [key, emoji] of Object.entries(ANIMAL_EMOJI_MAP)) {
    if (lower.includes(key)) return emoji
  }
  return CATEGORY_EMOJI[getCategory(animal)] || '🌿'
}

function getCategory(animal: string): string {
  const lower = animal.toLowerCase()
  if (['bird','eagle','hawk','owl','robin','sparrow','crow','duck','goose','heron','pigeon','finch','jay','cardinal','wren','swallow','woodpecker','pelican','seagull','gull','parrot','flamingo','hummingbird','warbler','mockingbird'].some(k => lower.includes(k))) return 'bird'
  if (['fox','deer','rabbit','squirrel','raccoon','coyote','skunk','opossum','bat','mole','rat','mouse','beaver','muskrat','groundhog','chipmunk','otter','mink','weasel','vole'].some(k => lower.includes(k))) return 'mammal'
  if (['snake','lizard','turtle','gecko','iguana','skink','garter','anole'].some(k => lower.includes(k))) return 'reptile'
  if (['frog','toad','salamander','newt','bullfrog'].some(k => lower.includes(k))) return 'amphibian'
  if (['butterfly','moth','bee','dragonfly','firefly','beetle','ant','grasshopper','cricket','mantis','cicada','wasp','ladybug'].some(k => lower.includes(k))) return 'insect'
  return 'other'
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function computeInsights(sightings: Sighting[]): Insights {
  const speciesCount: Record<string, number> = {}
  const categoryCount: Record<string, number> = {}
  for (const s of sightings) {
    const key = s.animal.toLowerCase().trim()
    speciesCount[key] = (speciesCount[key] || 0) + 1
    categoryCount[s.category] = (categoryCount[s.category] || 0) + 1
  }
  const topSpecies = Object.entries(speciesCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count, emoji: getAnimalEmoji(name) }))
  const categoryBreakdown = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count, color: CATEGORY_COLOR[category] || '#00ff88' }))
  const uniqueSpecies = Object.keys(speciesCount).length
  const biodiversityScore = Math.min(100, Math.round((uniqueSpecies / Math.max(sightings.length, 1)) * 100 + Object.keys(categoryCount).length * 8))
  return { total: sightings.length, uniqueSpecies, topSpecies, categoryBreakdown, recentActivity: [...sightings].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8), biodiversityScore }
}

function generateMissions(sightings: Sighting[]): Mission[] {
  const cats = new Set(sightings.map(s => s.category))
  const total = sightings.length
  return [
    { id: 'five', title: 'Urban Scout', description: 'Log 5 wildlife sightings to begin your journey', emoji: '🔭', target: 5, current: Math.min(total, 5), completed: total >= 5 },
    { id: 'cats', title: 'Naturalist', description: 'Discover 3 different animal categories', emoji: '🌱', target: 3, current: Math.min(cats.size, 3), completed: cats.size >= 3 },
    { id: 'ten', title: 'Field Researcher', description: 'Contribute 10 sightings to the shared map', emoji: '🗺️', target: 10, current: Math.min(total, 10), completed: total >= 10 },
    { id: 'bird', title: 'Bird Watcher', description: 'Log at least one bird sighting', emoji: '🦅', target: 1, current: sightings.some(s => s.category === 'bird') ? 1 : 0, completed: sightings.some(s => s.category === 'bird') },
    { id: 'mammal', title: 'Mammal Tracker', description: 'Spot an urban mammal in the wild', emoji: '🦊', target: 1, current: sightings.some(s => s.category === 'mammal') ? 1 : 0, completed: sightings.some(s => s.category === 'mammal') },
  ]
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/')({
  component: WildlifeHunt,
})

// ─── Main Component ───────────────────────────────────────────────────────────

function WildlifeHunt() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const routeLayerRef = useRef<any>(null)

  const [sightings, setSightings] = useState<Sighting[]>([])
  const [pendingClick, setPendingClick] = useState<{ lat: number; lng: number } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [animalInput, setAnimalInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [panelTab, setPanelTab] = useState<'insights' | 'missions' | 'feed'>('insights')
  const [panelOpen, setPanelOpen] = useState(true)
  const [routesVisible, setRoutesVisible] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [newSightingId, setNewSightingId] = useState<string | null>(null)

  const insights = computeInsights(sightings)
  const missions = generateMissions(sightings)

  const fetchSightings = useCallback(async () => {
    try {
      const res = await fetch('/api/sightings')
      if (!res.ok) return
      const data: Sighting[] = await res.json()
      setSightings(data)
    } catch {}
  }, [])

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return
    import('leaflet').then(L => {
      if (!mapRef.current || leafletRef.current) return
      const map = L.map(mapRef.current, { center: [39.8283, -98.5795], zoom: 5, zoomControl: true })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd', maxZoom: 20,
      }).addTo(map)
      map.on('click', (e: any) => {
        setPendingClick({ lat: e.latlng.lat, lng: e.latlng.lng })
        setAnimalInput('')
        setNoteInput('')
        setModalOpen(true)
      })
      leafletRef.current = map
      setMapReady(true)
      fetchSightings()
    })
    return () => { if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null } }
  }, [fetchSightings])

  // Sync markers
  useEffect(() => {
    if (!mapReady || !leafletRef.current) return
    import('leaflet').then(L => {
      const map = leafletRef.current
      const existingIds = new Set(markersRef.current.keys())
      const currentIds = new Set(sightings.map(s => s.id))

      for (const s of sightings) {
        if (existingIds.has(s.id)) continue
        const color = CATEGORY_COLOR[s.category] || '#00ff88'
        const emoji = getAnimalEmoji(s.animal)
        const isNew = s.id === newSightingId
        const icon = L.divIcon({
          html: `<div class="sighting-marker${isNew ? ' new-marker' : ''}" style="--mc:${color}">${emoji}</div>`,
          className: '', iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -22],
        })
        const marker = L.marker([s.lat, s.lng], { icon })
        marker.bindPopup(`
          <div style="padding:14px 16px;min-width:200px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:22px">${emoji}</span>
              <div>
                <div style="font-weight:700;font-size:15px;color:#f0f6fc">${s.animal.charAt(0).toUpperCase() + s.animal.slice(1)}</div>
                <div style="font-size:11px;color:${color};text-transform:uppercase;letter-spacing:1px">${s.category}</div>
              </div>
            </div>
            ${s.note ? `<div style="font-size:12px;color:#8b949e;margin-top:4px;font-style:italic">"${s.note}"</div>` : ''}
            <div style="font-size:11px;color:#4b5563;margin-top:8px;border-top:1px solid #1f2937;padding-top:8px">
              📍 ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}<br>${timeAgo(s.timestamp)}
            </div>
          </div>
        `, { maxWidth: 280 })
        marker.addTo(map)
        markersRef.current.set(s.id, marker)
      }

      // Remove stale markers
      for (const id of existingIds) {
        if (!currentIds.has(id)) {
          markersRef.current.get(id)?.remove()
          markersRef.current.delete(id)
        }
      }
    })
  }, [sightings, mapReady, newSightingId])

  // Wildlife routes overlay
  useEffect(() => {
    if (!mapReady || !leafletRef.current) return
    import('leaflet').then(L => {
      const map = leafletRef.current
      if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null }
      if (!routesVisible || sightings.length < 3) return
      const clusters: Sighting[][] = []
      const used = new Set<string>()
      for (const s of sightings) {
        if (used.has(s.id)) continue
        const cluster = [s]; used.add(s.id)
        for (const other of sightings) {
          if (used.has(other.id)) continue
          const d = Math.sqrt(Math.pow(s.lat - other.lat, 2) + Math.pow(s.lng - other.lng, 2))
          if (d < 0.8) { cluster.push(other); used.add(other.id) }
        }
        if (cluster.length >= 2) clusters.push(cluster)
      }
      const lines = clusters.map(c =>
        L.polyline(c.map(s => [s.lat, s.lng] as [number, number]), {
          color: '#00ff88', weight: 2, opacity: 0.55, dashArray: '8 6',
        })
      )
      if (lines.length > 0) routeLayerRef.current = L.layerGroup(lines).addTo(map)
    })
  }, [routesVisible, sightings, mapReady])

  // Polling
  useEffect(() => {
    const id = setInterval(fetchSightings, 6000)
    return () => clearInterval(id)
  }, [fetchSightings])

  const handleSubmit = useCallback(async () => {
    if (!pendingClick || !animalInput.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/sightings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pendingClick.lat, lng: pendingClick.lng, animal: animalInput.trim(), note: noteInput.trim() || undefined }),
      })
      if (res.ok) {
        const created: Sighting = await res.json()
        setNewSightingId(created.id)
        setSightings(prev => [created, ...prev])
        setModalOpen(false); setPendingClick(null); setAnimalInput(''); setNoteInput('')
      }
    } finally { setSubmitting(false) }
  }, [pendingClick, animalInput, noteInput])

  const closeModal = useCallback(() => { setModalOpen(false); setPendingClick(null) }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#080b12' }}>

      {/* Map */}
      <div ref={mapRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Top gradient + header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 500,
        background: 'linear-gradient(to bottom, rgba(8,11,18,0.97) 0%, rgba(8,11,18,0.6) 80%, transparent)',
        padding: '16px 20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(0,255,136,0.1)', border: '1.5px solid #00ff88',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            boxShadow: '0 0 14px rgba(0,255,136,0.35)',
          }}>🦎</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px', color: '#f0f6fc' }}>Urban Wildlife Hunt</div>
            <div style={{ fontSize: 10, color: '#8b949e', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 1 }}>Shared Ecosystem · Live</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8b949e', padding: '6px 12px', background: 'rgba(13,17,23,0.9)', borderRadius: 20, border: '1px solid #1f2937' }}>
            <div className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ff88', flexShrink: 0 }} />
            <span style={{ color: '#f0f6fc', fontWeight: 700 }}>{insights.total}</span>
            <span>sightings</span>
          </div>
          <button onClick={() => setRoutesVisible(v => !v)} style={{
            background: routesVisible ? 'rgba(0,255,136,0.12)' : 'rgba(13,17,23,0.9)',
            border: `1px solid ${routesVisible ? '#00ff88' : '#1f2937'}`,
            color: routesVisible ? '#00ff88' : '#8b949e',
            padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
            boxShadow: routesVisible ? '0 0 8px rgba(0,255,136,0.25)' : 'none',
          }}>🗺️ Routes</button>
          <button onClick={() => setPanelOpen(v => !v)} style={{
            background: 'rgba(13,17,23,0.9)', border: '1px solid #1f2937',
            color: '#8b949e', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>{panelOpen ? '✕ Close' : '☰ Stats'}</button>
        </div>
      </div>

      {/* Bottom hint */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 500, pointerEvents: 'none',
        background: 'rgba(13,17,23,0.85)', border: '1px solid #1f2937',
        borderRadius: 20, padding: '7px 18px',
        fontSize: 12, color: '#8b949e', letterSpacing: '0.3px',
        backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
      }}>
        Click anywhere on the map to log a wildlife sighting
      </div>

      {/* Side Panel */}
      {panelOpen && (
        <div className="slide-in-right" style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 400,
          width: 308, background: 'rgba(8,11,18,0.97)',
          borderLeft: '1px solid #1f2937',
          display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(12px)',
        }}>
          {/* Tabs */}
          <div style={{ padding: '76px 14px 0', display: 'flex', gap: 4 }}>
            {(['insights', 'missions', 'feed'] as const).map(tab => (
              <button key={tab} onClick={() => setPanelTab(tab)} style={{
                flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', border: 'none', textTransform: 'capitalize', letterSpacing: '0.3px',
                background: panelTab === tab ? 'rgba(0,255,136,0.1)' : 'transparent',
                color: panelTab === tab ? '#00ff88' : '#8b949e',
                transition: 'all 0.15s',
              }}>
                {tab === 'insights' ? '📊' : tab === 'missions' ? '🎯' : '📡'} {tab}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 16px' }}>
            {panelTab === 'insights' && <InsightsPanel insights={insights} />}
            {panelTab === 'missions' && <MissionsPanel missions={missions} />}
            {panelTab === 'feed' && <FeedPanel sightings={insights.recentActivity} />}
          </div>
        </div>
      )}

      {/* Log Sighting Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal-appear" style={{
            background: '#0d1117', border: '1px solid #1f2937', borderRadius: 16,
            padding: '26px 26px 24px', width: 380, maxWidth: '94vw',
            boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 80px rgba(0,255,136,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,255,136,0.08)', border: '1px solid #00ff88',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>📍</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#f0f6fc' }}>Log a Sighting</div>
                {pendingClick && <div style={{ fontSize: 11, color: '#4b5563', marginTop: 1 }}>{pendingClick.lat.toFixed(4)}, {pendingClick.lng.toFixed(4)}</div>}
              </div>
              <button onClick={closeModal} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Animal *</label>
              <input
                autoFocus
                value={animalInput}
                onChange={e => setAnimalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="e.g. Red Fox, Great Horned Owl…"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  background: '#111827', border: '1px solid #1f2937',
                  color: '#f0f6fc', fontSize: 14, outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = '#00ff88')}
                onBlur={e => (e.target.style.borderColor = '#1f2937')}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                Note <span style={{ color: '#374151', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                placeholder="Behaviour, markings, count…"
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  background: '#111827', border: '1px solid #1f2937',
                  color: '#f0f6fc', fontSize: 13, outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = '#00ff88')}
                onBlur={e => (e.target.style.borderColor = '#1f2937')}
              />
            </div>

            {animalInput.trim() && (() => {
              const cat = getCategory(animalInput)
              const color = CATEGORY_COLOR[cat]
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                  padding: '7px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${color}30`,
                }}>
                  <span style={{ fontSize: 18 }}>{getAnimalEmoji(animalInput)}</span>
                  <span style={{ fontSize: 12, color, fontWeight: 700, textTransform: 'capitalize' }}>{cat}</span>
                  <span style={{ fontSize: 11, color: '#4b5563' }}>detected</span>
                </div>
              )
            })()}

            <button
              onClick={handleSubmit}
              disabled={!animalInput.trim() || submitting}
              style={{
                width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                background: !animalInput.trim() || submitting ? '#1f2937' : 'linear-gradient(135deg, #00ff88, #00d4ff)',
                color: !animalInput.trim() || submitting ? '#4b5563' : '#080b12',
                fontWeight: 700, fontSize: 14, cursor: !animalInput.trim() || submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', letterSpacing: '0.2px',
              }}
            >{submitting ? 'Logging…' : '🌿 Log Sighting'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Insights Panel ───────────────────────────────────────────────────────────

function InsightsPanel({ insights }: { insights: Insights }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCard label="Total Sightings" value={insights.total} color="#00ff88" />
        <StatCard label="Unique Species" value={insights.uniqueSpecies} color="#00d4ff" />
        <StatCard label="Categories" value={insights.categoryBreakdown.length} color="#bf5fff" />
        <StatCard label="Biodiversity" value={`${insights.biodiversityScore}%`} color="#ff6b35" />
      </div>

      {insights.topSpecies.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#8b949e', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>Top Species</div>
          {insights.topSpecies.map((s, i) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <span style={{ fontSize: 14, width: 22, textAlign: 'center', flexShrink: 0 }}>{s.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: '#f0f6fc', fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: '#8b949e' }}>{s.count}</span>
                </div>
                <div style={{ height: 3, background: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${(s.count / insights.topSpecies[0].count) * 100}%`,
                    background: `hsl(${(i * 60) % 360}, 90%, 55%)`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {insights.categoryBreakdown.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#8b949e', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>By Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {insights.categoryBreakdown.map(c => (
              <div key={c.category} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                background: `${c.color}18`, border: `1px solid ${c.color}44`,
                fontSize: 11, color: c.color, fontWeight: 600, textTransform: 'capitalize',
              }}>
                {CATEGORY_EMOJI[c.category] || '🌿'} {c.category} <span style={{ opacity: 0.6 }}>·{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.total === 0 && (
        <div style={{ textAlign: 'center', padding: '28px 0', color: '#4b5563', fontSize: 13 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌍</div>
          No sightings yet.<br />Click the map to log the first one!
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '12px 12px 10px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2, letterSpacing: '0.3px' }}>{label}</div>
    </div>
  )
}

// ─── Missions Panel ───────────────────────────────────────────────────────────

function MissionsPanel({ missions }: { missions: Mission[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>Complete missions by logging sightings on the shared map.</div>
      {missions.map(m => {
        const pct = Math.round((m.current / m.target) * 100)
        return (
          <div key={m.id} style={{
            background: '#111827',
            border: `1px solid ${m.completed ? '#00ff88' : '#1f2937'}`,
            borderRadius: 12, padding: '12px 14px',
            boxShadow: m.completed ? '0 0 10px rgba(0,255,136,0.1)' : 'none',
          }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{m.completed ? '✅' : m.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: m.completed ? '#00ff88' : '#f0f6fc' }}>{m.title}</span>
                  <span style={{ fontSize: 11, color: m.completed ? '#00ff88' : '#8b949e', fontWeight: 600 }}>{m.current}/{m.target}</span>
                </div>
                <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 8 }}>{m.description}</div>
                <div style={{ height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2, width: `${pct}%`,
                    background: m.completed ? '#00ff88' : 'linear-gradient(90deg, #00ff88, #00d4ff)',
                    transition: 'width 0.5s ease',
                    boxShadow: m.completed ? '0 0 6px #00ff88' : 'none',
                  }} />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Feed Panel ───────────────────────────────────────────────────────────────

function FeedPanel({ sightings }: { sightings: Sighting[] }) {
  if (sightings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#4b5563', fontSize: 13 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📡</div>
        Waiting for sightings…
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#8b949e', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>Recent community sightings</div>
      {sightings.map(s => {
        const color = CATEGORY_COLOR[s.category] || '#00ff88'
        const emoji = getAnimalEmoji(s.animal)
        return (
          <div key={s.id} style={{
            display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10,
            background: '#111827', border: '1px solid #1f2937',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: `${color}18`, border: `1.5px solid ${color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>{emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f6fc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.animal.charAt(0).toUpperCase() + s.animal.slice(1)}
              </div>
              <div style={{ fontSize: 11, color: '#4b5563', marginTop: 1 }}>
                {s.lat.toFixed(3)}, {s.lng.toFixed(3)} · {timeAgo(s.timestamp)}
              </div>
              {s.note && <div style={{ fontSize: 11, color: '#8b949e', marginTop: 3, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{s.note}"</div>}
            </div>
            <div style={{ fontSize: 10, color, textTransform: 'capitalize', alignSelf: 'flex-start', fontWeight: 600, flexShrink: 0 }}>{s.category}</div>
          </div>
        )
      })}
    </div>
  )
}
