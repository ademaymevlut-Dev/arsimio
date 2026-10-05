# 06 — Personel ve öğretmen çekirdeği kararları

Tarih: 2026-10-01

Durum: `TAMAMLANDI / YEREL KOD + MIGRATION HAZIR`

Kapsam: Paket 3 — `Department`, `Position`, `Employment`, `TeacherProfile`, öğretmen ders yetkinlikleri ve sonraki atama modülüne hazırlık

## 1. Neden bu karar turu gerekli?

Öğrenci, veli ve profil hesapları artık gerçek kişi temeline oturdu. Bir sonraki büyük bağımlılık öğretmen/personel tarafıdır; çünkü haftalık ders programı, öğretmen yoklaması, öğretmen portalı, sınıf sorumluluğu ve ileride maaş/izin/bordro modülleri bu çekirdeğe dayanacaktır.

Bu pakette hedefimiz HR modülünün tamamını yapmak değildir. Önce okulda çalışan kişiyi, görevini ve öğretmen olarak kullanılabilirliğini doğru kuracağız. Maaş, banka, izin, bordro ve sözleşme belge yönetimi daha dar yetkiyle ayrı paketlere bölünecektir.

## 2. Değişmeyecek temel kurallar

Aşağıdaki kararlar önceki görüşmelerde kesinleşti; yeniden cevaplanmaları gerekmiyor:

1. `Person` gerçek insanı temsil eder; personel, öğretmen ve veli aynı kişi üzerinde birleşebilir.
2. Öğretmen, personel kaydı olmadan oluşturulmaz. Okulda guest öğretmen yoktur.
3. Öğretmenlik, sadece giriş rolünden veya departman isminden türetilmez; ayrı `TeacherProfile` gerekir.
4. Sınıf öğretmeni ve branş öğretmeni ayrımı tutulur.
5. Bir öğretmenin görünen ana unvanı tek olabilir; örneğin `Tarih Öğretmeni`.
6. Aynı öğretmen birden fazla derse girebilir; bu `TeacherSubjectCapability` ile tutulur.
7. Capability gerçek yıllık ders ataması değildir. Ders/sınıf/yıl ataması sonraki öğretmen atama modülünde yapılır.
8. Çalışanın görev, maaş ve sözleşme değişimleri tarihçeli olmalıdır; eski kayıt sessizce ezilmemelidir.
9. Banka, maaş, izin ve bordro genel personel okuma yetkisine açılmayacak ayrı güvenlik alanlarıdır.
10. Personel hesabı otomatik açılmaz; Okul Admin ihtiyaç halinde hesap oluşturur.

## 3. Önerilen uygulama sırası

### Paket 3A — Personel ve öğretmen temel kaydı

- Okul kapsamlı `Department` ve `Position` katalogları
- `Employment` tablosu: kişi + okul çalışma ilişkisi
- Personel liste, kayıt ve detay ekranı
- Mevcut kişiyi personel yapma veya yeni kişiyle personel oluşturma
- İşe giriş, ayrılış, aktif/pasif durum ve yeniden işe giriş kuralı
- `TeacherProfile`: sınıf öğretmeni / branş öğretmeni, ana unvan
- `TeacherSubjectCapability`: öğretmenin okutabileceği dersler
- Öğretmen hesabı açma için altyapı; portal ekranı yalnız gerçek personel/öğretmen özetini gösterir veya Paket 3B'ye bırakılır

### Paket 3B — Sözleşme ve görev/maaş tarihçesi

- `EmploymentContract`
- `EmploymentContractRevision`
- Görev, departman, pozisyon, maaş ve geçerlilik aralıkları
- Sözleşme/anex tarihçesi
- Daha dar `hr.compensation.*` permission'ları

### Paket 3C — İzin, devamsızlık, banka ve bordro

- Banka hesapları
- İzin türleri ve hak edişleri
- İzin kullanımları
- Personel işe geliş/devamsızlık
- Maaş tahakkuku ve ödeme kayıtları

