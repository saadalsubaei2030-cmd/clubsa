#!/usr/bin/env python3
"""يحوّل ملفات content/articles/*.txt إلى صفحات HTML ثابتة داخل public/articles/ ويحدّث sitemap.xml.

صيغة الملف:
  title: عنوان المقال
  description: وصف قصير
  date: 2026-10-25
  ---
  فقرة عادية (يفصل بين الفقرات سطر فارغ)

  ## عنوان فرعي
  - نقطة في قائمة
"""
import html
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "articles"
OUT = ROOT / "public" / "articles"
SITE = "https://clubsa-fc.com"
ADS = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8607384594603321" crossorigin="anonymous"></script>'

STYLE = """:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#020617;color:#cbd5e1;font-family:Tahoma,"Segoe UI",Arial,sans-serif;line-height:1.95}
header,footer{border-color:#1e293b;border-style:solid;border-width:0}
header{border-bottom-width:1px;padding:14px 16px}
nav{max-width:760px;margin:0 auto;display:flex;flex-wrap:wrap;gap:14px;align-items:center}
nav a{color:#94a3b8;text-decoration:none;font-size:14px;font-weight:700}
nav a:hover{color:#67e8f9}
nav .brand{color:#fff;font-weight:800;margin-inline-end:auto}
main{max-width:760px;margin:0 auto;padding:32px 16px 56px}
h1{color:#fff;font-size:28px;line-height:1.5;margin:0 0 6px}
h2{color:#67e8f9;font-size:19px;margin:30px 0 6px}
p,li{font-size:16px}
li{margin-bottom:6px}
.meta{color:#64748b;font-size:13px;margin-bottom:22px}
a{color:#67e8f9}
.cards{display:grid;gap:14px;margin-top:20px}
.card{display:block;border:1px solid #1e293b;border-radius:14px;padding:16px 18px;background:#0b1220;text-decoration:none}
.card:hover{border-color:#164e63}
.card strong{display:block;color:#fff;font-size:17px;margin-bottom:4px}
.card span{color:#94a3b8;font-size:14px}
.related{margin-top:40px;border-top:1px solid #1e293b;padding-top:8px}
footer{border-top-width:1px;padding:20px 16px;text-align:center;color:#64748b;font-size:13px}"""

NAV = ('<header><nav><a class="brand" href="/">CLUBSA</a><a href="/">الرئيسية</a><a href="/articles/">المقالات</a>'
       '<a href="/about">من نحن</a><a href="/privacy">سياسة الخصوصية</a><a href="/terms">الشروط والأحكام</a><a href="/contact">اتصل بنا</a></nav></header>')
FOOT = '<footer>CLUBSA موقع مستقل وغير تابع لشركة Electronic Arts. جميع الحقوق محفوظة &copy; CLUBSA 2026 · <a href="/">العودة إلى الموقع</a></footer>'

AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]


def ar_date(iso: str) -> str:
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {AR_MONTHS[m - 1]} {y}"


def inline(text: str) -> str:
    text = html.escape(text, quote=False)
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)


def body_html(lines: list[str]) -> str:
    out: list[str] = []
    para: list[str] = []
    bullets: list[str] = []

    def flush():
        nonlocal para, bullets
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")
            para = []
        if bullets:
            out.append("<ul>" + "".join(f"<li>{inline(b)}</li>" for b in bullets) + "</ul>")
            bullets = []

    for raw in lines:
        line = raw.strip()
        if not line:
            flush()
        elif line.startswith("## "):
            flush()
            out.append(f"<h2>{inline(line[3:])}</h2>")
        elif line.startswith("- "):
            if para:
                flush()
            bullets.append(line[2:])
        else:
            if bullets:
                flush()
            para.append(line)
    flush()
    return "\n".join(out)


def parse(path: pathlib.Path) -> dict:
    head, _, body = path.read_text(encoding="utf-8").partition("\n---\n")
    meta = {}
    for line in head.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    for key in ("title", "description", "date"):
        if key not in meta:
            sys.exit(f"{path.name}: missing {key}")
    meta["slug"] = path.stem
    meta["lines"] = body.splitlines()
    meta["words"] = len(body.split())
    return meta


def page(title: str, description: str, canonical: str, main: str) -> str:
    return f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{html.escape(title)} | CLUBSA</title>
<meta name="description" content="{html.escape(description, quote=True)}" />
<link rel="canonical" href="{canonical}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
{ADS}
<style>
{STYLE}
</style>
</head>
<body>
{NAV}
<main>
{main}
</main>
{FOOT}
</body>
</html>
"""


def main() -> None:
    articles = sorted((parse(p) for p in SRC.glob("*.txt")), key=lambda a: (a["date"], a["slug"]), reverse=True)
    if not articles:
        sys.exit("no articles found")
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.html"):
        old.unlink()

    for a in articles:
        related = [x for x in articles if x["slug"] != a["slug"]]
        start = articles.index(a)
        related = (articles[start + 1:] + articles[:start])[:3]
        rel_html = "".join(
            f'<a class="card" href="/articles/{r["slug"]}"><strong>{html.escape(r["title"])}</strong><span>{html.escape(r["description"])}</span></a>'
            for r in related
        )
        main_html = (
            f'<h1>{html.escape(a["title"])}</h1>\n<p class="meta">آخر تحديث: {ar_date(a["date"])}</p>\n'
            f'{body_html(a["lines"])}\n<section class="related"><h2>مقالات ذات صلة</h2><div class="cards">{rel_html}</div></section>'
        )
        (OUT / f'{a["slug"]}.html').write_text(
            page(a["title"], a["description"], f'{SITE}/articles/{a["slug"]}', main_html), encoding="utf-8"
        )

    cards = "".join(
        f'<a class="card" href="/articles/{a["slug"]}"><strong>{html.escape(a["title"])}</strong><span>{html.escape(a["description"])}</span></a>'
        for a in articles
    )
    index_main = (
        "<h1>مقالات وأدلة البرو كلبس</h1>\n"
        '<p class="meta">أدلة عربية للاعبي EA SPORTS FC Pro Clubs: المراكز والبناءات والتشكيلات وإدارة النادي.</p>\n'
        "<p>كتبنا هذه المقالات لتساعد اللاعب الجديد على فهم اللعبة بسرعة، ولتعطي رئيس النادي أفكارًا عملية في بناء فريقه. "
        "المعلومات الخاصة بالإصدار الحالي تتغير مع التحديثات، فراجع اللعبة نفسها قبل أن تصرف نقاطك.</p>\n"
        f'<div class="cards">{cards}</div>'
    )
    (OUT / "index.html").write_text(
        page("مقالات وأدلة البرو كلبس", "أدلة عربية لاعبي EA FC Pro Clubs: المراكز، أفضل البناءات، التشكيلات، وإدارة النادي.", f"{SITE}/articles/", index_main),
        encoding="utf-8",
    )

    urls = [f"{SITE}/", f"{SITE}/about", f"{SITE}/privacy", f"{SITE}/terms", f"{SITE}/contact", f"{SITE}/articles/"]
    urls += [f'{SITE}/articles/{a["slug"]}' for a in articles]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n"
    (ROOT / "public" / "sitemap.xml").write_text(xml, encoding="utf-8")

    total = sum(a["words"] for a in articles)
    print(f"{len(articles)} articles, {total} words")
    for a in articles:
        print(f'  {a["words"]:5d}  {a["slug"]}')


if __name__ == "__main__":
    main()
