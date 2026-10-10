# 17 — `studentlist.csv` öğrenci/veli/adres seed uygulama raporu

Tarih: 2026-10-10  
Durum: İnceleme tamamlandı; güncel karar doğrultusunda seed scripti hazırlanıyor.

Bu rapor, `docs/studentlist.csv` dosyasındaki eski öğrenci kayıtlarının yeni tenant mimarisine nasıl güvenli aktarılacağını netleştirmek içindir. Amaç önce kuru çalışma ve kararları tamamlamak, sonra kontrollü seed uygulamaktır.

## Güncel karar — sade import kapsamı

Kullanıcı netleştirmesi: Bu dosyadaki kayıtlar gerçek veri olarak kabul edilmeyecek; amaç iki okulda yeterli sayıda demo öğrenci/veli kaydı oluşmasıdır.

Bu nedenle ilk import kapsamı sadeleştirildi:

- `horizonedu` için 120 aktif öğrenci
- `gjimcamedu` için 120 aktif öğrenci
- Her öğrenci için mümkünse anne ve baba kişi kaydı
- Anne/baba ile öğrenci arasında `GuardianRelationship`
- Veli telefon/e-posta/adres bilgileri
- Öğrenci numarası yeni sistemin okul bazlı sequence’i ile üretilecek
- Akademik yıl, sınıf, şube, kayıt/yerleşim ataması bu fazda yapılmayacak
- Kullanıcı hesabı/parola oluşturulmayacak
- Eski `studpass_hash` taşınmayacak

Sınıf ve akademik atamalar kullanıcı tarafından daha sonra UI üzerinden yapılacak.

## 1. Kaynak dosya durumu

Dosya: `docs/studentlist.csv`

Beklenen sayı konuşmada yaklaşık 417 olarak belirtildi; mevcut dosyanın teknik okumasında:

- CSV header: 22 kolon
- Veri satırı: 320
- Seed parser ile temiz okunan satır: 298
- Seed parser ile onarılan satır: 22
- Satır durumları, sağdan durum alanı taranarak:
  - `Active`: 262
  - `Passive`: 58

Onarılan satırların nedeni büyük olasılıkla adres alanlarında virgül, tırnak ve bir satırda satır kırılması karakterlerinin CSV içinde tam kaçışlanmamış olması. Bu durum öğrenci adı gibi baştaki alanları genelde bozmuyor; fakat adres, telefon, e-posta ve durum alanlarında sağdan-ankrajlı parser ile onarım gerekiyor.

Not: Kullanıcı bu dosyanın gerçek veri olmadığını belirtti. Buna rağmen dosyada ad, telefon, e-posta gibi kişisel alanlar bulunduğu için GitHub’a commit edilmemesi ve lokal/dahili seed kaynağı olarak tutulması daha güvenli olur.

## 2. CSV kolonları ve yeni modele önerilen eşleme

| CSV kolonu | Yeni sistem hedefi | Not |
|---|---|---|
| `id` | Legacy kaynak anahtarı | Yeni DB primary key yapılmamalı. Seed idempotency için `internalNote` veya import haritası olarak kullanılabilir. |
| `stu_date_reg` | `StudentProfile.admittedOn` | `YYYY-MM-DD`; tüm satırlarda geçerli format görünüyor. |
| `stu_reg_class` | şimdilik sadece legacy not | Bu fazda sınıf/şube yerleşimi oluşturulmayacak. Değer `internalNote` içinde korunur; atamalar daha sonra UI’den yapılır. |
| `stu_persid` | `PersonIdentity` / `NATIONAL_ID` | 319 dolu, 1 boş. Kimlikler hash/encrypted mekanizmayla eklenmeli. |
| `stu_name`, `stu_surname` | öğrenci `Person.firstName`, `lastName` | Direkt eşleşiyor. |
| `stu_father`, `stu_mother` | veli `Person` kayıtları | Baba/anne ayrı veli olarak oluşturulabilir. |
| `stu_profession` | veli `occupationText` veya not | Tek alan var; hangi veliye ait olduğu belirsiz. Seed’de not veya her iki veliye aynı occupation olarak işlenebilir, karar gerekli. |
| `stu_gender` | `Person.sex` | `Mashkull`, `1` → `MALE`; `Vajze`, `Femer`, `Femër`, `F`, `2` → `FEMALE`; 3 boş/belirsiz. |
| `stu_birthday` | `Person.birthDate` | `YYYY-MM-DD`; tüm satırlarda format geçerli. |
| `stu_borned` | `Person.birthPlace` | Opsiyonel. |
| `stu_nationaly` | `Person.nationalityText` | Metin olarak korunmalı; değerler normalize edilmeye çalışılmamalı. |
| `stu_rezidence` | `StudentProfile.residenceCity` | Bazı satırlarda adres kayması nedeniyle onarım gerekebilir. |
| `stu_lagja` | `StudentProfile.neighborhood` | Mahalle alanı. |
| `stu_adresses` | `StudentProfile.addressLine` | Ekstra kolonlu satırlarda birleşik adres olarak toparlanmalı. |
| `stu_phones1`, `stu_phones2` | veli `PersonContactPoint` / PHONE | Hangi telefonun hangi veliye ait olduğu karar gerektiriyor. |
| `stu_email1`, `stu_email2` | veli `PersonContactPoint` / EMAIL | Hangi e-postanın hangi veliye ait olduğu karar gerektiriyor. |
| `stu_situation` | import filtresi | Bu fazda sadece ilk 240 `Active` kayıt kullanılacak; `Passive` kayıtlar atlanacak. |
| `studpass_hash` | aktarılmamalı | Eski Flask hash’i yeni auth sistemiyle kullanılmamalı. Öğrenci/veli hesapları daha sonra yeni geçici şifre akışıyla oluşturulmalı. |

