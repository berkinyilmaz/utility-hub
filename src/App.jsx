import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PROJECTS, CATEGORIES } from './projects.js'
import './styles.css'

const GITHUB_PROFILE = 'https://github.com/berkinyilmaz'
const INSTAGRAM_PROFILE = 'https://instagram.com/berkindev'
const WEBSITE_URL = 'https://berkindev.tech/'

const STARS_CACHE_KEY = 'utility-hub:stars-v2'
const STARS_TTL_MS = 60 * 60 * 1000
const RECENTS_KEY = 'utility-hub:recents-v1'
const MAX_RECENTS = 3

const SORT_OPTIONS = [
  { id: 'featured', label: 'Default' },
  { id: 'stars', label: 'Most Starred' },
  { id: 'az', label: 'A → Z' },
  { id: 'newest', label: 'Newest' },
]

const FEATURED_FALLBACK = [
  'pomodoro-app',
  'timestamp-converter',
  'bg-remover',
  'markdown-preview',
  'qr-generator',
  'json-formatter',
]

function repoNameOf(project) {
  return project.repo.split('/').pop().toLowerCase()
}

function readFromUrl() {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  return {
    q: params.get('q') || '',
    c: params.get('c') || 'all',
    mode: params.get('mode') === 'featured' ? 'featured' : 'all',
    sort: SORT_OPTIONS.some(s => s.id === params.get('sort')) ? params.get('sort') : 'featured',
  }
}

