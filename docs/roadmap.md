# Arsimio yol haritası

Bu belge yaşayan plandır. Sıralama, güvenli bir temel üzerinde küçük ama uçtan uca çalışan ürün dilimleri üretmek için tasarlanmıştır.

## Ürün keşfi — Eski okul işleyişinden yeni akademik çekirdeğe

- [x] `TAMAMLANDI` HorizonEdu'nun 46 modeli ve ilgili kayıt, yıl/sınıf, öğretmen, program, yoklama, veli ve finans akışlarının kaynak kod incelemesi; [27 bulgulu rapor](./legacy-data-model-review.md) hazırlandı (2026-09-19). Bu, canlı DB veri kalitesi testi veya yeni modüllerin tamamlanması değildir.
- [ ] `DEVAM EDİYOR` [Canlı veri doğrulaması](./legacy-live-data-review.md): API/panelde 447 öğrenci, 1.051 yıllık kayıt, 797 görünür atama ve 668 aktif program satırı incelendi; 10 canlı bulgu yazıldı. Seçili API incelemesi tamamlandı; doğrudan DB şema/kısıt denetimi, filtrelerin gizlediği kayıtlar ve diğer modüllerin canlı kontrolü açık.
- [ ] `ARAŞTIRMA` Okul kademeleri, yıl/dönem, kayıt/yerleşim, toplu sınıf yükseltme, mezuniyet/ayrılma, manuel öğretmen atama UI'si ve birleşik ders kurallarını soru-cevap görüşmeleriyle kesinleştir. Rapordaki kavramsal model taslaktır; mevcut pilot kabul durumlarını değiştirmez.
- [x] `TAMAMLANDI` İlk yıl geçişi iş kuralı görüşmesi belgelendi: PRF'de manuel öğrenci seçimi ve hedef sınıf/şubeye kayıt; ayrılanlar ayıklandıktan sonra devam eden 1–11 öğrencilerinin tamamının aynı grup/şube numarasıyla otomatik yükseltilmesi (`3 / 2 → 4 / 2`); nadir istisnaların öğrenci detayından manuel düzeltilmesi; 12. sınıflarda “Tümünü seç → Mezuniyet tarihi → Mezun et” ve tekrar edecek öğrenciyi seçimden çıkarma. [Karar ve öneriler](./legacy-data-model-review.md), bölüm 17. Bu madde yalnız görüşme kaydıdır, uygulama teslimi değildir.
- [x] `TAMAMLANDI` Ayrılma nedeni sözlüğünün ilk beş ana başlığı kullanıcı tarafından onaylandı: aile taşınması, okul ücreti/maliyet, başka okul tercihi, diğer, nedeni belirtilmedi/bilinmiyor. [Karar](./legacy-data-model-review.md), bölüm 18. Bu madde karar kaydıdır; uygulama teslimi değildir. İsteğe bağlı alan ve rapor ayrıntıları tasarım önerisi olarak kalır.
- [x] `TAMAMLANDI` Öğretmen atamalarının yönü belgelendi: otomatik öğretmen yükseltme/devir yerine profesyonel manuel UI; sınıf/sorumlu öğretmenliği ile ders öğretmenliği ayrı tutulacak. İlkokulda da beden eğitimi, resim, müzik ve dil gibi derslerde branş öğretmenleri bulunduğu doğrulandı; her dersin öğretmeni ayrı seçilebilecek. Bu yalnız ürün kararıdır, uygulama teslimi değildir.
- [x] `TAMAMLANDI` Haftalık programın mevcut sınıf → atanmış ders/öğretmen → gün → saat akışı belgelendi. Farklı seviyeler veya aynı seviyenin şubeleri dönem boyunca ortak derse girebilir; çok nadir değişiklikler haftalık program ekranından manuel yapılır. Bu ürün görüşmesi kaydıdır; ortak ders özelliği uygulanmadı.
- [ ] `ARAŞTIRMA` Yıl/dönem bağlamlı sınıf ve öğretmen görünümleri, sorumlu/ders ataması ayrımı, hızlı manuel seçim ve dönemlik ortak ders UI'si. [Karar ve öneriler](./legacy-data-model-review.md), bölüm 19–23. Öğretmen ana sayfasının beş CTA'sı ve aynı hücrede sınıf bazlı ayrı işlemleri koddan incelendi; ortak ders modeli bu ayrımı korumalı. Haftalık hedef ders sayıları ve sınıf sorumlusunun takip paneli açık kalır. UI ve şema henüz uygulanmadı.
- [ ] `ÖNCELİKLİ / TASARIM` Ders/saat bazlı yoklama: gerçek yok/geliş zamanları, sonraki öğretmene önceki durumun görünmesi, değişiklik yoksa aynı gün devamlılık, geldiğinde Late ve sonradan ayrıldığında ilgili dersten itibaren Absent. Önceki dersler korunmalı; teneffüs gecikmeleri ayrı analiz edilmeli. Temel ihtiyaç kullanıcı tarafından netleştirildi; [ayrıntılar ve kabul senaryoları](./legacy-data-model-review.md), bölüm 14 ve 22. Eski sisteme yeni eklenen veli SMS CTA'sı yalnız kullanıcı beyanıdır, kod/canlı doğrulaması ve yeni uygulama teslimi değildir; otomatik SMS kararı alınmadı.
- [ ] `ÖNCELİKLİ / TASARIM` Öğretmen UI başlangıç noktası: **Dersi başlat → Yoklama kontrolü → İşlenen konu → Ödev verildi/yok → Ders işlemlerini tamamla** önerisi. Kullanıcı adımlı akış, okulun platform kullanım takibi ve 17:00 günlük e-posta raporundaki eksiklerin azaltılmasını önceliklendirdi. [Bölüm 23](./legacy-data-model-review.md): başlatma/tamamlama ve rapora yetişme ayrı ölçülür; öğretim kalitesiyle karıştırılmaz. Kesin zorunluluklar ve eksik/geç rapor politikası açık; UI, ölçüm, zamanlayıcı veya e-posta entegrasyonu uygulanmadı.

