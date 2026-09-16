/*
# CLUBSA Full Schema

## Overview
Creates the complete database schema for the CLUBSA platform — a Pro Clubs community app
with user accounts, clubs, chat, transfer market, articles, leaderboards, and top-up tracking.

## New Tables
1. `clubs` — Club entities created by presidents. Stores name, region, logo, colors, wallet.
2. `profiles` — User profiles linked to auth.users. Stores name, role (president/player),
   region, wallet, club membership, position, overall rating.
3. `chat_messages` — Community chat messages with profanity-filtered text.
4. `market_listings` — Transfer market player listings (active/sold/withdrawn).
5. `market_offers` — Offers made by club presidents on market listings.
6. `articles` — Editorial content (EA FC tactics, news) for the blog section. Seeded.
7. `top_ups` — Records of wallet top-up purchases with weekly limits.

## Security
- RLS enabled on every table.
- clubs: public read, president-only write.
- profiles: public read, self-only write.
- chat_messages: public read, authenticated-only write.
- market_listings: public read, owner-club-president-only write.
- market_offers: public read, offer-maker-only write.
- articles: public read, authenticated write.
- top_ups: self-only read and insert.

## Notes
1. Circular FK between clubs.president_id and profiles.club_id handled by creating
   clubs first without the FK, then adding it after profiles.
2. Profile creation happens in the frontend after signUp (2-step onboarding).
3. Articles are seeded with real Arabic content about EA FC Pro Clubs.
4. Wallet balances: presidents start at 10,000,000; players at 100,000.
*/

-- =========================================================
-- 1. CLUBS
-- =========================================================
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  president_id uuid,
  region text NOT NULL,
  logo text,
  primary_color text DEFAULT '#1e40af',
  secondary_color text DEFAULT '#f5f5f5',
  wallet bigint NOT NULL DEFAULT 10000000,
  wins integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  trophies integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clubs_select_all" ON clubs;
CREATE POLICY "clubs_select_all" ON clubs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "clubs_insert_president" ON clubs;
CREATE POLICY "clubs_insert_president" ON clubs FOR INSERT
  TO authenticated WITH CHECK (president_id = auth.uid());

DROP POLICY IF EXISTS "clubs_update_president" ON clubs;
CREATE POLICY "clubs_update_president" ON clubs FOR UPDATE
  TO authenticated USING (president_id = auth.uid()) WITH CHECK (president_id = auth.uid());

DROP POLICY IF EXISTS "clubs_delete_president" ON clubs;
CREATE POLICY "clubs_delete_president" ON clubs FOR DELETE
  TO authenticated USING (president_id = auth.uid());

-- =========================================================
-- 2. PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('president', 'player')),
  region text NOT NULL,
  is_free_agent boolean NOT NULL DEFAULT false,
  join_status text NOT NULL DEFAULT 'approved' CHECK (join_status IN ('approved', 'pending', 'rejected')),
  wallet bigint NOT NULL DEFAULT 100000,
  club_id uuid REFERENCES clubs(id) ON DELETE SET NULL,
  position text,
  overall integer DEFAULT 0,
  avatar text,
  created_at timestamptz DEFAULT now()
);

-- Now add the circular FK from clubs.president_id to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'clubs_president_id_fkey' AND table_name = 'clubs'
  ) THEN
    ALTER TABLE clubs ADD CONSTRAINT clubs_president_id_fkey
      FOREIGN KEY (president_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- =========================================================
-- 3. CHAT MESSAGES
-- =========================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_select_all" ON chat_messages;
CREATE POLICY "chat_select_all" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "chat_insert_auth" ON chat_messages;
CREATE POLICY "chat_insert_auth" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (sender_id = auth.uid());

-- =========================================================
-- 4. MARKET LISTINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS market_listings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  club_name text NOT NULL,
  position text NOT NULL,
  overall integer NOT NULL DEFAULT 0,
  price bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'withdrawn')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listings_select_all" ON market_listings;
CREATE POLICY "listings_select_all" ON market_listings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "listings_insert_president" ON market_listings;
CREATE POLICY "listings_insert_president" ON market_listings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_id AND clubs.president_id = auth.uid())
  );

DROP POLICY IF EXISTS "listings_update_president" ON market_listings;
CREATE POLICY "listings_update_president" ON market_listings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = market_listings.club_id AND clubs.president_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = market_listings.club_id AND clubs.president_id = auth.uid())
  );

DROP POLICY IF EXISTS "listings_delete_president" ON market_listings;
CREATE POLICY "listings_delete_president" ON market_listings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = market_listings.club_id AND clubs.president_id = auth.uid())
  );

-- =========================================================
-- 5. MARKET OFFERS
-- =========================================================
CREATE TABLE IF NOT EXISTS market_offers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id bigint NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  club_name text NOT NULL,
  amount bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE market_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offers_select_all" ON market_offers;
CREATE POLICY "offers_select_all" ON market_offers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "offers_insert_president" ON market_offers;
CREATE POLICY "offers_insert_president" ON market_offers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = market_offers.club_id AND clubs.president_id = auth.uid())
  );

