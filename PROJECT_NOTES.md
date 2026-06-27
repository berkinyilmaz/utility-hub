# Day 30 — Utility Hub

30 günde 30 proje serisinin **son** günü ve final projesi. Önceki 29 günde yapılan mini uygulamaları tek bir merkezi keşif sayfasında toplayan bir hub.

---

## Konsept

Video script'inin söylediği şey: *"30 useful web apps in 30 days — because tools are better together. One place. Everything you need, one link."* Bu projenin tamamı bu lafı somutlaştırıyor:

- Kullanıcı tek URL'i bookmark'lar
- İhtiyaç anında hub'a girip aradığı aracı bulur
- "Open" deyince Vercel'deki uygulamaya, "Repo" deyince GitHub'a gider
- Aslında Day 30 olunca **toplam 30 araç** oluyor — bu hub'ın kendisi 30. (önceki 29 + bu)

---

## Tasarım Dili (seri ile birebir)

`timestamp-converter` ve `nickname-generator` ile yan yana yakıştırıldı:

- **Dark-first** zemin `#0a0a0c` + üstte hafif radial gradient
- **Tek aksan rengi** indigo `#6366f1` — primary CTA, focus, hero başlığın gradyanı
- **Glass header** — sticky, `backdrop-blur(14px)` + saturate
- **Kategori hue'ları** — her kategori badge'i kendi pastel tonunda (image: yeşil, pdf: kırmızı, text: mavi vs.), ama sadece badge boyutunda — aksan rengi olarak indigo kalıyor
- **Kartlar** — 20px radius, hover'da `translateY(-2px)` + accent glow (radial gradient ::before)
- **CTA** pill primary + ghost ikincil
- **Inline SVG ikonlar** — stroke 1.6, lucide tarzı

---

## Stack

| Katman | Seçim |
|---|---|
| Framework | React 19 + Vite 5 |
| Dil | JavaScript (.jsx) |
| Styling | Pure CSS + CSS custom properties |
| State | `useState` + `useMemo` (filter/search) |
| Persistence | yok (statik directory) |
| Font | Inter (400/500/600/700) |
| İkonlar | Inline SVG |

---

## Veri Modeli

`src/projects.js` — tek dizi, 30 öğe. Her proje:

```js
{
  id: 'bg-remover',
  day: 1,
  name: 'Background Remover',
  blurb: '1-2 cümle değer önerisi',
  category: 'image',
  demo: 'https://...vercel.app',
  repo: 'https://github.com/berkinyilmaz/...',
}
```

Kategoriler (`CATEGORIES`):
- **image** (5) — BG Remover, Image Compressor, Image Converter, Color Palette Extractor, Color Harmony
- **pdf** (4) — PDF Merger, PDF Splitter, Shrink (PDF Compressor), Text → PDF
- **text** (4) — JSON Formatter, Markdown Preview, Text Cleaner, Text → Image
- **generator** (5) — Password, QR, Nickname, Random Data, Internet Persona
- **time** (3) — Timestamp Converter, Timezone Converter, Time Waste Calculator
- **productivity** (6) — Habit Tracker, Mini Life Dashboard, Second Brain, Subscription Calculator, Decision Maker, Pomodoro Timer
- **web** (3) — Bio Page, Link Preview, URL Shortener

> Toplam: **30** (bu hub dahil).

---

## Mimari Notlar

### Dosya yapısı
```
utility-hub/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── PROJECT_NOTES.md ← bu dosya
└── src/
    ├── main.jsx
    ├── App.jsx        (header + hero + toolbar + grid + 12 inline SVG icon)
    ├── projects.js    (30 proje meta verisi + CATEGORIES)
    └── styles.css     (design tokens + komponent stilleri)
```

### Filter mantığı
- Tek `useMemo` — `query` ve `activeCategory` değiştikçe yeniden hesaplanır
- Search alanı: `name + blurb + category + day` üzerinde case-insensitive `includes`
- Boş query + "all" kategorisi tüm 30 projeyi döner
- Boş sonuç için minimal empty state

