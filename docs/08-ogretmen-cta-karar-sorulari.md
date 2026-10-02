# 08 — Öğretmen dashboard CTA karar soruları

Tarih: 2026-10-02  
Durum: `YOKLAMA ÖNCESİ CEVAPLAR ALINDI · DERS KONUSU, ÖDEV VE COMMENT KODLANDI`
Kapsam: Öğretmen portalında haftalık program hücrelerinden açılacak CTA işlemlerinin veri akışı, görünürlük kuralları ve ilk kodlama sırasını netleştirmek.

Bu belge kodlama dokümanı değildir. Amaç, öğretmen dashboard’unda görünen sınıf/ders/gün/saat bağlamından hangi kayıtların üretileceğini netleştirmektir.

## 1. Mevcut kabul edilen temel

Şu yapı artık hazır kabul edilir:

- Öğretmen portalında aktif öğretmenin haftalık programı görünüyor.
- Program haftaları `AcademicWeek` ve günleri `CalendarDay` üzerinden yönetiliyor.
- Öğretmen geçmiş ve gelecek haftaları seçebiliyor.
- Aynı gün/saatte birleşik ders varsa hücre içinde her sınıf için ayrı işlem bağlamı oluşabiliyor.
- CTA işlemleri Okul Admin ekranında değil, öğretmen login/dashboard ekranında yapılacak.

CTA kayıtları için ana bağlam:

```text
Teacher
  └─ TimetableSession
      └─ TimetableSessionParticipant
          ├─ AcademicYearClassSection
          ├─ CourseOffering / Subject
          ├─ CalendarDay date
          └─ SchedulePeriod
```

Yani öğretmenin bastığı her CTA şu bilgileri taşımalı:

- okul
- aktif öğretim yılı
- seçili hafta
- gerçek tarih
- gün
- ders saati
- öğretmen
- ders
- sınıf/şube
- birleşik ders varsa ilgili tek sınıf katılımcısı

## 2. Önerilen kodlama sırası

Kullanıcı yönlendirmesine göre yoklama en sona bırakılmalıdır. Çünkü yoklama; öğrenci listesi, durum seçenekleri, veli bildirimi, SMS/e-posta ve mazeret akışları nedeniyle daha detaylıdır.

Benim önerdiğim sıra:

1. **Ders Konusu**
   - en basit günlük ders kaydıdır
   - ileride ders defteri mantığının temeli olur

2. **Ev Ödevi**
   - öğrenci/veli ekranına gösterilecek ilk pratik içeriklerden biridir
   - teslim tarihi, açıklama ve görünürlük kuralları netleşir

3. **Öğrenci Yorumu**
   - öğrenci bazlı olduğu için ödevden biraz daha detaylıdır
   - veliye görünürlük ve bildirim kuralları önemlidir

4. **Sınav Bildirimi**
   - öğrenci/veli takviminde görünecek planlı kayıt üretir
   - not girişiyle karıştırılmamalıdır

5. **Yoklama**
   - en sona bırakılır
   - SMS/e-posta, geç/izinli/mazeretli durumları ve günlük raporla birlikte tasarlanır

**Cevabınız:**

## 3. Ortak karar soruları

### CTA01 — Ortak kayıt bağlamı

Her CTA kaydı, öğretmenin haftalık programındaki tek bir sınıf-ders-gün-saat bağlamına mı bağlı olmalı?

**Öneri:** Evet. Kayıtlar `TimetableSessionParticipant + CalendarDay + SchedulePeriod` bağlamıyla tutulmalı. Böylece birleşik derslerde 2/A ve 2/B için ayrı kayıt üretilebilir.

**Cevabınız:**
Önerin Uygundur. 


### CTA02 — Geçmiş haftaya kayıt girme

Öğretmen geçmiş haftaya dönüp yeni kayıt ekleyebilmeli mi?

Örnekler:

- geçen haftanın ders konusunu sonradan yazmak
- geçen haftanın ödevini sisteme sonradan eklemek
- geçen haftanın öğrenci yorumunu yazmak

**Öneri:** Öğretmen geçmiş haftaya kayıt girebilsin; ama ileride okul isterse “kaç gün geriye giriş yapılabilir” ayarı eklenebilir.

