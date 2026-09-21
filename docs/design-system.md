# Ortak tasarım sistemi — yalnızca açık tema

Tarih: 2026-09-19. Yerelde uygulandı; henüz yayımlanmadı.

## Karar ve kapsam

Üç marka rengi tüm arayüzü tarif etmez. Ana renk, ikincil renk, arka plan ve vurgu
ayrı rollerdir. Bunlara kart/popover yüzeyi, gövde metni, yardımcı yüzey, kenarlık,
input sınırı, klavye odağı ve ortak durum renkleri eşlik eder.

- Tek renk kaynağı: `src/app/globals.css`; Tailwind v4 `@theme inline` eşlemeleri.
- `color-scheme: only light`; koyu palet, platform koyu renk override'ı ve
  `dark:` sınıfları kaldırıldı. İşletim sistemi tercihi koyu tema açmaz.
- Okul bazında mevcut üç marka alanı korunur: primary, secondary, accent.
- **Background ayrı bir token, fakat bu aşamada tüm okullarda ortaktır.**
  Okula özel arka plan kaydetme alanı eklenmedi; UI bunu açıkça gösterir.
- Secondary artık bütün giriş panelini boyamaz; logo alanı/yardımcı marka
  detaylarında kullanılır. Sayfa açık zemin, form bölümü beyaz kalır.
- Okulların mevcut DB renkleri değiştirilmedi. Varsayılan paleti önizle, yalnız
  istemci önizlemesini değiştirir; kalıcı işlem için ayrıca Renkleri kaydet gerekir.
- Status renkleri okul marka ayarlarıyla değişmez. Renk tek başına anlam taşımaz;
  metin, ikon veya açıklama birlikte kullanılır.

## Eski projedeki kaynak

`horizonedu/backend/app/static/css/base_login.css` dosyasının ilk `:root`
bloğundaki light değişkenleri; ana buton için aynı dosyadaki `.btn_horizon`.
Admin, öğretmen, öğrenci ve veli temel HTML şablonları bu CSS'i Bootstrap'ten sonra
yüklüyor. Bootstrap varsayılanlarını değil, uygulamanın özel paletini aldık.
Legacy dosyalar yalnız okundu; Flask, scheduler veya DB kodu çalıştırılmadı.

| Yeni rol | HEX | Eski kaynak |
| --- | --- | --- |
| primary | #142D55 | .btn_horizon |
| primary-subtle / foreground / border | #D4DBF9 / #222C5C / #BBC5F5 | primary_*_light |
| secondary / foreground / border | #DCDDE2 / #2E3038 / #C7C9D1 | secondary_*_light |
| background | #EDF2F9 | bg-color-light |
| accent | #BB992F | horizon |
| card / popover | #FFFFFF | cards-color-light |
| muted | #F9FAFD | sec_cards-color-light |
| foreground / muted-foreground | #5E6E82 | text-color-light |
| input | #99A0A8 | input-border-light |

| Durum | Arka plan | Metin | Kenarlık |
| --- | --- | --- | --- |
| success | #CCF0E3 | #154E39 | #AEE7D2 |
| warning | #FBECD2 | #60481E | #F9E1B7 |
| info | #D3E8FB | #3C5C78 | #B9DBF9 |
| danger | #FCDADA | #622A2A | #FBC3C3 |

Durum üçlüleri eski `success/warning/info/danger_*_light` değerleriyle aynıdır.
Eski toast sınıflarının kullandığı dark değerler taşınmadı. Genel border mevcut
secondary renginden, focus ring ana lacivertten türetildi; her eski CSS kuralı
birebir kopyalanmadı. Geist tipografisi korundu.

Kullanım: `bg-success text-success-foreground border-success-border`.
`destructive`, shadcn doğrulama stilleriyle uyum için `danger-foreground`
alias'ıdır; dolu hata yüzeylerinde `bg-danger` kullanılır.

## Bileşenler

Mevcut radix-nova / Radix altyapısı korundu; ek bağımlılık kurulmadı.

- Card, Button, Badge, Input, Separator mevcut; ortak tokenlarla kullanılır.
- Button ve Badge'e success, warning, info, danger, accent varyantları eklendi.
- Yeni: Alert, Label, Textarea, Checkbox, Switch, NativeSelect, Tabs, Tooltip,
  Dialog, AlertDialog, Skeleton, Table ve mobil navigasyon için Sheet.
- TooltipProvider kök layout'ta. Modallar portal, başlık/açıklama, odak tutma,
  Escape ile kapanma ve açan elemana odak dönüşünü Radix'ten alır.
- Onay penceresi iptal butonuna odaklanır; pencere dışına tıklamak onay sayılmaz.
- Checkbox indeterminate/disabled, form alanları invalid/disabled/focus,
  Skeleton azaltılmış hareket tercihini destekler.
- Alan hatalarında açıklama `aria-describedby` ile bağlanır.
  Alert'e canlı mesaj gereken yerde açıkça `role="alert"` veya `role="status"`
  verilir; statik kartların tamamı ekran okuyucuya alarm olarak sunulmaz.
- Okul durumları Badge, okul filtresi NativeSelect, liste aksiyonu Tooltip,
  form geri bildirimleri Alert ve yüklenme ekranı Skeleton kullanır.

`/platform/ui` (menüde **UI Kit**) renk kataloğu ve etkileşimli örnek ekranıdır.
Hem layout hem sayfa platform yetkisini kontrol eder. Demo alanları okul kaydı,
ayar, mesaj veya bildirim göndermez.

## Doğrulama

- 46/46 birim testi: yeni 4 tasarım sistemi testi dahil; kaynak HEX değerleri,
  varsayılanlarla eşleşme, light-only sınırı ve temel metin/zemin çiftlerinde
  en az 4.5:1 kontrast.
- TypeScript, ESLint ve production build başarılı.
- 23/23 salt okunur HTTP testi: UI Kit oturumsuz platformda login'e yönlenir,
  iki okul domaininde 404 olur; mevcut izolasyon testleri korunur.
- Oturumlu tarayıcı: checkbox/switch/select, modal açılış odağı, odak döngüsü,
  Escape, tetikleyiciye odak dönüşü, onay penceresinde iptal odağı ve demo reset,
  klavyeyle tooltip açılması doğrulandı.
- 1440 px masaüstü, 390 px mobil kontrolleri; mobil belge genişliği 390 px,
  modal 358 px ve iki yanda 16 px boşluk. Okul listesi/detayında belge taşması yok.
- İki okulun yerel girişlerinde zemin #EDF2F9 ve form yüzeyi #FFFFFF;
  farklı kayıtlı primary renkleri korunurken success rengi #CCF0E3 ortak kaldı.
- Varsayılan palet önizlendi, kayıtlı renklere geri dönüldü; DB'ye gönderilmedi.
- Kontrol edilen tarayıcı günlüğünde hata/uyarı yok.

Bu teslimde migration, kalıcı DB yazımı, commit/push veya deployment yapılmadı.
Önceki teslimin rollback-only DB servis testleri tekrar çalıştırılmadı; veri
yazma katmanı değişmedi. Logo, okul görselleri ve şablon seçimi ayrı açık iştir.
