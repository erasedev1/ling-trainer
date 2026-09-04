#!/usr/bin/env python3
"""Build the LinguiSHTIK trainer lexicon.

The official dictionary for LinguiSHTIK tournament play is Webster's Third New
International Unabridged (online at dictionary.eb.com), which is not
redistributable and has no public API.  This script therefore builds an
*approximation* lexicon that is deliberately conservative:

  * legality  -- a broad spelling list (ENABLE) decides "is this an English word"
  * tagging   -- the SPECIALIST-derived lookup shipped with `lemminflect` supplies
                 part of speech and inflectional forms for open-class words
  * frequency -- Norvig's count_1w unigram counts supply a difficulty tier

Words we cannot tag are still recorded as legal spellings, but the engine reports
them as UNVERIFIED rather than scoring them.  See docs/RESEARCH.md.

Inputs (downloaded by `make_inputs`, cached under scripts/.cache):
  enable1.txt   https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt
  count_1w.txt  https://norvig.com/ngrams/count_1w.txt

Output: public/data/lexicon.json
"""

from __future__ import annotations

import gzip
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "scripts", ".cache")
OUT = os.path.join(ROOT, "public", "data", "lexicon.json")

# LT 22: the word to be formed is 4-10 letters.
MIN_LEN = 4
MAX_LEN = 10

SOURCES = {
    "enable1.txt": "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt",
    "count_1w.txt": "https://norvig.com/ngrams/count_1w.txt",
}

WORD_RE = re.compile(r"^[a-z]+$")


def fetch(name: str) -> str:
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        url = SOURCES[name]
        sys.stderr.write(f"downloading {url}\n")
        urllib.request.urlretrieve(url, path)
    return path


def load_freq() -> dict[str, int]:
    """word -> rank (0 = most frequent)."""
    freq: dict[str, int] = {}
    with open(fetch("count_1w.txt"), encoding="utf-8") as fh:
        for rank, line in enumerate(fh):
            word = line.split("\t", 1)[0].strip().lower()
            if word and word not in freq:
                freq[word] = rank
    return freq


def load_enable() -> set[str]:
    with open(fetch("enable1.txt"), encoding="utf-8") as fh:
        return {w.strip().lower() for w in fh if w.strip()}


def load_inflection_lookup() -> dict[str, dict[str, tuple[str, ...]]]:
    """lemma -> {category: forms} from the lemminflect resource table.

    Rows look like:  walk,verb,walked,walked,walking,walks
    Column order per category is fixed by lemminflect's InflectionLUCodec.
    """
    import lemminflect  # noqa: F401  (only used to locate the resource)

    res = os.path.join(os.path.dirname(lemminflect.__file__), "resources", "infl_lu.csv.gz")
    order = {
        "noun": ["NNS"],
        "adj": ["JJR", "JJS"],
        "adv": ["RBR", "RBS"],
        "verb": ["VBD", "VBN", "VBG", "VBZ"],
    }
    table: dict[str, dict[str, dict[str, tuple[str, ...]]]] = {}
    with gzip.open(res, "rt", encoding="utf-8") as fh:
        for line in fh:
            parts = line.rstrip("\n").split(",")
            if len(parts) < 2:
                continue
            lemma, cat, forms = parts[0], parts[1], parts[2:]
            if cat not in order:
                continue
            if lemma != lemma.lower():
                continue  # proper nouns / acronyms: LT 22A forbids proper nouns
            slot: dict[str, tuple[str, ...]] = {}
            for i, tag in enumerate(order[cat]):
                if i < len(forms) and forms[i]:
                    spellings = tuple(s for s in forms[i].split("/") if s)
                    if spellings:
                        slot[tag] = spellings
            table.setdefault(lemma, {})[cat] = slot
    return table