**Cevabınız:**
Eskiye dönük kayıtlarda güncelleme yapması serbest olmalı. 


### CTA03 — Gelecek haftaya kayıt girme

Öğretmen gelecek haftaya kayıt ekleyebilmeli mi?

Örnekler:

- gelecek haftanın sınavını bildirmek
- gelecek haftanın ödevini önceden oluşturmak
- gelecek haftanın ders konusunu planlamak

**Öneri:** Sınav bildirimi ve ödev için gelecek haftaya giriş serbest olsun. Ders konusu ve öğrenci yorumu için okulun kararına göre serbest veya sınırlı olabilir.

**Cevabınız:**
Öğretmen Ders konularını pazatesi gününden tüm hafta cumaya kadar giriş yapabilir. İşleyeceği dersleri biliyordur ve kendi kayıt oluşturur. 
Sınav yapacağı tarihi bildirmek için de ileriye doğru tarihlere kayıt işlemesi gerekiyor. Yani bu tabloda geçmiş ve gelecek te kayıt işleme ile ilgili herhangi bir blok yada kontrol eklemeyeceğiz. 



### CTA04 — Aynı derse birden fazla kayıt

Aynı tarih + ders saati + sınıf + ders için aynı CTA’dan birden fazla kayıt olabilir mi?

Örnek:

- aynı ders saatine iki ayrı ev ödevi
- aynı ders saatine iki ayrı ders konusu
- aynı öğrenci için aynı derste iki ayrı yorum

**Öneri:**  
- Ders konusu: ilk sürümde tek kayıt  
- Ev ödevi: birden fazla olabilir  
- Öğrenci yorumu: öğrenci başına birden fazla olabilir  
- Sınav bildirimi: aynı sınıf/ders/tarih için birden fazla olabilir ama kullanıcı uyarı görsün  
- Yoklama: tek kayıt seti

**Cevabınız:**
Tek Kayıt olacak. Çünkü biz UI de bunları NOT olarak kayıt edeceğiz . Öğretmen CTA tıkladığında kayıt varsa o ekrana gelecek değişiklik yaparak kayıt edebileceği bir sistem olacak. Eğer kayıt yoksa boş çıkacak ve içeriği NOT olarak giriş yapacak. Burada NOT alanına imoji de ekleyebilecek bir şekilde çalışacak. 
Yani her CTA tıkladığında kayıt yoksa boş ekrana gelecek , kayıt varsa kayıt ekrana gelecek ve isterse güncelleyecek şeklinde çalışan bir sistem olacak. KOLAY KULLANIM öncelikli. 




### CTA05 — Kayıt düzeltme ve silme

Öğretmen oluşturduğu kaydı daha sonra düzenleyebilmeli veya silebilmeli mi?

**Öneri:** Silme yerine arşiv/pasif mantığı kullanalım. Öğretmen kendi oluşturduğu kaydı düzenleyebilsin. Okul Admin gerekirse tüm kayıtları görebilsin ve düzeltebilsin.

**Cevabınız:**
Güncelleyebilmeli. Silme işlemi olmayacak ... 
Amin Ekranında da öğretmenlerin yaptığı yorumlar ders içerikleri istendiğinde incelenebilecek UI düzenleyeceğiz. 




### CTA06 — Öğrenci ve veli görünürlüğü

Her CTA kaydı otomatik olarak öğrenci ve veliye görünmeli mi, yoksa öğretmen “yayınla” gibi bir seçenek mi kullanmalı?

**Öneri:** İlk sürümde kayıt oluşturulunca görünür olsun. “Taslak / yayınla” mantığı gerekirse sonraki sürüme kalabilir.

**Cevabınız:**
Otomatik kayıt oluşturunca Öğretmen Öğrenci Veli ekranı görsün. Yayınla button'a gerek yok.




### CTA07 — Bildirim gönderimi

Hangi CTA’larda veliye e-posta/SMS/push bildirimi gönderilecek?

**Öneri:** İlk sürümde otomatik SMS/e-posta göndermeyelim. Kayıtlar öğrenci/veli ekranında görünsün. Bildirim motorunu özellikle yoklama ve önemli duyurular için ayrı tasarlayalım.

