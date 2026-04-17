# Specificație — kahoot-live

## 1. Rezumat

**kahoot-live** este o aplicație web pentru sesiuni de quiz în timp real, inspirată de experiența Kahoot: un gazdă controlează derularea întrebărilor, iar participanții răspund de pe propriile dispozitive, cu feedback imediat și (opțional) clasament.

## 2. Obiective

- Permiterea unei sesiuni live simple: creare sesiune, cod de acces, întrebări cu variante, răspunsuri și scor.
- Interfețe distincte pentru **gazdă** și **participant**.
- Latență perceptibilă mică la propagarea stării sesiunii (întrebare activă, timer, rezultate).
- Baza tehnică ușor de extins (mai multe tipuri de întrebări, echipe, persistentă avansată).

## 3. Roluri și scenarii

| Rol | Descriere |
|-----|-----------|
| **Gazdă** | Creează sau încarcă un set de întrebări, pornește sesiunea, avansează întrebările, vede statistici live și rezultatele finale. |
| **Participant** | Se alătură cu codul sesiunii, alege un nume (fără cont obligatoriu în MVP), răspunde la întrebările afișate de gazdă. |

**Scenariu principal (MVP):** gazdă pornește sesiunea → participanții intră cu codul → gazdă lansează întrebarea → participanții trimit răspunsul în timpul alocat → se afișează răspunsul corect și punctajul → se repetă până la final, apoi clasament.

## 4. Cerințe funcționale (țintă)

### 4.1 MVP (propus)

- **Sesiuni:** cod unic scurt de sesiune; expirare sau încheiere manuală de către gazdă.
- **Întrebări:** tip „alegere multiplă” cu 2–4 variante, o singură variantă corectă.
- **Timp:** timer configurabil per întrebare.
- **Scor:** punctaj bazat pe corectitudine + bonus de viteză (simplu).
- **UI:**
  - Ecran gazdă: listă participanți (sau contor), control înainte/înapoi sau doar „următoarea întrebare”, afișare rezultate agregate.
  - Ecran participant: stările clare (așteaptă, răspunde, vezi rezultat), butoane pentru variante.

### 4.2 După MVP (backlog, neangajat)

- Conturi și quiz-uri salvate în cloud.
- Tipuri extra de întrebări (răspuns scurt).
- Tipuri extra de întrebări (adevărat/fals, multi-select) — implementate.
- Mod echipe — implementat parțial (DB + leaderboard host; lipsește încă flow complet de creare/join echipe).
- Export rezultate — implementat (Admin tools).
- Teme personalizate.
- Moderare (kick participant, blocare re-join abuziv).

## 5. Cerințe nefuncționale

- **Performanță:** actualizări de stare sesiune sub o latență țintă rezonabilă pentru sala de clasă (ex.: sub ~1s în condiții normale).
- **Accesibilitate:** contrast și interacțiuni utilizabile pe telefon (participant).
- **Securitate:** validare server-side a răspunsurilor și a tranzițiilor de stare; limitare minimă anti-spam pe API (rate limiting în producție).
- **Compatibilitate:** browsere moderne; progresiv enhancement unde e posibil.

## 6. Stiva tehnică (stare curentă în repo)

| Tehnologie | Versiune / notă |
|------------|-----------------|
| Next.js | 16.x (App Router) |
| React | 19.x |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| ESLint | 9.x (+ eslint-config-next) |
| Supabase | DB + Auth helpers + Realtime |

**Notă:** convențiile și API-urile Next.js pot diferi de documentația publică generică; la implementare, consultă ghidurile din `node_modules/next/dist/docs/` și indicațiile din `AGENTS.md`.

## 7. Arhitectură tehnică (stare curentă)

- **Stare live:** Supabase Realtime (subscriptions la `sessions`, `players`, `round_responses`) pentru actualizări instant.
- **Persistență:** PostgreSQL (Supabase) pentru `quizzes`, `questions`, `sessions`, `players`, `round_responses` (+ `teams` pentru team mode).
- **API:** Server Actions pentru mutații (creare/join/start/answer/advance/results, admin tools).
- **Sursa de adevăr:** server (Server Actions cu service role pentru mutații privilegiate).
- **Admin tools:** UI `/admin` protejat prin secret (`ADMIN_TOOLS_SECRET`) + cookie; CRUD quiz/întrebări, import/export JSON, listă sesiuni + force finish, maintenance/stats.

Notă: RLS/policies sunt gestionate prin migrări în `src/db/migrations/` (producție) și trebuie aplicate în Supabase.

## 8. Stare actuală a depozitului

- App implementat: host + player flows, realtime, scoring, rezultate, plus Admin tools.
- Datele quiz-urilor sunt în Supabase (`quizzes` + `questions`), cu import/export pentru administrare.
- Tipuri întrebări suportate: `single`, `true_false`, `multi_select`.

## 9. Criterii de acceptare (MVP)

1. Gazdă poate porni o sesiune și vede un cod pe care îl pot folosi participanții.
2. Participant se alătură cu codul și un nume; apare în lista/contorul gazdei.
3. La o întrebare activă, participantul poate trimite un singur răspuns; duplicatele sunt respinse strict.
4. După închiderea runde, toți clienții văd starea corectă (răspuns corect, punctaj propriu unde e cazul).
5. La finalul setului de întrebări există un clasament coerent cu regulile de scor alese.

---

*Document viu: se actualizează pe măsură ce scope-ul și implementarea evoluează.*
