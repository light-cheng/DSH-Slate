import { registerWeb } from './index.js'
export const name = 'dsh-slate-web'
export const inject = ['webServer']
export function apply(ctx) { registerWeb(ctx) }
