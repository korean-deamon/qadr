"use client"

import { ContactShadows, Environment, Float, Lightformer, RoundedBox, useTexture } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"

/* ------------------------------------------------------------------ */
/* Brand colours come from the CSS tokens, never hardcoded here.       */
/* ------------------------------------------------------------------ */
type Palette = Record<"forest" | "forestDeep" | "ivory" | "sage" | "ochre" | "charcoal" | "madder", string>

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(`--qadr-${name}`).trim()
  return {
    forest: v("forest"),
    forestDeep: v("forest-deep"),
    ivory: v("ivory"),
    sage: v("sage"),
    ochre: v("ochre"),
    charcoal: v("charcoal"),
    madder: v("madder"),
  }
}

/* ------------------------------------------------------------------ */
/* Pishtaq geometry                                                    */
/* ------------------------------------------------------------------ */
const W = 3.1 // facade width
const H = 4.3 // facade height
const D = 0.5 // facade depth
const A = 0.98 // half-width of the opening
const SILL = -H / 2 + 0.26 // threshold step
const SPRING = 0.55 // springline of the arch
const APEX = 1.55

/** Pointed (Timurid) arch outline, traced counter-clockwise from bottom-left. */
function archPath(path: THREE.Path | THREE.Shape, a: number, sill: number, spring: number, apex: number) {
  path.moveTo(-a, sill)
  path.lineTo(a, sill)
  path.lineTo(a, spring)
  path.bezierCurveTo(a, spring + (apex - spring) * 0.62, a * 0.34, apex - 0.12, 0, apex)
  path.bezierCurveTo(-a * 0.34, apex - 0.12, -a, spring + (apex - spring) * 0.62, -a, spring)
  path.lineTo(-a, sill)
  return path
}

function useGirihTexture(p: Palette) {
  return useMemo(() => {
    const size = 512
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = size
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = p.forest
    ctx.fillRect(0, 0, size, size)
    ctx.scale(size / 100, size / 100)
    ctx.strokeStyle = p.sage
    ctx.globalAlpha = 0.22
    ctx.lineWidth = 0.9
    const poly = (pts: number[][]) => {
      ctx.beginPath()
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
      ctx.stroke()
    }
    const line = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    poly([[50, 20], [80, 50], [50, 80], [20, 50]])
    poly([[28.8, 28.8], [71.2, 28.8], [71.2, 71.2], [28.8, 71.2]])
    line(50, 0, 50, 20); line(50, 80, 50, 100); line(0, 50, 20, 50); line(80, 50, 100, 50)
    line(0, 0, 28.8, 28.8); line(100, 0, 71.2, 28.8); line(0, 100, 28.8, 71.2); line(100, 100, 71.2, 71.2)
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1.6, 1.6)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [p])
}