## Sıradaki teslim — İki okul pilotu

Faz 1 ve Faz 2'nin minimum çalışan kapsamı birlikte teslim edilecek: iki kurgusal okul, aynı Vercel projesine bağlı iki adres, ayrı marka/giriş, okul bazlı yetkiler ve denetlenmiş veri izolasyonu. Ayrıntılı sıra ve kabul testleri [iki okul pilotu planında](./two-school-pilot.md).

Sıra: ortam/domain doğrulaması → iki okul seed'i ve tenant çözümleme → parolalı giriş ve yetki → kullanıcı/okul yönetimi ve audit → DB izolasyonu → iki adreste uçtan uca kabul. Domain/marka ve parolalı giriş dilimi yayında; kullanıcı Süper Admin aktivasyonunu, iki okulun ilk yöneticisini, iki okulda giriş/çıkışı ve çapraz okul giriş reddini doğruladı. Sonraki okul kullanıcı yönetimi, eski oturum iptali, kaynak bazlı olumsuz izolasyon ve tam pilot kabulü açıktır. Ayrıntılar [kurulum notlarında](./pilot-setup.md) ve [giriş kararında](./password-auth.md).

2026-09-19 öncelik güncellemesi: kullanıcı önce Süper Admin temasını ve mevcut iki okulun yönetimini istedi. [İlk çalışma alanı](./platform-workspace.md) yerelde uygulandı. 2026-09-20 kararıyla logo/görseller ve giriş şablonları ortak tasarım daha fazla oturana kadar ertelendi. Süper Admin'e ilk Okul Admin oluşturma, Okul Admin'e de [Faz 0 çalışma alanı](./school-admin-plan.md) yerelde eklendi. Sonraki okul kullanıcılarının yönetimi Faz 2'de açık kalır.

## Faz 0 — Proje temeli