### Veri tablosu (URL eşleştirmesi)
README'lerden alınan canonical URL'ler + `gh repo list berkinyilmaz` çıktısı birleştirilerek doğrulandı:

| Klasör | Repo | Live URL |
|---|---|---|
| BG Remover | bg-remover | bg-remover-wheat-eight |
| Image-Compressor | Image-Compressor | image-compressor-zeta-drab |
| image-converter | image-converter | image-converter-zeta-woad |
| color-palette-extractor | color-palette-extractor | color-palette-extractor-eight |
| color-harmony | color-harmony | color-harmony-five |
| pdf-merger | PDF-Merger | pdf-merger-psi-beryl |
| pdf-splitter | pdf-splitter | pdf-splitter-iota |
| shrink | pdf-compressor | pdf-compressor-nine |
| text-to-pdf | text-to-pdf | text-to-pdf-one |
| json-formatter | json-formatter | json-formatter-amber |
| markdown-preview | markdown-preview | markdown-preview-taupe |
| text-cleaner | text-cleaner | text-cleaner-orpin |
| text-to-image | text-to-img | text-to-img-theta |
| password-generator | password-generator | password-generator-seven-zeta |
| qr-generator | qr-generator | qrgenerator-liard |
| nickname-generator | nickname-generator | nickname-generator-kappa |
| random-data-generator | random-data-generator | random-data-generator-gamma |
| internet-persona-generator | internet-persona-generator | internet-persona-generator |
| timestamp-converter | timestamp-converter | timestamp-converter-xi |
| timezone-converter | time-converter | time-converter-eta |
| time-waste-calculator | time-waste-calculator | time-waste-calculator |
| habits | habit-tracker | habits-tracker-app |
| mini-life-dashboard | mini-life-dashboard | mini-life-dashboard |
| second-brain | second-brain | second-brain-three-ashy |
| subscription-calculator | Subscription-Calculator | subscription-calculator-silk |
| decision-maker | decision-maker | decision-maker-seven-phi |
| bio-page | bio-page | bio-page-hazel |
| link-preview | link-preview | link-preview-weld-phi |
| url-shortener | url-shortener | url-shortener-lyart-sigma |
| pomodoro-app | pomodoro-app | pomodoro-app-fawn-theta |