## 3. CSV sınıf dağılımı

Tüm satırlar:

| Sınıf değeri | Kayıt |
|---|---:|
| `1` | 72 |
| `Parafillor` | 59 |
| `6` | 32 |
| boş | 27 |
| `10` | 21 |
| `8` | 20 |
| `7` | 19 |
| `3` | 19 |
| `2` | 17 |
| `4` | 15 |
| `9` | 12 |
| `5` | 5 |
| `11` | 1 |
| `12` | 1 |

Aktif satırlar:

| Sınıf değeri | Aktif kayıt |
|---|---:|
| `1` | 67 |
| `Parafillor` | 47 |
| `6` | 30 |
| boş | 19 |
| `3` | 18 |
| `10` | 16 |
| `2` | 15 |
| `4` | 14 |
| `7` | 13 |
| `8` | 12 |
| `9` | 6 |
| `5` | 5 |

Burada iki karar var:

1. Boş sınıf alanı olan 27 kayıt seed’e alınacak mı?
2. CSV yalnız seviyeyi verdiği için, şube nasıl atanacak? Önerim: her seviye için varsayılan ilk aktif şube kullanılsın. Örneğin `1` → `1/A`; `2` → `2/A`; `Parafillor` → `PRF`.

## 4. Canlı tenant durumu

Salt-okunur canlı DB kontrolü yapıldı; veri değiştirilmedi.

### HorizonEdu

- `slug`: `horizonedu`
- Durum: `ACTIVE`
- Mevcut öğrenci: 4
- Mevcut üyelik: 4
- Aktif öğretim yılı: `2026 / 2027`
- Öğretim yılı tarihleri: 2026-09-01 → 2027-06-25
- Seviye tanımı: 13
- Şube tanımı: 8
- Aktif yıllık sınıf/şube: 8

Mevcut aktif yıllık sınıflar:

- `PRF`
- `1/A`
- `1/B`
- `2/A`
- `2/B`
- `2/C`
- `3/A`
- `3/B`

HorizonEdu için CSV’de bulunan `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12` seviyelerinin yıllık sınıf/şube karşılığı şu anda eksik. Seed sırasında bu kayıtlar için ya sınıfsız import yapılmalı ya da eksik yıllık şubeler önce oluşturulmalı.

### GjimCamEdu

- `slug`: `gjimcamedu`
- Durum: `ACTIVE`
- Mevcut öğrenci: 0
- Mevcut üyelik: 1
- Akademik yıl: 0
- Seviye tanımı: 0
- Şube tanımı: 0
- Yıllık sınıf/şube: 0

GjimCamEdu’ya öğrenci yerleşimli seed yapabilmek için önce akademik yapı ve aktif öğretim yılı oluşturulmalı. Aksi halde öğrenci oluşturulabilir ama sınıf/şube yerleşimi yapılamaz.

## 5. Yeni veritabanında yazılacak ana tablolar

Güncel seed kapsamı:

1. `Person`
   - Öğrenci kişiler
   - Anne/baba veli kişiler
2. `PersonIdentity`
   - Öğrenci `stu_persid` değeri, `NATIONAL_ID` olarak
3. `StudentProfile`
   - Öğrenci numarası yeni sistem sequence ile üretilecek
   - Adres, mahalle, ikamet, statü
   - `internalNote` içine legacy kaynak referansı eklenebilir
4. `StudentLifecycleEvent`
   - `Active` kayıtlar için `ACTIVATED`
5. `GuardianRelationship`
   - Anne ve baba ayrı ilişki olarak
   - Varsayılan primary/financial veli: baba varsa baba, yoksa anne
6. `PersonContactPoint`
   - Veli telefon/e-posta bilgileri
7. `AuditEvent`
   - Seed kaynağı ve özet veri; ham parola/hash yazılmaz

Bu fazda özellikle oluşturulmayacak kayıtlar:

- `Enrollment`
- `StudentGroupPlacement`
- Akademik sınıf/şube ataması
- Finans/protokol kaydı
- Öğrenci/veli kullanıcı hesabı

Seed kapsamında şimdilik oluşturulmaması önerilenler:

- `User`
- `UserCredential`
- `PersonAccount`

Gerekçe: CSV’deki `studpass_hash` eski Flask hash formatında. Yeni sistemin geçici şifre ve `mustChangePassword` akışıyla uyumlu değil. Öğrenci/veli hesapları daha sonra UI’den veya ayrı kontrollü account seed fazıyla oluşturulmalı.

