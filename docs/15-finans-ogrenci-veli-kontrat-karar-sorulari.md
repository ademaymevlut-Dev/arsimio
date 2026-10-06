# 15 — Finans / veli-öğrenci kontrat modülü karar soruları

Tarih: 2026-10-06  
Durum: `CEVAPLAR OKUNDU — KODLAMA FAZLARI PLANLANDI`

Bu dokümanın amacı, öğrenci/veli finans kontrat sistemini kodlamadan önce veri modelini ve iş akışını netleştirmektir.

Önemli karar: Bu modül personel kontratından ayrıdır. Personel kontratı okul-personel ilişkisini yönetir; bu modül ise veli/öğrenci yıllık okul ücretleri, ek hizmetler, indirimler, taksit planı ve ödeme hareketlerini yönetir.

## 1. Şu ana kadar anlaşılan ana kurgu

Daha önce verdiğin cevaplardan anladığım yapı:

- Finans modülü özellikle özel okullar için kullanılacak.
- Devlet okullarında bu alan kullanılmayabilir.
- Kontrat veli üzerinden yürütülecek.
- Veli seçilecek, velinin bir veya birden fazla çocuğu için aynı ekranda yıllık finans kontratı oluşturulabilecek.
- Her çocuk için yıllık kontrat ayrı olacak.
- Her öğrencinin sınıf/kademe bilgisine göre farklı ücretleri olabilir.
- Eğitim ücreti dışında yemek, servis, üniforma gibi ek kalemler olabilir.
- Peşinat düşüldükten sonra kalan tutar aylara otomatik bölünecek.
- Yönetim isterse taksit planını elle değiştirebilecek.
- Ödeme takibi “taksit kapandı / kapanmadı” gibi basit checkbox mantığıyla değil, muhasebe benzeri borç/alacak hareketleriyle yapılacak.
- Veli ekranında kontrat no, tarih, tutar, ödenenler ve hesap hareketleri gibi görünüm olacak.

Bu dökümanda senden beklediğim şey: aşağıdaki sorulara kısa veya uzun cevap yazman. Emin olmadığın konularda “sonra karar verelim” yazabilirsin.

## 2. Modül kapsamı

### FIN-K01 — İlk fazda neleri yapalım?

Benim önerim ilk fazı küçük tutmak:

1. Veli seçimi
2. Veliye bağlı öğrenci seçimi
3. Öğretim yılı seçimi
4. Öğrenci bazlı yıllık kontrat oluşturma
5. Kontrat kalemleri
6. İndirim / burs / özel indirim alanları
7. Peşinat
8. Otomatik taksit planı
9. Manuel taksit düzenleme
10. Ödeme hareketi girişi
11. Veli ekranında finans özeti

Kapsam dışı bırakılabilecekler:

- PDF kontrat çıktısı
- Online ödeme entegrasyonu
- Fatura/makbuz resmi belge sistemi
- SMS/e-posta ödeme hatırlatma
- Muhasebe programı entegrasyonu
- Gelişmiş raporlar

**Cevabınız:**
Planlaman Uygundur. Kapsam dışı içeriklerde de hemfikiriz.

## 3. Kontrat sahipliği

### FIN-K02 — Kontrat ana kaydı kime bağlı olsun?

Teknik önerim:

- Ana kontrat kaydı `Guardian / veli kişi` üzerinden açılsın.
- Kontrat içinde her öğrenci için ayrı yıllık öğrenci kontrat satırı olsun.
- Yani bir veli kontrat oturumunda birden fazla çocuk ekleyebilsin, ama her çocuğun ücret/taksit hesabı ayrı takip edilsin.

Örnek:

- Veli: Ahmet Yılmaz
  - Öğrenci 1: 3/A — yıllık eğitim + yemek
  - Öğrenci 2: 9/B — yıllık eğitim + servis

**Soru:** Bu yapı doğru mu, yoksa her öğrenci için tamamen ayrı kontrat ekranı mı olmalı?

**Cevabınız:**
Bu yapı doğru . Bu şekilde düzenlemek istiyorum.

### FIN-K03 — Ödeme sorumlusu veli

