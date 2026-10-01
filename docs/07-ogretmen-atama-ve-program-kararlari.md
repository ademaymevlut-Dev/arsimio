# 07 — Öğretmen atama ve haftalık program kararları

Tarih: 2026-10-01  
Durum: `PAKET 4A KODLANDI · HAFTALIK PROGRAM SONRAKİ PAKET`  
Kapsam: Aktif öğretim yılında sınıf sorumlusu, ders öğretmeni, ortak ders ve haftalık program akışını netleştirmek.

Bu belge kodlama dokümanı değildir. Amaç, veri modeline ve UI akışına geçmeden önce öğretmen ataması ile haftalık programın nasıl çalışacağını kesinleştirmektir.

## 1. Mevcut temel

Şu parçalar artık sistemde hazır kabul edilir:

- Okul tenant yapısı ve Okul Admin yetkileri
- Aktif öğretim yılı ve dönemler
- Kademe, seviye, yıllık sınıf/şube
- Okul geneli ders kataloğu
- Yıllık sınıf–ders planı
- Ders saatleri
- Personel kaydı
- Öğretmen profili
- Öğretmenin okutabileceği ders yetkinlikleri

Önemli ayrım:

- `TeacherProfile` öğretmenin kimlik/profil bilgisidir.
- `TeacherSubjectCapability` öğretmenin hangi dersleri okutabileceğini gösteren aday havuzu bilgisidir.
- Gerçek yıllık atama ayrıca yapılmalıdır: öğretim yılı + sınıf/şube + ders + öğretmen.
- Haftalık program, bu gerçek atamaların gün ve ders saati üzerine yerleştirilmiş halidir.

## 2. Önerilen paket sırası

Benim önerdiğim güvenli sıra:

1. **Paket 4A — Atama Merkezi**
   - Aktif yılda sınıf sorumlu öğretmeni atama
   - Aktif yılda sınıfın derslerine öğretmen atama
   - Eksik öğretmen ataması olan sınıf/dersleri gösterme

2. **Paket 4B — Haftalık Program**
   - Atanmış dersleri haftanın günlerine ve ders saatlerine yerleştirme
   - Öğretmen ve sınıf çakışmalarını engelleme
   - Ortak dersleri tek zaman bloğu olarak yönetme

3. **Paket 5 — Tarihli Ders Oturumu ve Yoklama**
   - Haftalık programdan gerçek gün/ders oturumları üretme
   - Öğretmen yoklaması
   - Öğrenci/veli yoklama özeti

Bu sırayla gidersek program ve yoklama ekranları yanlış veya eksik öğretmen atama verisine dayanmaz.

## 3. Karar soruları

### TA01 — İlk uygulama kapsamı

İlk kodlama diliminde yalnız atama merkezini mi yapalım, yoksa haftalık programı da aynı pakete dahil edelim mi?

**Öneri:** Önce yalnız **Atama Merkezi** yapılsın. Yani sınıf sorumlusu ve ders öğretmeni atansın; haftalık program bir sonraki küçük pakette yapılsın.

**Cevabınız:**
Önerin Uygundur. 

### TA02 — Sınıf sorumlu öğretmeni

Bir yıllık sınıf/şubenin kaç sorumlu öğretmeni olabilir?

**Öneri:** İlk sürümde her sınıf/şube için bir `primary` sorumlu öğretmen olsun. Yardımcı/eş sorumlu öğretmen ihtiyacı varsa daha sonra ekleyelim.

**Cevabınız:**
Şimdi Sınıftan sorumlu Öğretmenler özellikle ortaokul ve lise gruplarında önemli. İlkokul ve Anaokulunda zaten öğretmenler sınıf öğretmeni pozisyonunda. Yine sorumlu olarak tek öğretmen olacak. 
Ortaokul ve Lislerde de yine sınıf sorumlu öğretmeni tanımlayacağız. Her sınıf için bir öğretmen tanımlanacak. Bu öğretmen Veli'ler ile öğrenci ile ilgili toplantılar yapıyor. Yani sisteme öğretmen giriş yaptığında kendi dersleri haricinde Sorumlu öğretmenler diğer tüm derslerden de sorumlu oldukları sınıfın öğrencilerinin notları öğretmen yorumlarını görebilecekler. Bu yüzden Her sınıf'a bir sorumlu öğretmen tanımlanacak ve bazı öğretmenler birden fazla sınıfa sorumlu öğretmen olabilecekler. Yani burada biz UI de şöyle yöneteceğiz. Öğretmen detay sayfasına girdiğimiz de öğretmene bir veya birden fazla sorumlu sınıf atayabileceğiz. 


