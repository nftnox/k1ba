"""
Dijagnostička skripta za testiranje image pipeline-a.
Pokretanje: python test_images.py
"""
import asyncio
import sys
from services.image_processor import (
    find_and_process_image,
    _fetch_ddg_image,
    _fetch_wikipedia_image,
    extract_keywords,
    _clean_for_search,
    _extract_person_name,
)

TEST_TITLES = [
    "Novak Đoković pobijedio na Wimbledonu i osvoji titulu",
    "Kćerka Tysona Furyja napušta vilu od devet miliona eura",
    "Donald Trump potpisao novi zakon o imigraciji",
    "Milorad Dodik uhapšen u Sarajevu",
    "Manchester City eliminisan iz Lige prvaka",
    "Pep Guardiola napušta City nakon sezone",
]


async def run_tests():
    print("=" * 60)
    print("K1.ba Image Pipeline – Dijagnostika")
    print("=" * 60)

    for title in TEST_TITLES:
        print(f"\n>> Naslov: {title}")

        kw_raw  = extract_keywords(title)
        kw_clean = _clean_for_search(kw_raw)
        person   = _extract_person_name(title)

        print(f"   Keywords (raw):   {kw_raw}")
        print(f"   Keywords (clean): {kw_clean}")
        print(f"   Osoba:            {person or '–'}")

        # Test DDG
        ddg_url = await _fetch_ddg_image(kw_clean)
        print(f"   DuckDuckGo: {'OK ' + ddg_url[:70] if ddg_url else 'NISTA NIŠTA'}")

        # Test Wikipedia (samo ako je osoba detektovana)
        if person:
            wiki_url = await _fetch_wikipedia_image(person)
            print(f"   Wikipedia:  {'OK ' + wiki_url[:70] if wiki_url else 'NISTA NIŠTA'}")

        # Kompletan pipeline
        result = await find_and_process_image(title)
        if result:
            print(f"   OK FINALNI URL: {result['url']}")
        else:
            print(f"   NISTA Slika nije pronadjena")

        await asyncio.sleep(2)  # pauza da izbjegnemo rate limit

    print("\n" + "=" * 60)
    print("Test završen.")


if __name__ == "__main__":
    asyncio.run(run_tests())
