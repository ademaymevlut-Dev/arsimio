# 16 — UI Düzenleme Başlangıç Brief’i

Bu döküman yeni bir chat ekranında UI/UX düzenleme çalışmasına temiz başlamak için hazırlanmıştır. Mevcut sistemde veritabanı ve ana iş akışları büyük oranda kuruldu; bundan sonraki UI çalışması sadece “güzelleştirme” değil, bazı formların akışını daha doğru hale getirme çalışmasıdır.

## Yeni chat için önerilen başlangıç prompt’u

```text
Arsimio / HorizonEdu okul yönetim sistemi üzerinde çalışıyoruz.

Önceki chatlerde veritabanı ve ana iş akışlarını kurduk. Şimdi UI/UX düzenleme aşamasına geçiyoruz. Lütfen önce proje kök dizinindeki docs klasörünü, özellikle şu dökümanları oku:

- docs/01-hedef-veri-mimarisi.md
- docs/03-kisi-ogrenci-personel-veli-veri-mimarisi.md
- docs/07-ogretmen-atama-ve-program-kararlari.md
- docs/08-ogretmen-cta-karar-sorulari.md
- docs/09-yoklama-akisi-ve-kararlari.md
- docs/11-ogrenci-person-alan-analizi-ve-faz-plani.md
- docs/15-finans-ogrenci-veli-kontrat-karar-sorulari.md
- docs/16-ui-duzenleme-baslangic-brief.md

Amacımız şu:

Mevcut çalışan sistemi bozmadan, ekranları daha profesyonel, daha anlaşılır ve gerçek okul kullanımına uygun hale getirmek. UI çalışmasında sadece görsel düzen değil; form akışı, alan sıralaması, butonların yeri, kullanıcı hatalarını azaltacak açıklamalar ve hangi bilginin hangi sırada girileceği de ele alınacak.

Önce kod yazma. İlk adımda mevcut ekranları ve akışları inceleyip UI düzenleme planını modül modül çıkar. Sonra benim onayımla adım adım kodlamaya geçelim.

Önemli notlar:

- Şu an güzel tasarım değil, doğru kullanım akışı öncelikli.
- TR / SQ / EN dil desteği korunmalı.
- Tenant/school izolasyonu bozulmamalı.
- Mevcut çalışan formlar ve kayıtlar kırılmamalı.
- Faz 7 ve Faz 8 şimdilik beklemede; UI çalışması sırasında ihtiyaç netleşirse tekrar ele alınacak.
- Büyük değişiklikleri tek seferde değil, modül modül yapalım.
```

## Mevcut sistem durumu

Şu ana kadar sistemde aşağıdaki ana alanlar çalışır hale getirildi:

- Multi-tenant okul yapısı.
- Süper admin / okul admin / öğretmen / veli / öğrenci girişleri.
- Gerçek kişi, personel, öğretmen, öğrenci ve veli ilişkileri.
- Anne ve baba kayıtları; birincil iletişim / finans sorumlusu mantığı.
- Akademik yıl, sınıf, seviye, ders, sınıf-ders planı.
- Öğretmen atamaları ve haftalık ders programı.
- Öğretmen dashboard’unda haftalık program.
- Öğretmen CTA kayıtları:
  - Ders konusu
  - Ödev
  - Öğrenci yorumu
  - Yoklama
  - Sınav bildirimi
- Veli ekranında öğrenciye ait günlük / haftalık bilgiler.
- Öğrenci ekranında öğrenciye ait görünüm.
- Personel temel kayıtları, fotoğraf, HR alanları.
- Personel kontrat çekirdeği ve kontrat template çekirdeği.
- Öğrenci finans protokolleri:
  - Protokol oluşturma
  - Ücret kalemleri
  - Taksit planı
  - Ödeme hareketleri
  - Finans özeti ve yönetim çıktıları

## UI çalışmasının ana hedefi

UI düzenlemesinde amaç yalnızca ekranları “güzel” yapmak değildir. Asıl hedef:

1. Kullanıcının yanlış alana yanlış bilgi girmesini azaltmak.
2. Öncelikli işlem akışını ekranda doğal hale getirmek.
3. Formları okulun gerçek çalışma sırasına göre düzenlemek.
4. Hangi kayıt neden oluşturuluyor bilgisini kullanıcıya göstermek.
5. Listeleri sadece veri yığını olmaktan çıkarıp yönetilebilir hale getirmek.
6. Ekranlarda gereksiz karmaşayı azaltmak.
7. Eksik / hatalı kayıtları anlaşılır uyarılarla göstermek.

