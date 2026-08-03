import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import styles from './AdminPage.module.css'

// ─── Constants ─────────────────────────────────────────────────────────────────
const ACCENT   = '#D94035'
const COLORS   = ['#D94035', '#1D1D1F', '#6E6E73', '#86868B', '#C7C7CC', '#3A3A3C']
const TIER_CLR = { TIER1: '#1D1D1F', TIER2: '#D94035', TIER3: '#6E6E73', TIER4: '#86868B', TIER5: '#C7C7CC' }

const TIME_FILTERS = [
  { value: 'all',       label: 'All Time' },
  { value: 'daily',     label: 'Today'    },
  { value: 'weekly',    label: '7 Days'   },
  { value: 'monthly',   label: '30 Days'  },
  { value: 'quarterly', label: '90 Days'  },
  { value: 'yearly',    label: '1 Year'   },
]

const TABS = ['overview', 'users', 'listings', 'engagement', 'revisions', 'feedback']

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getTimeStart(filter) {
  const d = new Date()
  switch (filter) {
    case 'daily':     return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    case 'weekly':    { const x = new Date(); x.setDate(x.getDate() - 7);   return x }
    case 'monthly':   { const x = new Date(); x.setDate(x.getDate() - 30);  return x }
    case 'quarterly': { const x = new Date(); x.setDate(x.getDate() - 90);  return x }
    case 'yearly':    { const x = new Date(); x.setDate(x.getDate() - 365); return x }
    default: return null
  }
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDuration(ms) {
  if (!ms || ms < 0) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60)  return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function toChartData(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, count: v }))
}

function extractCity(address) {
  if (!address) return 'Unknown'
  const parts = address.split(',')
  return parts.length >= 2 ? parts[parts.length - 2]?.trim() || 'Unknown' : 'Unknown'
}

