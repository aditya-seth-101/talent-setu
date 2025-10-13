# Talent-Setu monorepo

This repository is organized as a monorepo. Key setup notes:

- Centralized `.gitignore` at the repository root. Per-package `.gitignore` files were consolidated into the root file.
- Original per-package `.gitignore` files were preserved under `.gitignore-backups/` in case you need to restore package-specific rules.
- Some subprojects were previously separate git repositories. Their `.git` metadata was removed and the projects were absorbed into this monorepo.

If you prefer to keep a subproject as a git submodule, re-create it with:

    git submodule add <url> frontend/<subproject>

Happy hacking!