**Cevabınız:**
Tüm Veriler Öğretmenler tarafından saat 16:55'e kadar işlenen kayıtlar saat 17:00 de tüm Velilere email olarak gönderilecek. Bunun için önceki sistemde kurduğum gibi bir yapı çalışacak. 
Lütfen mail ile ilgili yapıyı aşağıdaki kök dizindeki klasörlerden incele. 
//horizonedu/backend/app/templates/daily_report.html
//horizonedu/backend/run.py



### CTA08 — Dil desteği

Öğretmenin girdiği içerikler üç dilde mi tutulmalı, yoksa öğretmen hangi dilde yazarsa o içerik mi gösterilmeli?

Örnek:

- ders konusu açıklaması
- ödev açıklaması
- öğrenci yorumu
- sınav açıklaması

**Öneri:** Öğretmen serbest metni tek dilde girsin. Sistem çeviri zorlamasın. Katalog/etiket gibi sabit alanlar üç dil destekli kalmaya devam etsin.

**Cevabınız:**
Çeviri olmayacak. Öğretmenler İngilizce - Almanca dersi - Arnavutça olanlar gibi farklı dillerde yorumları ve ödevleri hazırlayacak. 
Sabit alanlar üç dil olacak .


### CTA09 — Dosya / ek desteği

Ödev, ders konusu veya sınav bildirimi için dosya ekleme ilk sürümde gerekli mi?

**Öneri:** İlk sürümde dosya eki yapmayalım. Metin + tarih + sınıf/ders bağlantısı oturduktan sonra dosya/ek sistemi ayrıca ele alınsın.

**Cevabınız:**
Dosya ekleme , döküman ekleme olmayacak ... Yada şöyle birşey yapmalıyız eklenen dökümanın 3 yada 5 gün sonra silinmesi . Gerçek anlamda blobtan silmek gereksiz Server yükü arttırmamak. Yani bunu düşünmek gerek buradaki sıkıntı pek ihtiyaç olmuyor ama eklenen dökümanı da aylarca yıllarca sistemde saklamak istemiyorumn.


## 4. Ders Konusu CTA soruları

### DK01 — Ders konusu neyi temsil eder?

Ders konusu, öğretmenin o ders saatinde sınıfta işlediği konu başlığı mı olmalı?

**Öneri:** Evet. “Bugün bu sınıfta bu ders saatinde ne işlendi?” sorusunun cevabı olsun.

**Cevabınız:**
yok burada SADECE NOT input alanı kullanacağız. Öğretmen KONU yu zaten içerisine ekliyor. Ayrı bir alana gerek yok. 




### DK02 — Ders konusu alanları

Ders konusu için hangi alanlar gerekli?

**Öneri:**

- konu başlığı
- kısa açıklama
- öğretmen notu
- öğrenci/veli görsün mü?

**Cevabınız:**
Sadece Açıklama şeklinde giriş yapılacak ve veli de aynı şekilde görecek.





### DK03 — Sınıf bazlı mı, öğrenci bazlı mı?

Ders konusu tüm sınıfa ait bir kayıt mı olmalı?

**Öneri:** Evet. Öğrenci bazlı değil, sınıf-ders-saat bazlı olmalı.

**Cevabınız:**
Sınıf DERS - Saat bazlı olacak. O sınıfta okuyan tüm öğrenciler ve öğrencilerin velileri tarafından gün gün raporlanacak.




### DK04 — Boş ders konusu

Öğretmen konu girmediyse öğrenci/veli ekranında ne görünmeli?

**Öneri:** Hiçbir şey görünmesin. Admin raporlarında “ders konusu girilmemiş” olarak izlenebilir.

**Cevabınız:**
Kayıt yoksa mail gitmez boş kalır. Sadece olan kayıtlar gider.



### DK05 — Gelecek ders konusu planı

Öğretmen gelecek haftanın ders konusunu önceden girebilmeli mi?

**Öneri:** İlk sürümde izin verelim. Bu kayıt “planlanan konu” gibi değerlendirilebilir.

**Cevabınız:**
yukarıda bu detayı söyledim. Geçmiş ve Gelecek kayıtlarla ilgili kontrol eklemeyeceğiz.