Daha önce karar: günlük rapor primary veliye gider, ödeme sorumlusu ayrı seçilebilir.

**Soru:** Finans kontratı oluştururken ödeme sorumlusu veli mutlaka seçilmeli mi?

Önerim:

- Evet, ödeme sorumlusu zorunlu olsun.
- Varsayılan olarak öğrenci detayında `isFinancialResponsible` işaretli veli gelsin.
- Yoksa primary veli varsayılan gelsin.
- Yönetim kontrat sırasında değiştirebilsin.

**Cevabınız:**
Uygundur.

## 4. Öğretim yılı ve öğrenci ilişkisi

### FIN-K04 — Kontrat öğretim yılına bağlı mı?

Önerim:

- Her öğrenci finans kontratı bir öğretim yılına bağlı olsun.
- Aynı öğrenci için aynı öğretim yılında birden fazla aktif kontrat olmasın.
- Yanlış kontrat için iptal / düzeltme tarihçesi kullanılsın.

**Cevabınız:**
Önerilerin uygundur.

### FIN-K05 — Sınıf/kademe fiyatı

Özel okullarda fiyatlar genellikle sınıf/kademeye göre değişir.

**Soru:** İlk fazda fiyatlar nereden gelsin?

Seçenekler:

1. Her kontratta tutarlar manuel girilsin.
2. Okul yıl/kademe bazlı fiyat listesi oluştursun, kontrata otomatik gelsin.
3. İlk faz manuel olsun, fiyat listesi sonraki faza kalsın.

Benim önerim: İlk faz manuel tutar girişiyle başlayalım. Çünkü fiyat listesi ayrı bir katalog modülüne dönüşebilir.

**Cevabınız:**
Otomatik fiyatlar gelmesin. Tutar manuel olarak yönetim tarafından tanımlansın.

## 5. Kontrat numarası ve durum

### FIN-K06 — Kontrat numarası

Personel kontratında olduğu gibi öğrenci/veli kontrat numarası nasıl yönetilsin?

Önerim:

- Okul içinde manuel girilebilir olsun.
- Boş bırakılırsa sistem otomatik numara üretsin.
- Aynı kontrat numarası okul içinde tekrar etmesin.

**Cevabınız:**
Protokol / kontrat numarası yapısı:

Finans sisteminde ana kayıt “yıllık protokol/kontrat kaydı” olacaktır. Okul her öğretim yılı için öğrenciye yeni bir protokol kaydı oluşturur. Protokol numarası bazı öğrencilerde yıllar boyunca aynı kalabilir; fakat her öğretim yılı için ayrı kayıt açılır.

Örnek:

- 2023/2024 - Protokol 161/17
- 2024/2025 - Protokol 161/17
- 2025/2026 - Protokol 161/17

Bu üçü aynı protokol numarasını taşısa bile sistemde üç ayrı yıllık finans kaydıdır.

Bizim kontrat numaramız kullanıcı tarafında şu formatta görünebilir:

`Öğretim yılı + Protokol No`

Örneğin:

`2024/2025 - Protocol 161/17`

Okul ücretleri, indirimler, yemek/servis gibi ek ücretler, ödeme planı, taksitler ve ödeme transaction kayıtları bu yıllık protokol/kontrat kaydına bağlı olacaktır.

Protokol kaydı oluşturulduktan sonra onun detayında:

- ücret kalemleri,
- indirimler,
- ödeme planı,
- taksitler,
- tahsilatlar,
- ödeme hareketleri

tanımlanacaktır.

Aynı okul ve aynı öğretim yılı içinde aynı protokol numarası ikinci kez kullanılmamalıdır. Fakat farklı öğretim yıllarında aynı protokol numarası tekrar kullanılabilir.


### FIN-K07 — Kontrat durumları

Önerilen durumlar:

- Taslak
- Aktif
- İptal
- Tamamlandı

Benim önerim:

- İlk fazda `Taslak`, `Aktif`, `İptal` yeterli.
- `Tamamlandı` ödeme bakiyesi sıfırlandığında otomatik/manuel ileride eklenebilir.

**Cevabınız:**
Önerin Uygundur.

## 6. Kontrat kalemleri

### FIN-K08 — İlk kalem türleri

