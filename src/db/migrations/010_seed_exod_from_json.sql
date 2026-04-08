-- Seed generated from JSON.
-- Schema target: public.quizzes + public.questions (options jsonb + correct_option_index).
-- Source: src/data/questions/exod.json
-- Total questions: 122

INSERT INTO public.quizzes (title, description)
SELECT 'Întrebări Exod', 'Import din src/data/questions/exod.json'
WHERE NOT EXISTS (
  SELECT 1 FROM public.quizzes WHERE title = 'Întrebări Exod'
);

-- Batch 1
INSERT INTO public.questions (quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds)
WITH target AS (
  SELECT id FROM public.quizzes WHERE title = 'Întrebări Exod' ORDER BY created_at ASC LIMIT 1
), existing AS (
  SELECT count(*)::int AS n FROM public.questions WHERE quiz_id = (SELECT id FROM target)
)
SELECT
  (SELECT id FROM target) AS quiz_id,
  v.prompt,
  v.options,
  v.correct_option_index,
  v.order_index,
  v.time_limit_seconds
FROM (VALUES
  ('În ce împrejurare a fost dată o poruncă prin care fiecare băiat mic să fie aruncat în râu?', '["Când s-a născut Isus", "Când Israel era în Egipt", "Când s-a născut Moise", "Când s-a născut Iosif"]'::jsonb, 2::smallint, 0, 30),
  ('Cine a murit în timpul ultimei urgii în Egipt?', '["Întâiul născut al lui Faraon", "Întâiul născut al celui închis în temniță", "Toți întâii-născuți ai dobitoacelor", "Toți soldații lui Faraon"]'::jsonb, 2::smallint, 1, 30),
  ('Florile cărei plante sunt reprezentate pe sfeșnicul din cortul întâlnirii?', '["migdal", "măslin", "smochin", "finic"]'::jsonb, 0::smallint, 2, 30),
  ('Cartea Exodului ne spune că, după darea Legii pe Sinai, Dumnezeu le-a permis unor oameni să-L vadă. Cine au fost aceștia?', '["Moise și Aaron", "Nadab și Abihu", "70 de bătrâni ai lui Israel", "Tot poporul Israel"]'::jsonb, 2::smallint, 3, 30),
  ('Tabla de aur cu inscripția: Sfânt (sfințenie) Domnului, pe care trebuiau s-o poarte preoții, trebuia pusă:', '["Pe pieptarul judecății", "Pe mantie", "Pe mitră", "Pe toiagul lui Aaron"]'::jsonb, 2::smallint, 4, 30),
  ('Ce pedeapsă trebuia aplicată celor care se atingeau de munte, la darea Legii?', '["Să fie scoși din tabără șapte zile", "Să fie uciși cu pietre", "Să fie străpunși cu săgeți", "Să plătească un siclu de argint"]'::jsonb, 1::smallint, 5, 30),
  ('Ce poruncă a dat Faraon, cu privire la evrei, după prima întâlnire cu Moise și Aaron?', '["Să se mărească numărul de cărămizi", "Să nu se mai dea paie pentru cărămizi", "Numărul de cărămizi să rămână același", "Să fie alungați din Egipt pe loc"]'::jsonb, 1::smallint, 6, 30),
  ('Cum s-a prezentat Dumnezeu lui Moise?', '["“Dumnezeul lui Avraam, Isaac și Iacov”", "“Iehova”", "“Eu sunt”", "“Dumnezeul cel Atotputernic”"]'::jsonb, 0::smallint, 7, 30),
  ('Din ce era făcută învelitoarea exterioară a cortului?', '["piei de capră", "piei de berbeci", "piei de vițel de mare", "in subțire răsucit"]'::jsonb, 2::smallint, 8, 30),
  ('Cum se numea omul din poporul Israel în care Dumnezeu a pus un duh de înțelepciune pentru a lucra la facerea cortului?', '["Bețaleel", "Dan", "Hur", "Iosua"]'::jsonb, 0::smallint, 9, 30),
  ('Ce trebuia să facă un rob pentru a putea lua parte la Paștele evreilor?', '["Să aibă cetățenie în Israel", "Să fie tăiat împrejur", "Să dea zecuială din tot ce are", "Să spele picioarele preoților"]'::jsonb, 1::smallint, 10, 30),
  ('Cine a spus: Cunosc acum că Domnul este mai mare decât toți dumnezeii?', '["Faraon", "Ietro", "Naaman", "Moise"]'::jsonb, 1::smallint, 11, 30),
  ('Asir, Elcana și Abiasaf sunt ...', '["fiii lui Ieroboam", "fiii lui Core", "fiii lui Amon", "fiii lui Iuda"]'::jsonb, 1::smallint, 12, 30),
  ('Unde s-a întâlnit Moise, când s-a întors în Egipt, cu Aaron?', '["La muntele lui Dumnezeu", "În Egipt", "La Marea Roșie", "În Madian"]'::jsonb, 0::smallint, 13, 30),
  ('Gherșom înseamnă:', '["Străin", "Uitare", "Ajutorul lui Dumnezeu", "Binecuvântare"]'::jsonb, 0::smallint, 14, 30),
  ('Ce fenomene s-au întâmplat în ziua primirii Legii?', '["Tunete, fulgere și o mare grindină", "Un nor gros", "Muntele se scutura cu putere", "O ploaie de foc"]'::jsonb, 2::smallint, 15, 30),
  ('Ce i-a împiedicat pe israeliți să creadă cuvintele Domnului?', '["Desnădejdea și robia aspră", "Necredința față de Dumnezeu", "Necazul și pierderea copiilor", "Teama de armata lui Faraon"]'::jsonb, 0::smallint, 16, 30),
  ('Ce a răspuns poporul lui Moise la muntele Sinai?', '["„Poruncile sunt prea grele”", "„Iată Dumnezeul care ne-a scos”", "„Vom face tot ce a zis Domnul”", "„Vrem să ne întoarcem în Egipt”"]'::jsonb, 2::smallint, 17, 30),
  ('La ce fel de munci erau supuși evreii?', '["Lucrări în lut", "Producerea cărămăzilor", "Lucrul câmpului", "Păstoritul oilor lui Faraon"]'::jsonb, 1::smallint, 18, 30),
  ('Când și cât timp ținea sărbătoarea azimilor?', '["Înaintea Paștelor", "După sărbătoarea pascală, 7 zile", "Din seara zilei a 14-a la 21", "În fiecare lună plină"]'::jsonb, 1::smallint, 19, 30)
) AS v(prompt, options, correct_option_index, order_index, time_limit_seconds)
WHERE (SELECT n FROM existing) = 0;

