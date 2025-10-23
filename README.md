# AVNAC — Photo Editor (Canva-style, Vite + React)

Canva-like layout with:
- Top bar (File | Resize | Editing ▼ | Undo/Redo | Download | Share)
- Left icon sidebar (Design, Elements, Text, Uploads, Tools, Projects)
- Tools drawer that slides out from the left (under Tools)
- Real Undo/Redo history (Ctrl/Cmd+Z, Ctrl+Y or Cmd+Shift+Z)
- Zoom bar at the bottom (25–200%, step 5%)
- Canvas-based filters using ctx.filter; PNG export

## Run
```bash
npm install
npm run dev
```

## Notes
- History tracks: filters, resizing, and image load state.
- "Editing ▼" has real options (Photo, Design, Presentation, Video) — currently cosmetic.
- Share is a placeholder; wire to your share flow as needed.