export default function App() {
  const initial = readFromUrl()
  const [query, setQuery] = useState(initial.q)
  const [activeCategory, setActiveCategory] = useState(initial.c)
  const [mode, setMode] = useState(initial.mode)
  const [sort, setSort] = useState(initial.sort)
  const [stars, setStars] = useState({})
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENTS_KEY)) || [] } catch { return [] }
  })
  const searchRef = useRef(null)

  /* ───── GitHub stars — stale-while-revalidate ───── */
  useEffect(() => {
    let cancelled = false
    // 1) cache varsa anında göster (sort'lar gecikmesin)
    try {
      const cached = JSON.parse(localStorage.getItem(STARS_CACHE_KEY))
      if (cached?.stars) setStars(cached.stars)
      // cache tazeyse fetch'i atla
      if (cached && Date.now() - cached.fetchedAt < STARS_TTL_MS) return
    } catch {}

    // 2) arka planda her durumda fresh fetch
    fetch('https://api.github.com/search/repositories?q=user:berkinyilmaz+fork:false&per_page=100&sort=stars')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data?.items) return
        const map = {}
        for (const repo of data.items) map[repo.name.toLowerCase()] = repo.stargazers_count
        setStars(map)
        try {
          localStorage.setItem(STARS_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), stars: map }))
        } catch {}
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  /* ───── URL state sync ───── */
  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (activeCategory !== 'all') params.set('c', activeCategory)
    if (mode !== 'all') params.set('mode', mode)
    if (sort !== 'featured') params.set('sort', sort)
    const str = params.toString()
    const next = `${window.location.pathname}${str ? '?' + str : ''}`
    if (window.location.pathname + window.location.search !== next) {
      window.history.replaceState({}, '', next)
    }
  }, [query, activeCategory, mode, sort])

  useEffect(() => {
    const onPop = () => {
      const s = readFromUrl()
      setQuery(s.q); setActiveCategory(s.c); setMode(s.mode); setSort(s.sort)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  /* ───── Keyboard shortcuts ───── */
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement
      const typing = el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape' && el === searchRef.current) {
        setQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ───── Derived lists ───── */
  const featuredList = useMemo(() => {
    const pomodoro = PROJECTS.find(p => p.id === 'pomodoro-app')
    const others = PROJECTS.filter(p => p.id !== 'pomodoro-app')
    const haveStars = Object.keys(stars).length > 0
    let picks
    if (haveStars) {
      picks = [...others]
        .map(p => ({ p, s: stars[repoNameOf(p)] ?? 0 }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 5)
        .map(x => x.p)
    } else {
      picks = FEATURED_FALLBACK
        .filter(id => id !== 'pomodoro-app')
        .map(id => PROJECTS.find(p => p.id === id))
        .filter(Boolean)
    }
    return [pomodoro, ...picks].filter(Boolean)
  }, [stars])

  const source = mode === 'featured' ? featuredList : PROJECTS

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = source.filter(p => {
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory
      if (!matchesCategory) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        String(p.day).includes(q)
      )
    })

    if (sort === 'az') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    } else if (sort === 'newest') {
      list = [...list].sort((a, b) => b.day - a.day)
    } else if (sort === 'stars') {
      list = [...list].sort((a, b) => (stars[repoNameOf(b)] ?? -1) - (stars[repoNameOf(a)] ?? -1))
    }
    return list
  }, [source, query, activeCategory, sort, stars])

  const counts = useMemo(() => {
    const map = { all: PROJECTS.length }
    for (const p of PROJECTS) map[p.category] = (map[p.category] || 0) + 1
    return map
  }, [])

  const recentProjects = useMemo(
    () => recents.map(id => PROJECTS.find(p => p.id === id)).filter(Boolean),
    [recents]
  )

  /* ───── Actions ───── */
  const trackOpen = useCallback((id) => {
    setRecents(prev => {
      const next = [id, ...prev.filter(r => r !== id)].slice(0, MAX_RECENTS)
      try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const handleClearFilters = () => {
    setQuery('')
    setActiveCategory('all')
    setSort('featured')
  }

  const handleSurprise = () => {
    if (filtered.length === 0) return
    const pick = filtered[Math.floor(Math.random() * filtered.length)]
    trackOpen(pick.id)
    window.open(pick.demo, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <div className="logo-mark" aria-hidden="true">
              <IconHub />
            </div>
            <h1 className="header-title">Utility Hub</h1>
          </div>
          <div className="header-right">
            <a
              className="btn-ghost"
              href={WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open berkindev.tech"
            >
              <IconLink />
              <span>Website</span>
            </a>
            <a
              className="btn-ghost"
              href={INSTAGRAM_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Instagram profile"
            >
              <IconInstagram />
              <span>Instagram</span>
            </a>
            <a
              className="btn-ghost"
              href={GITHUB_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open GitHub profile"
            >
              <IconGithub />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h2 className="hero-title">Everything you need, one link.</h2>
          <p className="hero-sub">
            A central hub for the entire series. Browse, filter, and open any tool in a new tab —
            instantly, with no setup.
          </p>
        </section>

        <div className="mode-toggle" role="tablist" aria-label="View mode">
          <button
            role="tab"
            aria-selected={mode === 'featured'}
            className={`mode-btn${mode === 'featured' ? ' mode-active' : ''}`}
            onClick={() => setMode('featured')}
          >
            <IconStar />
            Featured
          </button>
          <button
            role="tab"
            aria-selected={mode === 'all'}
            className={`mode-btn${mode === 'all' ? ' mode-active' : ''}`}
            onClick={() => setMode('all')}
          >
            All
            <span className="mode-count">{PROJECTS.length}</span>
          </button>
        </div>

        {mode === 'all' && recentProjects.length > 0 && (
          <section className="recents" aria-label="Recently opened">
            <div className="recents-label">
              <IconHistory />
              Recently opened
            </div>
            <div className="recents-list">
              {recentProjects.map(p => (
                <a
                  key={p.id}
                  className="recent-pill"
                  href={p.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackOpen(p.id)}
                >
                  <CategoryIcon category={p.category} />
                  {p.name}
                </a>
              ))}
            </div>
          </section>
        )}

        {mode === 'all' && (
          <div className="toolbar">
            <div className="search-row">
              <div className="search">
                <IconSearch />
                <input
                  ref={searchRef}
                  type="text"
                  className="search-input"
                  placeholder='Search 30 tools…   "/" to focus'
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="Search tools"
                />
                {query && (
                  <button
                    className="search-clear"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <IconClose />
                  </button>
                )}
              </div>
              <button
                className="btn-icon"
                onClick={handleSurprise}
                aria-label="Surprise me — open a random tool"
                title="Surprise me"
              >
                <IconDice />
              </button>
            </div>

            <div className="filters-row">
              <div className="chips" role="tablist" aria-label="Filter by category">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={activeCategory === cat.id}
                    className={`chip${activeCategory === cat.id ? ' chip-active' : ''}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.label}
                    <span className="chip-count">{counts[cat.id] ?? 0}</span>
                  </button>
                ))}
              </div>
              <div className="sort-wrap">
                <label className="sort-label" htmlFor="sort-select">Sort</label>
                <div className="sort-control">
                  <select
                    id="sort-select"
                    className="sort-select"
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                  <IconChevron />
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'featured' && (
          <div className="featured-caption">
            Top picks · curated 6
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-art" aria-hidden="true">
              <svg width="68" height="68" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="34" cy="34" r="20" />
                <path d="M50 50l16 16" />
                <path d="M27 34h14M34 27v14" opacity="0.35" />
              </svg>
            </div>
            <p className="empty-title">No tools match.</p>
            <p className="empty-sub">Try a different keyword or clear the filters.</p>
            <button className="btn-primary" onClick={handleClearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid">
            {filtered.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                query={query}
                stars={stars[repoNameOf(p)]}
                onOpen={() => trackOpen(p.id)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="credit">
        Coded by{' '}
        <a
          href="https://instagram.com/berkindev"
          target="_blank"
          rel="noopener noreferrer"
          className="credit-link"
        >
          berkindev
        </a>
      </footer>
    </div>
  )
}

function ProjectCard({ project, query, stars, onOpen }) {
  const categoryLabel = CATEGORIES.find(c => c.id === project.category)?.label ?? project.category
  return (
    <article className="card">
      <a
        href={project.demo}
        target="_blank"
        rel="noopener noreferrer"
        className="card-link"
        aria-label={`Open ${project.name}`}
        onClick={onOpen}
      >
        <div className="card-top">
          <span className="card-badge" data-category={project.category}>
            <CategoryIcon category={project.category} />
            {categoryLabel}
          </span>
          <div className="card-meta">
            {typeof stars === 'number' && (
              <span className="card-stars" title={`${stars} GitHub stars`}>
                <IconStarFilled />
                {stars}
              </span>
            )}
            {project.isNew && <span className="card-new">New</span>}
          </div>
        </div>

        <h3 className="card-title">
          <Highlight text={project.name} query={query} />
        </h3>
        <p className="card-blurb">
          <Highlight text={project.blurb} query={query} />
        </p>
      </a>

      <div className="card-actions">
        <a
          href={project.demo}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary card-btn"
          onClick={onOpen}
        >
          Open
          <IconArrow />
        </a>
        <a
          href={project.repo}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost card-btn"
          aria-label={`View ${project.name} source code on GitHub`}
        >
          <IconGithub />
          Code
        </a>
      </div>
    </article>
  )
}

function Highlight({ text, query }) {
  const q = (query || '').trim()
  if (!q) return text
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const parts = []
  let i = 0
  while (i < text.length) {
    const idx = lower.indexOf(needle, i)
    if (idx === -1) {
      parts.push(text.slice(i))
      break
    }
    if (idx > i) parts.push(text.slice(i, idx))
    parts.push(<mark key={idx} className="hl">{text.slice(idx, idx + needle.length)}</mark>)
    i = idx + needle.length
  }
  return <>{parts}</>
}

function CategoryIcon({ category }) {
  switch (category) {
    case 'image': return <IconImage />
    case 'pdf': return <IconFile />
    case 'text': return <IconText />
    case 'generator': return <IconSparkles />
    case 'time': return <IconClock />
    case 'productivity': return <IconCheck />
    case 'web': return <IconGlobe />
    default: return null
  }
}

/* ───── Icons (thin-line, stroke 1.6) ───── */

function IconHub() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.4" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.4" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.4" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.4" />
    </svg>
  )
}

function IconGithub() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 .2a8 8 0 00-2.53 15.58c.4.08.55-.17.55-.38v-1.33c-2.23.48-2.7-1.08-2.7-1.08-.36-.93-.89-1.18-.89-1.18-.73-.5.06-.49.06-.49.8.06 1.22.83 1.22.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.65-.89-3.65-3.96 0-.88.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.08-1.87 3.76-3.66 3.96.29.25.54.74.54 1.49v2.2c0 .21.15.46.55.38A8 8 0 008 .2z"/>
    </svg>
  )
}

function IconLink() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 9.5a2.5 2.5 0 003.54 0l2-2a2.5 2.5 0 00-3.54-3.54l-.5.5" />
      <path d="M9 6.5a2.5 2.5 0 00-3.54 0l-2 2a2.5 2.5 0 003.54 3.54l.5-.5" />
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="3" />
      <circle cx="8" cy="8" r="2.6" />
      <circle cx="11.4" cy="4.6" r="0.55" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 11L11 5M6 5h5v5" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2l1.85 3.95L14 6.6l-3 2.9.7 4.1L8 11.7 4.3 13.6 5 9.5l-3-2.9 4.15-.65L8 2z" />
    </svg>
  )
}

function IconStarFilled() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 2l1.85 3.95L14 6.6l-3 2.9.7 4.1L8 11.7 4.3 13.6 5 9.5l-3-2.9 4.15-.65L8 2z" />
    </svg>
  )
}

function IconDice() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.4" />
      <circle cx="5.5" cy="5.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 8a6 6 0 1 0 1.8-4.3" />
      <path d="M2 3v3h3" />
      <path d="M8 5v3.2L10.2 10" />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg width="9" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M1 1l4 4 4-4" />
    </svg>
  )
}

function IconImage() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <circle cx="6" cy="6.5" r="1.2" />
      <path d="M14 11l-3.5-3.5L4 13.5" />
    </svg>
  )
}

function IconFile() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2h5l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M9 2v3h3" />
    </svg>
  )
}

function IconText() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M3 4h10M3 8h10M3 12h7" />
    </svg>
  )
}

function IconSparkles() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2.5l1.2 3 3 1.2-3 1.2L8 11l-1.2-3.1-3-1.2 3-1.2L8 2.5z" />
      <path d="M12.5 11l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.4 1.6" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="M5.5 8.5l2 2 3.5-4" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c1.8 2.2 1.8 9.8 0 12M8 2c-1.8 2.2-1.8 9.8 0 12" />
    </svg>
  )
}
