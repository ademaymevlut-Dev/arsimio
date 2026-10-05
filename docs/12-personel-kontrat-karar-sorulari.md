# 12 — Personel kontrat çekirdeği karar soruları

Bu doküman Personel Faz 3 / Aşama 2 için hazırlanmıştır. Amaç, maaş, izin ve bordro modüllerine girmeden önce personelin kontrat kayıtlarını doğru veri modeline oturtmaktır.

Bu aşamada hedefimiz “kontrat dosyasını saklamak” değil, personelin okul ile yaptığı kontratın temel tarihçe kaydını oluşturmaktır. PDF, kimlik kopyası, imza dosyası ve diğer belgeler daha sonra ayrı doküman/evrak fazında ele alınacaktır.

## 1. Bu aşamada önerilen kapsam

Önerilen ilk kapsam:

- personel kontrat kaydı
- kontrat numarası
- kontrat türü
- başlangıç tarihi
- bitiş tarihi
- durum
- açıklama / not
- eski kontratları silmeden tarihçe olarak tutma

Bu aşamada kapsam dışında kalması önerilenler:

- maaş/ücret tutarı
- banka bilgisi
- izin hakkı
- bordro
- kontrat PDF yükleme
- imza/onay iş akışı

## 2. Önerilen veri mantığı

Benim önerim kontratı `employment` kaydına bağlı ayrı bir tablo olarak tutmak:

`employment_contracts`

Bu tablo personelin gerçek kişi kaydına değil, okul içindeki personel kaydına bağlı olur. Çünkü aynı gerçek kişi ileride başka okulda veya başka dönemde farklı kontratlara sahip olabilir.

Önerilen temel alanlar:

- okul
- personel iş kaydı
- kontrat no
- kontrat türü
- başlangıç tarihi
- bitiş tarihi
- durum
- not
- oluşturma/güncelleme bilgileri

## 3. Cevaplarını beklediğim karar soruları

### PC01 — Kontrat numarası

Kontrat numarası nasıl yönetilmeli?

Benim önerim: ilk aşamada manuel girilsin, okul içinde tekrar etmesin.

Senin kararın:

- Evet Okul tarafından girilsin. Farklı formatlarda olabilir o yüzden biz sadece önceden aynı kayıttan olup olmadığı. Aynı kontrat numarası (bunu içinde harfte barınırabilir metin olarak saklayacağız.) varsa onu geri bildirim yapacağız. 

### PC02 — Kontrat türleri

İlk aşamada hangi kontrat türleri olsun?

Önerilen başlangıç seçenekleri:

- Süresiz
- Süreli
- Yarı zamanlı
- Hizmet sözleşmesi
- Stajyer
- Diğer

Senin kararın:

- Evet Bu seçenekler gayet yeterli. 

### PC03 — Aynı anda aktif kontrat

Bir personelin aynı anda birden fazla aktif kontratı olabilir mi?

Benim önerim: hayır, aynı personel için aynı anda yalnız bir aktif kontrat olsun. Yeni aktif kontrat oluşturulursa eski aktif kontrat kapatılmalı veya önce manuel kapatma istenmeli.

Senin kararın:

- Hayır. Farklı görevlerde olsa tek kontrat içeriğinde tanımlanır zaten. 

### PC04 — Başlangıç ve bitiş tarihi

Kontrat bitiş tarihi zorunlu olmalı mı?

Benim önerim:

- Süresiz kontratta bitiş tarihi boş olabilir.
- Süreli kontratta bitiş tarihi zorunlu olmalı.

Senin kararın:

- Süresiz kontrat hiç görmediğim bir durum. Fakat bitiş tarihini zorunlu alan olarak yapmayalım. boş bırakılabilsin.

### PC05 — Kontrat durumları

İlk aşamada hangi durumlar yeterli olur?

Önerilen durumlar:

- Taslak
- Aktif
- Bitmiş
- İptal

Benim önerim: ilk aşamada “Taslak” olmadan başlayabiliriz. Admin kontratı kaydediyorsa doğrudan aktif/bitmiş/iptal durumları yeterli olabilir.

Senin kararın:

- Uygundur. Bunlar yeter

### PC06 — Personel işten ayrılırsa kontrat

Personel işten ayrıldığında aktif kontrat otomatik kapanmalı mı?

Benim önerim: evet. Personel durumu “ayrıldı” yapılırken aktif kontratın durumu da “bitmiş” olmalı ve bitiş tarihi ayrılış tarihiyle kapanmalı.

Senin kararın:

- Erken kontrat fesli olabiliyor. O yüzden Personel ayrılışına biz zaten bir yapı kurmuştuk. 

### PC07 — Kontrat ve maaş ilişkisi

Maaş bilgisi kontrat içinde mi dursun, yoksa ayrı maaş tarihçesi tablosunda mı dursun?

Benim güçlü önerim: maaş ayrı tabloda dursun. Kontrat no ve tarihler kontratta, maaş/ücret ise ayrı hassas maaş tarihçesinde tutulmalı.

