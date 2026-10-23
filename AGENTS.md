# Codex development instructions for Dark Studio

## Product intent
- This is a **desktop video editor**. The user interacts with Codex via **ChatGPT/Codex outside the app**, never in a chat widget inside the editor.
- The home screen lists projects; the editor manipulates scenes, clips, and assets.
- Runtime data is saved in separate local folders: %USERPROFILE%\DarkStudio\projects\<UUID>\project.json. Do not commit user projects or media to this public repository by default.
- Remote/cloud Codex cannot automatically access local Windows folders. If the user wants remote edits, request/import a project JSON or use an explicitly authorized private sync. Never claim invisible local access.

## Project files
- Schema: src/model/project.ts
- Safe edit operations: src/model/operations.ts
- Local CLI: npm run project -- list | show <id> | validate <id> | apply <id> <ops.json> | create <name> | import <json>.
- Prefer validated atomic CLI edits over direct writes. Preserve IDs, use frame counts at 30 FPS, do not make up facts/evidence or third-party media rights.
- A local project may refer to local asset URLs that do not exist in a remote workspace. Do not invent or replace assets with broken URLs.

## Architecture
- React/Tauri frontend under src/, desktop host under src-tauri/.
- Local Node service under apps/agent/ remains for project persistence, media streaming and MP4 render; it no longer embeds the Codex SDK.
- CI includes TypeScript, unit tests, frontend build, native Windows cargo check and a short Remotion MP4 smoke render.
- Work only on the main branch when requested; do not introduce branches.

## Safety and quality
- Keep project data private by default. Do not commit real investigations to a public repository without explicit consent.
- Do not add ChatGPT/Codex chat controls back into the app.
- Existing file change conflict policy is HTTP 409 with reload/backup, not silent overwrites.
- New features should have tests and user-visible error paths.
