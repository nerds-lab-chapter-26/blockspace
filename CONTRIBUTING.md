# Contributing to blockspace

Thanks for taking the time to contribute.

## Getting started

```bash
git clone https://github.com/nerds-lab-chapter-26/blockspace.git
cd blockspace
npm install
npm test
```

## Before opening a pull request

- Run `npm run typecheck` and `npm test` locally — both must pass.
- Keep pull requests focused on one change. Unrelated cleanup makes review harder.
- If you're changing public behavior (types, exports, block schema), update the relevant section of `PRD.md` in the same PR.
- New behavior needs a test. Bug fixes should include a test that fails before the fix and passes after.

## Reporting bugs

Open an issue with a minimal reproduction. "It doesn't work" without steps to reproduce will get bounced back with a request for more detail.

## Proposing features

Check `PRD.md` first — a lot of scope decisions (what's in V1, what's explicitly out) are already made there. If your idea fits a listed non-goal, open a discussion first rather than a PR, so we can agree on direction before you spend time on it.

## Code of conduct

Be respectful. Disagreements about technical direction are fine and expected; personal attacks are not.