-- Batch 2
INSERT INTO public.questions (quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds)
WITH target AS (
  SELECT id FROM public.quizzes WHERE title = 'Întrebări Exod' ORDER BY created_at ASC LIMIT 1
), existing AS (
  SELECT count(*)::int AS n FROM public.questions WHERE quiz_id = (SELECT id FROM target)
)
SELECT
  (SELECT id FROM target) AS quiz_id,
  v.prompt,
  v.options,
  v.correct_option_index,
  v.order_index,
  v.time_limit_seconds
FROM (VALUES
  ('Ce făcea poporul când Moise mergea la cortul întâlnirii?', '["Se ridicau în picioare", "Stătea la ușa cortului său", "Mergeau toți în fața Cortului", "Îngenuncheau cu fața la pământ"]'::jsonb, 1::smallint, 20, 30),
  ('Cui a spus Domnul: „Iată că te fac Dumnezeu”?', '["Lui Avraam", "Lui Iosif", "Lui Moise", "Lui Aaron"]'::jsonb, 2::smallint, 21, 30),
  ('Din ce material a poruncit Moise să se facă chivotul?', '["Cedru", "Salcâm", "Stejar", "Măslin"]'::jsonb, 1::smallint, 22, 30),
  ('Ce animal trebuia pregătit pentru Paște?', '["Un miel", "Un ied", "Un animal fără cusur (miel/ied)", "Un vițel gras"]'::jsonb, 2::smallint, 23, 30),
  ('Ce a mai luat Moise cu el din Egipt?', '["Toată averea lui Faraon", "Visteria Casei Domnului", "Oasele lui Iosif", "Toiagul lui Faraon"]'::jsonb, 2::smallint, 24, 30),
  ('În ce lună au ieșit evreii din Egipt?', '["În luna nouă", "În luna Nisan", "În luna spicelor", "În luna ploilor"]'::jsonb, 2::smallint, 25, 30),
  ('Soția lui Moise a fost...', '["Fecioară evreică", "Fiica unui preot", "Femeie egipteană", "O femeie din neamul lui Amalec"]'::jsonb, 1::smallint, 26, 30),
  ('Cine era ajutorul lui Bețaleel la facerea cortului?', '["Oholiab", "Ahisamac", "Hur", "Iosua"]'::jsonb, 0::smallint, 27, 30),
  ('Unde a fugit Moise după ce a omorât egipteanul?', '["Madian", "Avit", "Cades-Barnea", "În pustia Sin"]'::jsonb, 0::smallint, 28, 30),
  ('Care este a 6-a poruncă a Decalogului?', '["Să nu ucizi", "Să nu furi", "Să nu preacurvești", "Să nu mărturisești strâmb"]'::jsonb, 0::smallint, 29, 30),
  ('Ce urgie este scris că a făcut deosebire între Gosen și restul Egiptului?', '["Păduchii", "Broaștele", "Musca câinească", "Lăcustele"]'::jsonb, 2::smallint, 30, 30),
  ('Câte zile au trecut după ce Domnul a lovit râul și acesta s-a prefăcut în sânge?', '["Cinci zile", "Șapte zile", "Zece zile", "Trei zile"]'::jsonb, 1::smallint, 31, 30),
  ('Care este continuarea cuvintelor: „Dacă nu mergi Tu însuți cu noi, ...”?', '["...nu ne lăsa să ne îndepărtăm", "...nu mai vrem să mergem", "...nu ne lăsa să plecăm de aici", "...vom pieri în pustie"]'::jsonb, 2::smallint, 32, 30),
  ('Cu ce ocazie a spus Israel: „Vom face și vom asculta tot ce a zis Domnul”?', '["În robia Egiptului", "Când Moise a citit Cartea Legământului", "La Marea Roșie", "Când a căzut mana"]'::jsonb, 1::smallint, 33, 30),
  ('Când a spus Moise: „Șterge-mă din cartea Ta, pe care ai scris-o”?', '["La păcatul cu vițelul de aur", "Când poporul a vrut în Egipt", "Când a cerut să intre în Canaan", "La Mara când apa era amară"]'::jsonb, 0::smallint, 34, 30),
  ('De când a început să strălucească fața lui Moise?', '["După primele table", "După ce s-a pogorât cu noile table", "La prima întâlnire cu Domnul", "Când a bătut stânca"]'::jsonb, 1::smallint, 35, 30),
  ('Cine a luat parte la jertfa de mâncare dată de Ietro?', '["Tot poporul", "Aaron și toți bătrânii lui Israel", "Doar familia lui Moise", "Iosua și Caleb"]'::jsonb, 1::smallint, 36, 30),
  ('Unde își avea locul îngerul Domnului în timpul înaintării taberei?', '["În spatele taberei", "În Cortul Întâlnirii", "În fața taberei", "Deasupra Chivotului"]'::jsonb, 0::smallint, 37, 30),
  ('Cum se numea femeia care i-a spus soțului: „Tu ești un soț de sânge pentru mine”?', '["Sarai", "Rut", "Sefora", "Maria"]'::jsonb, 2::smallint, 38, 30),
  ('Unde a venit Amalec să-l bată pe Israel?', '["La Horeb", "La Refidim", "La Sucot", "La Elim"]'::jsonb, 1::smallint, 39, 30)
) AS v(prompt, options, correct_option_index, order_index, time_limit_seconds)
WHERE (SELECT n FROM existing) = 0;