## 4. Cevaplanması gereken kararlar

Her sorunun altındaki **Cevabınız** satırına kararınızı yazabilirsiniz. Öneriyi kabul ediyorsanız yalnız “Öneri uygundur” yazmanız yeterlidir.

### HR01 — İlk personel paketinin sınırı

İlk teslimde yalnız personel/öğretmen temel kaydını mı yapalım?

**Öneri:** Evet. Paket 3A; `Department`, `Position`, `Employment`, `TeacherProfile`, `TeacherSubjectCapability`, personel liste/kayıt/detay ve öğretmen yapılabilirlik alanlarını kapsasın. Maaş, banka, izin, bordro ve ayrıntılı sözleşme revizyonları Paket 3B/3C'ye bırakılsın.

**Cevabınız:**


### HR02 — Personel numarası

Okul içinde personel için ayrı bir personel numarası gerekiyor mu?

**Öneri:** İlk sürümde sistem okul kapsamında artan bir `staffNumber` üretsin. Bu numara yıl içermez ve değişmez. Okul kullanmak istemezse ekranda ikincil bilgi olarak kalır.

**Cevabınız:**


### HR03 — Personel oluşturma yöntemi

Personel kaydı oluştururken mevcut kişi seçilebilsin mi?

**Öneri:** Evet. Öğrenci/veli tarafındaki gibi iki yol olsun:

1. Mevcut `Person` seçilip personel yapılabilir.
2. Yeni kişi + personel kaydı tek işlemde oluşturulabilir.

Böylece bir öğretmenin kendi çocuğu okulda öğrenciyse veya bir veli sonradan personel olursa ikinci kişi kaydı açılmaz.

**Cevabınız:**
Önerin Uygundur.


### HR04 — Departman ve pozisyon katalogları

İlk kurulumda her okul için hangi kataloglar hazır gelsin?

**Öneri:** Okul kapsamlı kataloglar düzenlenebilir olsun. İlk seed olarak şu değerler gelsin:

- Departman: `Yönetim`, `Eğitim`, `Muhasebe`, `Operasyon`, `Destek Hizmetleri`
- Pozisyon: `Müdür`, `Müdür Yardımcısı`, `Muhasebeci`, `Sınıf Öğretmeni`, `Branş Öğretmeni`, `Temizlik Görevlisi`, `Güvenlik Görevlisi`, `Mutfak Çalışanı`

Okul Admin daha sonra yeni departman/pozisyon ekleyebilsin, fakat geçmiş personel kayıtları bozulmasın.

**Cevabınız:**
Önerin Uygundur. Sadece Dil seçeneklerini unutmayalım. 3 dil uyumlu olsun. 

### HR05 — Çalışma türleri

İlk `Employment` için hangi çalışma türleri gerekli?

**Öneri:** İlk enum değerleri:

- `FULL_TIME` — Tam zamanlı
- `PART_TIME` — Yarı zamanlı
- `FIXED_TERM` — Süreli sözleşme
- `CONTRACTOR` — Hizmet/sözleşmeli çalışan
- `INTERN` — Stajyer

`GUEST` eklenmesin; çünkü okulda personel kaydı olmadan ders veren guest öğretmen olmadığı belirtildi.

**Cevabınız:**
Önerin Uygundur. 

### HR06 — İlk personel kaydındaki zorunlu alanlar

Personel oluştururken hangi alanlar zorunlu olmalı?

**Öneri:** Zorunlu alanlar sadece:

- ad
- soyad
- işe giriş tarihi
- çalışma türü
- departman
- pozisyon

Telefon, e-posta, kimlik, doğum bilgisi, ayrıntılı adres, sözleşme ve maaş ilk kayıtta isteğe bağlı veya sonraki paketlere ait olsun.

**Cevabınız:**
Önerin Uygundur. 

### HR07 — Ayrılma ve yeniden işe giriş

Bir çalışan ayrılıp sonra tekrar işe başlarsa ne olmalı?

