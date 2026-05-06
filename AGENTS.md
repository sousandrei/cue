# Synqed: Agent Instructions & Best Practices

This document defines the technical standards and workflows for Synqed. All agents and contributors must follow these guidelines to maintain codebase integrity and performance.

## ⚛️ React & Frontend Standards

- **React 19**: Leverage modern React patterns. Use functional components and hooks exclusively.
- **Routing**: Use **TanStack Router**. All routes should be defined in `src/routes/` using file-based or explicit routing as established.
- **Data Fetching & State**:
  - Use custom hooks (e.g., `useConfig`, `useDownload`) to bridge the UI with Tauri backend commands.
  - Prefer **TanStack Table** for library views.
  - **Persistence**: UI state (e.g., configurations, view preferences) is persisted in the Tauri backend to ensure consistency across sessions.
- **Styling**:
  - **Tailwind CSS v4**: Use utility classes for styling.
  - **CVA & clsx**: Use `class-variance-authority` and `clsx`/`tailwind-merge` for complex component variants (see `src/lib/utils.ts`).
  - **Aesthetics**: Maintain the high-performance, polished look using Framer Motion for transitions.

## 🏗 Web Development Best Practices

- **Accessibility**: Use **Radix UI** primitives to ensure components meet ARIA standards.
- **Performance**: Optimize heavy renders. Use `React.memo` or `useMemo` only when empirical evidence suggests a bottleneck.
- **Type Safety**: No `any`. Define robust interfaces for all data structures, especially those crossing the Tauri bridge.

## 🛰 State Management with Tauri

- **Command Pattern**: Treat Tauri commands (`invoke`) as the primary way to interact with the "Server" (Rust).
- **Events**: Use Tauri's event system (`listen`, `emit`) for real-time updates (e.g., download progress). 
- **Persistence**: Trust the SQLite database as the source of truth. The frontend should reflect the database state, refreshing via commands after mutations.
- **Path Resolution**: Never hardcode file paths. Always use Tauri's `path` API to resolve system directories (AppConfig, Audio, etc.) to ensure cross-platform compatibility.

## 🛠 Tooling & Validation

### 🟢 Formatting & Linting
- **Frontend**: The project uses **Biome**.
  - **Mandate**: Run `bun run format` before finishing any task.
  - **Check**: `bun run format:check` must pass.
- **Rust**:
  - **Format**: Run `cargo fmt --all` in `src-tauri/`.
  - **Lint**: Run `cargo clippy --all-targets --all-features -- -D warnings` to catch common mistakes and enforce idiomatic Rust.

### 🧪 Testing & Validation
- **Rust**:
  - Implement unit tests for core logic (DB operations, XML generation).
  - Use `#[cfg(test)]` blocks in modules.
  - Command: `cargo test` within `src-tauri/`.
- **Frontend**:
  - Verification: Always manually verify UI changes in the Tauri development window.
- **Build Check**:
  - Run `bun tauri build --no-bundle` to ensure the project compiles and is ready for packaging without performing a full heavy bundle.

### 🏁 Pre-Flight Checklist
Before concluding a directive, ensure:
1. `bun run format:check` passes.
2. `cargo fmt --all -- --check` passes in `src-tauri/`.
3. `cargo clippy` passes without warnings.
4. `cargo test` passes.
5. `bun tauri build --no-bundle` completes successfully.


## 📝 Development Lifecycle

1. **Research**: Map dependencies and understand the current implementation.
2. **Strategy**: Propose a plan before making changes.
3. **Execution**:
   - Apply surgical, idiomatic changes.
   - **Lint/Format**: Run `bun run format`.
   - **Verify**: Run `cargo test` and check the UI.
4. **Validation**: Confirm the fix/feature works as intended without regressions.
