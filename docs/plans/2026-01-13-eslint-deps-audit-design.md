# ESLint + Dependency Audit Design

## Context
- There is a TypeScript type error in `src/lib/__tests__/holdings.test.ts` due to implicit array literal typing.
- ESLint fails with a duplicate `@next/next` plugin resolution because two `node_modules` trees are present (main repo + worktree).
- Dependencies need a controlled upgrade to latest versions.

## Goals
- Fix the TypeScript test error without changing runtime behavior.
- Establish a single, predictable ESLint resolution path in the worktree.
- Update dependencies to latest versions and address any breaking changes.
- Keep all changes scoped to the existing `hardening` worktree/PR.

## Non-Goals
- No new features or behavior changes in the app.
- No rework of the overall linting setup beyond resolution consistency.

## Proposed Changes
1. **TypeScript test typing**
   - Import `Group` from `src/lib/holdings.ts`.
   - Declare `const groups: Group[] = [...]` in `holdings.test.ts`.

2. **ESLint consolidation**
   - Keep `.eslintrc.json` in the worktree as the single config.
   - Ensure `next lint` is executed from the worktree so it resolves plugins from the local `node_modules`.
   - If needed, adjust the lint script to resolve plugins relative to the worktree.

3. **Dependency audit and upgrade**
   - Use `ncu -u` to bump dependencies to latest.
   - Run `npm install` to update `package-lock.json`.
   - Fix any API or config changes introduced by upgrades.

## Validation
- `npm run lint`
- `npm test`
- `npm run build` (best effort; document if unavailable)

## Risks
- Major dependency upgrades may require minor config/code updates.
- ESLint resolution can still be impacted if lint is run from the wrong directory.
