import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Cloudflare plugin changes the build output (dist/client). Skip it on Vercel, which serves plain dist/.
const onVercel = !!process.env.VERCEL

export default defineConfig({
  plugins: [react(), ...(onVercel ? [] : [cloudflare()])],
})
