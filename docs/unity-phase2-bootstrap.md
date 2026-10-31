# Unity Phase 2 Bootstrap — عروش العصور

| الحقل | القيمة |
|---|---|
| الغرض | تهيئة مستودع Unity فارغ + هيكل مشروع Soft Launch (Phase 2) |
| المحرك | **Unity 6** مفضّل؛ بديل مقبول **Unity 2022 LTS** + **URP** |
| اسم المستودع المقترح | `arush-al-usur` |
| الحالة | وثائق + أوامر — **لا دفع** إلى أي مستودع غير مرتبط |
| مراجع | `project-context.md`, `improvement-plan-six-pillars.md`, `season-one.md`, `phase1-implementation-plan.md`, `prototype/js/castle3d.js`, `data/*` |

---

## 0. تنبيه أمني للمستودع / Repo safety

- أنشئ مستودعًا **جديدًا وفارغًا** باسم `arush-al-usur` (أو مشابه واضح).
- **لا تعدّل ولا تدفع** إلى `bawwabtysemifinal` أو أي مشروع GitHub غير مرتبط.
- لا تخلط أصولًا أو تاريخ التزام من ريبو آخر.
- مصدر جداول اللعب الحالي في المتجر: `/cursor/stores/self/data/` — يُنسخ إلى الريبو الجديد بعد الإنشاء.

---

## 1. إنشاء مستودع GitHub فارغ / Create empty private GitHub repo

### 1.1 حالة المصادقة في هذه الجولة (حاجز)

| الفحص | النتيجة |
|---|---|
| `gh auth status` | **غير مسجّل الدخول** — `You are not logged into any GitHub hosts` |
| `GH_TOKEN` / `GITHUB_TOKEN` | **غير معيّنين** |
| إنشاء `arush-al-usur` من الوكيل | **لم يُنفَّذ** — محظور بلا مصادقة |

**الحاجز (Blocker):** يلزم المستخدم تشغيل `gh auth login` (أو تزويد الوكيل بـ `GH_TOKEN` بصلاحية `repo`) ثم إعادة طلب إنشاء المستودع. حتى ذلك الحين: نفّذ الأوامر أدناه محليًا.

### 1.2 أوامر المستخدم الدقيقة (مستودع خاص فارغ)

```bash
# 1) تسجيل الدخول (مرة واحدة)
gh auth login
# اختر: GitHub.com → HTTPS → Login with browser → صلاحية repo

# 2) تأكيد الهوية
gh api user --jq .login

# 3) إنشاء مستودع خاص فارغ — بدون README/gitignore/license حتى لا يتعارض clone لاحقًا
gh repo create arush-al-usur \
  --private \
  --description "عروش العصور — Unity Soft Launch (Phase 2)" \
  --clone=false

# 4) إظهار الرابط
gh repo view arush-al-usur --json url,nameWithOwner -q '"\(.nameWithOwner) → \(.url)"'
# مثال متوقع: YOUR_USER/arush-al-usur → https://github.com/YOUR_USER/arush-al-usur
```

بديل عبر الواجهة: GitHub → New repository → الاسم `arush-al-usur` → Private → **لا** تضف README / .gitignore / license → Create.

### 1.3 تهيئة محلية أولى (بعد إنشاء الريبو — على جهاز المطوّر)

```bash
mkdir -p ~/dev/arush-al-usur && cd ~/dev/arush-al-usur
git init
git remote add origin git@github.com:YOUR_USER/arush-al-usur.git
# أو: https://github.com/YOUR_USER/arush-al-usur.git

# انسخ جداول المتجر (من بيئة Cursor Store أو تصدير يدوي)
# مصدر مرجعي: /cursor/stores/self/data/*.json → ./data/

echo "# عروش العصور — Soft Launch" > README.md
printf "Temp/\nLibrary/\nLogs/\nObj/\nBuild/\nBuilds/\n*.csproj\n*.sln\n*.userprefs\n.vs/\n.idea/\n" > .gitignore.unity-snippet
# استخدم قالب Unity الرسمي لـ .gitignore عند فتح المشروع في المحرر

git add README.md data/ .gitignore
git commit -m "chore: bootstrap empty Soft Launch repo + shared data tables"
git branch -M main
git push -u origin main
```