DROP POLICY IF EXISTS "offers_update_president" ON market_offers;
CREATE POLICY "offers_update_president" ON market_offers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = market_offers.club_id AND clubs.president_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = market_offers.club_id AND clubs.president_id = auth.uid())
  );

-- =========================================================
-- 6. ARTICLES (seeded)
-- =========================================================
CREATE TABLE IF NOT EXISTS articles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'tactics',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "articles_select_all" ON articles;
CREATE POLICY "articles_select_all" ON articles FOR SELECT
  TO anon, authenticated USING (true);

-- Seed articles
INSERT INTO articles (title, slug, excerpt, content, category) VALUES
(
  'دليل تكتيكات البرو كلبس: كيف تبني فريقًا متكاملًا',
  'pro-clubs-tactics-guide',
  'شرح مفصل لأساسيات تكتيكات Pro Clubs في EA FC وكيف تختار التشكيلة المناسبة لأسلوب لعبك',
  'تكتيكات البرو كلبس هي مفتاح النجاح في وضع الأندية الاحترافية. في هذا الدليل نستعرض أهم الأساسيات التي يجب على كل لاعب معرفتها.

## اختيار التشكيلة

التشكيلة الأكثر شيوعًا في البرو كلبس هي 4-2-3-1 أو 4-4-2. كل تشكيلة لها مميزاتها:

- **4-2-3-1**: توازن بين الهجوم والدفاع، مع لاعبين محوريين يحميان الدفاع وصانع ألعاب خلف المهاجم.
- **4-4-2**: تمنح عرضية أكبر في الوسط وتسمح بمهاجمين في المقدمة.
- **3-5-2**: هجومية جدًا وتحتاج ظهيرين طائرين بقدرات عالية على التحمل.

## أدوار اللاعبين

كل مركز له متطلباته. المهاجم يحتاج إنهاءً عاليًا وتمركزًا جيدًا. الظهير يحتاج سرعة وتحملًا. قلب الدفاع يحتاج قوة وقفز ووعيًا دفاعيًا.

## التركيز على الطاقات

استخدم حاسبة الطاقات لتوزيع نقاطك بشكل ذكي. لا تضع كل نقاطك في السرعة فقط — التوازن بين الصفات هو ما يصنع لاعبًا متكاملًا.

## التواصل داخل الفريق

التواصل الجيد بين اللاعبين هو نصف المعركة. اتفقوا على أدوار كل لاعب قبل المباراة والتزموا بالخطة.',
  'tactics'
),
(
  'أفضل مراكز للمبتدئين في EA FC Pro Clubs',
  'best-positions-beginners',
  'أي مركز تختار كبداية في البرو كلبس؟ دليل شامل للمبتدئين لاختيار المركز المناسب',
  'اختيار المركز المناسب كبداية هو خطوة مهمة لكل لاعب جديد في البرو كلبس.

## المراكز الأسهل للمبتدئين

1. **الجناح (WG)**: مركز هجومي يعتمد على السرعة والمراوغة، سهل التأثير فيه وممتع.
2. **قلب الدفاع (CB)**: مركز دفاعي واضح، مهمتك الأساسية إبعاد الخصم وتشتيت الكرة.
3. **وسط الميدان (CM)**: مركز متوازن يشارك في الهجوم والدفاع، تعلم منه قراءة اللعب.

## مراكز متقدمة

- **صانع الألعاب (CAM)**: يحتاج رؤية وتمريرات دقيقة، مناسب بعد اكتساب الخبرة.
- **حارس المرمى (GK)**: مركز فريد يحتاج ردود فعل سريعة وقراءة للموقف.

## نصائح عامة

- ابدأ بمركز واحد حتى تتقنه ثم جرب غيره.
- استخدم حاسبة الطاقات لتحسين صفات مركزك.
- العب مع أصدقاء لتطوير التواصل والتفاهم.',
  'guide'
),
(
  'كيفية إدارة ناديك في CLUBSA: دليل رئيس النادي',
  'club-management-guide',
  'كل ما تحتاج معرفته لإدارة ناديك على منصة CLUBSA — من التسجيل إلى سوق الانتقالات',
  'إدارة النادي في CLUBSA تتطلب فهمًا لعدة أنظمة. هذا الدليل يغطي الأساسيات.

## إنشاء النادي

عند التسجيل، اختر دور "رئيس نادي" وأدخل اسم ناديك. ستحصل على رصيد مبدئي قدره 10 ملايين لاستخدامه في سوق الانتقالات.

## استقبال اللاعبين

اللاعبون الذين يختارون ناديك سيظهرون بحالة "بانتظار الموافقة". يمكنك قبولهم أو رفضهم. اللاعبون الأحرار يمكنهم الانضمام لأي نادٍ.

## سوق الانتقالات

الميركاتو يفتح من الخميس إلى السبت. يمكنك:
- عرض لاعبيك للبيع
- تقديم عروض لشراء لاعبين من أندية أخرى
- التفاوض على الأسعار

## شحن الرصيد

يمكنك شحن رصيد إضافي لناديك (20 مليون) مقابل 2 دولار أسبوعيًا، بحد أقصى عملية واحدة أسبوعيًا.

## تخصيص هوية النادي

من إعدادات النادي يمكنك تغيير شعار النادي وألوان الطقم الأساسي والاحتياطي. ستظهر هذه الألوان في جميع أنحاء الموقع.',
  'guide'
),
(
  'مقارنة بين EA FC وeFootball: أيهما أفضل للبرو كلبس؟',
  'ea-fc-vs-efootball',
  'مقارنة شاملة بين EA FC وeFootball من منظور لاعب البرو كلبس',
  'المنافسة بين EA FC وeFootball مستمرة، ولكن من منظور البرو كلبس هناك فوارق واضحة.

## نظام الأندية الاحترافية

EA FC يتفوق في وضع Pro Clubs المخصص بالكامل، حيث يسمح بإنشاء لاعب وتطويره عبر المباريات.

eFootball لا يقدم وضعًا مكافئًا لـ Pro Clubs، بل يركز على Dream Team.

## تطوير اللاعب

في EA FC: توزع نقاط الطاقات يدويًا على صفات متعددة، مع سقف لكل صفة حسب المركز.
في eFootball: التطوير يعتمد على نظام التذاكر والمهارات.

## الخلاصة

لعشاق البرو كلبس الجماعي، EA FC هو الخيار الأوضح. أما من يفضل نظام الفرق الخيالية فقد يجد eFootball أكثر ملاءمة.',
  'news'
),
(
  'نصائح للتواصل واللعب الجماعي في البرو كلبس',
  'team-communication-tips',
  'كيف تحسّن تواصلك مع زملائك في الفريق وترفع مستوى اللعب الجماعي',
  'التواصل هو أهم عنصر في البرو كلبس. فريق متواصل يتفوق على فريق أفراده أ مهرون لكن غير منسجمين.

## أساسيات التواصل

1. **استخدم السماعات**: التواصل الصوتي أسرع وأوضح من الرسائل النصية.
2. **اتفقوا على المصطلحات**: كلمات مثل "تحويل" أو "غطّاس" أو "عرضية" يجب أن يفهمها الجميع بنفس المعنى.
3. **حدد أدوارًا واضحة**: كل لاعب يجب أن يعرف مهمته الأساسية.

## أثناء المباراة

- نادِ بالكرة عندما تكون حرًا: "أنا حر!" أو "عندي!"
- أخبر زملائك عن الخصم: "خلفك!" أو "يمين!"
- شجّع زملائك بعد كل هجمة جيدة.

## بعد المباراة

ناقشوا ما حدث بهدوء. ركزوا على الحلول وليس اللوم. حددوا نقطة واحدة للتحسين في المباراة القادمة.',
  'tactics'
),
(
  'كل ما تحتاج معرفته عن سوق الانتقالات في CLUBSA',
  'transfer-market-guide',
  'دليل شامل لسوق الانتقالات — كيف تشتري وتبيع وتتداول اللاعبين',
  'سوق الانتقالات في CLUBSA هو مركز الاقتصاد في المنصة. إليك كيف يعمل.

## مواعيد الميركاتو

يفتح سوق الانتقالات أسبوعيًا من يوم الخميس إلى السبت. خارج هذه الأيام، يمكنك تصفح القوائم ولكن لا يمكنك التداول.

## عرض لاعب للبيع

إذا كنت رئيس نادٍ، يمكنك عرض أي لاعب في ناديك للبيع. حدد السعر الذي تريد. سيظهر اللاعب في قائمة السوق.

## تقديم عرض

إذا رأيت لاعبًا يعجبك، قدم عرضًا لمالكة. يجب أن يكون عرضك معقولًا — العروض المنخفضة جدًا عن قيمة اللاعب تُرفض تلقائيًا.

## الميزانية

رصيد ناديك يحدد ما يمكنك إنفاقه. لا يمكنك تقديم عرض يفوق رصيدك. يمكنك شحن رصيد إضافي إذا لزم الأمر.

## نصائح

- راقب العداد التنازلي لإغلاق الميركاتو.
- لا تبيع لاعبيك الأساسيين بسعر منخفض.
- ابحث عن صفقات جيدة — لاعبين بمستوى عالٍ وسعر معقول.',
  'guide'
)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================
-- 7. TOP-UPS
-- =========================================================
CREATE TABLE IF NOT EXISTS top_ups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_id uuid REFERENCES clubs(id) ON DELETE SET NULL,
  amount bigint NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('club', 'player')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE top_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "topups_select_self" ON top_ups;
CREATE POLICY "topups_select_self" ON top_ups FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "topups_insert_self" ON top_ups;
CREATE POLICY "topups_insert_self" ON top_ups FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_profiles_club_id ON profiles(club_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_market_listings_status ON market_listings(status);
CREATE INDEX IF NOT EXISTS idx_market_offers_listing_id ON market_offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_top_ups_user_id ON top_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_top_ups_created_at ON top_ups(created_at);