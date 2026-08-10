'use client'

import { useEffect, useRef } from 'react'

/**
 * A lightweight 2D canvas "civic network": an abstract Delhi-inspired grid with
 * glowing issue nodes, connecting lines, and occasional hotspot pulses, with a
 * gentle cursor-reactive parallax. Deliberately NOT WebGL — cheap, robust, and
 * it degrades to a single static frame under prefers-reduced-motion.
 */

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hot: boolean
  phase: number
}

export function CivicCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dark =
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches

    const line = dark ? 'rgba(56,189,248,' : 'rgba(14,116,144,'
    const dot = dark ? 'rgba(103,232,249,' : 'rgba(8,145,178,'
    const hot = dark ? 'rgba(244,114,182,' : 'rgba(219,39,119,'
    const grid = dark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.08)'

    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let nodes: Node[] = []
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    let raf = 0
    let running = true

    function resize() {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.max(18, Math.min(46, Math.floor((width * height) / 22000)))
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: 1.4 + Math.random() * 1.8,
        hot: i % 7 === 0,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    function drawGrid(ox: number, oy: number) {
      ctx.strokeStyle = grid
      ctx.lineWidth = 1
      const step = 46
      for (let x = (ox % step) - step; x < width; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = (oy % step) - step; y < height; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }

    function frame(t: number) {
      if (!running) return
      ctx.clearRect(0, 0, width, height)

      // Ease parallax toward mouse.
      mouse.x += (mouse.tx - mouse.x) * 0.05
      mouse.y += (mouse.ty - mouse.y) * 0.05
      const px = (mouse.x - width / 2) * 0.02
      const py = (mouse.y - height / 2) * 0.02

      drawGrid(px * 2, py * 2)

      // Move + wrap nodes.
      if (!reduce) {
        for (const n of nodes) {
          n.x += n.vx
          n.y += n.vy
          if (n.x < 0) n.x = width
          if (n.x > width) n.x = 0
          if (n.y < 0) n.y = height
          if (n.y > height) n.y = 0
        }
      }

      // Connection lines between near nodes.
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < 130 * 130) {
            const alpha = (1 - Math.sqrt(d2) / 130) * 0.4
            ctx.strokeStyle = line + alpha.toFixed(3) + ')'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x + px, a.y + py)
            ctx.lineTo(b.x + px, b.y + py)
            ctx.stroke()
          }
        }
      }

      // Nodes + hotspot pulses.
      for (const n of nodes) {
        const x = n.x + px
        const y = n.y + py
        if (n.hot) {
          const pulse = reduce ? 0.5 : (Math.sin(t / 700 + n.phase) + 1) / 2
          const rad = 6 + pulse * 14
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
          g.addColorStop(0, hot + (0.35 * (1 - pulse) + 0.1).toFixed(3) + ')')
          g.addColorStop(1, hot + '0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(x, y, rad, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = (n.hot ? hot : dot) + '0.9)'
        ctx.beginPath()
        ctx.arc(x, y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reduce) raf = requestAnimationFrame(frame)
    }

    function onMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      mouse.tx = e.clientX - rect.left
      mouse.ty = e.clientY - rect.top
    }

    resize()
    mouse.x = mouse.tx = width / 2
    mouse.y = mouse.ty = height / 2

    // Pause when offscreen to save cycles.
    const io = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting
        if (running && !reduce) raf = requestAnimationFrame(frame)
      },
      { threshold: 0 },
    )
    io.observe(canvas)

    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMove)

    if (reduce) frame(0)
    else raf = requestAnimationFrame(frame)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