> **رابط المستودع الحقيقي:** *لم يُنشأ في هذه الجولة.* بعد `gh auth login` يُستبدل هذا السطر بالـ URL الفعلي.

---

## 2. إعداد مشروع Unity (URP) / Unity 6 · 2022 LTS URP

### 2.1 إنشاء المشروع

1. Unity Hub → New project.
2. القالب: **3D (URP)** — Unity **6** إن توفّر؛ وإلا **2022.3 LTS** + Universal RP.
3. اسم المجلد المحلي: `client` داخل `arush-al-usur/` (يطابق خطة Phase 1).
4. فعّل: Android Build Support (+ iOS على macOS).
5. Color Space: **Linear**؛ HDR اختياري معتدل على الموبايل.

### 2.2 هيكل المجلدات (مرآة البيانات + توسيع Soft Launch)

```
arush-al-usur/
├── client/                              # مشروع Unity
│   ├── Assets/
│   │   └── _Project/
│   │       ├── Art/
│   │       │   ├── Cities/              # Prefabs مدينة + قبة القصر
│   │       │   ├── Units/
│   │       │   ├── Heroes/
│   │       │   ├── Map/                 # قلاع عالم، حقول، وحوش
│   │       │   ├── AllianceFortress/    # ★ Soft Launch — قلعة التحالف
│   │       │   └── UI/                  # HUD معدني RTL
│   │       ├── Prefabs/
│   │       │   ├── City/
│   │       │   ├── Map/
│   │       │   ├── UI/
│   │       │   ├── Heroes/
│   │       │   └── Alliance/
│   │       ├── Scenes/
│   │       │   ├── Boot.unity
│   │       │   ├── MainMenu.unity
│   │       │   ├── CharacterCreate.unity
│   │       │   ├── City.unity
│   │       │   ├── WorldMap.unity
│   │       │   ├── AllianceFortress.unity   # ★ Phase 2
│   │       │   └── DevSandbox.unity
│   │       ├── Scripts/
│   │       │   ├── Core/
│   │       │   ├── Auth/
│   │       │   ├── City/
│   │       │   ├── Economy/
│   │       │   ├── Army/
│   │       │   ├── March/
│   │       │   ├── Combat/
│   │       │   ├── Hero/
│   │       │   ├── Alliance/            # + Fortress, Treasury, Siege hooks
│   │       │   ├── Map/
│   │       │   ├── Season/              # استعداد الموسم 1 (هياكل)
│   │       │   ├── Shop/                # متجر تجميل/ماس — Soft
│   │       │   ├── UI/                  # LocaleRtlBootstrap, HUD
│   │       │   ├── Net/
│   │       │   ├── Data/                # JsonTableLoader
│   │       │   └── Analytics/
│   │       ├── ScriptableObjects/
│   │       ├── Resources/
│   │       │   ├── i18n/                # ar.json (+ en stubs)
│   │       │   └── Tables/              # نسخة Streaming/Resources من JSON
│   │       ├── StreamingAssets/Tables/  # مسار الاستيراد المفضّل للجداول
│   │       └── Settings/                # URP Asset + Renderer
│   ├── Packages/
│   └── ProjectSettings/
├── server/                              # خلفية تطوير (تُختار اللغة عند البدء)
├── data/                                # ★ مصدر الحقيقة للجداول المشتركة
│   ├── buildings_l1-5.json
│   ├── units_slice.json
│   ├── heroes_launch.json
│   ├── factions.json
│   ├── combat_constants_slice.json
│   ├── npc_camps.json
│   ├── warehouse_protection.json
│   ├── stamina.json
│   ├── quests_daily_slice.json
│   ├── alliance_slice.json
│   ├── world_map_slice.json
│   ├── monsters.json                    # يُنشأ عند M-F / Soft
│   └── resource_fields.json             # يُنشأ عند M-C / Soft
└── docs/                                # اختياري: نسخ روابط وثائق المتجر
```