## 6. Tenant bölme stratejisi

Güncel kullanıcı kararı: her iki okul için 120’şer öğrenci yeterli.

Mevcut dosyada 262 aktif kayıt olduğu için:

- İlk 120 aktif kayıt → `horizonedu`
- Sonraki 120 aktif kayıt → `gjimcamedu`
- Kalan aktif kayıtlar ve pasif kayıtlar bu fazda kullanılmayacak

Bu dağıtım demo veri yoğunluğu için yeterlidir. Aile bütünlüğünü koruyan daha ileri bir dağıtım bu fazda gerekli görülmedi.

## 7. Önerilen uygulama fazları

### Faz 0 — Kaynak dosya güvenliği

- `docs/studentlist.csv` Git’e commit edilmesin.
- İstenirse dosya `.gitignore` kapsamına alınsın.
- Seed scripti dosyayı lokalden okusun; repo içinde kalıcı fixture olarak kullanılmasın.

### Faz 1 — CSV dry-run parser ve sade import scripti

Kod yazmadan canlı DB’ye veri basmadan önce bir dry-run script hazırlanmalı:

- 320 satırı okur.
- Sorunlu satırları sağdan-ankrajlı onarır.
- Cinsiyet, durum, telefon, e-posta validasyonlarını raporlar.
- İlk 240 aktif satırın iki tenant’a 120/120 dağıtımını gösterir.
- Yazma yapmaz.

Önerilen komut:

```bash
pnpm db:seed:studentlist --dry-run
```

veya proje alışkanlığına uygun olarak:

```bash
pnpm db:seed:studentlist
```

Varsayılan mod dry-run olmalı; gerçek yazma yalnız `--apply` ile yapılmalı.

### Faz 2 — Öğrenci ve adres seed’i

- Öğrenci `Person` oluştur.
- `StudentProfile` oluştur.
- `stu_persid` varsa kimlik kaydı oluştur.
- Adres alanlarını `residenceCity`, `neighborhood`, `addressLine` olarak işle.
- Sadece aktif kayıtlar alınacağı için öğrenci durumu `ACTIVE` kalsın.
- Legacy referansı ekle:
  - `source=studentlist.csv`
  - `legacy_id=<csv id>`

### Faz 3 — Veli seed’i

- Baba ve anne ayrı `Person` olarak oluşturulsun.
- `GuardianRelationship` ile öğrenciye bağlansın.
- Telefon/e-posta kontakları veli kişilerine eklensin.
- Baba varsa baba `primary` ve `financial responsible`; baba yoksa anne.

Varsayılan telefon/e-posta eşlemesi:

- `stu_phones1` / `stu_email1` → baba
- `stu_phones2` / `stu_email2` → anne

Burada önceki iş kararımıza göre okul SMS/e-posta ücretinden dolayı tek primary veli önemlidir. CSV’de primary bayrağı olmadığı için bu karar seed öncesi netleşmeli.

### Faz 4 — Canlı seed

Komut yalnız kullanıcı onayından sonra:

```bash
pnpm db:seed:studentlist --apply
```

Bu faz:

- Transaction/advisory lock kullanmalı.
- Tekrar çalıştırıldığında aynı legacy kaydı yeniden üretmemeli.
- Ham eski parola hash’lerini taşımamalı.
- Her tenant için özet sonuç basmalı:
  - oluşturulan öğrenci
  - atlanan öğrenci
  - oluşturulan veli
  - oluşturulan ilişki
  - hata satırları

### Faz 5 — Kabul kontrolü

Seed sonrası salt-okunur doğrulama:

- HorizonEdu öğrenci sayısı
- GjimCamEdu öğrenci sayısı
- Her tenant için veli ilişki sayısı
- Kimlik çakışmaları
- Cross-tenant karışım yokluğu

## 8. Bu kararla kapanan maddeler

1. 417 beklentisi yerine mevcut 320 satırlık dosya kullanılacak.
2. Sadece `Active` satırlar kullanılacak.
3. Tenant bölme: `120 + 120`.
4. Sınıf alanı şimdilik yerleşim için kullanılmayacak.
5. GjimCamEdu akademik yapı önkoşulu bu import için gerekli değil.
6. `stu_profession` her iki veliye de `occupationText` olarak yazılacak.
7. Primary/financial veli: baba varsa baba, yoksa anne.
8. HorizonEdu’daki mevcut test öğrencileri korunacak; import mevcut verinin üzerine eklenecek.

## 9. Benim önerim

Benim önerdiğim güvenli rota:

1. CSV dosyasını Git’e commit etmeyelim.
2. `db:seed:studentlist` dry-run scriptiyle 120/120 planı görelim.
3. İlk uygulamada yalnız öğrenci + veli + adres + ilişki aktaralım.
4. Kullanıcı hesaplarını, akademik yerleşimleri ve parolaları taşımayalım.
5. Canlı seed’i dry-run çıktısı temizse `--apply` ile çalıştıralım.