**Öneri:** Eski `Employment` `ENDED` durumuna kapanır; aynı `Person` üzerinde yeni bir `Employment` açılır. Böylece eski çalışma dönemi ve yeni çalışma dönemi karışmaz.

**Cevabınız:**
Bir Çalışanın işten ayrılma , çıkarılma ve pasif duruma alırnıken bırakabileceğimiz bir NOT alanımız olsun. Yeniden işe dönüş ile ilgili de bilgi ekleyeceğimiz alan önemli.  Doğum izni için ayrılıp tekrar 6 ay süre sonra geri dönüş sık sık karşılaşılan bir durum. Yani bizim projede setting yada tanımlamalar ekranımız olursa burada  departman - pozisyon - işten ayrılma sebebi gibi seçmeli alan kayıtları oluştabiliriz. 

### HR08 — Öğretmen profili alanları

Öğretmen profili ilk sürümde hangi alanları taşısın?

**Öneri:** `TeacherProfile` alanları:

- öğretmen kategorisi: `CLASSROOM` veya `BRANCH`
- ana unvan: örneğin `Tarih Öğretmeni`
- öğretmen notu/açıklama: isteğe bağlı
- aktif/pasif durumu

Sınıf sorumluluğu ve yıllık ders ataması bu profilde tutulmasın; sonraki atama modülünde yıl/sınıf/ders bağlamıyla oluşturulsun.

**Cevabınız:**
Önerin Uygundur. 

### HR09 — Öğretmenin okutabileceği dersler

Öğretmenin birden fazla dersi okutabilmesi nasıl girilsin?

**Öneri:** Öğretmen detayında okulun global ders kataloğundan çoklu ders seçilsin. Örneğin ana unvan `Tarih Öğretmeni` olabilir ama capability olarak `Tarih` ve `Sosyal Bilgiler` seçilebilir.

**Cevabınız:**
Ben burada eğitim öğretim yılını seçip. Yani daha doğrusu sadece Active olan yıl geçerli olarak Öğretmenin hangi sınıf'a ve hangi derslere gireceğini seçiyordum. Yani Öğretmenin Kimlik kartında seçtiğimiz sınıf öğretmeni yada branş öğretmeni kısmında belirlediğimiz ünvanın daha ileride ders - sınıf ve saat atamalarında herhangi bir etkisi olmayacak. Şuan yaptığımız sadece Profil kaydı olacak. 

### HR10 — Öğretmen/personel hesabı

Paket 3A içinde öğretmen/personel için giriş hesabı da açalım mı?

**Öneri:** `TeacherProfile` oluşunca öğretmen hesabı manuel açılabilsin; fakat ilk öğretmen portalı yalnız öğretmenin kendi adı, unvanı, okutabileceği dersler ve aktif durumunu göstersin. Ders başlatma, yoklama, ödev, not ve günlük rapor akışları sonraki modüllerde açılacak. Öğretmen olmayan personel için `STAFF` portal hesabı şimdilik açılmasın.

**Cevabınız:**
Şuanda Planlamamız da sistem sadece Okul Yönetimi (Admin kullanıcılar), Öğretmen , Öğrenci , Veli , Servis Şoförü kullanıcıları için ekranlar olacak. Personelin bir Staff olarak girdiği bir ekran olmayacak. 


### HR11 — Hassas HR yetkileri

Maaş, banka ve sözleşme verileri için ayrı yetki sınırı nasıl olmalı?

**Öneri:** İlk personel listesi herkesin maaş/banka verisini göstermez. İleride:

- `hr.staff.read/manage` temel personel için,
- `hr.contracts.read/manage` sözleşme için,
- `hr.compensation.read/manage` maaş ve banka için,
- `hr.leave.read/manage` izin için

ayrı permission olarak tasarlansın.

