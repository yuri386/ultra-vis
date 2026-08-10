# Ultra VIS — final visual QA

## Comparison target

- Phone / crop direction: `C:\Users\sapun\AppData\Local\Temp\codex-clipboard-d4fdef40-7b7e-45dd-ba95-e84f4ae0713e.png`
- Learning-card direction: `C:\Users\sapun\AppData\Local\Temp\codex-clipboard-96fce87e-2753-4ecf-b96a-d00f4263faac.png`
- Published target: `https://ultravis.ultravis-yuri386.workers.dev/`
- Implemented phone asset: `frontend/assets/images/ultravis-phone-cutout-v4.png`
- Implemented gallery assets: `frontend/assets/images/ultravis-gallery-code-v1.png`, `frontend/assets/images/ultravis-gallery-plan-v1.png`, `frontend/assets/images/ultravis-gallery-studio-v1.png`
- Browser checks: 1280 × 720 desktop and 390 × 844 mobile CSS px.

## Fidelity and behaviour checks

| Surface | Result | Evidence |
| --- | --- | --- |
| Phone asset | Passed | The new asset has a transparent alpha matte: its corner and side alpha are zero. The live scroll story now shows only the device, without the former square black source background. |
| Phone scroll state | Passed | The phone remains clipped and stationary through the initial messages, then completes its reveal only after the AI message stage. The AI word has a multicolour gradient while the supporting copy is smaller and raised. |
| Home density | Passed | The eight oversized numbered modules are removed. Their destinations are retained as eight minimal arrow links at the bottom of the landing experience. |
| Gallery composition | Passed | Three natural, full-resolution 4:3 study images have their full subjects visible and a direct white description below each image, without extra card containers. |
| Mobile gallery | Passed | At 390 px, the gallery becomes a single-slide carousel with a counter, direct slide controls, automatic four-second advance, and a pause/play control. No horizontal page overflow was detected. |
| Per-account separation | Passed by implementation and endpoint review | API calls and private page responses are no-store. D1 content continues to be scoped to the authenticated `user_id`; browser-only theme and quote storage are now namespaced under the active account identifier. |
| Browser health | Passed | The deployed page returned no browser console errors during the final production check. |

## Verification performed

1. Generated and validated the transparent phone asset, including its alpha edges.
2. Loaded the deployed production page and inspected the updated landing DOM, phone stage, eight arrow actions, and gallery.
3. Switched to a 390 × 844 viewport and verified the mobile carousel controls, source asset, transition track, and page width.
4. Verified that the carousel advances after its four-second interval.
5. Ran `node --check` for all modified browser scripts and the Worker, `wrangler deploy --dry-run`, and `git diff --check`.
6. Performed a final console-error check against production.

final result: passed
