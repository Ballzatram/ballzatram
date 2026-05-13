# AI Edit Factory Prototype Standards

This file captures the bar for the AI Edit Factory workflow so future changes keep the prototype useful, testable, and phone-ready.

## Product promise

A user should be able to open the site, create a project, upload media they have permission to edit, generate an edit plan, render a vertical MP4, preview it, and download it without guessing what happened at any step.

## Workflow requirements

1. **Project creation must give immediate feedback.** The button cannot fail silently. Success, API connection errors, and validation issues must appear near Step 1 and in the main status panel.
2. **Phone testing must be supported.** Local development should avoid hard-coded `localhost` API calls when the browser is opened from another device on the network.
3. **Upload actions stay rights-gated.** Video and music uploads remain disabled until the user confirms they own or have permission to edit the files.
4. **Every disabled action needs an obvious path forward.** Copy should tell the user what to do next instead of sounding like internal system language.
5. **Rendering remains backend-owned.** The browser uploads media and displays status; ffmpeg rendering runs on the FastAPI backend.

## UX copy standards

- Prefer plain, human language: “Create project,” “Add your media,” and “Generate edit plan.”
- Avoid internal jargon in user-facing labels unless it helps debugging.
- Put the most actionable message closest to the control that needs attention.
- Keep compliance language clear without making the flow feel legalistic.
- Mobile layouts must keep tap targets large and avoid hidden status messages below the fold when possible.

## Engineering standards

- Keep API base resolution explicit and testable.
- Never swallow network errors; surface the API origin and a concrete fix.
- Preserve same-origin production behavior while supporting split frontend/backend development.
- Keep file validation client-side and server-side.
- Run backend tests and a frontend build after workflow changes.
