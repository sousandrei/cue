# Cue Rekordbox library

This GPL-3.0-only workspace crate connects Cue to rbox 0.3.0 on Windows and macOS.
Linux builds expose an unsupported-platform response without native dependencies.

Cue manages every playlist in Rekordbox's root **Cue** folder from its current
tags. Playlists outside that folder are left alone.

The native adapter delegates database writes, process detection, and playlist
index handling to rbox. Cue handles scheduling, status, and tag reconciliation.

Run `cargo test --workspace` for orchestration tests using a fake library.
Tests do not require Rekordbox or a local library.

See [CONTRIBUTING](../../CONTRIBUTING.md) for build requirements and
[source information](../../CONTRIBUTING.md#source-code).