function downloadCSV(profiles, listingCounts) {
  const header = ['Name', 'Email', 'Brokerage', 'Phone', 'Joined', 'Listings Generated', 'Last Activity']
  const rows = profiles.map(p => [
    p.full_name || '', p.email || '', p.brokerage || '', p.phone || '',
    fmtDate(p.created_at), listingCounts[p.id] || 0, fmtDate(p.last_activity),
  ])
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'intelist_users.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── UI primitives ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }) {
  return (
    <div className={styles.kpiCard}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiValue} style={accent ? { color: ACCENT } : {}}>{value}</p>
      {sub && <p className={styles.kpiSub}>{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }) {
  return <h2 className={styles.sectionTitle}>{children}</h2>
}

function ChartCard({ title, children, half }) {
  return (
    <div className={`${styles.chartCard} ${half ? styles.chartCardHalf : ''}`}>
      <p className={styles.chartTitle}>{title}</p>
      {children}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

function EmptyState({ message = 'No data yet' }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyStateText}>{message}</p>
    </div>
  )
}

// ─── AdminPage ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [loading,       setLoading]       = useState(true)
  const [isAdmin,       setIsAdmin]       = useState(false)
  const [profiles,      setProfiles]      = useState([])
  const [listings,      setListings]      = useState([])
  const [activeTab,     setActiveTab]     = useState('overview')
  const [userSearch,    setUserSearch]    = useState('')

  // Time filter
  const [timeFilter,     setTimeFilter]     = useState('all')

  // User tab filters
  const [brokerageFilter, setBrokerageFilter] = useState('')
  const [dateFrom,        setDateFrom]        = useState('')
  const [dateTo,          setDateTo]          = useState('')
  const [activityFilter,  setActivityFilter]  = useState('all')

  useEffect(() => { checkAdmin() }, [])

  async function checkAdmin() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
    if (session.user?.email === adminEmail) {
      setIsAdmin(true)
      await fetchData()
    } else {
      setIsAdmin(false)
    }
    setLoading(false)
  }

  async function fetchData() {
    const [{ data: prof }, { data: list }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('listings').select('*').order('created_at', { ascending: false }),
    ])
    setProfiles(prof || [])
    setListings(list || [])
  }

  // ── Time-filtered base data ──────────────────────────────────────────────────
  const timeStart = useMemo(() => getTimeStart(timeFilter), [timeFilter])

  const filteredListings = useMemo(() => {
    if (!timeStart) return listings
    return listings.filter(l => new Date(l.created_at) >= timeStart)
  }, [listings, timeStart])

  const filteredProfiles = useMemo(() => {
    if (!timeStart) return profiles
    return profiles.filter(p => new Date(p.created_at) >= timeStart)
  }, [profiles, timeStart])

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalUsers    = filteredProfiles.length
    const sevenDaysAgo  = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const newThisWeek   = filteredProfiles.filter(p => new Date(p.created_at) > sevenDaysAgo).length
    const totalListings = filteredListings.length

    const avgRevise = filteredListings.length
      ? (filteredListings.reduce((s, l) => s + (l.ai_revise_count || 0), 0) / filteredListings.length).toFixed(1)
      : '—'

    const copyCounts = { mls: 0, zillow: 0, instagram: 0 }
    filteredListings.forEach(l => (l.sections_copied || []).forEach(s => { if (s in copyCounts) copyCounts[s]++ }))
    const topSection      = Object.entries(copyCounts).sort((a, b) => b[1] - a[1])[0]
    const topSectionLabel = topSection
      ? `${topSection[0] === 'mls' ? 'MLS' : topSection[0] === 'zillow' ? 'Zillow' : 'Instagram'} (${topSection[1]})`
      : '—'

    const withCopies   = filteredListings.filter(l => (l.sections_copied || []).length > 0)
    const directCopies = withCopies.filter(l => (l.ai_revise_count || 0) === 0)
    const firstCopyRate = withCopies.length
      ? `${((directCopies.length / withCopies.length) * 100).toFixed(0)}%`
      : '—'

    return { totalUsers, newThisWeek, totalListings, avgRevise, topSectionLabel, copyCounts, firstCopyRate }
  }, [filteredProfiles, filteredListings])

  // ── User growth ──────────────────────────────────────────────────────────────
  const userGrowthData = useMemo(() => {
    const byDate = {}
    let cum = 0
    filteredProfiles.forEach(p => {
      const d = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      byDate[d] = (byDate[d] || 0) + 1
    })
    return Object.entries(byDate).map(([date, count]) => { cum += count; return { date, count, cumulative: cum } })
  }, [filteredProfiles])

  // ── Brokerages ───────────────────────────────────────────────────────────────
  const brokerageData = useMemo(() => {
    const grouped = groupBy(filteredProfiles.filter(p => p.brokerage), p => p.brokerage)
    return toChartData(grouped).slice(0, 10)
  }, [filteredProfiles])

  const allBrokerages = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.brokerage).map(p => p.brokerage))).sort()
  }, [profiles])

  // ── Listing counts per user ──────────────────────────────────────────────────
  const listingCounts = useMemo(() => {
    const map = {}
    filteredListings.forEach(l => { map[l.user_id] = (map[l.user_id] || 0) + 1 })
    return map
  }, [filteredListings])

  // ── User ranking ─────────────────────────────────────────────────────────────
  const userRanking = useMemo(() => {
    return [...filteredProfiles]
      .map(p => ({
        ...p,
        listingCount: listingCounts[p.id] || 0,
        lastActivity: filteredListings.find(l => l.user_id === p.id)?.created_at || null,
      }))
      .sort((a, b) => b.listingCount - a.listingCount)
  }, [filteredProfiles, filteredListings, listingCounts])

  // ── User tab filtered ────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = userRanking

    if (userSearch.trim()) {
      const q = userSearch.toLowerCase()
      result = result.filter(p =>
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.email    || '').toLowerCase().includes(q) ||
        (p.brokerage|| '').toLowerCase().includes(q)
      )
    }
    if (brokerageFilter) result = result.filter(p => p.brokerage === brokerageFilter)
    if (dateFrom)        result = result.filter(p => new Date(p.created_at) >= new Date(dateFrom))
    if (dateTo)          result = result.filter(p => new Date(p.created_at) <= new Date(dateTo + 'T23:59:59'))
    if (activityFilter === 'active')   result = result.filter(p => (listingCounts[p.id] || 0) > 0)
    if (activityFilter === 'inactive') result = result.filter(p => (listingCounts[p.id] || 0) === 0)

    return result
  }, [userRanking, userSearch, brokerageFilter, dateFrom, dateTo, activityFilter, listingCounts])

  // ── Listing charts ───────────────────────────────────────────────────────────
  const regionData = useMemo(() => {
    return toChartData(groupBy(filteredListings.filter(l => l.address), l => extractCity(l.address))).slice(0, 12)
  }, [filteredListings])

  const tierData = useMemo(() => {
    const g = groupBy(filteredListings.filter(l => l.tier), l => l.tier)
    return Object.entries(g).map(([name, value]) => ({ name, value }))
  }, [filteredListings])

  const propTypeData = useMemo(() => {
    const g = groupBy(filteredListings.filter(l => l.property_type), l => l.property_type)
    return Object.entries(g).map(([name, value]) => ({ name, value }))
  }, [filteredListings])

  const priceRangeData = useMemo(() => {
    const order = ['<$300K', '$300K–$500K', '$500K–$700K', '$700K–$900K', '$900K–$1.5M', '$1.5M+']
    const g = groupBy(filteredListings.filter(l => l.price_range), l => l.price_range)
    return order.filter(k => k in g).map(k => ({ name: k, count: g[k] }))
  }, [filteredListings])

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }))
    filteredListings.forEach(l => { hours[new Date(l.created_at).getHours()].count++ })
    return hours
  }, [filteredListings])

  // ── Engagement ───────────────────────────────────────────────────────────────
  const engagementStats = useMemo(() => {
    const withRevise   = filteredListings.filter(l => (l.ai_revise_count || 0) > 0).length
    const reviseRate   = filteredListings.length ? ((withRevise / filteredListings.length) * 100).toFixed(1) : '—'
    const avgRevise    = filteredListings.length
      ? (filteredListings.reduce((s, l) => s + (l.ai_revise_count || 0), 0) / filteredListings.length).toFixed(1)
      : '—'
    const totalRevises = filteredListings.reduce((s, l) => s + (l.ai_revise_count || 0), 0)

    const copyCounts = { mls: 0, zillow: 0, instagram: 0 }
    filteredListings.forEach(l => (l.sections_copied || []).forEach(s => { if (s in copyCounts) copyCounts[s]++ }))
    const totalCopies = Object.values(copyCounts).reduce((a, b) => a + b, 0)
    const sectionRates = [
      { name: 'MLS',       count: copyCounts.mls,       pct: totalCopies ? ((copyCounts.mls       / totalCopies) * 100).toFixed(0) : 0 },
      { name: 'Zillow',    count: copyCounts.zillow,    pct: totalCopies ? ((copyCounts.zillow    / totalCopies) * 100).toFixed(0) : 0 },
      { name: 'Instagram', count: copyCounts.instagram, pct: totalCopies ? ((copyCounts.instagram / totalCopies) * 100).toFixed(0) : 0 },
    ]

    const stopWords = new Set(['the','a','an','and','or','but','it','its','to','of','in','is','more','less','make','this','be','that','with','for','just','very','really'])
    const wordCounts = {}
    filteredListings.forEach(l => (l.revise_prompts || []).forEach(prompt => {
      prompt.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
        if (w.length > 2 && !stopWords.has(w)) wordCounts[w] = (wordCounts[w] || 0) + 1
      })
    }))
    const topKeywords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }))

    return { reviseRate, avgRevise, totalRevises, withRevise, sectionRates, topKeywords }
  }, [filteredListings])

  // ── Session stats (from optional columns in listings table) ──────────────────
  const sessionStats = useMemo(() => {
    const withData = filteredListings.filter(l => l.session_start && l.generation_time && l.session_end)
    if (!withData.length) return null

    const inAppMs       = withData.map(l => new Date(l.session_end) - new Date(l.session_start))
    const afterGenMs    = withData.map(l => new Date(l.session_end) - new Date(l.generation_time))
    const avgTimeInApp  = fmtDuration(inAppMs.reduce((a, b) => a + b, 0) / inAppMs.length)
    const avgAfterGen   = fmtDuration(afterGenMs.reduce((a, b) => a + b, 0) / afterGenMs.length)
    const exitFastCount = afterGenMs.filter(t => t <= 60000).length
    const exitSlowCount = afterGenMs.filter(t => t >= 300000).length
    const exitFastRate  = `${((exitFastCount / afterGenMs.length) * 100).toFixed(0)}%`
    const exitSlowRate  = `${((exitSlowCount / afterGenMs.length) * 100).toFixed(0)}%`

    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, avg: 0, _sum: 0, _n: 0 }))
    withData.forEach(l => {
      const h = new Date(l.generation_time).getHours()
      const dur = new Date(l.session_end) - new Date(l.session_start)
      hours[h]._sum += dur; hours[h]._n++
    })
    const hourlySession = hours.map(h => ({ hour: h.hour, avg: h._n > 0 ? Math.round(h._sum / h._n / 1000) : 0 }))

    return { avgTimeInApp, avgAfterGen, exitFastRate, exitSlowRate, hourlySession, sessionCount: withData.length }
  }, [filteredListings])

  // ── Revisions ────────────────────────────────────────────────────────────────
  const revisionsData = useMemo(() => {
    const allPrompts = []
    filteredListings.forEach(l => (l.revise_prompts || []).forEach(prompt => {
      allPrompts.push({ prompt, address: l.address })
    }))

    const promptCounts = {}
    allPrompts.forEach(({ prompt }) => {
      const key = prompt.trim().toLowerCase()
      promptCounts[key] = (promptCounts[key] || 0) + 1
    })
    const topPrompts = Object.entries(promptCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([text, count]) => ({ text, count }))

    const userRevisions = {}
    filteredListings.forEach(l => {
      if (!l.user_id) return
      userRevisions[l.user_id] = (userRevisions[l.user_id] || 0) + (l.ai_revise_count || 0)
    })
    const usersWithListings = Object.keys(userRevisions).length
    const totalRevisions    = Object.values(userRevisions).reduce((a, b) => a + b, 0)
    const avgPerUser        = usersWithListings ? (totalRevisions / usersWithListings).toFixed(1) : '—'

    const userLeaderboard = Object.entries(userRevisions)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([userId, count]) => {
        const profile = profiles.find(p => p.id === userId)
        return { userId, count, name: profile?.full_name || profile?.email || userId }
      })

    return { allPrompts, topPrompts, avgPerUser, totalRevisions, userLeaderboard }
  }, [filteredListings, profiles])

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return <div className={styles.centered}><div className={styles.spinner} /></div>

  if (!isAdmin) {
    return (
      <div className={styles.centered}>
        <p className={styles.denied}>Access denied.</p>
        <a href="/" className={styles.backLink}>← Back to app</a>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brand}>Intelist <span className={styles.brandAccent}>Pro</span></span>
          <span className={styles.adminBadge}>Admin</span>
        </div>
        <div className={styles.headerRight}>
          <a href="/" className={styles.backLink}>← App</a>
          <button className={styles.signOut} onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}>Sign out</button>
        </div>
      </header>

      {/* ── Time filter ── */}
      <div className={styles.timeFilterRow}>
        {TIME_FILTERS.map(f => (
          <button
            key={f.value}
            className={`${styles.timePill} ${timeFilter === f.value ? styles.timePillActive : ''}`}
            onClick={() => setTimeFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Tab nav ── */}
      <nav className={styles.tabNav}>
        {TABS.map(t => (
          <button
            key={t}
            className={`${styles.tabBtn} ${activeTab === t ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <main className={styles.main}>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <>
            <SectionTitle>Overview</SectionTitle>
            <div className={styles.kpiRow}>
              <KpiCard label="Total Users"             value={kpis.totalUsers}      sub="in period" />
              <KpiCard label="New This Week"           value={kpis.newThisWeek}     sub="last 7 days" accent />
              <KpiCard label="Listings Generated"      value={kpis.totalListings}   sub="in period" />
              <KpiCard label="Avg AI Revise / Listing" value={kpis.avgRevise}       sub="requests" />
              <KpiCard label="Most Copied Section"     value={kpis.topSectionLabel} sub="by copy count" />
              <KpiCard label="First-Copy Rate"         value={kpis.firstCopyRate}   sub="copied without revision" accent />
            </div>

            <div className={styles.chartRow}>
              <ChartCard title="Cumulative User Growth">
                {userGrowthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#86868B' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: '#86868B' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="cumulative" name="Users" stroke={ACCENT} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>

              <ChartCard title="Section Copy Distribution" half>
                {Object.values(kpis.copyCounts).some(v => v > 0) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'MLS',       value: kpis.copyCounts.mls },
                          { name: 'Zillow',    value: kpis.copyCounts.zillow },
                          { name: 'Instagram', value: kpis.copyCounts.instagram },
                        ]}
                        cx="50%" cy="50%" outerRadius={90} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}
                      >
                        {COLORS.slice(0, 3).map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>
            </div>
          </>
        )}

        {/* ── Users ── */}
        {activeTab === 'users' && (
          <>
            <SectionTitle>User Analytics</SectionTitle>

            {/* Filters */}
            <div className={styles.userFiltersRow}>
              <select
                className={styles.filterSelect}
                value={brokerageFilter}
                onChange={e => setBrokerageFilter(e.target.value)}
              >
                <option value="">All Brokerages</option>
                {allBrokerages.map(b => <option key={b} value={b}>{b}</option>)}
              </select>

              <input type="date" className={styles.filterDateInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className={styles.filterDateSep}>–</span>
              <input type="date" className={styles.filterDateInput} value={dateTo}   onChange={e => setDateTo(e.target.value)} />

              <div className={styles.activityBtns}>
                {['all', 'active', 'inactive'].map(v => (
                  <button
                    key={v}
                    className={`${styles.activityBtn} ${activityFilter === v ? styles.activityBtnActive : ''}`}
                    onClick={() => setActivityFilter(v)}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>

              {(brokerageFilter || dateFrom || dateTo || activityFilter !== 'all') && (
                <button
                  className={styles.clearFiltersBtn}
                  onClick={() => { setBrokerageFilter(''); setDateFrom(''); setDateTo(''); setActivityFilter('all') }}
                >
                  Clear
                </button>
              )}
            </div>

            {brokerageData.length > 0 ? (
              <ChartCard title="Brokerage Distribution (top 10)">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={brokerageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#86868B' }} />
                    <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11, fill: '#1D1D1F' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Users" fill={ACCENT} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : <EmptyState message="No brokerage data" />}

            <div className={styles.tableHeader}>
              <p className={styles.chartTitle}>User Ranking by Usage</p>
              <div className={styles.tableActions}>
                <input
                  className={styles.searchInput}
                  placeholder="Search name, email, brokerage…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <button className={styles.csvBtn} onClick={() => downloadCSV(filteredUsers, listingCounts)}>
                  Export CSV
                </button>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Brokerage</th><th>Joined</th><th>Listings</th><th>Last Activity</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0
                    ? filteredUsers.map((p, i) => (
                        <tr key={p.id}>
                          <td className={styles.rankCell}>{i + 1}</td>
                          <td className={styles.nameCell}>{p.full_name || '—'}</td>
                          <td className={styles.emailCell}>{p.email || '—'}</td>
                          <td>{p.brokerage || '—'}</td>
                          <td>{fmtDate(p.created_at)}</td>
                          <td className={styles.countCell}>{p.listingCount}</td>
                          <td>{fmtDate(p.lastActivity)}</td>
                        </tr>
                      ))
                    : <tr><td colSpan={7} className={styles.emptyRow}>No results</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Listings ── */}
        {activeTab === 'listings' && (
          <>
            <SectionTitle>Listing Analytics</SectionTitle>
            {filteredListings.length === 0
              ? <EmptyState message="No listings in this period" />
              : (
                <>
                  <div className={styles.chartRow}>
                    <ChartCard title="TIER Distribution" half>
                      {tierData.length > 0
                        ? <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={tierData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>{tierData.map((e, i) => <Cell key={i} fill={TIER_CLR[e.name] || COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                        : <EmptyState />}
                    </ChartCard>
                    <ChartCard title="Property Type" half>
                      {propTypeData.length > 0
                        ? <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={propTypeData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>{propTypeData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                        : <EmptyState />}
                    </ChartCard>
                  </div>

                  {priceRangeData.length > 0 && (
                    <ChartCard title="Price Range Distribution">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={priceRangeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#86868B' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#86868B' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Listings" fill={ACCENT} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {regionData.length > 0 && (
                    <ChartCard title="Region Distribution (top 12)">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={regionData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#86868B' }} />
                          <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: '#1D1D1F' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Listings" fill="#1D1D1F" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  <ChartCard title="Usage by Hour of Day">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#86868B' }} interval={2} />
                        <YAxis tick={{ fontSize: 11, fill: '#86868B' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="count" name="Listings" stroke={ACCENT} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </>
              )
            }
          </>
        )}

        {/* ── Engagement ── */}
        {activeTab === 'engagement' && (
          <>
            <SectionTitle>Engagement Analytics</SectionTitle>

            <div className={styles.kpiRow}>
              <KpiCard label="AI Revise Usage Rate"     value={`${engagementStats.reviseRate}%`} sub="listings with revise" accent />
              <KpiCard label="Avg Revisions / Listing"  value={engagementStats.avgRevise}        sub="AI revise calls" />
              <KpiCard label="Total AI Revisions"       value={engagementStats.totalRevises}     sub="in period" />
              <KpiCard label="Listings with Revisions"  value={engagementStats.withRevise}       sub="unique listings" />
            </div>

            {/* Session stats (shows when data exists) */}
            {sessionStats ? (
              <>
                <SectionTitle>Session Analytics</SectionTitle>
                <div className={styles.kpiRow}>
                  <KpiCard label="Avg Time in App"         value={sessionStats.avgTimeInApp} sub={`${sessionStats.sessionCount} sessions`} />
                  <KpiCard label="Avg Time After Gen"      value={sessionStats.avgAfterGen}  sub="generation → exit" />
                  <KpiCard label="Exit ≤60s Rate"          value={sessionStats.exitFastRate} sub="quick copy & exit" accent />
                  <KpiCard label="Exit ≥5min Rate"         value={sessionStats.exitSlowRate} sub="long editing sessions" />
                </div>
                <ChartCard title="Avg Session Duration by Hour (seconds)">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={sessionStats.hourlySession}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#86868B' }} interval={2} />
                      <YAxis tick={{ fontSize: 11, fill: '#86868B' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="avg" name="Avg duration (s)" stroke="#1D1D1F" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </>
            ) : (
              <div className={styles.sessionNote}>
                Session tracking data will appear here once <code>session_start</code>, <code>generation_time</code>, and <code>session_end</code> columns are populated in the listings table.
              </div>
            )}

            {engagementStats.sectionRates.some(r => r.count > 0) ? (
              <ChartCard title="Section Copy Rate">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={engagementStats.sectionRates}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#86868B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#86868B' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Copies" fill={ACCENT} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : <EmptyState message="No copy events yet" />}

            <div className={styles.tableHeader} style={{ marginTop: 32 }}>
              <p className={styles.chartTitle}>Top Revise Keywords</p>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>#</th><th>Keyword</th><th>Count</th></tr></thead>
                <tbody>
                  {engagementStats.topKeywords.length > 0
                    ? engagementStats.topKeywords.map((k, i) => (
                        <tr key={k.word}>
                          <td className={styles.rankCell}>{i + 1}</td>
                          <td className={styles.nameCell}>{k.word}</td>
                          <td className={styles.countCell}>{k.count}</td>
                        </tr>
                      ))
                    : <tr><td colSpan={3} className={styles.emptyRow}>No revise data yet</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Revisions ── */}
        {activeTab === 'revisions' && (
          <>
            <SectionTitle>Revision Analytics</SectionTitle>

            <div className={styles.kpiRow}>
              <KpiCard label="Total Revisions"       value={revisionsData.totalRevisions}   sub="in period" />
              <KpiCard label="Avg Revisions / User"  value={revisionsData.avgPerUser}        sub="users with listings" accent />
              <KpiCard label="Unique Prompts"        value={revisionsData.topPrompts.length} sub="distinct requests" />
              <KpiCard label="Total Prompts"         value={revisionsData.allPrompts.length} sub="all requests" />
            </div>

            <div className={styles.tableHeader}>
              <p className={styles.chartTitle}>Top 10 Revision Prompts</p>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>#</th><th>Prompt</th><th>Count</th></tr></thead>
                <tbody>
                  {revisionsData.topPrompts.length > 0
                    ? revisionsData.topPrompts.map((p, i) => (
                        <tr key={i}>
                          <td className={styles.rankCell}>{i + 1}</td>
                          <td className={styles.promptCell}>{p.text}</td>
                          <td className={styles.countCell}>{p.count}</td>
                        </tr>
                      ))
                    : <tr><td colSpan={3} className={styles.emptyRow}>No revision prompts yet</td></tr>
                  }
                </tbody>
              </table>
            </div>

            <div className={styles.tableHeader} style={{ marginTop: 32 }}>
              <p className={styles.chartTitle}>Top Users by Revisions</p>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>#</th><th>User</th><th>Total Revisions</th></tr></thead>
                <tbody>
                  {revisionsData.userLeaderboard.length > 0
                    ? revisionsData.userLeaderboard.map((u, i) => (
                        <tr key={u.userId}>
                          <td className={styles.rankCell}>{i + 1}</td>
                          <td className={styles.nameCell}>{u.name}</td>
                          <td className={styles.countCell}>{u.count}</td>
                        </tr>
                      ))
                    : <tr><td colSpan={3} className={styles.emptyRow}>No data yet</td></tr>
                  }
                </tbody>
              </table>
            </div>

            {engagementStats.topKeywords.length > 0 && (
              <ChartCard title="Revision Keyword Frequency">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={engagementStats.topKeywords.map(k => ({ name: k.word, count: k.count }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#86868B' }} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#1D1D1F' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Frequency" fill={ACCENT} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </>
        )}

        {/* ── Feedback ── */}
        {activeTab === 'feedback' && (
          <>
            <SectionTitle>Feedback</SectionTitle>
            <EmptyState message="No feedback yet. Feedback will appear here once the feature is enabled." />
          </>
        )}

      </main>
    </div>
  )
}
