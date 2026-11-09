# Cue Rekordbox library

This GPL-3.0-only workspace crate integrates Cue with rbox 0.3.0 through typed
Rust functions. Windows and macOS build the native adapter. Linux excludes its
native dependencies and returns an unsupported-platform response.

## Integration boundary

rbox owns Rekordbox database operations, process detection, and the internal
playlist index. The adapter calls its public mutation APIs with default write
guards enabled. Cue does not replace database files, manage SQLite journals, or
implement database rollback.

Cue owns path matching, tag reconciliation, request scheduling, status events,
and persistence of the last successful playlist IDs. Snapshot reads use a
read-only rbox connection with a short busy timeout. The monitor watches the
library directory and polls periodically to recover from lost notifications.
Failed reads invalidate connection and track metadata until a successful read.

## Reconciliation contract

The root **Cue** folder is fully managed. Current Cue tags define its playlists
and their exact membership of imported tracks. Entries without a corresponding
tag are removed, including untracked playlists left by an interrupted sync.
Duplicate names and incompatible child types are reconciled through rbox's
public operations. Deleting an unwanted child folder delegates deletion of its
descendants to rbox. Playlists outside the root Cue folder are left alone.
Duplicate root folders named Cue require manual resolution.

Stored IDs help retain stable playlist IDs when possible; they do not define the
managed scope. Desired tracks and retained memberships are read before mutations.
If an operation fails after earlier operations completed, the next sync rereads
the folder and reconciles it against current tags. The full sync is not atomic.

Matching uses full paths, ignoring case and Unicode normalization form on
Windows and macOS. Multiple Rekordbox records for the same path are ambiguous
and excluded from playlist membership. Deleted membership records do not count
as active tracks. Unknown BPM and key remain absent.

## Scheduling and persistence

The application monitor owns debounce, closed-process gating, retries, and
`rekordbox://updated` events. An OS file lock at `rekordbox/sync.lock` in Cue's
application data directory serializes Cue write requests. This lock coordinates
Cue processes; rbox owns database write safeguards.

The last successful folder and playlist IDs are stored in Cue's SQLite
`rekordbox_state` table, keyed by the selected library path. Reconciliation also
works without those records, including after partial progress or changed tags.

## Tests

Run `cargo test --workspace`. A fake library boundary tests Cue's reconciliation
policy without a Rekordbox installation or local library. Monitor tests cover
scheduling, status invalidation, and filesystem notifications. Cue database tests
cover persistence. Rekordbox database and application behavior belong upstream
in rbox. CI checks the native adapter on Windows and macOS and the Linux build.

See [CONTRIBUTING](../../CONTRIBUTING.md) for native build requirements and
[source information](../../CONTRIBUTING.md#source-code).

## Saved track analysis

`read_track_analysis` locates the selected library through rbox, opens a read-only
connection, and resolves the matched track's analysis path against rbox's analysis
root. `read_analysis` parses those files without modifying them. RGB detail is
preferred, with three-band and monochrome fallbacks. Beat timestamps include the
saved grid correction. Detail samples use ANLZ's 150 Hz timebase; preview-only
waveforms use the playback duration supplied by the UI.

Waveforms are reduced to at most 65536 peak-preserving time buckets. A bounded
in-memory cache keeps eight parsed tracks and invalidates entries when analysis
file paths, lengths, or modification times change. Missing analysis returns
`None`; optional unreadable sections permit a lower-detail fallback. This reads
saved analysis and does not run Rekordbox's analysis engine.

To check a local track without changing Rekordbox:

```sh
cargo run -p cue-rekordbox --example inspect_analysis -- filename-fragment
```