### TA03 — Sınıf sorumlusu hangi süre için geçerli?

Sınıf sorumlu öğretmeni tüm aktif öğretim yılı için mi geçerli olur, yoksa dönem bazında değişebilir mi?

**Öneri:** İlk sürümde öğretim yılı bazında tutalım. Değişiklik olursa aynı yıl içinde yeni sorumlu seçildiğinde geçmiş kayıtlar korunacak şekilde tarihçe ekleyebiliriz.

**Cevabınız:**
Evet. yıl içerisinde bir değişiklik olursa örneğin Ayşe öğretmenin sorumlu olduğu 4/1 sınıfını passive yaparız ve Fatma öğretmene Atarız. Burada Öğretmen sayfasında ki erişimler değişecek sadece. Başka bir özelliği yok. 

### TA04 — Ders öğretmeni atamasının birimi

Bir ders öğretmeni hangi kayda bağlanmalı?

**Öneri:** Öğretmen, yıllık sınıf–ders planı kaydına bağlansın. Yani `1/A + Matematik + 2026/2027` kaydının öğretmeni seçilsin. Ders kataloğuna veya öğretmen profiline doğrudan yazılmasın.

**Cevabınız:**
Önerine Katılıyorum. burada öğretmen hangi öğretim yılı - hangi sınıf/şube de hangi derse girecek kaydı oluşacak. 

### TA05 — Bir sınıf-ders için öğretmen sayısı

Bir sınıfın aynı dersine birden fazla öğretmen atanabilir mi?

**Öneri:** İlk sürümde bir sınıf-ders için bir ana öğretmen olsun. Birden fazla öğretmen, asistan veya dönüşümlü öğretmen ihtiyacı varsa ikinci pakette tarih/saat bazlı destekleyelim.

**Cevabınız:**
Asistan öğretmenler için bir platformda yönetim olmayacak. Biz haftalık programı yaparken her gün ve her saat için bir sınıfta olacak şekilde kontrollü düzenlemeye dikkat edeceğiz. Eğer bir Matematik öğretmenini örneklersek  Salı günü 3ncü saat te  Hem 6 hemde 7nci sınıfta aynı anda olamaz. Bazen istisna olabilir . Bazı öğretmenler için ama biz burada sistemi kurarken  Admin bir öğretmeni aynı gün aynı saatte birden fazla sınıfa kayıt oluşturursa eğer kayıt oluştur dediğinde UYARI göstereceğiz. Bu öğretmen Salı günü 3üncü saatte 6ncı sınıfta dersi görünüyor. Diğer sınıfı da eklemek istediğinizden eminmisiniz ? İki sınıf birleştirilsin mi diye ona isteyeceğiz. Eğer onaylarsa o zaman aynı gün aynı saatte 2 sınıf öğrencileri için comments , ödev ve benzeri işlemleri gerçekleştirebilir olacak şekilde kuracağız sistemi.


### TA06 — Ders yetkinliği filtre mi, zorunlu kural mı?

Öğretmenin ders yetkinliklerinde bulunmayan bir derse atanması mümkün olmalı mı?

**Öneri:** UI önce yalnız yetkinliği olan öğretmenleri göstersin. Ama Okul Admin isterse “tüm öğretmenleri göster” seçeneğiyle istisna yapabilsin. Bu istisna audit’e girsin.

**Cevabınız:**
Biz zaten UI de öğretmen sayfasına girdik. Öğretmen listesi ekrana geldi. sonra oradan bir öğretmenin detay ekranına girdik. Örneğin bu matematik öğretmeni. hangi öğretim yılı - hangi sınıf/şube de hangi derse girecek kaydı oluşacak. Yetkinlikle ilgili bir kısıt istemiyorum. 

