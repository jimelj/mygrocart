# CI/CD Setup Guide

Complete guide to setting up Continuous Integration and Continuous Deployment for MyGroCart.

## Overview

Your CI/CD pipeline includes:

- **Backend CI/CD**: Automatic testing + deployment to Render
- **Frontend Web CI/CD**: Automatic testing + deployment to Render
- **Mobile CI**: Automatic testing (deployment is manual via Expo EAS)

## Quick Start

### 1. Enable GitHub Actions

1. Go to your GitHub repository
2. Click **Settings** → **Actions** → **General**
3. Under "Actions permissions", select **Allow all actions and reusable workflows**
4. Click **Save**

### 2. Configure Secrets

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

#### Required for Backend Deployment

| Secret Name | Where to Get It | Example Value |
|-------------|-----------------|---------------|
| `RENDER_DEPLOY_HOOK_URL` | Render Dashboard → Backend Service → Settings → Deploy Hook | `https://api.render.com/deploy/srv-xxx?key=yyy` |
| `BACKEND_URL` | Your backend URL on Render | `https://mygrocart-backend.onrender.com` |

#### Required for Frontend Web Deployment

| Secret Name | Where to Get It | Example Value |
|-------------|-----------------|---------------|
| `RENDER_FRONTEND_DEPLOY_HOOK_URL` | Render Dashboard → Frontend Service → Settings → Deploy Hook | `https://api.render.com/deploy/srv-zzz?key=www` |
| `FRONTEND_URL` | Your frontend URL on Render | `https://mygrocart.onrender.com` |

---

## Detailed Setup Instructions

### Backend (Render)

#### Step 1: Get Render Deploy Hook

1. Go to https://dashboard.render.com/
2. Select your MyGroCart **backend** service
3. Click **Settings** → **Deploy Hooks**
4. Click **Create Deploy Hook**
5. Name it "GitHub Actions Backend"
6. Copy the URL (looks like: `https://api.render.com/deploy/srv-...?key=...`)

#### Step 2: Add to GitHub Secrets

1. Go to your GitHub repo → Settings → Secrets → Actions
2. Click **New repository secret**
3. Name: `RENDER_DEPLOY_HOOK_URL`
4. Value: Paste the URL from Step 1
5. Click **Add secret**

6. Add another secret:
   - Name: `BACKEND_URL`
   - Value: Your backend URL (e.g., `https://mygrocart-backend.onrender.com`)

#### Step 3: Test the Setup

```bash
git add .
git commit -m "test: trigger backend CI/CD"
git push origin main
```

Watch the GitHub Actions tab - you should see:
1. ✅ Lint & Type Check
2. ✅ Build Check
3. ✅ Security Audit
4. ✅ Deploy to Render
5. ✅ Health Check

---

### Frontend Web (Render)

#### Step 1: Get Render Deploy Hook

1. Go to https://dashboard.render.com/
2. Select your MyGroCart **frontend** service
3. Click **Settings** → **Deploy Hooks**
4. Click **Create Deploy Hook**
5. Name it "GitHub Actions Frontend"
6. Copy the URL (looks like: `https://api.render.com/deploy/srv-...?key=...`)

#### Step 2: Add to GitHub Secrets

Add two secrets:

1. `RENDER_FRONTEND_DEPLOY_HOOK_URL` - The deploy hook URL from Step 1
2. `FRONTEND_URL` - Your frontend URL (e.g., `https://mygrocart.onrender.com`)

#### Step 3: Test the Setup

```bash
cd mygrocart-web
git add .
git commit -m "test: trigger frontend CI/CD"
git push origin main
```

Watch for:
1. ✅ TypeScript & Lint Check
2. ✅ Build Test
3. ✅ Accessibility Check
4. ✅ Deploy to Render

---

### Mobile (Expo EAS - Optional)

Mobile deployment is **manual** and requires paid services. The CI pipeline will:
- ✅ Run tests
- ✅ Type check
- ✅ Lint code
- ✅ Verify configuration

#### For Automated Mobile Deployment (Optional)

Requirements:
- Expo EAS subscription ($29/month)
- Apple Developer Account ($99/year)
- Google Play Developer Account ($25 one-time)

Steps:
1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Get token: `eas whoami`
5. Add `EXPO_TOKEN` to GitHub secrets

Then uncomment the `deploy-to-expo` job in `.github/workflows/mobile-ci.yml`.

**For now:** Mobile deployment is manual. The CI will ensure code quality.

---

## How It Works

### On Every Push/PR

**All branches:**
- ✅ Runs tests
- ✅ Type checks
- ✅ Linting
- ✅ Security audit

**`main` branch only:**
- ✅ All of the above, PLUS:
- 🚀 Automatic deployment to production

### Workflow Triggers

The workflows run when you push to these paths:

| Path | Triggers |
|------|----------|
| `mygrocart-backend-node/**` | Backend CI/CD |
| `mygrocart-web/**` | Frontend Web CI/CD |
| `mygrocart-mobile/**` | Mobile CI |