### 2.3 ملاحظات سقالة / Scaffold notes

| البند | التوجيه |
|---|---|
| Namespace | `ArushAlUsur.*` (Core, City, Alliance, …) |
| DI | Service locator بسيط في Boot كافٍ لـ Soft Launch |
| RTL | `LocaleRtlBootstrap` في أول إطار — `layout = RTL` لكل Canvas |
| بيانات | لا تُكتب أرقام اقتصاد داخل C# ثابت؛ دائمًا من JSON/SO مولَّد |
| فن | أصول أصلية فقط — مرجع المظهر: `media/refs/target-castle-quality.jpg` |
| Fallback | لا تعتمد SVG كقبول؛ هدف Unity = Prefabs URP ثلاثية الأبعاد |

---

## 3. كاميرا وإضاءة مطابقة لـ Three.js / Camera & lighting parity

المصدر المرجعي: `prototype/js/castle3d.js` (مشهد القلعة المقبول).

### 3.1 الكاميرا

| Three.js | قيمة | Unity URP المكافئ |
|---|---|---|
| نوع | `PerspectiveCamera` fov **36** | Camera FOV **36°** |
| موضع ابتدائي | `(16, 14.5, 16)` | نفس الإحداثيات المحلية حول مركز المدينة |
| هدف النظر | `(0, 1.2, 0)` ثم controls target `(0, 0.6, 0)` | Cinemachine / orbit pivot عند `(0, 0.6, 0)` |
| ميل مسموح | polar ≈ **39.6°–75.6°** من المحور Y (`minPolar 0.22π` … `maxPolar 0.42π`) | قيّد Pitch بحيث يبقى ايزومتري ≈ **35–45°** ميل بصري |
| مسافة | min **12** / max **32** | Orbit radius clamp 12–32 (وحدة المشهد CELL≈3.2) |
| تخميد | damping 0.08 | inertia خفيفة على اللمس |
| بان/دوران/تكبير | pan 0.6 · rotate 0.55 · zoom 0.7 | حساسيات لمس مكافئة على الموبايل |

### 3.2 الإضاءة (ساعة ذهبية)

| المصدر | Three.js | Unity |
|---|---|---|
| خلفية/ضباب | bg `#c4784a` · Fog near 28 / far 55 | Sky/ambient دافئ + Fog بنفس المدى النسبي |
| Hemisphere | sky `#b8d0e8` · ground `#8a6238` · **0.55** | Mixed/Ambient أو HemisphereLight بنفس النسبة |
| شمس Directional | اللون `#ffd090` · intensity **1.65** · pos `(-12, 14, 6)` | Directional Light دافئة؛ Soft Shadows |
| ظل الشمس | map **1024** · ortho ±18 · bias **-0.0008** | Shadow Resolution 1024 على الموبايل؛ bias معتدل |
| Fill بارد | `#88aacc` · **0.35** · pos `(8, 6, -10)` | Directional ثانوي بلا ظل أو ظل خفيف جدًا |
| Tone mapping | ACES · exposure **1.15** | URP Color Adjustments / Tonemapping ACES قريب |
| ظل الأرض | PCF soft | URP Soft Shadows؛ Intensity معتدلة |

هدف الأداء: **≥ 30 fps** على جهاز متوسط بمشهد القلعة الكامل (عقد الجودة في خطة الركائز).

### 3.3 تخطيط المدينة

