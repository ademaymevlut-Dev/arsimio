# Okul Admin çalışma alanı — analiz ve fazlı uygulama planı

Tarih: 2026-09-20  
Durum: `FAZ 0 TAMAMLANDI / YEREL`  
Kapsam: Okul Admin uygulama kabuğu, bilgi mimarisi, ortak tablo düzeni ve modüllerin bağımlılık sırasına göre teslim planı. Faz 0 yerelde uygulanmıştır; Faz 1 ve sonrası hâlâ plan kapsamındadır.

## 1. Sonuç ve çalışma yöntemi

Okul Admin alanını bütünüyle yukarıdan aşağı ya da bütünüyle aşağıdan yukarı kurmak doğru değildir. Önerilen yöntem:

1. **Görsel çerçeveyi yukarıdan aşağı kur:** En fazla `1400px` genişliğinde okul kabuğu, sol menü, üst bağlam çubuğu, sayfa başlığı ve ortak tablo/form davranışları ilk teslim olur.
2. **Veriyi bağımlılık sırasıyla aşağıdan yukarı kur:** Akademik yıl ve sınıf yapısı olmadan öğrenci kaydı; öğretmen ve ders ataması olmadan program; tarihli program olmadan saat bazlı yoklama geliştirilmez.
3. **Her modülü dikey dilim olarak bitir:** Yalnız tablo şeması veya yalnız liste ekranı bırakılmaz. Listeleme, filtreleme, oluşturma, düzenleme, arşivleme, permission, tenant izolasyonu, audit ve test aynı dilimde tamamlanır.
4. **Eski programı kaynak olarak kullan, ekranlarını kopyalama:** Alan bilgisi, kullanıcı alışkanlıkları ve iş kuralları korunur; güvenlik, veri modeli, dağınık modal akışı ve eski teknik kısıtlar taşınmaz.

İlk geliştirme dilimi **Faz 0 — Okul kabuğu ve tablo temeli** tamamlandı. Sıradaki gerçek veri dilimi **Faz 1 — Akademik yapı** olmalıdır.

## 2. İncelenen eski yapı

Kaynaklar:

- `horizonedu/backend/app/templates/admin_tem/base_login.html`
- `horizonedu/backend/app/templates/admin_tem/admin.html`
- `horizonedu/backend/app/templates/admin_tem/employees_*.html`
- `horizonedu/backend/app/templates/admin_tem/student_list.html`
- `horizonedu/backend/app/templates/admin_tem/task_teacher_list.html`
- `horizonedu/backend/app/templates/setting_tem/*.html`
- `horizonedu/backend/app/templates/finances_tem/*.html`
- `horizonedu/backend/app/blueprints/admin/routes.py`
- `horizonedu/backend/app/blueprints/setting/routes.py`
- `horizonedu/backend/app/blueprints/finances/routes.py`
- `horizonedu/backend/app/modeller/models.py`
- [Eski veri modeli incelemesi](./legacy-data-model-review.md)

### 2.1 Eski menünün kapsadığı işler

Eski sol menü tek bir yönetim alanında şu işleri birleştiriyor:

- Dashboard
- Yeni personel, personel listesi
- Öğretmen kullanıcıları, sorumlu sınıflar, ders/sınıf atamaları ve öğretmen programı
- Öğrenciler ve veliler
- Bütçe, gelir/fatura ve giderler
- Öğretim yılı, sınıflar, dersler, sınıf–ders eşlemesi
- Ders saatleri, okul haftaları ve haftalık program
- Henüz bağlantısı olmayan sözleşme, departman, gider grubu ve tema başlıkları

Dashboard; aktif öğrenci/öğretmen/personel sayıları, bugünkü devamsızlar, sınıf dağılımı, doğum günleri ve öğretmen platform performansını gösteriyor. Eski `/performance` hesabı tarihli tekil ders oturumuna dayanmadığı ve daha önce `%100` üstü sonuçlar üretmiş olduğu için yeni dashboard'a taşınmayacak.

### 2.2 Korunacak iyi alışkanlıklar

