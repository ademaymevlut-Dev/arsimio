# 10 — Eksik alanlar ve modül karar soruları

Tarih: 2026-10-05  
Durum: `CEVAP BEKLENİYOR`
Kapsam: Öğretmen, öğrenci ve veli portallarındaki temel veri akışı tamamlandıktan sonra; kişi, öğrenci, veli, personel, finans, kontrat, doküman ve bildirim modüllerinde eksik kalabilecek alanları netleştirmek.

Bu belge kodlama dokümanı değildir. Amaç, bundan sonraki kodlama adımlarında yanlış tablo/alan eklememek için hangi gerçek verilerin tutulacağını ve hangi modüllerin hangi sırayla ele alınacağını netleştirmektir.

Şu aşamada tamamlanmış kabul edilen ana akış:

- Okul admin kullanıcı ve hesap yönetimi
- Akademik yıl, sınıf, ders, haftalık program temeli
- Öğretmen portalı
- Öğretmen CTA kayıtları
  - ders konusu
  - ödev
  - öğrenci yorumu
  - sınav bildirimi
  - yoklama
- Öğrenci portalı
- Veli portalı
- Primary veli mantığı
- Anne/baba bilgisinin ayrı tutulması
- Öğretmen, öğrenci ve veli hesaplarının gerçek kişi üzerinden bağlanabilmesi

Bundan sonraki kararlar özellikle şu modülleri etkileyecek:

- öğrenci detay ekranı
- personel detay ekranı
- öğretmen detay ekranı
- veli detay ekranı
- okul ücretleri ve kontratlar
- doküman/kaynak dosya yönetimi
- günlük e-posta raporu
- ilerideki UI toparlama çalışmaları

## 1. Genel çalışma sırası

### SIRA01 — Bundan sonraki öncelik

Şu an öğretmen, öğrenci ve veli veri döngüsü büyük ölçüde tamamlandı. Bundan sonra hangi sırayla ilerleyelim?

**Öneri:**

1. Eksik kişi, öğrenci, veli ve personel alanlarını tamamla.
2. Detay ekranlarını veri açısından tamamla.
3. Finans ve öğrenci kontrat modülünü ayrı planla.
4. Günlük e-posta raporunu bağla.
5. En son UI tasarım sistemini profesyonel hale getir.

**Cevabınız:**

e-posta ve SMS ayarlarını UI ve benzeri tüm konular tamamlandıktan sonra yapacağız. Diğer sıralama iyi. 


### SIRA02 — UI toparlama ne zaman yapılsın?

Şu ana kadar bilinçli olarak “çirkin UI ama doğru veri akışı” ile ilerledik. UI çalışması için iki seçenek var:

- **Seçenek A:** Veri modülleri tamamlanana kadar sadece küçük UI düzeltmeleri yapalım.
- **Seçenek B:** Şimdi kısa bir ara verip tüm portal sayfalarını aynı kart/menü düzenine getirelim.
- **Seçenek C:** Tam profesyonel UI tasarımını şimdi başlatalım.

**Öneri:** Seçenek A. Yani sadece kullanımı bozacak kadar kötü alanları toparlayalım; ana tasarım çalışmasını finans/kontrat ve kişi ekranları oturduktan sonra yapalım.

**Cevabınız:**
Seçenek A 

## 2. Kişi ana kartı

Sistemde öğrenci, veli, öğretmen, personel aynı gerçek kişi tabanından yönetiliyor. Bu nedenle `Person` kartının hangi alanları tutacağı çok önemli.

### KISI01 — Temel kimlik alanları

Bir gerçek kişi için hangi alanlar zorunlu veya opsiyonel olmalı?

Mevcut / önerilen alanlar:

- ad
- ikinci ad
- soyad
- doğum tarihi
- doğum yeri
- cinsiyet
- uyruk
- kimlik/pasaport numarası
- ülke kodu
- fotoğraf
- not

**Sorular:**

1. Kimlik/pasaport numarası öğrenci, veli ve personelde zorunlu mu?
2. Fotoğraf ilk sürümde gerekli mi?
3. Doğum yeri ve uyruk gerçekten kullanılacak mı?
4. “Not” alanı kişi kartında genel not olarak tutulmalı mı?

