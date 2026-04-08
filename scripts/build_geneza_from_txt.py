#!/usr/bin/env python3
"""
Parsează Intrebari_geneza.txt (întrebare + 3 variante, fără răspuns marcat)
și generează SQL INSERT pentru quiz „Întrebări Geneza (fișier)”.

Rulare (din rădăcina proiectului):
  python3 scripts/build_geneza_from_txt.py Intrebari_geneza.txt > src/db/migrations/007_intrebari_geneza_from_txt.sql

  Sau din stdin: python3 scripts/build_geneza_from_txt.py - < Intrebari_geneza.txt > ...
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def parse_blocks(text: str) -> list[tuple[str, list[str]]]:
    lines = text.splitlines()
    i = 0
    out: list[tuple[str, list[str]]] = []
    while i < len(lines):
        raw = lines[i]
        if "Indiciu" not in raw:
            i += 1
            continue
        q = raw.replace("Indiciu", "").strip()
        if len(q) < 12:
            i += 1
            continue
        i += 1
        while i < len(lines) and not lines[i].strip():
            i += 1
        opts: list[str] = []
        while len(opts) < 3 and i < len(lines):
            s = lines[i].strip()
            if not s:
                i += 1
                continue
            if "Indiciu" in s:
                break
            opts.append(s)
            i += 1
        if len(opts) == 3:
            out.append((q, opts))
    return out


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().strip())


def pick(opts: list[str], *substrings: str) -> int | None:
    """Prima variantă care conține unul din substring-uri (case-insensitive)."""
    ol = [norm(o) for o in opts]
    for sub in substrings:
        sn = sub.lower()
        for j, o in enumerate(ol):
            if sn in o:
                return j
    return None


def resolve_answer(q: str, opts: list[str]) -> int:
    nq = norm(q)
    oln = [norm(o) for o in opts]

    def idx_containing(*subs: str) -> int | None:
        p = pick(opts, *subs)
        return p

    # Ordine: specifice → generale
    if "puternic pe pământ" in nq or "puternic pe pamant" in nq:
        p = idx_containing("nimrod")
        if p is not None:
            return p
    if "argumentul lui iacov" in nq and "esau" in nq:
        p = idx_containing("copiii")
        if p is not None:
            return p
    if ("trei oameni" in nq and "gătească" in nq) or ("slugii" in nq and "vițel" in nq):
        p = idx_containing("vițel", "vitel")
        if p is not None:
            return p
    if "fântâna" in nq and "laban" in nq:
        p = idx_containing("pastori")
        if p is not None:
            return p
    if "enos a născut" in nq:
        p = idx_containing("cainan")
        if p is not None:
            return p
    if "soțiile lui iacov" in nq and "murit cea dintâi" in nq:
        p = idx_containing("rahela")
        if p is not None:
            return p
    if "stabilit esau" in nq:
        p = idx_containing("seir")
        if p is not None:
            return p
    if "lot" in nq and "nepotul" in nq and "fiu al lui noe" in nq:
        p = idx_containing("sem")
        if p is not None:
            return p
    if "născut ismael" in nq or "nascut ismael" in nq:
        p = idx_containing("86")
        if p is not None:
            return p
    if "dăruit iacov ceva special" in nq:
        p = idx_containing("iosif")
        if p is not None:
            return p
    if "câta zi" in nq and "pământul" in nq:
        p = idx_containing("3-a", "3-a")
        if p is not None:
            return p
        p = idx_containing("a 3-a")
        if p is not None:
            return p
    if "înainte de a pleca în egipt" in nq:
        p = idx_containing("beer", "șeba", "seba")
        if p is not None:
            return p
    if "sihem" in nq and "murit" in nq:
        p = idx_containing("sabie")
        if p is not None:
            return p
    if "er" in nq and "iuda" in nq and "deces" in nq:
        p = idx_containing("rău", "rau")
        if p is not None:
            return p
    if "stejarul" in nq and "jale" in nq:
        p = idx_containing("debora")
        if p is not None:
            return p
    if "animalele" in nq and "zi" in nq and "creat" in nq:
        p = idx_containing("șasea", "sasea")
        if p is not None:
            return p
    if "schimbat numele nevestei" in nq and "sara" in nq:
        p = idx_containing("râs", "ras")
        if p is not None:
            return p
    if "treia zi" in nq or "a treia zi" in nq:
        p = idx_containing("pământul", "pamantul", "vegeta")
        if p is not None:
            return p
    if "bogat avraam" in nq or "bogat avram" in nq:
        p = idx_containing("vite")
        if p is not None:
            return p
    if "mijlocit avraam" in nq and "lot" in nq:
        p = idx_containing("6")
        if p is not None:
            return p
    if "iuda" in nq and "tamar" in nq and "dar" in nq:
        p = idx_containing("ied", "miel")
        if p is not None:
            return p
    if "filistenilor" in nq:
        p = idx_containing("multă", "multa")
        if p is not None:
            return p
    if "lot cu cele două fete" in nq or "iesit din" in nq and "țoar" in nq:
        p = idx_containing("peșteră", "pestera")
        if p is not None:
            return p
    if "mandragore" in nq:
        p = idx_containing("ruben")
        if p is not None:
            return p
    if "numără stelele" in nq:
        p = idx_containing("avram")
        if p is not None:
            return p
    if "elifaz" in nq:
        p = idx_containing("teman")
        if p is not None:
            return p
    if "eva" in nq and "șarpelui" in nq:
        p = idx_containing("adam a zis")
        if p is not None:
            return p
    if "prima profeție" in nq and "isus" in nq:
        p = idx_containing("3:15")
        if p is not None:
            return p
    if "iosif" in nq and "iscoade" in nq:
        p = idx_containing("beniamin")
        if p is not None:
            return p
    if "domnitor" in nq and "dumnezeu" in nq:
        p = idx_containing("egipten", "iosif")
        if p is not None:
            return p
    if "noră-sa" in nq or "nora-sa" in nq:
        p = idx_containing("ruben")
        if p is not None:
            return p
    if "bunicul lui avraam" in nq:
        p = idx_containing("terah")
        if p is not None:
            return p
    if "prima dată în egipt" in nq and "merinde" in nq:
        p = idx_containing("zece")
        if p is not None:
            return p
    if "cain" in nq and "cetății" in nq:
        p = idx_containing("numele fiului")
        if p is not None:
            return p
    if "binecuvântarea" in nq and "iacov" in nq and "iosif" in nq:
        p = idx_containing("arcul")
        if p is not None:
            return p
    if "cine era esau" in nq:
        p = idx_containing("vânător", "vanator")
        if p is not None:
            return p
    if "vegheze asupra noastră" in nq:
        p = idx_containing("laban")
        if p is not None:
            return p
    if "stâlp de sare" in nq:
        p = idx_containing("lot")
        if p is not None:
            return p
    if "părinții lui madian" in nq:
        p = idx_containing("chetura", "avraam")
        if p is not None:
            return p
    if "șarpele m-a" in nq:
        p = idx_containing("amăgit", "amagit", "înșelat")
        if p is not None:
            return p
    if "iacov când a ajuns în egipt" in nq:
        p = idx_containing("130")
        if p is not None:
            return p
    if "beniamin mai multă" in nq:
        p = idx_containing("5 ori", "cinci")
        if p is not None:
            return p
    if "rahela după" in nq and "iosif" in nq:
        p = idx_containing("ocara")
        if p is not None:
            return p
    if "hebronului" in nq:
        p = idx_containing("chiriat")
        if p is not None:
            return p
    if "sarai" in nq and "trei bărbați" in nq:
        p = idx_containing("ușa", "usa")
        if p is not None:
            return p
    if "ginerii lui lot" in nq:
        p = idx_containing("înger", "inger")
        if p is not None:
            return p
    if "sarai stearpă" in nq or "sarai stearpa" in nq:
        p = pick(opts, "da")
        if p is not None:
            return p
    if "scapă-ți viața" in nq:
        p = idx_containing("lot")
        if p is not None:
            return p
    if "sfârșitul oricărei făpturi" in nq or "sfarsitul oricarei fapturi" in nq:
        p = idx_containing("mea", "me")
        if p is not None:
            return p
    if "fugea somnul" in nq:
        p = idx_containing("iacob")
        if p is not None:
            return p
    if "numele lui în avraam" in nq and "schimbat" in nq:
        p = idx_containing("99")
        if p is not None:
            return p
    if "scârbit de viață" in nq:
        p = idx_containing("rebeca")
        if p is not None:
            return p
    if "visat faraon" in nq and "animale" in nq:
        p = idx_containing("vaci")
        if p is not None:
            return p
    if "sihem" in nq and "napustit" in nq:
        p = idx_containing("simeon")
        if p is not None:
            return p
    if "prima culoare" in nq:
        p = idx_containing("verde")
        if p is not None:
            return p
    if "viețuitoarele pământului" in nq or "vietuitoarele pamantului" in nq:
        p = idx_containing("6-a", "șasea", "sasea")
        if p is not None:
            return p
    if "terah" in nq and "plecat" in nq:
        p = idx_containing("halde", "uț")
        if p is not None:
            return p
    if "tată era enos" in nq or "tata era enos" in nq:
        p = idx_containing("cainan")
        if p is not None:
            return p
    if "pom interzis" in nq:
        p = idx_containing("cunoștinței", "cunostintei")
        if p is not None:
            return p
    if "iosif urât" in nq:
        p = idx_containing("iubea mai mult")
        if p is not None:
            return p
    if "soție fiului" in nq and "avraam" in nq:
        p = idx_containing("îngrijitor", "ingrijitor")
        if p is not None:
            return p
    if "numele copilului agarei" in nq:
        p = idx_containing("dumnezeu")
        if p is not None:
            return p
    if "isaac" in nq and "binecuvânta pe iacov" in nq and "animal" in nq:
        p = idx_containing("iezi", "ied")
        if p is not None:
            return p
    if "puțini copii" in nq and "patriarh" in nq:
        p = idx_containing("iosif")
        if p is not None:
            return p
    if "dintâi braț" in nq or "dintai brat" in nq:
        p = idx_containing("pison")
        if p is not None:
            return p
    if "promis dumnezeu lui avram" in nq:
        p = idx_containing("neam mare")
        if p is not None:
            return p
    if "doi fii ai lui isaac" in nq:
        p = idx_containing("esau")
        if p is not None:
            return p
    if "haine lui adam" in nq:
        p = idx_containing("pielea", "piele")
        if p is not None:
            return p
    if "noe întâi" in nq and "pasare" in nq or "pasăre" in nq and "noe" in nq:
        p = idx_containing("corb")
        if p is not None:
            return p
    if "paharnicul" in nq and "găsit" in nq:
        p = idx_containing("vite")
        if p is not None:
            return p
    if "faraon lui iosif" in nq and "nume" in nq:
        p = idx_containing("țafnat", "tafnat")
        if p is not None:
            return p
    if "chipul și asemănarea" in nq:
        p = idx_containing("adam")
        if p is not None:
            return p
    if "rugăciunea lui iacov" in nq and "esau" in nq:
        if "tatălui meu isaac" in nq or "isaac" in nq:
            p = idx_containing("isaac")
            if p is not None:
                return p
        p = idx_containing("prea mic")
        if p is not None:
            return p
    if "oraș numit enoh" in nq:
        p = idx_containing("cain")
        if p is not None:
            return p
    if "diferența între faraon și iosif" in nq:
        p = idx_containing("scaun")
        if p is not None:
            return p
    if "numit evreul" in nq and "carte" in nq:
        p = idx_containing("geneza")
        if p is not None:
            return p
    if "mahanaim" in nq or "mehanaim" in nq:
        p = idx_containing("mahanaim")
        if p is not None:
            return p
    if "rebeca era" in nq:
        p = idx_containing("frumoasă", "frumoasa")
        if p is not None:
            return p
    if "neam mic" in nq:
        p = idx_containing("avraam")
        if p is not None:
            return p
    if "visul căruia" in nq and "slujitori" in nq:
        p = idx_containing("paharnicul si pitarul", "și pitar")
        if p is not None:
            return p
    if "trăit iacov" in nq and "?" in q and "ani" in nq:
        if "egipt" not in nq:
            p = idx_containing("147")
            if p is not None:
                return p
    if "fiul lui cain" in nq and "numit" in nq:
        p = idx_containing("enoh")
        if p is not None:
            return p
    if "dus pe iosif în egipt" in nq or "l-a dus pe iosif" in nq:
        p = idx_containing("ismael")
        if p is not None:
            return p
    if "îngroape pe sara" in nq or "ingroape pe sara" in nq:
        p = idx_containing("macpela")
        if p is not None:
            return p
    if "evreii in egipt" in nq and "tinut" in nq:
        p = idx_containing("gosen")
        if p is not None:
            return p
    if "încheie cartea geneza" in nq:
        p = idx_containing("iosif")
        if p is not None:
            return p
    if "onan" in nq and "sămânța" in nq:
        p = idx_containing("fratelui")
        if p is not None:
            return p
    if "izbăviți din gomora" in nq:
        p = idx_containing("lot, nevasta")
        if p is not None:
            return p
    if "primul vis" in nq and "iosif" in nq:
        p = idx_containing("snopi")
        if p is not None:
            return p
    if "mers avram în egipt" in nq:
        p = idx_containing("foamete")
        if p is not None:
            return p
    if "trăit noe" in nq and "ani" in nq:
        p = idx_containing("950")
        if p is not None:
            return p
    if "trăit cainan" in nq:
        p = idx_containing("910")
        if p is not None:
            return p
    if "trei fii ai lui noe" in nq:
        p = idx_containing("sem")
        if p is not None:
            return p
    if "legamant cu abimelec" in nq:
        p = idx_containing("miel")
        if p is not None:
            return p
    if "primul om" in nq and "evreu" in nq:
        p = idx_containing("avraam", "avram")
        if p is not None:
            return p
    if "jertfă pe isaac" in nq or "isaac" in nq and "moria" in nq:
        p = idx_containing("moria")
        if p is not None:
            return p
    if "despărțirii lui lot" in nq:
        p = idx_containing("păzitor", "pazitor")
        if p is not None:
            return p
    if "isaac" in nq and "semănături" in nq:
        p = idx_containing("însutit", "insutit")
        if p is not None:
            return p
    if "murit onan" in nq:
        p = idx_containing("nu plăcea", "nu placea")
        if p is not None:
            return p
    if "înainte de ispitirea femeii" in nq:
        p = idx_containing("rușinea", "rusinea")
        if p is not None:
            return p
    if "taierea imprejur" in nq and "avraam" in nq:
        p = idx_containing("99")
        if p is not None:
            return p
    if "canaan a fost fiul" in nq:
        p = idx_containing("ham")
        if p is not None:
            return p
    if "născut ismael" in nq and "/" in q:
        p = idx_containing("86")
        if p is not None:
            return p
    if "ce sentimente" in nq:
        return 0  # Frică — întrebare fragmentară; prima variantă
    if "întâiul său născut" in nq and "iosif" in nq:
        p = idx_containing("efraim", "manase")
        if p is not None:
            return p
        return 0
    if "nevestei lui nahor" in nq:
        p = idx_containing("milca")
        if p is not None:
            return p
    if "grădina edenului" in nq and "facă omul" in nq:
        p = idx_containing("lucreze")
        if p is not None:
            return p
    if "er înaintea domnului" in nq:
        p = idx_containing("rău din cale", "rau din cale")
        if p is not None:
            return p
    if "țara în care a locuit cain" in nq:
        p = idx_containing("nod")
        if p is not None:
            return p
    if "venirea lui mesia" in nq:
        p = idx_containing("geneza 3")
        if p is not None:
            return p
    if "rebeca, robului" in nq:
        p = idx_containing("bea, domnul")
        if p is not None:
            return p
    if "sarai" in nq and "roaba" in nq and "însărcinată" in nq:
        p = idx_containing("rău", "rau")
        if p is not None:
            return p
    if "777 de ani" in nq:
        p = idx_containing("lameh")
        if p is not None:
            return p
    if "urmașii lui esau" in nq:
        p = idx_containing("edom")
        if p is not None:
            return p
    if "cea mai mulți copii" in nq and "lea" in nq:
        p = idx_containing("lea:7")
        if p is not None:
            return p
    if "mijlocit avraam pentru sodoma" in nq:
        p = idx_containing("99")
        if p is not None:
            return p
    if "nu vă certați pe drum" in nq:
        p = idx_containing("iacob")
        if p is not None:
            return p
    if "vândă pe iosif" in nq and "30" in nq:
        p = idx_containing("iuda")
        if p is not None:
            return p
    if "binecuvântat iacov pe fiii" in nq:
        p = idx_containing("deosebită", "deosebita")
        if p is not None:
            return p
    if "trait sara" in nq:
        p = idx_containing("127")
        if p is not None:
            return p
    if "șilo" in nq and "mesia" in nq:
        p = idx_containing("iacob")
        if p is not None:
            return p
    if "rugat pentru mai multe femei" in nq:
        p = idx_containing("avraam")
        if p is not None:
            return p
    if "brațele râului" in nq and "cuș" in nq:
        p = idx_containing("pison")
        if p is not None:
            return p
    if "ismael" in nq and "tăiat împrejur" in nq:
        p = idx_containing("opt zile", "8")
        if p is not None:
            return p
    if "70 de ori" in nq and "câte șapte" in nq:
        p = idx_containing("lameh")
        if p is not None:
            return p
    if "îngropat iacov" in nq and "peștera" in nq:
        p = idx_containing("macpela")
        if p is not None:
            return p
    if "vaci slabe" in nq:
        p = idx_containing("^7$", "7")
        for j, o in enumerate(oln):
            if o.strip() == "7":
                return j
        return 0
    if "au plâns" in nq and "geneza" in nq:
        p = idx_containing("esau")
        if p is not None:
            return p
    if "ieșit din haran" in nq and "avram avea" in nq:
        p = idx_containing("75")
        if p is not None:
            return p
    if "găsit iosif pe frații" in nq:
        p = idx_containing("dotan")
        if p is not None:
            return p
    if "murit rahela" in nq:
        p = idx_containing("betleem", "efrata")
        if p is not None:
            return p
    if "junghiat" in nq and "haina lui iosif" in nq:
        p = idx_containing("țap", "tap")
        if p is not None:
            return p
    if "omul să fie singur" in nq:
        p = idx_containing("soție", "sotie")
        if p is not None:
            return p
    if "venit iacov cu fiii" in nq and "egipt" in nq:
        p = idx_containing("canaan")
        if p is not None:
            return p
    if "scara cerului" in nq:
        p = idx_containing("betel")
        if p is not None:
            return p
    if "duhul lui dumnezeu" in nq and "om ca acesta" in nq:
        p = idx_containing("iosif")
        if p is not None:
            return p
    if "stat iacov in casa lui laban" in nq:
        p = idx_containing("20")
        if p is not None:
            return p
    if "efron" in nq and "cantarit" in nq:
        p = idx_containing("400")
        if p is not None:
            return p
    if "înseamnă ismael" in nq:
        p = idx_containing("ascultă", "asculta")
        if p is not None:
            return p
    if "fiți pe pace" in nq:
        p = idx_containing("economul")
        if p is not None:
            return p
    if "trăit cel mai mult" in nq and "enumerați" in nq:
        p = idx_containing("iared")
        if p is not None:
            return p
    if "tatăl lui canaan" in nq:
        p = idx_containing("ham")
        if p is not None:
            return p
    if "prima interdicție" in nq and "sânge" in nq:
        p = idx_containing("geneza")
        if p is not None:
            return p
    if "ieșit din haran" in nq and "câți ani avea avram" in nq:
        p = idx_containing("șaptezeci și cinci", "75")
        if p is not None:
            return p
    if "isaac după ce a venit" in nq and "esau" in nq:
        p = idx_containing("înspăimântat", "inspaimantat")
        if p is not None:
            return p
    if "tălmăcit iosif" in nq and "prima" in nq:
        p = idx_containing("paharnic")
        if p is not None:
            return p
    if "primul război" in nq:
        p = idx_containing("sidim")
        if p is not None:
            return p
    if "corectată de iosif" in nq:
        p = idx_containing("tălmăciri", "talmaciri")
        if p is not None:
            return p
    if "trăit adam" in nq and "ani" in nq:
        p = idx_containing("930")
        if p is not None:
            return p
    if "slujit iacov lui laban pentru rahela" in nq:
        p = idx_containing("7 ani", "^7")
        if p is not None:
            return p
    if "dumnezeii străini" in nq and "stejarul" in nq:
        p = idx_containing("sihem")
        if p is not None:
            return p
    if "fiul roabei agar" in nq:
        p = idx_containing("ismael")
        if p is not None:
            return p
    if "trait 777" in nq:
        p = idx_containing("lameh")
        if p is not None:
            return p
    if "furat rahela idolii" in nq:
        p = idx_containing("tundă", "tunda")
        if p is not None:
            return p
    if "sămânța" in nq and "stelele" in nq and "avram" in nq:
        p = idx_containing("stelele")
        if p is not None:
            return p
    if "trăit iacov în egipt" in nq:
        p = idx_containing("^17$", "17")
        for j, o in enumerate(oln):
            if o == "17":
                return j
        return 2
    if "nimicit sodoma" in nq:
        p = idx_containing("foc")
        if p is not None:
            return p
    if "soție numită iudita" in nq:
        p = idx_containing("esau")
        if p is not None:
            return p
    if "tăiat împrejur la vârsta" in nq:
        p = idx_containing("opt zile")
        if p is not None:
            return p
    if "murit abel" in nq:
        p = idx_containing("cain")
        if p is not None:
            return p
    if "visat faraon" in nq and "ce animale" in nq:
        p = idx_containing("vaci")
        if p is not None:
            return p
    if "căsătorit" in nq and "esau" in nq:
        p = idx_containing("40")
        if p is not None:
            return p
    if "mama lui ismael" in nq:
        p = idx_containing("agar")
        if p is not None:
            return p
    if "isaac către iacov" in nq and "binecuvântarea" in nq:
        p = idx_containing("neamuri")
        if p is not None:
            return p
    if "locuitorii sodomei" in nq and "lovit" in nq:
        p = idx_containing("orbire")
        if p is not None:
            return p
    if "vrăjmășie voi pune" in nq or "vrajmasie voi pune" in nq:
        p = idx_containing("călcâiul")
        if p is not None:
            return p
    if "înarmat avram" in nq:
        p = idx_containing("318")
        if p is not None:
            return p
    if "plecat ismael de la avraam" in nq:
        p = idx_containing("înțărcat", "intarcat")
        if p is not None:
            return p
    if "păzitorul fratelui meu" in nq:
        p = idx_containing("cain")
        if p is not None:
            return p
    if "schimbat numele lui avram în avraam" in nq and "vârstă" in nq:
        p = idx_containing("99")
        if p is not None:
            return p
    if "fântâna" in nq and "isaac" in nq and "certat" in nq:
        p = idx_containing("rehobot")
        if p is not None:
            return p
    if "a 3-a femeie" in nq:
        p = idx_containing("sarai")
        if p is not None:
            return p
    if "propus ca iosif să fie vândut" in nq:
        p = idx_containing("unii")
        if p is not None:
            return p
    if "primul om" in nq and "prooroc" in nq:
        p = idx_containing("enoh")
        if p is not None:
            return p
    if "animal a văzut avraam" in nq and "tufiș" in nq:
        p = idx_containing("berbec")
        if p is not None:
            return p
    if "mari apele pe pământ" in nq and "potop" in nq:
        p = idx_containing("150")
        if p is not None:
            return p
    if "tăiat împrejur" in nq and "avraam" in nq and "ani" in nq:
        p = idx_containing("99")
        if p is not None:
            return p
    if "îngropat iosif" in nq:
        p = idx_containing("egipt")
        if p is not None:
            return p
    if "urâciune pentru egipteni" in nq:
        p = idx_containing("păstor", "pastor")
        if p is not None:
            return p
    if "laudele fraților" in nq:
        p = idx_containing("iosif")
        if p is not None:
            return p
    if "prima stare" in nq and "iosif trăiește" in nq:
        p = idx_containing("înviorare", "inviorare")
        if p is not None:
            return p
    if "tatăl lui metusala" in nq:
        p = idx_containing("enoh")
        if p is not None:
            return p
    if "primul vanator" in nq or "vânător" in nq and "primul" in nq:
        p = idx_containing("nimrod")
        if p is not None:
            return p
    if "pustiu" in nq and "agar" in nq:
        p = idx_containing("beer")
        if p is not None:
            return p
    if "înșelat iacov pe esau" in nq:
        p = idx_containing("două ori", "doua ori")
        if p is not None:
            return p
    if "primul om pe care biblia îl numește evreu" in nq:
        p = idx_containing("avram")
        if p is not None:
            return p
    if "dezvinovățirea lui iacov" in nq:
        p = idx_containing("dumnezeu a văzut")
        if p is not None:
            return p
    if "dumnezeii străini" in nq and "miriște" in nq:
        p = idx_containing("miriște", "miriste")
        if p is not None:
            return p
    if "trăit avraam" in nq and "ani" in nq:
        p = idx_containing("175")
        if p is not None:
            return p
    if "robia egipteană" in nq:
        p = idx_containing("avram")
        if p is not None:
            return p
    if "recunoscut iosif" in nq:
        p = idx_containing("da")
        if p is not None:
            return p
    if "al doilea om" in nq and "umblat cu dumnezeu" in nq:
        p = idx_containing("noe")
        if p is not None:
            return p
    if "mama lui madian" in nq:
        p = idx_containing("chetura")
        if p is not None:
            return p
    if "trait peleg" in nq:
        p = idx_containing("239")
        if p is not None:
            return p
    if "fetele lui lot" in nq and "copiii" in nq:
        p = idx_containing("moab")
        if p is not None:
            return p
    if "visat o scară" in nq:
        p = idx_containing("iacob")
        if p is not None:
            return p
    if "heruvimi" in nq:
        p = idx_containing("răsărit", "rasarit")
        if p is not None:
            return p
    if "babel" in nq and "înseamnă" in nq:
        p = idx_containing("încurcătură", "incurcatura")
        if p is not None:
            return p
    if "sentința" in nq and "cain" in nq:
        p = idx_containing("pribeag")
        if p is not None:
            return p
    if "prima dată de doctori" in nq:
        p = idx_containing("iacob")
        if p is not None:
            return p
    if "întâiul născut al lui iuda" in nq and "omorât" in nq:
        p = idx_containing("er")
        if p is not None:
            return p
    if "tatăl rebecii" in nq:
        p = idx_containing("betuel")
        if p is not None:
            return p
    if "al 3 brat" in nq or "al treilea brat" in nq:
        p = idx_containing("hidechel", "hiddekel")
        if p is not None:
            return p
    if "vândut" in nq and "30" in nq and "iuda" in nq:
        p = idx_containing("30 de sicli")
        if p is not None:
            return p
    if "mirosul hainelor" in nq:
        p = idx_containing("câmp")
        if p is not None:
            return p
    if "ziua a 4-a" in nq or "ziua a patra" in nq:
        p = idx_containing("soarele")
        if p is not None:
            return p
    if "apele mari" in nq and "urma potopului" in nq:
        p = idx_containing("150")
        if p is not None:
            return p
    if "locuiască iuda" in nq:
        p = idx_containing("adulam")
        if p is not None:
            return p
    if "calități" in nq and "iosif" in nq and "egipteanului" in nq:
        p = idx_containing("frumos")
        if p is not None:
            return p
    if "înmormântarea lui iacov" in nq:
        p = idx_containing("fiii")
        if p is not None:
            return p
    if "neftali" in nq and "ce este" in nq:
        p = idx_containing("cerboaică", "cerboaica")
        if p is not None:
            return p
    if "rămas în egipt" in nq and "prima" in nq:
        p = idx_containing("simeon")
        if p is not None:
            return p
    if "altarul" in nq and "sihem" in nq:
        p = idx_containing("dumnezeul lui israel")
        if p is not None:
            return p
    if "noe copii" in nq:
        p = idx_containing("cinci sute", "500")
        if p is not None:
            return p
    if "merga la padan-aram" in nq:
        p = idx_containing("rebeca")
        if p is not None:
            return p
    if "am căpătat" in nq:
        p = idx_containing("om")
        if p is not None:
            return p
    if "nașterea" in nq and "isaac" in nq and "avraam" in nq:
        p = idx_containing("100")
        if p is not None:
            return p
    if "femeilor din casa împăratului" in nq:
        p = idx_containing("orbit")
        if p is not None:
            return p
    if "îngropat avraam pe sara" in nq:
        p = idx_containing("macpela")
        if p is not None:
            return p
    if "luptat cu iacov" in nq:
        p = idx_containing("șold", "sold", "coaste")
        if p is not None:
            return p
    if "viețuitoarele mării" in nq:
        p = idx_containing("5-a", "cincea")
        if p is not None:
            return p
    if "fața adâncurilor" in nq:
        p = idx_containing("duhul")
        if p is not None:
            return p
    if "legământul" in nq and "noe" in nq:
        p = idx_containing("potop")
        if p is not None:
            return p
    if "4 brațe" in nq:
        p = idx_containing("ghihon")
        if p is not None:
            return p
    if "ismael binecuv" in nq:
        p = idx_containing("^da$", "da")
        for j, o in enumerate(oln):
            if o == "da":
                return j
        return 0
    if "adam când s-a născut set" in nq:
        p = idx_containing("130")
        if p is not None:
            return p
    if "ziua a 7" in nq:
        p = idx_containing("sfințit", "sfintit")
        if p is not None:
            return p
    if "brațe se împărțea râul" in nq:
        p = idx_containing("patru")
        if p is not None:
            return p
    if "uda grădina" in nq:
        p = idx_containing("patru brațe")
        if p is not None:
            return p
    if "accuzat pe nedrept" in nq:
        p = idx_containing("daniel")
        if p is not None:
            return p
    if "poruncă a dat isaac lui iacov" in nq:
        p = idx_containing("nu-ți iei nevastă dintre fetele lui canaan")
        if p is not None:
            return p
    if "fii i s-au născut lui iosif înaintea" in nq:
        p = idx_containing("doi fii")
        if p is not None:
            return p
    if "sem, fiul cel mai mare" in nq:
        p = idx_containing("600")
        if p is not None:
            return p
    if "turnul babel" in nq:
        p = idx_containing("șinear", "sinear")
        if p is not None:
            return p
    if "murit iacob" in nq or "murit iacov" in nq:
        p = idx_containing("egipt")
        if p is not None:
            return p
    if "enoh cu dumnezeu" in nq and "metusala" in nq:
        p = idx_containing("300")
        if p is not None:
            return p
    if "târmul marilor" in nq:
        p = idx_containing("zabulon")
        if p is not None:
            return p
    if "rebeca" in nq and "apă" in nq and "cămile" in nq:
        p = idx_containing("cămilele", "camilele")
        if p is not None:
            return p
    if "5 ori mai multe bucate" in nq:
        p = idx_containing("beniamin")
        if p is not None:
            return p
    if "corabia lui noe" in nq and "oameni" in nq:
        p = idx_containing("opt", "8")
        if p is not None:
            return p
    if "nevasta lui er" in nq:
        p = idx_containing("tamar")
        if p is not None:
            return p
    if "primul om care a dat zeciuială" in nq:
        p = idx_containing("avraam")
        if p is not None:
            return p
    if "facerea de bine a lui iosif" in nq:
        p = idx_containing("gosen")
        if p is not None:
            return p
    if "vițelul pentru oaspeți" in nq:
        p = idx_containing("slugă", "sluga")
        if p is not None:
            return p
    if "însoțit pe avraam" in nq and "credinta" in nq:
        p = idx_containing("isac")
        if p is not None:
            return p
    if "însoțit pe acesta la faraon" in nq:
        p = idx_containing("toți")
        if p is not None:
            return p
    if "binecuvântarea" in nq and "iuda" in nq and "leu" in nq:
        p = idx_containing("leu")
        if p is not None:
            return p
    if "primul fiu" in nq and "iuda" in nq:
        p = idx_containing("er")
        if p is not None:
            return p
    if "îmbalsamat pe iacov" in nq:
        p = idx_containing("doctorii lui faraon")
        if p is not None:
            return p
    if "vietuitoarele pamantului" in nq:
        p = idx_containing("șasea", "sasea")
        if p is not None:
            return p
    if "gria egipteanului" in nq or "grija egipteanului" in nq:
        p = idx_containing("mâncare", "mancare")
        if p is not None:
            return p
    if "răzbunat cain" in nq:
        p = idx_containing("șapte ori șapte")
        if p is not None:
            return p
    if "însemna eva" in nq:
        p = idx_containing("viață", "viata")
        if p is not None:
            return p
    if "tăiat împrejur avraam" in nq and "casă" in nq:
        p = idx_containing("toți oamenii")
        if p is not None:
            return p
    if "pitarnicul" in nq or "pitar" in nq and "visat" in nq:
        p = idx_containing("păsări")
        if p is not None:
            return p
    if "mlădițe" in nq and "paharnic" in nq:
        p = idx_containing("^3$", "3")
        for j, o in enumerate(oln):
            if o == "3":
                return j
        return 1
    if "nevasta lui ismael" in nq:
        p = idx_containing("egipt")
        if p is not None:
            return p
    if "isahar" in nq:
        p = idx_containing("răsplătire", "rasplatire")
        if p is not None:
            return p
    if "zălog" in nq and "iuda păcătuit" in nq:
        p = idx_containing("toiag")
        if p is not None:
            return p
    if "trăit enos" in nq:
        p = idx_containing("905")
        if p is not None:
            return p
    if "cumpărat pe iosif" in nq:
        p = idx_containing("potifar")
        if p is not None:
            return p
    if "însoțit pe iacov" in nq and "padan-aram" in nq:
        p = idx_containing("două slugi")
        if p is not None:
            return p
    if "primul născut a lui adam" in nq:
        p = idx_containing("cain")
        if p is not None:
            return p
    if "scăpat pe iosif" in nq:
        p = idx_containing("ruben")
        if p is not None:
            return p
    if "fii lui levi" in nq and "care au fost" in nq:
        # toate trei sunt fii; întrebarea e incompletă — Chehat e primul menționat
        p = idx_containing("chehat")
        if p is not None:
            return p
    if "peniel" in nq and "înseamnă" in nq:
        p = idx_containing("fața")
        if p is not None:
            return p
    if "peste trei zile, faraon" in nq and "păsările" in nq:
        p = idx_containing("pitar")
        if p is not None:
            return p
    if "969 ani" in nq:
        p = idx_containing("enoh")
        if p is not None:
            return p
    if "înseamnă iacov" in nq and "cel ce" in nq:
        p = idx_containing("călcâi", "calcai")
        if p is not None:
            return p
    if "fă acum tot ce ți-a spus dumnezeu" in nq:
        p = idx_containing("faraon")
        if p is not None:
            return p
    if "aruncat potifar" in nq:
        p = idx_containing("temniță", "temnita")
        if p is not None:
            return p
    if "după ce potifar a pus pe iosif" in nq:
        p = idx_containing("binecuvântarea domnului")
        if p is not None:
            return p
    if "zălog a lăsat iuda lui tamar" in nq:
        p = idx_containing("lanțul")
        if p is not None:
            return p
    if "murit sara" in nq:
        p = idx_containing("hebron")
        if p is not None:
            return p
    if "brațul râului" in nq and "cuș" in nq:
        p = idx_containing("pison")
        if p is not None:
            return p
    if "chezas" in nq and "beniamin" in nq:
        p = idx_containing("iuda")
        if p is not None:
            return p
    if "trei mlădițe" in nq and "paharnicul" in nq:
        p = idx_containing("trei zile")
        if p is not None:
            return p
    if "fiicele lui lot" in nq and "păcătuit" in nq:
        p = idx_containing("tatăl")
        if p is not None:
            return p
    if "prima dată de lacrimi" in nq:
        p = idx_containing("agar")
        if p is not None:
            return p
    if "sarai este sora" in nq:
        p = idx_containing("faraon")
        if p is not None:
            return p
    if "locuit iacov în egipt" in nq and "ținut" in nq:
        p = idx_containing("gosen")
        if p is not None:
            return p
    if "tălmacit două vise" in nq:
        p = idx_containing("iosif")
        if p is not None:
            return p
    if "zărita dina" in nq:
        p = idx_containing("sihem")
        if p is not None:
            return p
    if "lege a instituit iosif" in nq:
        p = idx_containing("cincime")
        if p is not None:
            return p
    if "dus pe iosif în egipt" in nq and "cine l-a" in nq:
        p = idx_containing("frații")
        if p is not None:
            return p
    if "jucându-se cu nevastă" in nq:
        p = idx_containing("isaac")
        if p is not None:
            return p
    if "melhisedec" in nq or "zeciuială" in nq:
        p = idx_containing("melhisedec")
        if p is not None:
            return p
    if "răzbune pe iacov" in nq and "binecuvânt" in nq:
        p = idx_containing("omorându")
        if p is not None:
            return p
    if "frunze de smochin" in nq:
        p = idx_containing("șorțuri", "sorturi")
        if p is not None:
            return p
    if "eu mă tem de dumnezeu" in nq:
        p = idx_containing("iosif")
        if p is not None:
            return p
    if "binecuvânta toate neamurile" in nq:
        p = idx_containing("ascultat")
        if p is not None:
            return p
    if "îngropat avraam" in nq and "?" in q:
        p = idx_containing("macpela")
        if p is not None:
            return p
    if "rebeca" in nq and "văzut pe isaac" in nq:
        p = idx_containing("măhrama")
        if p is not None:
            return p
    if "paharnicului" in nq and "amintească" in nq:
        p = idx_containing("doi ani")
        if p is not None:
            return p
    if "îngropați isaac și rebeca" in nq:
        p = idx_containing("macpela")
        if p is not None:
            return p
    if "fiul lui set" in nq:
        p = idx_containing("enos")
        if p is not None:
            return p
    if "scutul tău" in nq:
        p = idx_containing("moria")
        if p is not None:
            return p
    if "ură pe iacov" in nq and "esau" in nq:
        p = idx_containing("binecuvânt")
        if p is not None:
            return p
    if "ascuns rahela idolii" in nq:
        p = idx_containing("samarul")
        if p is not None:
            return p
    if "grădină a domnului" in nq:
        p = idx_containing("sodomei")
        if p is not None:
            return p

    # Fallback: variantă care apare cel mai „distinctă” sau mijlocul
    return 1


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def sql_json_array(opts: list[str]) -> str:
    return "'" + json.dumps(opts, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: build_geneza_from_txt.py <Intrebari_geneza.txt>|-", file=sys.stderr)
        sys.exit(1)
    if sys.argv[1] == "-":
        text = sys.stdin.read()
    else:
        path = Path(sys.argv[1])
        text = path.read_text(encoding="utf-8")
    blocks = parse_blocks(text)
    if not blocks:
        print("Nu s-au putut parsa întrebări (format așteptat: linie cu Indiciu, apoi 3 variante).", file=sys.stderr)
        sys.exit(1)

    print(
        """-- Quiz din Intrebari_geneza.txt (parsat automat).
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
"""
    )

    values_parts: list[str] = []
    for i, (q, opts) in enumerate(blocks):
        ci = resolve_answer(q, opts)
        if ci < 0 or ci > 2:
            ci = 1
        prompt = sql_str(q)
        opts_sql = sql_json_array(opts)
        values_parts.append(
            f"  SELECT target.id, {prompt}, {opts_sql}, {ci}::smallint, {i}, 30 FROM target"
        )

    print("  " + "\n  UNION ALL\n  ".join(values_parts))
    print(
        """
)
INSERT INTO public.questions (quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds)
SELECT * FROM ins
WHERE NOT EXISTS (SELECT 1 FROM public.questions q WHERE q.quiz_id = (SELECT id FROM target));
"""
    )
    print(f"-- Total întrebări: {len(blocks)}", file=sys.stderr)


if __name__ == "__main__":
    main()