# --------------------------------------------------------------------------
# Closed-class words come straight from the official AGLOA materials and are
# maintained by hand in data/closed-class.json (see docs/RESEARCH.md for the
# citations).  The builder only needs them so that open-class tagging does not
# overwrite them.
# --------------------------------------------------------------------------
def load_closed_class() -> dict:
    path = os.path.join(ROOT, "data", "closed-class.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


# Verbs that LinguiSHTIK treats as linking verbs (Handbook IV.A.3).
LINKING_VERB_LEMMAS = {
    "be", "appear", "become", "feel", "grow", "look", "remain",
    "seem", "smell", "sound", "stay", "taste", "turn",
}

# Handbook IV.C.5: a regular verb forms past / past participle with -d or -ed.
def is_regular_verb(lemma: str, past: tuple[str, ...], past_part: tuple[str, ...]) -> bool:
    def regular_form(form: str) -> bool:
        if form == lemma + "ed" or form == lemma + "d":
            return True
        # consonant doubling (stop -> stopped) and y -> ied (carry -> carried)
        if len(lemma) >= 2 and form == lemma + lemma[-1] + "ed":
            return True
        if lemma.endswith("y") and form == lemma[:-1] + "ied":
            return True
        if lemma.endswith("c") and form == lemma + "ked":
            return True
        return False

    forms = list(past) + list(past_part)
    return bool(forms) and all(regular_form(f) for f in forms)


# Handbook V.C.1: regular comparison adds -er / -est.
def is_regular_comparison(base: str, comp: tuple[str, ...], sup: tuple[str, ...]) -> bool:
    def ok(form: str, suffix: str) -> bool:
        if form == base + suffix:
            return True
        if len(base) >= 2 and form == base + base[-1] + suffix:
            return True
        if base.endswith("y") and form == base[:-1] + "i" + suffix:
            return True
        if base.endswith("e") and form == base[:-1] + suffix:
            return True
        return False

    if not comp and not sup:
        return False
    return all(ok(f, "er") for f in comp) and all(ok(f, "est") for f in sup)


def build_compounds(freq: dict[str, int], enable: set[str], nouns: set[str]) -> set[str]:
    """Conservative compound detection (Dictionary of Terms: 'COMPOUND WORD').

    A compound is one solidly written word made by combining two or more smaller
    words, keeping their meanings, with no part functioning as a prefix or
    suffix.  Meaning cannot be checked automatically, so we require both parts to
    be common free-standing words of >= 3 letters and reject anything whose parts
    look like an affix.  The result is a high-precision subset, not a complete
    list; the trainer only ever uses it to *offer* the COMPOUND demand.
    """
    affixes = {
        # fragments that are real words but nearly always act as affixes here
        "able", "ably", "ness", "less", "ment", "tion", "sion", "ling", "ship",
        "ward", "wards", "ing", "est", "ers", "ies", "ate", "ive", "ous", "ary",
        "ant", "ent", "ist", "ism", "ify", "ize", "pre", "pro", "sub", "non",
        "mis", "dis", "con", "com", "per", "res", "ide", "ine", "one", "ate",
        "era", "ere", "ies", "ise", "ale", "ade", "age",
    }
    common = {w for w, r in freq.items() if r < 30000}
    parts_ok = {w for w in common if 3 <= len(w) <= 8 and w in enable and w not in affixes}
    out: set[str] = set()
    for word in enable:
        if not (MIN_LEN <= len(word) <= MAX_LEN):
            continue
        if freq.get(word, 10**9) > 120000:
            continue  # not a word a player would reach for
        for i in range(3, len(word) - 2):
            left, right = word[:i], word[i:]
            if left in parts_ok and right in parts_ok:
                # reject when either part is only a word by accident of length
                if freq.get(left, 10**9) < 25000 and freq.get(right, 10**9) < 25000:
                    out.add(word)
                    break
    return out


def freq_tier(rank: int | None) -> int:
    """0 = everyday, 4 = obscure. Used for difficulty and answer-key ranking."""
    if rank is None:
        return 5
    for tier, limit in enumerate((3000, 12000, 40000, 100000, 250000)):
        if rank < limit:
            return tier
    return 5


def main() -> None:
    freq = load_freq()
    enable = load_enable()
    lookup = load_inflection_lookup()
    closed = load_closed_class()

    closed = {k: v for k, v in closed.items() if not k.startswith("_")}

    # word -> record
    words: dict[str, dict] = {}

    def rec(word: str) -> dict:
        return words.setdefault(word, {"w": word, "pos": set()})

    def usable(word: str) -> bool:
        return (
            MIN_LEN <= len(word) <= MAX_LEN
            and bool(WORD_RE.match(word))
            and word in enable
        )

    noun_lemmas: set[str] = set()

    # Handbook III.C.1-2: "some nouns are the same singular as plural."
    # The SPECIALIST table also records optional zero-plurals for many ordinary
    # nouns (summer,noun,summers/summer), so a curated list decides this.
    ZERO_PLURAL = {
        "aircraft", "bison", "buffalo", "cod", "corps", "deer", "elk", "fish",
        "grouse", "means", "moose", "offspring", "quail", "salmon", "series",
        "sheep", "shrimp", "species", "swine", "trout",
    }

    def add_num(word: str, num: str) -> None:
        rec(word).setdefault("noun", {}).setdefault("num", set()).add(num)

    for lemma, cats in lookup.items():
        for cat, forms in cats.items():
            if cat == "noun":
                noun_lemmas.add(lemma)
                plurals = forms.get("NNS", ())
                if usable(lemma):
                    rec(lemma)["pos"].add("noun")
                    add_num(lemma, "sg")
                    if lemma in plurals and (plurals == (lemma,) or lemma in ZERO_PLURAL):
                        add_num(lemma, "pl")
                for p in plurals:
                    if usable(p) and p != lemma:
                        rec(p)["pos"].add("noun")
                        add_num(p, "pl")
            elif cat == "verb":
                past = forms.get("VBD", ())
                pastp = forms.get("VBN", ())
                presp = forms.get("VBG", ())
                third = forms.get("VBZ", ())
                regular = is_regular_verb(lemma, past, pastp)
                linking = lemma in LINKING_VERB_LEMMAS

                def add_verb(word: str, form: str) -> None:
                    if not usable(word):
                        return
                    r = rec(word)
                    r["pos"].add("verb")
                    v = r.setdefault("verb", {"forms": set(), "lemmas": set()})
                    v["forms"].add(form)
                    v["lemmas"].add(lemma)
                    # a form may belong to several lemmas; a demand for "regular"
                    # is satisfied if any of them is regular
                    v["reg"] = v.get("reg", False) or regular
                    v["irr"] = v.get("irr", False) or not regular
                    if linking:
                        v["linking"] = True

                add_verb(lemma, "base")
                for w in past:
                    add_verb(w, "past")
                for w in pastp:
                    add_verb(w, "pastPart")
                for w in presp:
                    add_verb(w, "presPart")
                for w in third:
                    add_verb(w, "thirdSg")
            elif cat in ("adj", "adv"):
                key = "adj" if cat == "adj" else "adv"
                pos_name = "adjective" if cat == "adj" else "adverb"
                comp = forms.get("JJR" if cat == "adj" else "RBR", ())
                sup = forms.get("JJS" if cat == "adj" else "RBS", ())
                regular = is_regular_comparison(lemma, comp, sup)
                gradable = bool(comp or sup)

                def add_mod(word: str, degree: str) -> None:
                    if not usable(word):
                        return
                    r = rec(word)
                    r["pos"].add(pos_name)
                    m = r.setdefault(key, {"deg": set()})
                    m["deg"].add(degree)
                    m["reg"] = m.get("reg", False) or regular
                    m["irr"] = m.get("irr", False) or (gradable and not regular)
                    m["grad"] = m.get("grad", False) or gradable

                add_mod(lemma, "positive")
                for w in comp:
                    add_mod(w, "comparative")
                for w in sup:
                    add_mod(w, "superlative")

    compounds = build_compounds(freq, enable, noun_lemmas)

    # Closed-class entries are authoritative: they override / augment tagging.
    for group_name, entries in closed.items():
        for entry in entries:
            word = entry["w"]
            if not (MIN_LEN <= len(word) <= MAX_LEN):
                continue
            r = rec(word)
            for tag in entry.get("pos", []):
                r["pos"].add(tag)
            if "pron" in entry:
                r["pron"] = entry["pron"]
            if entry.get("collective"):
                r.setdefault("noun", {})["collective"] = True
            if "verb" in entry:
                spec = entry["verb"]
                v = r.setdefault("verb", {"forms": set()})
                v["forms"].update(spec.get("forms", []))
                for flag in ("aux", "linking", "reg", "irr"):
                    if spec.get(flag):
                        v[flag] = True
                if spec.get("num"):
                    v.setdefault("num", set()).update(spec["num"])

    out_words = []
    for word, r in sorted(words.items()):
        if not r["pos"]:
            continue
        entry: dict = {"w": word, "pos": sorted(r["pos"]), "f": freq_tier(freq.get(word))}
        if "noun" in r:
            n = dict(r["noun"])
            if isinstance(n.get("num"), set):
                n["num"] = sorted(n["num"])
            entry["n"] = n
        if "verb" in r:
            v = dict(r["verb"])
            v["forms"] = sorted(v["forms"])
            v.pop("lemmas", None)
            if isinstance(v.get("num"), set):
                v["num"] = sorted(v["num"])
            entry["v"] = v
        if "adj" in r:
            a = dict(r["adj"])
            a["deg"] = sorted(a["deg"])
            entry["a"] = a
        if "adv" in r:
            a = dict(r["adv"])
            a["deg"] = sorted(a["deg"])
            entry["d"] = a
        if "pron" in r:
            entry["p"] = r["pron"]
        if word in compounds:
            entry["c"] = 1
        out_words.append(entry)

    tagged = {e["w"] for e in out_words}
    spellings = sorted(w for w in enable if usable(w) and w not in tagged)

    payload = {
        "version": "2026.1",
        "note": (
            "Approximation of Webster's Third New International Unabridged, the "
            "official LinguiSHTIK dictionary (LT 4). Tagged entries are scored; "
            "untagged spellings are accepted as words but reported UNVERIFIED."
        ),
        "sources": {
            "spellings": "ENABLE word list",
            "tagging": "SPECIALIST lexicon via lemminflect",
            "frequency": "Norvig count_1w unigram counts",
            "closedClass": "AGLOA LinguiSHTIK Handbook & Judges Manual 2026-27",
        },
        "minLength": MIN_LEN,
        "maxLength": MAX_LEN,
        "words": out_words,
        "untagged": spellings,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"))
    size = os.path.getsize(OUT)
    sys.stderr.write(
        f"wrote {OUT}: {len(out_words)} tagged, {len(spellings)} untagged, "
        f"{size/1024/1024:.2f} MB\n"
    )


if __name__ == "__main__":
    main()
