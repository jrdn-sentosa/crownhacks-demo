# CrownHacks Shoutouts

A tiny React + Supabase app (with an optional FastAPI backend) for the ACM @ UNCC deployment workshop.

## Steps

1. **Create the table.** In your Supabase project, open the **SQL Editor**, paste in `supabase/schema.sql`, and run it.
2. **Add your keys.** Copy `frontend/.env.example` to `frontend/.env` and fill in your Supabase URL and publishable key (Project Settings → API).
3. **Run it locally.**
   ```
   cd frontend
   npm install
   npm run dev
   ```
4. **Deploy.** Go to [vercel.com/new](https://vercel.com/new), import this repo, set **Root Directory** to `frontend`, add the same env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`), and click **Deploy**.
5. **(Optional) Deploy the Python backend.** Create a second Vercel project from the same repo with **Root Directory** set to `backend`. Then set `VITE_API_URL` (the backend's URL) on the frontend project and `FRONTEND_URL` (the frontend's URL) on the backend project, and redeploy both.
   To run the backend locally (needs [uv](https://docs.astral.sh/uv/)):
   ```
   cd backend
   uv sync
   uv run uvicorn main:app --reload
   ```
   Add packages with `uv add <package>`; Vercel installs from `pyproject.toml` and `uv.lock`.
6. **Install on your phone.** iPhone: Share → Add to Home Screen. Android Chrome: menu → Install.

## Empty list?

That's Row Level Security doing its job. Run the commented-out policies at the bottom of `supabase/schema.sql`.
