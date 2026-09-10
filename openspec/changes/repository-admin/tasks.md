## 1. Service layer

- [ ] 1.1 Add `createRepository` (name, description) and map the created repository into the domain; verify unit tests for the mapper and validation
- [ ] 1.2 Add `deleteRepository` and extend repository metadata mapping with ARN, account id, default branch, and clone URLs from `GetRepository`; verify unit tests cover the mapping

## 2. Commands

- [ ] 2.1 Add the Create Repository command with name/description/default-branch prompts and refresh on success; verify the new repository appears in the view
- [ ] 2.2 Add the Delete Repository command with typed-name confirmation and no-API-call abort on mismatch; verify the abort path makes zero calls
- [ ] 2.3 Add Copy Clone URL commands (HTTPS and GRC) with clipboard confirmation; verify clipboard content and the info message
- [ ] 2.4 Add the Open in AWS Console command with a region-aware URL; verify the URL is built from the configured region and logged

## 3. Metadata display

- [ ] 3.1 Add repository node hover tooltips and a details quick pick with copyable metadata entries; verify the details command shows ARN, default branch, and clone URLs

## 4. Contributions and validation

- [ ] 4.1 Register commands and repository-node context menus in `package.json`; verify `npm run check-types`, `npm run lint`, and `npm test` pass