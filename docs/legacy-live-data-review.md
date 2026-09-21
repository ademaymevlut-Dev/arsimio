# HorizonEdu canlı veri incelemesi

Tarih: 2026-09-19

Durum: Seçili akademik verilerin API/panel üzerinden salt-okunur incelemesi `TAMAMLANDI`; doğrudan SQL/DB şema doğrulaması `BEKLİYOR`. **Canlı veriler okundu; belgenin sonundaki SQL örnekleri çalıştırılmadı.**

Ölçüm: 2026-09-19, yaklaşık 08:14–08:21 UTC (Europe/Belgrade 10:14–10:21). Ardışık API okumaları tek DB snapshot transaction'ı değildir; bu sırada başka kullanıcıların değişiklik yapmadığı garanti edilmez.

Bu belge, [kaynak kod incelemesini](./legacy-data-model-review.md) gerçek verilerle doğrulama çalışmasının kaydıdır. Kaynak kodda mümkün görünen bir sorun, veride ölçülmeden gerçekleşmiş hata olarak raporlanmaz.

## 1. Erişim ve yöntem

| Kontrol | Gözlenen sonuç | Kanıt sınırı |
| --- | --- | --- |
| [Canlı yönetim paneli](https://hschool.online/api/admin/adminpage) HTTP kontrolü | `302`, `/api/admin/login?next=...` yönlendirmesi | Site yanıt veriyor; bu istek yetkili oturum taşımıyor |
| Codex tarayıcısında paneli açma | Kullanıcı adı/parola formu ve giriş gerekliliği görüldü | Kullanıcının başka tarayıcıdaki olası oturumunun durumu bilinmiyor |
| Eski yerel `.env` ve yapılandırmanın bağlantı hedefi | MySQL, `localhost`, `horizon_mysql` | Yalnız bağlantı hedefi ayrıştırıldı; kimlik bilgileri rapora alınmadı. Canlı sunucu yapılandırmasının aynı olduğu doğrulanmadı |
| Bu bilgisayarda `127.0.0.1:3306` TCP kontrolü | `ECONNREFUSED` | Bu adreste erişilebilir MySQL/tünel yok; canlı sunucunun DB durumuna ilişkin kanıt değil |
| Sonraki panel kontrolü | Yönetici paneli ve yetkili okuma endpoint'leri açıldı | İlk oturum engeli kalktı; kullanıcı parolası okunmadı/kopyalanmadı |
| Çerez/Authorization göndermeyen ayrı GET istekleri | Seçili katalog, öğretmen, atama, program ve performans endpoint'leri JSON döndürdü | Panelin giriş istemesi bütün API'lerin korumalı olduğu anlamına gelmiyor |

Parola denemesi, oturum üretme veya giriş kontrolünü aşma yapılmadı. Kayıt oluşturan/değiştiren endpoint çağrılmadı. Flask uygulaması, `create_app()`, `db.create_all()`, zamanlanmış rapor veya `seed_status.py` çalıştırılmadı.

### 1.1 Gerçekte okunan kaynaklar

| Kaynak | Kapsam ve sınırlama |
| --- | --- |
| `/api/students/student_main` | Yetkili panelde “All” seçilerek 447 satır; yalnız ID, durum ve görünen aktif sınıf analiz belleğine alındı. Görünen sınıf, route'un ilk `Active` kayıt seçimidir |
| `/api/students/get_period_and_class/{student_id}` | Listede görülen 447 ID'nin her biri için sıralı GET; 447 başarılı okuma, 1.051 yıllık kayıt. API'nin döndürdüğü ad/soyad analiz çıktısına alınmadı |
| `/api/students/get_period_list` | Yetkili API; 5 öğretim yılı, aktif/pasif birlikte |
| `/api/admin/period_teacher` | Oturumsuz API; yalnız aktif yıllar, 1 sonuç |
| `/api/admin/get-classes`, `/get-lessons`, `/get_hours` | Oturumsuz API; 20 sınıf, 49 ders, 7 saat dilimi |
| `/api/admin/teachers?status=All` | Oturumsuz API; 52 tekil öğretmen cari kartı. Analizde ID/durum tutuldu; iletişim/kimlik alanları raporlanmadı |
| `/api/admin/get-teacher-assignments/{teacher_id}/All` | Bu 52 öğretmenin tüm status'lardaki atamaları; toplam 797 sonuç. Kaynak sorgu yıl/ders/sınıfa inner join yaptığı için kopuk ilişkili satırlar görünmeyebilir |
| `/api/setting/get_weekly_schedule/{class_id}` | Katalogdaki 20 sınıf için 668 sonuç; endpoint yalnız `Active` program satırlarını getirir |
| `/api/admin/get_teacher_responsbility/{teacher_id}` | 52 öğretmenden 19 sonuç, 33 beklenen “aktif kayıt yok” 404'ü. Her öğretmen için yalnız ilk aktif sorumluluk döner; bütün tabloyu göstermez |
| `/api/admin/performance`, `/api/admin/adminpage` | 51 aktif öğretmen hesabının performans sonucu ve panel sayaçları |
| `/api/teachers/get_grade_periods` | Yetkili API; 4 not kategorisi |
| `/api/setting/school_week` | Yetkili ekran; 189 aktif takvim günü |

Program/atama incelemesi bir turda 130 sıralı GET kullandı: 97 HTTP 200, sorumluluk endpoint'inden 33 beklenen HTTP 404. İkinci tur atama–program–personel durumu eşlemesini genişletti ve aynı ana sayımları verdi. İstekler paralel yük bindirmek yerine sırayla yapıldı. Öğrenci geçmişi okumaları bundan ayrıdır.

### 1.2 Güvenlik ve kanıt sınırı

- **Panel/API yolu kullanıldı.** Ekranların normal okuma akışları ve kaynakta gövdeleri kontrol edilmiş endpoint'ler kullanıldı. GET yöntemli silme route'ları da bulunduğundan yalnız HTTP yöntemine güvenilmedi; bunlar çağrılmadı. Bir ekranın/API'nin sonucu bütün veritabanını temsil etmez.
- **SQL yolu henüz kullanılmadı.** Gerçek indeks/FK/trigger denetimi için mevcut salt-okunur MySQL hesabına ulaşan bağlantı/tünel gerekir. Sunucuda anlamlı olan `localhost`, bu bilgisayarda aynı sunucuyu göstermez. Genel web domaininin aynı zamanda DB adresi olduğu varsayılmaz.
- Parola veya bağlantı sırrı sohbet mesajına ya da Git'teki belgeye yazılmamalı. Mevcut yerel bağlantı yapılandırmasının yolu paylaşılabilir. Yeni hesap açma, DB portunu internete açma veya yetki genişletme bu incelemenin parçası değildir.
- Önce sunucu sürümü, hedef şema, tablo/kolon adları ve indeksler doğrulanır. Aşağıdaki örnekler yerel modellere göre yazılmıştır; gerçek şema farklıysa uyarlanmalıdır.
- Mümkünse mevcut salt-okunur kopya kullanılır. Üretimde tabloların boyutu ve sorgu planı görülmeden geniş tarama/self-join çalıştırılmaz. SQL sürümüne uygun süre sınırı belirlenir; uzun transaction açık bırakılmaz. Salt okunur sorgular da üretimde yük oluşturabilir.
- Salt-okunur yetki esas korumadır. Desteklenen MySQL sürümünde kısa inceleme oturumları `START TRANSACTION READ ONLY;` ile açılıp `ROLLBACK;` ile kapatılabilir; bu, yetki kısıtlamasının yerine geçmez. Hata halinde de oturum kapatılır. Veri değiştiren SQL, migration ve kilitleyen `FOR UPDATE` kullanılmaz.
- Rapora ad, kimlik numarası, telefon, e-posta, parola/hash, veli mesajı veya belge içeriği alınmaz. Sayımlar ve gerekli katalog etiketleri kullanılır; küçük gruplardaki sayımlar da yalnız iç inceleme kapsamında tutulur.

## 2. Canlı envanter

### 2.1 Öğrenci, yıl ve geçiş sayımları

| Öğretim yılı | Yıllık kayıt | Tekil öğrenci | Yıllık kayıt durumu |
| --- | ---: | ---: | --- |
| 2022 / 2023 | 45 | 45 | 45 Passive |
| 2023 / 2024 | 146 | 146 | 146 Passive |
| 2024 / 2025 | 233 | 233 | 233 Passive |
| 2025 / 2026 | 297 | 297 | 297 Passive |
| 2026 / 2027 | 330 | 330 | 330 Active |
| Toplam | 1.051 | Yıllar arasında toplanmaz | 721 Passive, 330 Active |

Kalıcı öğrenci dosyası **447**: **330 Active, 117 Passive**. Aktif öğrencilerin her birinde bir aktif yıllık kayıt var; pasif öğrencilerin hiçbirinde aktif yıllık kayıt yok. **27 pasif öğrencinin hiçbir yıllık kaydı yok**; diğer 90 pasif öğrencinin geçmiş yıllık kaydı var. Bunlar ön kayıt, eksik kayıt veya başka bir süreç olabilir; nedeni veriden belirlenemedi.

Geçmiş yıllardaki sayılar “okulun o yılki kesin mevcudu” değildir: silinmiş/eski sisteme hiç girilmemiş kişiler veya burada görünmeyen başka kaynaklar ölçülemedi. Bu tablodan tek başına okulun büyüme oranı hesaplanmamalı.

| Kaynak → hedef yıl | Her iki yılda bulunan | Yalnız kaynakta bulunan | Yalnız hedefte bulunan |
| --- | ---: | ---: | ---: |
| 2022/23 → 2023/24 | 45 | 0 | 101 |
| 2023/24 → 2024/25 | 140 | 6 | 93 |
| 2024/25 → 2025/26 | 213 | 20 | 84 |
| 2025/26 → 2026/27 | 233 | 64 | 97 |

Son geçişteki 97 hedef-yıl öğrencisinin bu API'de önceki yıllık kaydı da bulunmadı; bu “kesin ilk okul kaydı” değil, **eldeki ilk yıllık kayıt** anlamına gelir. Kaynakta kalıp hedefte olmayan 64 kişinin 12'si kaynak yılda 12. sınıfta, 52'si başka seviyelerdeydi. Bu sayılar mezuniyet/ayrılma nedeni değil, kayıt devamlılığı sayımlarıdır.

### 2.2 Güncel sınıflar ve akademik hazırlık

Sınıf adları aşağıda yalnız görünüm için baş/son boşluklardan arındırılmıştır; canlı kayıtlar değiştirilmedi. “Sorumlu” sütunu ilk-aktif-kayıt endpoint'inin döndürdüğü sonuç sayısıdır.

| Sınıf | Aktif öğrenci | Aktif ders ataması | Haftalık program satırı | Dönen sorumlu |
| --- | ---: | ---: | ---: | ---: |
| PRF | 27 | 12 | 26 | 1 |
| 1 / 1 | 14 | 14 | 35 | 1 |
| 1 / 2 | 15 | 14 | 35 | 1 |
| 1 / 3 | 16 | 14 | 35 | 1 |
| 2 / 1 | 17 | 15 | 35 | 1 |
| 2 / 2 | 18 | 15 | 35 | 1 |
| 2 / 3 | 18 | 14 | 35 | 1 |
| 3 - 1 | 13 | 14 | 35 | 1 |
| 3 / 2 | 15 | 14 | 35 | 1 |
| 3 / 3 | 14 | 14 | 35 | 1 |
| 4 - 1 | 21 | 14 | 35 | 1 |
| 4 / 2 | 19 | 14 | 35 | 1 |
| 5 - 1 | 17 | 14 | 35 | 1 |
| 6 - 1 | 21 | 16 | 31 | 1 |
| 7 - 1 | 21 | 17 | 32 | 1 |
| 8 - 1 | 16 | 17 | 32 | 1 |
| 9 - 1 | 18 | 19 | 33 | 1 |
| 10 - 1 | 17 | 15 | 31 | 1 |
| 11 - 1 | 7 | 13 | 30 | 0 |
| 12 - 1 | 6 | 16 | 33 | 1 |
| Toplam | 330 | 295 | 668 | 19 |

20 sınıfın kademe etiketleri: 1 `Parafillor`, 12 `FILLOR`, 4 `MESËM I ULËT`, 3 `MESËM I LARTË`. Bu kurumun mevcut kataloğu görülmüştür; bütün okulların aynı kademeleri kullanacağı varsayılmaz.

Sonraki kullanıcı açıklaması: `PRF / Parafillor` anaokuludur. Birinci sınıf şube dağıtımını okul daha sonra kararlaştırır; bu anlam API sayımından çıkarım değil, kullanıcı tarafından doğrulanan iş bilgisidir.

Öğretmen cari kartları: 52 toplam, 38 aktif, 14 pasif. Aktif ders ataması ve programı bulunan öğretmen sayısı 32. Atama geçmişi: 2023/24'te 31, 2024/25'te 239, 2025/26'da 232 pasif atama; 2026/27'de 295 aktif atama. Bunlar 52 öğretmenin API'de görünür atamalarıdır, doğrudan tablo sayımı değildir.

## 3. Veriye dayalı bulgular ve ürün kararlarına etkisi

### L01 — Öğretim yılı tarih hatası doğrulandı

`2024 / 2025` kaydı: başlangıç **2024-09-01**, bitiş **2024-06-26**. Bitiş başlangıçtan önce. Doğru tarihin ne olması gerektiği kullanıcı teyidi olmadan seçilmedi. Yeni yıl ekranı tarih aralığını doğrulamalı; aktarımda bu kayıt inceleme kuyruğuna girmeli. Eski güncelleme route'u tarih alanlarını güncellemiyor (`setting/routes.py:83`); düzeltme ihtiyacı yalnız yeni kayıt formuyla çözülmez.

### L02 — Mezuniyet ve ayrılma ayrımı mevcut veriyle güvenilir üretilemiyor

117 pasif öğrencinin 90'ında geçmiş yıllık kayıt var; bu 90 kişinin 20'sinin son görünen sınıfı 12. sınıf. **20 mezun var** sonucu çıkarılamaz: son sınıf kaydı, mezuniyet kararının yerine geçmez. 27 kişinin ise yıllık geçmişi yok. Son yıldan yeni yıla taşınmayan 64 kişinin tamamını ayrılmış veya mezun saymak da yanlış olur.

Yeni modelde akademik yıl sonucu, kayıt yenileme kararı, mezuniyet olayı, okuldan ayrılma nedeni/tarihi ve arşiv görünürlüğü ayrı tutulmalı. Eski pasif kayıtlar “nedeni bilinmeyen geçmiş durum” olarak aktarılabilir; gerekirse yönetici tarafından sonradan sınıflandırılır. Kaynak rapordaki B01/B05/B06 canlı örneklerle güçlendi.

### L03 — Tek tuşla devir, yalnız sınıf numarasını artırmak olamaz

Gerçek örnekler:

- 2023/24 → 2024/25 geçişinde `1 - 1` grubundan **16 öğrenci `2 / 1`**, **16 öğrenci `2 / 2`** olmuş. Tek kaynak şubenin birden çok hedefe ayrılması zaten kullanılıyor.
- Aynı geçişte `PRF` öğrencileri `1 / 1`, `1 / 2`, `1 / 3` gruplarına dağılmış; **2 öğrenci PRF'de kalmış**. Bu yaş grubu tekrarı veya başka bir karar olabilir; otomatik “sınıfta kaldı” denmez.
- Aynı geçişte birer kayıtta `2 - 1 → 4 - 1` ve `3 - 1 → 5 - 1` görülüyor. Bunlar hata, düzeltme veya özel geçiş olabilir; otomatik düzeltme yapılmadı.
- 2025/26 → 2026/27 geçişinde `3 / 2 → 4 / 2` ile 17 kişi taşınmış; şube devamlılığı bazı gruplarda korunuyor.

**Kullanıcı görüşmesiyle güncellenen UI sonucu:** Geçmişteki farklı eşlemeler aktarımda korunmalı, ancak yeni normal geçiş için kapsamlı dağıtım ekranı gerektirmiyor. Kullanıcı, devam eden 1–11 öğrencilerinin tamamının grup/şube numarası korunarak otomatik yükseltileceğini doğruladı (`3 / 2 → 4 / 2`). Ayrılanlar önceden ayıklanır; PRF dağıtımı ve 12. sınıf mezuniyeti ayrı ele alınır. Nadir öğrenci istisnaları detaydan manuel düzeltilir. Önizleme kontrol/onay içindir; rutin elle eşleme veya veli yenileme onayı adımı eklenmez.

### L04 — Kopyalanmış sınıf adları katalogdan ayrışmış

1.051 yıllık kaydın **121'inde** sınıf adı mevcut katalogla birebir aynı değil. Baş/son boşluklar dikkate alınmazsa **50 fark** kalıyor. Bu 50 satır, `1 - 1` / `1 / 1` ve `2 - 1` / `2 / 1` biçim farklarından oluşuyor. Katalogda 5 sınıf adının sonunda boşluk var. Okunan kayıtlarda olmayan yıl/sınıf ID'si, yıl adı farkı veya kademe etiketi farkı görülmedi.

Bu bulgu öğrencilerin yanlış sınıfta olduğunu kanıtlamaz; isim kopyalama/yeniden adlandırma sorunudur. Şube kimliği isimden türetilmemeli. Seviye ve şube ayrı alanlarda tutulmalı; geçmiş etiketler gerekiyorsa açık snapshot olarak korunmalı. Aktarım eşlemesi metin eşitliğine dayanmamalı.

### L05 — Öğretmen hesabı, personel durumu ve aktif görev farklı sayılıyor

Panel **51 aktif öğretmen hesabı**, personel kaynaklı API **38 aktif öğretmen kartı**, program/atamalar **32 görevli öğretmen** gösteriyor. Panel ayrıca öğretmenleri de kapsayabilen filtreyle 43 aktif personel sayıyor; bu sayı 51'e eklenerek personel toplamı hesaplanamaz.

Kaynaklar farklı: `admin.admin_situation/admin_group`, `current_tbl.current_status/department` ve yılın öğretmen atamaları. Bu sayımların farklı olması tek başına 13 hatalı hesap olduğu anlamına gelmez; hesap–personel eşlemesi ayrıca gerekir. Yeni yönetim panelinde sayaçların adı/kapsamı açık olmalı, ayrılan personelin hesabı ve görevleri ayrı ama koordineli yönetilmeli. Aktif atama/program/sorumluluk sonuçlarında pasif öğretmen kartına bağlı kayıt bulunmadı.

### L06 — Sınıf sorumlusu için bir görünür boşluk var; kesin eksiklik henüz değil

19 aktif sorumluluk döndü; `11 - 1` için sonuç bulunmadı. Bu sınıfta 7 aktif öğrenci, 13 ders ataması ve 30 program satırı var. **“Veritabanında sorumlusu kesinlikle yok” denemez**: endpoint öğretmen başına `.first()` döndürüyor, yalnız öğretmen kataloğundaki kişiler sorgulandı. Tam tablo/uygun liste endpoint'iyle doğrulanmalı.

Yeni yıl hazırlığında “öğrencisi olan fakat sorumlu ataması görünmeyen şube” kontrolü olmalı. Sorumluluk, şube+yıl+dönem/geçerlilik aralığı üzerinden listelenmeli; tek öğretmenin ilk aktif kaydına indirgenmemeli.

### L07 — Programda mevcut tutarlılık iyi; atama UI'si ve birleşik ders modeli gerekli

668 aktif program satırının tamamı `2026 / 2027` yılına ait. 7 saat diliminde ters/sıfır süre bulunmadı. Aynı yıl+gün için gerçek saat aralıkları karşılaştırıldığında öğretmen veya sınıf çakışması **0**; programdaki her satır aktif öğretmen+yıl+ders+sınıf atamasıyla eşleşiyor. 797 görünür atamada öğretmen+yıl+ders+sınıf tekrarı da **0**.

295 aktif atamanın **5'i** programda karşılık bulmuyor. Bu; henüz yerleşmemiş, seçmeli veya program dışı bir ders olabilir; otomatik hata sayılmadı. Yeni program ekranında “atanmış fakat programa konmamış dersler” kuyruğu yararlı olur; haftalık saat hedefi bilinmeden tamamlandı kararı verilmemeli.

Sıfır çakışma, birleşik ders desteğinin bulunduğunu göstermez. Kullanıcının anlattığı birleşme ihtiyacı mevcut yazma kontrolü tarafından daha kaydedilmeden engelleniyor olabilir. Yeni modelde tek oturum+çok katılımcı şube/grup gerekir. İncelenen endpoint pasif programları göstermediğinden geçmiş program tutarlılığı doğrulanmadı.

### L08 — Takvim ve not sözlüğünün gerçek kullanımı görüldü

Aktif takvimde 189 gün, 38 farklı hafta numarası var; aynı yıl+tarih tekrarı yok. Birinci yarıyıl 84 gün: **2026-09-01–2026-12-25**; ikinci yarıyıl 105 gün: **2027-01-04–2027-05-28**. Öğretim yılı bitişi **2027-06-25**, fakat aktif takvimin son günü **2027-05-28**. Bu fark eğitim/sınav/kademe takvimi tercihi olabilir; eksik takvim diye otomatik doldurulmaz. Tek takvimin bütün kademelere yeterli olup olmadığı sorulmalı.

Not sözlüğü iki yarıyılda ayrı ayrı `1st Grade` / `2nd Grade`: toplam dört kayıt. Bunların sınıf seviyesi değil değerlendirme kategorisi olarak kullanıldığı kaynakta görülüyor; “birinci/ikinci yazılı” gibi daha özel anlamı kullanıcı teyidi gerektiriyor. Ders kataloğunda IGCSE ve AS/A Level etiketleri de var; bunların bağımsız program mı ders adı mı olduğu netleştirilmeden ayrı diploma programı varsayılmamalı.

### L09 — Performans yüzdesi canlıda güvenilir bir gösterge değil

51 performans satırının **47'si %100'ün üzerinde**; üst değer yaklaşık **%3.105,56**. Kalan 4 satırda payda sıfır. Kaynak hesaplama (`admin/routes.py:976`), öğretmenin bütün program satırlarını bir hafta katsayısıyla çarpıyor; bütün geçmiş ders günlüklerini tamamlanan sayısı olarak kullanıyor. Yıl/dönem/tarih kapsamları eşit değil. Bugünün takvim günü bulunamazsa hafta katsayısı 1; ölçüm gününde (cumartesi) aktif takvimde gün kaydı yok.

**Bu değerler öğretmen başarısını göstermiyor.** Yeni metrik seçilen tarih aralığındaki beklenen gerçekleşmiş ders oturumları ile aynı aralıktaki tamamlanmış günlükleri karşılaştırmalı; tatil, iptal, vekil öğretmen ve henüz gelmemiş dersleri hesaba katmalı. Oranı yalnız %100'e kırpmak veri kapsamı hatasını çözmez.

Sonraki ürün görüşmesinde kullanıcı dersi başlatma, yoklama/konu/ödev adımları ve gün sonu raporuna kadar tamamlama üzerinden **platform kullanım takibi** istedi. Bu, L09'daki eski oranı kullanma onayı değildir; yeni ölçüm tekil tarihli oturumlar ve açık adım durumlarına dayanmalı. Öğretmenin eğitim kalitesi veya fiziksel derse katılımı bu göstergeden çıkarılmaz. Ayrıntılar kaynak raporun 23. bölümündedir; yeni metrik uygulanmadı ve yeni canlı sayım yapılmadı.

### L10 — Oturumsuz API okuması canlıda doğrulandı

Çerez ve Authorization header'ı olmayan ayrı isteklerle katalogların yanı sıra öğretmen listesi, ders atamaları, aktif programlar ve performans verisi HTTP 200 döndürdü. Öğretmen liste yanıtı kimlik/iletişim alanlarını da içeriyor; değerler bu belgeye alınmadı. Bu, yalnız kaynakta eksik decorator bulunmasından daha güçlü bir canlı kanıttır.

Bu incelemede yetkili kullanıcının talebiyle yalnız okuma yapıldı. Yazma/silme endpoint'lerinin oturumsuz çalışıp çalışmadığı denenmedi. Ayrıca **bütün mobil endpoint'ler korumasız değildir**: yerel `parents_mob.py` ve `student_mob.py` içinde JWT kontrolleri var. Tespit, gerçekten sorgulanan endpoint'lerle sınırlıdır.

Yeni sistemde kimlik doğrulama + rol/okul kapsamı + minimum veri DTO'su standart olmalı. Eski sistemin internetten erişilebilir okuma uçlarının kapatılması/uygun yetkiye alınması ayrı, öncelikli güvenlik işi olarak değerlendirilmelidir; bu turda güvenlik ayarı veya kod değiştirilmedi.

## 4. SQL doğrulama seti — henüz çalıştırılmadı

Aşağıdaki sorgular başlangıçta hazırlanmış doğrudan DB kontrol taslaklarıdır. API'de yapılan benzer kontroller bunların çalıştırıldığı anlamına gelmez. Özellikle API filtrelerinin gizlediği kayıtları ve gerçek DB kısıtlarını görmek için korunmuştur.

### Q01 — Gerçek şema

Modelde olmayan bir DB constraint veya indeks bulunabilir. `TABLE_ROWS` kesin satır sayımı değildir; sonuç sayımı diye kullanılmaz.

```sql
SELECT DATABASE() AS schema_name, VERSION() AS server_version;
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME,
       REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION;
```

Bu ilk envanter trigger, CHECK gövdeleri ve delete/update FK kurallarının tam denetimi değildir; sürüm ve yetki görüldükten sonra bunlar ayrıca okunacaktır.

### Q02 — Öğretim yılı ve sınıf sözlüğü

```sql
SELECT id, sch_peri, start_date, finish_date, status
FROM sch_period ORDER BY start_date, id;
SELECT id, sch_classname, sch_classdesc
FROM sch_class ORDER BY id;
```

Yıl adlarının tekrarları, birden fazla `Active` yıl, ters tarih aralıkları ve sınıf adlarının seviye/şube anlamı incelenecek. Birden fazla aktif yıl tek başına veri bozukluğu sayılmayacak; gelecek yıl hazırlığı ihtiyacı kullanıcıyla konuşulacak.

### Q03 — Öğrenci durumları ve eksik yıllık kayıt

```sql
SELECT s.stu_situation, COUNT(*) AS student_count,
       SUM(COALESCE(e.enrollment_count, 0) = 0) AS no_enrollment,
       SUM(COALESCE(e.active_count, 0) = 0) AS no_active_enrollment,
       SUM(COALESCE(e.active_count, 0) > 1) AS multiple_active_rows
FROM student_tbl s
LEFT JOIN (
    SELECT studid_per_class, COUNT(*) AS enrollment_count,
           SUM(status = 'Active') AS active_count
    FROM stu_period_class GROUP BY studid_per_class
) e ON e.studid_per_class = s.id
GROUP BY s.stu_situation;
```

`Passive` kayıtların sayısı mezun veya ayrılmış öğrenci sayısı değildir. Birden fazla aktif satır da aynı yıl tekrarı ile farklı yıllardaki kayıtlar ayrıştırılmadan yorumlanmaz.

### Q04 — Yıl/sınıf başına kayıt dağılımı

```sql
SELECT e.stu_period_id, y.sch_peri, e.stu_class_id,
       c.sch_classname, c.sch_classdesc, e.status,
       COUNT(*) AS enrollment_rows,
       COUNT(DISTINCT e.studid_per_class) AS distinct_students
FROM stu_period_class e
LEFT JOIN sch_period y ON y.id = e.stu_period_id
LEFT JOIN sch_class c ON c.id = e.stu_class_id
GROUP BY e.stu_period_id, y.sch_peri, e.stu_class_id,
         c.sch_classname, c.sch_classdesc, e.status
ORDER BY e.stu_period_id, e.stu_class_id, e.status;
```

Satır sayısı ile tekil öğrenci sayısı ayrı gösterilecek. Status gruplarındaki tekil sayılar toplanarak yıl toplamı üretilmeyecek; aynı öğrenci birden fazla grupta bulunabilir.

### Q05 — Aynı öğrenci/yıl için birden fazla kayıt

```sql
SELECT COUNT(*) AS repeated_student_year_groups,
       COALESCE(SUM(n - 1), 0) AS additional_rows,
       COALESCE(SUM(class_count > 1), 0) AS groups_with_multiple_classes
FROM (
    SELECT studid_per_class, stu_period_id, COUNT(*) AS n,
           COUNT(DISTINCT stu_class_id) AS class_count
    FROM stu_period_class
    WHERE studid_per_class IS NOT NULL AND stu_period_id IS NOT NULL
    GROUP BY studid_per_class, stu_period_id
    HAVING COUNT(*) > 1
) d;
```

`additional_rows` otomatik silinecek satır sayısı değildir. Farklı sınıflı kayıtlar gerçek şube değişimi, düzeltme veya tekrar olabilir; eski modelde tarihli yerleşim geçmişi olmadığından kullanıcı doğrulaması gerekir.

### Q06 — Kopuk ilişkiler ve kopyalanmış adlar

```sql
SELECT COUNT(*) AS enrollment_rows,
       COALESCE(SUM(s.id IS NULL), 0) AS missing_student,
       COALESCE(SUM(y.id IS NULL), 0) AS missing_year,
       COALESCE(SUM(c.id IS NULL), 0) AS missing_class,
       COALESCE(SUM(y.id IS NOT NULL AND NOT
           (TRIM(e.stu_period) <=> TRIM(y.sch_peri))), 0) AS year_label_difference,
       COALESCE(SUM(c.id IS NOT NULL AND NOT
           (TRIM(e.stu_class_name) <=> TRIM(c.sch_classname))), 0) AS class_label_difference
FROM stu_period_class e
LEFT JOIN student_tbl s ON s.id = e.studid_per_class
LEFT JOIN sch_period y ON y.id = e.stu_period_id
LEFT JOIN sch_class c ON c.id = e.stu_class_id;
```

Ad farkı geçmişteki bir yeniden adlandırmanın izi olabilir; otomatik güncellenmez. Karşılaştırma DB collation'ına bağlıdır; tam yazım/Unicode incelemesi ayrıca yapılır. Eksik ilişki sayıları NULL hedefleri de içerir.

### Q07 — Öğretmen atamaları ve tekrarlar

```sql
SELECT period_id, status, COUNT(*) AS assignment_rows,
       COUNT(DISTINCT teacher_id) AS teachers,
       COUNT(DISTINCT class_id) AS classes,
       COUNT(DISTINCT lesson_id) AS lessons
FROM teacher_period GROUP BY period_id, status;

SELECT COUNT(*) AS repeated_assignment_groups,
       COALESCE(SUM(n - 1), 0) AS additional_rows
FROM (
    SELECT teacher_id, period_id, lesson_id, class_id, COUNT(*) AS n
    FROM teacher_period
    GROUP BY teacher_id, period_id, lesson_id, class_id
    HAVING COUNT(*) > 1
) d;
```

Öğretmen+sınıf+ders eşlemeleri atama ekranı ve veri tutarlılığı için incelenir; kullanıcı öğretmenlerde otomatik yükseltme istemediğinden bu sayımlar otomatik devir kuralı üretmez. İkinci sorgu farklı status'ları birlikte sayar; tekrarların aktif/pasif ayrımı ayrıca incelenir. Dönem bilgisi modelde bulunmadığı için veriden dönem ataması uydurulmaz.

### Q08 — Sınıf sorumlulukları

```sql
SELECT sch_period_id, class_id, status,
       COUNT(*) AS responsibility_rows,
       COUNT(DISTINCT teacher_id) AS responsible_teachers
FROM res_teach_class
GROUP BY sch_period_id, class_id, status
ORDER BY sch_period_id, class_id, status;
```

Bu sonuç Q04'teki kayıtlı sınıflarla karşılaştırılarak sorumlusuz sınıflar bulunacak. Birden çok sorumlu sonucu, yanlışlık veya yardımcı/vekil ihtiyacı olabilir; kesin hata etiketi konmadan iş kuralı sorulacak.

### Q09 — Program yılının eşleşmesi ve kapsamı

```sql
SELECT w.sch_period, w.status, COUNT(*) AS schedule_rows,
       COALESCE(y.year_matches, 0) AS matching_years
FROM weekly_schedule w
LEFT JOIN (
    SELECT sch_peri, COUNT(*) AS year_matches
    FROM sch_period GROUP BY sch_peri
) y ON y.sch_peri = w.sch_period
GROUP BY w.sch_period, w.status, y.year_matches;

SELECT id, name, start_time, end_time
FROM lesson_time ORDER BY start_time, id;
```

Sıfır eşleşme kopuk/bilinmeyen yıl; birden fazla eşleşme belirsiz yıl kimliği adayıdır. Saat aralıklarının pozitif olduğu ayrıca doğrulanır.

### Q10 — Gerçek saat aralığında olası öğretmen çakışmaları

Tablo büyüklüğü ve `EXPLAIN` sonucu uygun bulunursa çalıştırılacak. Gerekirse doğrulanmış tek öğretim yılıyla sınırlandırılacak.

```sql
SELECT a.sch_period, a.day_of_week,
       COUNT(*) AS overlapping_schedule_pairs,
       COUNT(DISTINCT a.teacher_id) AS affected_teachers,
       SUM(a.class_id <> b.class_id) AS different_class_pairs
FROM weekly_schedule a
JOIN weekly_schedule b
  ON a.id < b.id AND a.teacher_id = b.teacher_id
 AND a.sch_period = b.sch_period AND a.day_of_week = b.day_of_week
JOIN lesson_time ta ON ta.id = a.lesson_time_id
JOIN lesson_time tb ON tb.id = b.lesson_time_id
WHERE a.status = 'Active' AND b.status = 'Active'
  AND ta.start_time < ta.end_time AND tb.start_time < tb.end_time
  AND ta.start_time < tb.end_time AND tb.start_time < ta.end_time
GROUP BY a.sch_period, a.day_of_week;
```

Bu sonuç **çakışan satır çiftleri** sayısıdır; tekil ders veya öğrenci sayısı değildir. Birleşik sınıf dersi, kopya kayıt ve gerçekten ayrı ders ayrımı veride açık olmadığı için sonuçlar yalnız inceleme adayıdır. Programın geçerlilik tarihleri yoktur. Farklı yıl adları arasındaki takvim örtüşmesini bu sorgu ölçmez. Sıfır sonuç da birleşik ders özelliğinin desteklendiği anlamına gelmez: eski kayıt kontrolü bu ihtiyacı en baştan engelliyor olabilir.

## 5. Açık kalanlar ve görüşmenin sonraki adımı

Bu turda yıl geçişindeki kayıt farkları, sınıf eşlemeleri, aktif/pasif durumlar, atama/program ilişkileri, takvim ve not kategori etiketleri incelendi. Notların kendisi, yoklama kayıtları, veli ilişkileri, kişisel belgeler ve geçmiş yıl açık ödemeleri bu canlı veri çalışmasının kapsamına alınmadı.

Doğrudan DB erişimi gerektiren açık işler: gerçek kolon/indeks/FK/CHECK/trigger doğrulaması; öğrenci listesine ulaşmayan olası orphan satırlar; atama inner join'lerinin gizleyebileceği kayıtlar; öğretmen başına ilk satır dışındaki sorumluluklar; pasif programlar; hesap–personel eşleme tutarlılığı. **API'de sıfır hata bulundu** ile **bütün DB'de bu hata yok** aynı iddia değildir.

İlk ürün sorusu kullanıcı tarafından yanıtlandı: okul ayrılanları önce pasifleştirip kalanları belirliyor; yönetici daha sonra normal sınıfları topluca bir üst seviyeye geçirmeli. PRF'nin birinci sınıf şube dağıtımı sonradan ve ayrı yapılmalı; 12. sınıf mezuniyeti ayrıca değerlendirilip onaylanabilmeli. Ayrıntılar ve önerilen akış [kaynak raporun 17. bölümüne](./legacy-data-model-review.md) işlendi. Eski 64 kaydın her birinin ayrılma/mezuniyet nedeni bu genel açıklamayla geriye dönük belirlenmiş sayılmaz.

Sonraki kullanıcı kararı: devam eden 1–11 öğrencilerinin tamamı bir üst seviyeye geçer. Normal akışta sınıf tekrarı/akademik karar bekleme listesi kurulmayacak; çok nadir istisnalar öğrenci detayından manuel düzeltilecek. Geçmiş veride görülen sıra dışı eşlemeler, yeni üründe kapsamlı bir istisna modülü gerektirmiyor.

Şube devamlılığı kullanıcı tarafından doğrulandı: grup ve şube numarası korunur (`3 / 2 → 4 / 2`); normal yükseltmede elle şube eşlemesi istenmez. Mezuniyet akışı da onaylandı: **“Tümünü seç → Mezuniyet tarihi → Mezun et”**; tekrar etmesi gereken 12. sınıf öğrencisi seçim dışı bırakılabilir. Bu işlem yalnız seçilenleri mezun eder; seçim dışındakileri otomatik pasifleştirmez veya onlar için yeni yıl kaydı açmaz.

PRF yaklaşımı kullanıcı tarafından netleştirildi: devam etmeyen öğrenciler de olabiliyor ve birden fazla şubeye dağıtım yapılıyor. Bu yüzden yönetici öğrenciyi ve hedef sınıf/şubeyi manuel seçip kaydedecek; PRF otomatik yükseltmeye dahil edilmeyecek. Seçilmemiş öğrenciden otomatik ayrılma veya anaokulunda devam sonucu çıkarılmayacak. Önceki geçiş onayı/yerleştirme bekleme önerisi zorunlu ayrı bir sürece dönüştürülmeyecek.

Kullanıcı beş ana ayrılma nedenini onayladı: aile taşınması, okul ücreti/maliyet, başka okul tercihi, diğer, nedeni belirtilmedi/bilinmiyor. [Kaynak raporun 18. bölümünde](./legacy-data-model-review.md) karar ile isteğe bağlı alan/rapor önerileri ayrıldı. Mezuniyet ayrı tutuluyor; eski pasif kayıtlar bu onayla geriye dönük sınıflandırılmıyor.

Öğretmen görüşmesinde yön değişti: kullanıcı otomatik öğretmen yükseltme istemiyor, profesyonel manuel atama UI'si istiyor. İlkokul 1–4 öğretmeninin grupla ilerlemesi ve 5. sınıf öğretmeninin yeni 1. sınıfa dönebilmesi işleyiş bilgisidir; sistem kuralı yapılmayacak. Kullanıcı ilkokulda beden eğitimi, resim, müzik, İngilizce/dil eğitimi gibi derslere branş öğretmenlerinin de girdiğini doğruladı. Sınıf/sorumlu öğretmenliği ile ders bazında öğretmen atamaları ayrı tutulacak; ilkokulda da tek öğretmen varsayılmayacak. Güncel atama karar ve UI önerileri kaynak raporun 19. bölümündedir; sınıf sorumlusunun takip panelinde ihtiyaç duyduğu bilgiler henüz netleştirilmedi.

Sonraki ekran paylaşımı ve kullanıcı açıklamalarıyla haftalık program akışı netleşti: sınıf/şube seçimi → o sınıfa atanmış ders–öğretmen eşleşmesi → gün → saat → ekle. Öğretmen detayının yalnız o öğretmenin saatlerini göstermesi doğru kapsamdır, eksiklik değildir. Ortak dersler hem farklı seviyeler (`4 + 5`) hem aynı seviyenin şubeleri (`4/1 + 4/2`) arasında dönem boyunca sürer; nadir güncellemeler haftalık program sayfasından manuel yapılır. Bunlar yeni API/DB bulguları değil ürün görüşmesi kanıtlarıdır; ayrıntılar kaynak raporun 20. bölümündedir. Yeni UI ve ortak ders modeli uygulanmadı; haftalık hedef ders sayıları henüz yanıtlanmadı.

Kullanıcı daha sonra öğretmen ana sayfasını ve beş CTA'yı açıkladı. Yerel kod incelemesi aynı saat hücresine birden fazla sınıfın kendi butonlarıyla eklenebildiğini doğruladı; bu, canlı veride çakışan kayıt bulunduğu veya kayıt oluşturma kontrolünün birleşik dersi desteklediği iddiası değildir. Sınıfa özgü yoklama, işlenen ders/ödev, öğrenci yorumu, sınav planı ve materyal kayıtları kaynak raporun 21. bölümünde eşlendi. Yoklama butonu ders saati içinde olsa da mevcut yoklama modeli saat saklamaz ve yokluk kontrolü günlüktür. Bu incelemede yeni canlı GET/SQL veya veri yazma işlemi yapılmadı.

Kullanıcı yoklama eksikliğini doğrulayarak ders/saat bazlı takibi öncelikli gereksinim olarak belirledi: yok yazılma ve gerçek geliş saatleri, önceki durumun sonraki öğretmene görünmesi, aynı gün değişiklik yoksa devam etmesi, geldiğinde Late ve sonradan ayrıldığında ilgili dersten itibaren Absent kaydı. Teneffüsten dönüş gecikmeleri ayrı analiz edilebilmeli; geçmiş derslerin sonuçları yeni durumla silinmemeli. Kaynak raporun 22. bölümünde kullanıcı kararları ve önerilen zaman/kayıt ayrımları belgelendi. Kullanıcının eski sisteme yeni eklediğini söylediği aileye SMS CTA'sı ayrıca **kullanıcı beyanı / kodda doğrulanmadı** olarak kaydedildi; canlı mesaj veya sorgu yapılmadı. Yoklama uygulaması ve SMS entegrasyonu geliştirilmedi.

Son ürün görüşmesinde öğretmen UI'si için dersi başlatma ve yoklama/konu/ödev adımlarını takip etme önceliği belirlendi. Kullanıcı günlük bilgilerin 17:00'de e-posta raporuna girdiğini ve eksiklerin azaltılması gerektiğini açıkladı. Yerel `run.py` salt okunur incelendi: veli raporu topluyor, görünür görev tanımı 16:58 kullanıyor; canlı saat dilimi/dağıtım doğrulanmadı. Kullanıcının 17:00 işleyişi yeni tasarım hedefi olarak, yerel kod bilgisi ayrı kanıt olarak kaydedildi. Kesin adım zorunlulukları ve eksik/geç veri rapor politikası açık; kaynak raporun 23. bölümündeki öneriler henüz uygulanmadı.

Bu çalışmada canlı kayıt, uygulama kodu, DB şeması veya kullanıcı hesabı değiştirilmedi. Parola/token alınmadı; ham öğrenci/öğretmen yanıtları doküman veya veri dosyası olarak kaydedilmedi. Tarayıcı incelemesinde agent-browser rehberinin gözlem–işlem–yeniden gözlem akışı esas alındı; ilgili CLI bulunmadığından mevcut tarayıcı bağlantısı kullanıldı.