## 5. Ev Ödevi CTA soruları

### EO01 — Ödevin hedefi

Ev ödevi sınıfın tamamına mı atanır, yoksa öğrenci bazlı özel ödev de olacak mı?

**Öneri:** İlk sürümde sınıf bazlı ödev olsun. Öğrenci bazlı özel ödev sonraya kalsın.

**Cevabınız:**
Sınıf bazlı ödev olacak...   Eğer öğretmen bir öğrenciye özel bir içerik yapacaksa bunu comments CTA sı üzerinden çözeceğiz. 




### EO02 — Ödev alanları

Ödev için hangi alanlar gerekli?

**Öneri:**

- başlık
- açıklama
- verildiği tarih
- son teslim tarihi
- ders/sınıf bilgisi otomatik
- öğretmen notu

**Cevabınız:**
Başlık ve Öğretmen NOTU olacak sadece. Ödev tarih gibi detaylarını öğretmen düzenlediği metin içine ekliyor.




### EO03 — Bir derste birden fazla ödev

Aynı ders saatinde birden fazla ödev verilebilir mi?

**Öneri:** Evet. Örneğin “kitap okuma” ve “çalışma kağıdı” ayrı ödevler olabilir.

**Cevabınız:**
Ödev detayı Öğretmen NOT olacağı için aynı gün aynı saat için tek ödev olacaktır. eğer iki ödev varsa Öğretmen notu daha uzun olacak ikisini de öğretmen ekleyecek.



### EO04 — Ödev teslim takibi

İlk sürümde öğrencinin ödevi teslim edip etmediği takip edilecek mi?

**Öneri:** Hayır. İlk sürüm yalnız ödev bildirimi olsun. Teslim takibi ayrı paket olarak yapılabilir.

**Cevabınız:**
Hayır bu takip olmayacak. bir çok ödev artık okullarda tamamlanıyor. Evlere takip gerektiren bir yapı olmayacak sistemde.

### EO05 — Ödev görünürlüğü

Ödev öğrenci ve veli ekranında nasıl görünmeli?

**Öneri:** Öğrenci/veli ekranında tarih sırasına göre “aktif ödevler” ve “geçmiş ödevler” olarak gösterilsin.

**Cevabınız:**
Evet Tarih sırasına göre listelenecek.



### EO06 — Ödev hatırlatma bildirimi

Ödev teslim tarihinden önce otomatik hatırlatma olacak mı?

**Öneri:** İlk sürümde otomatik bildirim yapmayalım. Bildirim sistemi oturduktan sonra hatırlatma eklenebilir.

**Cevabınız:**
Ödevle ilgili bir bildirim olmayacak.

**Kodlama notu:**
Ev ödevi ilk sürümde `TimetableSessionParticipant + AcademicCalendarDay` bağlamında tek kayıt olarak uygulanır. Alanlar `Başlık` ve `Öğretmen notu`dur. Kayıt varsa aynı CTA ekranı mevcut kaydı getirir ve günceller; silme, teslim takibi, dosya eki ve otomatik bildirim yoktur.



## 6. Öğrenci Yorumu CTA soruları

### OY01 — Yorum sınıf bazlı mı, öğrenci bazlı mı?

Öğrenci yorumu tek tek öğrenciye mi yazılacak?

**Öneri:** Evet. Bu CTA açıldığında ilgili sınıfın öğrenci listesi gelsin ve öğretmen seçtiği öğrenciye yorum yazsın.

**Cevabınız:**
Öğrenci yorunu için lütfen eski projeyi incele. 

yorumlarda  en iyi den en kötüye doğru aşağıdaki gibi olacak.  Tabi ki burada UI olarak ben solda öğrenci isimler checkbox ; 
sonra yorum kategorisi seçilecek Radio olarak ve Not kısmına da yorum yazılacak ve kayıt oluşturunca öğretmen kaç öğrenci işaretli ise o kadar kayıt oluşacak. 

tüm sınıfa bir kayıt oluşturmak istiyorsa öğrenci checkbox üstene selecet all ekleriz ve öğretmen tüm öğrencileri bir kerede işaretler ve kayıt oluştur dediğin de tüm öğrenciler için aynı mesajda olsa o kayıt oluşacak. bir loop uygulayacağız. 

