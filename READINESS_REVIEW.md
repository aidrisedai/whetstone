# Whetstone Readiness Review — 2026-08-06

Scheduled automated review. Findings below, verified by actually running the
checks (not just reading config).

## Bottom line

**`main` is in good shape.** **The repo is not**, because the branch new
automated sessions actually start from is not `main` and is missing what
`main` already has. That mismatch is the #1 blocker — everything else is
downstream of it.

## What's verified working, on `main`

Checked out `origin/main` (`8a98d7b`) fresh and ran every check independently:

| Check | Result |
| --- | --- |
| `npm ci` | 101 packages, **0 vulnerabilities** |
| `npm run typecheck` | clean |
| `npm test` (vitest) | **40/40 passing**, 5 test files (`lib/builders`, `lib/format`, `lib/messages`, `lib/profile`, `lib/scoring`) |
| `npm run build` | production build succeeds, all 16 API routes + pages compile |
| CI (`.github/workflows/ci.yml`, runs on every push/PR to `main`) | green on both merges (#1, #2) |

Two PRs landed this cycle and are why `main` looks healthy:
- **#1** — added the vitest suite + CI workflow (was previously zero test coverage).
- **#2** — `npm audit fix` for 3 high-severity vulns (Next.js SSRF/cache-confusion/DoS chain, PostCSS XSS/path traversal, sharp/libvips CVEs). `main` now audits clean.

## Blockers, in priority order

### 1. (Critical) The GitHub default branch is not `main`
`git remote show origin` reports HEAD branch `claude/serene-noether-VYueS`,
and a default-branch-only commit search for #2's commit message returns zero
results — confirming the *actual* GitHub default is that stale branch, not
`main`. `claude/serene-noether-VYueS` sits at `main`'s merge-base, i.e. **two
commits behind `main`**: no test suite, no CI, and the 3 high-severity
vulnerabilities are still present there.

Every new Claude Code session — including this one, whose designated branch
`claude/tender-curie-5nbgat` forks from that same stale point — inherits
none of the above. This is confirmed to already be a repeating problem: both
merged PRs' own descriptions note the work had been "built and verified by a
prior automated readiness check" on a branch that "never got a PR," i.e.
earlier sessions already built these exact fixes and they evaporated because
nothing forks from `main`.

**Fix:** GitHub → repo Settings → Branches → change the default branch to
`main`. One settings change stops the bleeding for every future session.

### 2. (High) 671 remote branches, 0 open PRs
Near-total branch sprawl from repeated automated sessions branching off the
stale default, most doing throwaway or duplicate work that never gets a PR.
This is a direct symptom of #1 — once new sessions fork from `main`, this
should stop accumulating at the same rate.

**Fix:** once #1 is resolved, bulk-delete branches with no open PR and no
recent unique commits ahead of `main`. Not urgent on its own, but it's
already made this review harder to do (had to disambiguate which of two
non-`main` "defaults" was real).

### 3. (Informational) One recent CI failure, already moot
`claude/tender-curie-hgp0bk`'s CI run got cancelled after 15 min — but that
branch is a redundant, unmerged duplicate of already-merged PR #2 (same
title, different branch). No action needed beyond pruning it along with the
rest of #2.

### No open issues, no open PRs
Both currently empty — nothing else pending review.

## Next steps

1. Switch the default branch to `main` (owner action, GitHub UI).
2. Re-point/delete branches that were forked from the stale default before
   the switch (including this session's own branch) so they don't shadow
   `main`'s fixes again.
3. Prune the 671-branch backlog once (1) is done.
4. `main` itself needs nothing further right now — typecheck, tests, build,
   and audit are all clean.