- Sol menü ve sağ içerik şeklindeki hızlı yönetim düzeni.
- Açık renkli, sakin ve veri yoğun çalışmaya uygun görünüm.
- Sınıf seçildikten sonra ilgili ders–öğretmen seçeneklerinin filtrelenmesi.
- Haftalık programın gün × ders saati matrisi.
- Öğretmen ve öğrenci detayından ilişkili kayıtlara ulaşabilme.
- Liste ekranlarında durum, arama ve hızlı satır işlemleri.

### 2.3 Birebir taşınmayacak noktalar

- Personel, kullanıcı hesabı, öğretmen görevi ve sınıf sorumluluğunun aynı kavram gibi yönetilmesi.
- Öğrenci detayında profil, kullanıcı, fotoğraf, dosya, yıl/sınıf, sözleşme, hizmet, taksit ve ödeme hareketlerinin tek büyük ekrana yığılması.
- `Active/Passive` alanının kişi yaşam döngüsü, kullanıcı erişimi, yıllık kayıt ve iş ataması için aynı anlamda kullanılması.
- Yıl, sınıf ve derslerin okul/yıl bağlamından kopuk düz listeler olması.
- Her sınıf için ayrı program satırı nedeniyle ortak dersin öğretmen çakışması olarak engellenmesi.
- Sayfa içine gömülü JavaScript, CDN DataTables, çok sayıda ardışık modal ve istemci tarafında ayrı ayrı `fetch` akışları.
- Kalıcı silme, GET ile silme, bazı yazma uçlarında eksik giriş/yetki kontrolü ve okul kapsamı bulunmayan sorgular.
- Eski dashboard'daki açıklamasız tek performans yüzdesi.

## 3. Okul Admin bilgi mimarisi

Menü görev kümelerine ayrılmalı. Bir faz uygulanmadan menüde çalışmayan bağlantı gösterilmemeli; yeni modül hazır olduğunda permission'a göre görünür olmalı.

| Menü grubu | Sayfalar | Ana amaç |
| --- | --- | --- |
| Genel | Genel bakış | Güvenilir özetler, eksik kurulumlar, bugünün işleri |
| Akademik yapı | Öğretim yılları ve dönemler, seviyeler, sınıf/şubeler, dersler, ders saatleri, okul takvimi | Diğer bütün modüllerin okul/yıl bağlamını kurmak |
| Kişiler | Personel, öğretmenler, öğrenciler, veliler | Kalıcı kişi profilleri ve okul ilişkileri |
| Öğretim planı | Sınıf sorumluları, ders atamaları, haftalık program | Dönemlik manuel atama ve ortak ders planı |
| Öğretim operasyonu | Yoklama, ders kayıtları, sınav/ödev/materyal, kullanım takibi | Tarihli ders oturumlarını ve öğretmen işlemlerini izlemek |
| Finans | Sözleşmeler, ücret planları, taksitler, tahsilatlar, bütçe/gider | Öğrenci alacağı ile okul giderini ayrı ama ilişkili yönetmek |
| Servis | Şoförler, araçlar, rotalar, duraklar, öğrenci atamaları | Servis kapasitesi ve öğrenci dağılımı |
| Yönetim | Okul kullanıcıları ve roller, okul ayarları, denetim geçmişi | Erişim, yapılandırma ve izlenebilirlik |

Logo, kapak görselleri ve giriş şablonu yönetimi kullanıcı kararı gereği bu çalışmanın başlangıcında yer almaz. Ortak kabuk oturduktan sonra mevcut `SchoolBranding` altyapısı üzerinden ele alınır.

## 4. Yerleşim kararı — en fazla 1400px

Okul paneli Süper Admin kabuğunun kopyası olmayacak; ortak UI tokenlarını kullanacak fakat kendi düzeni ve menüsü olacak.

### 4.1 Masaüstü

- Bütün çalışma alanı ekranın ortasında `max-width: 1400px` olur.
- Dış zemin `background`, kabuk yüzeyi `card/sidebar` tokenlarını kullanır.
- Kabuk iki sütundur: yaklaşık `252px` sol menü + `minmax(0, 1fr)` içerik.
- Sol menü `sticky` çalışır; okul adı, aktif öğretim yılı, modül grupları ve oturum özeti içerir.
- Sağ bölümde ince üst çubuk, breadcrumb, sayfa başlığı, açıklama, birincil işlem ve içerik bulunur.
- İçerik alanı kendi içinde yeniden `1400px` yapılmaz; toplam kabuğun kalan genişliğini kullanır.
- Sayfa yatay boşluğu masaüstünde `28–32px`, tablette `20–24px`, telefonda `16px` olur.