**Cevabınız:**
Burada önemli olan şuan bizim mevcut verilerimiz ve olmayan verileri belirlemek. Öğrenci ile ilgili alanlarda olması gerekenlerin tümü eski uygulamada var. Lütfen onları tekrar kontrol et . hozionedu/backend/app içerisindeki new student kaydı oluşturulurken kullanılacak tüm alanları ve veritabanında kullanılan alanların hepsini karşılaştır. Eksik olanları düzdenlememiz gerekecek. Lütfen analiz yap bir rapor haline getir ve oradan son kararı verelim.

### KISI02 — Adres bilgisi

Şu an kişi kartında adres yapısı ayrı detaylandırılmadı. Adres bilgisi gerekli mi?

Olası alanlar:

- ülke
- şehir
- ilçe
- açık adres
- posta kodu
- adres tipi
  - ev
  - iş
  - fatura
  - acil durum

**Öneri:** İlk sürümde tek açık adres alanı yeterli olabilir. Finans/fatura modülü başlayınca fatura adresi ayrıca gerekebilir.

**Cevabınız:**
Burada öğrenci kaydı oluştururken olan alanlar olacak.  bir önceki soruna verdiğim cevabın içerisinde bu sorunun cevabı da var. 




### KISI03 — İletişim bilgileri

Bir kişide birden fazla telefon ve e-posta tutulmalı mı?

Örnek:

- kişisel telefon
- iş telefonu
- WhatsApp telefonu
- kişisel e-posta
- iş e-postası

**Öneri:** Teknik olarak birden fazla iletişim noktası desteklenebilir; ama UI’da ilk sürümde primary telefon ve primary e-posta gösterelim.

**Cevabınız:**
İletişim ile ilgili Öğrenciye zaten Hem Anne Hemde Bana email + telefon kaydı oluşturduk. Bunlar yeterli olacaktır. Yeni bir eklemeye gerek yok. 


## 3. Öğrenci kartı

### OGR01 — Öğrenci temel alanları

Öğrenci profilinde hangi alanlar tutulmalı?

Mevcut / önerilen alanlar:

- okul numarası
- kayıt tarihi
- aktif/pasif/mezun/ayrıldı durumu
- aktif öğretim yılı
- aktif sınıf/şube
- önceki okul
- kabul notu
- özel durum notu
- öğrenci fotoğrafı

**Sorular:**

1. Önceki okul alanı gerekli mi?
2. Öğrenci fotoğrafı ilk sürümde gerekli mi?
3. Öğrenciye özel “okul içi not” alanı olmalı mı? Bu alan veli/öğrenciye görünmeyecek.
4. Öğrenci detayında sağlık veya özel durum bilgileri tutulacak mı?

**Cevabınız:**
1 -Önceki okul alanı okula ilk kayıt esnasında yapılıyor. Fletepareqite denen bir evrakı düzenlemek için gerekiyor. Eski proje üzerinden inceleyebilirsin. 
2- Öğrenci Fotoğrafı gerekiyor. Bizim basit bir upload sistemi getirmemiz gerekiyor. Sadece yüklerken biz resimleri webp formatına cevirerek yükleyeceğiz. 
3- Bence bir not olanı iyi olacaktır. Yönetim tarafından kullanılır. 
4- Bence seçenekli olarak bulunduralım. eğer özel durumu olan öğrenci varsa bu bilgiyi ekleyebilsin. 


### OGR02 — Öğrenci yaşam döngüsü

Öğrenci durumları nasıl olmalı?

Olası durumlar:

- aktif
- pasif
- mezun
- okuldan ayrıldı
- transfer oldu
- kayıt bekliyor

**Öneri:** İlk sürümde `ACTIVE`, `INACTIVE`, `GRADUATED`, `WITHDRAWN`, `TRANSFERRED` yeterli olur. “Kayıt bekliyor” gerekirse yeni başvuru/admission modülünde ele alınır.

