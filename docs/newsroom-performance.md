# Newsroom Performance v1

Manual-first performance tracking for posted Facebook and X outputs.

- Output lifecycle: draft → ready → posted.
- `post_url` and `posted_at` live on `distribution_items`.
- Metrics are append-only snapshots in `performance_snapshots`.
- Exposure = max(views, reach).
- Baseline = median latest exposure of at least 3 other posted outputs on the same channel.
- Classes: learning (not enough peers), dead (<0.5x), normal (<1.5x), rising (<3x), breakout (>=3x).
- No Meta/X API is used in v1; metrics are entered manually.
