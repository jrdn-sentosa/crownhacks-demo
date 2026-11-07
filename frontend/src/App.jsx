import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { supabase, missingVars } from './supabase.js'

// Optional backend URL. If it's not set, the footer simply doesn't show.
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')

// Turn a timestamp into "5m ago", "2h ago", etc.
function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Projector view: open the app with ?present in the URL.
const PRESENT = new URLSearchParams(location.search).has('present')
const PRESENT_POSTS = 6 // how many posts the projector view shows

// The app's URL without ?present, so the QR code sends people to the normal page.
function plainUrl() {
  const url = new URL(location.href)
  url.searchParams.delete('present')
  url.hash = ''
  return url.toString()
}

// Which phone are we on? (iPadOS reports as a Mac, so check touch points too.)
const IS_IOS =
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const IS_ANDROID = /android/i.test(navigator.userAgent)
const IS_STANDALONE =
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

// Small "add to home screen" guide for phones, with steps for iOS or Android.
function InstallGuide() {
  const [hidden, setHidden] = useState(() => localStorage.getItem('hideInstall') === '1')
  const [installEvent, setInstallEvent] = useState(null) // Android Chrome's install prompt

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault() // keep it so our button can trigger it
      setInstallEvent(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (hidden || IS_STANDALONE || !(IS_IOS || IS_ANDROID)) return null

  function dismiss() {
    localStorage.setItem('hideInstall', '1')
    setHidden(true)
  }

  async function install() {
    installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
    dismiss()
  }

  return (
    <div className="install-guide">
      <div className="install-top">
        <strong>📲 Add to your home screen</strong>
        <button type="button" className="secondary" onClick={dismiss}>
          Dismiss
        </button>
      </div>
      {IS_IOS ? (
        <ol>
          <li>Tap the <b>Share</b> button (square with an arrow ⬆️)</li>
          <li>Scroll down and tap <b>Add to Home Screen</b></li>
          <li>Tap <b>Add</b></li>
        </ol>
      ) : installEvent ? (
        <button type="button" onClick={install}>
          Install app
        </button>
      ) : (
        <ol>
          <li>Open this page in <b>Chrome</b></li>
          <li>Tap the <b>⋮</b> menu (top right)</li>
          <li>Tap <b>Add to Home screen</b> (or <b>Install app</b>)</li>
          <li>Tap <b>Install</b> / <b>Add</b></li>
        </ol>
      )}
    </div>
  )
}

export default function App() {
  const [presentQr, setPresentQr] = useState('') // QR image for the projector view
  const [posts, setPosts] = useState([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('') // shown in a red box so problems are easy to see
  const [apiMessage, setApiMessage] = useState('') // response from the backend footer
  const [posting, setPosting] = useState(false) // true while a post is being saved
  const [newIds, setNewIds] = useState([]) // ids of posts that just appeared (briefly highlighted)
  const knownIds = useRef(null) // ids we've already seen; null until the first load finishes
  const nameInput = useRef(null)

  // Load all shoutouts, newest first.
  async function loadPosts() {
    if (!supabase) return // env vars missing: the red box below explains it
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }

    // Highlight posts we haven't seen before (but not the whole list on first load).
    if (knownIds.current) {
      const fresh = data.filter((p) => !knownIds.current.has(p.id)).map((p) => p.id)
      if (fresh.length > 0) {
        setNewIds(fresh)
        setTimeout(() => setNewIds([]), 1200)
      }
    }
    knownIds.current = new Set(data.map((p) => p.id))
    setPosts(data)
  }

  // Run once when the page loads.
  useEffect(() => {
    loadPosts()

    // Footer: only call the backend if VITE_API_URL is set.
    if (API_URL) {
      fetch(`${API_URL}/api/hello`)
        .then((res) => res.json())
        .then((json) => setApiMessage(json.message))
        .catch((err) => setApiMessage(`Backend error: ${err.message}`))
    }
  }, [])

  // Auto-refresh every 5 seconds, but only while the tab is visible.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) loadPosts()
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // Projector view: make the big QR code once, and let F toggle fullscreen.
  useEffect(() => {
    if (!PRESENT) return
    QRCode.toDataURL(plainUrl(), { width: 800, margin: 1 }).then(setPresentQr)

    function onKey(e) {
      if (e.key !== 'f' && e.key !== 'F') return
      if (document.fullscreenElement) document.exitFullscreen()
      else document.documentElement.requestFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Save a new shoutout, then reload the list.
  async function handleSubmit(event) {
    event.preventDefault() // stop the page from refreshing
    setError('')
    if (!supabase) return

    setPosting(true)
    const { error } = await supabase.from('posts').insert({ name, message })
    setPosting(false)

    if (error) {
      setError(error.message)
      return
    }
    setName('')
    setMessage('')
    nameInput.current?.focus()
    loadPosts()
  }

  const shownPosts = PRESENT ? posts.slice(0, PRESENT_POSTS) : posts

  return (
    <div className={`page${PRESENT ? ' present' : ''}`}>
      {/* Shown when the Supabase env vars aren't set */}
      {missingVars.length > 0 && (
        <div className="error-box">
          Missing VITE_SUPABASE_URL / VITE_SUPABASE_KEY. Add them in Vercel → Settings →
          Environment Variables, then redeploy.
          <br />
          Currently missing: {missingVars.join(', ')}
        </div>
      )}

      {/* Any Supabase error shows up here */}
      {error && <div className="error-box">⚠️ {error}</div>}

      <div className="layout">
        <div className="col-left">
          <header>
            <div className="header-row">
              <div className="brand">
                <img className="logo" src="/crown.svg" alt="" />
                <h1>CrownHacks Shoutouts</h1>
              </div>
            </div>
            {!PRESENT && <p className="subtitle">Deployed live at the ACM @ UNCC workshop</p>}
          </header>

          {PRESENT && (
            <div className="present-qr">
              {presentQr && <img src={presentQr} alt="QR code to open the app" />}
              <p className="scan-text">Scan to post a shoutout</p>
              <p className="host-text">{location.host}</p>
            </div>
          )}

          {!PRESENT && <InstallGuide />}

          {!PRESENT && (
            <form className="card" onSubmit={handleSubmit}>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                ref={nameInput}
                type="text"
                placeholder="Your name"
                maxLength={32}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <label htmlFor="message">Shoutout</label>
              <textarea
                id="message"
                placeholder="Your shoutout (max 140 characters)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={140}
                rows={3}
                required
              />
              <div className="form-row">
                <span
                  className={`counter ${message.length >= 140 ? 'full' : message.length >= 120 ? 'warn' : ''}`}
                >
                  {message.length}/140
                </span>
                <button type="submit" disabled={posting || !name.trim() || !message.trim()}>
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="col-right">
          <div className="feed-heading">
            <h2>Shoutouts · {posts.length}</h2>
          </div>

          <section className="feed">
            {posts.length === 0 && (
              <p className="empty">No shoutouts yet (or Row Level Security is hiding them 👀)</p>
            )}
            {shownPosts.map((post) => (
              <article
                className={`card post${newIds.includes(post.id) ? ' post-new' : ''}`}
                key={post.id}
              >
                <div className="post-top">
                  <strong>{post.name}</strong>
                  <span className="time">{timeAgo(post.created_at)}</span>
                </div>
                <p>{post.message}</p>
              </article>
            ))}
          </section>
        </div>
      </div>

      {!PRESENT && API_URL && <footer>{apiMessage}</footer>}
    </div>
  )
}
