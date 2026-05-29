// Server-authoritative Sentinel game state, backed by Vercel KV (Upstash Redis).
//
// Each session gets one key: `sn:<sessionId>`. The state is stored as JSON with
// a 30-minute TTL so abandoned games clean themselves up. Mutations
// (`applyFire`, `applyReset`) read-modify-write and return the new state for
// the caller to broadcast over SSE.
//
// Timer expirations (response 10s, stalemate 15s, hit→resolution 3s,
// resolution→reset 7s) are evaluated lazily: `tick(state)` checks each
// timestamp on every read and advances the phase machine if any deadline has
// passed. Serverless functions can't run setTimeout reliably across
// invocations — lazy evaluation makes the machine self-healing as long as
// SOMETHING reads the state (which polling guarantees).

import { Redis } from '@upstash/redis'

// Lazily construct the Upstash client. `Redis.fromEnv()` throws synchronously
// when UPSTASH_REDIS_REST_URL / _TOKEN are absent — if that ran at module load
// it would crash `next build` (which imports route modules) and take down the
// entire deploy, not just escalation. Deferring to first use means a missing
// KV binding only 500s the escalation endpoints at runtime; everything else
// builds and ships.
let _redis: Redis | null = null
function redis(): Redis {
  if (!_redis) _redis = Redis.fromEnv()
  return _redis
}

const TTL_SECONDS = 30 * 60

export interface SNState {
  phase: 'fire' | 'hit' | 'resolution' | 'done'
  attackerId: string
  defenderId: string
  resource: string
  stake: number
  attackerShots: number
  defenderShots: number
  attackerRockets: number
  defenderRockets: number
  activeTimer: 'response' | 'stalemate' | null
  timerDeadline: number | null    // Date.now() ms
  loser: 'attacker' | 'defender' | null
  attackerStarted: boolean
  revealAt: number | null         // Date.now() ms when phase started (HIT/RESOLUTION)
  version: number                 // increments on every mutation — for client reconciliation
}

function initial(scenario?: Partial<Pick<SNState, 'attackerId' | 'defenderId' | 'resource' | 'stake'>>): SNState {
  return {
    phase: 'fire',
    attackerId: scenario?.attackerId ?? 'ignis',
    defenderId: scenario?.defenderId ?? 'aqualis',
    resource: scenario?.resource ?? 'oxygen',
    stake: scenario?.stake ?? 6,
    attackerShots: 0,
    defenderShots: 0,
    attackerRockets: 5,
    defenderRockets: 5,
    activeTimer: null,
    timerDeadline: null,
    loser: null,
    attackerStarted: false,
    revealAt: null,
    version: 0,
  }
}

function key(sessionId: string) { return `sn:${sessionId}` }

async function readRaw(sessionId: string): Promise<SNState | null> {
  const v = await redis().get<SNState>(key(sessionId))
  return v || null
}

async function writeRaw(sessionId: string, state: SNState): Promise<void> {
  await redis().set(key(sessionId), state, { ex: TTL_SECONDS })
}

// Apply any time-based transitions that should have fired by `now`.
// Returns { state, changed } — caller writes + broadcasts if changed.
export function tick(input: SNState, now: number = Date.now()): { state: SNState; changed: boolean } {
  let s = input
  let changed = false

  // fire-phase timer expiry
  if (s.phase === 'fire' && s.timerDeadline && now >= s.timerDeadline) {
    if (s.activeTimer === 'response') {
      const behind: 'attacker' | 'defender' = s.attackerShots < s.defenderShots ? 'attacker' : 'defender'
      s = { ...s, phase: 'hit', loser: behind, activeTimer: null, timerDeadline: null, revealAt: now, version: s.version + 1 }
      changed = true
    } else if (s.activeTimer === 'stalemate') {
      s = { ...s, phase: 'resolution', loser: null, activeTimer: null, timerDeadline: null, revealAt: now, version: s.version + 1 }
      changed = true
    }
  }

  // hit → resolution after 3s
  if (s.phase === 'hit' && s.revealAt && now - s.revealAt >= 3000) {
    s = { ...s, phase: 'resolution', revealAt: now, version: s.version + 1 }
    changed = true
  }

  // resolution → reset after 7s (so repeat demos auto-reset)
  if (s.phase === 'resolution' && s.revealAt && now - s.revealAt >= 7000) {
    s = { ...initial({ attackerId: s.attackerId, defenderId: s.defenderId, resource: s.resource, stake: s.stake }), version: s.version + 1 }
    changed = true
  }

  return { state: s, changed }
}

