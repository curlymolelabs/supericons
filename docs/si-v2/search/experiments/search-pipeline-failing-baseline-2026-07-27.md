# Search pipeline failing baseline

Date: 2026-07-27

Source revision: `a803d7cbd`

Fixture: `search-v2-surface-equivalence-20260727`

Fixture SHA-256: `5600e10c67c050909bfdb59503b5b88a57e8625a033a3d38874694d4fb1fe0b3`

Command:

```text
node scripts/verify-search-v2-surface-equivalence-baseline.mjs --capture-baseline
```

## Result

- Evaluated cases: 21
- Local failures: 5
- Hosted error fixture skipped in the local-only baseline: 1
- Exit status: successful baseline capture, with at least one failure required

The five local failures were all false zeros:

| Case | Query |
| --- | --- |
| `gap_torrent_magnet` | `torrent magnet` |
| `gap_view_categories` | `view categories` |
| `gap_go_up` | `go up` |
| `gap_browser_cookies` | `browser cookies` |
| `gap_ip_blocked` | `ip blocked` |

The other evaluated positive cases returned a reviewed-relevant icon in the top three. The nonsense case returned an honest zero.

This is baseline evidence, not a passing release gate. The verifier must run without `--capture-baseline` and exit successfully before promotion.
