# 05 — Profil hesapları ürün kararları

Tarih: 2026-10-01

Durum: `TAMAMLANDI / CANLI KABUL`

Kapsam: Paket 2 — `PersonAccount`, öğrenci/veli giriş hesapları, parola yaşam döngüsü ve portal yönlendirmesi

## 1. Neden bu karar turu gerekli?

Öğrenci, anne ve baba artık aynı okul içindeki gerçek kişiler olarak doğru biçimde tutuluyor. Ancak bir kişinin sistemde kayıtlı olması, onun giriş hesabı olduğu anlamına gelmiyor.

Mevcut sistemde:

- `User`, `UserCredential` ve `SchoolMembership` ile kullanıcı adı, parola, okul üyeliği ve roller yönetiliyor;
- Okul Admin hesapları çalışıyor;
- öğrenci ve veliler henüz bir giriş hesabına bağlı değil;
- giriş yapan her okul hesabı şu anda `/dashboard` adresine yönleniyor;
- ilk girişte parola değiştirme, Okul Admin tarafından parola sıfırlama ve hesap askıya alma ekranları henüz yok;
- mevcut Okul Admin hesaplarının karşılığında henüz `Person` kaydı bulunmuyor.

Paket 2'nin amacı kişi kaydını çoğaltmadan giriş hesaplarını kişiye bağlamak ve her hesabı kendi portalına güvenli biçimde yönlendirmektir.

## 2. Değişmeyecek temel kurallar

Aşağıdaki kararlar önceki görüşmelerde kesinleşti; yeniden cevaplanmaları gerekmiyor:

1. `Person` gerçek insanı, `User` giriş hesabını temsil eder.
2. Hesaplar otomatik açılmaz; Okul Admin ihtiyaç halinde açar.
3. Aynı kişi, örneğin öğretmen ve veli olduğunda, tek `Person` kaydı üzerinde iki bağımsız giriş hesabı taşıyabilir.
4. Bu iki hesabın kullanıcı adı, parolası, oturumu ve askıya alma durumu birbirinden bağımsızdır.
5. Giriş ekranında rol veya portal seçilmez; sistem hesabın portalını kendisi bilir.
6. Anne veya babanın portal hesabı olması `primary` seçimine bağlı değildir. `Primary`, yalnız ücretli SMS/e-posta alıcısını belirler.
7. Hesap açılması kişiye otomatik olarak sınırsız yetki vermez; rol, permission ve kaynak kapsamı ayrıca uygulanır.
8. Parola, parola özeti ve oturum anahtarı profil, audit veya hata mesajlarına yazılmaz.

## 3. Önerilen uygulama sırası

Paket 2'nin aşağıdaki küçük teslimlere ayrılması önerilir:

### Paket 2A — Hesap temeli ve öğrenci/veli hesapları

- `PersonAccount` tablosu ve tenant kısıtları
- mevcut Okul Admin hesabının bir `Person` kaydına bağlanması
- öğrenci detayından öğrenci hesabı açma
- öğrenci detayındaki anne/baba kartından veli hesabı açma
- okul kullanıcı hesapları listesi
- geçici parola, zorunlu ilk parola değişimi, sıfırlama ve askıya alma
- `SCHOOL_ADMIN`, `GUARDIAN` ve `STUDENT` portal yönlendirmeleri
- öğrenci ve veli için gerçek veriden üretilen sade başlangıç sayfaları

### Paket 2B — Hesap yönetimini genişletme

- kullanıcı adı değiştirme, yeniden etkinleştirme ve arşivleme ayrıntıları
- Okul Admin dışındaki yönetim rollerinin ürün akışı
- gelişmiş rol/permission atama ekranı

### Paket 2C — Öğretmen/personel hesabı bağlantısı

Bu dilim Paket 3'te `Employment` ve `TeacherProfile` oluşturulduktan sonra açılır. Böylece öğretmen veya personel hesabı, henüz var olmayan bir personel profiline bağlanmaz. Aynı kişi veli ise mevcut `Person` kaydı tekrar kullanılacaktır.

## 4. Cevaplanması gereken kararlar

Her sorunun altındaki **Cevabınız** satırına kararınızı yazabilirsiniz. Öneriyi kabul ediyorsanız yalnız “Öneri uygundur” yazmanız yeterlidir.

### H01 — İlk hesap paketinin kapsamı

