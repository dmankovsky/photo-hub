# Hosting Guide — Photo Hub

This app has three parts to deploy:

| Part | Recommended | Free tier |
|------|-------------|-----------|
| Backend (Express) | [Railway](https://railway.app) | 500 hours/month |
| Frontend (React) | [Vercel](https://vercel.com) | Unlimited |
| Database (MongoDB) | [MongoDB Atlas](https://cloud.mongodb.com) | 512 MB |
| Photo storage | [Cloudinary](https://cloudinary.com) | 25 GB / 25k transformations |

---

## 1. Cloudinary (photo storage)

1. Create a free account at https://cloudinary.com
2. Go to **Settings → API Keys**
3. Copy **Cloud Name**, **API Key**, **API Secret**
4. Fill them in `backend/.env`

Photos are uploaded directly from the backend to Cloudinary and served via Cloudinary's global CDN — so photos load fast on any device worldwide.

---

## 2. Stripe (payments)

1. Create a free account at https://stripe.com
2. Go to **Developers → API keys**
3. Copy **Publishable key** → `REACT_APP_STRIPE_PUBLIC_KEY` in `.env.local`
4. Copy **Secret key** → `STRIPE_SECRET_KEY` in `backend/.env`

Use `sk_test_` / `pk_test_` keys while developing, switch to live keys for production.

**Test card:** `4242 4242 4242 4242`, any future date, any CVC.

---

## 3. MongoDB Atlas (database)

1. Create a free account at https://cloud.mongodb.com
2. Create a free M0 cluster (512 MB)
3. Under **Database Access**, create a user with a password
4. Under **Network Access**, allow `0.0.0.0/0` (or Railway's IP range)
5. Click **Connect → Connect your application** and copy the connection string
6. Set it as `MONGO_URI` in `backend/.env`:
   ```
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/photoHub
   ```

---

## 4. Railway (backend)

1. Push this repo to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub repo
3. Select this repository
4. Railway auto-detects Node.js and runs `node backend/server.js`
   - If not, set **Start Command** to: `node backend/server.js`
5. Add all environment variables from `backend/.env` in Railway's **Variables** tab:
   - `MONGO_URI`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `STRIPE_SECRET_KEY`
   - `FRONTEND_URL` → set to your Vercel URL (see step 5 below)
   - `ALLOWED_ORIGINS` → set to your Vercel URL
6. Copy the Railway public URL (e.g. `https://photo-hub-production.up.railway.app`)

---

## 5. Vercel (frontend)

1. Go to https://vercel.com → New Project → Import from GitHub
2. Set **Framework Preset** to `Create React App`
3. Add environment variables in Vercel dashboard:
   - `REACT_APP_API_URL` → your Railway backend URL
   - `REACT_APP_STRIPE_PUBLIC_KEY` → your Stripe publishable key
4. Deploy — Vercel gives you a URL like `https://photo-hub.vercel.app`
5. Go back to Railway and set `FRONTEND_URL` and `ALLOWED_ORIGINS` to this Vercel URL

---

## Local development

```bash
# Terminal 1 — backend
cd photo-hub
npx nodemon backend/server.js

# Terminal 2 — frontend
cd photo-hub
npm start
```

Make sure `backend/.env` and `.env.local` are filled out before starting.

---

## How the QR code / download flow works externally

1. Photographer uploads photos on their laptop → QR code is generated
2. QR code encodes: `https://your-vercel-url.app/download/<sessionId>`
3. Client scans QR on their phone → opens the download page in their mobile browser
4. Client pays via Stripe → photos are unlocked
5. Client taps **Download All as ZIP** → receives a zip file
6. Or client taps individual photo thumbnails → each downloads separately

Because photos are stored on Cloudinary's CDN, they load fast anywhere in the world.
