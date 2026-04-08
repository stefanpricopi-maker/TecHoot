# Todo list — kahoot-live

Legat de: [specification.md](./specification.md). Bifează `[ ]` → `[x]` pe măsură ce avansezi.

---

## Faza 0 — Decizii și fundație

> **Notă — Faza 0 parțial completă:** PostgreSQL și **Supabase Realtime** sunt alese ca stivă. Există `src/lib/supabase.ts` (client anon), `src/db/schema.sql` (tabele `quizzes`, `questions`, `sessions`, `players`) și tipuri în `src/types/game.ts`. Mai rămân de închis în această fază: **RLS** și politici, înregistrarea tabelelor în **publicația Realtime**, plus conventia finală pentru **validarea tranzițiilor** de stare pe server.

- [ ] Alege mecanismul **realtime** (ex. WebSocket propriu, Pusher, Ably, Partykit, Supabase Realtime) și compatibilitatea cu **deploy** (Vercel etc.)
- [ ] Definește **modelul de date** minimal: sesiune, întrebare, participant, răspuns, starea rundei (în așteptare / activă / rezultate)
- [ ] Stabiliește unde trăiește **sursa de adevăr** (server) și cum se face **validarea** tranzițiilor de stare

---

## Faza 1 — Backend / API (MVP)

- [ ] Implementare **creare sesiune** + generare **cod unic** scurt
- [ ] Implementare **join** participant (cod + nume, fără cont obligatoriu)
- [ ] Implementare **încheiere sesiune** (manuală) și, opțional, expirare
- [ ] **Persistență MVP:** in-memory (sau echivalent) cu înțelegerea pierderii la restart
- [ ] API pentru gazdă: **următoarea întrebare** / închidere rundă / (opțional) înapoi
- [ ] API pentru participant: **trimitere răspuns** (un singur răspuns per întrebare — respins la duplicate)
- [ ] **Validare server-side:** răspuns permis doar când runda e activă; varianta în setul permis

---

## Faza 2 — Realtime și sincronizare

- [x] Conectare clienți la **canal sesiune**; propagare schimbări de stare (întrebare activă, timer, rezultate) — *parțial: channel pe `players` (host) și `sessions` (lobby → joc); timer neimplementat*
- [x] Gazdă și participanți văd **aceeași stare** după fiecare tranziție (în limitele latenței țintă din spec) — *START pune `question_active`; jucător merge la `/game/[pin]` via Realtime*
- [ ] (Opțional într-o iterație) **Timer** configurabil per întrebare

---

## Faza 3 — Conținut quiz (MVP)

- [x] Model **întrebare alegere multiplă:** 2–4 variante, o varianta corectă — *în `src/data/quiz-data.ts` (4 variante)*
- [x] Sursă date întrebări pentru MVP: **hardcodat / JSON local** sau formular gazdă simplu (alege minim una)
- [x] Logică **scor:** corectitudine; opțional bonus pentru viteză (pondere simplă, dacă e în scope) — *+100 pt răspuns corect via `submitRoundResponse`*

---

## Faza 4 — UI gazdă

- [x] Rută/ecran gazdă: **pornește sesiune**, afișează **cod**
- [x] Listă participanți sau **contor** + actualizare live
- [x] Controale: **lansare rundă / următoarea întrebare**, afișare **rezultate agregate** după rundă — *counter răspunsuri; fără ecran separat rezultate*
- [ ] Ecran **clasament final** după ultima întrebare

---

## Faza 5 — UI participant

- [ ] Flux **join:** cod + nume
- [ ] Stări clare: **așteaptă** / **răspunde** / **vezi rezultat**
- [ ] Butoane pentru **variante**; layout **folosibil pe telefon**
- [ ] **Accesibilitate de bază:** contrast, ținte de atingere suficient de mari

---

## Faza 6 — Calitate și livrare MVP

- [ ] Verificare manuală sau teste pentru **criteriile de acceptare** din spec (§9)
- [ ] **Rate limiting** sau măsură minimă anti-abuz pe endpoint-uri publice (pentru producție)
- [ ] Actualizare **metadata** aplicație (titlu, descriere) în layout; eventual README scurt legat de produs

---

## Backlog (post-MVP) — din specification.md §4.2

- [ ] Conturi și **quiz-uri salvate** în cloud
- [ ] Tipuri extra: **adevărat/fals**, **răspuns scurt**
- [ ] **Echipe**, **teme** personalizate, **export** rezultate
- [ ] **Moderare:** eliminare participant, limitare re-join abuziv

---

*Ultimul sync cu specification.md: la crearea acestui fișier. Dacă spec-ul se schimbă, actualizează și todo-urile aici.*