**Cevabınız:**
Kayıt Bekliyor olmayacak. Diğerleri yeterli. Kesin kaydı olan öğrenciler sisteme Yönetim tarafından işlenecek. 

### OGR03 — Kardeş ilişkisi

Aynı veliye bağlı birden fazla öğrenci zaten görülebiliyor. Ancak öğrenciler arasında “kardeş” ilişkisi ayrıca tutulmalı mı?

**Öneri:** Ayrı kardeş tablosu ilk sürümde gerekli değil. Aynı veli ilişkisi üzerinden kardeşler bulunabilir. Finans indirimi gibi durumlarda “aile grubu” gerekirse ayrıca planlanır.

**Cevabınız:**
Kardeş bağlantısına gerek yok. Veli öğrencileri olarak baktığımız da zaten belli. Ödeme kısmında da zaten her öğrenci için ayrı sözleşme yapılıyor. Velinin bir çocuğu ilk okul ise farklı fiyatı var diğer çocuğu  Lise de ise farklı bir yıllık ücreti var. O yüzden her öğrenci ayrı ayrı kontrat ve ödeme düzenlenecek.

## 4. Veli kartı

### VELI01 — Anne ve baba alanları

Öğrenci detayında anne ve baba ayrı kişi kayıtları olarak tutuluyor. Her ikisi için hangi bilgiler gerekli?

Alanlar:

- ad soyad
- telefon
- e-posta
- ilişki tipi
  - anne
  - baba
  - diğer yasal veli
- yasal veli mi?
- primary contact mı?
- meslek
- iş yeri
- adres
- not

**Sorular:**

1. Meslek ve iş yeri bilgisi gerekli mi?
2. Veli adresi öğrenci adresinden ayrı tutulmalı mı?
3. Veliye özel not alanı olmalı mı?
4. Anne ve baba dışında “diğer veli / sponsor / akraba” gibi ilişki tipleri gerekli mi?

**Cevabınız:**
Meslek Soruluyor.  İş yeri detaylı bilgisi olmuyor. Adres te öğrenci kısmına yazlılıyor tekrar dan veli kısmına adres gerekmiyor. 
Veliye özel bir not textarea oluşturalım. Extra bir detay gerekirse okul yönetimi not alır. Acil durumda 3ncü kişi gibi bir ihtiyaç çıkarsa not kısmında saklanabilir. Yani Anne baba dışında bir ilişiki tipine gerek yok. 


### VELI02 — Bildirim ve ücretli iletişim

Daha önce karar: Ücretli SMS/e-posta gibi işlemler primary veliye gider.

**Sorular:**

1. Günlük e-posta sadece primary veliye mi gitsin?
2. Yoklama SMS’i sadece primary veliye mi gitsin?
3. Finans/ödeme hatırlatmaları da primary veliye mi gitsin, yoksa “ödeme sorumlusu” ayrı mı olmalı?
4. Anne/baba ikisi de sisteme giriş yapabilsin mi, yoksa sadece primary veli hesabı mı aktif olsun?

**Cevabınız:**
1- Evet sadece primary veliye gidecek.

2- Evet sadece primary veliye gidecek.
3- burada aile arasında de ödeme sorumlusu işaretlemek iyi fikir. Çünkü okul günlük raporları anne takip ederken ödemeleri baba takip edebilir. Velilerden birisi ödeme sorumlusu seçilir. Kontrata imza atan veliyi yönetim ödeme sorumlusu olarak seçer.


## 5. Personel ve öğretmen kartı

### PER01 — Personel temel alanları

Bir personel kaydında hangi alanlar olmalı?

Olası alanlar:

- personel no
- işe giriş tarihi
- işten çıkış tarihi
- departman
- pozisyon
- ana ünvan
- çalışma durumu
  - aktif
  - izinli
  - ayrıldı
- istihdam tipi
  - tam zamanlı
  - yarı zamanlı
  - sözleşmeli
  - stajyer
- maaş / ücret bilgisi
- acil durum kişisi
- personel notu

**Sorular:**




