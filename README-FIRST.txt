CINTA KITA — NATIVE BLUEMAP 3D MEMORY STAMPS (INITIAL INTEGRATION)

IMPORTANT
This is the native-marker publisher, not a complete real-time in-browser marker editor.
It reads existing saved memories in Supabase and produces a per-map BlueMap markers.json.
It does not change the Minecraft world, minecraft.html, or your Supabase row permissions.
BlueMap's exact marker JSON parser must be verified against your published viewer.
This uses the current BlueMap marker-set shape as a starting point and needs browser testing.

REPOSITORY FILES (put these exact relative paths in urfavchannel):
  scripts/build-markers.mjs
  .github/workflows/cinta-kita-memory-stamps.yml
  bluemap-offline/web/cinta-kita-memory-stamps.css (copy CSS here)

APP CONFIG:
  The existing BlueMap viewer must load the CSS file via its settings or theme setup.
  Avoid overriding its currently working CSS or existing scripts.

GITHUB REPOSITORY SECRETS (Settings > Secrets and variables > Actions):
  SUPABASE_URL = your project base URL, NOT /rest/v1
  SUPABASE_SERVICE_ROLE_KEY = server-only service_role or equivalent secret key.

NEVER put SUPABASE_SERVICE_ROLE_KEY in GitHub files, browser JS, a public link or chat.
The existing publishable key cannot read all members' records when RLS restricts them.

Once files and secrets are configured:
  Actions > Publish Cinta Kita memory stamps > Run workflow
  Check Actions logs. If successful, review generated markers.json in GitHub.
  Open minecraft.html and force refresh to test true native map stamps.
  The 15-minute schedule is not real time; GitHub scheduling can also be delayed.

IMPORTANT LIMITATIONS
- The generated marker HTML provides hover/title/notes/YouTube thumbnail and a link.
- Pictures are NOT included yet because existing records lack a usable photo storage link.
- Clicking the marker to expand needs a follow-up handler; hovering works through CSS.
- The status of native BlueMap parsing of this exact generated JSON is NOT verified.
- GitHub Pages publishes marker data publicly: do not put private notes/videos in these records.
- Your local BlueMap Auto-Sync may overwrite marker.json; preserve it when synchronizing.
- This automated job also pushes commits, so the Auto-Sync must pull before its own push.