- انقل `castleInteriorLayout` من `world_map_slice.json` إلى مولّد شبكة Unity (`CityGrid`).
- `CELL` المرجعي في Three ≈ **3.2** وحدات عالم؛ حافظ على نسب القصر (scale ≈ 1.35) كعنصر بطولي مركزي.
- اختيار المبنى: Physics Raycast / mesh collider — مقابل raycast Three.

---

## 4. مسار استيراد جداول JSON / JSON import path

### 4.1 مصدر الحقيقة

```
/cursor/stores/self/data/*.json   →   arush-al-usur/data/*.json
```

عند البناء أو Play Mode:

```
data/*.json  →  نسخ/مزامنة  →  client/Assets/_Project/StreamingAssets/Tables/
```

### 4.2 محمّل مقترح

1. `JsonTableLoader` يقرأ من `Application.streamingAssetsPath + "/Tables/"`.
2. على Android استخدم `UnityWebRequest` لملفات StreamingAssets إن لزم.
3. اختياري: أداة Editor `Tools/Arush/Sync Data Tables` تنسخ من `../../data` إلى StreamingAssets قبل البناء.
4. ScriptableObjects تُولَّد من JSON للتعديل في المحرر، لكن **الأرقام الحية** تبقى من الجداول المشتركة (سيرفر + عميل).

### 4.3 ملفات Phase 1 الموجودة → Soft Launch

| الملف | Phase 1 | Soft Launch |
|---|---|---|
| `buildings_l1-5.json` | نعم | توسيع قصر >5 + إسطبل/ورشة/سوق حسب GDD |
| `units_slice.json` | L1 (+صقل L2) | فرسان/حصار + مستويات |
| `heroes_launch.json` | 3 أبطال | تجهيز/يقظة ضمن سقف 25٪ |
| `alliance_slice.json` | أساسي | قلعة، خزينة، حصار |
| `world_map_slice.json` | شريحة | أقاليم + عروش (هياكل) |
| `monsters.json` / `resource_fields.json` | يُنشآن | مطلوبان لـ Soft كامل |

لا تضع أسرار API داخل StreamingAssets.

---

## 5. قائمة تحقق بناء الموبايل / Mobile build checklist

### 5.1 عام

- [ ] URP Asset مخصّص للموبايل (أقل Realtime Lights؛ Soft Shadows قابلة للإطفاء من Quality).
- [ ] Texture compression: ASTC (Android) / ASTC أو PVRTC حسب الهدف.
- [ ] IL2CPP + ARM64 لـ Android و iOS.
- [ ] Managed Stripping Level: Medium مع الحفاظ على JSON serializers.
- [ ] Orientation: Portrait أساسي للHUD؛ اختبار Landscape لا يكسر RTL.
- [ ] أهداف لمس ≥ 44px لكل عنصر تفاعلي.
- [ ] Frame budget: مدينة ≥30 fps؛ عالم عند عقد الشريحة ≥30 fps.

### 5.2 Android

- [ ] Minimum API حسب سياسة المتجر الحالية (وثّق في README المشروع).
- [ ] Internet + إشعارات لاحقًا؛ لا صلاحيات زائدة في Soft.
- [ ] Keystore توقيع داخلي للـ Soft (ليس production store إن كان اختبار مغلق).
- [ ] App Bundle (AAB) لمسار متجر؛ APK داخلي للاختبار اليومي.
- [ ] اختبار على جهاز حقيقي متوسط + جهاز ضعيف واحد.

### 5.3 iOS

- [ ] Signing Team + Bundle ID جديد خاص بـ عروش العصور (لا تعيد استخدام معرف مشروع آخر).
- [ ] Bitcode off حسب إعدادات Unity الحالية؛ Architectures ARM64.
- [ ] اختبار RTL في UIKit/TextMeshPro مع خطوط عربية مضمّنة (مثل Cairo إن رُخّص).

### 5.4 جودة بصرية قبل رفع Soft

- [ ] لقطة مدينة = عمق + ساعة ذهبية + ظل (شريط 3D).
- [ ] لقطة عالم = قلاع mesh وليست علامات مسطّحة فقط.
- [ ] لا IP منافس؛ فن أصلي فقط.