-- Batch 3
INSERT INTO public.questions (quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds)
WITH target AS (
  SELECT id FROM public.quizzes WHERE title = 'Întrebări Exod' ORDER BY created_at ASC LIMIT 1
), existing AS (
  SELECT count(*)::int AS n FROM public.questions WHERE quiz_id = (SELECT id FROM target)
)
SELECT
  (SELECT id FROM target) AS quiz_id,
  v.prompt,
  v.options,
  v.correct_option_index,
  v.order_index,
  v.time_limit_seconds
FROM (VALUES
  ('Completează: Să nu te iei după mulțime ...', '["Ca să faci rău", "Ca să faci o mărturisire mincinoasă", "Ca să părtinești pe sărac", "Ca să nu asculți de Lege"]'::jsonb, 0::smallint, 40, 30),
  ('Cine a mai venit împreună cu socrul lui Moise la tabăra lui Israel?', '["Sefora, soția lui Moise", "Copiii lui Moise", "Toată casa socrului său", "Bătrânii Madianului"]'::jsonb, 1::smallint, 41, 30),
  ('Cum se mai numea țara făgăduită?', '["Țară bună și întinsă", "Țară în care curge lapte și miere", "Țara călătoriilor sfinte", "Grădina Domnului"]'::jsonb, 1::smallint, 42, 30),
  ('Cât timp a stat Moise a doua oară pe munte?', '["6 zile și 6 nopți", "7 zile și 7 nopți", "40 de zile și 40 de nopți", "3 zile și 3 nopți"]'::jsonb, 2::smallint, 43, 30),
  ('De ce nu este bine să primim daruri la judecată?', '["Darurile orbesc", "Sucesc hotărârile", "Darurile aduc moartea", "Aduce mânia poporului"]'::jsonb, 0::smallint, 44, 30),
  ('De câte ori trebuia să facă Aaron ispășire pe coarnele altarului?', '["În fiecare zi", "De câte ori era nevoie", "O singură dată pe an", "În fiecare Sabat"]'::jsonb, 2::smallint, 45, 30),
  ('La ce urgie a folosit Faraon cuvintele: „Rugați-vă Domnului... și vă voi lăsa”?', '["La urgia a 4-a", "La urgia a 6-a", "La urgia a 7-a (piatra și focul)", "La prima urgie"]'::jsonb, 2::smallint, 46, 30),
  ('În ce capitol din Exodul se spune că fața lui Moise strălucea?', '["În capitolul 32", "În capitolul 34", "În capitolul 40", "În capitolul 19"]'::jsonb, 1::smallint, 47, 30),
  ('Câte urgii au venit peste Egipt în total?', '["7 urgii", "10 urgii", "12 urgii", "3 urgii"]'::jsonb, 1::smallint, 48, 30),
  ('Câte izvoare erau la Elim?', '["7", "20", "12", "3"]'::jsonb, 2::smallint, 49, 30),
  ('După ce criterii a ales Moise căpeteniile peste popor?', '["Oameni destoinici și de încredere", "Vrășmași ai lăcomiei", "Toată casa lor în slujbă", "Cei mai bătrâni din triburi"]'::jsonb, 0::smallint, 50, 30),
  ('Cum trebuia pregătit mielul sau iedul pentru Paște?', '["Cu azimi și verdețuri amare", "Fript la foc", "Doar cu azimi", "Fiert în apă"]'::jsonb, 1::smallint, 51, 30),
  ('Ce fel de lemn a fost folosit la facerea Chivotului?', '["Cedru", "Salcâm", "Chiparos", "Stejar"]'::jsonb, 1::smallint, 52, 30),
  ('De ce nu a putut fi băută apa de la Mara?', '["Pentru că era amară", "Pentru că era sărată", "Pentru că era murdară", "Pentru că era caldă"]'::jsonb, 0::smallint, 53, 30),
  ('Care din următoarele nume NU a fost fiul lui Aaron?', '["Itamar", "Elifaz", "Nadab", "Abihu"]'::jsonb, 1::smallint, 54, 30),
  ('Ce sfat i-a dat Ietro lui Moise?', '["Să fie tălmaciul poporului", "Să-i învețe poruncile și legile", "Să pună căpetenii care să judece", "Să se întoarcă în Madian"]'::jsonb, 2::smallint, 55, 30),
  ('Care a fost primul război cu sabia după ieșirea din Egipt?', '["Cu egiptenii", "Împotriva lui Amalec", "Cu cei care cârteau", "Cu Madianiții"]'::jsonb, 1::smallint, 56, 30),
  ('După care urgie a spus Faraon: „Duceți-vă, să rămână doar oile și boii”?', '["Urgia cu lăcustele", "Urgia cu întunericul", "Urgia cu ciuma", "Urgia cu broaștele"]'::jsonb, 1::smallint, 57, 30),
  ('Câte luni a fost ascuns Moise de către mama sa?', '["3 luni", "4 luni", "6 luni", "1 lună"]'::jsonb, 0::smallint, 58, 30),
  ('În ce mare au fost aruncate lăcustele de către vânt?', '["Marea Neagră", "Marea Roșie", "Marea Egee", "Marea Mediterană"]'::jsonb, 1::smallint, 59, 30)
) AS v(prompt, options, correct_option_index, order_index, time_limit_seconds)
WHERE (SELECT n FROM existing) = 0;

