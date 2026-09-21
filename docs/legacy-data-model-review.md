# HorizonEdu eski veri modeli ve okul işleyişi incelemesi

Tarih: 2026-09-19

Durum: Kaynak kod incelemesi `TAMAMLANDI`; yeni ürün tasarımı ve açık kararlar `ARAŞTIRMA`.

Kaynak incelemesinden sonra canlı API/panel verileri de okundu: **447 öğrenci, 1.051 yıllık kayıt, 797 görünür öğretmen ataması ve 668 aktif program satırı**. Sayımlar, yıl geçişleri ve 10 canlı bulgu [ayrı inceleme kaydındadır](./legacy-live-data-review.md). Bu belgedeki 27 bulgu kaynak kod değerlendirmesi olarak korunmuştur; hangilerinin canlı veride görüldüğü ek raporda ayrılmıştır. Doğrudan SQL/DB kısıt doğrulaması henüz yapılmamıştır.

## 1. Sonuç ve okuma rehberi

Eski sistemde okulun günlük faaliyetlerinin önemli bir bölümü modellenmiş: öğrenci dosyası, yıllık sınıf kaydı, öğretmen ders ataması, sınıf sorumlu öğretmeni, program, ders günlüğü, yoklama, notlar, veli bağlantıları ve ücret sözleşmeleri mevcut. Öğrencinin kalıcı kaydı ile yıl/sınıf kaydının ayrı tutulması ve sınıf sorumluluğunun ders öğretmenliğinden ayrılması korunması gereken doğru başlangıçlardır.

Temel güçlük, bu kavramların **zaman, durum ve sahiplik kurallarının yeterince ayrılmaması**. `Active/Passive`; öğretim yılının açık olması, öğrencinin okula devam etmesi, ders atamasının geçerliliği ve eski verinin listede gösterilmesi gibi farklı anlamları taşıyor. Birçok ekran hangi öğretim yılına baktığını açıkça belirlemek yerine ilk `Active` kaydı seçiyor. Bu yüzden yeni yıl hazırlığı, geçmişi koruma ve toplu işlem yönetimi kullanıcıya kalıyor.

Yeni akademik çekirdeğin şu ayrımları açıkça yapması önerilir:

1. Kalıcı öğrenci profili → öğretim yılına kayıt → tarihli sınıf/şube yerleşimi.
2. Öğretim yılı → o yılın dönemleri → takvim günleri.
3. Sınıf seviyesi → yılın şubesi → derse katılan grup.
4. Ders öğretmeni ataması → sınıf sorumluluğu → programdaki ders → gerçekleşen ders oturumu.
5. Yılın tamamlanması → sınıf geçme kararı → yeni yıl kaydı → mezuniyet veya okuldan ayrılma.
6. Akademik durum → giriş hesabının durumu → arşiv görünürlüğü → finansal bakiye.

Önce 3–7. bölümler okunabilir. 8–10. bölümler ek model/kod bulgularını, 11–14. bölümler önerilen tasarım ve kabul senaryolarını içerir. 15. bölümdeki sorular, sonraki görüşmelerin sırasıdır. Önerilen tablo ve alan adları taslaktır; bu rapor yeni şemanın onaylandığı veya uygulandığı anlamına gelmez.

## 2. Kapsam, yöntem ve kanıt sınırı

İncelenen referans bu çalışma alanındaki `horizonedu/backend/` klasörüdür. Model dosyasının gerçek yolu `app/modeller/models.py` şeklindedir; `app/models/` değildir.

- Model dosyasının tamamı: **46 SQLAlchemy model sınıfı, 316 kolon bildirimi ve 80 foreign key bildirimi**. Bunlar kaynak kod sayımlarıdır; canlı veritabanı tablo/kolon sayımı değildir.
- Öğrenci oluşturma, yıl/sınıf kaydı, pasifleştirme, öğretmen atama, sınıf sorumluluğu, program, takvim, yoklama, not, veli ve ödeme işlemlerinin ilgili route gövdeleri incelendi.
- Web ve mobilde aynı veriyi okuyan seçili endpoint'ler karşılaştırıldı. Kayıt ve program şablonlarında alanların kullanıcıya nasıl sunulduğu kontrol edildi.
- Yıl sonu durum betiği, uygulama factory'si ve günlük rapor üretimi incelendi. Arsimio'nun mevcut veri modeli belgeleri ve Prisma model envanteriyle karşılaştırıldı.
- Bu belgenin ilk aşaması statik kaynak incelemesidir. Sonraki canlı API/panel sayımları ek rapordadır. MySQL'e doğrudan bağlanılmadı; DB constraint/index kataloğu, tetikleyiciler ve production deployment'ın kaynakla birebirliği doğrulanmadı. Yerel Flask uygulaması veya betikler çalıştırılmadı. `create_app()` içinde `db.create_all()` bulunduğundan uygulamayı import ederek inceleme yapılmadı.
- İlgili kopyada `tests/` altında test dosyası ve sürümlü migration/SQL dosyası bulunamadı. Bu, başka sunucuda veya depoda bulunmadıkları anlamına gelmez.
- Gerçek öğrenci belgeleri inceleme kaynağı yapılmadı. Sonraki erişim kontrolünde `.env` ve yapılandırmadan yalnız DB bağlantı hedefi ayrıştırıldı; parola, token veya servis sırları rapora alınmadı.

**Kanıt etiketleri:** `KOD` kaynakta doğrudan görülen davranış; `ÇIKARIM` bunun koşula bağlı sonucu; `ÖNERİ` Arsimio için tasarım; `KARAR` kullanıcıyla netleştirilecek okul kuralı. Veri bozulması, kayıt kaybı veya yetkisiz erişimin canlıda gerçekleştiği iddia edilmiyor.

### Kaynak anahtarı

Aşağıdaki kısaltmaların yanındaki sayılar, incelenen kopyadaki bir tabanlı satır numaralarıdır. Örneğin `M:230–239`, model dosyasının ilgili satırlarını gösterir. Eski klasör Git dışında tutulduğundan kaynak bağlantıları bu yerel kopya mevcutken kullanılabilir.