**Cevabınız:**
Önerin Doğru Fakat burada Admin yani muhasebe ve yönetim kullanıcı harici bir tanımlama gerekecek. Yani okul yönetiminde öğrenci - öğretmen işlerini yöneten bir kullanıcı yetkisi olsun.  Birde + olarak Finans kısmını yöneten bir yönetici mi olacak ? Burayı biraz tartışalım.  



### HR12 — Personel fotoğrafı ve belgeler

Personel fotoğrafı, kimlik kopyası, sözleşme PDF'i gibi belgeler bu pakete girsin mi?

**Öneri:** Hayır. Paket 3A yalnız veri modeli ve temel ekranlar olsun. Fotoğraf/belge yükleme; dosya depolama, erişim ve saklama kuralları netleşince ayrı paket yapılsın.

**Cevabınız:**
Önerine katılıyorum. 


## 5. Cevaplardan sonra uygulanacak teknik teslim

Yanıtlar tamamlandığında Paket 3A için:

1. nihai tablo/kısıt planı,
2. additive Prisma migration,
3. personel oluşturma/güncelleme/ayrılma servisleri,
4. personel liste–kayıt–detay ekranları,
5. öğretmen profili ve ders capability ekranları,
6. isteğe bağlı öğretmen hesabı bağlantısı,
7. tenant, aynı kişiyi tekrar kullanma, hassas veri izolasyonu ve tarihçe testleri

hazırlanacaktır. Kullanıcı cevapları okunmadan migration veya canlı veri değişikliği yapılmayacaktır.

## 6. 2026-10-01 okuma notu ve ek netleştirme

Kullanıcı cevapları okundu. Çoğu karar Paket 3A için yeterlidir; aşağıdaki küçük noktalar netleşmeden migration veya uygulama koduna geçilmeyecektir.

### Açık-1 — HR01 boş bırakıldı

HR01 cevabı boş. Diğer cevapların bağlamına göre Paket 3A'nın yalnız personel/öğretmen temel kaydı olması uygun görünüyor.

**Varsayım:** HR01 için öneri kabul edildi; maaş, banka, izin, bordro ve ayrıntılı sözleşme revizyonları Paket 3B/3C'ye kalacak.

**Cevabınız:**
Evet Önerine Katılıyorum.

### Açık-2 — HR02 personel numarası boş bırakıldı

HR02 cevabı boş. Öğrenci numarası gibi yıl içermeyen, okul kapsamında artan bir `staffNumber` üretmek personel listesinde pratik olur.

**Varsayım:** Sistem okul kapsamında artan, yıl içermeyen `staffNumber` üretsin; ekranda ikincil bilgi olarak gösterilsin.

**Cevabınız:**
Evet Önerine Katılıyorum. Aynı öğrencide uyguladığımız oto. staff number uygulansın.

### Açık-3 — HR07 ayrılma sebebi sözlüğü

HR07 cevabında ayrılma/çıkarma/pasife alma sırasında not alanı ve seçmeli ayrılma sebebi gerektiği belirtildi. Doğum izni gibi geçici ayrılıkların da sık görüldüğü söylendi.

**Önerilen ilk ayrılma/sebep sözlüğü:**

- `RESIGNED` — Kendi isteğiyle ayrıldı
- `TERMINATED` — İşten çıkarıldı
- `CONTRACT_ENDED` — Sözleşme bitti
- `MATERNITY_LEAVE` — Doğum izni / uzun izin
- `HEALTH` — Sağlık sebebi
- `RELOCATION` — Taşınma
- `OTHER` — Diğer
- `UNKNOWN` — Belirtilmedi

**Not:** Doğum izni gerçek işten ayrılma olmayabilir. Paket 3A'da bunu `Employment.status = ON_LEAVE` + not alanı ile tutmak, gerçek ayrılışları `ENDED` yapmak daha doğru görünüyor. Ayrıntılı izin hakları/kullanımları Paket 3C'ye kalır.

**Cevabınız:**
Evet Önerin uygundur. 

### Açık-4 — HR09 capability ile yıllık ders ataması ayrımı

