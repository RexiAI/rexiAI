# 40-deploy — spec 020 neighborhood-business-landing

Stage 5c (Deploy Verifier). PR: https://github.com/RexiAI/rexiAI/pull/117

- Repo classification: frontend (Vercel Git integration connected; `Vercel` commit status present)
- PR head: `cbbc18c16626db37d93e1e86e058821a7c7038c9`
- Deploy URL: https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app
- Inspector: https://vercel.com/danielbueno76-4270s-projects/rexi-ai/fFhFFVe9Yg7KAUNiSAxAY8yMYGPJ
- Build status: pass (Vercel commit status `success` on head SHA)
- Health check status: fail (HTTP 302 → Vercel SSO / Deployment Protection, not 2xx)
- E2E verdict: fail (exit 1; blocked by the same protection wall — not attributable to app behavior)
- Timestamp: 2026-11-24T09:11:36Z
- Phase-3 attempt: 1 of 3

Attempt-1 result: FAIL (superseded by attempt 2 below)

## Routing

Health failure cause is identified, not code: the preview is behind Vercel
Deployment Protection (Vercel Authentication). The response is a 302 to
`vercel.com/sso-api`, served by Vercel's edge before the app runs. This is a
configuration-classed issue, but the repair needs a project-settings change
(disable preview protection, or provision a Protection Bypass for Automation
secret and send `x-vercel-protection-bypass`). Neither is a permitted stage-5c
command, and no bypass secret exists in this machine's environment. The
pipeline therefore STOPS and escalates to the human. Do not route to spec-coder;
the E2E failure is a consequence of the protection wall.

Once the human repairs the configuration, re-run stage 5c as attempt 2.

## Notes

- `VERCEL_TOKEN` is not set on this machine. The deployment was still resolved
  through the GitHub Deployments API, so this is a note only.
- `vercel inspect` / `vercel ls` failed with `TypeError: fetch failed`. The
  corporate TLS interception proxy (issuer `Inditex SSL Proxy RSA 2025`,
  root `ITX Root CA`) is not in the system trust store. Health check and E2E
  ran with that chain, extracted from the live TLS handshake, as `--cacert` /
  `NODE_EXTRA_CA_CERTS`. TLS verification was not disabled.
- The Vercel bot PR comment references an earlier, canceled deployment
  (`4misQe3diy4Z4ZYqrKRtAP8LGYGF`). It is not the head deployment and was ignored.

## Evidence

### Deployment identity (commit status)
command: `gh api repos/RexiAI/rexiAI/commits/cbbc18c16626db37d93e1e86e058821a7c7038c9/statuses`
exit: 0
at: 2026-11-24T09:10:00Z
```
success	https://vercel.com/danielbueno76-4270s-projects/rexi-ai/fFhFFVe9Yg7KAUNiSAxAY8yMYGPJ	2026-11-24T09:05:36Z
pending	https://vercel.com/danielbueno76-4270s-projects/rexi-ai/fFhFFVe9Yg7KAUNiSAxAY8yMYGPJ	2026-11-24T09:03:51Z
```

### Deployment URL (GitHub Deployments API, filtered by sha)
command: `gh api "repos/RexiAI/rexiAI/deployments?sha=cbbc18c16626db37d93e1e86e058821a7c7038c9"` + `/deployments/8023275000/statuses`
exit: 0
at: 2026-11-24T09:10:30Z
```
8023275000	Preview	2026-11-24T09:05:36Z
success	https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app	https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app
```

### Health check
command: `curl -sS --cacert proxy-ca.pem -D - https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app/`
exit: 0 (HTTP 302)
at: 2026-11-24T09:11:27Z
```
HTTP/2 302
location: https://vercel.com/sso-api?url=https%3A%2F%2Frexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app%2F&nonce=...
server: Vercel
set-cookie: _vercel_sso_nonce=...; Secure; HttpOnly; SameSite=Lax
x-robots-tag: noindex
x-vercel-id: cdg1::z24h6-1795511487816-398c58cf62cf
```

