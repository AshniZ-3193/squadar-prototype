# Squadar: demo-day prototype

A phone web app for testing the Squadar concept with a small group: create or join a squad,
see friends on a live map with a drunk-o-meter, get a full-screen alert when someone hits
their limit, walk to them with an arrow, end the night, and leave feedback.

Wristband readings are **simulated** from the facilitator page. Location is **real GPS**
(phones must allow location) with a manual fallback for indoor demos.

## Pages
| Path | Who | What |
|---|---|---|
| `/` | everyone | Welcome: join or create a squad |
| `/j/CODE` | invite link | Opens straight into joining that squad |
| `/s/CODE` | squad members | Lobby → live map → alert → finding → end night → feedback |
| `/facilitator` | your team (PIN) | Start/end the night, set BACs, fire alerts, pick responders, place people on the map |
| `/results` | your team (PIN) | All feedback in a table + Download CSV |

## One-time setup
1. **Supabase** (free): create a project, open SQL Editor → New query, paste `supabase/schema.sql`, Run.
   In Table Editor → `settings`, change `facilitator_pin` (default `2468`).
2. **Vercel** (free Hobby plan): Add New → Project → import this GitHub repo. Framework: Vite (auto-detected).
   Add environment variables, then Deploy:
   - `VITE_SUPABASE_URL` = Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase anon public key (or publishable key)
   - optional `VITE_CARTO_KEY` = free CARTO basemaps key (https://carto.com/basemaps/apikey/) for the nicer dark map.
     Without it the map uses OpenStreetMap tiles with a dark filter.
3. Open the Vercel URL on your phone. Every push to `main` redeploys automatically.

Local dev: copy `.env.example` to `.env.local`, fill in the two values, `npm install`, `npm run dev`.

## Running a session (5 testers, ~25 min)
1. Before the app: ask “Tell us about the last time you lost track of someone on a night out.”
2. Show the QR code for the site. One tester creates the squad, the others join with the code or link.
3. On a laptop, open `/facilitator`, enter the PIN, open the squad.
   - Indoors / same room: press **Scatter demo positions** (or **Place on map** per person).
   - Outdoors and 100 m+ apart: leave everyone on live GPS.
   - **Random starting BACs** fills the meters.
4. The host taps **Start the night**. Pick who plays the friend at their limit; optionally tick 2 responders.
   Press **Hit limit** (or drag their BAC past their limit). The 2 responders get the takeover;
   if nobody goes within 2 minutes, the next closest friend is alerted.
5. Responders tap **Gotta get my friend** → arrow + walking steps → **Found …**.
6. The host opens **Me → End the night for everyone**. Everyone gets the feedback form.
7. Read results at `/results` (Download CSV for a spreadsheet).

## Known limits
- Phones only share location while the site is open on screen. Ask testers to keep it open.
- Indoor GPS can’t tell rooms apart; use manual placement indoors.
- iPhone asks separately for Motion & Orientation (needed for the compass arrow). Without it the arrow is north-up.
- Alarm sound plays only after the person has tapped something in the app (browser rule). On iPhone (iOS 16.4+) it plays even in silent mode; volume must be up. Use **Me → Test sound** to check each phone before the session.
- Walking steps use the free OpenStreetMap router (routing.openstreetmap.de); if it’s unreachable, the app shows a direction instead.
- Security is demo-grade: anyone with the link can read squad data. Don’t use for real nights out.
