from collections import Counter  # لعدّ تكرار الكلمات المفتاحية

from app.services import home_service  # جلب الموضوع وأوراقه المحفوظة من قاعدة البيانات

MIN_PAPERS = 3  # أقل عدد أوراق لبناء مسار (ورقة لكل خطوة على الأقل)
PAPERS_PER_STEP = 2  # عدد الأوراق في كل خطوة
MAX_NEXT_TOPICS = 3  # عدد المواضيع المقترحة بعد انتهاء المسار
DEFAULT_FIELD = "Physics and Astronomy"  # المجال الافتراضي إذا لم تحدده OpenAlex

# الخطوات الثلاث للمسار: المستوى، العنوان، وسبب القراءة ({years} تُستبدل بالسنوات)
STAGES = (
    (1, "Where it started",
     "The most-cited early papers ({years}). Later work builds on these ideas, so start here."),
    (2, "How it developed",
     "Papers from {years} that tested and extended the first ideas."),
    (3, "Where it is now",
     "The newest research ({years}). Read these once the earlier steps make sense."),
)


def year_range(papers):
    # نص السنوات مثل "1972–1998"، أو سنة واحدة إذا كانت كل الأوراق من نفس السنة
    first, last = papers[0]["year"], papers[-1]["year"]
    return str(first) if first == last else f"{first}–{last}"


def split_in_three(papers):
    # تقسيم الأوراق (المرتبة من الأقدم للأحدث) إلى ثلاثة أجزاء متقاربة الحجم
    count = len(papers)
    return [papers[index * count // 3:(index + 1) * count // 3] for index in range(3)]


def most_cited(papers):
    # ترتيب الأوراق من الأكثر استشهاداً إلى الأقل (والأقدم أولاً عند التساوي)
    return sorted(papers, key=lambda paper: (-(paper["cited_by_count"] or 0), paper["year"], paper["id"]))


def to_path_paper(paper):
    # بيانات الورقة كما تحتاجها الواجهة
    return {"id": str(paper["id"]), "title": paper["title"], "year": paper["year"]}


def main_field(papers):
    # المجال الأكثر تكراراً بين الأوراق (من OpenAlex)
    fields = Counter(paper["topic"] for paper in papers if paper.get("topic"))
    return fields.most_common(1)[0][0] if fields else DEFAULT_FIELD


def next_topics(title, papers):
    # المواضيع التالية المقترحة: أكثر الكلمات المفتاحية تكراراً في أوراق هذا الموضوع
    counts = Counter()  # عدد مرات ظهور كل كلمة
    spelling = {}  # أول طريقة كتابة رأيناها لكل كلمة

    for paper in papers:
        for keyword in paper.get("keywords") or []:
            key = keyword.strip().lower()
            if not key or key == title.strip().lower():
                continue  # تجاهل الكلمات الفارغة واسم الموضوع نفسه
            counts[key] += 1
            spelling.setdefault(key, keyword.strip())

    return [
        {
            "name": spelling[key],
            "level": 2,
            "why": f"Comes up in {count} of the papers on {title}.",
        }
        for key, count in counts.most_common(MAX_NEXT_TOPICS)
    ]


def build_path(title, papers, overview=None):
    # بناء مسار التعلم من الأوراق الحقيقية للموضوع (بدون أي محتوى مُضاف مسبقاً)
    dated = sorted(
        (paper for paper in papers if paper.get("year")),  # فقط الأوراق التي لها سنة نشر
        key=lambda paper: (paper["year"], paper["id"]),  # من الأقدم إلى الأحدث
    )
    if len(dated) < MIN_PAPERS:
        return None  # الأوراق غير كافية لبناء ثلاث خطوات

    steps = []
    for (level, step_title, why), chunk in zip(STAGES, split_in_three(dated)):
        chosen = most_cited(chunk)[:PAPERS_PER_STEP]  # أهم ورقتين في هذه الفترة
        steps.append({
            "title": step_title,
            "query": title,  # زر "Explore" يبحث عن الموضوع نفسه
            "level": level,
            "why": why.format(years=year_range(chunk)),
            "papers": [to_path_paper(paper) for paper in chosen],
        })

    start = most_cited(split_in_three(dated)[0])[0]  # أكثر ورقة مبكرة استشهاداً: نقطة البداية
    cited = start["cited_by_count"]

    return {
        "topic": title,
        "field": main_field(dated),
        # نستخدم ملخص الذكاء الاصطناعي إن وُجد، وإلا جملة تصف الأوراق
        "intro": overview or (
            f"{len(dated)} papers on {title}, from {year_range(dated)}, "
            "found through searches on AstroThread."
        ),
        "why": (
            f"This path follows {title} from its most-cited early papers to the newest "
            "research, in three steps."
        ),
        "startPaperId": str(start["id"]),
        "startWhy": (
            f"The most-cited early paper on {title} ({start['year']}), cited {cited} times."
            if cited else f"One of the earliest papers on {title} ({start['year']})."
        ),
        "steps": steps,
        "next": next_topics(title, dated),
    }


def get_path(cur, slug):
    # جلب الموضوع وأوراقه من قاعدة البيانات ثم بناء المسار (None إذا لم يُبحث عنه بعد)
    topic = home_service.find_topic(cur, slug)
    if topic is None:
        return None

    papers = home_service.get_topic_papers(cur, topic["id"])  # أوراق آخر بحث عن هذا الموضوع
    overview = home_service.get_overview(cur, slug)  # ملخص الموضوع إن كتبه الذكاء الاصطناعي
    return build_path(topic["title"], papers, overview["overview"] if overview else None)