### TA07 — Eksik öğretmen atamaları

Sınıfın yıllık ders planında öğretmeni atanmamış dersler varsa sistem nasıl davranmalı?

**Öneri:** Atama Merkezi’nde “Eksik öğretmenli dersler” uyarısı gösterilsin. Haftalık program ve yoklama akışına geçmeden önce bu eksikler kapatılmalı.

**Cevabınız:**
Boş Kalacak. UI seviyesinde uyarı ekleriz. Ders saatine atanan ders ve öğretmen yok gibi. 

### TA08 — Ortak ders tanımı

Ortak ders nasıl kurulmalı? Örneğin `4/1 + 4/2` aynı saatte aynı öğretmenle Beden Eğitimi yapıyor.

**Öneri:** Haftalık programda tek bir zaman oturumu olsun; bu oturumun birden fazla katılımcı sınıfı olsun. Bu, öğretmen çakışması sayılmasın.

**Cevabınız:**
Bu sistemi zaten yukarıdaki soruda anlattım. 

### TA09 — Ortak derste ders aynı mı olmalı?

Ortak zaman bloğuna katılan sınıfların dersi aynı ders olmak zorunda mı?

**Öneri:** İlk sürümde aynı ders olsun. Örneğin iki sınıf birlikte `Beden Eğitimi` yapabilir. Farklı derslerin aynı salonda/öğretmende birleşmesi daha karmaşık olduğu için sonraya kalsın.

**Cevabınız:**
Sadece Aynı ders için bu sınıf birleşmesi olabilir. 

### TA10 — Öğretmen çakışması

Aynı öğretmen aynı ders saatinde iki farklı bağımsız oturuma atanırsa ne olmalı?

**Öneri:** Sistem bunu engellesin. Sadece ortak ders olarak tek oturumda birden fazla sınıf varsa izin verilsin.

**Cevabınız:**
Bu admine uyarı olarak verilsin. Onaylarsa olsun. 

### TA11 — Sınıf çakışması

Aynı sınıf/şube aynı ders saatinde iki farklı derse atanırsa ne olmalı?

**Öneri:** Sistem bunu engellesin. Sınıf aynı anda yalnız bir program oturumunda bulunabilir.

**Cevabınız:**
Admine onayına sunulsun. 

### TA12 — Haftalık program yıl bazlı mı, dönem bazlı mı?

Haftalık program tüm öğretim yılı için tek mi olmalı, yoksa dönem bazlı değişebilir mi?

**Öneri:** Program dönem bazlı olsun. Çünkü okulda 1. ve 2. dönem programları değişebilir. İlk program ekranı aktif yılın aktif dönemleri için ayrı şablon tutabilir.

**Cevabınız:**
Program yıllık olacak. Eğer değişiklikler olursa admin manuel olarak değiştirecek. 

### TA13 — Haftalık ders saati hedefi

Bir sınıfın bir dersten haftada kaç saat göreceği sistemde tutulmalı mı?

**Öneri:** Evet. Yıllık sınıf–ders planında “haftalık hedef saat” alanı olsun. Program ekranı bu hedefe göre “eksik/fazla yerleştirme” uyarısı verebilir.

**Cevabınız:**
Hayır... bu okul yönetiminin kontrolünde. Serbest giriş olacak.

### TA14 — Çalışma günleri ve okul takvimi

Haftalık programı yapabilmek için önce okulun çalışma günlerini netleştirmemiz gerekiyor mu?

**Öneri:** İlk program sürümü için Pazartesi–Cuma varsayımı yeterliyse hızlı ilerleriz. Cumartesi dersleri, tatiller ve özel okul takvimi için ayrıca okul takvimi modülünü açarız. Eğer okulda Cumartesi veya özel çalışma günü sık kullanılıyorsa programdan önce okul takvimi/çalışma günleri tamamlanmalı.