-- Batch 4
INSERT INTO public.questions (quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds)
WITH target AS (
  SELECT id FROM public.quizzes WHERE title = 'Întrebări Exod' ORDER BY created_at ASC LIMIT 1
), existing AS (
  SELECT count(*)::int AS n FROM public.questions WHERE quiz_id = (SELECT id FROM target)
)
SELECT
  (SELECT id FROM target) AS quiz_id,
  v.prompt,
  v.options,
  v.correct_option_index,
  v.order_index,
  v.time_limit_seconds
FROM (VALUES
  ('Sub ce nume s-a prezentat Domnul lui Moise la rug?', '["„Eu sunt”", "„Eu sunt Cel ce sunt”", "„Alfa și Omega”", "„Domnul Oștirilor”"]'::jsonb, 1::smallint, 60, 30),
  ('Cine a scăpat de cea de-a șaptea urgie (piatra)?', '["Cei din Gosen", "Egiptenii care s-au temut de cuvânt", "Turmele lui Faraon", "Nimeni"]'::jsonb, 1::smallint, 61, 30),
  ('Ce se întâmpla cu un rob care dorea să rămână la stăpân?', '["Era dus la Dumnezeu", "I se găurea urechea la o ușă", "I se găurea urechea la un stâlp", "Primea o moștenire"]'::jsonb, 1::smallint, 62, 30),
  ('Cu cine a urcat Moise pe munte cu noile table?', '["Împreună cu Iosua", "Singur", "Cu Aaron și Hur", "Cu cei 70 de bătrâni"]'::jsonb, 1::smallint, 63, 30),
  ('Cine a spus: „Aici este degetul lui Dumnezeu”?', '["Văduva din Sarepta", "Vrăjitorii lui Faraon", "Iacov", "Iosua"]'::jsonb, 1::smallint, 64, 30),
  ('Ce a sfărâmat Moise când a văzut vițelul de aur?', '["Idolii", "Tablele Legii", "Stânca", "Altarul"]'::jsonb, 1::smallint, 65, 30),
  ('Ce vârstă avea Moise când a fost pus pe Nil?', '["3 luni", "1 lună", "5 săptămâni", "1 an"]'::jsonb, 0::smallint, 66, 30),
  ('A câta urgie a fost vărsatul negru?', '["A 7-a", "A 5-a", "A 6-a", "A 4-a"]'::jsonb, 2::smallint, 67, 30),
  ('Din ce era constituită jertfa necurmată zilnică?', '["Din 2 miei", "Din un miel și un berbece", "Din 2 berbeci", "Din un vițel"]'::jsonb, 0::smallint, 68, 30),
  ('Cine și cui a spus: „Ce faci tu, nu este bine”?', '["Moise lui Faraon", "Moise lui Aaron", "Ietro lui Moise", "Dumnezeu lui Moise"]'::jsonb, 2::smallint, 69, 30),
  ('La cine a fost trimis Moise pentru prima dată la întoarcerea în Egipt?', '["La Faraon", "La familia lui", "La bătrânii poporului", "La moașele evreilor"]'::jsonb, 2::smallint, 70, 30),
  ('În ce zi a lunii întâi începea sărbătoarea Paștelor?', '["În ziua întâi", "În ziua a 14-a", "În ziua a 21-a", "În ziua a 7-a"]'::jsonb, 1::smallint, 71, 30),
  ('Pitom a fost:', '["Șarpele înălțat de Moise", "Un ținut din Canaan", "O cetate din Egipt", "Numele tatălui lui Moise"]'::jsonb, 2::smallint, 72, 30),
  ('Ce trebuia să facă stăpânul cu robul pe care l-a lovit și l-a făcut să își piardă vederea?', '["Să îi dea drumul", "Să îi plătească 2 talanți", "Să-l scutească de lucru 6 zile", "Să-l vândă altui stăpân"]'::jsonb, 0::smallint, 73, 30),
  ('Cine a spus cuvintele: „În tabără este un strigăt de război”?', '["Moise", "Dumnezeu", "Iosua", "Aaron"]'::jsonb, 2::smallint, 74, 30),
  ('Cine a fost Ietro și ce a făcut el pentru Israel?', '["Preot al Madianului, l-a sfătuit pe Moise să pună căpetenii", "Socrul lui Moise, a condus poporul prin Marea Roșie", "Fratele lui Moise, a făcut vițelul", "O căpetenie din seminția lui Iuda"]'::jsonb, 0::smallint, 75, 30),
  ('Unde scrie: „Domnul va împărăți în veac și în veci de veci”?', '["În capitolul 2", "În capitolul 15", "În capitolul 34", "În capitolul 20"]'::jsonb, 1::smallint, 76, 30),
  ('Care a fost prima urgie care a lovit Egiptul?', '["Prefacerea apei în sânge", "Ciuma vitelor", "Păduchii", "Broaștele"]'::jsonb, 0::smallint, 77, 30),
  ('Ce l-a determinat pe Dumnezeu să-i izbăvească pe evrei din Egipt?', '["Legământul făcut cu părinții lor", "Strigătele acestora", "Suferința grea", "Toate cele de mai sus"]'::jsonb, 0::smallint, 78, 30),
  ('După cât timp un rob evreu putea să iasă slobod de la stăpânul lui?', '["După 7 ani", "După 12 ani", "După 21 de ani", "După 50 de ani"]'::jsonb, 0::smallint, 79, 30)
) AS v(prompt, options, correct_option_index, order_index, time_limit_seconds)
WHERE (SELECT n FROM existing) = 0;