### 4.2 Tablet ve telefon

- `1024px` altında sabit sidebar kapanır; üst çubuktaki menü düğmesi ortak bir `Sheet/Drawer` açar.
- Tablo genişliği zorla sıkıştırılmaz. Temel sütunlar görünür kalır; ikincil bilgiler satır detayı/drawer içinde açılır.
- Haftalık program küçük ekranda gün sekmesi + saat listesine dönüşebilir; masaüstü matrisi korunur.
- Ana işlemler dokunma hedefi ve klavye odağı bakımından ortak UI Kit kurallarına uyar.

### 4.3 Next.js sınırı

Mevcut `/dashboard` okul ana sayfası korunur. Okul hostname'i zaten tenant'ı belirlediği için URL'ye okul kimliği veya slug eklenmez. Önerilen yapı:

```text
src/app/(school-admin)/
├── layout.tsx
├── dashboard/page.tsx
├── academics/...
├── people/...
├── students/...
├── teaching/...
├── finance/...
└── transport/...
```

Route group URL'yi değiştirmeden ortak Okul Admin layout'unu uygular. `layout.tsx` sunucuda `requireSchoolPermission(...)` ile koruma yapar. Sidebar'ın açılması ve aktif menü gibi küçük etkileşimler Client Component olur; veri okumaları mümkün olduğunca Server Component'te doğrudan yapılır. Dahili yazmalar Server Action, mobil/harici istemcilerin gerçekten ihtiyaç duyduğu HTTP sözleşmeleri Route Handler olur.

## 5. Ortak tablo ve form standardı

Eski DataTables davranışı tek tek sayfalarda yeniden yazılmayacak. İlk fazda ortak bir `DataTable` bileşimi hazırlanır.

Her yönetim listesinde, ihtiyaca göre şu parçalar bulunur:

- Sayfa başlığı, kısa açıklama ve tek belirgin birincil CTA.
- Serbest arama; yıl/dönem, durum ve modüle özel filtreler.
- Filtreler, sıralama ve sayfa numarasının URL `searchParams` içinde tutulması.
- Sunucu taraflı sayfalama; başlangıçta `25 / 50 / 100` satır seçenekleri.
- Toplam sonuç ve gösterilen aralık bilgisi.
- Toplu seçim yalnız gerçek bir toplu işlem olduğunda.
- Satırın tamamı detay açabilir; düzenle/arşivle gibi ikincil işlemler tek satır menüsünde toplanır.
- Kalıcı silme yerine durum/lifecycle'a uygun arşivleme; geri dönüşü olmayan işlem için `AlertDialog` ve açık etki özeti.
- Yükleniyor, boş sonuç, ilk kurulum, hata, erişim yok ve filtre sonucu yok durumları ayrı tasarlanır.
- Mobilde önemli sütunlar korunur; geniş tablo kontrollü yatay kaydırma veya satır detayı kullanır.
- Dışa aktarma, her tabloya otomatik eklenmez; raporlama ihtiyacı tanımlandığında sunucu taraflı CSV/XLSX/PDF üretilir.
- Form doğrulaması sunucuda tekrar yapılır; kayıt değişmişse revizyon çakışması kullanıcıya gösterilir.
- Her yazma okul kimliği, permission ve audit bağlamıyla yapılır.

İlk kabukta mevcut `Button`, `Card`, `Dialog`, `AlertDialog`, `Checkbox`, `Tabs`, `Tooltip`, `Input`, `Textarea`, `NativeSelect`, `Badge`, `Skeleton` ile yeni `Table` ve `Sheet` kullanıldı. Sonraki gerçek liste/form dilimlerinde eklenecek ortak parçalar: `DropdownMenu`, `Pagination`, aranabilir `Combobox/Command`, tarih alanı, form hata özeti ve gerektiğinde `Drawer`.

## 6. Fazlı uygulama planı

### Faz 0 — Okul kabuğu ve tablo temeli

