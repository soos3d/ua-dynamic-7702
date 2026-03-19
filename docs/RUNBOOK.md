# Runbook

Operational reference for the Universal Account + Dynamic demo.

## Running locally

```bash
yarn install
yarn dev
# -> http://localhost:3000
```

## Production build

```bash
yarn build
yarn start
```

Check for build errors before deploying -- TypeScript and ESLint errors will fail the build.

## Deployment (Vercel)

This is a standard Next.js app and deploys to Vercel with zero config.

1. Push the repo to GitHub
2. Import the repo in the [Vercel dashboard](https://vercel.com/new)
3. Set the environment variables in Vercel -> Settings -> Environment Variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Your Dynamic environment ID |
| `NEXT_PUBLIC_PROJECT_ID` | Your Particle Network project ID |
| `NEXT_PUBLIC_CLIENT_KEY` | Your Particle Network client key |
| `NEXT_PUBLIC_APP_ID` | Your Particle Network app ID |

4. Deploy. Vercel will run `next build` automatically.

## Environment variables

| Variable | Where to get it | Notes |
|----------|----------------|-------|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | [Dynamic dashboard](https://app.dynamic.xyz/) -> Settings -> API | Prefixed with `NEXT_PUBLIC_` so it's available in the browser |
| `NEXT_PUBLIC_PROJECT_ID` | [Particle Network dashboard](https://dashboard.particle.network/) | Required for Universal Account SDK initialization |
| `NEXT_PUBLIC_CLIENT_KEY` | [Particle Network dashboard](https://dashboard.particle.network/) | Required for Universal Account SDK initialization |
| `NEXT_PUBLIC_APP_ID` | [Particle Network dashboard](https://dashboard.particle.network/) | Required for Universal Account SDK initialization |

## Common issues

### Blank page / "Dynamic environment ID not found"

**Cause:** `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` is missing or empty.

**Fix:** Check `.env.local` exists and contains the correct value. Restart the dev server after changing env files.

### Universal Account SDK initialization fails

**Cause:** One or more Particle Network env vars (`NEXT_PUBLIC_PROJECT_ID`, `NEXT_PUBLIC_CLIENT_KEY`, `NEXT_PUBLIC_APP_ID`) are missing or invalid.

**Fix:** Verify all four environment variables are set in `.env.local`. Check the Particle Network dashboard for correct values.

### Auth Core signing popup appears

**Cause:** The intermediary Particle account has a payment or master password set from a prior session.

**Fix:** This is a known limitation -- the intermediary wallet must not have security passwords set. Use a fresh Particle account or clear the session.

### EIP-7702 delegation transaction fails

**Cause:** The connected wallet may not have enough ETH on Arbitrum to cover gas, or the network may be congested.

**Fix:** Ensure the wallet has a small amount of ETH on Arbitrum for gas fees. Check browser devtools for detailed error messages from the delegation call.

## Monitoring

This is a demo app with no backend. There is nothing to monitor server-side.

Client-side logging can be observed in browser devtools. The Universal Account provider in `hooks/universal-account-provider.tsx` logs key lifecycle events.

## Rollback

Since there is no persistent state or database, rollback = revert the Git commit and redeploy.

```bash
git revert HEAD
git push
```

Vercel will automatically redeploy on push.