-- Batch 5
INSERT INTO public.questions (quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds)
WITH target AS (
  SELECT id FROM public.quizzes WHERE title = 'Întrebări Exod' ORDER BY created_at ASC LIMIT 1
), existing AS (
  SELECT count(*)::int AS n FROM public.questions WHERE quiz_id = (SELECT id FROM target)
)
SELECT
  (SELECT id FROM target) AS quiz_id,
  v.prompt,
  v.options,
  v.correct_option_index,
  v.order_index,
  v.time_limit_seconds
FROM (VALUES
  ('Chivotul a fost făcut din:', '["Aur pur", "Lemn de gofer", "Lemn de salcâm", "Lemn de cedru"]'::jsonb, 2::smallint, 80, 30),
  ('Cine a cântat cântarea de laudă după trecerea Mării Roșii?', '["Doar Moise și Aaron", "Copiii lui Israel", "Doar Maria cu femeile", "Iosua și Caleb"]'::jsonb, 1::smallint, 81, 30),
  ('Preoțimea a început în Israel odată cu:', '["Iacov", "Eliberarea din Egipt", "Aaron și fiii lui", "Moise la rugul aprins"]'::jsonb, 2::smallint, 82, 30),
  ('Cum se poate descrie mana din pustie?', '["Albă la culoare și cu gust de turtă cu miere", "Ca o pâine obișnuită", "Cu gust de smochine", "Ca boabele de linte roșie"]'::jsonb, 0::smallint, 83, 30),
  ('Cine a fost Șifra?', '["Soția lui Moise", "O moașă a evreilor", "O femeie madianită", "Sora lui Aaron"]'::jsonb, 1::smallint, 84, 30),
  ('Ce făcea Iosua când Moise ieșea din cort și intra în tabără?', '["Mergea tot timpul după Moise", "Nu ieșea deloc din mijlocul cortului", "Se ruga la poarta cortului", "Aduna bătrânii poporului"]'::jsonb, 1::smallint, 85, 30),
  ('Cum a reacționat Moise la vederea vițelului de aur?', '["A sfărâmat tablele legii și vițelul", "A prefăcut vițelul în cenușă pe loc", "S-a aprins de mânie", "Toate cele de mai sus"]'::jsonb, 0::smallint, 86, 30),
  ('Pe cine a chemat Faraon când a văzut toiagul prefăcut în șarpe?', '["Pe înțelepți", "Pe vrăjitori", "Pe soldați", "Pe preoții egipteni"]'::jsonb, 1::smallint, 87, 30),
  ('Când au jefuit evreii pe egipteni?', '["Când erau robi în Egipt", "Când au ieșit din Egipt", "La Marea Roșie", "După trecerea prin pustie"]'::jsonb, 1::smallint, 88, 30),
  ('Unde a spus Domnul să tăbărască evreii prima dată după ieșire?', '["Înaintea Pihahirotului", "Între Migdol și mare", "Față în față cu Baal-Țefon", "Toate cele de mai sus (contextual)"]'::jsonb, 3::smallint, 89, 30),
  ('Cine a aruncat cenușa spre cer când aceasta a dat naștere beșicilor?', '["Aaron", "Moise", "Moise și Aaron", "Iosua"]'::jsonb, 1::smallint, 90, 30),
  ('Cum se numeau moașele evreilor care nu au ascultat de Faraon?', '["Șifra și Pua", "Iochebed și Maria", "Sefora și Maria", "Debora și Estera"]'::jsonb, 0::smallint, 91, 30),
  ('Din ce a fost făcut vițelul de aur?', '["Inele de aur", "Cercei de aur", "Cercei și inele de aur", "Vase de aur furate"]'::jsonb, 1::smallint, 92, 30),
  ('Cât timp a durat șederea copiilor lui Israel în Egipt?', '["430 de ani", "450 de ani", "400 de ani", "215 ani"]'::jsonb, 0::smallint, 93, 30),
  ('Ce slujbă aveau căpeteniile alese de Moise?', '["Să judece pricinile cele mai mici", "Să călăuzească prin pustie", "Să ducă poporul în Canaan", "Să păzească cortul"]'::jsonb, 0::smallint, 94, 30),
  ('Ce trebuia să ceară fiecare evreu de la vecinul lui la plecare?', '["Vase de aur", "Vase de argint", "Vase de pământ", "Vase de argint și de aur"]'::jsonb, 3::smallint, 95, 30),
  ('Cine a strigat când și-a afirmat credincioșia la vițelul de aur?', '["Moise", "Iov", "Dumnezeu", "Levi"]'::jsonb, 0::smallint, 96, 30),
  ('Cine s-a întâlnit cu Moise la muntele lui Dumnezeu când s-a întors?', '["Domnul", "Aaron", "Faraon", "Ietro"]'::jsonb, 1::smallint, 97, 30),
  ('Câți oameni s-au suit cu Moise pe deal în timpul luptei cu Amalec?', '["Niciunul", "Doi (Aaron și Hur)", "Trei", "Toți bătrânii"]'::jsonb, 1::smallint, 98, 30),
  ('Cine pândea să vadă ce se întâmplă cu Moise în sicriașul de papură?', '["Maria, sora sa", "Mama sa", "Fiica lui Faraon", "Moașa Șifra"]'::jsonb, 0::smallint, 99, 30)
) AS v(prompt, options, correct_option_index, order_index, time_limit_seconds)
WHERE (SELECT n FROM existing) = 0;