### E2E against live preview
command: `GATE_RUNS_FILE=$PWD/runs.jsonl NODE_EXTRA_CA_CERTS=proxy-ca.pem REXI_E2E_SITE_URL=https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app node tests/e2e/landing.e2e.ts`
exit: 1
at: 2026-11-24T09:11:36Z
```
2026-11-24T09:11:36.983Z [e2e:landing] target: https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app
[e2e:landing] journey failed: timed out after 45000ms waiting for the landing hero
```

---

# Attempt 2

- PR head re-confirmed: `cbbc18c16626db37d93e1e86e058821a7c7038c9` (unchanged)
- Deploy URL: https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app (same deployment, inspector id `fFhFFVe9Yg7KAUNiSAxAY8yMYGPJ`)
- Config repair (by the owner): Vercel Protection Bypass for Automation secret, loaded via direnv as `VERCEL_AUTOMATION_BYPASS_SECRET`. The value is masked as `***MASKED***` everywhere and never printed.
- Build status: pass
- Health check status: pass (HTTP 200, real landing HTML)
- E2E verdict: pass (exit 0, AC-020-23…27 PASSED)
- Timestamp: 2026-11-24T09:19:51Z
- Phase-3 attempt: 2 of 3

Verdict: PASS

## Notes

- First E2E run in this attempt (09:18:23Z) exited 1 with `timed out after 45000ms waiting for the landing hero`.
  - Cause: verifier-side environment, not app behavior. Headless Chrome uses its own NSS trust store, so `NODE_EXTRA_CA_CERTS` does not cover it, and Chrome rejected the corporate TLS-interception chain. Reproduced with `google-chrome --headless=new --dump-dom <url>`: `net::ERR_CERT_AUTHORITY_INVALID`, `handshake failed`, empty DOM.
  - Fix (harness-side only, no repo change): `REXI_E2E_CHROME=/tmp/opencode/chrome-proxy-pin.sh`. This wrapper adds `--ignore-certificate-errors-spki-list=` with the SPKI SHA-256 pins of only the two ITX proxy CA certs (`Inditex SSL Proxy RSA 2025`, `ITX Root CA`). Pins:
    - `ft6/eLcOI7bGV2mPLIbd8ByA1TMiHzwq6Ch/wWLoJ3s=`
    - `irJJ+GDga1+dssoernak+i3hyvere1i9qhsUF9DKLUQ=`
  - Certificate errors are not ignored in general.
  - CI reproducibility note: on an un-intercepted runner the wrapper is unnecessary.
- `GATE_RUNS_FILE=$PWD/runs.jsonl` exported.

## Evidence

### Head re-confirmation
command: `gh pr view 117 --json headRefOid -q .headRefOid`
exit: 0
at: 2026-11-24T09:18:10Z
```
cbbc18c16626db37d93e1e86e058821a7c7038c9
```

### Health check (with protection bypass header)
command: `curl -sS --cacert proxy-ca.pem -H "x-vercel-protection-bypass: ***MASKED***" -D - https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app/`
exit: 0
at: 2026-11-24T09:18:17Z
```
http=200 time=0.668508
HTTP/2 200
content-type: text/html; charset=utf-8
server: Vercel
x-vercel-id: cdg1:cdg1:cdg1::752br-1795511897748-d9add1921405
<title>RexiAI: apps a medida para plomeros y tiendas de Miami
```

### E2E run 1 (browser blocked by proxy CA, environment)
command: `GATE_RUNS_FILE=$PWD/runs.jsonl NODE_EXTRA_CA_CERTS=proxy-ca.pem REXI_E2E_SITE_URL="<url>/?x-vercel-protection-bypass=***MASKED***&x-vercel-set-bypass-cookie=true" node tests/e2e/landing.e2e.ts`
exit: 1
at: 2026-11-24T09:18:23Z
```
2026-11-24T09:18:23.330Z [e2e:landing] target: https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app/?x-vercel-protection-bypass=***MASKED***&x-vercel-set-bypass-cookie=true
[e2e:landing] journey failed: timed out after 45000ms waiting for the landing hero
```