Senin kararın:

- Tamam ayrı tutalım fakat girişlerde UI de aynı yerde kayıt edeceğiz. Yani tek formdan submit ile iki ayrı tabloda kayıt oluştururuz. Diğer konumlarda yetki kısmında sorun olmasın diye.  

### PC08 — Kontrat ekranı

Personel detay ekranında kontratlar nasıl görünmeli?

Benim önerim:

- Personel detayında ayrı “Kontratlar” kartı olsun.
- Üstte aktif kontrat özet görünsün.
- Altta eski kontratlar liste olarak görünsün.
- İlk aşamada modal veya ayrı sayfa yapmadan kart içinde kayıt oluşturma yeterli olur.

Senin kararın:

- Önerilerin uygundur. 

### PC09 — Yetki

Kontrat kayıtlarını kimler görebilmeli ve yönetebilmeli?

Benim önerim:

- `hr.contracts.read` kontratları görür.
- `hr.contracts.manage` kontrat oluşturur/günceller/kapatır.
- Okul Admin başlangıçta bu yetkilere sahip olur.
- Maaş yetkisi bundan ayrı kalır.

Senin kararın:

- Uygundur.

### PC10 — Kontrat arşivleme ve silme

Kontrat kaydı silinebilmeli mi?

Benim önerim: hayır. Yanlış kayıt için “iptal” durumu kullanılmalı. Böylece geçmiş kaybolmaz.

Senin kararın:

- Evet dediğin gibi silmek yerine iptal edilen , düzeltilen kontrat olmalı. Düzelme gördüyse son güncellenme tarihi tutmak iyi olur.

## 4. Benim önerdiğim ilk kodlama paketi

Sen cevapları verdikten sonra ilk kodlama paketi şu şekilde olabilir:

1. `employment_contracts` tablosu
2. `hr.contracts.read` ve `hr.contracts.manage` permission kayıtları
3. Okul Admin rolüne kontrat yetkileri
4. Personel detay ekranında “Kontratlar” kartı
5. Kontrat oluşturma ve durum güncelleme server actionları
6. Üç dil sözlükleri
7. Validation ve testler

Bu paket tamamlandıktan sonra deploy edip yalnız kontrat tarihçesini test ederiz. Maaş/ücret ekranına bir sonraki küçük aşamada geçeriz.

## 5. 2026-10-05 uygulama notu

Kontrat çekirdeği ilk paket olarak kodlandı:

- `employment_contracts` tablosu eklendi
- kontrat numarası okul içinde tekil olacak şekilde tasarlandı
- aynı personelde aynı anda tek aktif kontrat DB seviyesinde korundu
- kontrat türleri eklendi: süresiz, süreli, yarı zamanlı, hizmet sözleşmesi, stajyer, diğer
- kontrat durumları eklendi: aktif, bitmiş, iptal
- kontrat başlangıç tarihi zorunlu, bitiş tarihi isteğe bağlı bırakıldı
- personel detay ekranında aktif kontrat özeti, yeni kontrat formu ve kontrat geçmişi eklendi
- `hr.contracts.read` ve `hr.contracts.manage` yetkileri eklendi
- Okul Admin rollerine kontrat yetkileri migration içinde bağlandı
- personel işten ayrılınca aktif kontrat otomatik `bitmiş` durumuna alınacak şekilde servis davranışı eklendi

Kontrat maddeleri ve yazdırılabilir template motoru kontrat çekirdeği deploy/test sonrası ayrı fazda ele alınacak.

## 6. 2026-10-05 ücret çekirdeği uygulama notu

Kontrattan ayrı maaş/ücret çekirdeği ikinci küçük paket olarak kodlandı:

- `employment_compensations` tablosu eklendi
- maaş/ücret personelin `Employment` kaydına bağlandı; gerçek kişi veya kontrat metni içine gömülmedi
- aynı personelde aynı anda tek aktif ücret kaydı DB seviyesinde korundu
- tutar `decimal(12,2)` olarak saklanır; virgüllü girişler uygulamada noktaya normalize edilir
- para birimi 3 harfli kod olarak tutulur; varsayılan kullanım `EUR`
- tutar türü eklendi: brüt / net
- ödeme tipi eklendi: aylık, saatlik, günlük, ders başı, diğer
- durum eklendi: aktif, bitmiş, iptal
- personel detay ekranında aktif ücret özeti, yeni ücret formu ve ücret geçmişi eklendi
- `hr.compensation.read` ve `hr.compensation.manage` yetkileri eklendi
- Okul Admin rollerine ücret yetkileri migration içinde bağlandı
- personel işten ayrılınca aktif ücret kaydı otomatik `bitmiş` durumuna alınacak şekilde servis davranışı eklendi

Bu faz hâlâ payroll/bordro, banka bilgisi, ödeme emri, muhasebe veya kontrat template motoru değildir. Bunlar ayrı fazlarda ele alınacak.
