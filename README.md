# عروش العصور / Arush Al-Usur

استراتيجية مملكة أونلاين عبر العصور — **Soft Launch (Phase 2)** على Unity (URP).

Online kingdom strategy across ages — **Soft Launch (Phase 2)** on Unity (URP).

| | |
|---|---|
| **المستودع / Repo** | https://github.com/muhammadkh97/arush-al-usur |
| **المحرك / Engine** | Unity **6** (مفضّل) أو Unity **2022.3 LTS** + URP |
| **العميل / Client** | `client/` |
| **جداول اللعب / Data** | `data/*.json` → يُزامَن إلى `client/Assets/_Project/StreamingAssets/Tables/` |

---

## فتح المشروع في Unity / Open in Unity

### العربية

1. ثبّت [Unity Hub](https://unity.com/download) ثم Unity **6** (أو **2022.3 LTS**) مع وحدة **Universal RP** ودعم **Android** (و iOS على macOS).
2. انسخ المستودع:
   ```bash
   git clone https://github.com/muhammadkh97/arush-al-usur.git
   cd arush-al-usur
   ```
3. في Unity Hub → **Open** → اختر مجلد `client/` (ليس جذر الريبو).
4. عند أول فتح: دع Package Manager يسترجع الحزم من `Packages/manifest.json`. إن اختلف إصدار المحرر، اقبل ترقية/توافق الحزم بحذر.
5. تأكد أن جداول JSON موجودة تحت:
   - `client/Assets/_Project/StreamingAssets/Tables/`
   - المصدر المشترك: `data/` في جذر الريبو
6. أنشئ مشاهد Soft Launch تحت `Assets/_Project/Scenes/` (Boot, MainMenu, City, WorldMap, AllianceFortress, …) — المجلدات جاهزة؛ ملفات `.unity` تُنشأ من المحرر.
7. Color Space: **Linear**. قالب الهدف: **3D (URP)**.

### English

1. Install Unity Hub, then Unity **6** (preferred) or **2022.3 LTS** with **URP** and **Android** Build Support.
2. Clone this repository and open the **`client/`** folder in Unity Hub (not the repo root).
3. Let packages resolve from `Packages/manifest.json`.
4. Runtime tables live in `Assets/_Project/StreamingAssets/Tables/` (copied from root `data/`).
5. Create scenes under `Assets/_Project/Scenes/` in the Editor; folder skeleton is already present.
6. Use **Linear** color space and a **3D URP** pipeline.

---

## هيكل المجلدات / Layout

```
arush-al-usur/
├── client/                 # Unity project
│   ├── Assets/_Project/
│   │   ├── Art/ …
│   │   ├── Prefabs/ …
│   │   ├── Scenes/ …
│   │   ├── Scripts/ …      # ArushAlUsur.* namespaces
│   │   ├── StreamingAssets/Tables/   # ★ JSON at runtime
│   │   └── Resources/Tables/
│   ├── Packages/
│   └── ProjectSettings/
├── data/                   # ★ shared truth for balance tables
├── docs/                   # design / Soft Launch docs
├── server/                 # backend TBD
└── README.md
```

---

## مزامنة الجداول / Sync data tables

من جذر الريبو (قبل البناء أو عند تغيير التوازن):

```bash
cp -a data/*.json client/Assets/_Project/StreamingAssets/Tables/
cp -a data/*.json client/Assets/_Project/Resources/Tables/
```

في المحرر لاحقًا: قائمة مقترحة `Tools/Arush/Sync Data Tables` (انظر `Editor/SyncDataTables.cs`).

لا تضع أسرار API داخل StreamingAssets.

---

## وثائق / Docs

انظر `docs/` — خاصة `unity-phase2-bootstrap.md` و `soft-launch-checklist.md` و `project-context.md`.

---

## أمان / Security

لا ترفع keystores أو tokens أو ملفات `.env`. راجع `.gitignore`.