// Read current state, applying any due transitions. Persists if changed.
export async function getState(sessionId: string, scenario?: Partial<Pick<SNState, 'attackerId' | 'defenderId' | 'resource' | 'stake'>>): Promise<SNState> {
  const existing = await readRaw(sessionId)
  let state = existing ?? initial(scenario)
  if (!existing && scenario) {
    // First touch — seed with the provided scenario
    state = initial(scenario)
    await writeRaw(sessionId, state)
  }
  const { state: ticked, changed } = tick(state)
  if (changed) await writeRaw(sessionId, ticked)
  return ticked
}

// Force-set the scenario without resetting in-progress runs unless the
// scenario actually changes. Returns the canonical state after the change.
export async function setScenario(sessionId: string, scenario: Pick<SNState, 'attackerId' | 'defenderId' | 'resource' | 'stake'>): Promise<SNState> {
  const existing = await readRaw(sessionId)
  if (!existing) {
    const fresh = initial(scenario)
    await writeRaw(sessionId, fresh)
    return fresh
  }
  if (
    existing.attackerId === scenario.attackerId &&
    existing.defenderId === scenario.defenderId &&
    existing.resource === scenario.resource &&
    existing.stake === scenario.stake
  ) {
    return existing
  }
  // Scenario changed — reset (keeps Sentinel in lock-step with backing scandal)
  const fresh = initial(scenario)
  await writeRaw(sessionId, fresh)
  return fresh
}

// Apply a fire from `side`. Mirrors the state machine in EscalationSentinel.tsx.
// Returns the new state. Throws if action is invalid (lockout / exhaustion).
export async function applyFire(sessionId: string, side: 'attacker' | 'defender'): Promise<SNState> {
  const current = await getState(sessionId)
  if (current.phase !== 'fire') return current
  if (!current.attackerStarted && side !== 'attacker') return current
  const isA = side === 'attacker'
  const rocketsLeft = isA ? current.attackerRockets : current.defenderRockets
  if (rocketsLeft <= 0) return current

  const aShots = current.attackerShots + (isA ? 1 : 0)
  const dShots = current.defenderShots + (isA ? 0 : 1)
  const aRox = current.attackerRockets - (isA ? 1 : 0)
  const dRox = current.defenderRockets - (isA ? 0 : 1)
  const now = Date.now()

  let next: SNState = {
    ...current,
    attackerShots: aShots, defenderShots: dShots,
    attackerRockets: aRox, defenderRockets: dRox,
    attackerStarted: current.attackerStarted || isA,
    version: current.version + 1,
  }

  // Exhaustion / instant-resolution checks
  if (aRox === 0 && dRox === 0 && aShots === dShots) {
    next = { ...next, phase: 'resolution', loser: null, activeTimer: null, timerDeadline: null, revealAt: now }
  } else if (aRox === 0 && aShots < dShots) {
    next = { ...next, phase: 'hit', loser: 'attacker', activeTimer: null, timerDeadline: null, revealAt: now }
  } else if (dRox === 0 && dShots < aShots) {
    next = { ...next, phase: 'hit', loser: 'defender', activeTimer: null, timerDeadline: null, revealAt: now }
  } else if (aShots === dShots) {
    next = { ...next, activeTimer: 'stalemate', timerDeadline: now + 15000 }
  } else {
    next = { ...next, activeTimer: 'response', timerDeadline: now + 10000 }
  }

  await writeRaw(sessionId, next)
  return next
}

export async function applyReset(sessionId: string): Promise<SNState> {
  const existing = await readRaw(sessionId)
  const scenario = existing
    ? { attackerId: existing.attackerId, defenderId: existing.defenderId, resource: existing.resource, stake: existing.stake }
    : undefined
  const fresh = { ...initial(scenario), version: (existing?.version ?? 0) + 1 }
  await writeRaw(sessionId, fresh)
  return fresh
}