Önerilen kontrat kalemleri:

- Eğitim ücreti
- Yemek
- Servis
- Üniforma
- Kitap / materyal
- Sınav / aktivite
- Diğer

**Soru:** Bu kalemler yeterli mi? Eklenmesini istediğin standart kalem var mı?

**Cevabınız:**
Evet Yeterli ... 

### FIN-K09 — Kalemler pozitif/negatif olabilir mi?

Önerim:

- Ücret kalemleri pozitif borç oluşturur.
- İndirim/burs ayrı alanlarda tutulur, negatif kalem olarak karışmasın.
- “Late fee / gecikme bedeli” ileride pozitif ek borç kalemi olarak eklenebilir.

**Cevabınız:**
Uygundur.

### FIN-K10 — Kalem açıklaması

Her kontrat kaleminde açıklama/not alanı olsun mu?

Önerim:

- Evet, opsiyonel not alanı olsun.
- Örn: “Servis sadece sabah”, “Yemek 10 ay”, “Özel indirim yönetim onaylı”.

**Cevabınız:**
Evet Olsun.

## 7. İndirim, burs ve net tutar

### FIN-K11 — İndirim ve burs ayrı mı tutulmalı?

Önerim:

- İndirim tutarı
- Burs oranı veya burs tutarı
- Kardeş indirimi
- Diğer özel indirim

ayrı alanlar olarak tutulabilir. Fakat ilk fazda fazla karmaşık olabilir.

İlk faz önerim:

- Toplam brüt tutar
- Toplam indirim tutarı
- Net kontrat tutarı
- İndirim açıklaması

**Soru:** İlk faz için bu yeterli mi, yoksa burs/kardeş indirimi ayrı ayrı mı tutulmalı?

**Cevabınız:**
Bu yeterli. Açıklama kısmında indirim nedeni not olarak düşülecektir.

### FIN-K12 — Yüzde mi tutar mı?

İndirimler yüzde olarak mı, tutar olarak mı girilecek?

Seçenekler:

1. Sadece tutar
2. Sadece yüzde
3. Hem yüzde hem tutar, sistem net tutarı hesaplasın

Benim önerim: İlk fazda sadece tutar daha basit ve güvenli.

**Cevabınız:**
İndirm tutarı % yüzde olarak girilecek. Fiyat üzerinden düşülecek.

## 8. Para birimi

### FIN-K13 — Para birimi

Personel ücretinde `EUR` kullandık.

**Soru:** Öğrenci finans kontratlarında para birimi nasıl olsun?
Para birimini label olarak kullanacağız bu yüzden varsayılan EUR kalsın. İhtiyaç olursa USD , TL gibi tanım eklenebilsin.
Tanımlamalar kısmında ekleriz. 



Önerim:

- Varsayılan `EUR`
- Kontrat bazında değiştirilebilir
- İlk fazda tek para birimiyle başlayabiliriz

**Cevabınız:**
Evet.


## 9. Peşinat ve taksit planı

### FIN-K14 — Peşinat

Peşinat nasıl tutulmalı?

Önerim:

- Kontrat oluştururken opsiyonel peşinat tutarı girilsin.
- Peşinat ayrı bir ödeme hareketi olarak kaydedilsin.
- Kalan tutar taksitlere bölünsün.

**Cevabınız:**
Peşinat Listenin en üstünde olacak.  Peşinat - Parapagim gibi  . Oraya peşinat miktarı girilecek. Peşinat yoksa 0 yazılacak. 
Taksit sayısı seçildiğinde kalan para da taksitlere bölünecek. Burada birde her ayın kaçında ödeme olacaksa tarih alanları da kaç taksit ise o ayların tarihleri olarak doldurulsun.

### FIN-K15 — Otomatik taksit oluşturma

Sistemin taksit planını nasıl oluşturmasını istersin?

Örnek alanlar:

- taksit sayısı
- ilk vade tarihi
- aylık periyot
- peşinat düşüldükten sonra kalan tutar

Önerim:

- Yönetim net kontrat tutarını ve peşinatı girer.
- Kalan tutar taksit sayısına bölünür.
- İlk vade tarihinden itibaren aylık tarihler oluşturulur.
- Küsurat son taksite eklenir.

