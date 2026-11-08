# Development

## Requirements

- Bun and stable Rust.
- The [Tauri development prerequisites](https://v2.tauri.app/start/prerequisites/) for your system.
- On Windows, MSVC build tools and [Strawberry Perl](https://strawberryperl.com/).
- On macOS, Xcode command-line tools and Perl.

### Perl for native builds

On Windows and macOS, Rekordbox support builds OpenSSL from source. Its
[build process requires Perl](https://docs.rs/openssl/latest/openssl/#vendored).
Perl is a development dependency; people who install a Cue release do not need it.

On Windows, install Strawberry Perl with its installer and ensure its Perl
executable is on `PATH`. Open a new terminal after installation, then check:

```sh
perl -v
```

On macOS, check the same command before building. If Perl is missing, install it
and ensure it is on `PATH`.

If Cargo reports `Command 'perl' not found`, the terminal running Cargo cannot
find Perl. Fix the installation or `PATH`, then restart the terminal (and your
editor if it opens the terminal). No repository-specific path override is needed.

## Run Cue

```sh
bun install --frozen-lockfile
bun tauri dev
```

The frontend starts immediately. Cargo builds the application and its Rekordbox
library dependency together. The first native build can take several minutes.
No separate helper build or executable is needed.

Both crates share one Cargo workspace and lockfile. The root Cargo.toml explains
the temporary SQLx revision pin. Rekordbox access and its native dependencies
are enabled only on Windows and macOS. Linux keeps Collection and tags.

## Review components

```sh
bun run storybook
```

Open http://localhost:6006. Components keep their implementation, stories, and
tests in the same folder. Screenshots made during review belong in the chat.

## Checks

```sh
bun run format
bun run format:check
bun run test
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
bun tauri build --no-bundle
```

## Rekordbox orchestration tests

`cargo test --workspace` uses fake library responses to check Cue's playlist
policy, scheduling, retries, and ownership persistence. These tests do not require
Rekordbox or a local library. Windows and macOS CI also compile the native rbox
adapter. Database and Rekordbox application behavior are tested upstream in rbox.

See the [Rekordbox crate](crates/rekordbox/README.md) for the responsibility split.

## Source code

Cue is licensed under GPL-3.0-only. Each release links to GitHub's Source code ZIP
for its release tag. Use the same release as the installed binary. The ZIP
includes both crates, license notices, build configuration, and Cargo.lock.

The unmodified rbox 0.3.0 source is available in its
[versioned ZIP](https://github.com/dylanljones/rbox/archive/refs/tags/v0.3.0.zip).
Cargo.lock lists exact dependency versions, checksums, and Git revisions. Registry
sources are available at `https://static.crates.io/crates/NAME/NAME-VERSION.crate`.
GitHub dependency sources are available at
`https://github.com/OWNER/REPO/archive/COMMIT.zip`, using the repository and commit
recorded in Cargo.lock.

From the release checkout, fetch locked Rust dependencies with
`cargo fetch --locked`. To collect their source locally, use
`cargo vendor --locked --versioned-dirs vendor`. Install frontend dependencies
with `bun install --frozen-lockfile` and build with `bun tauri build --no-bundle`.
Bun.lock records frontend dependency versions and integrity hashes; their package
sources and license notices are included in the packages fetched from npm.

GPLv3 section 6(d) permits these directions to sources on other public servers.
Release tags, dependency sources, license notices, and build instructions must
remain available while binaries are distributed. Distributors remain responsible
for that availability and must restore or mirror sources if an upstream disappears.