function Pishtaq({ p, photo }: { p: Palette; photo: string }) {
  const girih = useGirihTexture(p)
  const tent = useTexture(photo, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace
  })

  const facade = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-W / 2, -H / 2)
    shape.lineTo(W / 2, -H / 2)
    shape.lineTo(W / 2, H / 2)
    shape.lineTo(-W / 2, H / 2)
    shape.lineTo(-W / 2, -H / 2)
    shape.holes.push(archPath(new THREE.Path(), A, SILL, SPRING, APEX))
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: D,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 3,
      curveSegments: 48,
    })
    g.translate(0, 0, -D / 2)
    return g
  }, [])

  /** Ochre inlay that traces the opening (a thin arch-shaped ring). */
  const inlay = useMemo(() => {
    const ring = archPath(new THREE.Shape(), A + 0.11, SILL, SPRING, APEX + 0.13) as THREE.Shape
    ring.holes.push(archPath(new THREE.Path(), A + 0.035, SILL, SPRING, APEX + 0.04))
    const g = new THREE.ExtrudeGeometry(ring, { depth: 0.04, bevelEnabled: false, curveSegments: 48 })
    g.translate(0, 0, D / 2 + 0.03)
    return g
  }, [])

  const facadeMats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ map: girih, roughness: 0.82, metalness: 0 }),
      new THREE.MeshStandardMaterial({ color: p.forestDeep, roughness: 0.75 }),
    ],
    [girih, p],
  )
  const ochre = useMemo(() => new THREE.MeshStandardMaterial({ color: p.ochre, roughness: 0.35, metalness: 0.45 }), [p])

  // Alfiz: the rectangular frame that surrounds a Timurid arch
  const alfizY = (APEX + 0.42 + SILL) / 2
  const alfizH = APEX + 0.42 - SILL
  const alfizW = (A + 0.32) * 2

  return (
    <group>
      <mesh geometry={facade} material={facadeMats} />
      <mesh geometry={inlay} material={ochre} />
      <group position={[0, alfizY, D / 2 + 0.02]}>
        <mesh material={ochre} position={[0, alfizH / 2, 0]}>
          <boxGeometry args={[alfizW, 0.035, 0.03]} />
        </mesh>
        <mesh material={ochre} position={[-alfizW / 2, 0, 0]}>
          <boxGeometry args={[0.035, alfizH, 0.03]} />
        </mesh>
        <mesh material={ochre} position={[alfizW / 2, 0, 0]}>
          <boxGeometry args={[0.035, alfizH, 0.03]} />
        </mesh>
      </group>
      {/* step and plinth */}
      <mesh position={[0, -H / 2 - 0.08, 0.1]}>
        <boxGeometry args={[W + 0.5, 0.16, D + 0.6]} />
        <meshStandardMaterial color={p.sage} roughness={0.9} />
      </mesh>
      {/* the view through the portal */}
      <mesh position={[0, 0.05, -D / 2 - 0.35]}>
        <planeGeometry args={[2.35, 3.52]} />
        <meshBasicMaterial map={tent} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Everyday things, modelled as soft clay                              */
/* ------------------------------------------------------------------ */
function Book({ p }: { p: Palette }) {
  return (
    <group>
      <RoundedBox args={[0.82, 1.08, 0.2]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color={p.madder} roughness={0.7} />
      </RoundedBox>
      <mesh position={[0.025, 0, 0]}>
        <boxGeometry args={[0.77, 1.0, 0.205]} />
        <meshStandardMaterial color={p.ivory} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.2, 0.104]}>
        <boxGeometry args={[0.5, 0.025, 0.005]} />
        <meshStandardMaterial color={p.ochre} metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  )
}

function Camera({ p }: { p: Palette }) {
  return (
    <group>
      <RoundedBox args={[1.0, 0.64, 0.36]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color={p.charcoal} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[0.34, 0.16, 0.26]} radius={0.04} position={[-0.22, 0.38, 0]}>
        <meshStandardMaterial color={p.charcoal} roughness={0.55} />
      </RoundedBox>
      <mesh position={[0.08, -0.02, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.26, 0.24, 40]} />
        <meshStandardMaterial color={p.ivory} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0.08, -0.02, 0.385]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.02, 40]} />
        <meshStandardMaterial color={p.forestDeep} roughness={0.08} metalness={0.6} />
      </mesh>
      <mesh position={[0.36, 0.34, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.06, 20]} />
        <meshStandardMaterial color={p.ochre} metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  )
}

function Drill({ p }: { p: Palette }) {
  return (
    <group>
      {/* body */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.2, 0.62, 8, 24]} />
        <meshStandardMaterial color={p.ochre} roughness={0.55} />
      </mesh>
      {/* grip */}
      <mesh position={[-0.16, -0.42, 0]} rotation={[0, 0, -0.18]}>
        <capsuleGeometry args={[0.13, 0.48, 6, 18]} />
        <meshStandardMaterial color={p.charcoal} roughness={0.6} />
      </mesh>
      {/* battery */}
      <RoundedBox args={[0.5, 0.18, 0.34]} radius={0.05} position={[-0.24, -0.78, 0]}>
        <meshStandardMaterial color={p.forest} roughness={0.6} />
      </RoundedBox>
      {/* rear vent cap and trigger */}
      <mesh position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.17, 0.19, 0.08, 24]} />
        <meshStandardMaterial color={p.charcoal} roughness={0.6} />
      </mesh>
      <RoundedBox args={[0.08, 0.14, 0.1]} radius={0.03} position={[0.02, -0.25, 0]}>
        <meshStandardMaterial color={p.charcoal} roughness={0.5} />
      </RoundedBox>
      {/* chuck and bit */}
      <mesh position={[0.56, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.13, 0.2, 24]} />
        <meshStandardMaterial color={p.charcoal} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 0.55, 12]} />
        <meshStandardMaterial color={p.sage} metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Composition: sway, pointer parallax, scroll                         */
