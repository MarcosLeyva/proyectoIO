import { useEffect, useRef } from 'react'

interface Dot {
  x: number
  y: number
  phase: number
}

/**
 * Rejilla de puntos interactiva: los puntos cercanos al cursor brillan con
 * un halo suave y los lejanos titilan apenas. Se monta como capa absoluta
 * dentro de un contenedor `relative`; escucha el mouse en el padre.
 */
export function DotGrid({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const GAP = 24
    const RADIUS = 140
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    let dots: Dot[] = []
    let raf = 0
    // El target (tx,ty) salta con el mouse; (x,y) lo persigue con lerp para
    // que el halo se sienta fluido en lugar de teletransportarse.
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 }

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dots = []
      for (let y = GAP / 2; y < h; y += GAP) {
        for (let x = GAP / 2; x < w; x += GAP) {
          dots.push({ x, y, phase: Math.random() * Math.PI * 2 })
        }
      }
    }

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect()
      mouse.tx = e.clientX - rect.left
      mouse.ty = e.clientY - rect.top
    }
    const onLeave = () => {
      mouse.tx = -9999
      mouse.ty = -9999
    }

    const draw = (t: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.16
      mouse.y += (mouse.ty - mouse.y) * 0.16
      ctx.clearRect(0, 0, w, h)

      for (const d of dots) {
        const dist = Math.hypot(d.x - mouse.x, d.y - mouse.y)
        const prox = Math.max(0, 1 - dist / RADIUS)
        const twinkle = 0.5 + 0.5 * Math.sin(t / 1500 + d.phase)
        const alpha = Math.min(1, 0.08 + twinkle * 0.07 + prox * 0.9)
        const r = 1 + prox * 1.7

        if (prox > 0.03) {
          const glowR = 12 * prox + 2
          const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, glowR)
          g.addColorStop(0, `rgba(165,180,252,${0.55 * prox})`)
          g.addColorStop(1, 'rgba(165,180,252,0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(d.x, d.y, glowR, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.fillStyle = `rgba(199,210,254,${alpha})`
        ctx.beginPath()
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    parent.addEventListener('mousemove', onMove)
    parent.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      parent.removeEventListener('mousemove', onMove)
      parent.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