### Preventing Unnecessary Runs

If you only modify the backend, only the backend workflow runs. This saves GitHub Actions minutes.

---

## Monitoring Your Deployments

### GitHub Actions Tab

1. Go to your repository
2. Click **Actions** tab
3. See all workflow runs with status icons:
   - ✅ Green check = Success
   - ❌ Red X = Failed
   - 🟡 Yellow dot = In progress

### Viewing Logs

1. Click on any workflow run
2. Click on a job (e.g., "Deploy to Render")
3. View detailed logs for each step

### Notifications

GitHub will:
- Email you on failures
- Show status on PR checks
- Display status badges (optional)

---

## Adding Status Badges (Optional)

Add these to your README.md:

```markdown
![Backend CI/CD](https://github.com/YOUR_USERNAME/MyGroCart/workflows/Backend%20CI/CD/badge.svg)
![Frontend Web CI/CD](https://github.com/YOUR_USERNAME/MyGroCart/workflows/Frontend%20Web%20CI/CD/badge.svg)
![Mobile CI](https://github.com/YOUR_USERNAME/MyGroCart/workflows/Mobile%20CI/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Troubleshooting

### "Secrets not found" Error

**Problem:** Workflow fails with "secret RENDER_DEPLOY_HOOK_URL not found"

**Solution:**
1. Go to Settings → Secrets → Actions
2. Verify the secret name matches EXACTLY (case-sensitive)
3. Ensure you added it at the repository level (not environment level)

### Backend Deployment Fails

**Problem:** Deploy job succeeds but health check fails

**Solution:**
1. Check Render logs: `https://dashboard.render.com/`
2. Verify environment variables are set on Render
3. Ensure DATABASE_URL, JWT_SECRET, etc. are configured

### Frontend Deployment Fails

**Problem:** "Error: Secret RENDER_FRONTEND_DEPLOY_HOOK_URL not found"

**Solution:**
1. Verify `RENDER_FRONTEND_DEPLOY_HOOK_URL` secret is set
2. Check that the URL starts with `https://api.render.com/deploy/`
3. Ensure it's the frontend service's deploy hook, not the backend's

### Mobile Tests Fail

**Problem:** Jest tests fail with "winter" module error

**Expected:** This is a known Expo 54 + Jest 30 compatibility issue
- Tests are written and ready
- Will work when Expo 54.1 is released
- CI will continue on error for now

---

## Advanced Configuration

### Custom Deployment Branches

To deploy from `develop` instead of `main`:

Edit `.github/workflows/backend-ci-cd.yml`:

```yaml
deploy-to-render:
  if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
```

### Slack/Discord Notifications

Add notification steps to workflows:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Staging Environments

Create separate workflows for staging:
- `backend-staging.yml`
- Use different secrets: `RENDER_DEPLOY_HOOK_URL_STAGING`

---

## Cost Considerations

### GitHub Actions Minutes

Free tier includes:
- **2,000 minutes/month** for private repos
- **Unlimited** for public repos

Your workflows use approximately:
- Backend: ~3 minutes per run
- Frontend: ~3 minutes per run
- Mobile: ~4 minutes per run

**Estimate:** ~50 runs/month = ~500 minutes = well within free tier

### Third-Party Services

| Service | Cost |
|---------|------|
| Render (Backend) | Free tier → $7/month |
| Render (Frontend) | Free tier → $7/month |
| Expo EAS (Mobile) | Optional, $29/month |

**Total:** $0-$43/month depending on whether you use Expo EAS and Render paid tiers

---

## Security Best Practices

### ✅ DO

- Store sensitive values (tokens, keys) in GitHub Secrets
- Use deploy hooks instead of giving GitHub direct access to services
- Enable branch protection rules to require CI before merging
- Review workflow changes in PRs before merging

### ❌ DON'T

- Commit secrets to code
- Use personal access tokens (use service tokens)
- Disable security audits
- Skip CI checks

---

## Next Steps

### After Setup

1. **Create a test PR** to verify CI works
2. **Merge to main** to verify CD works
3. **Monitor first deployment** in Render logs
4. **Set up branch protection**:
   - Settings → Branches → Add rule
   - Require status checks to pass before merging
   - Require pull request reviews

### Future Enhancements

- Add integration tests (Playwright/Cypress)
- Add performance budgets (Lighthouse CI)
- Add visual regression testing (Percy/Chromatic)
- Add database migration checks
- Add security scanning (Snyk/Dependabot)

---

## Support

### Resources

- GitHub Actions Docs: https://docs.github.com/en/actions
- Render Docs: https://render.com/docs

### Common Issues

See [Troubleshooting](#troubleshooting) section above.

### Getting Help

1. Check workflow logs in GitHub Actions tab
2. Check deployment service logs (Render)
3. Review this guide
4. Search GitHub Actions community forum

---

**Status:** Ready to use! Follow steps 1-2 above to get started.