1. Maaş/ücret bilgisi bu sistemde tutulacak mı?
2. Acil durum kişisi gerekli mi?
3. Personel için adres/kimlik/fotoğraf gerekli mi?
4. İstihdam tipi ilk sürümde gerekli mi?

**Cevabınız:**
1 - Maaş / ücret bilgisi sistemde tutulacak. burada kontrat usulü çalışıldığı için Kontrat no , süre , maaş ve benzeri bilgiler tek ekranda doldurulacak. 
2- Acil durum kişisi isteğe baklı eklenebilecek şekilde sisteme ekleyelim. 
3- Evet Hepsi gerekli. 
4- İstihdam tipi gerekli.

### PER02 — Öğretmen özel alanları

Öğretmen profili personel kaydının üzerine kuruluyor.

Mevcut / önerilen alanlar:

- öğretmen tipi
  - sınıf öğretmeni
  - branş öğretmeni
- ana ünvan
- ders yetkinlikleri
- sınıf sorumluluğu
- aktif ders atamaları
- haftalık program
- portal hesabı

**Sorular:**

1. Öğretmen için sertifika/diploma bilgisi tutulacak mı?
2. Öğretmen için dosya/doküman eklenecek mi?
3. Öğretmen detayında “verdiği tüm dersler”, “program”, “yorumlar”, “ödevler”, “yoklama kayıtları” admin tarafından görülebilsin mi?
4. Öğretmenin geçmiş yıllardaki atamaları saklanmalı mı?

**Cevabınız:**
1. Alanlara isteye bağlı yönetimin gireceği alanları biz oluşturalım. 
2. Tarama döküman eklenmeyecek. Upload edilmeyecek evraklar.
3. Admin tarafından görülebilsin lütfen. Admin özellikle her öğretmenin platformu ne verimlilikle kullandığını da kontrol etmek istiyor. O yüzden öğretmenlerin günlük olarak hangi yorumları , ders detayları , notları , ödevleri gibi işlemleri yapıp yapmadığını bilmek istiyor.

## 6. Finans ve kontrat modülü

Finans modülü büyük ve ayrı tasarlanması gereken bir alan. Bu bölüm karar verilmeden kodlamaya başlanmamalıdır.

### FIN01 — Kontrat neyi temsil eder?

Öğrenci kontratı hangi seviyede oluşturulacak?

Seçenekler:

- her öğrenci için her öğretim yılında bir kontrat
- aile/veli bazlı bir kontrat
- her öğrenci için birden fazla kontrat
- sadece ödeme planı, resmi kontrat yok

**Öneri:** Her öğrenci için her öğretim yılında bir ana kontrat olsun. Kardeş indirimi varsa kontratlarda ilişkilendirilebilir.

**Cevabınız:**
Bu kısım velileri ilgilendiren bir kısım. Bu özel okullarda kullanılacak bir argüman. Devlet okullarında kullanılmayacak bir alan. 
Ben burayı her öğrenci ekranına bağlı değil de. Veli üzerinden yürütülen bir ekran olsun istiyorum. Sonuçta okullar veli ile anlaşma imzalıyor. 
Aklımdaki yapıda olan şey ..  Veli seçilecek ..  Örneğin veli 2 çocuğu var. 
1nci çocuk seç , sınıf kademe bilgisi , ödeme bilgisi , yemek , üniforma , servis aracı gibi ödemeler ve ödeme taksitlendirme alanları yapılır. 
2nci çocuk için de aynı eklenir ve 2nci çocuğunda ödeme bilgisi ve diğer bilgiler eklenir . her çocuk için her kontrat 1 yıllık olacak. Her yıl yenilecek bir yapıda olaccak. 

Yani yapı basit eski projede //horizonedu/backend/app/templates/admin_tem klasörü altındaki student html ve backend , veritabanı detaylarını okuduktan sonra kararlaştırabiliriz. Bunlar her öğrenci kontratında indirim miktarı ve benzeri tüm detayları göreceksin.
Okulların fiyatlama aşamalarınıda göreceksin.





### FIN02 — Kontrat alanları

Bir öğrenci kontratında hangi alanlar olmalı?

