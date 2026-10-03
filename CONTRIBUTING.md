# Contributing

## Development setup

```bash
npm install
npm run typecheck
npm run lint
npm test
```

## Package layout

| Package | Path |
| --- | --- |
| `@algoplot/core` | `packages/core` |
| `@algoplot/python` | `packages/python` |
| `@algoplot/react` | `packages/react` |
| `@algoplot/remark` | `packages/remark` |
| `@algoplot/web` | `packages/web` |

## Build order

Packages must be built in dependency order:

```bash
npm run build
```

This runs: core → python → react → remark → web.

## Pull requests

- Keep changes focused; one concern per PR.
- Update `CHANGELOG.md` with a bullet under `[Unreleased]`.
- Ensure `npm run typecheck`, `npm run lint`, and `npm test` pass before requesting review.

## Publishing

```bash
npm run build
npm publish -w @algoplot/core
npm publish -w @algoplot/python
npm publish -w @algoplot/react
npm publish -w @algoplot/remark
npm publish -w @algoplot/web
```

Publish in the order above — downstream packages depend on upstream tarballs.