**Cevabınız:**
Okulun haftalık olarak ekrana getiriyorum.   Okul haftası olarak planlanmalı.  1st Semester başlama bitiş - 2nd Semester başlama bitiş. tarihleri haftanın 5 er günü için işlem yapmaya uygun olacak.  Ptesi - Cuma aralığı . 

### TA15 — Program değişikliği geçmişi

Dönem içinde haftalık program değişirse geçmiş yoklama ve ders kayıtları ne olacak?

**Öneri:** Geçmiş tarihli ders oturumları değişmesin. Program değişikliği yalnız ileri tarihler için geçerli olsun. Bu nedenle gerçek yoklama başladığında program şablonu ile tarihli ders oturumu ayrı tutulmalı.

**Cevabınız:**
Sadece ileri tarhileri etkileyecek. Geçmişe dönük işlem olmayacak. 

### TA16 — Öğretmen portalında ilk görünüm

Öğretmen portalı atama ve programdan sonra ilk hangi bilgileri göstermeli?

**Öneri:** Önce öğretmenin aktif yıldaki sınıf/ders atamalarını ve haftalık programını göstersin. Yoklama, ödev, not ve günlük rapor butonları sonraki paketlerde aktif olsun.

**Cevabınız:**
Uygundur.

### TA17 — Sınıf ekranında öğretmen görünümü

Okul Admin sınıfı açtığında hangi öğretmen bilgisini görmeli?

**Öneri:** Sınıf sorumlusu, sınıfın dersleri, her dersin atanmış öğretmeni ve haftalık hedef/program durumu aynı ekranda özetlensin.

**Cevabınız:**
Cevabı sana görsel olarak gönderiyorum.

### TA18 — Yetki sınırı

Öğretmen ataması ve haftalık programı hangi okul kullanıcısı yönetmeli?

**Öneri:** İlk sürümde Okul Admin yönetir. Permission olarak öğretmen atamaları için ayrı `teaching.assignments.read/manage`, program için ayrı `teaching.schedule.read/manage` sınırı açalım. İleride `ACADEMIC_ADMIN` rolüne bu yetkiler verilir.

**Cevabınız:**
Önerin uygundur. 

### TA19 — Eski veriden aktarım

İlk pilotta öğretmen atamalarını eski sistemden otomatik taşımaya çalışalım mı?

**Öneri:** Hayır. Önce yeni Atama Merkezi çalışsın; okul admin küçük veriyle elle doğrulasın. Eski veriden aktarım ancak model kabul edildikten sonra ayrı import olarak düşünülür.

**Cevabınız:**
Önerin Uygundur.

### TA20 — İlk kabul senaryosu

Bu modülün ilk “tamam” kabulü hangi küçük senaryoyla yapılmalı?

**Öneri:** HorizonEdu’da aktif yıl için bir sınıf seçilsin; sınıf sorumlusu atansın; o sınıfın tüm derslerine öğretmen atansın; eksik öğretmen kalmadığı gösterilsin. Sonra aynı sınıf için haftalık program paketi açılır.

**Cevabınız:**
Ekte göndereceğim görselleri incele. 

## 4. Eski öğretmen ekranı inceleme notu

Kullanıcının yönlendirmesiyle eski proje dosyası incelendi:

- `horizonedu/backend/app/templates/teacher_tem/teacher_login.html`
- ilgili API/model referansları:
  - `horizonedu/backend/app/blueprints/teachers/routes.py`
  - `horizonedu/backend/app/modeller/models.py`

Eski öğretmen dashboard'unda haftalık görünüm şöyle çalışır:

1. Öğretmen giriş yaptığında aktif öğretmenin `weekly_schedule` satırları alınır.
2. Tablo haftanın günleri ve ders saatleriyle kurulur.
3. Aynı gün/saat hücresine öğretmenin birden fazla dersi/sınıfı düşerse hücre içeriği üst üste eklenir.
4. Her eklenen sınıf-ders satırı kendi CTA setini taşır:
   - yoklama
   - lesson / günlük ders açıklaması
   - homework / ödev
   - comment
   - exam
   - material