**Amaç:** Mevcut geçici `/dashboard` ekranını gerçek Okul Admin çalışma alanına dönüştürmek; sonraki bütün ekranların görsel ve teknik standardını kurmak.

**Durum:** `TAMAMLANDI / YEREL`. Bu fazdan önce gerekli olan ilk Okul Admin hesabı oluşturma akışı Süper Admin okul detayına eklendi. Süper Admin yalnız okulun ilk yöneticisini oluşturur; sonraki personel, öğretmen ve diğer okul hesapları Faz 2'de Okul Admin tarafından yönetilecektir.

**Teslimler:**

- `max-width: 1400px` Okul Admin layout'u, sol sidebar, mobil sheet ve üst çubuk.
- Okul adı, aktif rol, çıkış ve öğretim yılı bağlamı için yer ayrılması. Aktif yıl tablosu Faz 1'e kadar “kurulum bekliyor” durumu gösterir.
- Permission tabanlı menü tanımı; çalışmayan/dead link yok.
- Ortak page header, breadcrumb, filtre çubuğu, veri tablosu, satır menüsü, empty/error/loading bileşenleri.
- Genel bakışta yalnız bugünkü şemadan güvenle hesaplanabilen okul/üyelik bilgisi ve bir **kurulum kontrol listesi**. Akademik tablolar oluşmadan sahte öğrenci/öğretmen grafiği yok.
- Safari, klavye, `Escape`, focus trap, 390px/768px/1440px responsive testleri.

**Veritabanı:** Yeni iş tablosu yok. Mevcut School, Membership, Role ve Permission kullanılır.

**Kabul:** İki okulun yerel hostname'i doğru markalı girişe yönlenir; okul kabuğu platform route group'undan ayrıdır; hem layout hem sayfa `dashboard.read` permission'ı ister. Tam oturumlu iki-okul görsel kabulü, gerçek ilk Okul Admin hesapları kullanıcı tarafından oluşturulduktan sonra yapılacaktır.

### Faz 1 — Akademik yapı

**Amaç:** Öğrenci, öğretmen, program ve yoklamanın bağlanacağı okul/yıl omurgasını kurmak.

**Önerilen kavramlar:**

- Öğretim yılı ve dönemler.
- Kademe/seviye: PRF ve okulun kullandığı 1–12 seviyeleri.
- Yıla bağlı sınıf/şube: örneğin `4 / 1`; yalnız metin olarak kalmaz.
- Ders kataloğu ve sınıf/şube için dönemlik ders sunumu.
- Ders saati blokları.
- Okul takvimi/çalışma günleri ve dönem haftaları.

**İlk ekran sırası:**

1. Öğretim yılları ve dönemler.
2. Seviyeler ile sınıf/şubeler.
3. Dersler.
4. Sınıf/şube–ders planı.
5. Ders saatleri.
6. Takvim ve okul haftaları.

**Şema yönü:** `academic_years`, `academic_terms`, `grade_levels`, `class_sections`, `subjects`, `course_offerings`, `lesson_periods` ve takvim kayıtları. Nihai adlar migration tasarımında kesinleşir. Bütün benzersizlikler `school_id` ve gerekli yıl/dönem kapsamıyla kurulur.

**Kabul:** Bir okulun yılı/sınıfı diğer okulda görünmez; aynı okulda tek aktif yıl kuralı güvenli yönetilir; geçmiş yıl düzenlenirken bugünkü yapı bozulmaz; kullanılan kayıt kalıcı silinmez.

### Faz 2 — Personel, öğretmen ve okul kullanıcıları

**Amaç:** Kişi profili, çalışan ilişkisi, öğretmen niteliği ve giriş hesabını birbirinden ayırmak.

**Ekranlar:**

- Personel listesi ve profil detayı.
- Öğretmen listesi ve öğretmen detayı.
- Departmanlar/görevler.
- Okul kullanıcıları, üyelik durumu, roller ve oturum erişimi.
- Kullanıcı adı oluşturma, parola sıfırlama ve hesabı askıya alma; profil pasifleştirmesiyle aynı işlem değildir.

