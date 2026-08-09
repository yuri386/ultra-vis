# Ultra VIS on Render

This repository is ready for a Render Blueprint. Create it from `render.yaml`
using the connected GitHub repository. It runs one Node service and keeps the
Ultra VIS SQLite database on Render's persistent disk.

Before the first deploy, set `ULTRAVIS_SSO_SECRET` in the Ultra VIS service and
set the *same exact value* in the SkillLand service. This value signs the
60-second, one-time SkillLand hand-off ticket. It is never sent to the browser.

After the service is live at `https://ultravis-yuri386.onrender.com`, keep the
same URL in SkillLand's `ULTRAVIS_URL` setting. The four Ultra VIS navigation
items will then open the protected sign-in flow.