**Cevabınız:**
Evet.  Lütfen burada daha önceki yapıyı anlamak için öğretnci sayfasındaki installments-tab kısmını eski projedeki yapıyı incelemeni istiyorum.
Htm dosyasını //horizonedu/backend/app/templates/admin_tem/student_list.html  içerisinde bulabilirsin. proje kök klasörü arsimio içerinde bu folder alanı



### FIN-K16 — Taksitleri elle değiştirme

Daha önce “değiştirebilsin” dedin.

**Soru:** Yönetim otomatik oluşan taksitlerde hangi alanları değiştirebilsin?

Önerilen:

- vade tarihi
- tutar
- açıklama
- taksit iptal / arşiv

**Cevabınız:**
Biz taksit listesini UI üzerinde hesaplayarak yapacağız. Her satırda otomatik hesabı ekleyeceğiz ve değişiklik yaptığımnda kalan tutar kalan aylara eşit olarak dağıtılacak. burada UI üzerinden hesaplar gösterilecek ve en son onaylandığında kayıt oluşacak.

## 10. Ödeme hareketleri / muhasebe mantığı

### FIN-K17 — Borç/alacak hareketi

Daha önce “muhasebedeki gibi borç alacak takip yapacağız” dedin.

Önerilen yapı:

- Kontrat ve taksitler borç satırı oluşturur.
- Ödeme alındığında alacak/ödeme satırı girilir.
- Kalan bakiye hareket toplamından hesaplanır.
- Bir ödeme birden fazla taksiti karşılayabilir.
- Yarım ödeme yapılabilir.

**Soru:** Bu doğru mu?

**Cevabınız:**
EVET DOĞRU

### FIN-K18 — Ödeme yöntemleri

İlk fazda hangi ödeme yöntemleri olsun?

Önerilen:

- Nakit
- Banka transferi
- Kart
- Online
- Diğer

**Cevabınız:**
Elden yada Banka ödemesi gibi bir takip yapmayacağız . Yönetim ödemenin geldiği tarih açıklama ve tutar olacak. Eğer yönetim isterse açıklama kısmına Banka - Elden gibi kendi notlarını alabilir. Biz muhasebe programı değiliz. 

### FIN-K19 — Ödeme bilgileri

Ödeme hareketinde hangi alanlar olsun?

Önerilen:

- tarih
- tutar
- ödeme yöntemi
- açıklama
- makbuz / referans no
- işlemi yapan kullanıcı

**Cevabınız:**
Ödeme yönetemi , Makbuz / Referans no alanlarına gerek yok.  İşlemi yapan kullanıcı Login olan olsun. Kaydı kim oluşturduysa o yazsın. Ödeme girişi yapan kim di o bilinsin yeter.

## 11. Gecikme / late fee

### FIN-K20 — Gecikme bedeli

Daha önce “gecikme bedeli yönetim tarafından istenirse borç hanesine satır olarak eklenebilmeli” dedin.

Önerim:

- Otomatik gecikme bedeli ilk fazda olmasın.
- Yönetim manuel “gecikme bedeli” borç hareketi ekleyebilsin.

**Cevabınız:**
Manuel olarak ekleyecek.

## 12. Veli ekranı

### FIN-K21 — Veli ne görsün?

Önerilen veli görünümü:

- aktif kontratlar
- kontrat no
- öğrenci adı
- öğretim yılı
- net tutar
- ödenen
- kalan
- taksit planı
- ödeme hareketleri

**Soru:** Veli detay kalemleri de görsün mü? Örneğin yemek, servis, indirim açıklaması.

**Cevabınız:**
Veli ekranında şuan bir işlem istemiyorum çünkü uygulamaya giren veli ve ugulama girişi olan veli farklı olabilir. O yüzden ödeme takibi veli - öğrenci kısmında olmayacak.  Yönetim ödeme sorumlusu veli talebine göre mevcut borç alacak listesini mail gönderebilecek.

### FIN-K22 — Öğrenci ekranı

Öğrenci kendi portalında finans bilgisi görsün mü?

Benim önerim:

- Hayır, ilk fazda sadece veli görsün.

