import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './styles.css'

const Icon = ({ path, size=22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
)

const icons = {
  design: "M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7l3-7z",
  elements: "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z",
  text: "M4 7V4h16v3h-6v13h-4V7H4z",
  uploads: "M12 5l4 4h-3v6h-2V9H8l4-4zm-7 12h14v2H5v-2z",
  tools: "M12 2l2 3-2 3-2-3 2-3zm8 10l-3 2-3-2 3-2 3 2zM7 12l-3 2-3-2 3-2 3 2zm5 10l-2-3 2-3 2 3-2 3z",
  projects: "M3 7l9-4 9 4v10l-9 4-9-4V7zm9 2l7-3M12 9l-7-3",
  undo: "M3 7v6h6M3 13a9 9 0 1 0 3-6",
  redo: "M21 7v6h-6M21 13a9 9 0 1 1-3-6",
  download: "M12 3v12m0 0l4-4m-4 4l-4-4M5 21h14",
  share: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13",
  chevron: "M8 9l4 4 4-4"
}

function useHistory(initial) {
  const [past, setPast] = useState([])
  const [present, setPresent] = useState(initial)
  const [future, setFuture] = useState([])

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  const commit = useCallback((next) => {
    setPast(p => [...p, present])
    setPresent(next)
    setFuture([])
  }, [present])

  const undo = useCallback(() => {
    setPast(p => {
      if (p.length === 0) return p
      const prev = p[p.length - 1]
      setFuture(f => [present, ...f])
      setPresent(prev)
      return p.slice(0, -1)
    })
  }, [present])

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f
      const [next, ...rest] = f
      setPast(p => [...p, present])
      setPresent(next)
      return rest
    })
  }, [present])

  return { past, present, future, canUndo, canRedo, commit, undo, redo, setPresent }
}

