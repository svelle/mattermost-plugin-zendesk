# AGENTS.md

## Cursor Cloud specific instructions

This is a **Mattermost Zendesk Plugin** — a server plugin + React webapp that runs inside a Mattermost server. It is **not** a standalone application; the plugin bundle (`.tar.gz`) is deployed to a running Mattermost instance.

### Key facts

- **Go 1.24.7** (server) and **Node.js v24.13.1** (webapp, see `.nvmrc`). Go is pre-installed; Node must be installed via nvm.
- **npm** is the package manager for the webapp (`webapp/package.json`).
- Build system uses **GNU Make**; `build/setup.mk` auto-compiles helper tools (`build/bin/manifest`, `build/bin/pluginctl`) when any Make target is invoked.

### Common commands

All commands are documented in `Makefile` and `README.md`. Key ones:

| Task | Command |
|------|---------|
| Install Go tools | `make install-go-tools` |
| Lint (ESLint + golangci-lint) | `make check-style` |
| Tests (Go + Jest) | `make test` |
| TypeScript type check only | `cd webapp && npm run check-types` |
| Full build (all platforms) | `make dist` |
| Generate mocks | `make mock` |

### Known pre-existing issues

- `make check-style` fails with ~80 ESLint errors (import ordering, dot-location, etc.) and ~18 golangci-lint findings. These are pre-existing in the codebase.
- Go test `TestServeHTTPUserConnected` panics with nil pointer dereference — pre-existing test bug.
- `git describe --tags` may print `fatal: No names found` if no tags exist on the branch. This is harmless; the build still succeeds (version resolves to `0.0.0+<hash>`).

### Running the plugin

The plugin cannot run standalone. It requires a Mattermost Server (v6.2.1+) and a Zendesk account with an OAuth client. To deploy locally, set `MM_SERVICESETTINGS_SITEURL` and `MM_ADMIN_TOKEN` env vars and run `make deploy`. See `README.md` for full setup instructions.