**Tasarım kuralı:** Öğretmen bir çalışan rolü/profili olabilir; fakat ders ataması öğretmen profilinin sabit alanı değildir. Sorumlu sınıf ve dönemlik ders atamaları Faz 4'te tutulur. Banka/özlük gibi hassas alanlar genel personel tablosunda gösterilmez ve ayrı permission ister.

**Kabul:** Hesabı olmayan personel kaydedilebilir; aynı kullanıcı farklı okul üyeliklerine sahip olabilir; bir hesabın askıya alınması geçmiş öğretmen kayıtlarını silmez.

### Faz 3 — Öğrenci, veli ve öğrenci yaşam döngüsü

**Amaç:** Kalıcı öğrenci/veli profili ile yıllık okul kaydını ayırmak; görüşmede netleşen geçişleri uygulamak.

**Ekranlar:**

- Öğrenci listesi, öğrenci profili ve yıl/sınıf geçmişi.
- Veli/yakın listesi; öğrenci–veli ilişkisi, iletişim ve yetkili alıcı rolleri.
- Öğrenci kullanıcı hesabı ile profil bağlantısı.
- Yeni kayıt ve hedef yıl/sınıf yerleşimi.
- Okuldan ayrılma: tarih + onaylanan beş ana neden + isteğe bağlı açıklama/transfer bilgisi.
- PRF için seçili öğrenciyi hedef 1. sınıf şubesine manuel yerleştirme.
- 1–11 için aynı şubeyle toplu sınıf yükseltme önizlemesi ve uygulaması.
- 12. sınıf için “Tümünü seç → öğrenciyi seçimden çıkar → mezuniyet tarihi → mezun et”.

**Tasarım kuralı:** `Active/Passive` mezuniyet, ayrılma, yıllık kayıt ve giriş hesabının yerine geçmez. Profil, yıllık enrollment/placement ve lifecycle olayları ayrı tutulur. Eski yıl kayıtları güncellenip üstüne yazılmaz.

**Kabul:** Tekrar çalıştırılan yükseltme kopya kayıt üretmez; PRF'de seçim dışı öğrenciye işlem yapılmaz; 12. sınıf 13'e yükselmez; ayrılan/mezun öğrencinin geçmişi ve finans ilişkileri korunur.

### Faz 4 — Sınıf sorumluluğu, ders atamaları ve haftalık program

**Amaç:** Öğretmenlerde otomasyon yerine hızlı ve profesyonel dönemlik manuel yönetim sağlamak.

**Ekranlar:**

- Yıl/dönem ve sınıf odaklı **Atama Merkezi**.
- Sınıf/sorumlu öğretmeni ataması.
- Ders öğretmeni ataması; ilkokul sınıf öğretmeni bütün derslere otomatik atanmaz.
- Öğretmen odaklı görünüm: hangi sınıf ve dersler atanmış.
- Sınıf odaklı görünüm: hangi dersin öğretmeni eksik.
- Haftalık program: sınıf seçimi ve doğrudan matris hücresinden ders/öğretmen/katılımcı sınıf seçimi.

**Ortak ders kuralı:** `4 + 5` veya `4/1 + 4/2` tek zaman oturumunun birden fazla katılımcı sınıfı olabilir. Bu, aynı öğretmenin iki bağımsız derse çakışması değildir. Önerilen ilişki tek program oturumu + çoklu sınıf katılımıdır. Öğretmen aynı saatte farklı iki bağımsız oturuma atanırsa engel/uyarı oluşur.

**Kabul:** Atama bir sonraki yıla otomatik taşınmaz; ortak ders programda ve öğretmen ekranında tek zaman bloğu olarak görünür; sınıf bazlı yoklama/konu/ödev kapsamları kaybolmaz; nadir dönem içi program değişikliği geçmiş kayıtları değiştirmez.

### Faz 5 — Tarihli ders oturumu, öğretmen akışı ve saat bazlı yoklama

**Amaç:** Program şablonundan gerçek güne ait ders oturumları üretmek ve öncelikli öğretmen kullanım akışını kurmak.

**Akış:**

1. Dersi başlat.
2. Yoklamayı kontrol et/tamamla.
3. İşlenen konuyu gir.
4. Ödev verildi veya açıkça “Ödev yok” seç.
5. Ders işlemlerini tamamla.

