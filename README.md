# Foundation GTM Supabase CRM

Private internal CRM for tracking LinkedIn outreach to auto manufacturers.

## Upload to GitHub

Upload the contents of this folder, not the ZIP file itself.

Your GitHub repo should show:

- src/
- supabase/
- package.json
- index.html
- tailwind.config.js
- postcss.config.js
- .env.example
- README.md

## Vercel Settings

Framework: Vite  
Build command: npm run build  
Output directory: dist  

## Supabase Setup

1. Create a Supabase project.
2. Go to SQL Editor.
3. Paste everything from supabase/schema.sql.
4. Run it.
5. Go to Project Settings → API.
6. Copy:
   - Project URL
   - anon public key
7. Add those to Vercel Environment Variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

## Login

Use Supabase Auth.
In Supabase, go to Authentication → Users → Add User.
Add yourself and your boss.

## Run Locally

npm install
npm run dev