export default function App() {
  const canvasRef = useRef(null)
  const imgRef = useRef(new Image())
  const fileRef = useRef(null)

  const [mode, setMode] = useState('Photo')
  const [activeTab, setActiveTab] = useState('tools')
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [zoom, setZoom] = useState(100)

  const initialState = useMemo(()=> ({
    size: { w: 0, h: 0 },
    natural: { w: 0, h: 0 },
    filters: { brightness:0, contrast:0, saturation:0, hue:0, warm:0, cool:0, blur:0 },
    imageLoaded: false,
    imageURL: null
  }), [])

  const { present, commit, undo, redo, canUndo, canRedo } = useHistory(initialState)

  const imageLoaded = present.imageLoaded
  const size = present.size
  const natural = present.natural
  const f = present.filters

  const handleFile = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = imgRef.current
    img.onload = () => {
      const next = {
        ...present,
        imageLoaded: true,
        imageURL: url,
        natural: { w: img.naturalWidth, h: img.naturalHeight },
        size: { w: img.naturalWidth, h: img.naturalHeight }
      }
      commit(next)
    }
    img.src = url
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !present.imageLoaded) return

    canvas.width = Math.max(1, Math.floor(size.w || img.naturalWidth))
    canvas.height = Math.max(1, Math.floor(size.h || img.naturalHeight))

    const ctx = canvas.getContext('2d')
    const b = (f.brightness ?? 0) + 100
    const c = (f.contrast ?? 0) + 100
    const s = (f.saturation ?? 0) + 100
    const h = f.hue ?? 0
    const blurPx = Math.max(0, f.blur ?? 0)
    const sep = Math.max(0, f.warm ?? 0)
    const inv = Math.max(0, f.cool ?? 0)
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg) sepia(${sep}%) invert(${inv}%) blur(${blurPx}px)`

    ctx.clearRect(0,0,canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }, [present, size.w, size.h, f.brightness, f.contrast, f.saturation, f.hue, f.blur, f.warm, f.cool])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    const onKey = (e) => {
      const cmd = e.metaKey || e.ctrlKey
      if (cmd && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) { if (canRedo) redo() }
        else { if (canUndo) undo() }
      } else if (cmd && (e.key.toLowerCase() === 'y')) {
        e.preventDefault()
        if (canRedo) redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, canUndo, canRedo])

  const updateFilter = (key, value) => {
    commit({ ...present, filters: { ...present.filters, [key]: value } })
  }
  const updateSize = (partial) => {
    commit({ ...present, size: { ...present.size, ...partial } })
  }
  const resetAll = () => {
    commit({ ...present, filters: { brightness:0, contrast:0, saturation:0, hue:0, warm:0, cool:0, blur:0 }, size: { ...present.natural } })
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'edited-image.png'
    a.click()
  }

  const zoomScale = useMemo(()=> Math.max(0.25, Math.min(2, zoom / 100)), [zoom])

  return (
    <div className="app">
      <div className="topbar">
        <div className="menu">
          <button className="btn">File</button>
          <button className="btn" onClick={()=> { setActiveTab('tools'); setDrawerOpen(true); }}>Resize</button>
          <div className="btn" style={{display:'flex', alignItems:'center', gap:6}}>
            <span>Editing</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={icons.chevron} />
            </svg>
            <select
              value={mode}
              onChange={(e)=> setMode(e.target.value)}
              style={{background:'transparent', color:'var(--text)', border:'none', outline:'none', cursor:'pointer'}}
            >
              <option>Photo</option>
              <option>Design</option>
              <option>Presentation</option>
              <option>Video</option>
            </select>
          </div>

          <button className="btn" disabled={!canUndo} onClick={undo} title="Undo (Ctrl/Cmd+Z)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={icons.undo} />
            </svg>
          </button>
          <button className="btn" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Y or Cmd+Shift+Z)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={icons.redo} />
            </svg>
          </button>
        </div>

        <div className="title">AVNAC — Photo Editor</div>

        <div className="actions">
          <button className="btn" onClick={()=> fileRef.current?.click()}>Upload</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} />
          <button className="btn brand" onClick={download}>Download</button>
          <button className="btn">Share</button>
        </div>
      </div>

      <div className="content">
        <div className="rail">
          <button className={activeTab==='design'?'active':''} onClick={()=> { setActiveTab('design'); setDrawerOpen(true); }} title="Design"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={icons.design}/></svg></button>
          <button className={activeTab==='elements'?'active':''} onClick={()=> { setActiveTab('elements'); setDrawerOpen(true); }} title="Elements"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={icons.elements}/></svg></button>
          <button className={activeTab==='text'?'active':''} onClick={()=> { setActiveTab('text'); setDrawerOpen(true); }} title="Text"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={icons.text}/></svg></button>
          <button className={activeTab==='uploads'?'active':''} onClick={()=> { setActiveTab('uploads'); setDrawerOpen(true); }} title="Uploads"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={icons.uploads}/></svg></button>
          <button className={activeTab==='tools'?'active':''} onClick={()=> { setActiveTab('tools'); setDrawerOpen(v=>!v); }} title="Tools"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={icons.tools}/></svg></button>
          <button className={activeTab==='projects'?'active':''} onClick={()=> { setActiveTab('projects'); setDrawerOpen(true); }} title="Projects"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={icons.projects}/></svg></button>
        </div>

        <div className="editor">
          <div className="canvas-wrap" style={{ transform:`scale(${zoomScale})`, transformOrigin:'center center' }}>
            {present.imageLoaded
              ? <canvas ref={canvasRef} />
              : <div className="muted">Upload an image to start editing</div>
            }
          </div>

          <div className={"tools-drawer " + (drawerOpen && activeTab==='tools' ? 'open' : '')}>
            <header>
              <strong>Tools</strong>
              <button className="btn" onClick={()=> setDrawerOpen(false)}>Close</button>
            </header>
            <div className="drawer-content">
              <div className="group">
                <h3>Resize</h3>
                <div className="row">
                  <label>Width (px)</label>
                  <input type="number" min="1" value={size.w}
                    onChange={(e)=> updateSize({ w: Math.max(1, Number(e.target.value)||1) })} />
                </div>
                <div className="row">
                  <label>Height (px)</label>
                  <input type="number" min="1" value={size.h}
                    onChange={(e)=> updateSize({ h: Math.max(1, Number(e.target.value)||1) })} />
                </div>
                <div className="row">
                  <label>Natural</label>
                  <div className="muted">{natural.w} × {natural.h}</div>
                </div>
              </div>

              <div className="group">
                <h3>Tone</h3>
                <div className="row">
                  <label>Brightness ({f.brightness})</label>
                  <input type="range" min="-100" max="100" value={f.brightness}
                    onChange={(e)=> updateFilter('brightness', Number(e.target.value))} />
                </div>
                <div className="row">
                  <label>Contrast ({f.contrast})</label>
                  <input type="range" min="-100" max="100" value={f.contrast}
                    onChange={(e)=> updateFilter('contrast', Number(e.target.value))} />
                </div>
                <div className="row">
                  <label>Saturation ({f.saturation})</label>
                  <input type="range" min="-100" max="100" value={f.saturation}
                    onChange={(e)=> updateFilter('saturation', Number(e.target.value))} />
                </div>
              </div>

              <div className="group">
                <h3>Color</h3>
                <div className="row">
                  <label>Hue ({f.hue}°)</label>
                  <input type="range" min="-180" max="180" value={f.hue}
                    onChange={(e)=> updateFilter('hue', Number(e.target.value))} />
                </div>
                <div className="row">
                  <label>Warm (sepia) ({f.warm})</label>
                  <input type="range" min="0" max="100" value={f.warm}
                    onChange={(e)=> updateFilter('warm', Number(e.target.value))} />
                </div>
                <div className="row">
                  <label>Cool (invert) ({f.cool})</label>
                  <input type="range" min="0" max="100" value={f.cool}
                    onChange={(e)=> updateFilter('cool', Number(e.target.value))} />
                </div>
              </div>

              <div className="group">
                <h3>Effects</h3>
                <div className="row">
                  <label>Blur ({f.blur}px)</label>
                  <input type="range" min="0" max="20" value={f.blur}
                    onChange={(e)=> updateFilter('blur', Number(e.target.value))} />
                </div>
              </div>
            </div>
            <footer>
              <button className="btn" onClick={resetAll}>Reset All</button>
              <div style={{display:'flex', gap:8}}>
                <button className="btn" onClick={()=> fileRef.current?.click()}>Upload</button>
                <button className="btn brand" onClick={()=> { /* live commit already applies */ }}>Apply</button>
              </div>
            </footer>
          </div>
        </div>
      </div>

      <div className="bottombar">
        <div className="zoom">
          <span className="muted">Zoom</span>
          <input type="range" min="25" max="200" step="5" value={zoom} onChange={(e)=> setZoom(Number(e.target.value))} />
        </div>
        <div className="muted">{zoom}%</div>
        <div className="muted">Pages 1/1</div>
        <div className="muted">© AVNAC</div>
      </div>
    </div>
  )
}