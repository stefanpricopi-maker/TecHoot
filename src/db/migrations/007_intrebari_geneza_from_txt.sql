-- Quiz din Intrebari_geneza.txt (parsat automat).
-- Răspunsuri: euristică pe baza textului Geneză; verifică înainte de producție.
-- Idempotent: inserează doar dacă nu există deja întrebări pentru acest quiz.

INSERT INTO public.quizzes (title, description)
SELECT
  'Întrebări Geneza (fișier)',
  'Import din Intrebari_geneza.txt — verifică răspunsurile corecte în DB dacă e nevoie.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.quizzes WHERE title = 'Întrebări Geneza (fișier)'
);

WITH target AS (
  SELECT id FROM public.quizzes WHERE title = 'Întrebări Geneza (fișier)' ORDER BY created_at ASC LIMIT 1
),
ins AS (

    SELECT target.id, 'cine este acela despre care se spune că a început să fie puternic pe pământ?', '["Cuș", "Nimrod", "Canaan"]'::jsonb, 1::smallint, 0, 30 FROM target
  UNION ALL
    SELECT target.id, 'care a fost argumentul lui iacov de a nu însoți pe esau?', '["Copiii micșori", "Vacile fătate", "Berbecii înfierbântați"]'::jsonb, 0::smallint, 1, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce animal a dat avraam slugii să-l gătească pentru cei trei oameni?', '["un vițel tânăr", "un miel sugar", "doi berbeci"]'::jsonb, 0::smallint, 2, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a întâlnit iacov, lângă fântâna, când a ajuns la laban?', '["Zece turme de oi", "Trei turme de oi", "Doar niște pastori"]'::jsonb, 2::smallint, 3, 30 FROM target
  UNION ALL
    SELECT target.id, 'la vârsta de nouăzeci de ani, enos a născut pe .....', '["Mahalaleel", "Cainan", "Enoh"]'::jsonb, 1::smallint, 4, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre soțiile lui iacov a murit cea dintâi?', '["Lea", "Rahela", "Bilha"]'::jsonb, 1::smallint, 5, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde s-a stabilit esau împreună cu familia lui?', '["În muntele Seir", "În Padan-Aram", "La Betel"]'::jsonb, 0::smallint, 6, 30 FROM target
  UNION ALL
    SELECT target.id, 'din care fiu al lui noe a ieșit lot, nepotul lui avraam?', '["Sem", "Ham", "Iafet"]'::jsonb, 0::smallint, 7, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce vârstă avea avraam când s-a născut ismael?', '["86 de ani", "75 de ani", "99 de ani"]'::jsonb, 0::smallint, 8, 30 FROM target
  UNION ALL
    SELECT target.id, 'cărui copil ia dăruit iacov ceva special?', '["Ruben", "Iuda", "Iosif"]'::jsonb, 2::smallint, 9, 30 FROM target
  UNION ALL
    SELECT target.id, 'în a câta zi a creat dumnezeu pământul?', '["A 2-a", "A 3-a", "A 4-a"]'::jsonb, 1::smallint, 10, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde locuise iacov, înainte de a pleca în egipt la iosif și a se stabili acolo?', '["La Betel", "La Beer-Șeba", "La Hebron"]'::jsonb, 1::smallint, 11, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum a murit sihem?', '["Din cauza tăierea împrejur la o vârstă înaintată", "Ucis de sabie", "De moarte naturală"]'::jsonb, 1::smallint, 12, 30 FROM target
  UNION ALL
    SELECT target.id, 'care a fost cauza decesului lui er, fiul lui iuda?', '["Nu a vrut să ridice sămânță fratelui său", "Era rău înaintea Domnului", "A murit în război"]'::jsonb, 1::smallint, 13, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a fost îngropată sub stejarul jalei?', '["Debora", "Rebeca", "Rahela"]'::jsonb, 0::smallint, 14, 30 FROM target
  UNION ALL
    SELECT target.id, 'în ce zi a creat dumnezeu animalele?', '["În ziua a cincea și a șasea", "În ziua a patra", "Doar în ziua a șasea"]'::jsonb, 0::smallint, 15, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a făcut avraam atunci când dumnezeu a schimbat numele nevestei lui în sara și îi spune că aceasta va mai naște un fiu?', '["Avraam s-a aruncat cu fața la pământ", "Avraam a râs", "Avraam a adus o jertfă înaintea Domnului"]'::jsonb, 1::smallint, 16, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a creat dumnezeu în a treia zi?', '["Cerul", "Pământul și vegetația", "Viețuitoarele pământului"]'::jsonb, 1::smallint, 17, 30 FROM target
  UNION ALL
    SELECT target.id, 'în ce era foarte bogat avraam?', '["În vite", "În aur", "În argint"]'::jsonb, 0::smallint, 18, 30 FROM target
  UNION ALL
    SELECT target.id, 'de câte ori a mijlocit avraam înaintea lui dumnezeu pentru lot?', '["De 6 ori", "De 4 ori", "De 5 ori"]'::jsonb, 0::smallint, 19, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce dar a promis iuda „curvei” tamar?', '["Un miel", "Un ied", "Doua măsuri de grâu"]'::jsonb, 1::smallint, 20, 30 FROM target
  UNION ALL
    SELECT target.id, 'cât timp este scris că a locuit avraam în țara filistenilor?', '["Multă vreme", "Puțină vreme", "Doar la bătrânețe"]'::jsonb, 0::smallint, 21, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a locuit lot cu cele două fete ale lui după ce a ieșit din țoar?', '["Între Cades și Șur", "Într-o peșteră", "În Gherar"]'::jsonb, 1::smallint, 22, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a adus lui lea mandragore?', '["Iacov", "Laban", "Ruben"]'::jsonb, 2::smallint, 23, 30 FROM target
  UNION ALL
    SELECT target.id, 'cui spune dumnezeu următorul lucru: „uită-te spre cer și numără stelele, dacă poți să le numeri. așa va fi sămânța ta.”', '["Lui Avram", "Lui Iacov", "Lui Enoh"]'::jsonb, 0::smallint, 24, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se chemau fiii lui elifaz?', '["Teman și Omar", "Omar și Tefo", "Gaetam și Chenaz"]'::jsonb, 0::smallint, 25, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a răspuns eva șarpelui?', '["”Înapoia mea satano!”", "”Adam a zis să nu gust din rodul pomului acestuia”", "Nu a dat niciun răspuns șarpelui"]'::jsonb, 1::smallint, 26, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde este scrisă prima profeție despre isus?', '["Geneza 3:15", "Geneza 2:7", "Geneza 5:15"]'::jsonb, 0::smallint, 27, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce le-a cerut iosif frațiilor săi pentru a dovedi că nu sunt iscoade?', '["Informații concrete", "Aducerea lui Beniamin", "Aducerea lui Iacov"]'::jsonb, 1::smallint, 28, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine și despre cine a spus: „tu ești ca un domnitor al lui dumnezeu în mijlocul nostru?', '["Egiptenii, despre Iosif", "Fiii lui Het, despre Avraam", "Fiii lui Sihem și Hamor, despre Iacov"]'::jsonb, 0::smallint, 29, 30 FROM target
  UNION ALL
    SELECT target.id, 'în care din următoarelor relații de imoralitate bărbatul s-a culcat cu noră-sa?', '["Dina – Sihem", "Ruben - Bilha", "Iuda – Tamar"]'::jsonb, 1::smallint, 30, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum s-a numit bunicul lui avraam?', '["Nahor", "Terah", "Haran"]'::jsonb, 1::smallint, 31, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți copii ai lui iacov, au mers prima dată în egipt după merinde?', '["Zece copii", "Unsprezece copii", "Doisprezece copii"]'::jsonb, 0::smallint, 32, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce nume a pus cain, cetății pe care a zidit-o?', '["Enoh", "Numele fiului său", "Nu este precizat in Biblie"]'::jsonb, 1::smallint, 33, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre următoarele cuvinte fac parte din binecuvântarea rostită de iacov pentru iosif?', '["„...arcul lui a rămas tare”", "„...a ajuns astfel păstorul, stânca lui Israel”", "„...este vlăstarul unui pom roditor”"]'::jsonb, 0::smallint, 34, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine era esau?', '["Un grădinar", "Un vânător", "Un om inistit"]'::jsonb, 1::smallint, 35, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a spus: domnul să vegheze asupra noastră, când ne vom pierde din vedere unul pe altul?', '["Laban", "Iacov", "Esau"]'::jsonb, 0::smallint, 36, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine s-a prefăcut într-un stâlp de sare din cauza că s-a uitat înapoi?', '["Nevasta lui Avram", "Nevasta lui Lot", "Nevasta lui Iacov"]'::jsonb, 1::smallint, 37, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine au fost părinții lui madian?', '["Esau și Mahalat", "Lot și una din fetele sale", "Avraam și Chetura"]'::jsonb, 2::smallint, 38, 30 FROM target
  UNION ALL
    SELECT target.id, 'femeia a răspuns: „șarpele m-a ..... și am mâncat din pom.”', '["Amăgit", "Păcălit", "Mințit"]'::jsonb, 0::smallint, 39, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a avut iacov când a ajuns în egipt?', '["130", "140", "147"]'::jsonb, 0::smallint, 40, 30 FROM target
  UNION ALL
    SELECT target.id, 'la ospățul lui iosif, cu cât a primit beniamin mai multă mâncare decât ceilalți?', '["De 3 ori mai mult", "De două ori mai mult", "De 5 ori mai mult"]'::jsonb, 2::smallint, 41, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce aspus rahela după ce l-a născut pe iosif?', '["”Mi-a luat Dumnezeu ocara”", "”Frumos dar mi-a dat Dumnezeu”", "”Ce fericită sunt”"]'::jsonb, 0::smallint, 42, 30 FROM target
  UNION ALL
    SELECT target.id, 'care a fost numele initial al hebronului?', '["Chiriat-Arba", "Padan-Aram", "Dotan"]'::jsonb, 0::smallint, 43, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde era sarai atunci când au venit cei trei bărbați la avraam?', '["În cort", "La ușa cortului", "Sub copac"]'::jsonb, 1::smallint, 44, 30 FROM target
  UNION ALL
    SELECT target.id, 'pe cine nu au crezut ginerii lui lot, când le-au vorbit?', '["Pe Lot", "Pe îngerii Domnului", "Pe împăratul Sodomei și Gomorei"]'::jsonb, 1::smallint, 45, 30 FROM target
  UNION ALL
    SELECT target.id, 'era sarai stearpă?', '["Da", "Nu", "Nu este menționat"]'::jsonb, 0::smallint, 46, 30 FROM target
  UNION ALL
    SELECT target.id, 'cui i-a spus îngerul domnului: scapă-ți viața?', '["Lui Noe", "Lui Iacov", "Lui Lot"]'::jsonb, 2::smallint, 47, 30 FROM target
  UNION ALL
    SELECT target.id, '„atunci, dumnezeu a zis lui noe: „sfârșitul oricărei făpturi este hotărât înaintea ....., fiindcă au umplut pământul de .....”', '["Cerurilor/păcat", "Mea/silnicie", "Tuturor/răutate"]'::jsonb, 1::smallint, 48, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a spus că îi „fugea somnul de pe ochi”?', '["Iacov", "David", "Petru"]'::jsonb, 1::smallint, 49, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani avea avram când dumnezeu a schimbat numele lui în avraam?', '["90 de ani", "190 de ani", "145 de ani"]'::jsonb, 1::smallint, 50, 30 FROM target
  UNION ALL
    SELECT target.id, 'care femeie a declarat că s-a scârbit de viață?', '["Rebeca", "Abigail", "Naomi"]'::jsonb, 0::smallint, 51, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce animale a visat faraon?', '["Oi", "Vaci", "Lăcuste"]'::jsonb, 1::smallint, 52, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre fiii lui iacov s-au năpustit asupra cetății unde locuia sihem și au omorât pe toți bărbații?', '["Simeon și Levi", "Neftali și Gad", "Simeon și Așer"]'::jsonb, 1::smallint, 53, 30 FROM target
  UNION ALL
    SELECT target.id, 'care este prima culoare menționată în biblie', '["albastru", "verde", "alb"]'::jsonb, 1::smallint, 54, 30 FROM target
  UNION ALL
    SELECT target.id, 'în a câtea zi a făcut dumnezeu viețuitoarele pământului?', '["a 3-a", "a 6-a", "a 5-a"]'::jsonb, 1::smallint, 55, 30 FROM target
  UNION ALL
    SELECT target.id, 'încotro au plecat terah, avram și lot?', '["Țara Uț:", "Țara Havila", "Haldeia"]'::jsonb, 2::smallint, 56, 30 FROM target
  UNION ALL
    SELECT target.id, 'a cui tată era enos?', '["Cain", "Cainan", "Canos"]'::jsonb, 1::smallint, 57, 30 FROM target
  UNION ALL
    SELECT target.id, 'din care pom interzis au mâncat adam și eva?', '["Din pomul vieții", "Din pomul cunoștinței binelui și răului", "Din pomul sfințit"]'::jsonb, 1::smallint, 58, 30 FROM target
  UNION ALL
    SELECT target.id, 'de ce a fost iosif urât de frații săi?', '["Pentru că Iosif era singurul căruia Dumnezeu îi vorbea", "Pentru că frații lui au văzut că tatăl lor îl iubea mai mult pe Iosif decât pe ei toți", "Pentru că Iosif era foarte lingușitor în preajma tatălui lor"]'::jsonb, 1::smallint, 59, 30 FROM target
  UNION ALL
    SELECT target.id, 'pe cine a însărcinat avraam sa se găsească soție fiului sau?', '["Pe cel mai tânăr slujitor din casa sa", "Pe îngrijitorul tuturor averilor lui Avraam", "Pe Sarai"]'::jsonb, 1::smallint, 60, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a ales numele copilului agarei, ismael?', '["Dumnezeu", "Avraam", "Agar"]'::jsonb, 0::smallint, 61, 30 FROM target
  UNION ALL
    SELECT target.id, 'din ce animal, a fost gătită mâncarea pe care a servit-o isaac inainte de a binecuvanta pe iacov?', '["Din 2 berbeci", "Din 2 iezi", "Din 2 viței"]'::jsonb, 1::smallint, 62, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre cei doisprezece patriarhi, fii ai lui israel, a avut cei mai puțini copii?', '["Patriarhul Iosif", "Patriarhul Dan", "Patriarhul Levi"]'::jsonb, 0::smallint, 63, 30 FROM target
  UNION ALL
    SELECT target.id, 'care era numele celui dintâi braț?', '["Pison", "Hidechel", "Eufrat"]'::jsonb, 0::smallint, 64, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce i-a promis dumnezeu lui avram?', '["Că îl va face un neam mare", "Că va avea un nume mare", "Că va fi binecuvântat"]'::jsonb, 0::smallint, 65, 30 FROM target
  UNION ALL
    SELECT target.id, 'care sunt cei doi fii ai lui isaac?', '["Esau si Iacov", "Esau si Ismael", "Iacov si Iosif"]'::jsonb, 0::smallint, 66, 30 FROM target
  UNION ALL
    SELECT target.id, 'din ce le-a făcut dumnezeu haine lui adam și eva?', '["Frunze", "Piele", "Blană"]'::jsonb, 1::smallint, 67, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce pasare a trimis noe întâi din corabie?', '["Porumbelul", "Corbul", "Nu este precizat"]'::jsonb, 1::smallint, 68, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce animale a găsit paharnicul lui faraon?', '["Vite", "Oi", "Păsări"]'::jsonb, 0::smallint, 69, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce nume i-a dat faraon lui iosif?', '["Asnat", "Poti-Fera", "Țafnat-Paeneah"]'::jsonb, 2::smallint, 70, 30 FROM target
  UNION ALL
    SELECT target.id, 'despre cine se spune că a născut un fiu după chipul și asemănarea lui?', '["Despre Adam", "Despre Avraam", "Despre Iosif"]'::jsonb, 0::smallint, 71, 30 FROM target
  UNION ALL
    SELECT target.id, 'care din următoarele cuvinte fac parte din rugăciunea lui iacov, înainte de întâlnirea cu esau?', '["„Dumnezeul tatălui meu Avraam”", "„Dumnezeul tatălui meu Isaac”", "„Mi-ai zis...te voi binecuvânta”"]'::jsonb, 1::smallint, 72, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a construit un oraș numit enoh?', '["Nimrod", "Cain", "Enoh"]'::jsonb, 1::smallint, 73, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce făcea diferența între faraon și iosif în egipt?', '["Scaunul de domnie", "Vârsta", "Nimic"]'::jsonb, 0::smallint, 74, 30 FROM target
  UNION ALL
    SELECT target.id, 'în care carte avram este numit evreul?', '["În Geneza", "În Exod", "În Deuteronom"]'::jsonb, 0::smallint, 75, 30 FROM target
  UNION ALL
    SELECT target.id, 'din ce animal, a fost gătită mâncarea pe care a servit-o isaac inainte de a binecuvanta pe iacov?', '["Din vânat", "Din 2 iezi", "Dintr-un vițel"]'::jsonb, 1::smallint, 76, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum a pus iacov nume locului unde l-au întâlnit îngerii lui dumnezeu?', '["Mehanaim", "Mahanaim", "Mahanaiot"]'::jsonb, 1::smallint, 77, 30 FROM target
  UNION ALL
    SELECT target.id, 'rebeca era ...', '["foarte frumoasă", "fecioară", "singură la părinți"]'::jsonb, 0::smallint, 78, 30 FROM target
  UNION ALL
    SELECT target.id, 'alegeți omul căruia dumnezeu i-a spus: „voi face din tine un neam mic și te voi binecuvânta”?', '["Noe", "Isaac", "Avraam"]'::jsonb, 2::smallint, 79, 30 FROM target
  UNION ALL
    SELECT target.id, 'in visul căruia dintre slujitori lui faraon, au fost prezente animale?', '["Paharnicului", "Pitarului", "Paharnicul si pitarul"]'::jsonb, 2::smallint, 80, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit iacov?', '["O sută optzeci și cinci de ani", "O sută patruzeci și șapte de ani", "O sută treizeci și opt de ani"]'::jsonb, 1::smallint, 81, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum s-a numit fiul lui cain?', '["Irad", "Enoh", "Enos"]'::jsonb, 1::smallint, 82, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine l-a dus pe iosif în egipt?', '["Frații lui", "Niște ismaeliți", "Niște filisteni"]'::jsonb, 1::smallint, 83, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce peșteră a cumpărat avraam ca să o îngroape pe sara, soția sa?', '["Peștera din deșertul En-Gheli", "Peștera din Meghido", "Peștera din Macpela"]'::jsonb, 2::smallint, 84, 30 FROM target
  UNION ALL
    SELECT target.id, 'in ce tinut au locuit evreii in egipt?', '["Havila", "tinutul lui Ramses", "Gosen"]'::jsonb, 2::smallint, 85, 30 FROM target
  UNION ALL
    SELECT target.id, 'cu ce se încheie cartea geneza?', '["Cu moartea lui Iacov", "Cu moartea Faraonului", "Cu moartea lui Iosif"]'::jsonb, 2::smallint, 86, 30 FROM target
  UNION ALL
    SELECT target.id, 'de ce își vărsa onan sămânța pe pământ?', '["pentru că știa că acesasta nu o să fie a lui", "nu dorea să dea sămânță fratelui său", "pentru că așa i-a poruncit Dumnezeu"]'::jsonb, 1::smallint, 87, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine au fost cei izbăviți din gomora?', '["Lot, nevasta sa și cele două fiice ale sale", "Lot cu familia și cu ginerii săi", "Lot și cele trei fiice ale sale"]'::jsonb, 0::smallint, 88, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a văzut iosif, in primul vis?', '["Soare", "Snopi", "Stele"]'::jsonb, 1::smallint, 89, 30 FROM target
  UNION ALL
    SELECT target.id, 'care din următoarele cuvinte fac parte din rugăciunea lui iacov, înainte de întâlnirea cu esau?', '["„Eu sunt prea mic și casa tatălui meu e neînsemnată”", "„Izbăvește-mă te rog”", "„Îți voi face sămânța ca pulberea mări cele mari”"]'::jsonb, 0::smallint, 90, 30 FROM target
  UNION ALL
    SELECT target.id, 'de ce a mers avram în egipt?', '["Din cauza războiului", "Din cauza foametei", "Din cauza sărăciei"]'::jsonb, 1::smallint, 91, 30 FROM target
  UNION ALL
    SELECT target.id, '„au trecut ..... zile și fata lui șua, nevasta lui iuda, a murit. după ce au trecut zilele de jale, iuda s-a suit la ....., la cei cei ce-i tundeau oile, el și prietenul său ....., adulamitul.”', '["multe/Timna/Hira", "70/Dotan/Zerah", "puține/Mițpa/Pereț"]'::jsonb, 1::smallint, 92, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit noe?', '["600", "930", "950"]'::jsonb, 2::smallint, 93, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit cainan?', '["Nouă sute de ani", "Nouă sute zece ani", "Nouă sute douăzeci de ani"]'::jsonb, 1::smallint, 94, 30 FROM target
  UNION ALL
    SELECT target.id, 'care sunt cei trei fii ai lui noe?', '["Set, Lameh și Irad", "Metusala, Mehuiael și Metușael", "Sem, Ham și Iafet"]'::jsonb, 2::smallint, 95, 30 FROM target
  UNION ALL
    SELECT target.id, 'avraam cand a facut legamant cu abimelec i-a dat', '["7 camile", "7 sicli de aur", "7 mielusele"]'::jsonb, 2::smallint, 96, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde s-a așezat esau după ce s-a despărțit de fratele său iacov?', '["În muntele Seir", "În muntele Galaad", "În muntele Hor"]'::jsonb, 1::smallint, 97, 30 FROM target
  UNION ALL
    SELECT target.id, 'care este primul om pe care biblia îl numește evreu?', '["Avraam", "Noe", "Iacov"]'::jsonb, 0::smallint, 98, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde i-a cerul dumnezeu lui avraam să aducă jertfă pe isaac?', '["Pe un munte", "În țara Moria", "În mijlocul unei cetăți părăsite"]'::jsonb, 1::smallint, 99, 30 FROM target
  UNION ALL
    SELECT target.id, 'care a fost cauza despărțirii lui lot de avram?', '["Țara era prea mică", "Cearta dintre păzitorii vitelor", "Câmpia întinsă a Gomorei și Sodomei"]'::jsonb, 1::smallint, 100, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum s-a dovedit binecuvântarea lui dumnezeu față de isaac, când a făcut semănături în gherar?', '["A strâns rod înzecit", "A strâns rod însutit", "A strâns rod mai puțin decât semănase"]'::jsonb, 1::smallint, 101, 30 FROM target
  UNION ALL
    SELECT target.id, 'care a fost motivul pentru care a murit onan, fiul lui iuda?', '["Pentru că a fost idolatru", "Pentru că a făcut ce nu plăcea Domnului", "Pentru că n-a vrut să ridice urmași fratelui său"]'::jsonb, 1::smallint, 102, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum erau oamenii înainte de ispitirea femeii?', '["goi", "separați", "nu cunoșteau rușinea"]'::jsonb, 2::smallint, 103, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce varsta avea avram cand dumnezeu i-a spus despre taierea imprejur si totodata i-a schimbat si numele in avraam?', '["98", "99", "100"]'::jsonb, 1::smallint, 104, 30 FROM target
  UNION ALL
    SELECT target.id, 'despre cine este menționat că dumnezeu i-a binecuvântat după ce i-a creat?', '["Peștii cei mari", "Păsările înaripate", "Nu este menționat"]'::jsonb, 1::smallint, 105, 30 FROM target
  UNION ALL
    SELECT target.id, 'canaan a fost fiul lui:', '["Sem", "Ham", "Iafet"]'::jsonb, 1::smallint, 106, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce vârstă avea avraam, când s-a născut ismael', '["90 / 98", "86 / 100", "88 / 99"]'::jsonb, 1::smallint, 107, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce sentimente', '["Frică", "Veselie", "Bucurie"]'::jsonb, 0::smallint, 108, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum l-a numit iosif pe întâiul său născut?', '["Efraim", "Beniamin", "Dan"]'::jsonb, 0::smallint, 109, 30 FROM target
  UNION ALL
    SELECT target.id, 'care era numele nevestei lui nahor, fratele lui avram?', '["Milca", "Rebeca", "Estera"]'::jsonb, 0::smallint, 110, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce trebuia să facă omul în grădina edenului?', '["Să se odihnească", "Să o lucreze", "Să o păzească"]'::jsonb, 1::smallint, 111, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum era er înaintea domnului?', '["Era rău", "Era bun", "Era rău din cale afară"]'::jsonb, 2::smallint, 112, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numea țara în care a locuit cain după ce a ieșit din fața domnului?', '["Nir", "Nebo", "Nod"]'::jsonb, 2::smallint, 113, 30 FROM target
  UNION ALL
    SELECT target.id, 'prima mențiune despre venirea lui mesia are loc în:', '["Geneza 3", "Geneza 22", "Geneza 49"]'::jsonb, 0::smallint, 114, 30 FROM target
  UNION ALL
    SELECT target.id, 'cui i-au spus îngerii domnului: „scapă-ți viața”?', '["Lui Lot", "Lui Noe", "Lui Avraam"]'::jsonb, 0::smallint, 115, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a răspuns rebeca, robului lui avraam?', '["Bea domnul meu", "Voi adăpa întreaga ta casă:", "Poți bea daca dorești"]'::jsonb, 1::smallint, 116, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a făcut sarai după ce roaba ei a rămas însărcinată?', '["A privit cu dispreț pe roaba ei", "S-a purtat rău cu roaba ei", "A bătut cu nuiele pe roaba ei"]'::jsonb, 1::smallint, 117, 30 FROM target
  UNION ALL
    SELECT target.id, 'despre cine este scris că a trăit 777 de ani?', '["Lameh", "Noe", "Metusala"]'::jsonb, 0::smallint, 118, 30 FROM target
  UNION ALL
    SELECT target.id, 'in ce tara au imparatit urmasii lui esau?', '["Gherar", "Edom", "Gosen"]'::jsonb, 1::smallint, 119, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre soțiile lui iacov a avut cei mai mulți copii și câți?', '["Lea:7", "Rahela:3", "Lea:2"]'::jsonb, 1::smallint, 120, 30 FROM target
  UNION ALL
    SELECT target.id, 'la ce vârstă a mijlocit avraam pentru sodoma și gomora?', '["La 90 de ani", "La 99 de ani", "La 100 de ani"]'::jsonb, 1::smallint, 121, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a spus unor oameni: să nu vă certați pe drum?', '["Moise", "Iosif", "Iacov"]'::jsonb, 1::smallint, 122, 30 FROM target
  UNION ALL
    SELECT target.id, 'ur era un oras care apartinea de ...?', '["Haldea", "Hoba", "Sidim"]'::jsonb, 1::smallint, 123, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a avut ideea să vândă pe iosif pe 30 arginți?', '["Ruben", "Potifar", "Iuda"]'::jsonb, 2::smallint, 124, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum i-a binecuvântat iacov pe fiii lui?', '["Cu o binecuvântare deosebită", "Cu o binecuvântare doar pentru prezent", "Niciun răspuns nu este corect"]'::jsonb, 0::smallint, 125, 30 FROM target
  UNION ALL
    SELECT target.id, 'cat a trait sara, sotia lui avraam?', '["127 ani", "125 ani", "123 ani"]'::jsonb, 0::smallint, 126, 30 FROM target
  UNION ALL
    SELECT target.id, 'în ce împrejurare se vorbește despre șilo (mesia) în geneza?', '["Când Dumnezeu a rostit blestemul pentru șarpe și pentru femeie", "După potop, când Dumnezeu încheie legământul cu Noe", "Când Iacov rostește binecuvântarea pentru fiii săi"]'::jsonb, 1::smallint, 127, 30 FROM target
  UNION ALL
    SELECT target.id, 'care bărbat s-a rugat pentru mai multe femei odată, ca să poată să nască?', '["Avraam", "David", "Ilie"]'::jsonb, 0::smallint, 128, 30 FROM target
  UNION ALL
    SELECT target.id, 'care din brațele râului care izvora din eden, înconjura țara cuș?', '["Ghihon", "Pison", "Hidechel"]'::jsonb, 1::smallint, 129, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce vârstă avea ismael când a fost tăiat împrejur?', '["Opt zile", "Zece ani", "Treisprezece ani"]'::jsonb, 0::smallint, 130, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a pretins să fie răzbunat de 70 de ori câte șapte, dacă va fi omorât?', '["Cain", "Lameh", "Enos"]'::jsonb, 1::smallint, 131, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a fost îngropat iacov?', '["În Peștera Macpela", "În Egipt", "În ogorul lui Efron"]'::jsonb, 1::smallint, 132, 30 FROM target
  UNION ALL
    SELECT target.id, 'câte vaci slabe a visat faraon?', '["7", "11", "15"]'::jsonb, 0::smallint, 133, 30 FROM target
  UNION ALL
    SELECT target.id, 'despre care dintre persoanele enumerate mai jos se spune că au plâns?', '["Esau, Iosif, Beniamin", "Saul, David, Ioas", "Estera, Petru"]'::jsonb, 1::smallint, 134, 30 FROM target
  UNION ALL
    SELECT target.id, '„... avram avea ..... de ani când a ieșit din haran. avram a luat pe ....., nevastă-sa, și pe ....., fiul fratelui său, împreună cu toate averile, pe care le strânseseră și cu toate slugile pe care le câștigaseră în haran.”', '["130/Milca/Sem", "75/Sarai/Lot", "65/Sara/Iafet"]'::jsonb, 1::smallint, 135, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde i-a găsit iosif pe frații săi?', '["La Sihem", "La Dotan", "La Hebron"]'::jsonb, 1::smallint, 136, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a murit rahela?', '["La Betleem Efrata", "Între Betel și Sihem", "Între Betel și Betleem"]'::jsonb, 0::smallint, 137, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce animal au junghiat pentru a înmuia haina lui iosif?', '["O oaie", "Un tap", "Un miel"]'::jsonb, 1::smallint, 138, 30 FROM target
  UNION ALL
    SELECT target.id, '„nu este bine ca omul să fie singur ..... „ ce a hotărât dumnezeu să-i facă?', '["soție", "logodnică", "tovarășă"]'::jsonb, 0::smallint, 139, 30 FROM target
  UNION ALL
    SELECT target.id, 'din ce țară a venit iacov cu fiii săi în egipt?', '["Moab", "Canaan", "Madian"]'::jsonb, 1::smallint, 140, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce nume a dat iacov locului în care a visat scara cerului?', '["Betel", "Galed", "Peniel"]'::jsonb, 0::smallint, 141, 30 FROM target
  UNION ALL
    SELECT target.id, 'despre cine s-a spus: am putea noi oare să găsim un om ca acesta care să aibă în el duhul lui dumnezeu?', '["Despre Daniel", "Despre Moise", "Despre Iosif"]'::jsonb, 2::smallint, 142, 30 FROM target
  UNION ALL
    SELECT target.id, 'cati ani a stat iacov in casa lui laban?', '["21 ani", "20 ani", "14 ani"]'::jsonb, 1::smallint, 143, 30 FROM target
  UNION ALL
    SELECT target.id, 'cat a cantarit avraam lui efron pentru ogorul sau?', '["400 sicli de argint", "400 sicli de aur", "300 sicli de argint"]'::jsonb, 0::smallint, 144, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce înseamnă ismael?', '["Dumnezeu aude", "Dumnezeu vede", "Dumnezeu ascultă"]'::jsonb, 2::smallint, 145, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine și cui a spus cuvintele: „fiți pe pace”?', '["Avraam – Celor doi îngeri", "Economul lui Iosif – Fraților lui Iosif", "Zedechia – Trimișilor din Babilon"]'::jsonb, 1::smallint, 146, 30 FROM target
  UNION ALL
    SELECT target.id, 'care din cei enumerați mai jos a trăit cel mai mult?', '["Cainan", "Adam", "Iared"]'::jsonb, 2::smallint, 147, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine era tatăl lui canaan?', '["Ham", "Iafet", "Sem"]'::jsonb, 0::smallint, 148, 30 FROM target
  UNION ALL
    SELECT target.id, 'în care carte a bibliei apare prima interdicție de a consuma sânge?', '["Levitic", "Exodul", "Geneza"]'::jsonb, 2::smallint, 149, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani avea avram când a ieșit din haran?', '["Cinzeci de ani", "Șaptezeci de ani", "Șaptezeci și cinci de ani"]'::jsonb, 2::smallint, 150, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a făcut isaac după ce a venit fiul său esau de la vânătoare?', '["A binecuvântat pe Esau", "S-a înspăimântat foarte tare", "A blestemat pe Iacov"]'::jsonb, 1::smallint, 151, 30 FROM target
  UNION ALL
    SELECT target.id, 'cui a tălmăcit iosif pentru prima data visul?', '["Lui Faraon", "Mai marelui paharnicilor", "Mai marelui pitarilor"]'::jsonb, 1::smallint, 152, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde s-a desfășurat primul război menționat în biblie?', '["În câmpia Șinear", "În Valea Sidim", "La Marea Roșie"]'::jsonb, 1::smallint, 153, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce afirmație, spusă de faraon a fost corectată de iosif?', '["Cu privire la sursa tălmăcirii", "Cu privire la concluzia împăratului", "Cu privire la trecutul lui Iosif"]'::jsonb, 0::smallint, 154, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit adam?', '["969", "860", "930"]'::jsonb, 2::smallint, 155, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a slujit iacov lui laban pentru rahela?', '["7 ani", "14 ani", "20 ani"]'::jsonb, 0::smallint, 156, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a îngropat iacov cerceii si dumnezeii străini?', '["Sub stejarul lui Mamre", "Sub stejarul de la Sihem", "Sub stejarul lui Iacov"]'::jsonb, 1::smallint, 157, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numea fiul roabei agar?', '["Isaac", "Ismael", "Iafet"]'::jsonb, 1::smallint, 158, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a trait 777 de ani?', '["Metusala", "Enos", "Lameh"]'::jsonb, 2::smallint, 159, 30 FROM target
  UNION ALL
    SELECT target.id, 'când a furat rahela idolii tatălui său?', '["Când Laban a plecat să adape turma", "Pe vremea seceratului", "Când Laban s-a dus să-și tundă oile"]'::jsonb, 2::smallint, 160, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum i-a spus domnul lui avram că îi va fi sămânța?', '["Ca nisipul mării", "Că stelele de pe cer", "Nu este scris"]'::jsonb, 1::smallint, 161, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit iacov în egipt?', '["15", "16", "17"]'::jsonb, 2::smallint, 162, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum a nimicit domnul sodoma și gomora?', '["Prin ploaie cu gheață", "Prin ploaie cu foc", "Prin alte urgii"]'::jsonb, 1::smallint, 163, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a avut o soție numită iudita?', '["Esau", "David", "Ghedeon"]'::jsonb, 0::smallint, 164, 30 FROM target
  UNION ALL
    SELECT target.id, 'dumnezeu îi spune lui avraam că orice copil de parte bărbătească să fie tăiat împrejur la vârsta de:', '["Un an", "Opt luni", "Opt zile"]'::jsonb, 2::smallint, 165, 30 FROM target
  UNION ALL
    SELECT target.id, 'cu ce se încheie cartea geneza?', '["Cu moartea lui Iosif", "Cu moartea lui Faraon", "Cu împăcarea lui Iosif cu frații săi"]'::jsonb, 0::smallint, 166, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum a murit abel?', '["Ucis de mâna lui Cain", "La porunca Domnului", "De moarte naturală"]'::jsonb, 0::smallint, 167, 30 FROM target
  UNION ALL
    SELECT target.id, 'câte și ce animale a visat faraon în visul său?', '["Doisprezece berbeci", "Șapte boi", "Paisprezece vaci"]'::jsonb, 2::smallint, 168, 30 FROM target
  UNION ALL
    SELECT target.id, 'la ce vârstă s-a căsătorit pentru întâia dată esau?', '["25 ani", "30 ani", "40 ani"]'::jsonb, 2::smallint, 169, 30 FROM target
  UNION ALL
    SELECT target.id, 'mama lui ismael a fost?', '["Agar", "Sara", "Rebeca"]'::jsonb, 0::smallint, 170, 30 FROM target
  UNION ALL
    SELECT target.id, 'care din următoarele expresii sunt menționate în binecuvântarea rostită de isaac către iacov?', '["„Blestemat să fie oricine te va blestema”", "„Binecuvântat să fie oricine te va binecuvânta”", "„Neamuri să se închine înaintea ta”"]'::jsonb, 2::smallint, 171, 30 FROM target
  UNION ALL
    SELECT target.id, 'îngerii domnului i-au lovit pe unii dintre locuitorii sodomei cu:', '["Bube", "Surzenie", "Orbire"]'::jsonb, 2::smallint, 172, 30 FROM target
  UNION ALL
    SELECT target.id, '„vrăjmășie voi pune între tine și femeie, între sămânța ta și sămânța ei. aceasta îți va zdrobi ....., și tu îi vei zdrobi .....”', '["călcâiul/capul", "capul/călcâiul", "planul/puterea"]'::jsonb, 0::smallint, 173, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți oameni a înarmat avram când a auzit că fratele său a fost luat ca prins de război?', '["316", "317", "318"]'::jsonb, 2::smallint, 174, 30 FROM target
  UNION ALL
    SELECT target.id, 'la ce vârstă a plecat ismael de la avraam?', '["Când a fost înțărcat", "La patrusprezece ani", "La cinsprezece ani"]'::jsonb, 0::smallint, 175, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a spus: sunt eu păzitorul fratelui meu?', '["Cain", "Iacov", "Iuda"]'::jsonb, 0::smallint, 176, 30 FROM target
  UNION ALL
    SELECT target.id, 'la ce vârstă ia fost schimbat numele lui avram în avraam?', '["La 90 de ani", "La 99 de ani", "La 100 de ani. La 100 de ani"]'::jsonb, 1::smallint, 177, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum s-a numit fântâna pe care au săpat-o robii lui isaac, pentru care nu s-au mai certat?', '["Rehobot", "Gherar", "Șimla"]'::jsonb, 0::smallint, 178, 30 FROM target
  UNION ALL
    SELECT target.id, 'care este a 3-a femeie menționată cu numele în biblie?', '["Țila", "Ada", "Sarai"]'::jsonb, 2::smallint, 179, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a propus ca iosif să fie vândut?', '["Unul din frații lui", "Unii din frații lui", "Iuda"]'::jsonb, 1::smallint, 180, 30 FROM target
  UNION ALL
    SELECT target.id, 'care a fost primul om pe care dumnezeu l-a numit prooroc?', '["Enoh", "Avraam", "Moise"]'::jsonb, 0::smallint, 181, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce animal a văzut avraam în fața lui, încurcat cu coarnele într-un tufiș?', '["miel", "țap", "berbec"]'::jsonb, 2::smallint, 182, 30 FROM target
  UNION ALL
    SELECT target.id, 'câte zile au fost mari apele pe pământ, la potop?', '["7 zile", "40 de zile", "150 de zile"]'::jsonb, 2::smallint, 183, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani avea avraam când a fost tăiat împrejur?', '["93 de ani", "96 de ani", "99 de ani"]'::jsonb, 2::smallint, 184, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a fost îngropat iosif', '["În Egipt / 110", "În pustie / 115", "În Canaan / 125"]'::jsonb, 0::smallint, 185, 30 FROM target
  UNION ALL
    SELECT target.id, 'care categorie de oameni erau o urâciune pentru egipteni?', '["Evreii", "Păstorii", "Ismaeliții"]'::jsonb, 1::smallint, 186, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre fii lui iacov a fost binecuvântat să primească laudele fraților săi?', '["Iuda", "Efraim", "Iosif"]'::jsonb, 2::smallint, 187, 30 FROM target
  UNION ALL
    SELECT target.id, 'care a fost prima stare sufletească a lui iacov când a auzit că iosif trăiește?', '["Bucurie", "Înviorare", "Necredință"]'::jsonb, 1::smallint, 188, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a fost tatăl lui metusala?', '["Iared", "Enoh", "Lameh"]'::jsonb, 1::smallint, 189, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a fost primul vanator?', '["Mitraim", "Cus", "Nimrod"]'::jsonb, 2::smallint, 190, 30 FROM target
  UNION ALL
    SELECT target.id, '„vrășmășie voi pune între tine și femeie, între sămânța ta și ..... ei. aceasta îți va zdrobi ....., și tu îi vei zdrobi .....”', '["rodul/planul/slava", "sămânța/călcâiul/capul", "sămânța/capul/călcâiul"]'::jsonb, 1::smallint, 191, 30 FROM target
  UNION ALL
    SELECT target.id, 'în ce pustiu a rătăcit agar și ismael, până sa terminat apa din burduf?', '["În pustia Beer-Șeba", "În pustia En-Ghedi", "În pustia Zif"]'::jsonb, 0::smallint, 192, 30 FROM target
  UNION ALL
    SELECT target.id, 'de câte ori l-a înșelat iacov pe esau?', '["Niciodată", "De două ori", "De nenumărate ori"]'::jsonb, 1::smallint, 193, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani avea avram când a ieșit din haran?', '["65", "70", "75"]'::jsonb, 2::smallint, 194, 30 FROM target
  UNION ALL
    SELECT target.id, 'care este primul om pe care biblia îl numește evreu?', '["Noe", "Iosif", "Avram"]'::jsonb, 2::smallint, 195, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre următoarele expresii fac parte din dezvinovățirea lui iacov, când laban l-a urmărit cu frații săi?', '["„Mi-ai scormonit toate lucrurile și ce ai găsit din lucrurile din casa ta”", "„Să pier din fața ochilor tăi”", "„Dumnezeu a văzut suferința mea și osteneala mâinilor mele”"]'::jsonb, 2::smallint, 196, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a îngropat iacov dumnezeii străini?', '["În miriștea de pe malul râului", "Sub stejarul lui Mambre", "Sub stejarul de lângă Sihem"]'::jsonb, 1::smallint, 197, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit avraam?', '["O sută optzeci și cinci de ani", "O sută optzeci de ani", "O sută șaptezeci și cinci de ani"]'::jsonb, 1::smallint, 198, 30 FROM target
  UNION ALL
    SELECT target.id, 'cărui evreu i-a vorbit dumnezeu mai întâi despre robia egipteană?', '["Moise", "Avram", "Iosif"]'::jsonb, 1::smallint, 199, 30 FROM target
  UNION ALL
    SELECT target.id, 'i-a recunoscut iosif pe frații lui?', '["Da", "Nu", "Nu este menționat"]'::jsonb, 0::smallint, 200, 30 FROM target
  UNION ALL
    SELECT target.id, 'care a fost al doilea om despre care se spune că a umblat cu dumnezeu?', '["Noe", "Avraam", "Moise"]'::jsonb, 0::smallint, 201, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a fost mama lui madian?', '["Chetura", "Agar", "Zilpa"]'::jsonb, 0::smallint, 202, 30 FROM target
  UNION ALL
    SELECT target.id, 'cati ani a trait peleg?', '["201", "239", "246"]'::jsonb, 1::smallint, 203, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numesc copiii celor două fete ale lui lot?', '["Amnon și Pelec", "Moab și Ben-Ammi", "Iared și Moab"]'::jsonb, 1::smallint, 204, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit iacov?', '["147 de ani", "152 de ani", "175 de ani"]'::jsonb, 0::smallint, 205, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a visat o scară pe care se suiau și se coborau îngerii domnului?', '["Iacov", "Esau", "Iosif"]'::jsonb, 1::smallint, 206, 30 FROM target
  UNION ALL
    SELECT target.id, 'in care parte a grădinii a pus dumnezeu heruvimi?', '["La apus", "La răsărit", "La miazăzi"]'::jsonb, 1::smallint, 207, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce înseamnă „babel”?', '["Schimbare", "Încurcătură", "Împrăștiere"]'::jsonb, 1::smallint, 208, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre următoarele expresii fac parte din sentința rostită în dreptul lui cain?', '["„Blestemat ești tu, izgonit din ogorul acesta”", "„Oricine te va blestema, va fi blestemat”", "„Pribeag și fugar să fii pe pământ”"]'::jsonb, 2::smallint, 209, 30 FROM target
  UNION ALL
    SELECT target.id, 'cu ce ocazie se amintește în biblie pentru prima dată de doctori?', '["Cu ocazia morții Sarei", "Cu ocazia nașterii grele a lui Beniamin de către Rahela", "Cu ocazia morții și îmbălsămării lui Iacov în Egipt"]'::jsonb, 1::smallint, 210, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numea întâiul născut al lui iuda pe care domnul l-a omorât deoarece era rău?', '["Er", "Șela", "Onan"]'::jsonb, 0::smallint, 211, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numea tatăl rebecii?', '["Laban", "Betuel", "Avraam"]'::jsonb, 1::smallint, 212, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numea fiul lui cain?', '["Enoh", "Lameh", "Mehuiael"]'::jsonb, 1::smallint, 213, 30 FROM target
  UNION ALL
    SELECT target.id, 'cel de-al 3 brat al raului care iesea din eden se numeste', '["Pison", "Hidechiel", "Eufrat"]'::jsonb, 1::smallint, 214, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine dintre frații lui iosif a venit cu ideea de a-l vinde și cu ce sumă de bani?', '["Iuda cu 30 de sicli de argint", "Ruben cu 30 de sicli de argint", "Iuda cu 20 de sicli de argint"]'::jsonb, 1::smallint, 215, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit noe?', '["950", "960", "970"]'::jsonb, 0::smallint, 216, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum este menționat că era mirosul hainelor lui esau?', '["”Ca mirosul unui câmp pe care l-a binecuvântat Domnul”", "”Ca mirosul celor mai buni iezi din turmă”", "”Ca mirosul unui om curvar și lumesc”"]'::jsonb, 0::smallint, 217, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a creat dumnezeu în ziua a 4-a?', '["Pământul", "Apele", "Soarele și luna"]'::jsonb, 2::smallint, 218, 30 FROM target
  UNION ALL
    SELECT target.id, 'cât timp au fost apele mari pe pământ în urma potopului?', '["140", "150", "160"]'::jsonb, 1::smallint, 219, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a mers să locuiască iuda?', '["La Adulam, fiul lui Hira", "La Șafra", "La Miscol, din Sihem"]'::jsonb, 0::smallint, 220, 30 FROM target
  UNION ALL
    SELECT target.id, 'care sunt cele două calități pe care iosif le avea atunci când a primit totul pe mâinile sale din partea egipteanului?', '["mândru și viclean", "frumos la statură", "plăcut la chip"]'::jsonb, 1::smallint, 221, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a participat la înmormântarea lui iacov?', '["Bătrânii din Egipt", "Bătrânii din casa lui Faraon", "Toți fiii lui"]'::jsonb, 2::smallint, 222, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce este neftali?', '["cerboaică slobodă", "măgărință ascultătoare", "leoaică tânără"]'::jsonb, 0::smallint, 223, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre frații lui iosif a rămas în egipt la prima lor călătorie?', '["Simeon", "Ruben", "Iuda"]'::jsonb, 0::smallint, 224, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum s-a numit altarul pe care la ridicat iacov, la sihem?', '["Domnul este Dumnezeul lui Israel", "Dumnezeu părinților mei", "Domnul este tăria lui Israel"]'::jsonb, 0::smallint, 225, 30 FROM target
  UNION ALL
    SELECT target.id, 'la ce vârstă a avut noe copii?', '["La cinci sute de ani", "La o sută treizeci de ani", "La trei sute de ani"]'::jsonb, 0::smallint, 226, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a spus lui iacov să mearga la padan-aram?', '["Isaac", "Rebeca", "Părinții"]'::jsonb, 1::smallint, 227, 30 FROM target
  UNION ALL
    SELECT target.id, '„adam s-a împreunat cu nevastă-sa eva; ea a rămas însărcinată și a născut pe cain. și a zis: „am căpătat ..... cu ajutorul domnului!”', '["Un om", "O binecuvântare", "Un dar"]'::jsonb, 0::smallint, 228, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a avut avraam la nașterea fiului său isaac?', '["120", "100", "110"]'::jsonb, 1::smallint, 229, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce li s-a întâmplat femeilor din casa împăratului țării în care avraam a locuit ca străin?', '["Au orbit", "Li s-au închuiat pântecele", "S-au îmbolnăvit de ciumă"]'::jsonb, 0::smallint, 230, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a îngropat avraam pe sara?', '["În ogorul fiilor lui Set", "Lângă copacii lui Mamre", "În peștera din ogorul Macpela"]'::jsonb, 2::smallint, 231, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a făcut omul care s-a lupat cu iacov, văzând cu nu îl poate birui?', '["La lovit la încheietura coastei", "Ia scrântit încheietura coastei", "La lovit la încheietura gleznei"]'::jsonb, 1::smallint, 232, 30 FROM target
  UNION ALL
    SELECT target.id, 'în ce zi au fost create viețuitoarele mării?', '["În ziua a 3-a", "În ziua a 4-a", "În ziua a 5-a"]'::jsonb, 2::smallint, 233, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce era peste fața adâncurilor de ape la început?', '["Lumină", "Întuneric", "Duhul lui Dumnezeu"]'::jsonb, 2::smallint, 234, 30 FROM target
  UNION ALL
    SELECT target.id, 'care a fost legământul făcut de dumnezeu cu noe?', '["Că nu va mai blestema niciodată pământul", "Că nu va mai nimici pământul prin potop", "Că va trimite curcubeul în nor"]'::jsonb, 1::smallint, 235, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numeau cele 4 brațe ale râului din eden?', '["Eufrat, Havila, Pison și Hidechel", "Eufrat, Ghihon, Hidechel, Pison", "Eufrat, Pison, Ghihon, Havila"]'::jsonb, 1::smallint, 236, 30 FROM target
  UNION ALL
    SELECT target.id, 'a fost ismael binecuvîntat de dumnezeu?', '["Da", "Nu", "Nu se specifică in Biblie"]'::jsonb, 0::smallint, 237, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce vârstă avea adam când s-a născut set?', '["190 de ani", "160 de ani", "130 de ani"]'::jsonb, 2::smallint, 238, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a făcut dumnezeu cu ziua a 7 a?', '["A sfințit-o", "A binecuvântat-o", "A zidit-o"]'::jsonb, 0::smallint, 239, 30 FROM target
  UNION ALL
    SELECT target.id, 'în câte brațe se împărțea râul ce ieșea din eden?', '["Două", "Patru", "Șase"]'::jsonb, 1::smallint, 240, 30 FROM target
  UNION ALL
    SELECT target.id, 'câte brațe avea râul care ieșea din eden și uda grădina?', '["Patru brațe", "Două brațe", "Nu avea brațe"]'::jsonb, 0::smallint, 241, 30 FROM target
  UNION ALL
    SELECT target.id, 'care tânăr, rob fiind, a fost acuzat pe nedrept și întemnițat?', '["Daniel", "Ezechiel", "Beniamin"]'::jsonb, 1::smallint, 242, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce poruncă a dat isaac lui iacov când l-a binecuvântat?', '["„Să nu-ți iei nevastă dintre fetele lui Canaan”", "„Să nu-ți iei nicio nevastă”", "„Să-ți iei o nevastă dintre fetele lui Canaan”"]'::jsonb, 0::smallint, 243, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți fii i s-au născut lui iosif înaintea anilor de foamete?', '["Un fiu", "Doi fii", "Cinci fii"]'::jsonb, 1::smallint, 244, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit sem, fiul cel mai mare al lui noe?', '["500 ani", "600 ani", "410 ani"]'::jsonb, 1::smallint, 245, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde au vrut oamenii să construiască turnul babel?', '["Lângă țara Șinear", "Pe un munte cu temeli tari", "Nu este precizat"]'::jsonb, 0::smallint, 246, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a murit iacov?', '["În Peștera Macpela", "În Egipt", "În ogorul lui Efron"]'::jsonb, 1::smallint, 247, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a umblat enoh cu dumnezeu după nașterea lui metusala?', '["165 de ani", "187 de ani", "300 de ani"]'::jsonb, 2::smallint, 248, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine va locui pe tarmul marilor?', '["Ruben", "Neftali", "Zabulon"]'::jsonb, 1::smallint, 249, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit sara?', '["O sută de ani", "O sută douăzeci și șapte de ani", "O sută treizeci și doi de ani"]'::jsonb, 1::smallint, 250, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce răspuns a dat rebeca, când robul lui avraam i-a cerut să bea puțină apă?', '["”Fântâna este foarte adâncă”", "”Bea, Domnul meu”", "”Am să scot apă și pentru cămilele mele, până vor bea și se vor sătura”"]'::jsonb, 1::smallint, 251, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre frații lui iosif a primit de 5 ori mai multe bucate decât restul?', '["Ruben", "Beniamin", "Simeon"]'::jsonb, 1::smallint, 252, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți fii i s-au născut lui iosif înaintea anilor de foamete?', '["Doi fii", "Trei fii", "Cinci fii"]'::jsonb, 0::smallint, 253, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți oameni au locuit în corabia lui noe?', '["Șase", "Opt", "Zece"]'::jsonb, 1::smallint, 254, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numea nevasta lui er, întâiul născut al lui iuda?', '["Hira", "Tamar", "Timna"]'::jsonb, 1::smallint, 255, 30 FROM target
  UNION ALL
    SELECT target.id, 'care a fost primul om care a dat zeciuială?', '["Avraam", "Aaron", "Noe"]'::jsonb, 0::smallint, 256, 30 FROM target
  UNION ALL
    SELECT target.id, 'în ce a constat facerea de bine a lui iosif, cu privire la frații lui?', '["Le-a purtat de grijă și s-a îndurat de ei doar până la moartea tatălui său", "I-a așezat în ținutul Gosen", "A avut milă de copiii lor"]'::jsonb, 1::smallint, 257, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a pregătit vițelul pentru oaspeții lui avraam?', '["O slugă", "Avraam", "Sara"]'::jsonb, 0::smallint, 258, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a însoțit pe avraam, in călătoria, in care i s-a testat credinta?', '["Doar fiul sau Isac", "Doua slugi", "Fii săi, Isac si Ismael"]'::jsonb, 0::smallint, 259, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți dintre frații lui iosif l-au însoțit pe acesta la faraon?', '["Cinci", "Șapte", "Toți"]'::jsonb, 2::smallint, 260, 30 FROM target
  UNION ALL
    SELECT target.id, 'care dintre următoarele cuvinte fac parte din binecuvântarea rostită de iacov pentru iuda?', '["„...ca un leu, ca o leoaică”", "„El își leagă măgarul de viță”", "„...un șarpe pe drum”"]'::jsonb, 1::smallint, 261, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum s-a numit primul fiu a lui iuda?', '["Er", "Șela", "Onan"]'::jsonb, 0::smallint, 262, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a imbalsamat pe iacov?', '["Toti doctorii din Egipt", "Doctorii lui Faraon", "Doctorii lui Iosif"]'::jsonb, 1::smallint, 263, 30 FROM target
  UNION ALL
    SELECT target.id, 'in ce zi a facut dumnezeu, vietuitoarele pamantului?', '["In ziua a patra", "In ziua a cincea", "In ziua a sasea"]'::jsonb, 2::smallint, 264, 30 FROM target
  UNION ALL
    SELECT target.id, 'care era grija egipteanului după ce a lăsat totul în mâna lui iosif?', '["să mănânce", "să conducă", "să bea"]'::jsonb, 1::smallint, 265, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit iacov în egipt?', '["15", "16", "17"]'::jsonb, 2::smallint, 266, 30 FROM target
  UNION ALL
    SELECT target.id, 'de câte ori trebuia să fie răzbunat cain, în cazul în care ar fi fost omorât?', '["De șapte ori", "De zece ori", "De șapte ori șapte ori"]'::jsonb, 2::smallint, 267, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce însemna eva?', '["Mama", "Viața", "Păcătoasă"]'::jsonb, 1::smallint, 268, 30 FROM target
  UNION ALL
    SELECT target.id, 'în ce era avram bogat?', '["Vite", "Aur", "Argint"]'::jsonb, 1::smallint, 269, 30 FROM target
  UNION ALL
    SELECT target.id, 'pe cine a tăiat împrejur avraam, după porunca domnului?', '["Doar pe el și pe Isaac", "Pe toți oamenii din casa lui", "Pe toți cei din neamul său"]'::jsonb, 1::smallint, 270, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce animale a visat pitarnicul lui faraon?', '["Păsări", "Vite", "Oi"]'::jsonb, 0::smallint, 271, 30 FROM target
  UNION ALL
    SELECT target.id, 'câte mlădițe avea vița-de-vie din visul mai-marelui paharnicilor?', '["2", "3", "4"]'::jsonb, 1::smallint, 272, 30 FROM target
  UNION ALL
    SELECT target.id, 'de unde provenea nevasta lui ismael?', '["Egipt", "Canaan", "Ierihon"]'::jsonb, 0::smallint, 273, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce înseamnă numele „isahar”?', '["Răsplătire", "Luptele lui Dumnezeu", "Fiul durerii mele"]'::jsonb, 0::smallint, 274, 30 FROM target
  UNION ALL
    SELECT target.id, 'femeia cu care iuda păcătuise i-a cerut acestuia ca zălog:', '["Inelul", "Toiagul", "Lanțul"]'::jsonb, 1::smallint, 275, 30 FROM target
  UNION ALL
    SELECT target.id, 'câți ani a trăit enos?', '["Nouă sute cinci ani", "Nouă sute cincizeci și cinci de ani", "Nouă sute nouă ani"]'::jsonb, 1::smallint, 276, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine l-a cumpărat pe iosif de la ismaeliți?', '["Betiel", "Potifar", "Faraon"]'::jsonb, 1::smallint, 277, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a însoțit pe iacov, în padan-aram?', '["Mai mulți slujitori", "Doar două slugi", "Un mare alai"]'::jsonb, 1::smallint, 278, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a fost primul născut a lui adam și al evei?', '["Cain", "Abel", "Enoh"]'::jsonb, 0::smallint, 279, 30 FROM target
  UNION ALL
    SELECT target.id, 'unul dintre frați avea de gând să-l scape pe iosif de moartea plănuită de frații lui. care a fost acesta?', '["Iuda", "Ruben", "Dan"]'::jsonb, 1::smallint, 280, 30 FROM target
  UNION ALL
    SELECT target.id, 'care au fost fii lui levi?', '["Chehat", "Merari", "Gherșon"]'::jsonb, 0::smallint, 281, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce înseamnă peniel?', '["Casa lui Dumnezeu", "Muntele lui Dumnezeu", "Fața lui Dumnezeu"]'::jsonb, 2::smallint, 282, 30 FROM target
  UNION ALL
    SELECT target.id, 'cui i-a spus iosif „peste trei zile, faraon îți va lua capul, te va spânzura de un lemn, și carnea ți-o vor mânca păsările.”?', '["Mai-marelui paharnicilor", "Mai-marelui pitarilor", "Lui Faraon"]'::jsonb, 1::smallint, 283, 30 FROM target
  UNION ALL
    SELECT target.id, 'omul care a trăit cel mai mult din biblie (969 ani) a fost fiul lui .....', '["Metusala", "Lameh", "Enoh"]'::jsonb, 2::smallint, 284, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce înseamnă iacov?', '["Biruitorul", "Cel ce se luptă cu Dumnezeu", "Cel ce ține de călcâi"]'::jsonb, 1::smallint, 285, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine și cui a spus: fă acum tot ce ți-a spus dumnezeu?', '["Sara lui Avraam", "Lea și Rahela lui Iacov", "Faraon lui Iosif"]'::jsonb, 2::smallint, 286, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a aruncat potifar pe iosif?', '["În cea mai rea temniță din țară", "La un loc cu întemnițații împăratului", "L-a exilat"]'::jsonb, 0::smallint, 287, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce s-a întâmplat după ce potifar a pus pe iosif mai mare peste casa lui și peste tot ce avea el?', '["Domnul a binecuvântat casa egipteanului", "Binecuvântarea Domnului a fost peste tot ce avea Potifar", "Niciun răspuns nu este corect"]'::jsonb, 1::smallint, 288, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce zălog a lăsat iuda lui tamar?', '["Un ied", "Lanțul, inelul și toiagul său", "Mantaua sa"]'::jsonb, 1::smallint, 289, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a murit sara?', '["La Chiriat-Arba", "La Hebron", "În țara Canaan"]'::jsonb, 1::smallint, 290, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numea brațul râului ce ieșea din eden și înconjura țara cuș?', '["Pison", "Ghihon", "Hidechel"]'::jsonb, 0::smallint, 291, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine se pune chezas in egipt pentru beniamin?', '["Simeon", "Ruben", "Iuda"]'::jsonb, 2::smallint, 292, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce reprezintă cele trei mlădițe pe care le-a visat paharnicul?', '["Trei zile", "Trei împărății", "Trei neveste"]'::jsonb, 1::smallint, 293, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum au păcătuit fiicele lui lot?', '["Îmbătandu-l pe tatăl lor", "Curvind cu bărbații din Sodoma", "Împreunându-se cu tatăl lor"]'::jsonb, 0::smallint, 294, 30 FROM target
  UNION ALL
    SELECT target.id, 'cu ce ocazie vorbește biblia pentru prima dată de lacrimi și la ce persoană se referă?', '["Eva, când a aflat de moartea lui Abel", "Agar în pustie, când i s-a terminat apa", "Avraam, la moartea Sarei"]'::jsonb, 1::smallint, 295, 30 FROM target
  UNION ALL
    SELECT target.id, 'cui a spus avram ca sarai este sora sa?', '["Lui faraon", "Locuitorilor Sihemului", "Lui Abimelec"]'::jsonb, 0::smallint, 296, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a locuit iacov în egipt?', '["În cea mai bună parte a țării", "În ținutul lui Ramses", "În ținutul Gosen"]'::jsonb, 1::smallint, 297, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numea omul care a tălmacit două vise ale lui faraon?', '["Daniel", "Iosif", "Ruben"]'::jsonb, 1::smallint, 298, 30 FROM target
  UNION ALL
    SELECT target.id, 'de cine a fost zărita dina atunci când aceasta a ieșit să vadă pe fetele țării?', '["De Sihem", "De Abimelec", "De Ruben"]'::jsonb, 0::smallint, 299, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce lege a instituit iosif în egipt, care a rămas valabilă?', '["Evreii care sunt in Egipt să locuiască în ținutul Gosen", "O cincime din veniturile pământului Egiptului să fie a lui Faraon", "Toți evreii care mor în Egipt să fie înmormântați în Canaan"]'::jsonb, 1::smallint, 300, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine l-a dus pe iosif în egipt?', '["Unele dintre rudeniile lui", "Frații lui", "Dumnezeu"]'::jsonb, 1::smallint, 301, 30 FROM target
  UNION ALL
    SELECT target.id, 'despre cine se spune că a fost surprins jucându-se cu nevastă-sa?', '["Despre Avraam", "Despre Isaac", "Despre Iacov"]'::jsonb, 1::smallint, 302, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce nume i-a dat faraon lui iosif?', '["Asnat", "Poti-Fera", "Țafnat-Paeneah"]'::jsonb, 2::smallint, 303, 30 FROM target
  UNION ALL
    SELECT target.id, 'după ce a ieșit cain din fața domnului, unde a locuit?', '["în Nod", "la răsărit de Eden", "în Ur"]'::jsonb, 1::smallint, 304, 30 FROM target
  UNION ALL
    SELECT target.id, 'cui este menționat că a dat avram zeciuială?', '["Împăratului Salemului", "Lui Melhisedec", "Împăratului păcii"]'::jsonb, 1::smallint, 305, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum este menționat că dorea esau să se răzbune pe iacov, din pricina binecuvântări?', '["Furându-i dreptul de întâi născut", "Omorându-l", "Blestemândul în Numele Domnului"]'::jsonb, 1::smallint, 306, 30 FROM target
  UNION ALL
    SELECT target.id, '„atunci li s-au deschis ochii la amândoi; au cunoscut că erau goi, au cusut laolaltă frunze de smochin și și-au ..... făcut din ele.”', '["Haine", "Șorțuri", "Îmbrăcăminte"]'::jsonb, 1::smallint, 307, 30 FROM target
  UNION ALL
    SELECT target.id, 'cine a spus în geneza: eu mă tem de dumnezeu?', '["Laban", "Iacov", "Iosif"]'::jsonb, 2::smallint, 308, 30 FROM target
  UNION ALL
    SELECT target.id, 'de ce a spus dumnezeu că va binecuvânta toate neamurile pământului în sămânța lui avraam?', '["Pentru că a avut peste 100 de ani", "Pentru că a ascultat de porunca Lui", "Pentru că nu L-a iubit pe Dumnezeu"]'::jsonb, 1::smallint, 309, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a fost îngropat avraam?', '["În peștera Macpela", "Alături de soția sa, Sara", "În ogorul lui Efron"]'::jsonb, 0::smallint, 310, 30 FROM target
  UNION ALL
    SELECT target.id, 'ce a făcut rebeca, după ce a văzut pe isaac?', '["S-a urcat pe cămilă", "Și-a luat măhrama și s-a acoperit", "Și-a uns părul și fața"]'::jsonb, 1::smallint, 311, 30 FROM target
  UNION ALL
    SELECT target.id, 'cât timp i-a trebuit paharnicului lui faraon să-și amintească de promisiunea făcută lui iosif, după eliberarea lui din închisoare?', '["6 luni", "Un an", "Doi ani"]'::jsonb, 2::smallint, 312, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde au fost îngropați isaac și rebeca?', '["În Egipt", "În ogorul Macpela", "Sub stejarul lui Mamre"]'::jsonb, 1::smallint, 313, 30 FROM target
  UNION ALL
    SELECT target.id, 'cum se numea fiul lui set?', '["Enos", "Abel", "Cain"]'::jsonb, 0::smallint, 314, 30 FROM target
  UNION ALL
    SELECT target.id, 'în ce împrejurare i-a spus dumnezeu lui avraam: „eu sunt scutul tău și răsplata ta cea foarte mare”?', '["Când i-a cerut să plece din Ur, din Haldeea", "Când a fost gata să-l aducă pe Isaac jertfă pe Moria", "Când l-a scos afară ca să numere stelele de pe cer"]'::jsonb, 1::smallint, 315, 30 FROM target
  UNION ALL
    SELECT target.id, 'din ce pricină este menționat că a prins esau ură pe iacov?', '["Din pricina că i-a furat dreptul de întâi născut", "Din pricina ciorbei de linte", "Din pricina binecuvântării cu care îl binecuvântase tatăl său"]'::jsonb, 2::smallint, 316, 30 FROM target
  UNION ALL
    SELECT target.id, 'unde a ascuns rahela idolii furați de la tatăl său?', '["Sub samarul cămilei", "În pământ", "În spatele cortului"]'::jsonb, 0::smallint, 317, 30 FROM target
  UNION ALL
    SELECT target.id, 'despre care ținut geografic stă scris în geneza că era ca o grădină a domnului?', '["Ținutul Sodomei si Gomorei", "Țara Canaanului", "Mesopotamia"]'::jsonb, 0::smallint, 318, 30 FROM target

)
INSERT INTO public.questions (quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds)
SELECT * FROM ins
WHERE NOT EXISTS (SELECT 1 FROM public.questions q WHERE q.quiz_id = (SELECT id FROM target));