Olası alanlar:

- öğrenci
- öğretim yılı
- sınıf
- kontrat tarihi
- ödeme sorumlusu veli
- yıllık eğitim ücreti
- indirim tutarı
- burs oranı/tutarı
- net kontrat tutarı
- para birimi
- taksit sayısı
- ödeme planı başlangıç tarihi
- not
- durum
  - taslak
  - aktif
  - iptal
  - tamamlandı

**Sorular:**

1. Para birimi tek mi olacak?
2. İndirim ve burs ayrı ayrı mı tutulmalı?
3. Kardeş indirimi gerekli mi?
4. Kontrat PDF veya dosya çıktısı gerekiyor mu?
5. Kontrat imza/dosya eki tutulacak mı?

**Cevabınız:**
Burası için kontrat metinleri ve benzeri bir sürü detay var. Kodlamada bu alana gelince konuşalım. 

### FIN03 — Taksit ve ödeme kayıtları

Ödeme sistemi nasıl çalışmalı?

Olası yapı:

- kontrat toplam tutarı
- otomatik taksit planı
- her taksit için vade tarihi
- ödenen tutar
- kalan tutar
- ödeme tarihi
- ödeme yöntemi
  - nakit
  - banka
  - kart
  - online
- makbuz/fiş no
- açıklama

**Sorular:**

1. Taksit planı otomatik üretilecek mi?
2. Okul admin taksitleri elle değiştirebilmeli mi?
3. Parçalı ödeme yapılabilir mi? Örneğin bir taksitin yarısı ödenirse.
4. Geç ödeme cezası/late fee olacak mı?
5. Veli ekranında sadece borç/ödeme geçmişi mi görünsün, yoksa kontrat detayı da görünsün mü?

**Cevabınız:**
1. Evet ben taksit planı için otomatik taksitlendirme sistemi istiyorum. Ödenen peşinat miktarını düşüp kalanı aylara otomatik bölsün. Yönetim onayı ile de kaydı aylık periyotlara eklesin. Daha sonra ödenene ve ödenmeyen taksitleri raporlarda kullaanacağız. 
2. Değeiştirebilsin. 
3. muhabesebedeki gibi takip yapacağız.  Borç Alacak gibi . Yani yarım da ödeyebilir 2 taksit birden de ödeyebilir. burada gelen para miktarı açıklaması ve tarihi olacak sadece. bu taksit kapandı bu taksit bekliyor gibi işaretleyerek ödeme takibi sorunlu oluyor. 
4. Late fee yönetim tarafından istenirse eklenebilecek. Borç hanesine satır olarak eklenebilmeli.
5. Kontrat No , tarih , tutar ve ödenenler liste hesap hareketi gibi görünmeli.

## 7. Doküman ve dosya yönetimi

### DOK01 — Kaynak dokümanlar

Eski öğrenci ekranında “Source Documents” alanı vardı. Yeni sistemde kaynak dokümanlar olacak mı?

Örnekler:

- ders materyali
- PDF çalışma kağıdı
- sınıf duyurusu
- sınav yönergesi
- genel okul dokümanı

**Sorular:**
döküman ekleme olmayacak.


1. Öğretmen ders/sınıf bazlı doküman yükleyebilecek mi?
2. Doküman öğrenci ve veliye görünecek mi?
3. Doküman kaç gün saklanmalı?
4. Belirli gün sonra otomatik arşiv mi olsun, gerçek dosya silinsin mi?
5. Maksimum dosya boyutu ne olmalı?

**Cevabınız:**
Döküman upload olmayacak.

### DOK02 — Personel ve öğrenci resmi evrakları

Personel veya öğrenci detaylarında resmi evrak tutulacak mı?

Örnekler:

- kimlik/pasaport kopyası
- kontrat
- sağlık raporu
- diploma/sertifika
- izin belgesi
- kayıt formu

**Öneri:** İlk sürümde resmi evrak dosya yüklemeyi erteleyelim. Gerekiyorsa sadece “evrak teslim edildi mi?” checklist alanı oluşturulabilir.