## Öncelikli UI ilkeleri

### 1. Form akışları kayıt mantığına göre düzenlenmeli

Örneğin finans ekranında kullanıcı önce öğrenci seçmeli, sonra o öğrencinin velileri ve aktif öğretim yılı bağlamında protokol oluşturmalı. Şu an çalışan yapı doğru veri oluşturuyor fakat formun sırası ve görsel yerleşimi hataya açık.

Benzer şekilde personel, öğretmen, öğrenci ve veli ekranlarında da önce “kim”, sonra “hangi rol/bağlam”, sonra “hangi dönem/kayıt” mantığı izlenmeli.

### 2. İşlem butonları bağlam içinde olmalı

Kullanıcı bir kaydı seçmeden alt detaylara geçmemeli. Eğer seçili kayıt yoksa ekran açıkça “önce kayıt seçin” demeli.

### 3. Hata mesajları alan seviyesinde görünmeli

Genel “işlem başarısız” mesajı yeterli değil. Kullanıcı hangi alanın neden hatalı olduğunu görmeli.

Örneğin ödeme formunda:

- Tutar geçersizse doğrudan tutar alanının altında görünmeli.
- Tarih eksikse tarih alanında görünmeli.
- Açıklama zorunlu değilse kullanıcıyı gereksiz durdurmamalı.

### 4. Dil desteği her ekranda korunmalı

Mevcut yapı TR / SQ / EN sözlükleriyle çalışıyor. UI değişikliklerinde yeni metinler mutlaka üç dile eklenmeli.

### 5. UI güzelleştirme modül modül yapılmalı

Tüm sistemi tek seferde yeniden tasarlamak riskli. Öncelik sırası önerisi:

1. Öğrenci detay ekranı
2. Veli detay / veli portal ekranı
3. Öğretmen detay ve öğretmen portal ekranı
4. Personel detay ekranı
5. Akademik yapı ve ders programı ekranları
6. Dashboard / yönetim özet ekranları
7. Finans / Protokol ekranı

## Öğrenci ekranı için UI notları

Öğrenci detay ekranı UI çalışmasının ilk adımı olmalı. Çünkü sistemdeki birçok veri öğrencinin etrafında birleşiyor: veli ilişkileri, sınıf kaydı, öğretmen kayıtları, yoklama, sınavlar, ödevler ve finans protokolleri.

Öğrenci detay ekranında bilgi grupları şu mantıkla ayrılmalı:

- Kimlik ve temel bilgiler
- Fotoğraf
- Aktif sınıf / kayıt durumu
- Veli ilişkileri
- Akademik bilgiler
- Öğretmen kayıtları / yorumlar / ödevler / sınavlar / yoklama
- Finans protokolleri
- Belgeler

Öğrenci ekranında her şey tek sayfada alt alta yığılmamalı. Tab veya bölüm kartları kullanılmalı.

## Veli ekranı için UI notları

Veli portalı eski projedeki `parent_today.html` mantığına yakın çalışmalı:

- Çocuk seçimi
- Bugünkü dersler
- Ödevler
- Ders konusu
- Öğrenci yorumları
- Yoklama
- Sınav bildirimleri
- Finans / ödeme bilgileri

Veli ekranında okul yönetimindeki detay formlar görünmemeli; sadece anlaşılır bilgi ve takip ekranı olmalı.

## Öğretmen ekranı için UI notları

Öğretmen portalında ana ekran haftalık ders programı olmalı.

Her ders hücresinde CTA’lar:

- Ders konusu
- Ödev
- Öğrenci yorumu
- Yoklama
- Sınav bildirimi

Öğretmen aynı gün/saatte birleşik sınıfa giriyorsa her sınıf için ayrı CTA aksiyonu açık kalmalı.

## Personel ekranı için UI notları

Personel ekranı şu bölümlere ayrılmalı:

- Temel personel bilgileri
- Fotoğraf
- Görev / pozisyon / öğretmen profili
- Kontratlar
- Maaş / ücret bilgileri
- İzin / devamsızlık
- Belgeler

