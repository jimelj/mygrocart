# MyGroCart Deployment Guide

## 🚀 Render Deployment Setup

This guide will help you deploy MyGroCart to Render with everything in one place.

### 📋 Prerequisites

1. **GitHub Account** - You'll need to push your code to GitHub
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **Domain Name** (optional) - For custom domain

### 🗄️ Step 1: Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `mygrocart-db`
   - **Database**: `mygrocart`
   - **User**: `mygrocart_user`
   - **Region**: Choose closest to your users
4. Click **"Create Database"**
5. **Save the connection details** - you'll need them for the backend

### 🔧 Step 2: Deploy Backend

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `mygrocart-backend`
   - **Root Directory**: `mygrocart-backend-node`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `mygrocart-backend-node/Dockerfile`
   - **Instance Type**: `Free`
4. Set Environment Variables:
   ```
   DATABASE_URL=postgresql://username:password@hostname:port/database
   JWT_SECRET=your-super-secure-jwt-secret-key-here
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   PORT=5000
   ```
5. Click **"Create Web Service"**

### 🌐 Step 3: Deploy Frontend

1. In Render Dashboard, click **"New +"** → **"Static Site"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `mygrocart-frontend`
   - **Root Directory**: `mygrocart-app`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Set Environment Variables:
   ```
   VITE_GRAPHQL_ENDPOINT=https://your-backend-app.onrender.com/graphql
   ```
5. Click **"Create Static Site"**

### 🔗 Step 4: Update Frontend Environment

After backend deployment:
1. Copy the backend URL from Render
2. Update the frontend environment variable:
   ```
   VITE_GRAPHQL_ENDPOINT=https://your-actual-backend-url.onrender.com/graphql
   ```
3. Redeploy the frontend

### 🎯 Step 5: Custom Domain (Optional)

1. In your static site settings, go to **"Custom Domains"**
2. Add your domain
3. Update DNS records as instructed
4. Update environment variable with your domain

### 📊 Environment Variables Summary

#### Backend (.env)
```bash
DATABASE_URL=postgresql://username:password@hostname:port/database
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=5000
```

#### Frontend (.env.production)
```bash
VITE_GRAPHQL_ENDPOINT=https://your-backend-app.onrender.com/graphql
```

### 🆓 Free Tier Limits

- **Backend**: 750 hours/month (enough for small audience)
- **Database**: 1GB PostgreSQL
- **Frontend**: Unlimited static hosting
- **Total Cost**: $0/month

### 🔧 Troubleshooting

1. **Backend won't start**: Check environment variables
2. **Database connection failed**: Verify DATABASE_URL
3. **Frontend can't connect**: Check VITE_GRAPHQL_ENDPOINT
4. **Build fails**: Check build logs in Render dashboard

### 🎉 Success!

Once deployed, your MyGroCart app will be live at:
- **Frontend**: `https://your-frontend-app.onrender.com`
- **Backend**: `https://your-backend-app.onrender.com`
- **GraphQL**: `https://your-backend-app.onrender.com/graphql`

### 📈 Scaling

When you're ready to scale:
1. Upgrade to paid plans for more resources
2. Add CDN for better performance
3. Set up monitoring and alerts
4. Add custom domain with SSL