- [x] `TAMAMLANDI` Next.js 16, TypeScript, Tailwind CSS ve shadcn/ui temeli kuruldu.
- [x] `TAMAMLANDI` GitHub deposu bağlandı ve ilk proje gönderildi.
- [x] `TAMAMLANDI` Vercel projesi oluşturuldu ve yerel proje bağlandı.
- [x] `TAMAMLANDI` Neon `neon-arsimio` veritabanı Vercel'e bağlandı.
- [x] `TAMAMLANDI` Yerel ortam değişkenleri alındı ve veritabanına `SELECT 1` ile bağlantı doğrulandı.
- [x] `TAMAMLANDI` Eski Flask backend'in ana modül ve model envanteri incelendi.
- [x] `TAMAMLANDI` Mimari, kullanıcı/yetki, veri modeli ve denetim yaklaşımı belgelendi.
- [ ] `SIRADAKİ` Eski projede kullanılmış olabilecek SMTP/JWT sırlarını değiştir ve geçersiz kıl.

## Faz 1 — Tenant, kimlik ve güvenlik çekirdeği

- [x] `TAMAMLANDI` Prisma ORM, Neon adaptörü, `schema.prisma` ve migration komut düzenini kur.
- [x] `TAMAMLANDI` İlk çekirdek şema taslağını oluştur: okullar, alan adları, kullanıcılar, üyelikler, roller, permission'lar, davetler ve audit events.
- [x] `TAMAMLANDI` İlk migration SQL'ini incele, tenant/audit kısıtlarını ekle ve Neon'a uygula (2026-09-19).
- [x] `TAMAMLANDI` Okullar arası rol/davet bağlantıları, permission kapsamı ve append-only audit için DB bütünlük testleri.
- [x] `TAMAMLANDI` Tekrarlanabilir pilot seed'i: iki okul, başlangıç rol/permission'ları ve PENDING Süper Admin rezervasyonu; build sırasında çalışmaz.
- [x] `TAMAMLANDI` İlk tenant context ve aktif üyelik/permission gerektiren panel guard'ları.
- [x] `TAMAMLANDI` Doğrulanmış hostname çözümlemesi ve aynı Arsimio projesindeki HorizonEdu/GjimCamEdu domainleri.
- [x] `TAMAMLANDI` E-posta/username ayrımı, scrypt parola hash'i, DB oturumları ve bir defalık terminalden Süper Admin aktivasyon kodu.
- [x] `TAMAMLANDI` `password_auth` migration'ı, hesap/okul bazlı rate limit, sunucu origin kontrolü, giriş/çıkış audit ve rollback'li auth DB testleri.
- [x] `TAMAMLANDI` Yeni yayın, ilk Süper Admin parola kurulumu ve canlı giriş; kullanıcı bildirimi ve Safari platform paneli ekran görüntüsüyle doğrulandı (2026-09-19).
- [ ] `DEVAM EDİYOR` İki okulda giriş/çıkış ve yanlış okul girişi kullanıcı tarafından doğrulandı. Eski/iptal edilmiş oturumun reddi, üyelik askıya alma ve kaynak kimliğiyle çapraz okul okuma/yazma kabulü açık.
- [ ] `SIRADAKİ` Development/preview/production DB branch ayrımını kur ve doğrula; şu an ortak başlangıç bağlantısı kullanılıyor.
- [ ] `PLANLANDI` Gerçek okul kabulünden önce özel test alan adı ve Safari oturum provasını tamamla.
- [ ] `PLANLANDI` İlk panel guard'larını bütün iş modüllerinin Server Action ve Route Handler'larına genişlet.
- [ ] `PLANLANDI` Seed/ilk admin aktivasyonunda çalışan transactional audit yazımını iş modüllerine genişlet; arşivleme ve geri alma ekle.
- [ ] `PLANLANDI` Oturum bazlı okuma/yazma izolasyon testleri, kısıtlı runtime DB rolü ve PostgreSQL RLS politikaları.

## Faz 2 — Okul kurulumu ve premium uygulama kabuğu

