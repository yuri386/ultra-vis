# Free deployment: Cloudflare Workers + D1

Ultra VIS runs on Cloudflare Workers with a permanent D1 database. The free
tier is enough for an early public launch and does not require a card.

1. Sign in to Cloudflare and run `npx wrangler login` from this folder.
2. Create the database with `npx wrangler d1 create ultravis`.
3. Copy the returned `database_id` into `wrangler.toml`.
4. Run `npm run d1:migrate` and then `npm run deploy:cloudflare`.

The Worker calls SkillLand only with a random, one-time 60-second hand-off
ticket. The Worker never gets a SkillLand password or long-lived SkillLand
session.
