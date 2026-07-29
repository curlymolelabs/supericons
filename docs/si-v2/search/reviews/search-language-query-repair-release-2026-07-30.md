# Search language and brand repair release

Date: 2026-07-30
Status: Railway and website verified; npm stage waiting for owner approval

## Release identity

- Source revision: `6514a841cc5041bad3ed9314386dbcc5dfa13107`
- Package version: `0.4.25`
- Railway deployment: `61fe6aa7-aa61-42ba-884d-466af9a92e6f`
- Railway image digest: `sha256:c65fe498fd50d1a92e7f76078f7b6a5d3893bf04f1efd00c3e807658aff8800b`
- Railway rollback deployment: `84443e56-93a4-40eb-9391-98f7e513a345`
- Website deployment: `6a6a497735044883fa5bbcc7`
- Website rollback deployment: `6a67697fec402812099efd9b`
- npm archive SHA-256: `d435db4b59e4429fae23a8988e4a17715c6ed3e1e4cacb46d3f72befa923fbc8`
- npm shasum: `6ea61ea55b480cca29a4c138e918966addc1fb2c`
- npm integrity: `sha512-ZJGLLMUmT8/5Vnh4piob3sWp1/7NSMVoXt2NjUS1ZulUqmVgsFQNBCJcb0QnDCX5f/h79pskxhdSahyMcjHYNw==`
- npm stage: `d6af7bd1-30a5-426a-8d00-8eac8c2880cc`

## What changed

The release improves common language, plural, compound, and brand searches while keeping honest zero results and strict library behavior.

- Spanish aliases include storage, nut, towel, wrench, and screw terms.
- `categories` resolves through the approved singular relationship.
- Plain `airflow` finds wind and ventilation icons.
- Apache Airflow and Alibaba Cloud requests resolve their exact brand icons before concept aliases.
- The website's default `locale: "en"` input is accepted by the hosted endpoint.
- The integrated public Supericons catalog contains 146 icons.

## Verification

- The focused language and brand corpus passed 26 of 26 cases.
- The shared source and built browser corpus passed 34 of 34 cases.
- Candidate and live Railway product gates passed all 39 cases through HTTP and MCP.
- The exact npm archive passed a clean installation and all 225 ordered stdio cases.
- Both approved search fingerprints remained unchanged.
- The exact archive has zero known npm vulnerabilities.
- Live browser checks passed for Apache Airflow, `almacen`, `categories`, and plain `airflow`.
- Railway health reports version 0.4.25, hosted-primary search, closed circuits, and no queued search requests.

## npm remaining step

The registry remains on `latest` 0.4.24. Version 0.4.25 is staged but is not public.

The staged archive was downloaded independently from npm and matched SHA-256 `d435db4b59e4429fae23a8988e4a17715c6ed3e1e4cacb46d3f72befa923fbc8`. Approve stage `d6af7bd1-30a5-426a-8d00-8eac8c2880cc`. After approval, confirm that `latest` is 0.4.25 and that a clean public install passes the package gate. If public verification fails, restore `latest` to 0.4.24.

## Integration note

The release branch is based directly on current `main`, but the main worktree contains unrelated uncommitted documents. Those files must be secured by their owning session before this branch is fast-forwarded into `main`.
