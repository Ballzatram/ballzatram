# Ballzatram AI Bridge

This directory contains the minimal server-side bridge that lets GitHub Pages tools call OpenAI without exposing the OpenAI API key in browser code.

## Architecture

`ballzatram.com` (GitHub Pages) -> Cloudflare Worker -> OpenAI Responses API

The browser stores only the Worker URL and a personal Ballzatram access token that you choose. The Worker stores `OPENAI_API_KEY` and `BALLZATRAM_ACCESS_TOKEN` as encrypted secrets.

## One-time setup

1. Create/log into a Cloudflare account.
2. From this directory run `npx wrangler login`.
3. Set the OpenAI API key: `npx wrangler secret put OPENAI_API_KEY`.
4. Create a long random personal access token and set it: `npx wrangler secret put BALLZATRAM_ACCESS_TOKEN`.
5. Deploy: `npx wrangler deploy`.
6. Copy the returned `workers.dev` URL into `ballzatram.com/tools/ai/`, along with the same personal access token.

Do not put `OPENAI_API_KEY` in `wrangler.toml`, GitHub Pages JavaScript, or any committed file.

## Endpoints

- `GET /health` — confirms the Worker is reachable.
- `POST /v1/assist` — requires `Authorization: Bearer <BALLZATRAM_ACCESS_TOKEN>`.

The bridge bounds prompt/context size, uses the OpenAI Responses API, and instructs the model to distinguish computed facts from interpretation and preserve tool boundaries.