Yorumlar da birde Puan alacak öğrenciler. 

GREEN CARD. =. 3 puan 
Positive Comment = 1 puan 
Negative Comment = -1 puan 
bir isimde -3 puan için seçenek bulacağız. 

bunun yanında birde comment kategorisi olarak 

INFORMATION olacak .  bu genel sınıf duyuruları için de kullanılıyor. Information puan karşılığı 0 olacak. 


### OY02 — Yorum türleri

Yorumlar türlere ayrılmalı mı?

Örnek:

- davranış
- akademik gelişim
- katılım
- ödev
- genel not

**Öneri:** İlk sürümde basit bir “yorum türü” seçimi olsun. Türler okul bazlı katalog haline daha sonra getirilebilir.

**Cevabınız:**
Üstte istediğim Yorum kategorilerini açıkladım. 


### OY03 — Veliye görünürlük

Öğrenci yorumu veliye otomatik görünmeli mi?

**Öneri:** Öğretmen yorum girerken “veli görsün” seçeneği olsun. Varsayılan değeri senin kararına göre belirleyelim.

**Cevabınız:**
Yok Veliler tamamını görecek. Zaten bu platform ağırlıkta Veli kullanımı için düzenleniyor. 


### OY04 — Öğrenciye görünürlük

Öğrenci yorumu öğrenci ekranında da görünecek mi?

**Öneri:** İlk sürümde veliye görünür olan yorum öğrenciye de görünebilir; ama okul isterse sadece veliye gösterme seçeneği eklenebilir.

**Cevabınız:**
Öğrenciler de görecek. 



### OY05 — Yorum bildirimi

Yorum yazıldığında veliye bildirim gönderilecek mi?

**Öneri:** İlk sürümde bildirim göndermeyelim. Yorum veli ekranında görünsün. Bildirim maliyeti ve öncelikli veli kuralı nedeniyle bunu ayrıca tasarlayalım.

**Cevabınız:**
Yorumlar aynı gün akşam 17:00 de atılan mailin içeriğinde olacak.



### OY06 — Sorumlu sınıf öğretmeni erişimi

Sınıf sorumlu öğretmeni kendi sorumlu olduğu sınıfın diğer branş öğretmenleri tarafından yazılmış yorumlarını görebilmeli mi?

**Öneri:** Evet. Önceki kararımıza göre sınıf sorumlusu, sorumlu olduğu sınıfın öğrenci yorumlarını görebilmeli.

**Cevabınız:**
Sorumlu öğretmen sorumlu olduğu sınıfın öğrencileri için diğer öğretmenlerin yorumlarını okuyabilecek. Normal de sorumlu olmayan öğretmenler diğer ders öğretmenlerinin yorumlarını göremez. Burada Öğretmen Portalında biz sonrada MYClass diye bir sayfa olacak ve orada bu detayları salt okunur görecek . Bunun nedeni de Veli toplantılarında sorumlu öğretmen Veli ile toplantı yapıyor ve Diğer öğretmenlerin de yorumlarını okuyarak öğrencinin diğer derslerde de diğer öğretmenlerle ilişkisini de analiz edebiliyor.



### OY07 — Yorum düzenleme

Öğretmen yazdığı öğrenci yorumunu sonradan düzenleyebilmeli mi?

**Öneri:** Evet, ama kayıt geçmişi audit’te tutulmalı. Veliye gösterilmiş bir yorum değişirse ileride “güncellendi” bilgisi gösterilebilir.

**Cevabınız:**
Eveet düzenleyebilmeli. AUDIT'e gerek yok.  Güncellendi şeklinde bilgi verilebilir. O iyi bir fikir.

**Kodlama notu:**
Öğrenci yorumu ilk sürümde `TimetableSessionParticipant + AcademicCalendarDay + StudentProfile` bağlamında tekil kayıt olarak uygulanır. Öğretmen geniş modal içinde öğrencileri checkbox ile seçer, kategori seçer ve tek not yazar. Seçilen her öğrenci için ayrı kayıt oluşur; aynı öğrenci için aynı gün/ders/saat kaydı varsa güncellenir. Kategoriler: Green Card `+3`, Positive Comment `+1`, Information `0`, Negative Comment `-1`, Red Card `-3`.




