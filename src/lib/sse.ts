// Server-Sent Events broadcaster
// We use a simple in-memory event emitter for the prototype

import { EventEmitter } from 'events'

export const sseEmitter = new EventEmitter()
sseEmitter.setMaxListeners(200)

export function broadcastUpdate(sessionId: string, data: object) {
  sseEmitter.emit(`session:${sessionId}`, data)
}
