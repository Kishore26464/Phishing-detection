import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set VITE_BASE_PATH when building for a subpath host (e.g. GitHub Pages
  // project sites, served at https://<user>.github.io/<repo>/).
  base: process.env.VITE_BASE_PATH ?? '/',
})