HR09 cevabında eski sistemde aktif eğitim yılında öğretmenin hangi sınıf ve hangi derse gireceğinin seçildiği belirtildi. Bu önemli ayrım şöyle kaydedildi:

- `TeacherProfile.title` yalnız profil bilgisidir; ders/sınıf/saat atamalarını otomatik belirlemez.
- `TeacherSubjectCapability` öğretmenin genel olarak okutabileceği dersleri gösteren profil bilgisidir; gerçek atama değildir.
- Gerçek öğretmen ataması sonraki modülde aktif/yıllık bağlamda yapılır: öğretim yılı + sınıf/şube + ders + öğretmen + saat/program.

**Öneri:** Paket 3A'da `TeacherSubjectCapability` kalsın ama sadece filtre/aday havuzu bilgisi olsun. Aktif yıl, sınıf ve ders atama ekranı Paket 4'te ayrı yapılsın.

**Cevabınız:**
Ben UI düzeninde de kurgularken sol sidebar üzerinde Bir Personel ekranı bulunduracağım. Okulun tüm personelinin personel işlemlerinin yapıldığı ekranlar olacak.  Maaş , kontrat , yıllık izinler ve benzeri tüm işlemler. 

Birde Öğretmenler diye bir Ekran olacak. Burada Yönetim sidebar da öğretmenler ekranına girince öğretmen listesi çıkacak ve seçtiği öğretmenin girdiği dersler , sorunmlu olduğu sınıf , ders programı gibi bilgilerinin girişi yapıldığı ve incelendiği sayfalar olacak. 


### Açık-5 — HR11 yönetim rolleri

HR11 cevabında okul yönetiminde farklı admin tipleri gerektiği belirtildi:

- öğrenci/öğretmen işlerini yöneten kullanıcı,
- finans/muhasebe işlerini yöneten kullanıcı,
- genel okul yönetimi/admin.

**Öneri:** Paket 3A'da yeni rol UI'si açılmasın; fakat permission sınırları baştan ayrı tasarlansın. Sonraki kullanıcı yönetimi paketinde başlangıç rolleri şöyle olabilir:

- `SCHOOL_ADMIN`: tüm okul yönetimi
- `ACADEMIC_ADMIN`: öğrenci, veli, öğretmen, akademik yapı ve program
- `FINANCE_ADMIN`: finans, ödeme, borç, maaş/banka gibi hassas finans alanları
- `HR_ADMIN`: personel, sözleşme, izin ve özlük alanları

Paket 3A personel temel ekranı için yalnız `hr.staff.read/manage` yeterli olur; maaş/banka/sözleşme alanları ileride ayrı permission ile açılır.

**Cevabınız:**
Evet bu önerin uygundur. 

## 7. 2026-10-01 teknik uygulama notu

Paket 3A kararları yerel kod ve migration olarak uygulandı. Bu turda canlı veritabanına deploy yapılmadı.

### Eklenen veri modeli

- `SchoolSequenceKind.STAFF_NUMBER`
- `StaffDepartment` ve `StaffDepartmentTranslation`
- `StaffPosition` ve `StaffPositionTranslation`
- `Employment`
- `EmploymentLifecycleEvent`
- `TeacherProfile`
- `TeacherSubjectCapability`

Önemli kısıtlar:

- Aynı okulda aynı kişi için aynı anda yalnız bir açık personel kaydı olabilir: `ACTIVE` veya `ON_LEAVE`.
- Ayrılan personel eski `Employment` kaydı üzerinde `ENDED` olur; yeniden işe dönüş aynı `Person` üzerinde yeni `Employment` olarak açılabilir.
- Doğum/uzun izin gibi gerçek ayrılış olmayan durumlar `ON_LEAVE` + not/sebep ile tutulur.
- Öğretmen profili yalnız açık personel kaydı üzerinde oluşturulur.
- `TeacherSubjectCapability` yıllık atama değildir; yalnız öğretmenin okutabileceği dersleri gösteren profil bilgisidir.

