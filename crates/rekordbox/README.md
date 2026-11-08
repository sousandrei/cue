# Cue Rekordbox library

This GPL-3.0-only workspace crate uses rbox 0.3.0. Cue calls it directly through
typed Rust functions. It has no executable, sidecar, or JSON protocol.
See the root [license](../../LICENSE.md) and [source guide](../../CONTRIBUTING.md#source-code).

On Windows and macOS it reads Rekordbox metadata, detects whether Rekordbox is
running, and reconciles Cue playlists. On Linux, native Rekordbox dependencies
are excluded and its access functions return an unsupported-platform error.

## Database safeguards

Snapshot reads open the library in read-only mode with a short busy timeout and
close after each snapshot. The application watches the database directory and
refreshes metadata while Rekordbox is open. Its backend owns watching, retries,
pending work, and persistence; the frontend displays that state.

Matching uses full filesystem paths. Duplicate Rekordbox records for one file
are ambiguous. Unknown BPM and key remain absent.

Each tag maps to a same-named playlist inside the root Cue folder. An existing
matching playlist in that folder is adopted, retaining its ID and replacing its
contents with exactly the imported tracks carrying that tag. Folders,
intelligent playlists, and duplicate-name ambiguities are rejected. Playlists
outside Cue are not adopted or changed. Removing a tag removes its managed playlist.

Cue's own database is the only ownership record. Owned IDs that no longer exist
in the library are forgotten, so those playlists are adopted by name or
recreated. If Cue exits after a sync but before saving ownership, the next sync
adopts the same folder and playlists by name.

Writes require Rekordbox to be closed and its database journal to be settled.
Sync backs up the database, internal playlist index, and ownership record;
changes a temporary copy; verifies SQLite integrity; checks that the source has
not changed; and installs the result. An index-install failure restores the
original files. Backups live under `rekordbox-backups` in Cue's application data
directory.

Rekordbox's internal `masterPlaylists6.xml` is part of its native library. Cue
does not require a user-exported XML file. Any test copy must include that index.

An interrupted process can leave `.cue-sync.lock` beside the database. Do not
remove it while a sync is active. If a hard crash interrupts installation,
inspect the retained backup before resuming. Error rollback cannot guarantee
recovery from termination or power loss between filesystem replacements.

## Validation

Normal tests include a check that a read-only connection rejects writes. The
opt-in `bun run test:rekordbox` test calls this library against a temporary copy
and checks that the real database and index remain unchanged. Failed copies
remain under ignored artifacts/ for inspection.