- [x] `TAMAMLANDI / YEREL` Süper Admin ilk çalışma alanı: ortak açık tema, okul/domain listesi, arama/filtre, okul adı/resmî unvan ve üç marka renginin önizleme/kaydetme akışı. İki mevcut okul doğrulandı; çoğaltılmadı. [Teslim ve test sınırları](./platform-workspace.md). Henüz yayımlanmadı.
- [x] `TAMAMLANDI / YEREL` Eski CSS light paleti globals.css'e taşındı; primary/secondary/background/accent rolleri, ortak status üçlüleri ve UI Kit oluşturuldu. Dark mod kaldırıldı. Modal, tooltip, checkbox ve temel form bileşenleri eklendi. [Kararlar ve 46 birim / 23 HTTP testi](./design-system.md).
- [ ] `SIRADAKİ` Süper Admin okul oluşturma ekranı ve kontrollü domain kurulum akışı.
- [x] `TAMAMLANDI` Süper Admin okul detayından ilk Okul Admin'i kullanıcı adı/geçici parola ile tanımlama. User, credential, membership, SCHOOL_ADMIN rolü ve audit tek transaction'da; ikinci ilk yönetici reddedilir, parola/hash audit'e girmez. 6/6 rollback-only DB doğrulaması geçti; kullanıcı iki pilot okul hesabını oluşturup giriş davranışını doğruladı.
- [x] `TAMAMLANDI` İki farklı marka rengiyle responsive giriş ve korumalı ilk panel sayfaları.
- [ ] `PLANLANDI` Okul alan adı doğrulama ve durum yönetimi.
- [ ] `DEVAM EDİYOR` Marka yönetimi: üç renk düzenleme ve girişe uygulama yerelde hazır. Logo/ikon/kapak görseli yükleme, kalıcı dosya depolaması ve okul bazlı giriş şablonu seçimi sıradaki dilim.
- [ ] `DEVAM EDİYOR` Süper Admin responsive navigasyon/dashboard ve Okul Admin Faz 0 kabuğu hazır; öğretmen, öğrenci, veli ve şoför panelleri planlandı.
- [ ] `PLANLANDI` Okul ayarları, saat dilimi, dil ve akademik takvim başlangıcı.
- [x] `TAMAMLANDI` Türkçe/Arnavutça/İngilizce temel i18n: okul girişi ve Okul Admin akademik dilimi, hostname/üyelik bazlı dil tercihi ve tek dönem ID'sine bağlı çeviri tablosu. Ders ve sonraki çevrilebilir kataloglar aynı standardı kullanacak.
- [ ] `PLANLANDI` Denetim geçmişi görüntüleme ekranı.

## Faz 3 — Kullanıcı ve akademik çekirdek

Okul Admin ekranlarının ayrıntılı uygulama sırası [Okul Admin faz planında](./school-admin-plan.md) tutulur. `1400px` kabuk, permission tabanlı menü ve ortak tablo temelinden sonra ilk gerçek veri dilimi olan öğretim yılları/dönemler tamamlandı.

- [ ] `PLANLANDI` Pilotun kullanıcı oluşturma/üyelik/rol akışını genişlet; ayrıntılı kullanıcı yönetimi ve kaynak bazlı yetkiler.
- [ ] `PLANLANDI` Parola değiştirme/sıfırlama ve oturum iptali. Mail/SMS, davet teslimi ve MFA daha sonra eklenecek.
- [ ] `PLANLANDI` Çalışan ve öğretmen profilleri.
- [ ] `PLANLANDI` Öğrenci ve veli profilleri ile doğrulanmış bağlantılar.
- [ ] `DEVAM EDİYOR` Akademik yapı: öğretim yılı/dönem, esnek kademe/seviye, yıllık sınıf/şube, üç dilli ders kataloğu, yıllık sınıf–ders planı ve üç dilli/çakışmasız ders saatleri tamamlandı. Okulda tek aktif yıl korunur; o yılın bütün dönemleri birlikte etkinleşir ve tarihli kayıtlar okul saat dilimindeki tarihe göre doğru döneme otomatik bağlanır. Takvim/çalışma günleri kullanıcıyla ürün görüşmesi yapılana kadar bilinçli olarak durduruldu.
- [ ] `DEVAM EDİYOR` Eski HorizonEdu görselindeki 49 ders, üç dilli ve `GENERAL`/`ELECTIVE`/`IGCSE` türüyle HorizonEdu'ya seed edildi. Seçmeli ve IGCSE için ayrı ortak not haneleri not modülünde uygulanacak. Sınıf/şube ve planın yeni yılda elle tekrar girilmesini kaldıracak global katalog + yıllık seçim akışı [incelendi](./legacy-subject-seed-and-year-reuse.md); henüz uygulanmadı.
- [ ] `PLANLANDI` Öğrenci kayıtları ve öğretmen atamaları.
- [ ] `PLANLANDI` Toplu içe aktarma için doğrulama ve hata raporu.

