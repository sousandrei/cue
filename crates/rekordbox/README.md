# Cue Rekordbox library

This GPL-3.0-only workspace crate uses rbox 0.3.0. Cue calls it directly through
typed Rust functions. It has no executable, sidecar, or JSON protocol.
See the root [license](../../LICENSE.md) and [source guide](../../CONTRIBUTING.md#source-code).

On Windows and macOS it reads Rekordbox metadata and orchestrates Cue playlists.
On Linux, native Rekordbox dependencies are excluded and access functions return
an unsupported-platform error.

## Responsibilities

rbox owns Rekordbox database operations, process detection, and the internal
playlist index. Cue calls its public mutation APIs with the default write guards
enabled. Cue does not replace database files, manage SQLite journals, rewrite
playlist XML, or implement database rollback and recovery. An rbox error is
reported to the user and retried after reading the current library again.

Cue owns path matching, tag-to-playlist policy, ownership persistence, scheduling,
and status presentation. Snapshot reads use a read-only rbox connection with a
short busy timeout. The backend watches the library directory and also polls to
recover from lost notifications. Failed reads invalidate the connection and track
metadata until a successful read restores them.

Matching uses full paths, compared as text. On Windows and macOS the comparison
ignores case and Unicode normalization form. Duplicate Rekordbox records for one
file are ambiguous. Unknown BPM and key remain absent.

Each tag maps to a same-named playlist inside the root Cue folder. An existing
matching playlist is adopted, retaining its ID and replacing its membership with
exactly the imported tracks carrying that tag. Deleted membership records do not
count as active tracks. Folders, intelligent playlists, and duplicate-name
ambiguities are rejected before mutations begin. Playlists outside Cue are not
adopted or changed. Removing a tag removes its managed playlist.

Cue's own database stores ownership after a successful reconciliation. Missing
owned IDs are forgotten and resolved by name again. A failed sequence can leave
some rbox operations completed; the next read reconciles that partial progress,
adopting newly created playlists by name without duplicating them. Cue does not
claim that an entire sync is an atomic operation.

Cue waits for a quiet period and a closed Rekordbox process before requesting
writes. An OS file lock on `rekordbox/sync.lock` in Cue's application data directory
serializes Cue requests. This lock does not coordinate with Rekordbox. Database
write safeguards remain rbox's responsibility.

## Validation

`cargo test --workspace` tests Cue's playlist decisions against an in-memory fake
of the rbox boundary, along with scheduling, error handling, and ownership storage.
No tests require or modify a real Rekordbox library. Rekordbox database and
application behavior belong to rbox's test suite. CI checks native compilation on
Windows and macOS as well as the Linux build.