### E2E run 2 (Chrome SPKI-pinned to proxy CA)
command: `GATE_RUNS_FILE=$PWD/runs.jsonl NODE_EXTRA_CA_CERTS=proxy-ca.pem REXI_E2E_CHROME=/tmp/opencode/chrome-proxy-pin.sh REXI_E2E_SITE_URL="<url>/?x-vercel-protection-bypass=***MASKED***&x-vercel-set-bypass-cookie=true" node tests/e2e/landing.e2e.ts`
exit: 0
at: 2026-11-24T09:19:49Z
```
2026-11-24T09:19:49.451Z [e2e:landing] target: https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app/?x-vercel-protection-bypass=***MASKED***&x-vercel-set-bypass-cookie=true
2026-11-24T09:19:51.012Z [e2e:landing] ok: AC-020-24: eyebrow is "Apps a medida para tu negocio" (got "Apps a medida para tu negocio")
2026-11-24T09:19:51.015Z [e2e:landing] ok: AC-020-24: headline is "Tú me lo cuentas. Yo lo construyo." (got "Tú me lo cuentas. Yo lo construyo.")
2026-11-24T09:19:51.019Z [e2e:landing] ok: AC-020-24: Miami appears on the landing
2026-11-24T09:19:51.022Z [e2e:landing] ok: AC-020-24: Salamanca is absent from the hero
2026-11-24T09:19:51.024Z [e2e:landing] ok: AC-020-24: Salamanca is absent from the title ("RexiAI: apps a medida para plomeros y tiendas de Miami")
2026-11-24T09:19:51.024Z [e2e:landing] ok: AC-020-25: $1,200 appears on the landing
2026-11-24T09:19:51.024Z [e2e:landing] ok: AC-020-25: $600 appears on the landing
2026-11-24T09:19:51.024Z [e2e:landing] ok: AC-020-25: no "30 EUR" text on the landing
2026-11-24T09:19:51.025Z [e2e:landing] ok: AC-020-25: no EUR text on the landing
2026-11-24T09:19:51.025Z [e2e:landing] ok: AC-020-25: no euro sign on the landing
2026-11-24T09:19:51.025Z [e2e:landing] ok: AC-020-25: no "SaaS" text on the landing
2026-11-24T09:19:51.027Z [e2e:landing] ok: AC-020-26: the About bio is present
2026-11-24T09:19:51.027Z [e2e:landing] ok: AC-020-26: the About bio names Valladolid
2026-11-24T09:19:51.029Z [e2e:landing] ok: AC-020-26: the secondary CTA href is https://wa.me/34644409229 (got "https://wa.me/34644409229")
2026-11-24T09:19:51.032Z [e2e:landing] ok: AC-020-26: the secondary CTA names WhatsApp
2026-11-24T09:19:51.034Z [e2e:landing] ok: AC-020-26: the FAQ renders 4 pairs (got 4)
2026-11-24T09:19:51.036Z [e2e:landing] ok: AC-020-26: the nav label is Hablemos (got "Hablemos")
2026-11-24T09:19:51.038Z [e2e:landing] ok: AC-020-27: exactly one service offer (got 1)
2026-11-24T09:19:51.041Z [e2e:landing] ok: AC-020-27: the primary CTA targets #booking (got "#booking")
2026-11-24T09:19:51.055Z [e2e:landing] ok: AC-020-27: the primary CTA is clickable
2026-11-24T09:19:51.055Z [e2e:landing] ok: AC-020-27: the CTA reaches #booking (hash "#booking", inViewport true)
2026-11-24T09:19:51.073Z [e2e:landing] ok: AC-020-27: the EN switcher is present
2026-11-24T09:19:51.087Z [e2e:landing] ok: AC-020-27: the English headline is "You tell me. I build it." (got "You tell me. I build it.")
2026-11-24T09:19:51.087Z [e2e:landing] ok: AC-020-27: the document title changes with the locale
2026-11-24T09:19:51.117Z [e2e:landing] ok: AC-020-27: the ES switcher is present
2026-11-24T09:19:51.126Z [e2e:landing] ok: AC-020-27: the Spanish title returns (got "RexiAI: apps a medida para plomeros y tiendas de Miami")
2026-11-24T09:19:51.126Z [e2e:landing] AC-020-23…27 PASSED
```
