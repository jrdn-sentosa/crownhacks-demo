import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { supabase, missingVars } from './supabase.js'

// Optional backend URL. If it's not set, the footer simply doesn't show.
const API_URL = import.meta.env.VITE_API_URL

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

export default function App() {
  const [posts, setPosts] = useState([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('') // shown in a red box so problems are easy to see
  const [apiMessage, setApiMessage] = useState('') // response from the backend footer
  const [qr, setQr] = useState('') // QR code image (data URL) while the overlay is open
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

  // Show a big QR code of this page's URL so the audience can scan and test it.
  async function showQr() {
    setQr(await QRCode.toDataURL(window.location.href, { width: 600, margin: 2 }))
  }

  return (
    <div className="page">
      <header>
        <div className="header-row">
          <div className="brand">
            <img className="logo" src="/crown.svg" alt="" />
            <h1>CrownHacks Shoutouts</h1>
          </div>
          <button type="button" className="secondary" onClick={showQr}>
            Show QR code
          </button>
        </div>
        <p className="subtitle">Deployed live at the ACM @ UNCC workshop</p>
      </header>

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

      <div className="feed-heading">
        <h2>Shoutouts · {posts.length}</h2>
      </div>

      <section>
        {posts.length === 0 && (
          <p className="empty">No shoutouts yet (or Row Level Security is hiding them 👀)</p>
        )}
        {posts.map((post) => (
          <article className={`card post${newIds.includes(post.id) ? ' post-new' : ''}`} key={post.id}>
            <div className="post-top">
              <strong>{post.name}</strong>
              <span className="time">{timeAgo(post.created_at)}</span>
            </div>
            <p>{post.message}</p>
          </article>
        ))}
      </section>

      {qr && (
        <div className="qr-overlay" onClick={() => setQr('')}>
          <img src={qr} alt="QR code linking to this page" />
          <p>{window.location.href}</p>
          <p>Scan to post a shoutout! (click anywhere to close)</p>
        </div>
      )}

      {API_URL && <footer>{apiMessage}</footer>}
    </div>
  )
}
