# Squadar: demo-day prototype

A phone web app for testing the Squadar concept with a small group in one room: create or join a
squad, see friends on a staged floor plan of Tangen Hall (4th floor) with a drunk-o-meter, get a
full-screen alert when someone hits their limit, follow the route to them, end the night, and see
an "aftermath" summary of last night, this week and the past month.

Everything is **staged by the facilitator**: where people are on the floor plan and everyone's
simulated readings. No live location is used. Earlier nights in the aftermath are sample data.

## Pages
| Path | Who | What |
|---|---|---|
| `/` | everyone | Welcome: join or create a squad |
| `/j/CODE` | invite link | Opens straight into joining that squad |
| `/s/CODE` | squad members | Lobby → floor map → alert → route to friend → end night → aftermath |
| `/facilitator` | your team (PIN) | Start/end the night, move people between landmarks, set readings, fire alerts, pick responders |

## One-time setup
1. **Supabase** (free): create a project, open SQL Editor → New query, paste `supabase/schema.sql`, Run.
   In Table Editor → `settings`, change `facilitator_pin` (default `2468`).
2. **Vercel** (free Hobby plan): Add New → Project → import this GitHub repo. Framework: Vite (auto-detected).
   Add environment variables, then Deploy:
   - `VITE_SUPABASE_URL` = Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase anon public key (or publishable key)
3. Open the Vercel URL on your phone. Every push to `main` redeploys automatically.

Local dev: copy `.env.example` to `.env.local`, fill in the two values, `npm install`, `npm run dev`.

## Running a session (5 testers, ~25 min)
1. Show the QR code for the site. One tester creates the squad, the others join with the code or link
   (name → how much they plan to drink → pair device). Everyone starts at the elevators.
2. On a laptop, open `/facilitator`, enter the PIN, open the squad. Press **Spread everyone out** and tell
   each person to walk to the landmark shown next to their name (or move people with the "At" menu).
   Press **Random BACs (under limits)** to fill the meters.
3. The host taps **Start the night**. Pick who plays the friend at their limit; optionally tick 2 responders.
   Press **Hit limit**. The 2 responders get the takeover (with sound: check **Me → Test sound** first).
   If nobody goes within 2 minutes, the next closest friend is alerted.
4. Responders tap **Gotta get my friend** → route on the floor plan + steps → **Found …**.
5. The host opens **Me → End the night for everyone**. Everyone lands on their **Aftermath**.
   Ask: “You went out N nights this week. How do you feel seeing this?”

## Known limits
- The floor plan is a schematic of Tangen 4th floor, not to scale; positions are set by the facilitator.
- Alarm sound plays only after the person has tapped something in the app (browser rule). On iPhone (iOS 16.4+)
  it plays even in silent mode; volume must be up. Vibration works on Android only.
- Security is demo-grade: anyone with the link can read squad data. Don’t use for real nights out.