İlk teslimde yalnız mevcut Okul Admin hesaplarının kişiye bağlanması ile öğrenci ve veli hesaplarını mı tamamlayalım? Öğretmen/personel hesabını, personel profili oluşturulacak Paket 3'e bırakalım mı?

**Öneri:** Evet. Paket 2A yalnız `SCHOOL_ADMIN`, `GUARDIAN` ve `STUDENT` bağlamlarını tamamlasın. Öğretmen/personel hesapları için veri modeli hazır olsun fakat kullanıcı ekranı Paket 3'te açılsın.

**Cevabınız:**
Öneri Uygundur. 

### H02 — Hesap oluşturma ekranlarının yeri

Öğrenci ve veli hesabı nereden oluşturulmalı?

**Öneri:** İki giriş noktası birlikte kullanılsın:

1. Öğrenci detayında öğrenci için “Öğrenci hesabı oluştur” düğmesi,
2. aynı ekrandaki her anne/baba kartında “Veli hesabı oluştur” düğmesi.

Ayrıca Okul Admin menüsünde bütün hesapları ve durumlarını gösteren merkezi bir **Kullanıcı hesapları** listesi bulunsun. Hesap, kişi seçmeden sıfırdan oluşturulmasın; mutlaka mevcut bir kişiye bağlansın.

**Cevabınız:**
1. Öğrenci detayında öğrenci için hesap oluştur olsun. 
2. Veli için bizim sol side menüde Veli sayfasını açan bir cta olsun . Yani side menü ile kolayca öğrenci menüsünde yaptığımız gibi tıklandığında Veli listesi çıksın ve Veli sayfasında velinini bilgileri + user oluştur + Çocuk ekle , çıkart işlemlerini yapabilsin Okul Admin kullanıcısı.  Bunu neden istiyorum çünkü Bazen Veli için bir değişiklik telefon mail gibi detayları yaparken öğrenciye ulaş oradan veliye ulaş gibi uzun işlem yerine direkt olarak Velinin detay sayfasını açıp Tel - emmail gibi güncellemeleri de bu ekrandan yapabiliriz. 



### H03 — Anne ve babanın portal erişimi

Bir öğrenciye bağlı anne ve babanın ikisine de ayrı veli hesabı açılabilsin mi?

**Öneri:** Evet. Okul ister yalnız birine, ister ikisine hesap açabilsin. Her ikisi de bağlı çocuklarını görebilsin; ücretli otomatik SMS/e-posta yine yalnız `primary` veliye gitsin.

**Cevabınız:**
Önerin Uygundur. 




### H04 — Bir velinin birden fazla çocuğu

Aynı anne/baba aynı okulda birden fazla öğrenciye bağlıysa portal davranışı nasıl olmalı?

**Öneri:** Veliye tek `GUARDIAN` hesabı açılır. Giriş yaptığında kendisine bağlı bütün aktif öğrencileri tek ekranda görür ve çocuklar arasında geçiş yapar. Her çocuk için yeni kullanıcı adı/parola oluşturulmaz.

**Cevabınız:**
Evet Veli tek giriş yapar . eğer birden fazla çocuğu varsa ekrana en önce Çocuk seçimi gelir ve O çocuğa ait olan detaylar ekrana gelir. O ekranda Çocuğu değiştir CTA'sı olur ve diğer çocuğa geçiş yapar. Eğer tek çocuğu varsa direk olarak o çocuğun bilgileri ekrana gelir. 
Eğer HorizonEDU projemde template klasöründe parents_tem klasöründe HTML 'in çalışma şeklini ve uyguladığım sorguları , ekran akışını analiz edebilirsin. 



### H05 — İlk/geçici parolanın oluşturulması

Mail ve SMS gönderimi henüz bulunmadığı için ilk parola veliye veya öğrenciye nasıl verilmeli?

**Öneri:** Sistem güçlü bir geçici parola üretsin ve Okul Admin'e yalnız bir kez göstersin. Yönetici bu bilgiyi güvenli biçimde kullanıcıya iletsin. Parola daha sonra ekrandan tekrar okunamasın; unutulursa yeni geçici parola oluşturulsun.

Alternatif olarak Okul Admin geçici parolayı iki kez elle girebilir. Bu yöntem mevcut ilk Okul Admin akışına benzer, fakat zayıf veya tekrar kullanılan parola riskini artırır.

**Cevabınız:**

### H06 — İlk girişte parola değiştirme

Geçici parolayla giriş yapan kullanıcı doğrudan portalı kullanabilsin mi?

