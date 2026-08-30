# Repository Guidelines

## Project Structure & Module Organization

This is a static Cloudflare Pages application with a single-page UI.

- `public/index.html` contains the page structure and inline control wiring.
- `public/style.css` contains all application styles, responsive rules, and theme variables.
- `public/app.js` contains client-side state, data processing, chart drawing, and UI behavior.
- `functions/api/proxy.js` is the Cloudflare Pages Function that proxies lottery-history requests at `/api/proxy?year=YYYY`.
- `public/favicon.svg` is the site icon. There is currently no dedicated test directory.

Keep browser-facing changes in `public/`; keep server-side proxy behavior isolated in `functions/api/`.

## Build, Test, and Development Commands

- `npx wrangler pages dev` starts the static site and Pages Functions locally; use it for end-to-end checks of `/api/proxy`.
- `node --check public/app.js` validates JavaScript syntax after editing client logic.
- `npx wrangler pages deploy public --project-name aomenliuhe` deploys the `public/` directory to Cloudflare Pages.

There is no package manifest, build step, formatter, or automated test suite. Do not add generated build output to the repository. Do not create `wrangler.toml`; Pages deployment is intentionally configured without it.

## Coding Style & Naming Conventions

Use four-space indentation and retain the existing plain browser JavaScript style: functions use `camelCase` (`calculateColdSets`), constants use `UPPER_SNAKE_CASE`, and DOM IDs use descriptive camelCase or grouped prefixes such as `coldOption_numbers`.

Prefer small helper functions for shared calculations and keep UI state on the existing `state` object. Preserve the current Chinese user-facing labels and comments when changing related behavior. Avoid introducing frameworks or modules unless the change explicitly requires them.

## Testing Guidelines

Manually test affected controls in a browser with representative loaded or mock data. For changes to statistics, verify multiple period selections, the latest chart point tooltip, and page navigation. For proxy changes, test both a valid year and an unavailable upstream response. Always run `node --check` on edited JavaScript files.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects. Existing history uses both English and Chinese messages, for example `Fix period-based omission recalculation` and `修复手选生肖在特码自由K线中不生效的问题`.

Keep commits focused. Pull requests should describe the user-visible behavior, list verification performed, link relevant issues when available, and include screenshots for layout or chart changes. Never commit API keys, cached lottery data, or browser-local storage exports.