### Eklenen permission sınırı

- `hr.staff.read`
- `hr.staff.manage`
- `hr.catalog.read`
- `hr.catalog.manage`
- `teachers.read`
- `teachers.manage`

Bu permission'lar migration içinde mevcut `SCHOOL_ADMIN` rollerine bağlanır. İleride `ACADEMIC_ADMIN`, `FINANCE_ADMIN` ve `HR_ADMIN` rolleri açılırken bu sınırlar yeniden dağıtılacaktır.

### Eklenen okul ekranları

- `/staff` — personel listesi
- `/staff/new` — yeni kişiyle veya mevcut kişi seçerek personel kaydı
- `/staff/[employmentId]` — personel detayı, durum geçişi, öğretmen profili, ders capability, öğretmen hesabı
- `/staff/settings` — departman ve pozisyon katalog yönetimi
- `/teachers` — öğretmen listesi
- `/teacher` — öğretmen portalı ilk özet ekranı

### Bilinçli olarak ertelenenler

- Maaş, banka, bordro, sözleşme ve yıllık izin detayları
- Personel belge/fotoğraf yükleme
- Öğretmenin aktif öğretim yılında hangi sınıf, ders ve saatte görevli olduğu yıllık atama modülü
- Ders programı, yoklama, ödev, not ve günlük rapor akışları

### 2026-10-05 ilerleme notu

Öğrenci fotoğraf yükleme akışı tamamlandıktan sonra aynı Blob/WebP mantığı personel detay ekranına da taşındı. Bu not ile “personel belge/fotoğraf yükleme” satırındaki fotoğraf kısmı tamamlanmış kabul edilir; kimlik kopyası, sözleşme PDF'i ve diğer personel belgeleri ayrı doküman/evrak fazına bırakılmıştır.

### 2026-10-05 ilerleme notu — personel özlük alanları

Personel detay ekranına maaş/kontrat/izin alanlarına girmeden ilk özlük kartı eklendi. Bu kartta adres, acil durum kişisi, personel iç notu ve resmî kimlik/pasaport bilgisi yönetiliyor. Kimlik/pasaport bilgisi ayrı bir personel tablosuna değil, gerçek kişi temelli `person_identities` yapısına güvenli/şifreli şekilde kaydediliyor. Adres ve acil durum alanları ise personelin okul kapsamındaki iş kaydına bağlı `employment_hr_profiles` tablosunda tutuluyor.

### Doğrulama

- `pnpm exec prisma validate`
- `pnpm exec tsc --noEmit`
- `pnpm test` → 74/74 geçti
- `pnpm lint` geçti
- `pnpm build` geçti; production build yeni `/staff`, `/teachers` ve `/teacher` route'larını üretti.

## 8. 2026-10-01 katalog yönetimi ek uygulama notu

Paket 3A içindeki departman/pozisyon kataloglarının Okul Admin tarafından yönetilmesi tamamlandı. Yeni migration eklenmedi; mevcut `StaffDepartment`, `StaffDepartmentTranslation`, `StaffPosition` ve `StaffPositionTranslation` tabloları kullanıldı.

Eklenenler:

- `/staff/settings` ekranı ile departman ve pozisyon oluşturma, güncelleme, arşivleme ve geri alma
- Türkçe, Arnavutça ve İngilizce adların tek katalog kaydı altında zorunlu yönetimi
- `hr.catalog.read` ve `hr.catalog.manage` yetkilerine bağlı sayfa/action erişimi
- Personel ana sayfası ve sol menüden katalog ekranına erişim
- Arşivlenen katalogların silinmemesi; geçmiş `Employment` kayıtlarının departman/pozisyon bağlantısının korunması

Doğrulama:

- `./node_modules/.bin/tsc --noEmit --pretty false`
- `pnpm test` → 76/76 geçti
- `pnpm lint` geçti
- `pnpm build` geçti; production build yeni `/staff/settings` route'unu üretti.