---

## 6. معالم Soft Launch من الركائز + الموسم / Milestone list

مستمدة من `improvement-plan-six-pillars.md` §8.2 و `season-one.md` + `project-context.md`.

### 6.1 مسار Unity (U1→U5)

| معلم | المحتوى | شرط قبول 3D |
|---|---|---|
| **U1** | مشروع URP؛ استيراد `data/`؛ مدينة 3D (Prefabs) وفق M-A | قلعة بظل وساعة ذهبية |
| **U2** | وحدات + تقرير قتال؛ نماذج وحدات (M-B) | معاينة وحدة لكل فئة شريحة |
| **U3** | خريطة استراتيجية 3D: قلاع/حقول/وحوش (M-C/D/F) | mesh/LOD لا أيقونات مسطّحة وحدها |
| **U4** | أبطال 3D + سقف 25٪ سيرفر؛ تحالف أساسي مكتمل | نموذج بطل في الشاشة |
| **U5** | **Soft Launch:** إسطبل، حصار، **قلعة تحالف**، سوق، متجر تجميل/ماس، استعداد الموسم | نفس شريط جودة 3D |

### 6.2 صقل المتصفح السابق (مرجع اكتمال بصري)

الترتيب المرجعي إن لزم إغلاق فجوات قبل/أثناء U1: **M-A → M-B → M-C → M-D → M-E → M-F** (كل معلم بلا ترقية 3D مرئية = مرفوض).

### 6.3 معالم منتج Soft Launch (قبل الموسم 1)

| # | المعلم | مصدر الإلزام |
|---:|---|---|
| S1 | قلعة تحالف: تجمّع + خزينة + ترقية + ربط حصار العروش | `season-one.md` §5.4 · `project-context` قرار 3 |
| S2 | اقتصاد Soft: قصر يتجاوز شريحة 5؛ إنتاج/مستودع/سوق أساسي | GDD + جداول الاقتصاد |
| S3 | جيش Soft: فرسان/حصار (بيانات+تدريب) ضمن مباني الإسطبل/الورشة | الركيزة 2 · U5 |
| S4 | أقاليم خريطة + سيطرة واحات/حصون (هياكل الموسم) | `season-one` أسابيع 1–2 |
| S5 | متجر: تجميل + ماس + تسريع معتدل؛ **بدون** بيع قوة تحسم العروش | `project-context` §4 |
| S6 | RTL عربي كامل على كل شاشات Soft؛ مفاتيح EN معمارية | قرار لغة |
| S7 | تحليلات: أحداث Soft + hooks لـ `season_pass_claim` / `throne_contribute` | `project-context` §3 |
| S8 | جاهزية تشغيل نوافذ AST؛ إشعار قبل العرش بـ 30 د لاحقًا | `season-one` |
| S9 | مراجعة ثقافية أسماء الأبطال قبل تسويق Soft | قرار 5 |
| S10 | **لا يبدأ الموسم 1** قبل S1 (قلعة التحالف) | موسم §5.4 |

تفاصيل القبول القابلة للتعليم: انظر `docs/soft-launch-checklist.md`.

---

## 7. ما لا يُفعل في هذه التهيئة

- لا دفع إلى ريبو غير `arush-al-usur` (بعد إنشائه).
- لا دمج تاريخ `bawwabtysemifinal`.
- لا إطلاق الموسم 1 أو KVK.
- لا متجر يبيع وحدات حصرية أو يكسر سقف البطل 25٪.

---

## 8. سجل الوثيقة

| التاريخ | التغيير |
|---|---|
| 2026-10-31 | إنشاء Bootstrap Phase 2؛ توثيق حاجز `gh auth`؛ هيكل URP؛ كاميرا/إضاءة من `castle3d.js`؛ معالم U1–U5 + Soft |
