import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En production, l'app est servie par GitHub Pages sous /Pronos/ ; en dev, à la racine.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Pronos/' : '/',
  plugins: [react()],
  server: { port: 5173 },
}));