| Kod | Kaynak |
| --- | --- |
| M | [Modeller](../horizonedu/backend/app/modeller/models.py) |
| ST | [Öğrenci işlemleri](../horizonedu/backend/app/blueprints/students/routes.py) |
| AD | [Yönetim ve öğretmen atamaları](../horizonedu/backend/app/blueprints/admin/routes.py) |
| SE | [Akademik ayarlar ve program](../horizonedu/backend/app/blueprints/setting/routes.py) |
| TE | [Öğretmen işlemleri](../horizonedu/backend/app/blueprints/teachers/routes.py) |
| PA | [Web veli işlemleri](../horizonedu/backend/app/blueprints/parents/routes.py) |
| MP | [Mobil veli işlemleri](../horizonedu/backend/app/blueprints/mobiles/parents_mob.py) |
| MS | [Mobil öğrenci işlemleri](../horizonedu/backend/app/blueprints/mobiles/student_mob.py) |
| MA | [Mobil giriş](../horizonedu/backend/app/blueprints/mobiles/auth_mob.py) |
| MD | [Mobil cihaz kaydı](../horizonedu/backend/app/blueprints/mobiles/device_mob.py) |
| FI | [Finans işlemleri](../horizonedu/backend/app/blueprints/finances/routes.py) |
| APP | [Uygulama factory'si](../horizonedu/backend/app/__init__.py) |
| RESET | [Toplu durum betiği](../horizonedu/backend/seed_status.py) |
| RUN | [Günlük öğrenci raporu](../horizonedu/backend/run.py) |
| UI-S | [Öğrenci yönetim şablonu](../horizonedu/backend/app/templates/admin_tem/student_list.html) |
| UI-P | [Ders programı şablonu](../horizonedu/backend/app/templates/setting_tem/weekly_schedule.html) |
| UI-T | [Öğretmen ana sayfası ve ders işlemleri](../horizonedu/backend/app/templates/teacher_tem/teacher_login.html) |

## 3. Eski sistem okulun işleyişini nasıl temsil ediyor?

### 3.1 Kavramların gerçek anlamı

| Eski kavram | Kaynakta görülen anlam | Ayrım ihtiyacı |
| --- | --- | --- |
| `student_tbl` | Kimlik, aile metinleri, iletişim, ilk kayıt tarihi/seviyesi ve genel durum | Kalıcı öğrenci profili; yıllık eğitim sonucu burada tek status'a sıkışmamalı |
| `stu_period_class` | Bir öğrencinin seçilen öğretim yılına ve sınıfa kaydı | Yıllık kayıt ile yıl içindeki sınıf değişimlerini ayırmak gerekir |
| `sch_period` | Adı, başlangıç/bitişi ve durumu olan akademik zaman aralığı | Kullanım bağlamında öğretim yılı; ayrı yarıyıl/dönem tablosu yok |
| `school_week_day.semester` | Takvim gününün `1st Semester` / `2nd Semester` etiketi | Tarih sınırları ve durumu olan gerçek dönem kaydı değil |
| `grade_periods` | Notun dönem/kategori etiketi | Akademik dönemle açık FK ilişkisi bulunmuyor; doğrudan `terms` kabul edilmemeli |
| `sch_class` | Sınıf adı ve kademe/açıklama | Seviye, şube, yıl ve derslik birbirinden ayrılmamış |
| `sch_lessons` | Ders adı kataloğu | Yıl/şube için açılan ders ve haftalık saat ihtiyacı ayrıca modellenmeli |
| `teacher_period` | Öğretmen + yıl + ders + sınıf ataması | Programdaki gün/saat atamasından farklı; dönem ve geçerlilik tarihleri eksik |
| `res_teach_class` | Öğretmen + yıl + sorumlu sınıf | Ders atamasından ayrı olması doğru; görev tipi ve görev süresi eksik |
| `weekly_schedule` | Bir sınıf için haftanın günü, saat dilimi, ders, öğretmen ve yıl adı | Tek katılımcı sınıf; yıl adı metin, gerçek yıl FK'si ve sürüm/geçerlilik yok |
| `current_tbl` | Personel/öğretmen ve şirket/tedarikçi için ortak cari kart | Eğitimci kimliği ile ticari muhatap birbirine karışıyor |
| `admin` | Yönetici dışında öğretmen ve öğrenci giriş hesapları da burada | Tablo adı işlevini yansıtmıyor; profil türü grup metnine bağlı |

Kaynak: M:10–168, 230–289, 442–508, 605–641, 838–983, 1181–1209; SE:349–407; ST:683–714; FI:142–199.

`KOD`: Bu 46 model içinde okul/tenant modeli ve `school_id` alanı bulunmuyor. İlişkiler tek okul bağlamında kurulmuş. Yeni akademik kayıtlar, Arsimio'nun mevcut okul sahipliği ve üyelik modeline bağlanmalı; eski tablolardaki küresel ID veya ad eşitliği farklı okullar arasında ilişki kurma gerekçesi olmamalı.

### 3.2 Öğrenci kaydı: mevcut işlem zinciri

1. **Kişi dosyası açılır.** `/new_student` kimlik ve iletişim alanlarını `student_tbl` içine yazar, öğrenciyi `Active` yapar. Aynı işlemde yıllık sınıf kaydı veya veli ilişkisi oluşmaz. Öğrenci profilinde ayrıca başlangıç parola hash'i üretilir. `ST:30–95`.
2. **Kayıt/giriş formu bilgileri ayrı tutulur.** `stu_fletaparaqit`; sınıf, yıl, okul, başarı, servis ve indirim bilgilerini metin olarak alır. Kaydın yıllık sınıf kaydıyla doğrudan ilişkisi yoktur. `M:407–434; ST:425–447`.
3. **Öğrenciye yıl ve sınıf atanır.** Yönetici öğrenci başına yıl/sınıf seçer. `stu_period_class` içine yıl ve sınıf ID'leriyle birlikte adları ve yılın o anki status'u kopyalanır. `ST:683–721`.
4. **Giriş hesabı ayrı açılabilir.** Öğrenci hesabı `admin` tablosuna yazılır; `admin_empID` öğrenci ID'si olarak kullanılır. Dolayısıyla profildeki parola alanıyla kullanılan giriş hesabı aynı veri kaydı değildir. `ST:310–411; MA:44–72`.
5. **Veli hesabı ve çocuk bağlantısı ayrıca kurulur.** Öğrenci kartındaki anne/baba metinleri otomatik olarak `parent_student` ilişkisine dönüşmez. `PA:360–401, 454–473`.
6. **Ücret protokolü açılır.** İlk bulunan aktif yıl/sınıf kaydından yıl alınır; o öğrenci ve yıl için protokol kontrolü yapılır. `ST:764–818`.
7. **Hizmet/ücret kalemleri ve taksit planı eklenir.** İndirim yüzdesiyle tutar hesaplanır; taksitler ve tahsilatlar ortak hareket tablosuna yazılır. `ST:884–920, 962–1001, 1119–1168`.

`ÇIKARIM`: Bu adımlar ayrı isteklerle kaydedildiği için kişi dosyası açılmış, fakat sınıfı, veli bağlantısı veya sözleşmesi eksik öğrenci bulunması mümkündür. Bunun canlıda ne kadar olduğu ölçülmedi. Yeni kayıt ekranında adımların ilerleme durumu gösterilmeli; eksiklik ile okuldan ayrılma aynı “pasif” anlamına gelmemeli.

### 3.3 Akademik hazırlık: mevcut işlem zinciri

1. `sch_period` oluşturulur; yeni kayıt doğrudan `Active` olur.
2. Yıldan bağımsız sınıf ve ders katalogları tanımlanır; sınıflara dersler bağlanır.
3. Personel kartı açılır. Öğretmen listesi bölüm adının `Mësues` olmasına göre oluşturulur.
4. Öğretmen + yıl + ders seçilerek birden fazla sınıfa atama yapılabilir. **Mevcut akış çoklu sınıf seçimini zaten destekliyor.** İlk incelemedeki önceki yıldan devir önerisi, sonraki kullanıcı görüşmesinde otomasyon yerine daha iyi manuel atama UI'si olarak değiştirildi (bölüm 19).
5. Sınıf sorumlu öğretmeni ayrıca tanımlanır.
6. Sınıf, öğretmen/ders, gün ve saat seçilerek program satırı oluşturulur.
7. İki yarıyıl için girilen tarihlerden hafta içi takvim günleri üretilir.
8. Öğretmen, program/takvim bağlamında ders günlüğü, ödev notu, yorum, yoklama ve not kaydeder.

Kaynak: SE:51–79, 247–269, 349–512; AD:567–623, 765–799, 878–915; TE:330–379, 464–554, 599–658, 967–1021.

### 3.4 Ana ilişkiler ve kopuk bağlantılar

| Kaynak → hedef | Mevcut bağ | Sonuç |
| --- | --- | --- |
| Öğrenci → yıllık sınıf kaydı | `stu_period_class.studid_per_class` FK | Doğru bir 1:N başlangıç |
| Yıllık sınıf kaydı → yıl / sınıf | `stu_period_id`, `stu_class_id` yalnız integer | İlgili yıl/sınıfın varlığı model düzeyinde garanti edilmiyor |
| Veli ↔ öğrenci | `parent_student` ile N:N, iki FK | Çift tekilliği ve ilişkinin türü/geçerliliği yok |
| Öğretmen → ders ataması | `teacher_period.teacher_id` → `current_tbl` | Aynı hedef şirketleri de içeriyor; FK öğretmen olmayı kanıtlamıyor |
| Ders ataması → yıl / ders / sınıf | Üç FK | Atama doğru bir başlangıç; nullable alanlar ve birleşik tekillik eksik |
| Sorumlu öğretmen → yıl / sınıf / personel | Üç zorunlu FK | Görev tarihçesi ve türleri eksik |
| Program → ders ataması | Bağ yok; öğretmen/ders/sınıf yeniden tutuluyor | Atama silinse/değişse program kendiliğinden tutarlı kalmıyor |
| Program → yıl | `sch_period` String | Yıl yeniden adlandırılınca metin kopyası eski kalabilir |
| Günlük ders / yorum / materyal / sınav / ödev notu → takvim günü | `day_week_id` FK | Yıla dolaylı erişim var; ayrıca tutulan `date` ile aynı gün olma kuralı yok |
| Yoklama → gerçekleşen ders / saat / yıllık öğrenci kaydı | Bağ yok | Aynı dersten iki saat ve tarihsel sınıf üyeliği belirsiz |
| Not → öğrenci / sınıf / ders / yıl / not kategorisi | Ayrı FK'ler | Birbirleriyle uyum ve öğrencinin o dersin katılımcısı olduğu garanti değil |
| Öğrenci → sözleşme/protokol → ücret/taksit | FK'lerle hiyerarşi | Alt kayıtlarda ayrıca öğrenci FK'si var; iki öğrenci referansının eşitliği korunmuyor |
| `admin.admin_empID` → öğrenci veya personel | FK'siz integer, anlamı `admin_group` belirliyor | Aynı sayısal ID iki tabloda bulunduğunda yanlış profil seçilebilir |

## 4. Kullanıcının belirttiği altı ihtiyacın kök nedenleri

### B01 — Toplu sınıf yükseltme ve yeni öğretim yılına geçiş

**KOD:** `register_period_class` yalnız bir `student_id` alıyor. Öğrenci/yıl tekrarını uygulama sorgusuyla engelliyor; kaynak yıl, geçiş sonucu veya kaynak kayıt referansı almıyor. Modelde sıra numarası olan sınıf seviyesi, sonraki seviye ilişkisi ve yükseltme işlemi yok. `M:230–239, 442–446; ST:683–721`.

**Etkisi:** Sistem `3 → 4` ilerlemesini güvenilir biçimde hesaplayamıyor. Sınıf adı metninden çıkarım yapmak; okul öncesi, farklı adlandırma, şube değişimi ve kademe geçişinde yeterli değil. Yeni kaydı eklemek eski aktif kayıtları kapatmıyor. Birden fazla aktif yıl/sınıf kaydı varsa `.first()` kullanan ekranlar belirsiz kayıt gösterebilir.

**ÖNERİ:** Kaynak yıl + hedef yıl + seviye/şube eşleme + öğrenci bazlı sonuç içeren toplu yıl geçişi. Kalıcı öğrenci aynı kalır; geçmiş yıllık kayıt tamamlanır, hedef yılda yeni kayıt oluşur. İşlem özeti incelendikten sonra tek “Geçişi uygula” eylemi kullanılabilir.

**KARAR:** Öğrenci otomatik yükseltme için hangi koşullarda uygun? Sınıf tekrarı, kayıt yenilememe, nakil ve mezuniyet nasıl ayrılacak? Hedef yılın “aktif” olması bugünkü yılın kapatılmasını mı, yeni yılın kayıt alabilmesini mi ifade ediyor?

### B02 — Ders programı ve birleşik sınıflar

**KOD:** Program satırında tek `class_id` bulunuyor. Çakışma öğretmen + gün + `lesson_time_id` + `Active` üzerinden kontrol ediliyor; **tüm gün yasaklanmıyor, aynı saat dilimi yasaklanıyor**. Öğretmen kontrolünde yıl filtresi yok. Sınıf kontrolünde yılın metin adı var, status filtresi yok. `M:893–925; SE:452–493`.

**Etkisi:** Eski aktif yılın programı yeni yılı engelleyebilir. Aynı yıl adıyla pasif bırakılan sınıf programı yeniden eklemeyi engelleyebilir. İki sınıfın aynı öğretmenle aynı fiziksel derse katılması iki ayrı satır gerektirdiğinden ikinci satır reddedilir. Farklı saat ID'lerinin gerçek başlangıç/bitişleri çakışıyorsa eşit ID kontrolü bunu yakalamaz.

**Ekran/kayıt ayrımı:** Öğretmen ana sayfası, gelen programda aynı gün/saat için birden fazla satır varsa hepsini aynı hücreye ekler ve her sınıf için ayrı CTA üretir (`UI-T:560–602`). Kullanıcı bu çok sınıflı kullanımı doğruladı. Dolayısıyla “ekran iki sınıfı gösteremiyor” sonucu yanlıştır; incelenen kayıt oluşturma kontrolü ile listeleme yeteneği farklıdır. Canlıda bu satırların hangi kayıt yoluyla oluşturulduğu veya dağıtımdaki kodun yerel kopyayla aynı olduğu bu görüşmede doğrulanmadı.

**ÖNERİ:** Birleşik ders; tek program/oturum kaydı ve birden fazla katılımcı grup ile temsil edilmeli. İki bağımsız eşzamanlı ders ile tek ortak ders ayrılır. Normal şube kayıtları korunur; yalnız ilgili dersin katılımcıları birleşir. Sürekli birleşme için ders grubu, tek günlük birleşme için oturum istisnası kullanılabilir.

**UI:** Sınıf ve öğretmen görünümü arasında geçilen haftalık çizelge; uygun saatleri gösterme, çoklu hücreye yerleştirme/kopyalama ve ortak dersin tüm katılımcılarını gösteren tek kart. Sürükle-bırak yanında klavye/form yöntemi olmalı. Taslak program kaydedilip bütün çakışmalar denetlendikten sonra yayımlanmalı.

**KARAR:** Kullanıcı `4 + 5` ve `4/1 + 4/2` örneklerinde ortak dersin dönem boyunca sürdüğünü doğruladı; nadir değişiklikler manuel yapılır. Aynı saatteki sınıfların günlük CTA işlemleri ayrı bağlamlarını korumalıdır (20–21. bölümler). Seçili öğrenci grupları ve birden fazla öğretmen gibi ek kapsamlar henüz kararlaştırılmadı.

### B03 — Sınıf sorumlu öğretmeni ve genişletilmiş sınıf sayfası

**KOD:** `res_teach_class` ayrı bir model. Route, aynı yıl için bir sınıfa ikinci öğretmeni ve bir öğretmene ikinci sınıfı engelliyor. Kontroller görev tarihlerini veya status'u ayırmıyor. Ekranlar öğretmenin ilk aktif sorumluluğunu seçiyor. Not ve yorum sınıf sayfaları zaten var. `M:961–983; AD:720–799; TE:1091–1105, 1230–1264`.

**Etkisi:** Yıl ortası sorumlu değişimi, geçici vekil, yardımcı sorumlu veya aynı öğretmene birden fazla sınıf sorumluluğu geçmişi koruyarak ifade edilemiyor. Eski atamayı silmek fiilî çözüm haline gelebiliyor. Sınıf sorumlusu olmakla bütün branş notlarını değiştirebilmek arasında ayrıca yetki ayrımı gerekiyor.

**ÖNERİ:** Şube + öğretmen + görev tipi + başlangıç/bitiş + atayan kişi. Örnek görevler: ana sorumlu, yardımcı, geçici vekil. “Aynı anda bir ana sorumlu” okul kuralı olabilir; “bütün yıl yalnız tek atama satırı” zorunluluğu olmamalı. İlkokulda bir öğretmenin birçok dersi vermesi ayrıca ders atamalarıyla temsil edilmeli.

**Sınıf sayfası adayları:** Tarihe/yıla göre öğrenci listesi, yoklama özeti ve eksik yoklamalar, tüm derslerden not özeti, eksik notlar, veli iletişimleri, sınıf programı, izlenecek öğrenci notları, yıl sonu kararları. Her görünürlük ve düzenleme yetkisi ayrı belirlenmeli; öneriler henüz kapsam kararı değildir.

### B04 — Öğretmen atamalarını her yıl/dönem yeniden yapmak

**KOD:** `teacher_period`, öğretim yılına bağlıdır; ayrıca `term_id` veya tarih aralığı bulunmuyor. Bir ders için birden fazla sınıfa toplu ekleme var; önceki yıldan kopyalama veya yeni döneme uyarlama akışı yok. `M:838–866; AD:878–915`.

**GÜNCEL KARAR:** Kullanıcı öğretmenlerde otomatik yükseltme istemiyor; asıl ihtiyaç daha iyi, profesyonel bir manuel atama arayüzü. Önceki yıldan otomatik/taslak devir bu dilimin çözümü olarak alınmayacak. Yıl/dönem bağlamı açık, sınıf ve öğretmen bazında okunabilen, eksik atamaları gösteren ve yöneticinin seçtiği ilişkileri kolayca kaydetmesini sağlayan UI tasarlanacak. Atama ekranı, haftalık gün/saat programından ayrı tutulacak; ayrıntılar bölüm 19'da.

**Kritik ayrım:** Öğrenciler `3-A → 4-A` yükselirken öğretmen ataması değişmez. İlkokulda öğretmenin grupla ilerlemesi veya 5. sınıftan yeni 1. sınıfa dönmesi görülen işleyiştir, otomatik uygulanacak kural değildir. Sınıf/sorumlu öğretmenliği ile hangi dersin kim tarafından verildiği ayrı atamalardır; biri diğerini otomatik doldurmaz.

### B05 — Mezuniyet ve arşivleme

**KOD:** `toggle_student_status` öğrenciyi iki durum arasında değiştiriyor, ardından ID'si en büyük sınıf kaydını aynı duruma getiriyor. Mezuniyet sonucu, tarihi, mezun olunan yıl/program veya belge bilgisi bulunmuyor. `M:49–83, 230–239; ST:724–745`.

**Etkisi:** Mezun ile okuldan ayrılan öğrenci aynı görünüyor. Son eklenen kayıt gelecekteki yıla aitse, “öğrenciyi pasifleştir” işlemi bugünkü sınıf yerine gelecekteki kaydı değiştirebilir. Pasifleştirme, giriş hesabını ve açık finansal kayıtları kapsayan tanımlı bir süreç de değil.

**ÖNERİ:** Mezuniyet tarihli bir akademik sonuç/olay olmalı. Hangi okul/program seviyesini tamamladığı ve hangi yıllık kaydı kapattığı saklanmalı. Geçmişi görüntüleme, giriş hesabının sürmesi ve varsayılan aktif listeden çıkma ayrı kurallar olmalı. Mezun kişinin borcu sırf mezun oldu diye görünmez olmamalı.

**KARAR:** İlkokul/ortaokul bitişi aynı kurumda kademe geçişi mi, ayrı mezuniyet mi? Okulun son sınıfı her zaman 12 olarak sabitlenmemeli; programın bitiş seviyesi tanımlanmalı.

### B06 — Okuldan ayrılma nedenleri ve istatistik

**KOD:** Öğrencinin ayrılış tarihi, neden kodu, açıklaması, gidilen kurum veya yeniden kayıt olayı yok. `stu_situation` yalnız metin durum alanı. `M:49–83; ST:724–745`.

**ÖNERİ:** Ayrılma olayında en az öğrenci/yıllık kayıt, etkili tarih, işlem türü, neden kodu, isteğe bağlı açıklama ve işlemi yapan kişi bulunmalı. Örnek nedenler görüşme içindir: taşınma, başka okula nakil, ücret, memnuniyetsizlik, aile tercihi, açıklanmayan neden, diğer. “Diğer” için açıklama istenebilir. Nedeni bilinmeyen eski kayıtlar için ayrıca `UNKNOWN_LEGACY` gibi açık bir aktarım kodu gerekir.

**İstatistik:** Yıl, kademe, son şube ve neden bazında ayrılan kişi sayısı; mezuniyet ayrı seri. Yeniden kayıt yaptırmayan ile yıl ortasında ayrılan ayrılmalı. Oran verilecekse payda ve tarih aralığı tanımlanmalı. Ayrılıp geri gelen öğrenci yeni kişi olarak açılmamalı; yeni devam aralığı/olay kaydedilmeli.

## 5. Yıl ve durum yönetimindeki diğer temel sorunlar

### B07 — `Active` bir zaman modeli yerine kullanılıyor

**KOD:** Yeni öğretim yılı doğrudan aktif oluşturuluyor; başka aktif yılı kapatma veya tek aktif yıl constraint'i görünmüyor. Yıl güncelleme yalnız kendi adını/status'unu değiştiriyor. Öğrenci yıl kaydı oluşturulurken yılın status'u kopyalanıyor; sonradan yıl değişince eşzamanlı güncellenmiyor. `SE:51–103; ST:703–710`.

İlk aktif yılı/sınıfı seçen örnekler: `AD:752–761`, `ST:147–161, 768–772`, `TE:877`, `PA:52–69`. Dashboard toplam öğrenciyi kişi status'undan, sınıf dağılımını kayıt status'undan sayıyor (`AD:224–243`). Aynı kavram iki farklı veri kaynağına dayanıyor.

**ÖNERİ:** Okulun varsayılan görüntüleme yılı, yılın eğitim durumu ve yeni kayıt kabul etmesi ayrı tanımlansın. Gelecek yıl hazırlığı sürerken mevcut yılın ders/yoklama işlemleri devam edebilsin. Sorgular açık `academic_year_id` ve gerektiğinde tarih kullansın. Ekran yıl seçimi yetkilendirme yerine geçmesin.

### B08 — Toplu pasifleştirme yıl kapatma işlevinin yerini almış

**KOD:** `seed_status.py`, 15 modelin **bütün kayıtlarını yıl filtresi olmadan** `Passive` yapıyor; her modelden sonra ayrı commit ediyor. Öğrencinin kalıcı `stu_situation` alanını değiştirmiyor. `RESET:12–25`.

**ÇIKARIM:** Betik kullanılırsa akademik kayıt, not, yoklama ve finans hareketlerinin görünürlük durumu birlikte değişir. Yarıda hata olursa önceki tablolar commit edilmiş kalır. Ödenmemiş taksit raporu yalnız `Active` kayıtları okuduğundan eski yılın açık taksitleri listeden düşebilir (`FI:422–462`). Bu betiğin gerçekten ne zaman çalıştırıldığı doğrulanmadı.

**ÖNERİ:** Yıl kapatmak, o yılın değişiklik politikasını ve eğitim sonuçlarını kapatsın. Ödenmemiş borç, tarihsel yoklama ve notların durumunu topluca değiştirmesin. Devir çalışması için kaynak/hedef ve öğrenci bazlı sonuç kaydı tutulsun.

### B09 — Sınıf seviyesi, şube ve yıl aynı metin katalogla temsil ediliyor

**KOD:** `sch_class` yalnız ad ve açıklama içeriyor. Seviye sıralaması bazı ekranlarda sınıf adı parçalanarak; kademe sıralaması kod içindeki metin listesiyle yapılıyor. Kayıt formunda okul öncesi ve 1–12 seçenekleri sabit. `M:442–446; ST:110–128, 653–671; UI-S:550–566`.

**ÖNERİ:** Kademe/program, sıralı sınıf seviyesi, yılın şubesi ve fiziksel derslik farklı kavramlar olsun. “2024–2025 / 3 / A” ile “2025–2026 / 3 / A” ayrı şube kayıtlarıdır. “Aynı öğrenci grubu yeni yıl 4-A oldu” bir geçiş ilişkisidir; eski şube adını değiştirerek yapılmamalıdır.

### B10 — Yıl içinde şube değiştirme geçmişi yok

**KOD:** Öğrenci/yıl için ikinci `stu_period_class` kaydı route tarafından reddediliyor. Modelde yerleşim başlangıcı/bitişi yok. Yıl/sınıf kaydı için fiziksel silme endpoint'i var. `ST:511–526, 695–701`.

**Etkisi:** Ekimde 3-A'dan 3-B'ye geçen öğrencinin eylül sınıfı ve ekim sınıfı tarih üzerinden çözülemez. “Seçilen tarihte hangi sınıftaydı?” sorusu yerine bugünkü aktif sınıf kullanılırsa geçmiş ders içerikleri yanlış öğrenci grubuyla eşleşebilir. Veli günlükleri ve ödev sorguları bu aktif sınıf yaklaşımını kullanıyor (`PA:188–204; MP:266–294`).

**ÖNERİ:** Yıllık kayda bağlı tarihli şube yerleşimleri. Şube değişikliği önceki yerleşimi kapatıp yenisini açmalı; geçmiş not/yoklama silinmemeli. Normal şube üyeliğiyle seçmeli/birleşik ders grubu üyeliği ayrı olmalı.

### B11 — Takvim ve gerçek dönem modeli eksik

**KOD:** Takvim üretimi iki sabit yarıyıl adı ve pazartesi–cuma kabulü kullanıyor. Hafta numarası bütün tablo üzerinden `max(week)` ile alınıyor; yıl kapsamında başlamıyor. Her yarıyıl yardımcı fonksiyonda ayrı commit ediliyor. `SE:349–413`.

**Etkisi:** Birinci yarıyıl kaydolup ikinci yarıyıl hatası oluşabilir. Yeni yıl hafta sayacı önceki yıla bağlıdır. Tatil, telafi cumartesisi, özel çalışma günü ve farklı dönem sayıları doğrudan temsil edilmiyor. Öğretmen hafta sorguları da yıl filtresi kullanmıyor (`TE:38–89`).

**ÖNERİ:** Öğretim yılına bağlı gerçek dönemler; okul takviminde eğitim günü, tatil, sınav günü ve telafi gibi gün türleri. Takvim üretimi önizlenebilir ve tekrar çalıştırılabilir olmalı; hafta numarası açık bir okul/yıl kuralına dayanmalı.

## 6. Akademik işlemlerde veri doğruluğu

### B12 — Yoklama günlük yokluk ile ders bazlı gecikmeyi karıştırıyor

**KOD:** Yoklama modelinde ders saati/oturum ve yıllık kayıt FK'si yok. `Absent` kontrolü öğrenci+tarih, `Late` kontrolü öğrenci+tarih+ders+sınıf üzerinden yapılıyor. `Present` kayıtları atlanıyor. Yalnız `Present` gönderilen yolda fonksiyon açık bir başarı cevabına ulaşmıyor. `M:1022–1060; TE:464–554`.

**Etkisi:** Aynı gün iki matematik dersindeki gecikmeler ayırt edilemez. Yoklama alınmamış sınıf ile herkesin mevcut olduğu sınıf, veri yokluğu bakımından aynı görünür. Günlük yokluk ve ders bazlı durum tek raporda açıklamasız toplanırsa sayının ne ölçtüğü belirsiz olur. Mevcut kayıt düzeltme yerine silinebiliyor (`TE:556–572`).

**KULLANICI KARARI — ÖNCELİKLİ:** Mevcut yoklama yetersizdir; yeni yoklama **ders saatine bağlanacak**, yok/geç kaydının zamanı ve gerçek geliş saati saklanacak. Aynı günün önceki durumu sonraki ders öğretmenine görünür olacak; değişmedikçe devam edebilecek. Öğrenci geldiğinde `Absent → Late`, gün içinde ayrıldığında ilgili dersten itibaren `Absent` geçişi yapılabilecek. Teneffüsten geç dönüşler ayrı dersler için analiz edilebilmeli. Ayrıntılar ve kullanıcı senaryoları 22. bölümdedir; özellik henüz uygulanmadı.

**ÖNERİ:** Ders bazlı sonuç, gün içi durum hareketleri ve kaydın gözlem/devralma kaynağı ayrı tutulmalı. Sonraki dersin öğretmeni güncel durumu değiştirebilmeli; bu işlem önceki dersleri geriye dönük dönüştürmemeli. Herkes mevcut olduğunda da yoklamanın alındığı saklansın; devralınmış durum açıkça o derste kontrol edilmiş durumla aynı sayılmasın. Eski kayıt yokluğundan otomatik `Present` üretilemez. Kullanıcının sonradan istediği adımlı ders akışında yoklama kontrolü bulunacak (23. bölüm); önceki durumları taşımak, bütün öğrencileri her ders sıfırdan işaretlemeyi gerektirmez.

### B13 — Notun kimliği öğretmene bağlı; sınav ve not bağlantısı eksik

**KOD:** Not kaydı öğrenci+ders+sınıf+not dönemi+yıl yanında **öğretmen ID'siyle** aranıp güncelleniyor. Öğretmen değişirse aynı iş bağlamında farklı satır oluşabilir. `examination_dates` ile not arasında FK yok. `grade_periods` yıla/döneme bağlı bir takvim kaydı değil. Modelde not aralığı constraint'i yok. `M:1181–1271; TE:967–1015`.

**ÖNERİ:** Öğrencinin ders/değerlendirme sonucu, notu giren kişiden bağımsız tanımlansın; giren/değiştiren kişi ayrı saklansın. Sınav sonucu ile karne/dönem notu farklı nesneler olarak ele alınsın. Not ölçeği, eksik/mazeretli/değerlendirilmedi durumları, yayınlama ve dönem kilidi okul kuralına göre tanımlansın. Eski tam sayı notların anlamı doğrulanmadan yeni ölçeğe çevrilmesin.

### B14 — Sınıf sorumlusu not görünümünde yıl karışması mümkün

**KOD:** `get_student_grades` öğrenci+sınıf+`Active` ile arıyor, yıl filtresi yok. Ders listesi bulunmadığında notlardan ders türetme yolu da yıl filtresi kullanmıyor. `TE:1131–1177, 1185–1198`.

**Etkisi:** Sınıf tekrarı yapan veya eski aktif notları kalan öğrenci için farklı yılların notları aynı görünümde bulunabilir. Müfredatın kaynağı not girilmiş olması haline gelebiliyor.

**ÖNERİ:** Sorumlu öğretmenin panelinde açık yıl/dönem/şube kapsamı kullanılsın. Ders listesi o yıl açılmış derslerden gelsin; eksik yapılandırma görünür bir uyarı olsun.

### B15 — Aynı dersin bağlamı birçok tabloda tekrar kuruluyor

**KOD:** Ders günlüğü, yorum, materyal, sınav ve `teacher_detyres`; tarih, takvim günü, saat, ders, sınıf, öğretmen alanlarını ayrı ayrı taşıyor. Ortak gerçekleşen ders kaydı veya atamaya FK bulunmuyor. Günlük kayıt ve yorum yazma istekleri öğretmen ID'sini istemciden alıyor. `M:985–1017, 1063–1108, 1241–1271, 1292–1363; TE:330–372, 606–648`.

**Etkisi:** Bir kayıt pazartesi tarihini salı takvim günüyle veya o sınıfa atanmamış öğretmenle birleştirebilir; ayrı FK'ler bu kombinasyonu engellemez. Program değişikliği geçmişteki fiilî dersi açıklamaz. Vekil öğretmen ve iptal/telafi dersi birinci sınıf kavramlar değil.

**ÖNERİ:** Yayımlanmış programdan oluşan veya istisna olarak açılan ders oturumu; planlanan/gerçekleşen öğretmen, katılımcılar, tarih/saat ve iptal/telafi ilişkisini taşısın. Günlük, yoklama ve ilgili içerikler buna bağlansın. Genel materyal veya geleceğe dönük ödev gibi her içeriğin bir oturuma zorunlu bağlanması gerekmez.

### B16 — İki farklı ödev yaklaşımı bulunuyor

**KOD:** `teacher_homework` başlık, başlangıç/bitiş ve üç ek alanı; `student_homework` öğrenci bazlı tamamlama/not bilgisi içeriyor. `teacher_detyres` ise tarih/saat/sınıf bazlı düz ödev metni. Web ve mobilde incelenen veli ödev ekranları `teacher_detyres` okuyor; günlük e-posta raporu iki yaklaşımı da topluyor. `M:1111–1178, 1333–1363; PA:188–211; MP:466–501; RUN:73–115`.

**ÖNERİ:** “Ödev duyurusu”, “öğrenciye atanması” ve “teslim/değerlendirme” ayrımı netleştirilmeli. Üç sabit dosya alanı yerine çoklu ek ilişkisi kullanılmalı. Eski iki yapıda kayıtlar eşdeğer kabul edilip birleştirilmemeli; hangilerinin fiilen kullanıldığı ve teslim takibinin beklentisi sorulmalı.

## 7. Öğrenci, veli ve personel kimliğinin değerlendirilmesi

### B17 — Kalıcı profil, okul kaydı ve giriş hesabı birbirine karışıyor

**KOD:** `admin.admin_empID` hem öğrenciye hem personele işaret edebiliyor; FK ve tür güvenliği yok. `student_tbl` ve `admin` üzerinde ayrı parola alanları var. Web kullanıcı yükleyicisi aynı integer için önce `admin`, sonra `parent` arıyor. `M:10–18, 49–83, 138–168; APP:26–30; ST:310–411`.

**Somut hata yolu:** `delete_student_user` yalnız `admin_empID` ile ilk kaydı seçiyor; `admin_group='Nxënësit'` filtresi yok (`ST:396–403`). Personel ve öğrenci ID'leri çakışırsa yanlış türdeki giriş hesabı seçilebilir. Web oturum yükleyicisinde de `admin.id` ve `parent.id` çakışması halinde veli yerine admin nesnesi yüklenebilir. Bunlar kaynakta görülen koşullu hata yollarıdır; canlı hesaplar denenmedi.

**ÖNERİ:** Arsimio'daki küresel kullanıcı + okul üyeliği + okul profilleri yaklaşımı korunmalı. Öğrenci mezuniyeti bir akademik olaydır; kişinin diğer okuldaki üyeliğini veya veli/çalışan rolünü otomatik kapatmamalı. Profil oluşturulması otomatik bir giriş hesabı/parola zorunluluğu doğurmamalı.

### B18 — Aile verisi tekrarlı, veli ilişkisi fazla yalın

**KOD:** Öğrenci kartında anne/baba adı, iki telefon ve iki e-posta var. Ayrı veli tablosu ve çocuk bağlantısı bulunuyor. `parent_student` üzerinde ilişki tipi, öncelikli kişi, geçerlilik tarihleri, doğrulayan kişi veya erişim kapsamı yok; çift unique değil. `M:49–83, 138–177`.

**ÖNERİ:** İletişim kişisi ile giriş hesabını ayır; aynı veli birden fazla çocuğa bağlanabilsin. Anne/baba/yasal vasi/diğer ilişki türü; acil iletişim, bildirim alıcısı ve mali sorumlu gerekirse farklı kişi olabilir. Bu alanlar otomatik olarak birbirinden türetilmemeli. Bağlantının ne zaman başladığı/bittiği ve kim tarafından doğrulandığı saklanmalı.

**KARAR:** `stu_profession` alanının kime ait olduğu model ve “Profession” UI etiketiyle kesinleşmiyor. Öğrencinin mesleği ya da belirli bir velinin mesleği varsayılmamalı. Telefon/e-posta 1–2 sahipleri de teyit edilmeli.

### B19 — Öğretmen ve tedarikçi aynı cari modelde

**KOD:** `current_tbl` hem insan hem şirket alanları içeriyor. Şirketler bölüm alanındaki sabit bir kodla ayrılıyor. `current_emp_department` FK değil. Öğretmen listesi bölüm adının belirli bir metne eşit olmasına bağlı. `M:605–641; FI:142–199; AD:567–597`.

**Etkisi:** Bölüm adını değiştirmek öğretmen listesini etkileyebilir. Bir finansal şirket kaydı öğretmen FK'sinin hedefi olarak model düzeyinde geçerli sayılır. Öğretmenin birden fazla bölüm/görev ve branşını temsil etmek güçleşir.

**ÖNERİ:** Personel/öğretmen profili, görev/bölüm ataması ve tedarikçi ayrılmalı. Finansal cari bağlantı gerekiyorsa eğitim kimliğinden ayrı kurulmalı. Öğretmenlik bir bölüm adı metninin yan etkisi olmamalı. Çalışan ayrılınca eski ders ve not kayıtları korunmalı.

## 8. İlişkisel bütünlük, silme, erişim ve tutarlılık

### B20 — İş kuralları çoğunlukla “önce sorgula, sonra ekle” biçiminde

**KOD:** Model dosyasında primary key'ler dışında yalnız dört kolon `unique=True`: admin kullanıcı adı, öğrenci kişisel numarası, veli kullanıcı adı ve veli e-postası. Birleşik `UniqueConstraint`, `CheckConstraint`, açık ikincil index veya `ondelete` tanımı görülmedi. DB'nin kendisi PK/FK için index oluşturmuş olabilir; canlı DB kataloğu okunmadığından “hiç index yok” sonucu çıkarılamaz.

**Etkisi:** Aynı anda iki istek ikisi de “kayıt yok” sonucunu alarak aynı öğrenci/yıl, veli/öğrenci veya öğretmen atamasını ekleyebilir. Çok sayıda FK nullable olduğu için iş açısından eksik satırlar mümkün. Tarih sırası, not aralığı ve indirimin aralığı da DB düzeyinde ifade edilmemiş.

**ÖNERİ:** Kesinleşen kurallar hem servis doğrulamasında hem uygun DB constraint'lerinde tanımlanmalı. Çok okullu yeni modelde ilişkilerin aynı okula/yıla ait olması da korunmalı. Geçmişli görevler ve yerleşimler için yalnız unique kullanmak yeterli değil; tarih aralığı çakışması ayrıca ele alınmalı.

### B21 — Fiziksel silme ve cascade geçmişi etkiliyor

**KOD:** Öğrenci, sınıf, öğretmen/cari kart, takvim günü, yıl, not kategorisi ve protokol ilişkilerinin bir bölümünde `cascade='all,delete'` var. Sınıf/yıl/protokol ve yoklama kayıtları için fiziksel silme route'ları mevcut. `M:73–80, 271–273, 301–302, 447–455, 625–637, 936–940, 1186; SE:105–175; ST:857–870; TE:556–572`.

**Yorum:** Bunlar SQLAlchemy ORM cascade ayarlarıdır; hepsi DB `ON DELETE CASCADE` değildir. ORM üzerinden silme bağımlı kayıtları silebilir; başka FK'ler veya nullable olmayan kolonlar işlemi reddedebilir. Canlı şema bilinmeden “şu kayıtlar kesin silinir” denilemez. İş açısından sonuç öngörülebilir ve seçilen işlemle sınırlı olmalı.

**Ek kod ayrıntısı:** `sch_class`, `sch_lessons` ve `current_tbl` içinde `examination` ilişkisi iki kez atanmış; son bildirim öncekinin yerini alıyor ve önceki cascade tanımı geçerli kalmıyor (`M:450/457, 477/483, 631/639`).

**ÖNERİ:** Kullanılan akademik tanımları arşivle; geçmişi olan kayıtları fiziksel silmeden koru. Finans ve akademik düzeltmeler için iptal/ters kayıt veya sürüm kaydı kullan. Arşiv, mezuniyet ve eğitim yılı kapanışı farklı işlemler olarak kalmalı.

### B22 — Değişiklik geçmişi sınırlı

**KOD:** Model genelinde standart `created_by`, `updated_by`, `archived_at` veya sürüm numarası bulunmuyor. `created_at` yalnız görev ve cihaz tablosunda, `updated_at` cihaz tablosunda mevcut. Not ve yorum güncellemeleri eski değeri yerinde değiştiriyor. `M:1275–1288, 1368–1379; TE:630–634, 996–999, 1062–1080`.

**ÖNERİ:** Arsimio audit altyapısı yeni iş işlemleriyle aynı transaction'a dahil edilmeli. Not düzeltmesi, şube değişimi, ayrılma ve toplu devir ayrıca kullanıcının anlayacağı olay/geçmiş kayıtlarına sahip olmalı. Audit JSON'u tek başına öğrenci yaşam döngüsü modelinin yerini tutmaz.

### B23 — Kaynağa göre yetki kontrolü tutarlı değil

**KOD:** Bazı yazma route'larında `login_required` yok: öğrenci oluşturma, öğrenci giriş hesabı oluşturma, öğretmen atama, program oluşturma ve ödeme işlemlerinin bazıları. İncelenen factory ve route kayıtlarında bunları kapsayan genel bir `before_request` erişim kontrolü görülmedi. `ST:30–95, 328–367, 962–1001; AD:878–915; SE:452–493; APP:52–95`.

Giriş gerektiren bazı route'larda ise yalnız nesne ID'siyle işlem yapılıyor: örneğin not düzenlemede öğretmenin ataması kontrol edilmiyor (`TE:1060–1080`), web veli yoklamasında veli–öğrenci ilişkisi kontrol edilmiyor (`PA:73–95`). Mobilde `ensure_parent_student` ile korunan örnekler var; fakat günlük ders endpoint'i aynı kontrolü uygulamıyor (`MP:64–67, 150–175, 264–308`). Öğrenci oluşturma kodunda ortak bir başlangıç parolası ve veli oluşturma kodunda hash loglaması da bulunuyor (`ST:55–57; PA:377–380`); değerler bu rapora taşınmadı.

**ÖNERİ:** Yeni ekranların arkasındaki her okuma/yazma eylemi okul, güncel üyelik, izin ve ilgili öğrenci/sınıf/atama kapsamında kontrol edilmeli. Sorumlu öğretmen panelini büyütmek, bütün branş notlarını yazma yetkisi vermemeli. Bu bulgular yeni ürün sınırlarını belirlemek içindir; eski production üzerinde erişim denemesi yapılmadı.

### B24 — Web/mobil aynı veriyi farklı kurallarla okuyor

**KOD:** Web veli programı `Active` program satırlarını filtreliyor. İncelenen mobil veli/öğrenci programı ise aktif sınıfı bulduktan sonra o sınıfa ait bütün program satırlarını çekiyor; program status'u ve yılını filtrelemiyor. `PA:231–269; MP:426–457; MS:318–342`.

Mobil öğrenci login cevabındaki profil ID'si `student_tbl.id`; `/me` cevabındaki profil ID'si ise JWT içindeki `admin.id`. `MA:44–72, 83–103`. Cihaz kaydında kullanıcı ID/türü istek gövdesinden alınıyor ve JWT ile sahiplik eşleşmesi uygulanmıyor (`MD:21–59`).

**ÖNERİ:** Web ve mobil aynı iş servislerini, yıl kapsamını ve açık adlandırılmış kimlikleri kullansın: `user_id`, `student_profile_id`, `membership_id`. Cihaz sahibi sunucuda oturumdan belirlensin. Eski ID'ler yeni veri aktarımında kaynak tablo adıyla birlikte eşlensin.

## 9. Finans, belgeler ve diğer modüller

### B25 — Ücret sözleşmesi, taksit ve tahsilatın sorumlulukları netleşmeli

**KOD:** `stu_prices` öğrenci/yıl protokolüdür. Ücret kaleminde hem protokol hem öğrenci ID'si var; bunların aynı öğrenciyi işaretlemesi ayrıca korunmuyor. Tahsilat ve taksit aynı `Stu_pay_statement_tbl` tablosunda, farklı borç/alacak alanlarında tutuluyor. `M:293–403`.

Oluşturma akışı indirimli tutarı sunucuda `Decimal` ile hesaplıyor; güncelleme akışı tutarı doğrudan istemciden alıyor (`ST:884–915, 1003–1019`). Taksit üretimi sabit 11 alan üzerinden dönüyor (`ST:971–992`). “Ödendi” durumu ayrı bir toggle; tahsilat eklemekle taksite ödeme dağıtım bağlantısı yok (`ST:1087–1099, 1119–1162`). Boş protokol tarihi için gerçek tarih yerine sabit bir geçmiş tarih yazılıyor (`ST:795–802`).

**ÖNERİ:** Sözleşme, ücret kalemi, taksit/alacak, tahsilat ve tahsilatın taksitlere dağıtımı ayrı sorumluluklar olsun. Mevcut `Numeric` kullanımı korunmaya değer; para birimi ve yuvarlama kuralı açık olmalı. Kısmi ödeme, fazla ödeme, iade, iptal ve eski yıldan açık bakiye davranışı ayrıca tasarlanmalı. Mezuniyet/yıl geçişi otomatik sözleşme, borç silme veya indirim devri üretmemeli.

Bu bölüm muhasebe mevzuatı değerlendirmesi değil; kaynak kodun veri/işlem tasarımı incelemesidir.

### B26 — Gider ve bütçe ilişkisinin kullanımı tutarsız

**KOD:** `current_move` modelinde yıl FK'si var, fakat incelenen gider oluşturma route'u `period_id=None` yazıyor ve aynı tutarı debit ile credit alanlarının ikisine atıyor (`M:747–758; FI:376–399`). Bütçe ise yıl ve gider grubuna bağlı (`M:581–601`).

**ÇIKARIM:** Yıl bazında bütçe–gerçekleşen karşılaştırması eksik kalabilir; net bakiye debit-credit üzerinden hesaplanırsa bu yeni hareketler sıfır net üretir. Bunların bilinçli “gider ve aynı anda ödeme” kaydı mı olduğu okulun muhasebe işleyişiyle teyit edilmelidir. Rapor, canlı hesap bakiyelerinin yanlış olduğunu iddia etmez.

### B27 — Dosya, bildirim ve iletişim verisinin yaşam döngüsü eksik

- **Belgeler:** Fotoğraf/belge modellerinde dosya adı ve türü var; çoğunda yükleyen, boyut, checksum, erişim sınıfı ve sürüm yok. Öğrenci belgesi normalize edilmiş özgün dosya adıyla ortak klasöre kaydediliyor; çakışan ad için benzersiz anahtar üretilmiyor. İndirme endpoint'i dosyanın hangi öğrenciye ait olduğunu doğrulamıyor. `M:189–228, 710–744, 786–833; ST:540–568, 609–639`. Yeni modelde okul/sahip bağlantılı dosya kaydı ve kontrollü indirme gerekir; aynı adlı iki dosya birbirini ezmemeli.
- **Bildirim:** Günlük rapor veli bağlantılarından alıcı buluyor; bu korunabilir. Ancak gönderim denemesi/sonucu ve öğrenci-veli-gün bazlı tekrar önleme için model görünmüyor. Zamanlayıcı süreç içi bayrakla başlıyor; çoklu süreçte birden fazla çalışması mümkündür, canlıda olup olmadığı ölçülmedi. `RUN:44–149, 175–186`. Yeni sistemde bildirim tercihleri ve teslim geçmişi açık modellenmeli.
- **Mesajlaşma:** `chat_messages` öğrenci/öğretmen FK'leri yanında türsüz sender/receiver integer'ları ve tek `is_read` içeriyor. Konuşma katılımcısı, kullanıcı bazlı okunma veya veli alıcısı ilişkisi yok. `M:1394–1405`. Gerçek kullanım teyit edilmeden yeni mesaj modeline birebir taşınmamalı.
- **Servis:** `stu_fletaparaqit.stuflet_transporti` metni mevcut; incelenen 46 modelde rota, durak, araç, şoför ataması, sefer veya biniş/iniş modeli yok. Bu metinden gerçek servis operasyon geçmişi üretilemez.

## 10. Tam tablo envanteri

Bu envanter 46 modelin tamamını kapsar. Kolon listeleri kritik iş alanlarını gösterir; 316 kolonun birebir yeni şemaya aktarılacağı anlamına gelmez. Satır numarası modelin başlangıcıdır.

### 10.1 Öğrenci ve kimlik — 10 model

| Model / satır | Kritik alanlar ve ilişkiler | Değerlendirme |
| --- | --- | --- |
| `admin` / 10 | username, ad/soyad, group, situation, empID, hash | Ortak kullanıcı/üyelik modeline eşle; profil türü belirsizliğini çöz |
| `student_tbl` / 49 | kayıt tarihi/seviyesi, kişisel no, ad/soyad, aile, doğum, iletişim, situation, hash | Kalıcı öğrenci profili; durum, giriş ve aile bağlantıları ayrılmalı |
| `parent` / 138 | username, e-posta, hash, ad/soyad | Veli profili ve giriş hesabı ayrılmalı |
| `parent_student` / 164 | parent_id, student_id | N:N doğru; çift tekilliği, ilişki türü ve geçerlilik eklenmeli |
| `student_photo` / 189 | imgfile, imgtype, öğrenci FK | Ortak dosya modeli; birincil fotoğraf seçimi |
| `stu_attached` / 208 | açıklama, filename/type, öğrenci FK | Belge türü, sahiplik, yükleyen ve sürüm |
| `stu_period_class` / 230 | yıl ID/ad, status, sınıf ID/ad/açıklama, öğrenci FK | Yıllık kayıt + tarihli yerleşim; eksik FK'ler |
| `stu_fletaparaqit` / 407 | sınıf, yıl, okul, başarı, servis, indirim, öğrenci FK | Kayıt formu geçmişi; anlamları teyit ederek yapılandır |
| `tasks` / 1275 | açıklama, completed, created_at, user_id | Kullanıcı FK'si ve okul sahipliği eksik; kişisel görev mi okul işi mi karar |
| `device_token` / 1368 | user_type/id, platform, cihaz/token, sürüm, tarihler | Oturumdan sahiplik ve token yaşam döngüsü |

### 10.2 Akademik yapı — 9 model

| Model / satır | Kritik alanlar ve ilişkiler | Değerlendirme |
| --- | --- | --- |
| `sch_period` / 264 | sch_peri, start/finish, status | Öğretim yılı; dönem, güncel yıl ve kayıt açıklığı ayrımı |
| `sch_class` / 442 | classname, classdesc | Seviye, yılın şubesi, program/kademe ve derslik ayrımı |
| `sch_lessons` / 470 | lessonname | Ders kataloğu korunabilir; okul kapsamı ve kod |
| `sch_class_lessons` / 494 | sınıf FK, ders FK | Yıl/müfredat ve haftalık saat ihtiyacı eksik |
| `teacher_period` / 838 | öğretmen/yıl/ders/sınıf FK, status, task | Tarihli yıl/dönem ders ataması |
| `lesson_time` / 869 | name, start_time, end_time | Çan programı; tarih/kademe farklılıkları ve zaman çakışması |
| `weekly_schedule` / 893 | sınıf, gün, saat, ders, öğretmen, yıl metni, status | Yıl/dönem, sürüm, grup katılımı, oda ve geçerlilik |
| `school_week_day` / 927 | week, date, day, semester, yıl FK, status | Takvim günü; tatil/istisna ve yıl kapsamında tekillik |
| `res_teach_class` / 961 | sınıf/öğretmen/yıl FK, status | Tarihli sorumluluk ataması ve görev türü |

### 10.3 Eğitim kayıtları — 11 model

| Model / satır | Kritik alanlar ve ilişkiler | Değerlendirme |
| --- | --- | --- |
| `teacher_daily_task` / 985 | tarih/takvim/saat/ders/sınıf/öğretmen, daily_text | Gerçekleşen dersin konu/günlük kaydı |
| `student_attendance` / 1022 | tarih, öğrenci/ders/sınıf/öğretmen, status/reason, okundu | Yoklama oturumu, açık kapsam ve düzeltme geçmişi |
| `teacher_comments` / 1063 | ders bağlamı, öğrenci, metin, puan, kategori, status | Kategori kataloğu, görünürlük, geçmiş; puan sistemi okul kuralı |
| `teacher_homework` / 1111 | başlık, başlangıç/bitiş, detay, ders/sınıf/öğretmen, üç ek | Ödev + çoklu ek ve hedef kitle |
| `student_homework` / 1149 | öğrenci/ödev, status, completed, teslim tarihi, not, okundu | Atama ile teslim/değerlendirme ayrımı; tekrar denemeler karar |
| `grade_periods` / 1181 | period_grade, grade_name | Not kategorisi/raporlama dönemi sözlüğü; anlamını teyit et |
| `student_grades` / 1198 | öğretmen/öğrenci/ders/sınıf/kategori/yıl, not/tarih/status | Değerlendirme veya dönem sonucu; öğretmenden bağımsız kimlik |
| `examination_dates` / 1241 | ders bağlamı, exam_text | Sınav planı; sonuç ve ölçek bağlantısı eksik |
| `student_metarials` / 1292 | açıklama/dosya ve ders bağlamı | Öğrenme materyali; öğrenciye özgü dosya değil, sınıf/ders hedefli |
| `teacher_detyres` / 1333 | ders bağlamı, detyres_text | Günlük ödev duyurusu; diğer ödev yaklaşımıyla ilişki karar |
| `chat_messages` / 1394 | tarih/metin/ek, öğrenci/öğretmen, sender/receiver, okundu | Konuşma, katılımcı ve okunma kayıtları |

### 10.4 Personel ve kurumsal tanımlar — 9 model

| Model / satır | Kritik alanlar ve ilişkiler | Değerlendirme |
| --- | --- | --- |
| `director` / 526 | kişisel no/ad/status | Personel görevi olarak bağlanması değerlendirilmeli |
| `cont_departments` / 545 | departman, unvan | Departman ve unvan aynı şey değil; sabit dil metniyle rol belirlenmemeli |
| `cont_responsbilities` / 561 | sorumluluk metni, departman FK | Görev/sözleşme şablonu kapsamı teyit edilmeli |
| `current_tbl` / 605 | insan/şirket kimliği, iletişim, iki banka, bölüm, durum, işe giriş | Personel ile tedarikçi ayrılmalı; tarih türü düzeltilecek |
| `current_contract` / 684 | başlangıç/bitiş, brüt/net, personel FK | İş sözleşmesi; para birimi, sürüm ve tarih doğrulaması |
| `emp_pdfcont_tbl` / 710 | filename/type, sözleşme FK | Sözleşmeye ait belge modeli |
| `current_foto` / 728 | fotoğraf adı/türü, personel FK | Ortak dosya altyapısı |
| `emp_attached` / 786 | açıklama/dosya, personel FK | Personel belgesi ve erişim sınıfı |
| `emp_missingdays` / 808 | tarih, açıklama, karar, dosya, personel FK | İzin/devamsızlık; süre/tür/onay ve geçmiş karar |

### 10.5 Finans — 7 model

| Model / satır | Kritik alanlar ve ilişkiler | Değerlendirme |
| --- | --- | --- |
| `sherbimet` / 179 | hizmet adı | Ücret/hizmet kataloğu; ücret satırına gerçek bağlantı |
| `stu_prices` / 293 | protokol no/tarih, yıl/öğrenci FK | Eğitim sözleşmesi/protokol başlığı |
| `stu_cost_tbl` / 321 | açıklama, fiyat, yüzde indirim, tutar, öğrenci/protokol FK | Ücret kalemi; tek hesaplama kuralı ve ilişki uyumu |
| `Stu_pay_statement_tbl` / 351 | vade/tarih, taksit, debit/credit, ödeme/status, kopya yıl/sınıf, öğrenci/protokol | Alacak/tahsilat/dağıtım ayrımı; açık bakiye yıl kapanışından bağımsız |
| `expenses_grp` / 512 | gider grubu | Okul bazlı gider kategorisi ve arşivleme |
| `budget` / 581 | gider grubu/yıl FK, hedef tutar, status | Bütçe sürümü ve dönem kapsamı |
| `current_move` / 747 | tarih/fatura/açıklama, debit/credit, kategori/yıl/cari FK, status | Gider ile ödeme anlamlarını netleştir |

## 11. Arsimio için önerilen akademik çekirdek

Bu bölüm mevcut Prisma şeması değildir. Mevcut şemada 16 tenant/kimlik/oturum/yetki/audit modeli var; akademik modeller henüz eklenmemiş. Aşağıdakiler modül görüşmeleriyle netleştirilecek kavramsal sorumluluklardır; her satırın mutlaka ayrı tablo olması gerekmiyor.

| Kavram | Ne saklar? | Bağımlılık / temel kural |
| --- | --- | --- |
| `academic_years` | Yıl adı, başlangıç/bitiş, hazırlık/açık/kapalı durumu | Okula ait; varsayılan yıl seçimi ve kayıt alabilme ayrıca belirlenir |
| `terms` | Yılın dönemleri ve tarihleri | Kendi yılına ait; notlandırma pencereleri gerekiyorsa ayrıca |
| `education_programs` / `grade_levels` | Kademe, sınıf seviyesi, sıralama, ilerleme ve bitiş kuralları | Okul/program bağlamında; adından `+1` çıkarılmaz |
| `sections` | Belirli yılın belirli seviyesindeki şube | Örn. 2025–2026 / 4 / A; oda ayrı kavram |
| `student_profiles` | Kalıcı okul öğrenci dosyası | Giriş hesabı zorunlu değil; mevcut okul üyeliğiyle isteğe bağlı bağ |
| `enrollments` | Öğrencinin belirli yıl/programa kaydı ve sonucu | Terfiyle profil kopyalanmaz; yıllık kayıt açılır |
| `section_placements` | Kayıt → şube, başlangıç/bitiş ve değişim nedeni | Seçilen tarihte normal şube üyeliği belirlenir |
| `student_lifecycle_events` | Kayıt, ayrılma, geri dönüş, mezuniyet ve düzeltme | Etkili tarih ile sisteme kayıt zamanı ayrı |
| `exit_reasons` | Ayrılma nedeni kodu, etiketi ve kullanılabilirliği | Eski kodlar silinmez; etiket değişince rapor anlamı korunur |
| `guardian_profiles` / `guardian_student_links` | İletişim kişisi, ilişki türü, kapsam/geçerlilik | Kişi ile giriş hesabı ayrı; bağlantı doğrulanmış |
| `subjects` / `course_offerings` | Ders kataloğu ve yıl/dönem için açılmış ders | Müfredat, seviye, haftalık saat ihtiyacı |
| `teaching_groups` / üyelikleri | Derse katılan şubeler veya öğrenciler | Normal şubeyi bozmaz; üyelikler tarihli; aynı öğrenci tek sayılır |
| `teaching_assignments` | Ders/grup → öğretmen, görev ve geçerlilik | Yıl/dönem ve tarih kapsamı; ayrılan öğretmenin geçmişi korunur |
| `homeroom_assignments` | Şubenin ana/yardımcı/vekil sorumlusu | Ders verme atamasından ayrı; tarih çakışma kuralları |
| `timetable_versions` / `timetable_entries` | Taslak/yayımlanmış program ve tekrarlayan dersler | Geçerlilik tarihleri; öğretmen, grup, oda çakışmaları |
| `lesson_sessions` | Belirli tarihte planlanan/gerçekleşen ders ve katılımcılar | Birleşik, vekil, iptal ve telafi senaryoları |
| `attendance_sessions` / kayıtları | Yoklamanın alınma durumu ve öğrenci sonuçları | Günlük/ders bazlı kapsam açık; öğrenci/oturum tekilliği |
| `year_transition_runs` / öğeleri | Kaynak/hedef yıl, eşlemeler ve her öğrenci sonucu | Tekrar çalıştırma, hata raporu, audit ve kontrollü geri alma |

### 11.1 Ayrılması gereken durumlar

| Soru | Ait olduğu kavram | Örnek durum/sonuçlar; kesin liste değil |
| --- | --- | --- |
| Bu kişi giriş yapabilir mi? | Kullanıcı / okul üyeliği | Aktif, askıda, erişimi kapalı |
| Bu yıl kayıt alıyor mu? | Öğretim yılı / kayıt politikası | Hazırlık, kayıt açık, kayıt kapalı |
| Öğrenci o yıl eğitimde mi? | Yıllık kayıt ve devam aralıkları | Ön kayıt, devam ediyor, tamamlandı, ayrıldı, iptal |
| Yıl sonunda ne oldu? | Akademik sonuç | Üst sınıfa geçti, tekrar, programı bitirdi, karar bekliyor |
| Okuldan neden ayrıldı? | Yaşam döngüsü olayı + neden | Nakil, taşınma, diğer, eski kayıtta bilinmiyor |
| Standart listede görünsün mü? | Arşiv/görünüm filtresi | Aktif görünüm, geçmiş/mezun görünümü |
| Ödeme yükümlülüğü var mı? | Finansal alacak | Açık, kısmen ödendi, ödendi, iptal/iade |

Mezuniyet olayı ile `archived_at` aynı bilgi değildir. Öğrenci tekrar kaydolabilir veya aynı kişinin başka okulda/rolde erişimi sürebilir. Tarihsel sonuçlar bu değişikliklerle silinmemeli.

### 11.2 Yeni yıl geçişinin önerilen davranışı

1. **Hazırlık:** Hedef yıl/dönem/şubeler hazırlanır. Sistem uygun sonraki yılı önerebilir; belirsiz bir `Active.first()` seçimi yapmaz. Kaynak ve hedef ekranda açıktır.
2. **Otomatik eşleme:** Normal 1–11 geçişinde seviye bir artar, öğrenci grubu ve şube kodu korunur: `3 / 2 → 4 / 2`. Yönetici her yıl şubeleri elle eşlemez; sistem hedef yılın uygun şubesini belirler. Anaokulunun birinci sınıf şube dağıtımı bu kuraldan ayrıdır. Çok nadir öğrenci bazlı istisnalar detay sayfasından düzeltilir.
3. **Önizleme:** Devam eden 1–11 öğrencilerinin tamamı üst sınıfa geçecek olarak hazırlanır; normal akışta sınıf tekrarı veya akademik karar bekleme listesi yoktur. Mezuniyet değerlendirmesi, PRF yerleştirmesi, ayrılanlar ve hedefte kaydı olanlar ayrı gösterilir. Eksik hedef şube gibi işlemi engelleyen veri sorununun gerekçesi görünür. Kullanıcıyla netleşen kapsam 17. bölümdedir.
4. **Uygulama:** Bir onay eylemiyle seçilen geçişler yapılır. Kaynak yıllık kayıt geçmişi ve sonucu korunur; hedef yıl için yeni kayıt/yerleşim üretilir. Hedef yıl kaydı henüz başlamadıysa gelecekte geçerli olmalı; öğrencinin bugünkü sınıfı erken değişmemeli.
5. **Tekrar güvenliği:** Çift tıklama, ağ kesintisi ve iki yöneticinin aynı anda başlatması mükerrer kayıt oluşturmamalı. Aynı hedefte doğru kayıt varsa “zaten mevcut”; farklı kayıt varsa “çakışma” gösterilmeli.
6. **Sonuç:** Oluşan, atlanan ve düzeltme bekleyen kayıtlar listelenir. İşlem sahibi, tarihi, kaynak/hedef ve öğrenci bazlı karar saklanır. Önizlemeden sonra veri değiştiyse uygulamada yeniden kontrol edilir.
7. **Düzeltme:** Hatalı geçiş geri alınacaksa yalnız o işin oluşturduğu, henüz bağımlı akademik/finansal kayıt üretmemiş sonuçlar değerlendirilir. Bağımlılık varsa kayıtları silmek yerine nedenli düzeltme süreci gerekir.

Küçük okulda tek transaction yeterli olabilir; büyük işte parçalı işlem gerekiyorsa her öğrenci için atomik yazma ve kalıcı iş durumu gerekir. “Bütün öğrenciler geçti” mesajı kısmi başarıyı gizlememeli. Not, yoklama, tahsilat ve eski yıl borçları yeni yıla kopyalanmaz. Öğretmen ve sınıf sorumlusu atamaları öğrenci geçişiyle taşınmaz; yönetici bunları ayrı atama ekranında belirler. Haftalık programın yeni yıl hazırlığı da öğrenci geçişinden ayrı bir konudur; otomatik kopyalanacağı varsayılmaz.

**Örnek:** Öğrencinin 2024–2025 / 3-A kaydı “tamamlandı / üst sınıfa geçti” sonucuyla korunur. 2025–2026 / 4-A kaydı aynı öğrenci profiline bağlanır. 2024–2025 notları eski kayda bağlı kalır. Yeniden çalıştırma ikinci bir 2025–2026 kaydı açmaz.

### 11.3 Birleşik ders ve program çakışması kuralı

- “4-A + 4-B / matematik / pazartesi 09.00 / öğretmen X” tek ortak ders/oturum olarak temsil edilir; iki ayrı bağımsız rezervasyon değildir.
- Öğretmenin aynı gerçek zaman aralığında başka bağımsız bir derste olması engellenir. Aynı gün farklı saatler serbesttir.
- Kontrol ilgili yıl/dönem, program geçerlilik tarihleri ve gerçek saat aralıklarında yapılır; yalnız saat ID'sinin eşitliği kullanılmaz.
- Katılımcı öğrenci ve oda çakışmaları ayrıca değerlendirilir. Aynı öğrenci iki grubun üyesiyse birleşik derste tek katılımcı olur.
- Birleşik grubun yoklaması ortak oturumdan alınır; her öğrenci kendi yıllık kaydı/şubesiyle raporlanabilir.
- Geçici bir birleşme, öğrencilerin resmî şubelerini değiştirmez. Gerçek şube kapatma/birleştirme ise ayrı yerleşim işlemidir.
- Geçmiş program yayımlanmış sürümüyle korunur; yeni programın yayımlanması geçmişte gerçekleşmiş dersleri değiştirmez.

## 12. Öncelikli alan eşleme ve veri aktarımı notları

### 12.1 Öğrenci ve akademik alanlar

| Eski alan | Yeni karşılık / karar | Aktarım notu |
| --- | --- | --- |
| `student_tbl.id` | Kalıcı profil için legacy eşleme | Yeni UUID'nin yerine kullanılmaz; kaynak sistem+tablo+ID birlikte saklanır |
| `stu_persid` | Kişisel kimlik bilgisi | Öğrenci okul numarasından ayrılmalı; boşluk/format/ülke anlamı teyit |
| `stu_date_reg` | İlk kayıt tarihi | Her yılın kayıt tarihi diye bütün yıllara kopyalanmamalı |
| `stu_reg_class` | İlk kayıt seviyesi adayı | Güncel sınıf yerine kullanılmamalı; kullanıcı teyidi gerekir |
| `stu_name`, `stu_surname`, doğum alanları | Öğrenci profili | Unicode ve tarih korunmalı; ad benzerliğiyle kişi birleştirilmemeli |
| `stu_father`, `stu_mother` | Kaynak aile bilgisi; doğrulanırsa kişi ilişkisi | Tek başına ad, mevcut veli hesabıyla eşleşme kanıtı değildir |
| `stu_profession` | Sahibi/anlamı belirsiz | İnceleme kuyruğunda tutulmalı |
| `stu_phones1/2`, `stu_email1/2` | Türlü ve sahipli iletişim noktaları | Otomatik “1 baba, 2 anne” varsayımı yapılmamalı |
| `stu_gender` | Kodlu cinsiyet alanı | UI'daki `1/2` kodları açık dönüşüm sözlüğüyle eşlenmeli |
| `stu_situation` | Eski durum kanıtı | `Passive` otomatik mezun veya ayrılmış yapılamaz |
| `stu_period_id`, `stu_period` | `academic_year_id` | ID varlığı ve metin/ID uyumu kontrol edilmeli |
| `stu_class_id/name/desc` | Yılın şubesi + seviye/kademe | ID/ad çelişkileri sessizce seçilmemeli; metinler kaynak kanıtı olarak korunmalı |
| `stu_period_class.status` | Eski görünürlük/durum bilgisi | Yıllık eğitim sonucu değil; devir betiği tarafından değiştirilmiş olabilir |
| `teacher_period.*` | Yıl/dönem ders ataması | Öğretmen türü, müfredat ve geçerlilik teyit edilmeli |
| `res_teach_class.*` | Sınıf sorumluluk ataması | Eski tarih aralığı bilinmiyorsa kesin başlangıç/bitiş uydurulmamalı |
| `weekly_schedule.sch_period` | Yıl ilişkisi | Yıl adı tekil/eşleşebilir mi kontrol edilmeli |
| `school_week_day.semester` | Dönem ilişkisi | Yıl bazında tarih aralığıyla doğrulanmalı |
| `grade_periods.*` | Değerlendirme/raporlama sözlüğü | Gerçek örnek etiketler görülmeden anlam kesinleştirilemez |
| `student_attendance.*` | Eski yoklama olayı | Bilinmeyen saat/oturum ve “kayıt yok” durumu açıkça korunmalı |

### 12.2 Prova aktarımından önce yapılacak kontroller

Bu liste tam DB kabulü değildir. Öğrenci/yıl tekrarları, katalog eşleşmeleri ve seçili program/atama kontrollerinin API kapsamındaki sonuçları [canlı inceleme raporuna](./legacy-live-data-review.md) eklendi; doğrudan SQL/şema ve kalan alanların kontrolleri açık.

1. Model ile gerçek DB şeması karşılaştırması: tablolar, kolonlar, null kuralları, FK'ler, unique/index ve varsa trigger'lar.
2. Olmayan yıl/sınıf ID'sine bağlı öğrenci kayıtları ve ID/ad uyuşmazlıkları.
3. Öğrenci+yıl tekrarları, birden fazla aktif sınıf ve sınıfsız aktif öğrenciler.
4. Birden fazla aktif öğretim yılı; yıl ve dönem tarihlerinin çelişkileri.
5. Mükerrer veli–öğrenci bağlantıları; aynı iletişim bilgisinin farklı kişilere ait olma durumu.
6. `admin_empID` hedefinin grup türüne göre gerçekten bulunması; öğrenci/personel ve admin/parent ID çakışmaları.
7. Mükerrer veya eksik öğretmen/sorumlu atamaları; öğretmen alanında tedarikçi bulunması.
8. Program yıl adının yıl kataloğuna eşleşmesi; gerçek saat çakışmaları ve aynı sınıfa birden fazla program.
9. Günlük kayıtların `date` ile bağlı takvim gününün tarihinin uyuşması; öğrencinin o tarihteki sınıfı için kanıt bulunması.
10. Not tekrarları ve öğretmen değişiminden kaynaklanabilecek çoklu sonuçlar; not kategorilerinin anlamları.
11. Protokol–öğrenci, ücret–öğrenci, taksit–öğrenci uyumu; açık taksitler ve tahsilat toplamları.
12. Sabit/sahte varsayılan tarihler, serbest metin durum yazım farkları, eksik kişi bilgileri ve yinelenen dosya adları.
13. Kaynak dosyanın varlığı ve sahipliği; dosya içeriği kopyalanmadan önce erişim modeli.
14. Okul/yıl/seviye bazında öğrenci ve mezun/ayrılan sayıları; veri kaynakları bu ayrımı yapamıyorsa “bilinmiyor” raporu.

Aktarım sonunda sayım ve ilişki mutabakatı yapılmalı; yalnız toplam satır sayısı yeterli değil. Açık finansal tutarlar ve öğrenci/yıl dağılımları ayrı karşılaştırılmalı. Mükerrerleri otomatik silmek, `Passive` öğrencileri mezun yapmak veya bilinmeyen yoklamayı “mevcut” saymak aktarım kuralı olamaz.

## 13. Önerilen teslim sırası ve veri kuralları

| Sıra | Tasarım/geliştirme dilimi | Çıktı |
| --- | --- | --- |
| 1 | Okul kademeleri, yıl/dönem ve öğrenci kayıt sözlüğü | Kesin kavramlar; mevcut alanların anlamı ve kapsam |
| 2 | Öğrenci profili, yıllık kayıt, şube ve yerleşim geçmişi | Kayıt açma, şube değiştirme, ayrılma/geri dönüş/mezuniyet |
| 3 | Yeni yıl hazırlığı ve toplu geçiş | Kaynak/hedef önizlemesi, istisnalar, tekrar güvenliği ve sonuç raporu |
| 4 | Öğretmen ders ataması ve sınıf sorumluluğu | Otomatik yükseltme olmadan, görevleri ayıran ve manuel atamayı kolaylaştıran profesyonel UI; geçmişin korunması |
| 5 | Program ve birleşik ders | Grup katılımı, çakışma, taslak/yayın ve geçerlilik |
| 6 | Öncelikli ders/saat bazlı yoklama ve sınıf sorumlusu paneli | Öğretmenler arası gün içi durum devamlılığı, gerçek geliş zamanları, ders bazlı geçmiş ve yetkili görünüm |
| 7 | Not, ödev, finans ve diğer modüllerin ayrıntı görüşmeleri | Aynı yıl/kayıt/oturum temelini kullanan tutarlı modüller |

Bu sıra ürün keşfi önerisidir; mevcut pilot/güvenlik kabul durumlarını tamamlandı olarak değiştirmez. İlk adımın amacı bütün tabloları tek seferde kurmak değil, ilk çalışan kayıt ve devir akışının veri kurallarını kesinleştirmektir.

Yeni şemada özellikle şu kurallar tanımlanmalı:

- Okul sınırı tüm iş kayıtları ve hassas ilişkilerde korunur; başka okulun öğrenci, şube, öğretmen veya yılı birbirine bağlanamaz.
- Şube ve yıllık kaydın yılı/programı uyumlu olmalıdır. Bir öğrencinin aynı yıl yeniden girişi için tek yıllık kayıt altında devam aralıkları mı, birden fazla kayıt mı kullanılacağı kararlaştırılmadan aşırı kısıtlayıcı tekillik kurulmaz.
- Aynı anda tek normal şube kuralı varsa tarihli yerleşim aralıkları çakışamaz. Ders grubu üyelikleri bu kuraldan ayrı tutulur.
- Atama, dönem ve program geçerlilikleri okul takvimiyle uyumlu olmalıdır. Yıl kopyalamak geçmiş tarihleri körlemesine kopyalamaz.
- Öğrenci/oturum yoklaması ve değerlendirme sonucu için iş anlamına uygun tekillik belirlenir; kaydı giren öğretmen sonuç kimliği yerine geçmez.
- Yaşam döngüsü olayının etkili tarihi ile kaydı yapanın zamanı ayrılır; geriye dönük düzeltmeler görünür olur.
- Toplu işlem tekrarında mükerrer sonuç üretilmez; eşzamanlı işlemler ve önizleme sonrası değişiklikler sunucuda kontrol edilir.
- Kapalı yılda düzeltme gerekiyorsa yetkili, gerekçeli işlem yapılır; bütün yılın bütün kayıtları yeniden aktif yapılmaz.

## 14. Yeni akış için kabul senaryoları

Bunlar önerilen testlerdir; henüz uygulanmış veya geçirilmiş değildir.

| Senaryo | Beklenen sonuç |
| --- | --- |
| 2024–2025 / 3-A grubunu 2025–2026 / 4-A'ya geçir | Aynı öğrenci profilleri; yeni yıllık kayıtlar; eski yıl not/yoklaması değişmez |
| Aynı geçişi tekrar uygula / çift tıkla | İkinci kayıt oluşmaz; mevcut sonuç gösterilir |
| İki yönetici aynı öğrenciyi eşzamanlı geçirir | Tek tutarlı sonuç; çakışma açık raporlanır |
| Önizleme sonrası öğrenci okuldan ayrılır | Uygulama yeni durumu yeniden kontrol eder; öğrenci sessizce yükseltilmez |
| Hedef yılda farklı şubeye kayıt zaten var | Üzerine yazılmaz; çözülmesi gereken çakışma |
| Çok nadir bir öğrenci için geçiş sonrası manuel düzeltme gerekir | Öğrenci detayından hedef yıl kaydı düzeltilir; normal toplu geçişe tekrar/onay kuyruğu eklenmez, geçmiş kayıtlar korunur |
| Son seviye tamamlanır | Okul kuralına göre mezuniyet/kademe tamamlama; olmayan sonraki sınıf üretilmez |
| 12. sınıflarda tümünü seç, bir öğrenciyi çıkar, tarih gir ve mezun et | Yalnız seçilenler belirtilen tarihle mezun olur; seçim dışındaki öğrenci değişmez, otomatik 13. sınıf veya tekrar kaydı oluşmaz |
| PRF'den bir öğrenci seçip hedef yılın 1. sınıf şubesine kaydet | Yalnız seçilen öğrenci belirtilen şubeye kaydolur; diğer PRF öğrencileri otomatik aktarılmaz veya pasifleştirilmez, geçmiş kayıt korunur |
| Gelecek yıl hazırlanırken bu yıl devam ediyor | Bugünün programı, sınıfı, yoklaması ve ödev erişimi değişmez |
| Öğrenci yıl ortasında şube değiştirir | Önceki tarihte eski, sonraki tarihte yeni şube; geçmiş içerik korunur |
| Öğrenci ayrılır ve aynı yıl geri döner | Ayrılma nedeni/tarihi kaybolmaz; yeni devam aralığı belirlenir |
| Nedeni bilinmeyen eski pasif kayıt aktarılır | Mezuniyet/nakil uydurulmaz; bilinmeyen durum raporlanır |
| Aynı öğretmen aynı gün farklı saatlerde ders verir | İzin verilir |
| Aynı öğretmene aynı saatte iki bağımsız ders | Reddedilir |
| İki şube aynı ortak derse katılır | Tek ortak ders; birleşik katılım ve şube bazlı rapor |
| Saat ID'leri farklı fakat gerçek saatler kesişir | Gerçek zaman çakışması yakalanır |
| Eski ve yeni yılın aynı gün/saat programı | Tarih kapsamları kesişmiyorsa çakışma sayılmaz |
| Sorumlu öğretmen dönem ortasında değişir | Eski görev tarihi korunur; yeni görev ve erişim başlangıcı açık |
| Öğrenciler üst sınıfa geçirilir | Öğretmen/sınıf sorumlusu atamaları otomatik yükseltilmez, kopyalanmaz veya değiştirilmez |
| Yönetici sınıf sorumlusu atar | Bütün derslerin öğretmeni otomatik bu kişi yapılmaz; ders atamaları ayrı yönetilir |
| İlkokul şubesine sınıf öğretmeni yanında beden eğitimi, resim, müzik ve dil öğretmenleri atanır | Sorumlu kaydı korunur; her dersin öğretmeni ayrı seçilebilir, bir atama diğerlerini değiştirmez |
| Her öğrenci mevcut olan bir yoklama | Yoklamanın alındığı saklanır; alınmamış yoklamadan ayırt edilir |
| Aynı gün aynı dersten iki oturum | İki yoklama birbirinden bağımsız kaydedilebilir |
| İlk derste yok, ikinci derste değişiklik yok, üçüncü derste öğrenci gelir | İkinci öğretmen önceki yok durumunu/kaynağını görür; üçüncü öğretmen geliş saatiyle geç kaydı girer; ilk iki ders yok kalır |
| İlk dört derste mevcut öğrenci beşinci dersten itibaren yok | İlk dört ders mevcut kalır; beşinci derste yok ve kayıt zamanı görünür; sonraki derse önceki durum/kaynağı taşınabilir |
| Öğrenci aynı gün iki farklı teneffüsten geç döner | İki ayrı ders oturumuna bağlı gerçek dönüş zamanları ve iki gecikme olayı; tek günlük Late altında kaybolmaz |
| Geç gelen öğrenci bir sonraki derse zamanında katılır | Önceki geliş olayı korunur; sonraki ders yeni bir gecikme olarak sayılmaz; önerilen ders sonucu mevcut olur |
| Önceki dersin durumu devralınır, yeni öğretmen işlem yapmaz | Durum devamlılığı korunur; o öğretmenin yoklamayı kontrol/onayladığı uydurulmaz, kayıt kaynağı ayrılır |
| Sonraki ders öğretmeni geliş kaydı girerken eski ekran açıktır | Güncel sürüm kontrol edilir; eski ekran yeni gelişi sessizce yok durumuyla ezemez |
| Yeni okul günü başlar | Önceki günün yok/geç durumu yeni güne körlemesine taşınmaz; kayıt yokluğu mevcut kabul edilmez |
| Kullanıcı SMS CTA'sını bildirir | Özellik kullanıcı beyanı olarak kaydedilir; kod/provider doğrulanmış veya SMS gönderilmiş sayılmaz; durum devri SMS tetiklemez |
| Öğretmen aynı dersi iki kez başlatır veya ekranı yeniler | Tek ders başlangıç kaydı; mevcut ilerleme korunur, sayaç iki kez artmaz |
| Yoklama devralınır fakat öğretmen kontrol adımını tamamlamaz | Öğrenci durumları görünür; öğretmenin o dersteki yoklama adımı tamamlandı sayılmaz |
| Öğretmen ödev vermeyeceğini belirtir | Açık “Ödev yok” kararı; eksik ödev girişi veya otomatik verilmiş ödev sayılmaz |
| Ders başlatılır fakat konu yazılmaz | Başlatıldı fakat eksik; yalnız tıklama nedeniyle tüm ders tamamlandı sayılmaz |
| Ortak derste bir sınıfın işlemleri eksik kalır | Öğretmen için tek oturum; sınıf bazlı eksikler görünür, ortak oturum bütünüyle tamamlandı sayılmaz |
| Gün sonu rapor saatinden sonra eksik konu girilir | Geç tamamlandı zamanı korunur; önceden gönderilen raporun içinde varmış gibi gösterilmez, kendiliğinden ikinci e-posta gönderilmez |
| Seçilen tarihlerde öğretmenin uygun dersi yoktur | Performans oranı yok/uygulanamaz; yüzde sıfır başarısızlık veya sahte yüzde yüz sonucu üretilmez |
| Mezun öğrencinin ödenmemiş taksiti var | Finansal alacak görünmeye devam eder |
| Veli başka öğrencinin ID'sini gönderir | Web ve mobilde aynı şekilde reddedilir |
| Branş öğretmeni atanmamış dersin notunu değiştirir | Sunucuda reddedilir; sorumlu sınıfı okuma izni bunu aşmaz |
| İki okul aynı yıl/şube adını kullanır | Kayıt, devir, program ve raporlar okullar arasında karışmaz |
| Toplu iş yarıda kesilir veya geri alınır | Başarılı/başarısız öğeler belli; yeniden çalıştırma güvenli; bağımlı kayıtlar silinmez |

## 15. Soru-cevap görüşmelerinin sırası

Hepsi bir oturumda cevaplanmak zorunda değil. İlk görüşmede ilk dört madde, sonraki görüşmelerde kalan başlıklar ele alınabilir.

PRF'nin anlamı, devam edecek öğrencilerin belirlenmesi ve 1–11 öğrencilerinin tamamının bir üst seviyeye geçmesi kullanıcı tarafından açıklandı; güncel kararlar 17. bölümdedir. Aşağıdaki ilk görüşme soru listesi bu kararları yeniden belirsiz hale getirmez.

1. **Okul yapısı:** Hangi kademeler/programlar var? Her birinde seviyeler ve son sınıf nedir? Aynı kurumda bir üst kademeye geçiş nasıl adlandırılıyor?
2. **Yıl ve dönem:** Her okul aynı takvimi mi kullanır? Dönem sayısı nedir? Yeni yıl kayıtları mevcut yıl bitmeden açılıyor mu? “Aktif yıl” okul için tam olarak ne demek?
3. **Kayıt:** Aday/ön kayıt var mı? Bir öğrencinin okulun kayıtlı öğrencisi sayılması için hangi adım gerekir? `stu_reg_class`, kişisel numara ve `stu_profession` tam olarak neyi ifade eder?
4. **Terfi:** Normalde herkes bir üst sınıfa mı geçer? Sınıf tekrarı ve karar bekleme nasıl yönetilir? Şubeler korunur mu; bölünür/birleşir mi? Yenileme kararı akademik geçişten ayrı mı?
5. **Şube geçmişi:** Yıl içi şube değişimi, aynı yıl ayrılıp geri gelme ve farklı programa geçiş ne sıklıkta olur?
6. **Mezuniyet/ayrılma:** Mezuniyet seviyeleri, ayrılma nedenleri, etkili tarih ve geçmişe erişim kuralları neler? “Yenilemedi” ile “ayrıldı” nasıl ayrılır?
7. **Öğretmen atama UI'si:** Otomatik yükseltme olmayacağı ve kademe işleyişi 19. bölümde netleşti. Sınıf/sorumlu öğretmeni ve ders öğretmeni atamalarını ayrı yönetirken hangi görünüm ve seçimler günlük işi kolaylaştırır?
8. **Sorumlu sınıf:** Sorumlu, yardımcı ve vekil olabilir mi? Bir öğretmen birden fazla şubeden sorumlu olabilir mi? Hangi bilgileri okur, hangilerini değiştirir?
9. **Birleşik ders:** Farklı seviyeler (`4 + 5`) veya aynı seviyedeki şubeler (`4/1 + 4/2`) dönem boyunca ortak derse girebilir; nadir program değişiklikleri manuel yapılır. Bu yanıtlar 20. bölümde kayıtlıdır. Seçili öğrenci grupları, oda/kapasite ve birden fazla öğretmen ihtiyacı henüz kararlaştırılmadı.
10. **Yoklama/not:** Ders/saat bazlı yoklama, gerçek geliş zamanı ve öğretmenler arası gün içi devamlılık kullanıcı tarafından öncelikli ihtiyaç olarak netleştirildi (22. bölüm). Devralma/onay görünürlüğü, mazeret/izin ve not değerlendirme etiketlerinin ayrıntıları açık kalır.
11. **Veli/iletişim:** Telefon/e-posta alanlarının sahipleri kim? Akademik bildirim alıcısı, acil kişi ve mali sorumlu farklı olabilir mi?
12. **Finans/aktarım:** Eski yılların açık borçları, sözleşme yenilemesi, indirim ve taksit politikaları nasıl işler? Eski geçmişin hangi bölümü taşınacak, hangisi salt okunur arşiv kalacak?

## 16. İncelemenin kapanışı

En yüksek ürün önceliği **yıl/dönem + seviye/şube + yıllık öğrenci kaydı + tarihli yerleşim + yaşam döngüsü** sözlüğünü netleştirmektir. Bu temel, toplu sınıf yükseltme ve mezuniyet ihtiyacını çözerken öğretmen atamaları, program ve sınıf sorumlusu ekranlarının da tutarlı kurulmasını sağlar.

Bu çalışmada dokümantasyon üretildi ve sonrasında canlı API/panel verileri salt okunur incelendi. Eski Flask kaynağı, Arsimio uygulama kodu/şeması ve veritabanları değiştirilmedi. Bu belgedeki bulguların kaynağı kod incelemesidir; gerçek veri sayımları ek raporda, doğrudan DB denetimi ve yeni tasarımın uygulama testleri ise açık işlerdedir.

## 17. Kullanıcıyla netleşen yıl geçişi akışı — 2026-09-19

Bu bölüm ürün görüşmesi kaydıdır; model, ekran veya otomasyon uygulanmış değildir. Kullanıcının anlattığı okul akışı ile aşağıdaki tasarım önerileri ayrı tutulur.

### 17.1 Kullanıcının doğruladığı işleyiş

- **PRF = Parafillor = anaokulu.** Devam etmeyen öğrenciler de olabildiği ve birden fazla birinci sınıf şubesine dağıtım yapıldığı için geçiş manuel yönetilir: **“Öğrenciyi seç → Hedef yıl ve sınıf/şubeyi seç → Sınıfa kaydet”.** Kimin geçeceğini ve hedef şubesini okul belirler; PRF toplu otomatik yükseltmeye dahil edilmez.
- Okuldan ayrılan öğrenciler mevcut sistemde önce pasifleştirilir. Kalan öğrenciler belirlendikten sonra yönetici **“Sınıfları atlat”** eylemiyle normal sınıfları topluca bir üst seviyeye geçirmek ister.
- **Devam eden 1–11. sınıf öğrencilerinin tamamı bir üst seviyeye geçer.** Normal akışa sınıf tekrarı, notla geçiş koşulu veya öğrenci bazlı akademik karar/onay kuyruğu eklenmeyecek. Çok nadir bir istisna olursa yönetici öğrenci detay sayfasından ilgili kaydı manuel düzeltecek; bunun için ayrı bir iş akışı kurulmayacak.
- **Öğrenci grubu ve şube numarası korunur.** Örneğin `3 / 2` öğrencileri birlikte hedef yılın `4 / 2` şubesine geçer. Normal geçişte şube dağıtım/eşleme ekranı veya her yıl elle eşleme adımı gerekmiyor; PRF'nin sonradan birinci sınıfa dağıtımı bundan ayrıdır.
- Bu toplu işlem için her öğrenciye yeniden tek tek yıl/sınıf seçmek veya ayrıca veli onayı toplama adımı tanımlamak gerekmiyor. Ayrılacak/devam edecek öğrencilerin ayrımı önce okul tarafından yapılır.
- **12. sınıf mezuniyeti: “Tümünü seç → Mezuniyet tarihi → Mezun et”.** Kullanıcı bu toplu akışı onayladı. Tekrar etmesi gereken öğrenci seçim dışı bırakılabilir; yalnız seçilenler belirtilen tarihle mezun edilir. 12. sınıflar normal yükseltmeye dahil edilmez; 13. sınıf kaydı oluşturulmaz. Bu basit akışa diploma numarası gibi ek zorunlu alanlar eklenmeyecek.
- Anaokulunun ayrı yönetilmesi kullanıcı tarafından değerlendirme önerisi olarak gündeme getirildi; ayrı uygulama, okul/tenant veya veritabanı kararı alınmadı.

### 17.2 Önerilen yönetici akışı

1. **Kaynak ve hedef yılı belirle.** Hedef yıl ve şubeler hazır olur. Sistem sonraki yılı önerebilir; yönetici hangi yıldan hangi yıla işlem yapılacağını görür.
2. **Ayrılanları ayır.** Mevcut uygulamadaki pasifleştirme işinin yeni karşılığı, nedeni ve etkili tarihi olan “Okuldan ayrılma” kaydı olmalıdır. Bu kişiler geçiş adaylarından çıkarılır. Hesabın girişe kapatılması tek başına akademik ayrılma sayılmaz.
3. **12. sınıfları topluca mezun et.** Kaynak yılın 12. sınıf öğrencileri listelenir. Yönetici “Tümünü seç” ile seçer, gerekirse tekrar edecek öğrenciyi seçimden çıkarır, mezuniyet tarihini girip “Mezun et” ile onaylar. Yalnız seçilenlerde mezuniyet durumu/tarihi kaydedilir; geçmiş yıl kayıtları korunur. Seçilmeyenlere bu işlem dokunmaz ve bu kişiler 1–11 yükseltmesini engellemez. Ayrı bir karar kuyruğu veya kapsamlı sınıf tekrarı süreci kurulmaz.
4. **Otomatik geçişi önizle.** Devam edecek 1–11 öğrencilerinin tamamı aynı grup ve şube numarasıyla bir üst seviyeye hazırlanır: `3 / 2 → 4 / 2`. Her öğrenci için geçme kararı veya her sınıf için elle şube eşlemesi istenmez. Eksik hedef şube gibi veri sorunları gösterilir; başka bir şubeye sessizce dağıtım yapılmaz. Eşleme isim metnini değiştirerek değil yılın şube kimlikleriyle yapılır.
5. **“Sınıfları atlat” ile onayla.** Hazır eşlemeler topluca uygulanır. Eski yıl kaydı yerinde kalır, aynı öğrenci için hedef yıl kaydı açılır. Daha önce hedefe aktarılmış kişiler tekrar oluşturulmaz; farklı hedef kaydı varsa üzerine yazılmaz. Önizleme sonrasında ayrılan veya kaydı değişen öğrenci uygulama anında yeniden kontrol edilir.
6. **PRF öğrencilerini manuel yerleştir.** Yönetici öğrenciyi, hedef yılı ve birinci sınıf şubesini seçip “Sınıfa kaydet” işlemini yapar. Farklı öğrenciler farklı şubelere kaydedilebilir. İşlem yalnız seçilen öğrenci için hedef yıl kaydı açar; eski yıl kaydı ve kalıcı öğrenci profili korunur. Seçilmeyen PRF öğrencilerine otomatik işlem yapılmaz. Bu dağıtım daha sonra yapılabilir ve 1–11 devrini bekletmez.
7. **Sonuçları ayrı göster.** Üst sınıfa geçirilen, mezun edilen, mezuniyet seçiminde kapsam dışı bırakılan, ayrıldığı için kapsam dışı kalan, PRF dağıtımı bekleyen ve zaten aktarılmış kişiler ayrı sayılır. Eksik eşleme/veri sorunu varsa ayrıca belirtilir; kısmi sonuç “herkes aktarıldı” diye sunulmaz. Normal 1–11 öğrencileri için akademik karar bekleme durumu oluşturulmaz.

Manuel düzeltme, ayrı bir istisna yönetim modülü değil öğrenci detayındaki normal düzenleme yeteneğidir. Hedef yılın kaydı düzeltilirken eski yılların geçmişi korunur ve değişiklik mevcut denetim yaklaşımına göre kaydedilir. Tekrar çalıştırılan toplu işlem, hedef yılda zaten kaydı olan öğrencinin manuel düzeltmesini otomatik olarak geri çevirmemelidir.

Mezuniyet listesinden çıkarılmak yalnız **bu işlemde mezun edilmemek** anlamına gelir; öğrenciyi pasif/ayrılmış yapmaz, eski kaydını silmez ve tek başına hedef yılda 12. sınıf tekrar kaydı oluşturmaz. Nadir tekrar durumunun yeni yıl kaydı, önceki manuel istisna yaklaşımına uygun olarak öğrenci detayında yönetilebilir; seçimden çıkarma otomatik kayıt açma yetkisi gibi yorumlanmaz. Mezun etme işleminin tekrarı da aynı öğrenci/yıl için mükerrer mezuniyet olayı üretmemeli veya önceki tarihi sessizce değiştirmemelidir.

### 17.3 Anaokulunda manuel yerleştirme

Anaokulu, aynı kalıcı öğrenci profili ve okul geçmişini kullanırken **ayrı kademe ve ayrı geçiş/yerleştirme akışı** olarak yönetilebilir. Böylece öğrenci ilkokula geçince ikinci bir kişi dosyası açılmaz. Anaokuluna özgü yaş grubu, değerlendirme ve günlük takip ekranlarının kapsamı ayrı görüşülür; şu anda kararlaştırılmış değildir.

Kullanıcının seçtiği basit akış manuel öğrenci seçimi ve hedef şubeye kayıttır. Ayrı bir geçiş uygunluğu kural motoru, önce geçiş onayı sonra şube bekleme gibi ek bir zorunlu süreç kurulmayacak. Hedef şube belli olduğunda yönetici kaydeder; sistem rastgele şube atamaz. Aynı şubeye gidecek birden fazla öğrencinin birlikte seçilebilmesi, bu manuel kararın uygulanmasını kolaylaştırabilecek UI önerisidir; otomatik dağıtım anlamına gelmez.

Seçilmeden kalan öğrenci için yalnız “bu işlemle aktarılmadı” denebilir. Bu durum tek başına okuldan ayrılma, anaokulunda devam etme, sınıf tekrarı veya otomatik pasifleştirme kararı değildir. Okuldan ayrılma ayrıca kaydedilir. Yeniden “Sınıfa kaydet” tıklanması aynı öğrenci/yıl kaydını çoğaltmamalı; farklı hedef kaydı varsa sessizce üzerine yazılmamalıdır.

### 17.4 Sıradaki karar

Sınıf tekrarı sorusu kapandı: devam eden 1–11 öğrencilerinin tamamı yükseltilir; nadir istisnalar öğrenci detayından manuel düzeltilir. Bu konuya normal akışta ek ekran, kural motoru veya onay adımı ayrılmayacak.

Şube devamlılığı sorusu da kapandı: öğrenci grubu ve şube numarası korunur; `3 / 2 → 4 / 2` otomatik eşlemedir. Önizleme yalnız kontrol/onay içindir, rutin bir dağıtım veya elle eşleme işi değildir.

Mezuniyet onayı da netleşti: **“Tümünü seç → Mezuniyet tarihi → Mezun et”**. Tekrar etmesi gereken öğrenci seçim dışı bırakılabilir; işlem yalnız seçilenleri etkiler. Bu onay ürün kararıdır, canlı mezuniyet işlemi yapıldığı anlamına gelmez.

PRF yaklaşımı da netleşti: yönetici geçecek öğrenciyi ve hedef birinci sınıf şubesini manuel seçerek kaydeder. PRF'deki herkesin otomatik geçeceği varsayılmaz; farklı şubelere dağıtım okulun seçimindedir. Böylece üç temel yol bellidir: PRF manuel yerleştirme, 1–11 aynı şubeyle otomatik yükseltme, 12. sınıf seçimli toplu mezuniyet.

Kullanıcı, örneklerinden oluşturulan beş ana ayrılma nedenini onayladı; liste 18. bölümdedir. Mezuniyet, bu listenin yerine geçen bir pasiflik nedeni değil ayrı öğrenci yaşam döngüsü sonucudur.

Öğretmen atamalarında otomatik yükseltme/devir hedefi yoktur; manuel UI yaklaşımı 19. bölümde, haftalık program ve dönemlik ortak ders görüşmesi 20. bölümde kayıtlıdır. Sınıf sorumlusunun takip paneli ayrıca ele alınacak. Bu iş akışı bütün okullar için değişmez 12 yıllık kural olarak sabitlenmez; farklı okul/kademe yapılarına uygulanacak kapsam ayrıca tanımlanır.

## 18. Ayrılma nedeni kararı ve istatistik önerileri

Durum: Beş ana nedenin seçimi kullanıcı tarafından **onaylandı**; karar kaydı `TAMAMLANDI`. Ek alanların, ekranın ve raporların ayrıntıları tasarım önerisi olarak kalır. Bu onay uygulanmış şema/özellik veya canlı öğrenci kayıtlarının sınıflandırılması anlamına gelmez.

### 18.1 Sade neden listesi

| Onaylanan ana neden | Kullanım |
| --- | --- |
| Aile taşınması | İsteğe bağlı ayrıntı: şehir içi, başka şehir, başka ülke, belirtilmedi. Bunlar aynı ayrılma olayının alt türleridir; üç ayrı ayrılma olarak sayılmaz |
| Okul ücreti / maliyet | Ailenin ücret nedeniyle ayrıldığını bildirmesi. Ücreti pahalı bulma, ödeme güçlüğü varmış gibi yeniden yorumlanmaz |
| Başka okul tercihi | Başka bir okulu tercih etmenin temel neden olarak bildirilmesi; yalnız nakil yapılmış olması bu nedeni kanıtlamaz |
| Diğer | Listede olmayan, açıklanmış neden; kısa notla belirtilebilir |
| Nedeni belirtilmedi / bilinmiyor | Neden alınamadıysa veya geçmiş kayıtta yoksa; diğer açıklanmış nedenlerden ayrı raporlanır |

Her ayrılma kaydında **tek ana neden** önerilir. Birden çok etken varsa yöneticinin aileden aldığı bilgiye göre ana neden seçilir, ek bağlam isteğe bağlı kısa notta tutulur. Borç, pasiflik, yeni yıl kaydının olmaması veya başka okula geçişten otomatik neden çıkarılmaz.

### 18.2 Ayrılma nedeni ile transfer sonucunu ayırma

Bir aile ücret nedeniyle veya taşındığı için başka okula geçebilir. Bu yüzden **“neden ayrıldı?”** ile **“başka okula geçti mi?”** aynı alan olmamalı. Önerilen ek transfer bilgisi isteğe bağlı `Evet / Hayır / Bilinmiyor` olur; hedef okul adı/adresi ilk sürüm için gerekli değildir.

Örnek: Ücret nedeniyle başka okula geçen öğrenci, neden dağılımında bir kez **Okul ücreti / maliyet** altında sayılır. Transfer bilgisi ayrıca **Evet** olabilir. Transfer sayısı neden dağılımına eklenip toplam ayrılan öğrenci sayısı şişirilmez. Yalnız transfer biliniyor, nedeni bilinmiyorsa **Nedeni belirtilmedi / bilinmiyor** seçilebilir.

### 18.3 Önerilen basit işlem

Öğrenci detayında **“Okuldan ayrıldı” → Ayrılma tarihi → Ana neden → Kaydet**. Taşınma seçilmişse isteğe bağlı alt tür; ayrıca isteğe bağlı transfer bilgisi ve kısa açıklama sunulabilir. Ayrılma kaydı ilgili okul/yıl ve o tarihteki sınıf bağlamına bağlı tutulur; kalıcı öğrenci dosyası ve eski yıllar silinmez. Hesabın girişe kapatılması ve finansal geçmişin durumu bu neden seçiminin yerine geçmez.

Neden bilinmiyorsa işlem engellenmez; açıkça bilinmiyor seçeneği kullanılır. Eski 117 pasif öğrenci bu sözlükle otomatik sınıflandırılmaz. Mezunlar ayrılma nedeni dağılımına dahil edilmez; ayrı mezuniyet sayımında tutulur.

### 18.4 İlk raporlar

- **Öğretim yılına göre ayrılan tekil öğrenci sayısı.** Rapor, ilgili yılın ayrılma kayıtlarına dayanır; yalnız mevcut pasif profil sayısı değildir.
- **Ana nedene göre sayı ve dağılım.** Örneğin taşınma, ücret ve başka okul tercihi. Yüzde kullanılacaksa payda seçilen kapsamın ayrılanlarıdır; bütün okul öğrencileri içindeki kayıp oranı olarak etiketlenmez. Bilinmeyen nedenler görünür tutulur.
- **Kademe/sınıf bazında dağılım.** Ayrılma anındaki sınıf kullanılır; bugünkü veya sonraki yıl sınıfı geçmiş raporu değiştirmez.
- Taşınmanın şehir/ülke ayrıntısı ve bilinen transferler ek filtre olabilir; başlangıçta ayrı karmaşık dashboard veya hedef okul rehberi gerekmez.

Bir öğrenci aynı yıl ayrılıp geri dönerek yeniden ayrılırsa olay sayısı ve tekil öğrenci sayısı karıştırılmamalı. Tekil öğrenciye göre neden dağılımında o kapsamın son geçerli ayrılma kaydını esas almak bir uygulama önerisidir; ayrılma geçmişi yine korunur.

**Onaylanan karar:** İlk sürüm bu beş ana nedenle başlayacak. Sonraki ihtiyaçlara göre sözlük genişletilebilir; eski kayıtların anlamı korunmalıdır. Kullanıcının bu onayı, isteğe bağlı bütün alan ve rapor ayrıntılarının tek tek kesinleştiği anlamına gelmez.

## 19. Öğretmen atamaları — otomasyon değil profesyonel manuel UI

Durum: Otomatik öğretmen yükseltme yapılmaması ve manuel UI'ye odaklanılması kullanıcı tarafından netleştirildi. Ekran tasarımı `ARAŞTIRMA`; henüz uygulanmadı. Önceki otomatik/taslak devir önerisi bu ürün diliminin yaklaşımı olmaktan çıkarıldı.

### 19.1 Kullanıcının açıkladığı okul işleyişi

- İlkokul 1–5 seviyeleridir. 1–4. sınıfları okutan sınıf öğretmeni öğrenci grubuyla bir üst seviyeye ilerler; 5. sınıfı okutan öğretmen yeni oluşturulan 1. sınıfa dönebilir.
- İlkokulda sınıf öğretmeninin yanında **beden eğitimi, resim, müzik, İngilizce/dil eğitimi gibi derslere branş öğretmenleri de girer**. Bunlar kullanıcı tarafından verilen örneklerdir; bütün dersleri sınıf öğretmenine bağlama veya branş derslerini sabit bir listeyle sınırlama kuralı yoktur.
- 6–12 seviyelerinde matematik, tarih, kimya gibi derslerin branş öğretmenleri ayrıdır.
- Sınıf öğretmenliği/sınıf sorumluluğu ile ders öğretmenliği ayrı yönetilmelidir. Bir kişide iki görev bulunabilse de aynı ilişki değildir.
- Öğretmenlerde çok fazla belirsizlik olduğundan bu gözlenen ilerleme **otomatik kural olmayacak**. Öğrenci yükseltmesi öğretmeni veya sorumluluk atamasını değiştirmeyecek.
- İhtiyaç atamaları kendiliğinden üretmek değil, yöneticinin kararlarını daha hızlı ve anlaşılır biçimde uygulayabileceği profesyonel UI'dir. Atama kopyalama/devir otomasyonu bu aşamanın hedefi değildir.

### 19.2 UI önerisi — Atama merkezi

Bu bölüm ekran önerisidir; kullanıcının tek tek onayladığı tasarım değildir.

- Üstte açık **öğretim yılı / dönem / kademe** bağlamı. Kullanıcı hangi dönemin atamalarını değiştirdiğini her zaman görür; eski yıl ekranları korunur.
- **Sınıf/sorumlu öğretmeni ataması:** Şubeler ve sorumluları ayrı listede görünür; eksik sorumlu kolay bulunur. Burada kişi seçmek, bütün dersleri ona atamaz. İlkokul sınıf öğretmeni ile üst kademelerdeki sorumlu görevin ayrıntılı rol/yetki farkları ayrıca netleştirilecek.
- **Ders öğretmeni ataması:** Şube seçildiğinde dersler ve atanmış öğretmenler düzenlenebilir tabloda görünür. Bu görünüm ilkokulda da kullanılır: sınıf öğretmeninin verdiği dersler ve diğer branş öğretmenlerinin verdiği dersler aynı şubenin listesinde ayrı satırlardır. Her dersin öğretmeni yönetici tarafından seçilir; sorumlu atamak bütün satırları doldurmaz. Boş atamalar fark edilir; öğretmen arayıp seçmek için tekrar tekrar ayrı sayfalara gidilmez.
- **Öğretmen görünümü:** Seçilen öğretmenin ders verdiği sınıflar/dersler bir arada okunur. Yönetici aynı öğretmen ve ders için istediği birden fazla şubeyi seçerek kaydedebilir. Bu manuel çoklu seçimdir; sistem hangi öğretmenin nerede çalışacağına karar vermez. Eski kodun çoklu sınıf seçimini zaten desteklediği dikkate alınır; yalnız aynı özelliği yeniden adlandırmak yeterli UI iyileştirmesi değildir.
- Değişiklikler ve kaydedilmemiş seçimler görünür olur. Aynı atamayı çoğaltma engellenir; değişiklik başka atamaların veya geçmiş kayıtların üstüne sessizce yazılmaz.
- Gün/saat çizelgesi bu atama tablosuyla karıştırılmaz. Gerçek zaman çakışması ve birleşik ders yönetimine ilişkin görüşme 20. bölümdedir; atama sayısı tek başına haftalık ders saati değildir.

Sınıf ve öğretmen görünümü aynı ders atamalarının iki farklı görünümüdür; birbirinden bağımsız ikinci bir kayıt kaynağı oluşturmaz. Sınıf sorumluluğu ise gerçekten ayrı görev ilişkisi olarak kalır.

Kullanıcının doğruladığı branş dersleri UI'nin ilkokulda “tek öğretmenli sınıf” varsayımı yapmamasını gerektirir. Sınıf öğretmeninin derslerini topluca seçmeye yönelik bir UI kolaylığı daha sonra tasarlanabilir; yönetici seçimi olmadan kalan bütün dersler bu kişiye atanmaz. Ders ataması ve sınıf sorumluluğu değişiklikleri birbirini kendiliğinden değiştirmez.

### 19.3 Açık panel konusu ve görüşmenin devamı

İlkokulda branş öğretmeni bulunup bulunmadığı sorusu yanıtlandı: beden eğitimi, resim, müzik ve dil eğitimi gibi derslere ayrıca branş öğretmenleri girer. Böylece atama UI'sinin temeli, ilkokul dahil ayrı sınıf sorumluluğu ve ders bazında öğretmen seçimi olarak netleşti.

**Açık soru: Sınıf sorumlusu kendi sınıfını takip ederken panelinde hangi bilgileri birlikte görmeye ihtiyaç duyuyor?** Örnek görüşme başlıkları tüm derslerin not özeti, yoklama/devamsızlık, ödev durumu ve öğretmen gözlemleridir; bunlar henüz onaylanmış ekran kapsamı değildir. Bilgileri görme ve başka öğretmenin kaydını değiştirme yetkileri ayrı değerlendirilir; sorumlu olmak otomatik yazma yetkisi vermez.

Kullanıcı görüşmeyi öğretmen detay ve program oluşturma ekranlarını paylaşarak haftalık programa taşıdı; devamı 20. bölümdedir. Bu aşamada canlı atama, uygulama kodu veya şema değiştirilmedi.

## 20. Haftalık program — mevcut akış, dönemlik ortak ders ve nadir düzenlemeler

Durum: Mevcut kullanım ve ortak dersin dönem boyunca sürmesi kullanıcı tarafından doğrulandı. Yeni UI ve veri modeli aşağıda **öneri** olarak ayrılmıştır; uygulanmadı. Kaynak, kullanıcının 2026-09-19 tarihinde paylaştığı iki öğretmen detay ekranı, dört program oluşturma ekranı ve açıklamalarıdır; bu görüşmede yeni canlı sorgu yapılmadı.

### 20.1 Ekranların doğru kapsamı ve mevcut oluşturma akışı

- Öğretmen detay sayfasındaki çizelge yalnız ilgili öğretmenin saatlerini gösterir. Kullanıcı bu kapsamı açıkça doğruladı; öğretmenin boş hücresinde başka bir branş öğretmeninin sınıfa giriyor olması ekran eksikliği değildir. Bu ekran, sınıfın bütün programı veya sınıf sorumlusunun öğrenci takip paneli olarak yorumlanmaz.
- Sınıf sorumluluğu, ders atamaları ve öğretmenin kişisel programı ayrı bilgilerdir. Bir branş öğretmeninde sorumlu sınıf bulunmaması tek başına hata değildir.
- Program oluşturma sayfasında önce belirli sınıf/şube seçilir; örnekte `4 - 1` vardır. Bu, yalnız genel 4. sınıf seviyesi seçimi olarak yorumlanmaz.
- Öğretmen seçimi için açılan modal, seçili sınıfa atanmış **ders–öğretmen eşleşmelerini birlikte** filtreler. Öğretmen ve ders rastgele iki bağımsız listeden seçilmiyor; bu mevcut ilişki ve filtreleme korunmaya değerdir.
- Yönetici ardından gün modalından günü, saat modalından ders dilimini seçer ve ekler. Mevcut akış: **Sınıf/şube → Ders–öğretmen eşleşmesi → Gün → Saat → Ekle**. Altta sınıfın öğretmenleriyle birlikte haftalık programı görünür.
- İyileştirme hedefi bu doğru filtrelemeyi kaldırmak değil, tablo zaten görünürken tekrarlanan modal açma ve gün/saat seçme işlemlerini azaltmaktır. Öğretmenin aynı gün farklı saatlerde farklı sınıflara girmesi normaldir; çakışma kavramı bütün günün dolu sayılması değildir.

### 20.2 Kullanıcının doğruladığı ortak ders ve değişiklik ihtiyacı

- **Farklı sınıf seviyeleri birlikte derse girebilir:** Örneğin 4. ve 5. sınıfların ortak beden eğitimi dersi.
- **Aynı seviyenin farklı şubeleri birlikte derse girebilir:** Örneğin `4/1 + 4/2`.
- Bu ortaklık **dönem boyunca** haftalık programın parçasıdır; anlatılan ihtiyaç tek güne özgü geçici birleştirme değildir. Tek seferlik ders/vekalet akışı ayrıca onaylanmış sayılmaz.
- Dönem içinde program güncellemesi **çok nadir** olur. Kullanıcı gerektiğinde mevcut `weekly schedule` sayfasından manuel düzenleme yapar. Dönemlik program, değiştirilemez bir kayıt anlamına gelmez.
- Öğretmen atamalarında otomatik yükseltme/devir istenmemesi kararı sürer. Bu görüşme otomatik öğretmen seçimi veya kendiliğinden program üretimi yetkisi vermez.

### 20.3 Önerilen UI ve ortak ders temsili

Bu bölüm henüz bütün ayrıntıları onaylanmış ekran tasarımı değildir.

- Yıl/dönem ve sınıf/şube seçimi görünür kalır. Sınıfa atanmış ders–öğretmen eşleşmeleri bir yan panelde gösterilebilir. Bir eşleşme seçildikten sonra haftalık hücreye tıklamak günü ve saati belirler; gün ve saat için ayrı modallar gerekmez.
- Aynı eşleşmeyle birden fazla hücre seçip onaylamak, yöneticinin manuel girişini hızlandırabilir. Sürükle–bırak isteğe bağlıdır; tek kullanım yolu olmaz. Bu kolaylıklar otomatik ders/öğretmen ataması değildir.
- Ortak ders için **“Başka sınıf/şube ekle”** ile katılımcılar seçilebilir. Tek bir dönemlik haftalık ders kaydına birden fazla sınıf bağlanması önerilir; her sınıf için birbirinden bağımsız kopya ders oluşturulmaz.
- Ortak ders öğretmen programında tek zaman bloğu altında gösterilebilir; katılan her sınıf ve kendi işlem bağlamı bu blokta korunmalıdır. Kullanıcının sonraki açıklamasına göre mevcut ekranda aynı hücrede her sınıfın ayrı CTA'ları vardır (21. bölüm). Tek oturum önerisi bu kontrolleri tek, kapsamı belirsiz buton grubuna indirgeme anlamına gelmez. Sınıfların programları aynı ortak kayda bağlanabilir; kalıcı sınıf kayıtları ve öğrenci yerleşimleri birleşmez.
- Öğretmenin aynı saat aralığında iki bağımsız dersi engellenir; aynı ortak dersin iki katılımcı sınıfı öğretmen çakışması sayılmaz. Katılan sınıfların başka dersleriyle çakışma yine kontrol edilir. Kontrol, ilgili dönem/geçerlilik ve gerçek zaman aralığı bağlamında hem seçim sırasında hem kaydetmede yapılmalıdır.
- Ortak ders oluşturmak, eksik ders–öğretmen atamalarını sessizce üretmemeli veya genel çakışma kontrolünü kapatmamalıdır. Her katılımcı sınıfın atama uygunluğu açıkça değerlendirilmelidir.
- Dolu hücrede düzenle/taşı/kaldır seçenekleri önerilir; başka dersin üzerine sessizce yazılmaz. Ortak dersin düzenlendiği ve hangi sınıfları etkilediği görünür olmalıdır.

### 20.4 Nadir değişikliklerde basit yönetim, geçmişi koruma

Kullanıcının tarif ettiği sıklık için ayrı karmaşık bir program değişikliği/onay modülü önerilmiyor. Yönetici aynı haftalık program ekranından ilgili dersi düzenleyebilir.

**Tasarım koruması önerisi:** Yeni program düzenlemesi geçmişte gerçekleşmiş derslerin, yoklamaların veya notların öğretmen/sınıf/tarih bağlamını geriye dönük değiştirmemeli. Değişikliğin yürürlük tarihi ve denetim kaydı, sade düzenleme akışını destekleyecek şekilde ele alınabilir. Kullanıcı henüz yürürlük tarihi varsayılanını veya geriye dönük düzeltme yetkisini onaylamadı; mevcut sistemin geçmişi nasıl etkilediği bu ekranlardan kanıtlanmış sayılmaz.

### 20.5 Sonraki açık konu

Her sınıf/ders için **haftalık hedef ders sayısının** sistemde tanımlanıp tanımlanmayacağı soruldu; kullanıcı bu soruyu henüz yanıtlamadan öğretmenin ana sayfasını ve günlük CTA işlemlerini açıkladı. Hedef varsa programda yerleştirilen ve kalan ders sayısı gösterilebilir; hedef bilinmeden boş hücreler veya atama sayıları üzerinden “program tamamlandı” sonucu çıkarılmaz. Güncel görüşme 21. bölüme taşındı; sınıf sorumlusunun takip panelindeki bilgi/yetki kapsamı da açık kalır.

## 21. Öğretmen ana sayfası — tarihli ders işlemleri ve çok sınıflı hücre

Durum: Kullanıcının ekran açıklaması, paylaştığı 11.23.19 tarihli görüntü ve ilgili yerel Flask şablonu/route/model kodu incelendi. Kaynak yolları yukarıdaki `UI-T`, `TE`, `M`, `SE` anahtarlarıyla belirtilmiştir. Canlı öğretmen oturumu açılmadı, CTA'lar çalıştırılmadı ve veri yazılmadı. Aşağıdaki kod davranışları yerel kopyaya aittir; canlı dağıtımın birebir aynı olduğu varsayılmaz.

### 21.1 Ekranın amacı ve programdan gerçek tarihe geçiş

Bu sayfa yönetimin öğretmen detay ekranı veya program hazırlama ekranı değildir: öğretmenin günlük ders işlemlerini yaptığı ana çalışma alanıdır. `/api/teachers/teacher_page`, `teacher_tem/teacher_login.html` şablonunu açar; `teacher_schedule.html` bu CTA ekranının şablonu değildir (`TE:26–35`).

Seçilen okul haftasının gerçek tarihleri ve takvim günü kimlikleri tablo başlıklarına yerleştirilir. Öğretmenin aktif haftalık programı gün/saat hücrelerine çizilir; CTA'lara seçilen haftanın tarihi taşınır (`UI-T:456–505, 533–602; TE:38–114`). Böylece “her pazartesi 3. ders” programı ile “belirli tarihteki 3. derste yapılan işlem” kavramsal olarak farklıdır; eski modelde ortak tarihli ders oturumu tablosu bulunmadığından bu bağlam her işlemde alanlarla tekrar kurulur (B15).

**Tarih sınırı:** Program sorgusu öğretmen + `Active` filtresi kullanır; seçilen hafta/yıl/dönem veya programın geçerlilik tarihine göre program sürümü seçmez. Haftanın günleri de yalnız hafta numarasıyla getirilir (`TE:70–87, 105–114`). Bu nedenle haftalar arasında gezinmek, o haftada geçerli tarihsel programın gösterildiği garantisini vermez. Program değişikliği eski işlem satırlarını zorunlu olarak silmez; fakat eski tarihin çizelgesi yeni programa göre kurulabilir. Bu statik çıkarım, canlıda geçmiş veri kaybı yaşandığı iddiası değildir.

### 21.2 Beş CTA'nın kod karşılıkları

| CTA | Gerçek işlev ve hedef | Kod / model |
| --- | --- | --- |
| 1 — Yoklama | Seçilen sınıfın aktif öğrenci listesini açar; mevcut/yok/geç seçimleri sunar. İstek tarih, ders ve tek sınıf taşır; saat kimliği taşımaz. Yalnız yok/geç kayıtları yazılır | `openAttendanceModal`, `saveAttendance`; `get_att_students`, `get_student_attendance`, `save_attendance`; `student_attendance`. `UI-T:918–1053; TE:435–550; M:1022–1061` |
| 2 — İşlenen ders / ödev | `Lesson & Homework` modalında iki sekme vardır. İşlenen ders/müfredat açıklaması `daily_text`, ödev metni `detyres_text` olarak ayrı tablolara kaydolur. Aktif sekme kaydedilir; diğer sekme kendiliğinden kaydedilmiş sayılmaz. Yapılandırılmış müfredat maddesi seçimi değil, mevcut kodda serbest metindir | `openTaskModal`, `saveChanges`; `get_task_details`, `save_task`, `get_detyres_details`, `save_detyres`; `teacher_daily_task`, `teacher_detyres`. `UI-T:202–271, 782–915; TE:242–431; M:985–1017, 1334–1363` |
| 3 — Öğrenci yorumu | Seçili sınıftan bir/birçok öğrenci veya tümü seçilir; yorum metni ve kategori/puan, seçilen her öğrenciye ayrı kayıt olarak yazılır. Aynı tarih/saat/ders/sınıf/öğretmen/öğrenci eşleşmesinde mevcut yorum güncellenir | `openCommentsModal`, `saveComments`; `get_students_forcomment`, `save_comments`; `teacher_comments`. `UI-T:1148–1309; TE:575–658; M:1063–1108` |
| 4 — Sınav planı | Seçilen tarih/saat/sınıf/ders için sınav açıklaması girilir; bu işlem sınav notu girişi değildir. Mevcut kod aynı sınıfın aynı gün ikinci ayrı sınavını engeller; bu politikanın yeni sistemde korunması ayrıca netleştirilmeli | `openExamModal`, `saveExam`; `get_exam_details`, `save_exam`; `examination_dates`. `UI-T:1576–1680; TE:751–852; M:1241–1271` |
| 5 — Materyal | Açıklama ve çoklu dosya yükleme; o tarih/saat/ders/sınıfın dosyalarını listeleme ve silme. Kullanıcı PDF, Word, Excel, PNG gibi örnekler verdi. Dosya seçicinin serbest olması tüm türlerin güvenli biçimde doğrulandığı/önizlenebildiği anlamına gelmez | `openMaterialModal`, `saveMaterialBtn`; `get_material_details`, `save_material`, `delete_file`; `student_metarials`. `UI-T:162–199, 607–778; TE:119–237; M:1292–1330` |

Yorum UI'sinde `3, 1, 0, -1, -3` değerleriyle yeşil kart/olumlu/bilgi/olumsuz/kırmızı kart seçenekleri vardır (`UI-T:1200–1230`). Bu eski uygulamanın davranışıdır; aynı puan sözlüğünün yeni sistem için onaylandığı anlamına gelmez. Üstteki `Today / All` düğmeleri bütün programın filtreleri değil, öğretmenin yorum listelerini açar (`UI-T:1316–1332; TE:661–674, 718–729`).

### 21.3 Aynı hücrede iki sınıfın nasıl çalıştığı

Kullanıcı, aynı öğretmenin aynı saatte birlikte okuttuğu iki sınıfın o hücrede göründüğünü ve her iki sınıfın yoklama/yorum gibi işlerini buradan yaptığını açıkladı. Kod bunu şu şekilde destekler:

1. Her program satırı için gün ve `lesson_time_id` ile ilgili hücre bulunur.
2. Hücrenin mevcut içeriği alınır ve yeni ders/sınıf/butonlar **üstüne eklenir**; ilk sınıf ikinciyle değiştirilmez (`currentContent + ...`, `UI-T:560–602`).
3. Her buton grubunun kendi `class_id` ve `lesson_id` değerleri vardır. Açılan öğrenci listesi veya form o sınıfa aittir; yoklama dışındaki CTA'larda saat ve takvim günü kimliği de taşınır.

Dolayısıyla **aynı hücrede iki sınıfa erişebilmek**, tek tıklamayla iki sınıfın öğrencilerini birleştirerek toplu kaydetmek değildir. İncelenen UI her sınıfa ayrı işlem başlatır. Kullanıcının “aynı anda halletme” ifadesi çok sınıflı saat içinden her sınıfın işine ulaşabilme ihtiyacını doğrular; yeni bir tüm-sınıflara-toplu-kayıt kararı olarak yorumlanmaz.

Yerel `create_weekly_schedule` route'u ise ikinci aktif öğretmen/gün/saat satırını reddeder (`SE:452–493`). Çoklu kayıt **gösterimi** ile kayıt oluşturma **kuralı** arasındaki ayrım B02'ye işlendi. Bu kontrolü denemek için canlı program satırı oluşturulmadı; aynı hücrede görünen kayıtlar tek başına doğru ortak ders ile hatalı çakışmayı ayırmaz.

### 21.4 Yeni yapıda korunacak ayrım — ortak zaman, ayrı işlem kapsamları

**Öneri:** Ortak dersin zaman/öğretmen ilişkisi tek oturum olarak modellenebilir; ancak bu, katılan sınıfların bütün içeriklerinin aynı yapılmasını gerektirmez. Öğretmen ana sayfasında aynı zaman bloğu altında her sınıfın adı ve beş işlemi açıkça erişilebilir kalmalıdır. Tek oturum, aynı öğretmeni iki defa meşgul saymayı önler; sınıf bazlı işlemleri ortadan kaldırmaz.

- **Yoklama ve yorum:** Sonuçlar öğrenciye ve ilgili sınıf/yerleşime aittir; kullanıcı yoklamayı ders/saat bazlı olarak netleştirdi (22. bölüm). Bir sınıfta yapılan işlem diğer sınıfın öğrencilerine kendiliğinden uygulanmaz. Aynı öğrencinin güncel yoklama durumunun sonraki öğretmene aktarılması ise ayrıca istenen devamlılık kuralıdır.
- **İşlenen ders ve ödev:** Farklı seviyelerde kazanım veya verilen çalışma farklı olabileceği için sınıfa özel metin saklanabilmeli. Ortak içerik girişi eklenirse hedef sınıflar öğretmen tarafından açıkça seçilmeli; örtük çoğaltma yapılmamalı.
- **Sınav:** Aynı ders saatinde birlikte bulunmak, iki sınıfın da sınava gireceği anlamına gelmez. Hedef sınıf/katılımcı kapsamı ayrı tutulmalı; sınıf başına günlük sınav kuralı ayrıca kararlaştırılmalı.
- **Materyal:** Aynı dosyanın iki sınıfa paylaşılması bir kolaylık olabilir; ancak her yüklemede iki sınıfa otomatik görünürlük verilmemeli. Dosya erişimi oturumdaki kullanıcı/okul ve hedef sınıf ilişkisiyle doğrulanmalı (B23/B27).
- **UI durumları:** Sınıf bazında “yoklama kaydedildi”, “ders içeriği girildi” veya “materyal var” gibi durum göstergeleri önerilebilir. Eski veride kayıt bulunmaması, özellikle yoklamada “tamamlandı/herkes mevcut” diye yorumlanamaz.

Bu öneriler onaylanmış birleşik form, otomatik içerik paylaşımı veya beş CTA'nın tek butona indirilmesi kararı değildir. Oturum, altındaki sınıf işlemleri ve öğrenci sonuçları birlikte fakat farklı kapsamlarla ele alınır.

### 21.5 Yoklama kapsamı — kod bulgusu ve sonraki kullanıcı kararı

Mevcut ekran ders saatinin içinden yoklama başlatmasına rağmen `student_attendance` tablosunda saat/takvim günü/oturum kimliği yoktur. `Absent` kontrolü **öğrenci + tarih**, `Late` kontrolü **öğrenci + tarih + ders + sınıf** üzerinden yapılır. Form yalnız `Present` olmayanları yollar; herkesin mevcut olduğu bir sınıfın yoklamasının alındığını kanıtlayan ayrı oturum kaydı yoktur (`UI-T:985–1029; TE:495–532; M:1022–1061`).

Bu yapı ders saatindeki bir butonla **günlük devamsızlık** bildirmeyi amaçlıyor olabilir; ilk incelemede okul kuralı bilinmeden bütün işleyişin hatalı olduğu ileri sürülmedi. Ancak aynı dersin aynı gün iki ayrı saatindeki yoklamaları bağımsız temsil edemez ve günlük yoklukla derse gecikmenin kapsamları aynı değildir (B12). Kullanıcı sonraki açıklamasında bu eksikliği doğruladı ve saate bağlı takip istedi.

**Yanıtlandı:** Yoklama ders/saat bazlı olacak; önceki durum sonraki ders öğretmenine görünür ve değişiklik yoksa devam eder. Geç gelme ve gün içinde ayrılma zaman çizgisi korunur. Ayrıntılı karar 22. bölümdedir. Haftalık hedef ders sayısı ve sınıf sorumlusunun takip paneli soruları açık kalır; kullanıcı bunları henüz yanıtlamadı.

## 22. Öncelikli gereksinim — saat bazlı yoklama ve gün içi durum devamlılığı

Durum: Kullanıcı mevcut yoklamanın eksik olduğunu ve **kesinlikle ders saatine bağlanması gerektiğini** doğruladı. Temel ürün gereksinimi netleşti; uygulama, şema ve testler henüz yapılmadı. Aşağıdaki önerilen kayıt tasarımı ile kullanıcı tarafından açıklanan ihtiyaçlar ayrıdır.

### 22.1 Kullanıcının doğruladığı kurallar

- Öğrenci ilk dersi kaçırıp sonraki derse gelebilir; ilk derslerde mevcut olup daha sonra okuldan ayrılabilir. Tek günlük yok/var alanı yeterli değildir.
- Yoklama ilgili **tarih, ders oturumu ve saat** ile ilişkilendirilmeli. Öğrencinin yok yazıldığı zaman ve geç geldiğinde gerçek geliş saati saklanmalı.
- İlk derste yok yazılan öğrenci, ikinci ders öğretmeninin yoklama modalında önceki yok kaydıyla görünmeli. Durum değişmedikçe sonraki derste aynı şekilde devam edebilmeli; her öğretmenin öğrenciyi sıfırdan tekrar yok yazması beklenmiyor.
- Öğrenci üçüncü derste geldiğinde o dersin öğretmeni güncel durumu **`Absent → Late`** olarak değiştirebilmeli ve geliş saatini yazabilmeli. Güncel durumu yalnız ilk kaydı açan öğretmen değiştirebilir gibi bir kilit istenmiyor; ayrıntılı yetki sınırları ayrıca tasarlanmalı.
- Öğrenci ilk iki dersten sonra veya ilk dört dersin ardından ayrılırsa ilgili sonraki derste yok yazılabilmeli; devam eden derslerde bu durum görülebilmeli.
- Aynı öğrencinin farklı teneffüslerden geç dönüşleri **ayrı ders gecikmeleri** olarak izlenip analiz edilebilmeli.
- Kullanıcı, sabah yok yazılan öğrencinin ailesine öğretmenin SMS göndermesi için eski sisteme yeni bir CTA eklediğini bildirdi. Bu özellik incelenen kopyada doğrulanmış değildir; yalnız kullanıcı beyanı olarak kaydedildi (22.5).

### 22.2 Senaryoların geçmişi koruyan yorumu

| Senaryo | Ders bazlı sonuç ve sonraki öğretmene gösterilecek bilgi |
| --- | --- |
| 1. ders matematikte yok yazılır | O ders için yok kaydı; kaydeden öğretmen ve zaman görünür |
| 2. ders biyolojide hâlâ gelmemiştir | Önceki yok durumu ve hangi dersten devralındığı görünür; değişiklik yoksa devam eder |
| 3. ders tarihte gelir | İlgili dersin öğretmeni geliş saatiyle geç kaydı girer; 1. ve 2. dersin yokluğu korunur |
| Sonraki derse zamanında katılır | Öneri: o ders mevcut; günün özetinde önceki geç geliş bilgisi kalır, yeni bir gecikme sayılmaz |
| İlk dört ders mevcutken 5. derste yoktur | 1–4. dersler mevcut kalır; 5. derste yok kaydı ve zamanı saklanır, sonraki derse durum devam edebilir |
| İki farklı teneffüsten geç döner | Her ilgili ders için ayrı dönüş saati ve gecikme; günlük tek Late kaydıyla birleştirilmez |

**Tasarım ayrımı:** `Late` hem “öğrenci artık geldi” bilgisini hem o dersin gecikme olayını taşır. Aynı etiketi sonraki bütün derslere yeni gecikme olarak kopyalamak analizleri bozar. Güncel bulunma durumu ile ilgili dersin yoklama sonucu bu nedenle ayrı ele alınmalıdır. Gelişten sonraki derste mevcut varsayımını sürdürmek, kullanıcının devamlılık isteğine yönelik öneridir; her dersin gerçekten kontrol edildiği iddiası değildir.

Öğrencinin sonraki derste gelmesi, önceki derslerde gerçekten bulunmadığı kaydı geriye dönük geç/mevcut yapmaz. Yanlış yok yazılmış bir dersin düzeltilmesi farklı işlemdir; eski/yeni değer ve yapan kişiyle kayıt altına alınması önerilir. Kullanıcı ayrıntılı geçmiş düzeltme yetki politikasını henüz seçmedi.

### 22.3 Önerilen kayıt ve UI düzeni

- **Öğrenci + tarihli ders oturumu sonucu:** İlgili yıllık kayıt/sınıf bağlamı, ders sonucu ve varsa gerçek geliş saati. Aynı ders adının aynı gün iki saati farklı oturumlardır; kaydı yapan öğretmen sonuç kimliğinin parçası olmaz.
- **Gün içi hareket/geçmiş:** Yok tespiti, geliş/geç dönüş ve bilinen ayrılış gibi değişiklikler; hangi derste, kim tarafından ve ne zaman kaydedildiği. Sonraki öğretmen kendi yetkili dersinde güncel durumu değiştirebilir; bu geçmişteki başka öğretmenin kayıtlarının sınırsız düzenlenmesi yetkisi değildir.
- **Üç ayrı zaman anlamı:** Dersin planlı başlangıç/bitişi; gerçek gözlem/geliş zamanı; sistemde kaydın girildiği zaman. Öğretmen geliş saatini sonradan yazarsa gerçek geliş saati kayıt zamanına çevrilmez. Yok yazıldığı saat de öğrencinin kesin okuldan ayrıldığı saatmiş gibi yorumlanmaz; gerçek ayrılış bilinmiyorsa uydurulmaz.
- **Durum kaynağı:** “Bu derste öğretmen kaydetti”, “önceki dersten devralındı” ve “henüz bilgi yok” ayrılmalı. Kullanıcı sonraki görüşmede “Dersi başlat → Yoklama tamam mı?” adımını istedi (23. bölüm). Devralınan durumlar kontrolün başlangıç bilgisidir; bütün öğrencileri yeniden tek tek işaretleme şartı değildir. Kontrol adımı tamamlanmadan devralınmış bilgi, o ders öğretmeninin kontrol/onay yaptığı gibi raporlanmaz.
- **Modal görünümü:** Öğrenci yanında mevcut ders sonucu, önceki durum/dersten beri bilgisi, kayıt/geliş saati ve değiştiren kişi gösterilebilir. “Geldi / Geç geldi” ve “Yok” işlemleri mevcut modal içinde yapılabilir; ayrı karmaşık işlem modülü gerekmez.
- **Aynı gün sınırı ve zaman sırası:** Devamlılık aynı okul günü ve öğrencinin geçerli ders akışı içinde işler. Yeni güne önceki günün yok/geç durumu körlemesine taşınmaz. Gelecekteki bütün dersler peşinen kontrol edilmiş sayılmaz; sonraki gerçek öğretmen kaydı önceki devralma bilgisinden üstündür.
- **Çakışan düzenlemeler:** Sonraki öğretmen geliş kaydederken açık kalmış eski bir yoklama ekranı bunu sessizce ezmemeli. Tekrar kaydetme mükerrer gecikme üretmemeli; gün içi hareketler zamana göre değerlendirilmelidir.
- **Birleşik ders:** Aynı öğrenci ortak oturumda iki kez sayılmaz; her öğrenci kendi sınıf/yerleşim bağlamını korur. Başka sınıftaki öğrenciler, aynı zaman bloğunda oldukları için birlikte yok/geç yapılmaz.

Bu ayrım, devamlılık için teknik olarak her ders başında toplu veri yazan bir görev kurulacağı anlamına gelmez. Durumun türetilmesi/saklanması uygulama tasarımında seçilir; kullanıcıya son durumun doğru görünmesi, geçmiş ve kaynağın korunması esastır.

### 22.4 Analiz gereksinimleri

- Kaç farklı gün devamsızlık var, kaç **ders oturumu** kaçırılmış ve kaç **gecikme olayı** var ayrı ölçülerdir; tek bir devamsızlık toplamında açıklamasız birleştirilmez.
- Okula ilk gelişteki gecikme ile daha sonraki ders/teneffüs dönüşlerindeki gecikmeler ayrıştırılabilir olmalı. Her dersin gerçek geliş saati korunur; gecikme süresi ilgili dersin başlangıcından hesaplanabilir. Özel tolerans ve yuvarlama kuralları henüz kararlaştırılmadı.
- Bir geliş olayı sonraki üç derste görüntülense de üç yeni gecikme sayılmaz. Devralınan yokluk ilgili ders için devam eden durumdur; “bu öğretmen bu derste yoklama aldı” sayacına kendiliğinden eklenmez.
- Ders bazlı gerçek sonuçlar ile devralma/bilgi eksikliği raporda ayırt edilebilir olmalı. Yeni sisteme aktarılan eski saat bilgisi olmayan kayıtlardan kesin ders/saat veya geliş dakikası üretilmez.

### 22.5 Yeni SMS CTA'sı — yalnız kullanıcı bildirimi

Kullanıcı eski uygulamaya, sabah yok yazılan öğrenci için **öğretmenin CTA ile aileye SMS göndermesi** özelliğini yeni eklediğini söyledi. Yerel incelenen kaynakta veya canlı çalıştırmayla doğrulanmadı. Sağlayıcı, mesaj metni, alıcı seçimi, gönderim/teslim durumları ve tekrar önleme davranışı bilinmiyor. Bu konuşma SMS gönderme yetkisi değildir; hiçbir mesaj gönderilmedi.

**Yeni sistem için önerilen korumalar:** Gönderim, yoklama durumunun devam etmesinden ayrı ve açık bir öğretmen eylemi olarak ele alınmalı. Sonraki ders öğretmeninin aynı yokluğu görmesi otomatik yeni SMS üretmemeli. Gönderilmiş/başarısız/teslim bilgisi birbirine karıştırılmadan gösterilmeli; tekrar tıklamada mükerrer gönderim önlenmeli. Öğrenci bu sırada gelmişse eski yok ekranından güncelliğini yitirmiş bildirim gönderilmeden önce son durum kontrol edilmeli. Öğrencinin gelişini aileye ayrıca bildirme, otomatik SMS veya yeni şablon kapsamı kullanıcı tarafından henüz istenmedi/onaylanmadı.

### 22.6 Karar durumu ve açık ayrıntılar

Günlük mü derslik mi sorusu kapandı: **ders/saat bazlı yoklama, gerçek zamanlar ve aynı gün öğretmenler arası durum devamlılığı öncelikli ihtiyaçtır.** Bundan sonraki tasarım bu kararı temel alır; uygulama henüz yoktur. Sonraki görüşmede kullanıcı öğretmenin dersi başlatıp yoklama/konu/ödev adımlarını takip etmesini istedi; güncel UI yönü 23. bölümdedir. Geçmiş düzeltme izinleri, mazeret/izin türleri, adımların kesin tamamlama koşulları ve SMS ayrıntıları açık kalır. Haftalık hedef ders sayısı ile sınıf sorumlusu paneli soruları da henüz yanıtlanmadı.

## 23. Öğretmen UI önceliği — dersi başlat, adımları tamamla, gün sonu raporuna hazırla

Durum: Kullanıcı bu yapının öğretmen UI tasarımında **öncelikli** ele alınmasını istedi. Ders başlatma, adımlı kullanım ve okulun platform kullanımını takip etmesi ürün yönü olarak kaydedildi; adımların kesin sırası, zorunlulukları, zaman sınırları ve puanlama ayrıntıları henüz tasarımdır. Kod, şema, e-posta görevi veya otomasyon uygulanmadı.

### 23.1 Kullanıcının açıkladığı ihtiyaç

- Öğretmen her ders için **“Derse gir / Dersi başlat”** eylemiyle platformdaki işini başlatmalı.
- Ayrı CTA'ları öğretmenin hatırlamasına bırakmak yerine **“Yoklama tamam mı? Konu? Ödev verilecek mi?”** gibi adımlı bir form/iş akışıyla eksikler görünür kılınmalı.
- Kullanıcı, ders başında veya sonunda girilen bilgilerin saat **17:00 itibarıyla günlük e-posta raporuna** girdiğini ve eksik girişlerin bu raporlara yansıdığını açıkladı. Bu nedenle yalnız dersin başlatılması değil, gerekli bilgilerin rapor saatine kadar tamamlanması önemlidir.
- Okul öğretmenin platformu kullanma ve gerekli kayıtları tamamlama durumunu izlemek istiyor. Bu ihtiyaç öğretmen UI'sinin temel tasarım girdisidir; yalnız yönetici dashboard'una bir sayaç eklemekle sınırlı değildir.

### 23.2 Önerilen sade ders akışı

1. **Dersi başlat:** Tarihli ders oturumu açılır; öğretmen, ders ve sınıf(lar) programdan gelir. Başlatma zamanı kaydedilir; tekrar tıklama ikinci bir oturum veya başarı sayısı üretmez.
2. **Yoklamayı kontrol et ve tamamla:** Önceki dersin durumları gösterilir. Öğretmen gelen/ayrılan/geç kalanları günceller ve bu dersin yoklama kontrolünü tamamlar. Öğrencileri sıfırdan tekrar tek tek seçmesi gerekmez. Devralma tek başına bu adımı tamamlamaz.
3. **İşlenen konuyu gir:** O derste gerçekten işlenen konu kaydedilir. Önceden yazılan plan varsa işlenmiş konu diye otomatik onaylanmaz; plan ve gerçekleşen bilgi ayrılabilir.
4. **Ödev kararını belirt:** **“Ödev verildi”** ise içerik, **“Ödev yok”** ise açık karar kaydedilir. Hiç yanıt verilmemesi üçüncü bir durumdur: eksik/bekliyor. Ödev yok yanıtı öğretmenin eksik çalıştığı anlamına gelmez.
5. **Ders işlemlerini tamamla:** Gerekli adımlar sağlandığında tamamlandı durumu ve zamanı kaydedilir. Sadece başlatmak, sayfayı açmak veya bir CTA'ya tıklamak tamamlanma kanıtı değildir.

**Zamanlama önerisi:** Ders başında başlatma/yoklama, ders sırasında veya sonunda konu/ödev ve tamamlama. Öğretmen tüm bilgileri ders başlamadan girmek zorunda bırakılmamalı; taslak/ilerleme korunmalı ve kaldığı yerden devam edebilmeli. Adımların tek modal, yan panel veya tam sayfa oluşu henüz seçilmedi. Yoklamada sonradan geliş/durum düzeltmesi bu akış yüzünden engellenmemeli; değişikliğin zamanı ve geçmişi korunmalı.

Yorum, sınav ve materyal mevcut ders bağlamında erişilebilir kalır; her derste mutlaka yorum, sınav veya dosya oluşturmak zorunlu değildir. Kullanıcı bu ek işlemleri tamamlama şartı yapmadı. Ortak derste öğretmen bir zaman oturumunu başlatır; katılan her sınıfın yoklama/konu/ödev kapsamı ve eksikleri ayrı görünür. Bir sınıfın adımlarını bitirmek diğer sınıfı otomatik tamamlamaz.

Önerilen görünür durumlar: **Başlatılmadı / Devam ediyor / Eksik adımlar var / Tamamlandı / Geç tamamlandı**. Bunlar henüz onaylanmış şema enum'ları değildir; örneğin geç tamamlama ayrı zaman niteliği olarak da modellenebilir. Dersin gerçekten okulda yapılması ile platformdaki kayıt işlerinin tamamlanması aynı durum değildir.

### 23.3 Gün sonu e-posta raporu ve eksik takibi

**Kaynak doğrulaması:** Yerel `run.py`, günün öğrenci yorumlarını, devamsızlıklarını, öğrenci ödevlerini, sınıfın işlenen ders ve ödev metinlerini toplar; ilgili öğrenciye bağlı velilerin e-postalarına rapor hazırlar (`RUN:52–148, 165–169`). Bu alanların hepsi boşsa o öğrenci için gönderimi atlar. İncelenen toplama kodunda sınav/materyal bu gönderinin parçası değildir; kullanıcının “tüm veriler” açıklamasından bu beş CTA'nın tamamının canlı raporda bulunduğu sonucu çıkarılmaz.

Yerel iş tanımı **16:58** kullanıyor (`RUN:172–186`); kullanıcı okul işleyişini **17:00** olarak belirtti. Görev tanımında saat dilimi açıkça verilmediği ve canlı dağıtım bu turda kontrol edilmediği için üretim gönderim saati hakkında kesin karşı iddia yapılmaz. Yeni tasarım hedefi okulun saat diliminde 17:00 bağlamıdır; gönderim/kesim saati ayrıntısı uygulama öncesi teyit edilmeli. `run.py` import edilmedi/çalıştırılmadı, zamanlayıcı başlatılmadı ve e-posta gönderilmedi.

**Öneri:** Öğretmenin ana sayfasında “Bugünün eksik dersleri”, yönetimde ise öğretmen/ders/sınıf ve eksik adım görünmeli. 17:00 öncesi eksik göstergesi/hatırlatma tasarlanabilir; ayrı bildirim kanalı veya yeni otomasyon kurulmuş değildir. Rapor “ödev yok”, “konu henüz girilmedi” ve “yoklama kontrol edilmedi” durumlarını birbirinin yerine koymamalı; özellikle yoklama kaydı eksikliği “öğrenci mevcut” diye sunulmamalı.

17:00 anındaki hazır/eksik durumu ile daha sonra tamamlanan durum ayrı izlenmeli. Gönderilen raporun kapsamı ve hangi kayıt sürümünü içerdiği izlenebilir olmalı; sonraki düzenleme eski e-postayı değiştirmiş gibi gösterilmemeli. Eksik raporun bekletilmesi, eksik ibaresiyle gönderilmesi veya sonradan ek rapor gönderilmesi henüz kararlaştırılmadı. E-posta hazırlanması, gönderim servisince kabul ve teslim farklı durumlardır; yeniden denemeler mükerrer rapor üretmemeli.

### 23.4 Ölçüm — platform kullanım ve kayıt tamamlama durumu

Ölçümün adı ve kapsamı **platform kullanım/tamamlama** olmalı; öğretmenin pedagojik başarısı, fiziksel olarak derse girdiği veya eğitim kalitesi yalnız tıklama/kayıt verisinden çıkarılamaz. “Dersi başlat” zaman damgası dijital eylemin zamanıdır. Sonradan yapılan giriş zamanında başlatılmış gibi gösterilmemeli; bu ayrım cezalandırma/otomatik personel kararı yetkisi oluşturmaz.

Önerilen ayrı göstergeler:

- Seçili tarih aralığında beklenen uygun ders oturumu, başlatılan ve gerekli adımları tamamlanan oturum sayıları.
- Yoklaması kontrol edilmiş, konusu girilmiş ve ödev kararı verilmiş dersler; eksik adımın hangisi olduğu.
- 17:00 rapor kesimine kadar tamamlananlar ve sonradan tamamlananlar; başlatma ve tamamlama zamanları.
- Öğretmenin kendi eksik listesi ile okul yönetiminin yetkili özet görünümü; tek açıklamasız “başarı puanı” yerine gözlenebilir işlemler.

Pay ve payda aynı okul/yıl/dönem/tarih ve sorumlu öğretmen kapsamından, tarihli oturumlardan hesaplanmalı. Gelecek dersler, tatiller, iptaller ve yerine başka öğretmen giren dersler uygun kapsamla ayrılmalı; kesin vekalet kuralı ayrıca seçilecek. Ortak ders öğretmenin iki bağımsız zaman oturumu gibi sayılmamalı; sınıf adımlarının tamamlanma sayacı ayrı tutulmalı. Hiç uygun dersi olmayan öğretmen için oran uygulanamaz olmalı; sıfır ders üzerinden başarısızlık sonucu üretilmemeli.

Mevcut `/api/admin/performance`, tüm program satırlarını hafta katsayısıyla ve tüm geçmiş ders günlükleriyle karşılaştırıyor (`AD:976–1014`); önceki canlı incelemede oranların %100'ü aşması L09'da belgelenmişti. Bu eski oran yeni akışta kullanılmamalı; sonucu yalnız %100'e kırpmak yerine aynı kapsamdaki tekil oturumlar ve adım tamamlanma olayları esas alınmalı. Yeni canlı performans sorgusu yapılmadı.

### 23.5 Tasarım önceliği ve açık kararlar

Öğretmen UI çalışmasına geçildiğinde önce **günlük ders kartı → dersi başlat → adımlar/eksikler → gün sonu rapor hazırlığı → yönetici kullanım takibi** akışı tasarlanacak. Saat bazlı yoklama ve ortak sınıfların ayrı işlemleri bu akışın içinde korunacak; öğretmen atama/yükseltme otomasyonu eklenmeyecek.

Adımların hangi anda zorunlu olduğu, geç başlatma/tamamlama toleransı, rapor anında eksik veriye yaklaşım, ek e-posta ve yönetici görünürlük ayrıntıları açık kalır. Kullanıcının isteği bu yapının öncelikli not edilmesidir; canlı öğretmenlere yeni zorunluluk, puanlama veya bildirim uygulanmadı.