-- Batch 6
INSERT INTO public.questions (quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds)
WITH target AS (
  SELECT id FROM public.quizzes WHERE title = 'Întrebări Exod' ORDER BY created_at ASC LIMIT 1
), existing AS (
  SELECT count(*)::int AS n FROM public.questions WHERE quiz_id = (SELECT id FROM target)
)
SELECT
  (SELECT id FROM target) AS quiz_id,
  v.prompt,
  v.options,
  v.correct_option_index,
  v.order_index,
  v.time_limit_seconds
FROM (VALUES
  ('Completează: „Domnul se va lupta pentru voi; dar voi...”', '["Scoateți strigăte", "Porniți înainte", "Stați liniștiți", "Săpați șanțuri"]'::jsonb, 2::smallint, 100, 30),
  ('Ce reprezentau hainele sfinte ale preoților?', '["Averea purtătorului", "Cinste și podoabă", "Deosebirea de oameni", "Protecție împotriva focului"]'::jsonb, 1::smallint, 101, 30),
  ('Eliezer a fost:', '["Tatăl lui Fineas", "Fiul lui Aaron", "Fiul lui Moise", "O căpetenie din Egipt"]'::jsonb, 2::smallint, 102, 30),
  ('Când l-a amenințat Faraon pe Moise cu moartea dacă îl mai vede?', '["Înainte de urgia a 7-a", "După urgia a 8-a", "După urgia a 9-a", "La începutul robiei"]'::jsonb, 2::smallint, 103, 30),
  ('Cine și cui a spus cuvintele: „Du-te în pace”?', '["Ietro lui Moise", "Ionatan lui David", "Isus femeii", "Moise lui Faraon"]'::jsonb, 0::smallint, 104, 30),
  ('Care capitol din Exodul conține cele zece porunci?', '["Capitolul 10", "Capitolul 20", "Capitolul 30", "Capitolul 15"]'::jsonb, 1::smallint, 105, 30),
  ('Ce obiect a folosit Moise pentru vindecarea apelor de la Mara?', '["Un toiag", "Un lemn", "O piatră", "Sare"]'::jsonb, 1::smallint, 106, 30),
  ('Cui a făcut Dumnezeu case pentru că s-au temut de El?', '["Copiilor lui Israel", "Egiptenilor", "Moașelor evreilor", "Preoților lui Ietro"]'::jsonb, 2::smallint, 107, 30),
  ('Când trebuiau purtate hainele preoțești?', '["Tot timpul", "Când intrau în cort", "Când făceau o slujbă în cort", "În ziua de Sabat"]'::jsonb, 2::smallint, 108, 30),
  ('Câți ani a trăit Levi?', '["127", "117", "137", "110"]'::jsonb, 2::smallint, 109, 30),
  ('Diferența de vârstă între Aaron și Moise a fost de:', '["10 ani", "7 ani", "3 ani", "5 ani"]'::jsonb, 2::smallint, 110, 30),
  ('Prin cine a izbăvit Dumnezeu pe evrei?', '["Aaron", "Moise", "Iosua", "Îngerul Morții"]'::jsonb, 1::smallint, 111, 30),
  ('Cât trebuiau să dea cei de peste 20 de ani ca dar de răscumpărare?', '["Un siclu", "O jumătate de siclu", "Doi sicli", "Un talant"]'::jsonb, 1::smallint, 112, 30),
  ('Unde scrie „fii cu ochii în patru înaintea îngerului Meu”?', '["În capitolul 3", "În capitolul 19", "În capitolul 23", "În capitolul 33"]'::jsonb, 2::smallint, 113, 30),
  ('Care a fost primul popas după ieșirea din Egipt?', '["Etam", "Mara", "Sucot", "Elim"]'::jsonb, 2::smallint, 114, 30),
  ('Din ce seminție a făcut parte Moise?', '["A lui Levi", "A lui Iuda", "A lui Beniamin", "A lui Ruben"]'::jsonb, 0::smallint, 115, 30),
  ('Cine avea voie să se apropie de Domnul pe muntele Sinai la început?', '["Doar Moise", "Doar Aaron și Moise", "Doar bătrânii", "Tot poporul"]'::jsonb, 0::smallint, 116, 30),
  ('Care a fost prima minune (semn) în fața lui Faraon?', '["Apa în sânge", "Toiagul prefăcut în șarpe", "Păduchii", "Întunericul"]'::jsonb, 1::smallint, 117, 30),
  ('Ce a făcut Moise cu vițelul de aur?', '["L-a ars și l-a făcut cenușă în apă", "L-a îngropat în nisip", "L-a dat înapoi lui Aaron", "L-a spart cu ciocanul"]'::jsonb, 0::smallint, 118, 30),
  ('Câte zile trebuia poporul să se sfințească înainte de darea Legii?', '["Două zile", "Trei zile", "Șapte zile", "40 de zile"]'::jsonb, 0::smallint, 119, 30)
) AS v(prompt, options, correct_option_index, order_index, time_limit_seconds)
WHERE (SELECT n FROM existing) = 0;

-- Batch 7
INSERT INTO public.questions (quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds)
WITH target AS (
  SELECT id FROM public.quizzes WHERE title = 'Întrebări Exod' ORDER BY created_at ASC LIMIT 1
), existing AS (
  SELECT count(*)::int AS n FROM public.questions WHERE quiz_id = (SELECT id FROM target)
)
SELECT
  (SELECT id FROM target) AS quiz_id,
  v.prompt,
  v.options,
  v.correct_option_index,
  v.order_index,
  v.time_limit_seconds
FROM (VALUES
  ('Completează: „Domnul va binecuvânta...”', '["Țara", "Pâinea și apele", "Hainele", "Casele voastre"]'::jsonb, 1::smallint, 120, 30),
  ('Proorocița din Israel care a cântat la instrument a fost:', '["Debora", "Maria, sora lui Moise", "Hulda", "Estera"]'::jsonb, 1::smallint, 121, 30)
) AS v(prompt, options, correct_option_index, order_index, time_limit_seconds)
WHERE (SELECT n FROM existing) = 0;