**Yoklama:** Her öğrenci sonucu tarihli ders oturumu ve saatle ilişkilidir. Önceki dersteki yokluk sonraki öğretmene görünür; öğrenci geldiğinde `Late` ve gerçek geliş saati kaydedilir; gün içinde ayrılırsa ilgili dersten itibaren `Absent` olabilir. Geçmiş ders sonuçları geriye dönük kaybolmaz. Aynı gün içinde farklı teneffüs gecikmeleri ayrı analiz edilebilir.

**Okul Admin ekranları:** Bugünün başlamayan/eksik/tamamlanan dersleri, yoklama kontrol durumu, 17:00 rapor kesimine yetişme ve açık düzeltmeler. Ölçüm “platform kullanım/tamamlama”dır; pedagojik başarı puanı değildir.

**Kabul:** Devralınan durum o öğretmenin yoklama yaptığı anlamına gelmez; ortak ders bir zaman oturumu olarak sayılır, katılan sınıfların adımları ayrı izlenir; sonradan açılmış eski ekran yeni geliş kaydını sessizce ezemez.

### Faz 6 — Finans ve sözleşmeler

**Amaç:** Eski öğrenci detayına gömülü sözleşme/taksit yapısını ayrı bir finans çalışma alanına taşımak.

**Ekranlar:**

- Öğrenci sözleşmeleri ve sözleşme sürümleri.
- Ücret kalemleri/hizmetler, indirimler ve ödeme planı.
- Taksitler, tahsilatlar, açık bakiye ve makbuz/fatura durumu.
- Bütçe dönemleri ve gider grupları.
- Tedarikçiler/firmalar ve gider hareketleri.
- Vadesi geçenler ve mutabakat raporları.

**Tasarım kuralı:** Öğrenci alacağı, ödeme hareketi, gelir özeti, okul bütçesi ve gider aynı tablo/anlam değildir. Parasal alanlar integer minor unit veya uygun decimal stratejisiyle tutulur; floating point kullanılmaz. Finans izinleri genel Okul Admin izninden ayrılabilir.

**Kabul:** Taksit toplamı/sözleşme toplamı mutabakatı yapılabilir; tahsilat silinerek geçmiş yok edilmez; düzeltme ve iptal ayrı audit olayıdır; öğrencinin ayrılması borç geçmişini otomatik silmez.

### Faz 7 — Servis operasyonu

**Amaç:** Şoför kullanıcı sayfası ve okulun öğrenci servis planlamasını aynı veri temelinde kurmak.

**Ekranlar:**

- Şoförler ve hesapları.
- Araçlar ve kapasite.
- Rotalar, duraklar ve planlı seferler.
- Öğrenci servis atamaları; başlangıç/bitiş tarihi.
- Rota/araç başına öğrenci sayısı ve kapasite uyarıları.
- Şoförün yetkili olduğu sefer ve öğrenci listesi.

**Kabul:** Şoför yalnız kendi yetkili rota/sefer kapsamını görür; öğrenci sınıf değiştirdiğinde servis ataması kendiliğinden kaybolmaz; tarihsel atama korunur.

### Faz 8 — Raporlama, veri geçişi ve operasyonel sağlamlaştırma

**Amaç:** Modüller çalıştıktan sonra güvenilir çapraz raporlar ve eski sistem aktarımı.

- Öğrenci, ayrılma, mezuniyet, yoklama, gecikme, öğretmen tamamlama, finans ve servis raporları.
- Permission'a uygun dışa aktarma ve kişisel veri sınırlaması.
- Eski alanların yeni kavramlara kaynak–hedef eşlemesi.
- Prova aktarımı, hata listesi, sayım/mutabakat ve geri dönüş planı.
- Gözlemlenebilirlik, performans, erişilebilirlik, yedekleme/geri yükleme ve güvenlik kabulü.
- Logo/görsel kalıcı depolaması ve okul giriş şablonları, ortak tasarım yeterince oturduğunda ayrı bir marka dilimi olarak bu fazdan bağımsız planlanabilir.

## 7. Fazlar arası zorunlu bağımlılıklar