**Cevabınız:**
Yükleme olmayacak.

## 8. Günlük e-posta raporu

Öğretmenlerin 16:55’e kadar girdiği kayıtların 17:00’de primary veliye e-posta olarak gitmesi daha önce konuşuldu.

### MAIL01 — Günlük raporda hangi içerikler olacak?

Olası içerikler:

- ders konuları
- ödevler
- öğrenci yorumları
- sınav bildirimleri
- yoklama durumu
- okul duyuruları
- finans hatırlatması

**Öneri:** İlk günlük rapor şu verilerle başlasın:

- günün ders konuları
- günün ödevleri
- günün öğrenci yorumları
- günün yoklama kayıtları
- yaklaşan sınavlar

**Cevabınız:**
Önerin uygundur. Dediğim gibi en sonra bırakacağız. UI tasarımlarımızın da sonrasına bırakacağız.


### MAIL02 — Günlük rapor alıcısı

Günlük rapor kime gönderilecek?

Seçenekler:

- sadece primary veli
- anne ve baba ikisine de
- öğrenciye de
- okul adminine özet

**Öneri:** İlk sürümde sadece primary veliye gönderilsin. Öğrenci kendi portalından görsün.

**Cevabınız:**
Sadece Primary Veli görecek

### MAIL03 — Gönderim zamanı ve tekrar deneme

Günlük rapor gönderimi nasıl çalışmalı?

Sorular:

1. Saat 17:00 okulun kendi timezone’una göre mi çalışacak?
2. E-posta gönderimi başarısız olursa tekrar denenecek mi?
3. Gönderilen mail log’u tutulacak mı?
4. Veliye aynı gün ikinci kez mail gönderilmeli mi?

**Cevabınız:**
Şuana kadar Cron ile yönettim. Server saati ile okul saati aynı zone şuanda . O yüzden bir sorun yaşamadım. 
Veliye aynı gün 2 mail göndermedik.
Mail log Brevo hesabımda tutuyorum. sorun olan bir adres olursa oradan kontrol edip düzeltiyordum. Yine toplu veride brevo yu kullanacağız. Bize giden mailler ile ilgili raporlama kolaylığı sağlar mı Brevo bilmiyorum. Onu incele eğer bir faydalı maliyetsiz işlem olursa kullanabilirim.


## 9. Admin rapor ve inceleme ekranları

### RAPOR01 — Öğretmen kayıtları admin tarafından incelensin mi?

Admin panelinde öğretmenlerin oluşturduğu kayıtlar için rapor ekranları olacak mı?

Kayıt türleri:

- ders konuları
- ödevler
- öğrenci yorumları
- sınav bildirimleri
- yoklama kayıtları

**Öneri:** Evet, ama ilk sürümde yalnız listeleme/filtreleme olsun. Düzenleme ve silme yetkisini daha sonra ayrıca planlayalım.

**Cevabınız:**
Bunu biraz düşünelim . Ama Ana üstte işlem yapan ve yapmayan öğretmenler . İşlem yapan öğretmeni seçtiğimiz de de işlem detay ekranı şekilnde düzenleriz. 

### RAPOR02 — Dışa aktarım

Admin raporlarında Excel/CSV/PDF export gerekli mi?

**Öneri:** İlk sürümde export erteleyelim. Listeleme ve doğru filtreler önce bitsin.

**Cevabınız:**
Yok . Export gereksinimi yok.

## 10. İlk kodlama paketi önerisi

Bu belgedeki cevaplardan sonra benim önerdiğim ilk kodlama paketi şu olur:

1. Kişi / öğrenci / veli / personel detay ekranlarındaki eksik alanları tamamla.
2. Öğrenci ve personel yaşam döngüsü durumlarını netleştir.
3. Finans-kontrat için ayrı `11-finans-kontrat-karar-sorulari.md` dokümanı aç.
4. Günlük e-posta raporu için eski sistemi inceleyip ayrı teknik plan çıkar.
5. Kaynak dokümanlar gerekiyorsa ayrı dosya yönetimi planı çıkar.

**Cevabınız:**
Uygundur.