> Ek bonus: `pomodoro-app` (Day 30 olarak hub'a sonradan eklendi — "30 tools" iddiasını gerçek 30 yapmak için).

### Erişilebilirlik
- Search input ve clear butonunda `aria-label`
- Kategori chip'lerinde `role="tab"` + `aria-selected`
- Kart linkleri `aria-label` ile uygulama adını söyler
- `:focus-visible` indigo ring tüm interaktif elementlerde
- Klavye ile tam navigasyon mümkün

---

## UI Yapısı

- **Header** (glass, sticky) — logo mark + başlık + Instagram & GitHub butonları
- **Hero** — gradyanlı başlık ("Everything you need, one link.") + tek paragraf
- **Toolbar** — full-width search + 8 kategori chip (her chip count badge'i ile)
- **Grid** — 3/2/1 kolon, hover'da subtle lift + accent glow
- **Empty state** — sonuç yoksa minimal mesaj
- **Footer** — sade credit satırı

---

## Etkileşim Detayları

- Hover'da kart `translateY(-2px)` + `border-hover` + radial gradient glow (sağ üstten)
- Open butonu → primary indigo pill, hover'da glow ring
- Repo butonu → ghost border, GitHub ikonu
- Tüm dış linkler `target="_blank" rel="noopener noreferrer"`

---

## Responsive Breakpoints

- `> 960px` — 3 kolon
- `720–960px` — 2 kolon
- `< 720px` — header sub gizli, padding küçüldü
- `< 600px` — tek kolon, header butonlarında text gizlenir (sadece ikon)
- `< 420px` — header butonları icon-only square

---

## Tamamlandı / Test

- `npm install` — temiz (61 paket)
- `npm run build` — temiz (~360ms, 9 kB CSS gzip 2.4 kB, 208 kB JS gzip 65 kB)
- `npm run dev` — `localhost:5174` 200 OK (5173 başka projede çalışıyordu)
- Playwright doğrulamaları:
  - 30 kart render
  - `chip.All` count = 30
  - Search "pdf" → 4 kart filtrelendi (PDF Merger, PDF Splitter, Shrink, Text → PDF)
  - Header'da 2 link: Instagram + GitHub
  - Mobile (390×800) viewport'ta tek kolon, ikonlar text'siz
- Tasarım parite: `timestamp-converter` ile renk/spacing/radius birebir

---

## Polish Round (uygulandı)

### Tasarımsal
- **Hero başlık küçültüldü** — `clamp(1.625rem, 3.2vw, 2.25rem)` — mobile'da artık tek satır
- **Kart hover'da accent border** — `border-color: var(--accent-border)` (eski `border-hover` yerine) ve `::before` glow opacity 0.1
- **Empty state SVG + Clear filters CTA** — dashed border + büyütülmüş arama ikonu illustration + primary CTA
- **`prefers-reduced-motion`** desteklendi — animasyon/transition 0.01ms, hover transform: none
- **Featured caption** — Featured mode altında küçük uppercase ipucu

### Logical / Functional
- **GitHub stars** — `https://api.github.com/search/repositories?q=user:berkinyilmaz` tek istek, repoName→stars map. Sarı badge'le kartların sağ üstünde gösteriliyor (`Habit Tracker 22 ★` vs.). **Stale-while-revalidate**: cache anında render edilir, arka planda yine fresh fetch çalışır, yeni veri gelince state ve cache güncellenir. TTL 1 saat — kısa cache + her ziyarette arka plan yenilemesi.
- **Featured / All mode toggle** — Hero altında segmented pill. Featured: Pomodoro + en yüksek starlı 5. Stars yüklenene kadar `FEATURED_FALLBACK` listesi
- **Sort dropdown** — chip satırının sağında. 4 seçenek: Default · **Most Starred** · A → Z · Newest. Most Starred stars verisiyle anında yeniden sıralanır
- **Klavye kısayolları** — `/` ile search'e focus (input dışındayken), `ESC` ile temizleme + blur
- **URL state sync** — `?q=...&c=...&mode=all&sort=stars` — replaceState ile, popstate dinleniyor, paylaşılabilir
- **Surprise me butonu** — search yanında 🎲 ikonu; filtered listeden random kart yeni sekmede açar
- **Recently opened** — localStorage'da son 3, All mode'da chip satırının üstünde pill bant
- **Search match highlight** — `<mark>` ile substring'i indigo aksan dim arka plan + accent renkli boya

### Erişilebilirlik
- `role="tablist" / "tab"` mode toggle, chip ve sort'ta
- `aria-selected`, `aria-label`, `<label htmlFor>` doğrudan eşleşmeli
- `:focus-visible` ring tüm interaktif elementlerde indigo

### Cache Yaklaşımı (stars)
1. Mount: `localStorage.utility-hub:stars-v2` cache okunur → varsa setState (UI hemen hazır)
2. Cache 1 saatten yeni ise fetch skip edilir
3. Aksi halde search API'ye tek GraphQL benzeri istek atılır
4. Cevap geldiğinde setState + localStorage update (yeni cache yazılır)
5. Hata durumunda sessizce başarısız olunur, kart badge'i çıkmaz

> Token'sız anonim search API rate limit'i 10/dakika — tek kullanıcı için yeterli.

---

## Sonraki Adımlar (opsiyonel)

- Vercel pingi ile her aracın uptime durumu (background, cache'li)
- Sort/filter durumunu paylaşılabilir kart preview (OG image generate)
- Featured listenin admin/curation paneli (manuel override)
- Liste / grid toggle (compact list view)