## 7. Sınav Bildirimi CTA soruları

### SB01 — Sınav bildirimi neyi kapsar?

Bu CTA yalnız sınav duyurusu mu olacak, yoksa not girişi de içerecek mi?

**Öneri:** İlk sürümde sadece sınav bildirimi olsun. Not girişi ayrı “ölçme/değerlendirme” modülü olarak planlansın.

**Cevabınız:**
Sınav için not girişi olmayacak. Sadece Karne Notları Veliler ile paylaşılacak. Karne notları ekranı olacak. Hem öğretmen girişi için hemde velilerin göreceği bir sayfa düzenleyeceğiz ilerleyen adımlarda.



### SB02 — Sınav alanları

Sınav bildirimi için hangi alanlar gerekli?

**Öneri:**

- sınav başlığı
- sınav tarihi
- ders saati veya saat aralığı
- açıklama
- kapsam/konular
- öğrenci/veli görünürlük durumu

**Cevabınız:**
Sınav için örneğin 8/1 sınıfında Matematik öğretmeni 10 gün sonra ya  11-10-2026 Çarşamba Günü Sınav var diye kayıt oluşturdu.  
sonra Veli ve Öğrenci Dashbord üzerinde bu sınav biligisi o tarih geçene kadar her gün ekranda kalacak. 
Ayrıca 11-10-2026 tarihinde Matematik öğretmeni Sınav ekledi 8/1 sınıfına.  Sonra biyoloji öğretmeni diyelim ki aynı güne sınav eklemek istediğinde Öğretmene bu sınıfın Bugün Matematik Sınavı var. Lütfen Sınavu başka bir güne planlayın bilgisi verilecek. Yani bir Sınıf (ortaokul - Lise seviyesinde karşıklığı engellemek için özellikle çok ihtiyaç var.) günde bir Sınav olacak. Anyı gün iki farklı sınav olamayacak bunun için öğretmenlere bildirim yapacağız kayıt oluştururken.



### SB03 — Sınav takvimi

Sınav bildirimi öğrenci ve veli ekranlarında takvim şeklinde mi görünmeli?

**Öneri:** Evet. Öğrenci/veli ekranında yaklaşan sınavlar ayrıca listelenmeli.

**Cevabınız:**
Evet bir liste olmalı. yukarıda da bahsettim.




### SB04 — Sınav aynı ders saatine bağlı mı?

Sınav bildirimi öğretmenin bastığı ders saatine mi bağlı olmalı, yoksa farklı tarih/saat seçebilmeli mi?

**Öneri:** CTA açıldığında varsayılan olarak o dersin günü/saati gelsin; öğretmen gerekirse sınav tarihini farklı bir güne alabilsin.

**Cevabınız:**
Öğretmen gelecekte hangi gün sınav yapacaksa tabloda o tarihe gidip sınav oluştur yapacak. Ve öğretmen gelecekteki o tarihe sınav eklediği an mevcut tarihi geçmemiş sınavları devamlı sorgu ile ekrana getireceğiz Veli ve Öğrenci ekranlarında.



### SB05 — Birden fazla sınav

Aynı sınıf/ders için aynı gün birden fazla sınav bildirimi olabilir mi?

**Öneri:** Sistem izin versin ama uyarı göstersin.

**Cevabınız:**
Yukarıda belirttiğim gibi . Öğretmen Sınav kaydı eklerken aynı gün eğer o sınıfın bir başka sınavı varsa öğretmene sınav tarihini başka bir güne alması bildirimi verilecek. Bir gün aynı sınıfa birden fazla sınav girilmeyecek.
Ortaokul ve Lise seviyesinde özellikle her derse başka branş öğretmenleri girdiği için hangi öğretmen hangi güne sınav koymuş karmaşası da engellenmiş oluyor.




### SB06 — Bildirim ve hatırlatma

Sınav bildirimi oluşturulunca veliye otomatik bildirim gidecek mi? Sınavdan önce hatırlatma olacak mı?

