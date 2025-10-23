# StarSpot Repository Migration

The StarSpot application has been extracted from the FluxStudio monorepo into its own Git repository.

## Remote repository
- GitHub SSH URL: `git@github.com:kentin0-fiz0l/Starspot.git`
- Default branch: `main`

To obtain the StarSpot codebase, clone the remote into a sibling directory of this project:
```bash
cd /workspace
git clone git@github.com:kentin0-fiz0l/Starspot.git
```

## Working with the standalone repo
Once cloned, manage StarSpot development from the new repository directory:
```bash
cd /workspace/Starspot
npm install
npm run dev
```

Push changes upstream with the configured remote:
```bash
git add <files>
git commit -m "Your message"
git push origin main
```

All StarSpot work should occur in the standalone repository rather than inside FluxStudio.
