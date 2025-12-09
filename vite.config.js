
export default defineConfig({
  base: "/Use-Cases/",   // Must match your repo name EXACTLY

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Use-Cases/',   // MUST match your GitHub repo name

  plugins: [react()],
});
