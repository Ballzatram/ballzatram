You are building ai-edit-factory.

Priority:
Make the app generate real vertical mp4 edits end-to-end.

Rules:
- Local files first.
- YouTube media download disabled by default.
- Never bypass access controls or DRM.
- Use ffmpeg for rendering reliability.
- Keep modules small and testable.
- Prefer simple working code over clever abstractions.
- Every major change should include a runnable command.
- Update README whenever setup or usage changes.

Definition of done:
A user can run docker compose up, upload a song and video clips, click generate, and download generated TikTok-style edits.
