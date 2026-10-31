# عروش العصور / Arush Al-Usur

استراتيجية مملكة أونلاين عبر العصور — **Phase 1** نموذج متصفح + **Phase 2 Soft Launch** على Unity (URP).

Online kingdom strategy across ages — **Phase 1** browser prototype + **Phase 2 Soft Launch** on Unity (URP).

| | |
|---|---|
| **المستودع / Repo** | https://github.com/muhammadkh97/arush-al-usur |
| **نموذج الويب / Web prototype** | `prototype/` (HTML + Three.js، عربي RTL) |
| **العميل / Unity client** | `client/` — Unity **6** (مفضّل) أو **2022.3 LTS** + URP |
| **جداول اللعب / Data** | `data/*.json` → يُزامَن إلى `client/Assets/_Project/StreamingAssets/Tables/` |
| **وسائط / Media** | `media/` — لقطات، خرائط، مراجع فن |
| **وثائق / Docs** | `docs/` |

---

## تشغيل النموذج المتصفح / Run the web prototype

يحتاج خادم HTTP بسيط لأن الجداول تُحمَّل من `data/` عبر `fetch`:

```bash
git clone https://github.com/muhammadkh97/arush-al-usur.git
cd arush-al-usur
python3 -m http.server 8080
```

ثم افتح: http://localhost:8080/prototype/

لا تفتح `index.html` كـ `file://` — سيفشل تحميل JSON.

التفاصيل: `prototype/README.md`.

---

## فتح المشروع في Unity / Open in Unity

### العربية

1. ثبّت [Unity Hub](https://unity.com/download) ثم Unity **6** (أو **2022.3 LTS**) مع **Universal RP** ودعم **Android** (و iOS على macOS).
2. انسخ المستودع وافتح مجلد **`client/`** في Unity Hub (ليس جذر الريبو).
3. دع Package Manager يسترجع الحزم من `Packages/manifest.json`.
4. جداول JSON تحت `client/Assets/_Project/StreamingAssets/Tables/` (المصدر: `data/`).
5. أنشئ مشاهد Soft Launch تحت `Assets/_Project/Scenes/` من المحرر.
6. Color Space: **Linear**. قالب الهدف: **3D (URP)**.

### English

1. Install Unity Hub, then Unity **6** (preferred) or **2022.3 LTS** with **URP** and **Android** Build Support.
2. Clone this repository and open the **`client/`** folder in Unity Hub (not the repo root).
3. Let packages resolve from `Packages/manifest.json`.
4. Runtime tables live in `Assets/_Project/StreamingAssets/Tables/` (copied from root `data/`).
5. Create scenes under `Assets/_Project/Scenes/` in the Editor.
6. Use **Linear** color space and a **3D URP** pipeline.

---

## هيكل المجلدات / Layout

```
arush-al-usur/
├── prototype/              # Phase 1 browser vertical slice (Three.js)
├── media/                  # screenshots, maps, art refs
├── client/                 # Unity Soft Launch project
│   └── Assets/_Project/
│       ├── Scripts/ …
│       ├── StreamingAssets/Tables/   # ★ JSON at runtime
│       └── Resources/Tables/
├── data/                   # ★ shared balance tables
├── docs/                   # GDD + Soft Launch docs
├── server/                 # backend TBD
└── README.md
```

---

## مزامنة الجداول / Sync data tables

من جذر الريبو:

```bash
cp -a data/*.json client/Assets/_Project/StreamingAssets/Tables/
cp -a data/*.json client/Assets/_Project/Resources/Tables/
```

في المحرر لاحقًا: `Tools/Arush/Sync Data Tables` (`Editor/SyncDataTables.cs`).

لا تضع أسرار API داخل StreamingAssets.

---

## وثائق / Docs

انظر `docs/` — خاصة `gdd-arush-al-usur.md` و `unity-phase2-bootstrap.md` و `soft-launch-checklist.md` و `pillars-16-20-ar-summary.md`.

---

## أمان / Security

لا ترفع keystores أو tokens أو ملفات `.env`. راجع `.gitignore`.
