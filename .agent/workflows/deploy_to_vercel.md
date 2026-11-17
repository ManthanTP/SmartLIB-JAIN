---
description: How to deploy the application to Vercel
---

1.  **Log in to Vercel**: Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2.  **Add New Project**: On your Vercel dashboard, click **Add New...** -> **Project**.
3.  **Import Repository**: Find `SmartLIB-JAIN` in the list of repositories and click **Import**.
4.  **Configure Project**:
    *   **Framework Preset**: It should auto-detect **Vite**. If not, select it manually.
    *   **Root Directory**: Leave as `./` (default).
    *   **Environment Variables**: Open the "Environment Variables" section. Copy these values from your local `.env` file:
        *   `VITE_SUPABASE_URL`
        *   `VITE_SUPABASE_ANON_KEY`
5.  **Deploy**: Click **Deploy**.
6.  **Verify**: Wait for the deployment to finish. Vercel will provide a live URL (e.g., `smartlib-jain.vercel.app`).
