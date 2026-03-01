import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'save-db-plugin',
      configureServer(server) {
        server.middlewares.use('/api/save-db', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                // Ensure directory exists
                const dir = path.resolve(__dirname, 'src/data');
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                fs.writeFileSync(path.resolve(dir, 'database.json'), body, 'utf-8');
                res.statusCode = 200;
                res.end('Data saved to disk!');
              } catch (e: any) {
                console.error("Save Error:", e);
                res.statusCode = 500;
                res.end(e.message || 'Error saving to disk');
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
