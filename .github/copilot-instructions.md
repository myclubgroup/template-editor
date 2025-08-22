# Copilot Instructions for template-editor

## Project Overview

- This is a Vite + React project for editing email templates with rich text and mail-merge tags.
- Main UI logic is in `src/App.jsx`. The app parses and edits HTML templates with custom comment fences (e.g., `<!-- editable:start ... --> ... <!-- editable:end -->`).
- Brand-specific blocks and mail-merge tags are defined in JS constants and injected into the template.

## Key Files & Structure

- `src/App.jsx`: Core editor logic, Quill integration, template parsing, mail-merge tag management.
- `public/`: Static assets (favicon, logos, manifest).
- `template.txt`: Example template source (not always used at runtime).
- `tailwind.config.js`: Tailwind config for styling.
- `vite.config.mjs`: Vite build config.

## Developer Workflows

- Use `yarn run dev` to start the local dev server (Vite).
- Use `yarn run build` to build for production (output in `dist/`).
- Use `yarn run deploy` to deploy to Github Pages.
- Node version managed via `nvm` (see README for setup).

## Patterns & Conventions

- **Editable HTML blocks**: Template sections are marked with HTML comments for in-place editing. Example:
  ```html
  <!-- editable:start name="GREETING" label="Greeting (H1)" type="rich" max="120" -->Dear
  <strong>${Leads.First Name}</strong>,<!-- editable:end -->
  ```
- **Mail-merge tags**: Use `${Leads.First Name}` etc. for dynamic content. Tags are grouped and managed in JS constants.
- **Quill Editor**: Rich text fields use Quill with custom toolbars. For GREETING and SIGNOFF, only bold, italic, and clear formatting are allowed.
- **Sanitization**: Custom sanitizers ensure output HTML is safe and compatible with email clients.
- **Brand blocks**: Header/footer HTML for different brands is injected via JS constants.

## Integration Points

- No backend/API calls; all logic is client-side.
- External dependencies: React, Quill, Tailwind, Vite.

## Examples

- To add a new editable section, update both the template HTML and the JS parsing logic in `src/App.jsx`.
- To add a new mail-merge tag, update the `MERGE_TAGS` and `MERGE_GROUPS` arrays in `src/App.jsx`.

## Tips for AI Agents

- Always update both the template and JS logic when adding new editable fields.
- Preserve the comment fence format for editable blocks.
- When editing Quill configs, restrict toolbars as needed for each field.
- Reference `README.md` for setup and workflow commands.

---

If any conventions or workflows are unclear, ask the user for clarification or examples before making changes.