**Cevabınız:**
Hayır - Veli - öğrenci finans kısmını görmeyecek.

## 13. Admin ekranları

### FIN-K23 — İlk admin ekranları

Önerilen ilk ekranlar:

1. Finans kontrat listesi
2. Yeni kontrat oluşturma
3. Veli detayında finans sekmesi
4. Öğrenci detayında finans özeti
5. Ödeme hareketi ekleme

**Soru:** Önce hangi ekrandan başlamak daha iyi olur?

Benim önerim:

- Önce veli detayından “Finans / Kontratlar” sekmesi.
- Sonra genel finans listesi.

**Cevabınız:**
Uygundur.

### FIN-K24 — Yetkiler

Önerilen izinler:

- `finance.contracts.read`
- `finance.contracts.manage`
- `finance.payments.read`
- `finance.payments.manage`

Okul Admin hepsine sahip olur.

**Cevabınız:**
Uygundur.

## 14. Eski proje incelemesi

### FIN-K25 — Eski sistemden taşınması gereken özel alanlar

Eski projede finans alanlarını tekrar inceleyeceğiz:

- `stu_prices`
- `stu_cost_tbl`
- `Stu_pay_statement_tbl`
- öğrenci kontrat/protokol ekranları
- indirim alanları
- servis/yemek/üniforma alanları
- taksit/ödeme kayıtları

**Soru:** Eski sistemde özellikle kaybolmaması gereken bir alan veya mantık var mı?

**Cevabınız:**
Protokol mantığı yukarıda anlattım. Peşinat ve taksitlendirme ile okul giderleri tanımlama.  Üniforma , tshirt , yemek , transport gibi. 

## 15. Cevaplardan çıkan nihai kararlar

Kodlamaya geçmeden önce cevaplardan çıkan net kararlar:

- Finans modülü ilk etapta sadece yönetim tarafında çalışacak.
- Veli ve öğrenci portalında finans bilgisi gösterilmeyecek.
- Finansın ana kaydı yıllık `protokol / kontrat` kaydı olacak.
- Okul her öğretim yılı için öğrenciye yeni protokol kaydı oluşturacak.
- Protokol numarası farklı yıllarda aynı kalabilir.
- Aynı okul ve aynı öğretim yılı içinde aynı protokol numarası ikinci kez kullanılmayacak.
- Kullanıcıya görünen kontrat/protokol formatı: `Öğretim yılı + Protocol No`.
- Örnek: `2024/2025 - Protocol 161/17`.
- Ücretler otomatik katalogdan gelmeyecek; yönetim manuel girecek.
- Kontrat kalemlerinde fiyat, indirim yüzdesi, hesaplanan net tutar ve açıklama olacak.
- İlk standart kalemler: eğitim, yemek, servis, üniforma, kitap/materyal, sınav/aktivite, diğer.
- Peşinat listenin ilk satırı olacak ve `Peşinat / Parapagim` olarak yönetilecek.
- Peşinat yoksa `0` girilebilecek.
- Kalan tutar taksit sayısına göre otomatik dağıtılacak.
- Taksit ekranında tutar değiştirildiğinde kalan tutar sonraki taksitlere yeniden dağıtılacak.
- Taksit planı önce UI üzerinde önizleme olarak hesaplanacak; kayıt ancak yönetim onayladığında oluşacak.
- Ödeme hareketinde ödeme yöntemi, makbuz no ve referans no olmayacak.
- Ödeme hareketinde tarih, açıklama, tutar ve işlemi yapan kullanıcı yeterli olacak.
- Gecikme bedeli otomatik hesaplanmayacak; yönetim isterse manuel borç satırı ekleyecek.
- Personel kontrat şablonu ayrı modülde olduğu gibi öğrenci finans kontrat çıktısı da ileride ayrı fazda ele alınacak.

## 16. Kodlama fazları

Bu fazlar cevaplara göre güncellenmiş nihai çalışma sırasıdır. Her faz tamamlandıktan sonra deploy/test yapılabilir.

### Faz 1 — Finans/protokol veri çekirdeği

Amaç: Sistemin yıllık protokol/kontrat mantığını güvenli şekilde kurmak.