**Öneri:** İlk sürümde otomatik SMS/e-posta olmasın. Sınavlar veli/öğrenci ekranında görünsün. Hatırlatma ve SMS maliyet yönetimi ayrı paket olsun.

**Cevabınız:**
Platform ekranında görünecek sadece. Öğretmenler en az 3-5 gün önceden sınav tarihi bilgisi ekliyor. 




## 8. Yoklama CTA soruları — son paket

Bu bölüm bilerek sona bırakılmıştır. Cevapları şimdi yazabiliriz ama kodlamada önce diğer CTA’ları oturtmak daha güvenlidir.

### YK01 — Yoklama durumları

Yoklama için hangi durumlar olacak?

**Öneri:**

- geldi
- gelmedi
- geç geldi
- izinli
- raporlu/mazeretli

**Cevabınız:**

Diğer işlemleri tamamladıktan sonra burayı detaylandıracağız. Şimdilik buraya gelinceye kadar olan alanları tamamlayacağız adım adım.

### YK02 — Yoklama kayıt birimi

Yoklama her ders saati için mi alınacak, yoksa günlük tek yoklama mı olacak?

**Öneri:** Öğretmen CTA’sı ders saati bazlı çalıştığı için ilk model ders saati bazlı olmalı. Günlük rapor için bu kayıtlar daha sonra birleştirilebilir.

**Cevabınız:**

### YK03 — SMS gönderimi

Öğrenci yok yazıldığında SMS/e-posta kime gidecek?

**Öneri:** Daha önceki veli kararına göre yalnız primary veliye gönderilmeli. Ama ilk yoklama paketinde bile SMS’i otomatik açmadan önce maliyet ve onay akışı tasarlanmalı.

**Cevabınız:**

### YK04 — Bildirim zamanı

Yoklama bildirimi öğretmen kaydettiği anda mı gönderilecek, yoksa okul admin onayından veya gün sonu kontrolünden sonra mı?

**Öneri:** İlk sürümde otomatik SMS yok. Sonraki sürümde okul ayarına göre “anında” veya “gün sonu” seçenekleri tasarlanabilir.

**Cevabınız:**

### YK05 — Yoklama düzeltme

Öğretmen aldığı yoklamayı sonradan değiştirebilmeli mi?

**Öneri:** Evet ama değişiklik geçmişi tutulmalı. Belirli süreden sonra yalnız Okul Admin düzeltebilsin seçeneği ileride eklenebilir.

**Cevabınız:**

### YK06 — Veli/öğrenci görünürlüğü

Yoklama sonucu öğrenci ve veli ekranında görünecek mi?

**Öneri:** Evet; ancak SMS/e-posta bildirimi ayrı ayar olmalı.

**Cevabınız:**

## 9. İlk kodlama paketi kabul kriteri

Benim önerdiğim ilk küçük kodlama paketi:

1. Öğretmen dashboard’da `Ders Konusu` CTA aktif olur.
2. Öğretmen seçili hafta/gün/ders saatinde ilgili sınıf için tek `Not` alanı girer.
3. Kayıt aynı CTA’dan tekrar açıldığında görünür.
4. Geçmiş haftaya dönülse de kayıt görüntülenir.
5. Birleşik derste her sınıf için ayrı ders konusu kaydı oluşur.
6. Öğrenci/veli ekranına henüz bağlanmadan önce öğretmen ekranında kayıt yaşam döngüsü doğrulanır.

**Cevabınız:**

Uygulama bu şekilde başlatıldı. Ders Konusu için başlık alanı yoktur; tek serbest metin/not alanı vardır. Kayıt varsa aynı ekranda güncellenir, kayıt yoksa yeni kayıt oluşturulur.

## 10. Cevaplardan sonra yapılacaklar

Cevaplarınızdan sonra bu belgeye göre:

1. CTA veri modeli netleştirilecek.
2. İlk migration tasarımı çıkarılacak.
3. İlk kodlama paketi olarak `Ders Konusu` uygulanacak.
4. Sonra sırasıyla `Ev Ödevi`, `Öğrenci Yorumu`, `Sınav Bildirimi` ve en son `Yoklama` ele alınacak.