**İlk öneri:** Hayır. İlk girişte yalnız “Yeni parola belirle” ekranına yönlendirilsin. İlk taslakta en az 12 karakter önerilmişti.

**Nihai karar:** Kullanıcı cevabına göre yeni parola en az 8 karakter olmalıdır. Parola yine hash olarak saklanır; düz parola, hash ve oturum anahtarı audit veya hata mesajlarına yazılmaz.

**Cevabınız:**
Şimdi benim de yaptığım yöntemi change_pas_parent.html sayfasından inceleyebilirsin. Eğer geçici parola 12345678 ile giriş yaparsa ben yeni parola oluştur sayfasına yönlendiriyorum ve aile gerçek parolayı giriş yapıyor. sonrasında da sisteme girmiyor ve geri index sayfasına dönüyor. Oluşturduğu gerçek şifre ile sisteme giriş yapabiliyor. Fakat güvenlik kaygısı ile biz 12 karakterli şifreleme yaparsak bu her sisteme girişte aile için yorucu olacaktır.Yani büyük harf küçük harf simge ve 12 karakter her girişi çok yorucu yapar . burada 8 karakterli istediği gibi bir giriş yapsın ve biz Hash ile veritabanında şifreyi saklayalım. 


### H07 — Okul Admin parola sıfırlama işlemi

Kullanıcı parolasını unutursa ilk sürümde nasıl sıfırlanmalı?

**Öneri:** Mail/SMS kurtarma bağlantısı şimdilik yapılmasın. Okul Admin “Parolayı sıfırla” işlemiyle yeni tek kullanımlık geçici parola oluştursun. Hesabın bütün açık oturumları aynı işlemde iptal edilsin ve kullanıcı yeniden girişte parola değiştirsin.

**Cevabınız:**
Evet sıfırlanan paraloda ben önceki sistemde 12345678 vermiştim . Eğer parolar generate ederek vermek daha iyiyse admin geçici parolayı Veliye bildirir ve Veli böyle giriş yapar .. 




### H08 — Hesap askıya alma ve diğer hesapların bağımsızlığı

Bir kişi iki ayrı hesaba sahipse bir hesabın askıya alınması diğerini etkilemeli mi?

**Öneri:** Etkilememeli. Örneğin öğretmen hesabı askıya alınsa bile aynı kişinin veli hesabı çalışmaya devam eder. Askıya alınan hesabın bütün oturumları anında iptal edilir; kişi, öğrenci veya veli ilişkisi silinmez.

**Cevabınız:**
Hangi hesap iptal edilirse o hesap kapanır. diğer hesaplar aynı kalır. Önerin uygundur. 




### H09 — Kullanıcı adı değişikliği ve tekrar kullanımı

Okul Admin sonradan kullanıcı adını değiştirebilsin mi? Arşivlenen bir hesabın eski kullanıcı adı başka kişiye verilebilsin mi?

**Öneri:** Yazım hatası gibi durumlar için kullanıcı adı değiştirilebilsin; işlem gerekçe ve audit kaydıyla yapılsın, mevcut oturumlar iptal edilsin. Daha önce kullanılmış kullanıcı adları arşivden sonra başka kişiye verilmesin; böylece geçmiş audit kayıtlarının anlamı karışmasın.

**Cevabınız:**
Önerin Uygundur. 


### H10 — Portal başlangıç sayfaları

Hesap oluşturulduktan sonra kullanıcı giriş yaptığında ilk sürümde ne görmeli?

**Öneri:**

- Okul Admin → mevcut `/dashboard`
- Veli → `/guardian`; bağlı çocukların ad, okul numarası, aktif sınıf ve primary iletişim durumunu gösteren sade ana sayfa
- Öğrenci → `/student`; kendi ad, okul numarası, aktif öğretim yılı ve sınıfını gösteren sade ana sayfa

Not, yoklama, ödev ve finans kartları ilgili modüller yapılmadan sahte veya boş özellik olarak gösterilmesin.

**Cevabınız:**
Önerin uygundur. Şimdilik sadece elimizdeki verileri tek ekranda gösterelim. Tasarım işini sona bırakıyorum. 

### H11 — Rol atama sınırı

Hesap oluştururken Okul Admin serbestçe rol seçsin mi?