Personel öğretmense, öğretmen profiline geçiş net görünmeli. Personel aynı zamanda veli ise bu kişi tek gerçek kişi olarak kalmalı; rol ilişkileri ayrı görünmeli.

## Akademik yapı ve ders programı ekranları için UI notları

Bu ekranlarda amaç okul admininin her yıl minimum tekrar iş yapmasını sağlamaktır.

Öne çıkarılacak ana akış:

- Global tanımlar: seviye, sınıf, ders, ders türü
- Bir kez tanımlanan seviye–ders planı
- Öğretim yılına bağlı sınıf/şube açılımları
- Öğretmen atamaları
- Haftalık ders programı
- Akademik hafta / takvim günü kontrolü

Bu bölümde kullanıcıya “global kayıt” ile “yıllık kayıt” farkı net gösterilmeli.

## Dashboard / yönetim özeti ekranları için UI notları

Dashboard ekranları veri girişi değil, yönetim takibi odaklı olmalı.

İlk aşamada öne çıkabilecek yönetim kartları:

- Bugünkü yoklama / gelmeyen öğrenciler
- Yaklaşan sınavlar
- Son öğretmen yorumları
- Aktif öğrenci / personel sayıları
- Kurulum veya eksik kayıt uyarıları
- Finans özeti daha sonra, finans UI aşamasına gelindiğinde eklenebilir.

## Finans ekranı için son aşama UI notları

Finans / Protokol ekranı UI çalışmasında son aşamada ele alınmalıdır. Çünkü finans ekranında öğrenci, veli, kontrat/protokol, ödeme planı ve yönetim çıktıları birleşir. Önce öğrenci, veli ve temel detay ekranlarının daha doğru akışa kavuşması finans ekranının da daha sağlıklı tasarlanmasını sağlar.

Mevcut ihtiyaç:

- Öğrenci seçimi daha belirgin olmalı.
- Öğrenci seçildikten sonra sorumlu veli seçimi gelmeli.
- Aynı veli birden fazla öğrencinin finans sorumlusu olabilir; bu normaldir.
- Aynı veli aynı gün birden fazla öğrenci için ödeme yapabilir; bu engellenmemelidir.
- Protokol numarası öğretim yılı ile birlikte unique çalışır.
- Ödeme formunda tutar, açıklama ve tarih alanları daha anlaşılır yerleşmeli.
- Ücret kalemleri, taksit planı ve ödemeler tab sistemiyle kalmalı fakat seçili protokol bilgisi daha net gösterilmeli.
- Yönetim özeti ayrı bir üst panel olarak kalabilir fakat tablo yoğunluğu azaltılabilir.

Önerilen finans ekranı bölümleri:

1. Üst finans özeti
2. Filtreler
3. Protokol oluşturma sihirbazı / formu
4. Protokol listesi
5. Seçili protokol detayı
6. Ücret kalemleri / taksitler / ödemeler tabları
7. Yönetim çıktıları: borçlu, geciken, yaklaşan vadeler

## UI çalışmasında dikkat edilecek teknik kurallar

- Next.js sürümü için `AGENTS.md` talimatı korunmalı; ilgili Next dokümanları okunmadan kod yazılmamalı.
- Server/client component sınırları bozulmamalı.
- Prisma ilişkileri ve school tenant filtreleri korunmalı.
- Form action yapısı korunmalı; sadece gerektiğinde sadeleştirilmeli.
- Dil sözlükleri eksik bırakılmamalı.
- Büyük UI refactor’ları küçük PR/commit adımlarıyla yapılmalı.
- Her modül sonrası en az:

```bash
pnpm lint
pnpm test
pnpm build
```

çalıştırılmalı.

## Faz 7 ve Faz 8 durumu

Kullanıcı kararı:

Faz 7 ve Faz 8 şimdilik beklemede. Öncelik UI planlamasına geçti.

Sebep:

- Bazı ekranlarda hangi veri önce gösterilecek, hangi işlem hangi sırada yapılacak, hangi kayıtlar formda işlenecek henüz UI üzerinden netleştirilecek.
- UI planı yapılmadan yeni modül/faz kodlamak daha sonra tekrar form değişikliği gerektirebilir.

Bu nedenle yeni chat önce UI planını çıkarmalı; sonra modül modül uygulamaya geçmelidir.
