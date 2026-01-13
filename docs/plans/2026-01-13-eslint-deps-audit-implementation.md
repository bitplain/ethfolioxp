# ESLint + Dependency Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the TypeScript test typing error, stabilize ESLint plugin resolution in the worktree, and update dependencies to latest with verified lint/test/build.

**Architecture:** Keep changes minimal and local: export the `Group` type for test reuse, update lint invocation to resolve plugins from the worktree, and perform controlled dependency upgrades with validation and minimal fixes.

**Tech Stack:** Next.js, TypeScript, ESLint, Vitest, Prisma, npm

---

### Task 1: Reproduce the TypeScript error baseline

**Files:**
- Read: `src/lib/__tests__/holdings.test.ts`
- Read: `src/lib/holdings.ts`

**Step 1: Run typecheck to confirm failure**

Run: `npx tsc --noEmit`

Expected: FAIL with a type error pointing at `src/lib/__tests__/holdings.test.ts` because the inferred literal types are not compatible with the `Group` shape.

**Step 2: Commit the baseline logs (optional)**

Skip commit; we will fix and commit in Task 2.

---

### Task 2: Export Group type and fix the test typing

**Files:**
- Modify: `src/lib/holdings.ts`
- Modify: `src/lib/__tests__/holdings.test.ts`

**Step 1: Export the Group type**

Update `src/lib/holdings.ts`:

```ts
export type Group = {
  tokenId: string;
  direction: "IN" | "OUT";
  _sum: { amount: Prisma.Decimal | null };
};
```

**Step 2: Import and use Group in the test**

Update `src/lib/__tests__/holdings.test.ts`:

```ts
import type { Group } from "../holdings";

const groups: Group[] = [
  { tokenId: "t1", direction: "IN", _sum: { amount: new Prisma.Decimal("2") } },
  { tokenId: "t1", direction: "OUT", _sum: { amount: new Prisma.Decimal("1.5") } },
  { tokenId: "t2", direction: "OUT", _sum: { amount: new Prisma.Decimal("5") } },
  { tokenId: "t2", direction: "IN", _sum: { amount: new Prisma.Decimal("5") } },
];
```

**Step 3: Re-run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS with no type errors.

**Step 4: Commit**

```bash
git add src/lib/holdings.ts src/lib/__tests__/holdings.test.ts
git commit -m "fix: export Group type and type holdings test"
```

---

### Task 3: Stabilize ESLint plugin resolution

**Files:**
- Modify: `package.json`

**Step 1: Reproduce lint error (if present)**

Run: `npm run lint`

Expected: FAIL with duplicate `@next/next` plugin resolution in environments with two `node_modules`.

**Step 2: Update lint script to resolve plugins locally**

Update `package.json`:

```json
{
  "scripts": {
    "lint": "next lint --resolve-plugins-relative-to ."
  }
}
```

**Step 3: Re-run lint**

Run: `npm run lint`

Expected: PASS or only regular lint rule failures (no plugin resolution error).

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: stabilize eslint plugin resolution"
```

---

### Task 4: Upgrade dependencies to latest

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Upgrade to latest versions**

Run: `npx npm-check-updates -u`

Expected: `package.json` updated to latest versions.

**Step 2: Install updated dependencies**

Run: `npm install`

Expected: `package-lock.json` updated, no install errors.

**Step 3: Run lint/test/build checks**

Run: `npm run lint`  
Run: `npm test`  
Run: `npm run build`

Expected: All pass. If failures occur, fix minimally and re-run the failing command until green.

**Step 4: Commit dependency updates**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade dependencies to latest"
```

---

### Task 5: Verify and document audit status

**Files:**
- Modify (if needed): `README.md`

**Step 1: Check audit report**

Run: `npm audit`

Expected: No high/critical issues; document any remaining issues with rationale.

**Step 2: Document any required follow-ups**

If audit warnings remain, add a short note to `README.md` under a "Security" or "Audit" section describing why they remain and the mitigation plan.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: note remaining audit items"
```