5. Bu CTA'lar tek ortak hücreye değil, sınıf + ders + öğretmen + tarih + gün/saat bağlamına bağlı çalışır.

Eski kayıtlarda kullanılan ana bağlam:

- `date`
- `day_week_id`
- `day_hours_id` / lesson time
- `lesson_id`
- `class_id`
- `teacher_id`

Bu önemli bir tasarım kararı doğurur:

> Yeni sistemde ortak ders tek zaman bloğu olarak görünebilir; fakat öğretmenin yaptığı işlemler sınıf katılımı bazında ayrı olmalıdır.

Örnek:

- Pazartesi 2. saat
- Matematik
- Öğretmen: Kożeta
- Katılımcı sınıflar: `2/A` ve `2/B`

Öğretmen ekranında bu tek zaman bloğu içinde iki ayrı sınıf satırı/çipi görünmelidir:

- `2/A` için yoklama, comment, ödev, materyal, sınav CTA'ları
- `2/B` için yoklama, comment, ödev, materyal, sınav CTA'ları

Böylece zaman ve öğretmen çakışması tek ortak ders olarak yönetilir; fakat öğrenci listesi, yoklama, ödev ve yorumlar sınıf bazında ayrılır.

Bu nedenle hedef modelde yalnız `TimetableSession` yeterli değildir. Ortak ders için ayrıca katılımcı sınıf satırı gerekir:

- `TimetableSession`: tek zaman bloğu
- `TimetableSessionParticipant`: bu zaman bloğuna katılan sınıf/şube ve ders bağlamı
- Yoklama/comment/homework/material/exam gibi ilerideki öğretmen işlemleri `TimetableSessionParticipant` veya ondan üretilen tarihli sınıf-ders oturumu üzerinden sınıf bazında tutulmalıdır.

## 5. Öğretmen detay UI kararı

Öğretmen detay sayfası tek sayfada alt alta uzayan kartlar şeklinde yapılmayacak. Kullanıcı isteği doğrultusunda içeride tab sistemi kullanılacak.

İlk önerilen tab yapısı:

1. **Özet**
   - öğretmen adı, unvanı, çalışma durumu
   - aktif kullanıcı hesabı
   - kısa sorumlu sınıf özeti

2. **Sorumlu sınıflar**
   - öğretmenin sorumlu olduğu sınıflar
   - aktif/pasif sorumluluk geçişi
   - bir öğretmenin birden fazla sınıfa sorumlu olabilmesi

3. **Ders atamaları**
   - öğretim yılı + sınıf/şube + ders atamaları
   - öğretmenin hangi sınıfta hangi derse girdiği
   - yetkinlik kısıtı olmadan serbest Okul Admin ataması

4. **Haftalık program**
   - öğretmenin gün/saat matrisindeki dersleri
   - ortak derslerde aynı saat bloğu içinde sınıf bazlı ayrı CTA hazırlığı

5. **Hesap**
   - öğretmen portal hesabı
   - geçici parola/sıfırlama/askıya alma işlemleri

Maaş, banka, sözleşme, izin ve bordro tabları bu öğretmen detayının ilk paketine eklenmez; personel/HR paketlerinde ayrı yetki sınırıyla ele alınır.

## 6. Benim şimdilik önerdiğim hedef veri akışı

Bu bölüm kesin karar değildir; cevaplarınızdan sonra güncellenecektir.

```text
AcademicYear
  └─ AcademicTerm
      └─ YearClassSection
          ├─ HomeroomTeacherAssignment
          └─ CourseOffering
              └─ CourseTeacherAssignment
                  └─ TimetableSession
                      ├─ LessonPeriod
                      ├─ Weekday
                      ├─ Teacher
                      └─ TimetableSessionParticipant
                          └─ YearClassSection + CourseOffering
```

Temel ilke:

- Öğretmen profili sabit kimlik bilgisidir.
- Ders yetkinliği aday havuzudur.
- Ders öğretmeni ataması yıllık/dönemlik gerçek iştir.
- Haftalık program zamana yerleşimdir.
- Ortak derslerde zaman bloğu ortak, sınıf bazlı öğretmen işlemleri ayrıdır.
- Yoklama ve ders defteri tarihli gerçek ders oturumudur.