## Faz 4 — İlk uçtan uca okul iş akışı

İlk dikey dilim olarak yoklama önerilir; rollerin, tenant izolasyonunun, mobil kullanımın, bildirim ihtiyacının ve audit geçmişinin birlikte sınanmasını sağlar.

- [ ] `PLANLANDI` Öğretmenin atanmış sınıf listesini görmesi.
- [ ] `PLANLANDI` Günlük/ders bazlı yoklama kaydetmesi.
- [ ] `PLANLANDI` Düzeltme gerekçesi ve geçmişi.
- [ ] `PLANLANDI` Öğrenci ve velinin izin verilen yoklama özetini görmesi.
- [ ] `PLANLANDI` Okul Admin raporu ve dışa aktarma.

## Faz 5 — Eğitim, iletişim ve operasyon modülleri

- [ ] `PLANLANDI` Program yönetimi.
- [ ] `PLANLANDI` Sınav, değerlendirme ve notlar.
- [ ] `PLANLANDI` Ödev, teslim ve materyaller.
- [ ] `PLANLANDI` Yorum, davranış ve bildirimler.
- [ ] `PLANLANDI` Finans modülü.
- [ ] `PLANLANDI` Servis, rota, sefer ve biniş/iniş takibi.

## Faz 6 — Geçiş ve ölçekleme

- [ ] `PLANLANDI` Eski veri alanlarının kaynak-hedef eşleme belgesi.
- [ ] `PLANLANDI` Temizleme, dönüştürme, prova aktarımı ve mutabakat raporu.
- [ ] `PLANLANDI` Gözlemlenebilirlik, hata izleme, yedekleme ve geri yükleme tatbikatı.
- [ ] `PLANLANDI` Performans, erişilebilirlik ve güvenlik kontrolleri.
- [ ] `PLANLANDI` IP/WAF giriş koruması, session/throttle kayıt temizliği ve canlı kullanım öncesi güvenlik kabulü.
- [ ] `PLANLANDI` Saklama/anonymization politikalarının ülke ve sözleşmeye göre kesinleştirilmesi.

## İlk teslim ölçütü

Faz 1 ve Faz 2'nin pilot kapsamı, aşağıdaki senaryo kurgusal test verisiyle iki ayrı okul adresinde güvenli biçimde çalıştığında tamamlanır. Gerçek öğrenci/veli verisi, runtime DB yetkileri ve izolasyon testleri tamamlanmadan alınmaz:

1. Süper Admin bir okul oluşturur.
2. Okul doğrulanmış alan adından açılır.
3. Yetkili yönetici tarafından tanımlanan Okul Admin kullanıcı adı/parola ile kendi okuluna giriş yapar.
4. Yetkili bir kayıt oluşturur ve günceller.
5. Başka okulun kullanıcısı kaydı okuyamaz veya değiştiremez.
6. Değişiklik actor ve önce/sonra bilgisiyle denetim geçmişinde görünür.
7. Kayıt arşivlenebilir ve yetkili kullanıcı tarafından geri alınabilir.
8. İki okulun adı/markası, oturum bağlamı ve önbelleği birbirine karışmaz.
9. Yeni deployment sonrasında iki test domaini de hedeflenen güncel sürümü açar.

Akademik modüllere pilot kabulünden sonra geçilir. Gerçek okulların özel domainle kabulü ayrıca gerçek özel test alan adı provasını gerektirir.