Yapılacaklar:

- Finans yetkileri eklenecek:
  - `finance.contracts.read`
  - `finance.contracts.manage`
  - `finance.payments.read`
  - `finance.payments.manage`
- Yıllık öğrenci protokol/kontrat tablosu oluşturulacak.
- Ana kayıt öğrenci, öğretim yılı, ödeme sorumlusu veli ve protokol numarasıyla tutulacak.
- Aynı okul + aynı öğretim yılı + aynı protokol numarası için tekrar kayıt engellenecek.
- Aynı öğrenci + aynı öğretim yılı için birden fazla aktif kontrat engellenecek.
- Kontrat durumları eklenecek:
  - taslak
  - aktif
  - iptal
- Para birimi alanı eklenecek; varsayılan `EUR` olacak.
- Kontrat/protokol görüntü numarası sistem tarafından `Öğretim yılı - Protocol No` formatında üretilecek.
- Temel doğrulama/test kontrolleri yazılacak.

Bu faz sonunda beklenen sonuç:

- Yönetim paneli henüz detaylı olmasa bile veritabanında yıllık protokol/kontrat kaydı güvenli şekilde oluşturulabilir.

### Faz 2 — Protokol detayında ücret kalemleri

Amaç: Eski projedeki `Cost Details` mantığını yeni sisteme taşımak.

Yapılacaklar:

- Protokol/kontrat detay kalemleri tablosu oluşturulacak.
- Kalem türleri desteklenecek:
  - eğitim ücreti
  - yemek
  - servis
  - üniforma
  - kitap / materyal
  - sınav / aktivite
  - diğer
  - manuel gecikme bedeli
- Her kalemde şu bilgiler olacak:
  - açıklama / hizmet adı
  - brüt fiyat
  - indirim yüzdesi
  - hesaplanan net tutar
  - opsiyonel not
  - durum
- Toplam brüt, toplam indirim ve toplam net tutar kontrat üzerinden hesaplanacak.
- İndirim nedeni serbest açıklama/not olarak tutulacak.

Bu faz sonunda beklenen sonuç:

- Bir protokol seçilip yıllık okul ücreti, yemek, servis, üniforma gibi kalemler eklenebilir.
- Net kontrat tutarı sistem tarafından hesaplanabilir.

### Faz 3 — Peşinat ve taksit planı

Amaç: Eski projedeki `Installments` mantığını daha kontrollü bir UI hesaplama ekranına çevirmek.

Yapılacaklar:

- Taksit planı tablosu oluşturulacak.
- Taksit planı protokol/kontrat kaydına bağlanacak.
- İlk satır `Peşinat / Parapagim` olacak.
- Peşinat tutarı `0` olabilir.
- Yönetim taksit sayısını seçecek.
- Sistem kalan tutarı seçilen taksit sayısına bölecek.
- İlk vade tarihi ve ödeme günü seçimine göre aylık vade tarihleri üretilecek.
- Küsurat son taksite aktarılacak.
- UI üzerinde satır tutarı değiştirildiğinde kalan tutar sonraki taksitlere yeniden dağıtılacak.
- Bu hesaplama önce kayıt edilmeden önizleme olarak gösterilecek.
- Yönetim onayladığında taksit kayıtları oluşturulacak.
- Taksitlerde şu alanlar olacak:
  - taksit adı
  - vade tarihi
  - tutar
  - açıklama
  - durum

Bu faz sonunda beklenen sonuç:

- Yönetim, protokol ücret toplamından peşinatı düşüp kalan tutarı taksitlere bölebilir.
- Otomatik dağıtılan taksitleri kayıt öncesi elle düzeltebilir.

### Faz 4 — Ödeme hareketleri ve bakiye takibi

Amaç: Basit ama güvenilir borç/alacak hareketi oluşturmak.

Yapılacaklar:

- Ödeme hareketleri tablosu oluşturulacak.
- Hareketler protokol/kontrat kaydına bağlanacak.
- Ödeme hareketinde şu alanlar olacak:
  - tarih
  - açıklama
  - tutar
  - işlemi yapan kullanıcı
  - oluşturulma/güncellenme bilgisi