## 7. Paket 4A uygulama notu

Bu kararlar doğrultusunda ilk kodlama diliminde aşağıdaki yapı hedeflenmiştir:

- `HomeroomTeacherAssignment`
  - aktif öğretim yılına ait yıllık sınıf/şube kaydına bağlanır
  - öğretmen profilini bağlar
  - `ACTIVE` / `PASSIVE` durumuyla yıl içi değişiklik geçmişini korur
  - veritabanı düzeyinde aynı sınıfta tek aktif sorumlu öğretmen kuralı vardır

- `CourseTeacherAssignment`
  - aktif öğretim yılına ait sınıf–ders açılımına bağlanır
  - öğretmen profilini bağlar
  - `ACTIVE` / `PASSIVE` durumuyla yıl içi değişiklik geçmişini korur
  - veritabanı düzeyinde aynı sınıf–ders açılımında tek aktif öğretmen kuralı vardır

- Öğretmen listesi artık öğretmen operasyon detayına gider:
  - `Özet`
  - `Sınıf sorumluluğu`
  - `Ders atamaları`
  - `Haftalık program`
  - `Hesap`

Paket 4A sonunda haftalık program sekmesi yalnız hazırlık notu gösteriyordu. Bu not, Paket 4B ile gerçek program yerleşimi için genişletildi.

## 8. Paket 4B uygulama notu

Paket 4B ile haftalık programın ilk çalışan iskeleti hedeflenmiştir:

1. Haftalık program yıllık şablon olarak aktif öğretim yılına bağlanır.
2. Pazartesi–Cuma günleri ve seçili sınıfın `ScheduleProfileVersion` ders saatleri kullanılır.
3. `TimetableSession` tek öğretmen + gün + ders saati zaman bloğunu temsil eder.
4. `TimetableSessionParticipant` aynı bloktaki sınıf/ders katılımcılarını temsil eder.
5. Aynı öğretmen/gün/saat durumunda kullanıcı açıkça “ortak ders” onayı verir; ortak oturumda ders aynı olmalıdır.
6. Aynı sınıf/gün/saat çakışmasında kullanıcı açıkça sınıf çakışması onayı verir.
7. Okul Admin için ana program girişi sınıf merkezlidir:
   - `Akademik Yapı > Haftalık program`
   - önce sınıf seçilir
   - sonra o sınıfın atanmış ders/öğretmen kaydı gün ve ders saatine yerleştirilir
8. Öğretmen detayındaki `Haftalık program` tabı veri giriş merkezi değildir; yalnız öğretmenin otomatik program özetini gösterir.
9. Yoklama/comment/ödev CTA'ları Okul Admin ekranında değil, öğretmen login/dashboard ekranında üretilecektir.
10. CTA üretimi için temel kaynak `TimetableSessionParticipant` satırıdır. Ortak derste aynı hücrede birden fazla sınıf katılımcısı varsa öğretmen dashboard'unda her sınıf için ayrı CTA üretilecektir.
11. Programdan çıkarma silme yapmaz; katılımcıyı `PASSIVE` yaparak geçmişi korur.

## 9. Cevaplardan sonra yapılacaklar

Paket 4B sonrasında sıradaki belge ve kodlama başlıkları:

1. Öğretmen portalında gerçek günlük ders oturumu başlatma akışı
2. Program katılımcısından tarihli yoklama/comment/ödev kayıtlarına geçiş
3. Birleşik sınıf derslerinde iki ayrı sınıf CTA'sının gerçek modüllere bağlanması
4. Sınıf bazlı haftalık program görünümünün canlı veriyle kabul testi
5. Sınıf ve öğretmen programları için rapor/çakışma uyarıları

Bu bölüm ilk karar toplama döneminden kalmıştır. Paket 4A kararları netleştiği için migration ve uygulama kodu bu kararlara göre başlatılmıştır; Paket 4B ile haftalık programın temel verisi, sınıf merkezli Okul Admin girişi ve öğretmen detayındaki otomatik özet görünümü kurulmuştur.