**Öneri:** İlk teslimde hayır. Portal türü güvenli sistem rolünü otomatik bağlasın: öğrenci hesabına `STUDENT`, veli hesabına `GUARDIAN`. Ek/custom rol ve permission yönetimi Paket 2B'de ayrı tasarlansın. Portal türü ile rol aynı kavram olmasa da ilk güvenli rol paketi otomatik verilmelidir.

**Cevabınız:**
Bunu anlamadım. ? 




### H12 — Mevcut Okul Admin hesaplarının kişi kaydı

HorizonEdu ve GjimCamEdu'daki mevcut ilk Okul Admin hesapları için `Person` kaydı nasıl oluşturulmalı?

**Öneri:** Migration sonrasında kontrollü/idempotent bir servis mevcut aktif Okul Admin'in ad-soyadından aynı okulda bir `Person` oluşturup `SCHOOL_ADMIN` `PersonAccount` bağlantısını kursun. Eşleşme yalnız ad-soyada bakılarak otomatik yapılmasın; aynı isimli mevcut kişi varsa işlem rapora düşsün ve yönetici seçim yapsın. Böylece Okul Admin'in çocuğu okulda öğrenciyse aynı kişi sonradan veli olarak da bağlanabilir.

**Cevabınız:**
Önerin Uygundur. 


### H13 — Hesap dili

Yeni hesabın ilk ekran dili nasıl belirlensin?

**Öneri:** Hesap okulun varsayılan diliyle açılsın. Kullanıcı ilk girişten sonra kendi dilini Türkçe, Arnavutça veya İngilizce olarak değiştirebilsin; seçim mevcut `SchoolMembership.preferredLocale` alanında tutulsun.

**Cevabınız:**
Önerin uygundur. 



## 5. Cevaplardan sonra uygulanacak teknik teslim

Yanıtlar tamamlandığında Paket 2A için ayrı olarak:

1. nihai tablo/kısıt ve geçiş planı,
2. additive Prisma migration,
3. hesap oluşturma–sıfırlama–askıya alma servisleri,
4. Okul Admin hesap listesi ve kişi detayındaki hesap işlemleri,
5. zorunlu ilk parola değiştirme akışı,
6. öğrenci/veli portal route ve kaynak kapsamı kontrolleri,
7. tenant, ayrı hesap, parola sürümü, oturum iptali ve portal izolasyon testleri

hazırlanacaktır. Kullanıcı cevapları okunmadan migration veya canlı veri değişikliği yapılmayacaktır.

## 6. 2026-10-01 uygulama notu

Paket 2A yerelde additive olarak uygulandı:

- `PersonAccount` tablosu ve `AccountPortal` enum'u eklendi.
- Öğrenci ve veli hesapları mevcut `Person` kayıtlarına bağlanacak şekilde açılır.
- Geçici parola sistem tarafından üretilir ve yalnız işlem sonucunda bir kez gösterilir.
- İlk girişte parola değiştirme zorunludur; kullanıcı yeni parolayı belirledikten sonra tekrar login ekranına döner.
- Parola minimumu kullanıcı kararıyla 8 karaktere indirildi; hash/scrypt saklama mantığı aynen korundu.
- Hesap sıfırlama yeni geçici parola üretir, credential version artırır ve açık oturumları iptal eder.
- Hesap askıya alma yalnız ilgili `User`/membership/account oturumunu kapatır; aynı gerçek kişinin başka portal hesabını etkilemez.
- Okul Admin shell'e `Veliler` ve `Kullanıcı hesapları` sayfaları eklendi.
- Öğrenci detayında öğrenci hesabı, anne/baba kartlarında veli hesabı açma/sıfırlama/askıya alma işlemleri eklendi.
- `/guardian` ve `/student` portal başlangıçları yalnız eldeki gerçek öğrenci/veli verilerini gösterir.
- Öğretmen/personel hesabı UI'si Paket 3'teki personel profili tasarımına bırakıldı.

## 7. 2026-10-01 canlı kabul notu

Kullanıcı canlı ortamda şu akışı doğruladı:

1. Okul Admin veli için hesap oluşturdu.
2. Sistem geçici parola gösterdi.
3. Veli geçici parola ile giriş yaptı ve parola değiştirme ekranına yönlendirildi.
4. Veli yeni parolayı belirledi.
5. Veli yeni parolayla tekrar giriş yaptı.
6. Veli portalında doğru öğrenci kayıtları görüntülendi.
7. Admin kullanıcısı hesaplar ekranından aktiflendi.

Bu doğrulama Paket 2A profil hesapları için canlı kabul olarak kaydedildi.
