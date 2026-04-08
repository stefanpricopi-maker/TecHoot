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
- **Întrebări:** tip „alegere multiplă” cu 2–4 variante, o singură variantă corectă; ordinea variante-lor poate fi fixă în prima iterație.
- **Timp:** timer configurabil per întrebare (sau fără timer în prima iterație).
- **Scor:** punctaj bazat pe corectitudine și, opțional, viteză (pondere simplă).
- **UI:**
  - Ecran gazdă: listă participanți (sau contor), control înainte/înapoi sau doar „următoarea întrebare”, afișare rezultate agregate.
  - Ecran participant: stările clare (așteaptă, răspunde, vezi rezultat), butoane pentru variante.

### 4.2 După MVP (backlog, neangajat)

- Conturi și quiz-uri salvate în cloud.
- Tipuri extra de întrebări (adevărat/fals, răspuns scurt).
- Mod echipe, teme personalizate, export rezultate.
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

**Notă:** convențiile și API-urile Next.js pot diferi de documentația publică generică; la implementare, consultă ghidurile din `node_modules/next/dist/docs/` și indicațiile din `AGENTS.md`.

## 7. Arhitectură tehnică (țintă, neimplementată încă)

- **Stare live:** canal bidirecțional (ex. WebSocket sau echivalent pe platforma de deploy) între server și clienți; „sursa de adevăr” pentru starea sesiunii rămâne pe server.
- **Persistență MVP:** poate fi in-memory cu pierdere la restart; ulterior DB pentru sesiuni și istoric.
- **API:** rute server (Route Handlers / Server Actions) pentru creare sesiune, join, submit răspuns, consultare stări permise gazdei.

Detaliile exacte (furnizor Realtime, model date, auth) se decid la proiectarea iteratiei de implementare.

## 8. Stare actuală a depozitului

- Proiect inițializat cu `create-next-app`; pagina principală este încă șablonul implicit.
- Nu există încă logică de sesiune, quiz sau realtime în cod.

## 9. Criterii de acceptare (MVP)

1. Gazdă poate porni o sesiune și vede un cod pe care îl pot folosi participanții.
2. Participant se alătură cu codul și un nume; apare în lista/contorul gazdei.
3. La o întrebare activă, participantul poate trimite un singur răspuns; duplicatele sunt respinse strict.
4. După închiderea runde, toți clienții văd starea corectă (răspuns corect, punctaj propriu unde e cazul).
5. La finalul setului de întrebări există un clasament coerent cu regulile de scor alese.

---

*Document viu: se actualizează pe măsură ce scope-ul și implementarea evoluează.*