/* ------------------------------------------------------------------ */
function Composition({ p, photo, onReady }: { p: Palette; photo: string; onReady: () => void }) {
  const root = useRef<THREE.Group>(null)
  const things = useRef<THREE.Group>(null)
  const announced = useRef(false)
  const { invalidate } = useThree()

  useFrame((state, dt) => {
    const g = root.current
    const t = things.current
    if (!g || !t) return
    if (!announced.current) {
      announced.current = true
      requestAnimationFrame(onReady)
    }
    const scroll = Math.min(window.scrollY / window.innerHeight, 1)
    const sway = Math.sin(state.clock.elapsedTime * 0.22) * 0.16
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, sway + state.pointer.x * 0.22 + scroll * 0.5, 3, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.06 + scroll * 0.08, 3, dt)
    g.position.y = THREE.MathUtils.damp(g.position.y, scroll * 0.9, 4, dt)
    // things drift apart and toward the viewer as the page scrolls
    t.position.z = THREE.MathUtils.damp(t.position.z, scroll * 1.4, 3, dt)
    t.scale.setScalar(THREE.MathUtils.damp(t.scale.x, 1 + scroll * 0.12, 3, dt))
  })

  useEffect(() => invalidate(), [invalidate])

  return (
    <group ref={root}>
      <Pishtaq p={p} photo={photo} />
      <group ref={things}>
        <Float speed={1.1} rotationIntensity={0.5} floatIntensity={0.7} floatingRange={[-0.08, 0.08]}>
          <group position={[-1.5, 1.45, 0.9]} rotation={[0.2, 0.55, -0.32]} scale={0.85}>
            <Book p={p} />
          </group>
        </Float>
        <Float speed={0.9} rotationIntensity={0.4} floatIntensity={0.6} floatingRange={[-0.1, 0.1]}>
          <group position={[1.62, 0.15, 1.2]} rotation={[0.12, -0.5, 0.12]} scale={0.9}>
            <Camera p={p} />
          </group>
        </Float>
        <Float speed={1.3} rotationIntensity={0.45} floatIntensity={0.8} floatingRange={[-0.08, 0.08]}>
          <group position={[-1.45, -1.4, 1.3]} rotation={[0.05, -0.18, 0.08]} scale={0.9}>
            <Drill p={p} />
          </group>
        </Float>
      </group>
      <ContactShadows position={[0, -H / 2 - 0.17, 0]} opacity={0.32} scale={9} blur={2.8} far={3.2} color={p.forestDeep} frames={1} />
    </group>
  )
}

/** Pause rendering whenever the hero is off screen or the tab is hidden. */
function useVisible(ref: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return visible
}

export default function PortalScene({ photo, onReady }: { photo: string; onReady: () => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const visible = useVisible(wrap)
  const [palette] = useState(readPalette)

  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.1, 11.5], fov: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        eventSource={typeof document !== "undefined" ? document.documentElement : undefined}
        eventPrefix="client"
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3.5, 5, 6]} intensity={1.7} color={palette.ivory} />
        <directionalLight position={[-5, 1, 2]} intensity={0.35} color={palette.ochre} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={1.6} position={[0, 4, 4]} scale={[8, 3, 1]} color={palette.ivory} />
          <Lightformer form="rect" intensity={0.6} position={[-6, 0, 2]} scale={[3, 6, 1]} color={palette.ochre} />
        </Environment>
        <Suspense fallback={null}>
          <Composition p={palette} photo={photo} onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  )
}