- Ödeme yöntemi, makbuz no ve referans no eklenmeyecek.
- Ödeme bir veya birden fazla taksiti karşılayabilecek şekilde toplam bakiye üzerinden takip edilecek.
- Kısmi ödeme desteklenecek.
- Kalan bakiye kontrat net tutarı, manuel borç kalemleri ve ödeme hareketlerinden hesaplanacak.
- Yönetim manuel “gecikme bedeli” borç kalemi ekleyebilecek.

Bu faz sonunda beklenen sonuç:

- Yönetim protokol detayında ödeme girişi yapabilir.
- Sistem toplam borç, toplam ödeme ve kalan bakiyeyi gösterebilir.

### Faz 5 — Yönetim ekranları

Amaç: Finans akışını okul admin için kullanılabilir hale getirmek.

Yapılacaklar:

- Veli detayında `Finans / Kontratlar` sekmesi eklenecek.
- Veli üzerinden bir veya birden fazla çocuk için yıllık protokol/kontrat oluşturma akışı hazırlanacak.
- Öğrenci detayında yıllık protokol listesi gösterilecek.
- Öğrenci detayında seçilen protokolün:
  - ücret kalemleri
  - taksit planı
  - ödeme hareketleri
  - bakiye özeti
  görüntülenecek.
- Genel finans/protokol listesi hazırlanacak.
- Liste filtreleri:
  - öğretim yılı
  - öğrenci
  - veli
  - protokol no
  - durum
- SMS/e-posta gönderimi bu fazda yapılmayacak.
- Finans bilgisi veli ve öğrenci portalına açılmayacak.

Bu faz sonunda beklenen sonuç:

- Okul admin eski projedeki protokol ekranına benzer şekilde yeni sistemde protokol seçip ücret, taksit ve ödeme işlemlerini yönetebilir.

### Faz 6 — Finans özeti ve yönetim çıktıları

Amaç: Yönetimin borç/alacak durumunu hızlı takip edebilmesi.

Yapılacaklar:

- Protokol detayında özet kartları hazırlanacak:
  - brüt toplam
  - indirim toplamı
  - net toplam
  - ödenen
  - kalan
  - yaklaşan vade
  - geciken taksit
- Yönetim için borç listesi hazırlanacak.
- Yaklaşan vade listesi hazırlanacak.
- Gecikmiş ödeme listesi hazırlanacak.
- Ödeme sorumlusu veli bilgisi listelerde gösterilecek.
- Veliye mail gönderme altyapısı bu fazda sadece hazırlık/not olarak kalacak; otomatik gönderim yapılmayacak.

Bu faz sonunda beklenen sonuç:

- Yönetim kimin ne kadar borcu kaldığını ve hangi vadelerin yaklaştığını görebilir.

### Faz 7 — Kontrat çıktısı ve öğrenci kontrat şablonları

Amaç: Finans çekirdeği oturduktan sonra yazdırılabilir kontrat sistemine geçmek.

Yapılacaklar:

- Öğrenci finans kontratı için ayrı şablon alanı oluşturulacak.
- Personel kontrat şablonundan bağımsız çalışacak.
- Protokol/kontrat bilgileri, öğrenci bilgileri, ödeme sorumlusu veli, ücret kalemleri ve taksit planı şablona aktarılacak.
- Yazdırılabilir görünüm hazırlanacak.
- PDF çıktısı veya print görünümü bu fazda değerlendirilecek.

Bu faz sonunda beklenen sonuç:

- Yönetim yıllık protokol/kontrat kaydından yazdırılabilir öğrenci kontratı alabilir.

### Faz 8 — İleri entegrasyonlar ve hatırlatmalar

Amaç: Çekirdek finans sistemi tamamlandıktan sonra otomasyonları eklemek.

Sonraki kapsam:

- SMS/e-posta ödeme hatırlatma
- Veliye manuel hesap ekstresi gönderme
- Otomatik gecikme uyarıları
- Online ödeme entegrasyonu
- Fatura/makbuz resmi belge sistemi
- Gelişmiş finans raporları
- Muhasebe programı entegrasyonu

Bu faz ilk kodlama sürecinin dışında bırakılacaktır.