```text
Okul kabuğu ve tablo standardı
            ↓
Yıl / dönem / seviye / şube / ders / saat
            ↓
Personel-öğretmen          Öğrenci-veli-yıllık kayıt
            └──────────────┬──────────────┘
                           ↓
             Öğretmen ataması ve program
                           ↓
              Tarihli ders ve yoklama
```

Finans, akademik temel ve öğrenci kimliğinden sonra; servis ise öğrenci ve kullanıcı çekirdeğinden sonra paralel ürün dilimi olabilir. Buna rağmen aynı anda birden fazla yarım modül açılmamalıdır.

## 8. Faz 0 teslim kaydı ve sıradaki backlog

Faz 0'da tamamlanan maddeler:

1. `/dashboard`, `(school-admin)` route group içindeki korumalı layout'a taşındı.
2. `SchoolAdminShell`, permission tabanlı navigation, toplam `1400px` kabuk, `252px` sidebar ve mobil `Sheet` tamamlandı.
3. Ortak `PageHeader`, `DataTableShell`, `Table`, empty/loading/error temelleri eklendi. Gerçek filtre/sayfalama ve satır işlemleri ilk CRUD tablosuyla tamamlanacak.
4. Dashboard'a yalnız mevcut okul/üyelik/permission bilgisi ve akademik kurulum kontrol listesi eklendi; sahte akademik metrik üretilmedi.
5. Süper Admin okul detayına, ilk yöneticiyi kullanıcı adı ve geçici parola ile atomik olarak oluşturan form eklendi. İkinci “ilk yönetici” reddedilir; parola/hash audit'e yazılmaz.
6. TypeScript, ESLint, 50 birim testi, production webpack build ve 6 rollback-only DB servis kontrolü başarılıdır. Gerçek okul yöneticisi oluşturulmadığı için korumalı okul kabuğunun tam oturumlu tarayıcı kabulü açık kalır.

Sıradaki geliştirme dilimi **Faz 1 — Öğretim Yılları ve Dönemler** CRUD'udur. Okul Admin'in sonraki kullanıcıları oluşturacağı ayrıntılı kullanıcı/rol yönetimi Faz 2'de kalır.

Faz 0 yeni akademik migration içermez. Böylece henüz kararı kesinleşmemiş öğrenci, finans veya servis alanlarına erken şema borcu eklenmemiştir.

## 9. Uygulama boyunca geçerli güvenlik ve veri kuralları

- Okul kimliği formdan güvenilir kabul edilmez; hostname tenant context'inden gelir.
- Her okuma/yazma ilgili school permission ile korunur; yalnız menüyü gizlemek yetki kontrolü değildir.
- Yeni iş tablolarında okul kapsamı ve çapraz-okul ilişki kısıtları migration seviyesinde bulunur.
- Kullanılmış iş kayıtları silinmez; lifecycle durumu, arşiv ve gerektiğinde düzeltme/iptal olayı kullanılır.
- Kullanıcı hesabı, kişi profili, okul üyeliği ve akademik/operasyonel roller ayrı kavramlardır.
- Tüm kritik yazmalar actor, önce/sonra, değişen alanlar ve gerekçe ile audit üretir.
- Liste sorguları varsayılan olarak sayfalıdır; bütün okul verisi tarayıcıya indirilip istemcide filtrelenmez.
- Gerçek öğrenci/veli verisi alınmadan tenant izolasyonu, permission ve lifecycle testleri tamamlanır.

## 10. Sonraki açık kararlar

Aşağıdaki konular Faz 0'ı engellemez; ilgili modüle gelindiğinde soru–cevapla netleştirilir:

- Sınıf sorumlusunun okuyacağı/değiştireceği bilgiler; yardımcı veya vekil sorumlu ihtiyacı.
- Haftalık hedef ders sayıları ve eksik program kontrolü.
- Öğrenci veli ilişkisinde akademik bildirim alıcısı, acil kişi ve mali sorumlu ayrımı.
- Yoklamada mazeret/izin türleri, geçmiş düzeltme yetkisi ve SMS sağlayıcı/teslim politikası.
- Finans sözleşme yenileme, indirim ve eski borç aktarım kuralları.
- Serviste rota, durak, sefer ve günlük biniş/iniş takibinin ilk sürüm kapsamı.
