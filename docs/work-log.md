# Çalışma günlüğü

Bu günlük yapılan teknik ve ürün çalışmalarını tarih sırasıyla kaydeder. Gizli anahtarlar, parolalar ve bağlantı dizeleri bu belgeye yazılmaz.

## 2026-09-18

### Proje kurulumu

- Next.js 16 App Router, React, TypeScript ve Tailwind CSS temeli kuruldu.
- shadcn/ui yapılandırıldı.
- Neon için sunucu tarafı bağlantı yardımcısı ve sağlık kontrolü hazırlandı.
- GitHub deposu bağlandı ve proje gönderildi.
- Vercel projesi oluşturuldu ve yerel depo Vercel'e bağlandı.
- Vercel üzerinden Neon `neon-arsimio` veritabanı oluşturuldu/bağlandı.
- Geliştirme ortam değişkenleri `.env.local` dosyasına alındı.
- Neon bağlantısı salt okunur `SELECT 1` sorgusuyla doğrulandı.

### Eski sistem incelemesi

- HorizonEdu Flask backend'i yeni projeye kopyalanacak kaynak olarak değil, alan bilgisi referansı olarak incelendi.
- Yönetim, çalışanlar, dönemler, sınıflar, dersler, program, öğrenciler, veliler, yoklama, notlar, sınavlar, ödevler, materyaller, finans, mobil API ve iletişim alanları tespit edildi.
- Eski yapının tek okul varsayımı, parçalı kullanıcı kimlikleri ve tenant kapsamı olmayan rol yaklaşımının yeni ürüne taşınmaması kararlaştırıldı.
- Eski sistemde kullanılmış olabilecek sabit SMTP/JWT sırlarının yeniden kullanılmadan önce değiştirilmesi gerektiği kaydedildi.

### Mimari kararlar

- Arsimio'nun sıfırdan geliştirilen yeni ve çok kiracılı bir ürün olacağı kesinleştirildi.
- İlk aşamada tek Next.js uygulaması ve tenant kapsamlı ortak Neon PostgreSQL şeması seçildi.
- Tenant'ın doğrulanmış hostname üzerinden çözülmesi ve tenant'a ait her kaydın `school_id` taşıması kararlaştırıldı.
- Küresel kullanıcı + okul üyeliği + çoklu rol + eylem permission modeli tanımlandı.
- Süper Admin, Okul Admin, Öğretmen, Öğrenci, Veli ve Servis Şoförü başlangıç rolleri belirlendi.
- Audit kayıtlarının append-only olması, normal silmelerin arşivleme olarak çalışması ve kalıcı silmenin onaylı istisna olması kararlaştırıldı.
- Teknik mimari, veri modeli, yetki matrisi, veri yaşam döngüsü ve yol haritası `docs/` altında belgelendi.

### Sıradaki çalışma

- İlk Prisma migration SQL'inin incelenmesi ve Neon'a uygulanması.
- Sistem rolleri ve permission kayıtları için güvenli seed hazırlanması.
- Kimlik sağlayıcısının özel okul alan adı senaryosunda teknik olarak doğrulanması.

## 2026-09-18 — Prisma kararı

- Geliştirici deneyimi ve mevcut proje bilgisi dikkate alınarak Drizzle yerine Prisma ORM kullanılmasına karar verildi.
- Prisma ORM 7, Prisma Client ve Neon sürücü adaptörü projeye eklendi.
- `prisma/schema.prisma` dosyasında tenant, kimlik, rol/permission, davet ve audit çekirdek modelleri oluşturuldu.
- Runtime bağlantısı pooled `DATABASE_URL`, migration bağlantısı unpooled Neon değişkenini kullanacak şekilde ayrıldı.
- Prisma Client için build-safe, lazy ve tekil istemci erişimi hazırlandı.
- Sağlık kontrolü Prisma üzerinden veritabanı bağlantısını doğrulayacak şekilde güncellendi.
- Prisma şeması doğrulandı; lint ve production build kontrolleri başarıyla tamamlandı.
- Yerel production sağlık endpoint'i üzerinden Prisma–Neon bağlantısı salt okunur sorguyla doğrulandı.
- İlk migration henüz Neon'a uygulanmadı; SQL ve özel tenant/audit kısıtları incelendikten sonra uygulanacak.

## 2026-09-19 — Şema incelemesi ve ilk migration

- Migration'ların bütün ürün tamamlanmadan, anlamlı özellik grupları bazında ilerlemesine karar verildi.
- Şema incelemesinde okul dışı rol/davet ataması, platform permission'ının okul rolüne bağlanması ve hatalı audit actor eşleşmesi açıkları bulundu; bileşik foreign key ve kapsam kurallarıyla düzeltildi.
- Audit kaydını değiştirme/silme/temizleme işlemlerini reddeden DB trigger'ı eklendi; actor ve üyelik referanslarında SET NULL yerine RESTRICT kullanıldı.
- Okul başına tek doğrulanmış ana domain, global rol kodu tekilliği, normalize e-posta/hostname ve tam auth identity alan çifti kısıtları eklendi.
- `20260919000100_init_core` migration'ı boş `public` şeması için üretildi. Migration'ın tamamı transaction içinde prova edildi; 37 kontrol geçti ve prova geri alındı.
- Migration, Arsimio Neon veritabanına `migrate deploy` ile uygulandı: 13 uygulama tablosu ve Prisma migration geçmişi oluşturuldu. Ayrı `neon_auth` şemasının 9 tablosu korundu.
- Uygulama sonrası 36 DB bütünlük kontrolü geçti; test verileri rollback ile geri alındı. Prisma Client 13 modeli okuyabildi, uygulama tabloları boş ve migration durumu güncel olarak doğrulandı.
- Güncel şema için Prisma validate/generate, lint ve Next.js production build başarıyla tamamlandı.
- PostgreSQL RLS, kısıtlı runtime DB rolü, otomatik audit yazımı ve rol/permission seed'i sonraki adımlardır.
- [Migration çalışma düzeni](./database-migrations.md) eklendi; yol haritası ve model belgeleri güncellendi.

## 2026-09-19 — İki okul pilotunun planlanması

- Sonraki teslim, tek kod tabanı/Vercel projesinde iki kurgusal okulun ayrı domain, marka, giriş ve yetkileriyle çalışması olarak planlandı.
- [İki okul pilotu](./two-school-pilot.md) belgesi eklendi; mimari, yol haritası ve belge dizinleri güncellendi.
- Sıra; ortam/domain/auth doğrulaması, seed/tenant altyapısı, giriş/davet/yetki, minimum yönetim ekranları/audit, DB izolasyonu ve uçtan uca kabul olarak tanımlandı.
- Mevcut Neon Auth ilk teknik deneme adayı oldu; sağlayıcı henüz kesinleştirilmedi. İki `.vercel.app` adresi ile gerçek özel domain doğrulamasının farklı kabul adımları olduğu kaydedildi.
- A okulundan B verisine erişim, farklı okulda farklı rol, üyelik iptali, cache/pooled bağlantı ayrımı ve yeni deployment'ta iki adresin güncellenmesi kabul testlerine eklendi.
- Bu çalışma yalnız planlama ve Markdown belge güncellemesidir: uygulama kodu/şema değiştirilmedi, seed veya migration çalıştırılmadı; hesap, domain, deployment ve dış servis ayarları değiştirilmedi.

## 2026-09-19 — İki okul pilotu: ilk uygulama ve yayın

- Kullanıcı HorizonEdu için `horizonedu.vercel.app`, GjimCamEdu için `gjimcamedu.vercel.app` adreslerini seçti. İki adres yalnız mevcut Arsimio Vercel projesine kalıcı domain olarak eklendi ve doğrulandı; başka projeler değiştirilmedi.
- Kullanıcının onayladığı yönetici e-postası bootstrap ortam değişkenine kondu. Parola üretilmedi/paylaşılmadı; provider hesabı oluşturulmadı. Seed, yalnız PENDING uygulama kullanıcısını ve ayrılmış platform rolünü oluşturdu.
- İki okul, marka renkleri, okul başına beş rol ve platform/school permission'ları transactional, tekrar çalıştırılabilir seed ile eklendi. Domainler Vercel sahipliği/HTTPS doğrulamasından sonra VERIFIED kaydedildi. İki seed çalıştırmasından sonra okul sayısı iki kaldı.
- Sunucu hostname çözümleme, aktif/verifiye domain/okul kontrolleri, provider kimliğiyle kullanıcı eşleme, aktif üyelik/permission guard'ları ve temel yetki policy testleri eklendi.
- Neon Auth SDK ile host kapsamlı cookie, e-posta doğrulama koşulu, kontrollü bootstrap aktivasyonu, giriş/çıkış Server Action'ları ve dar kapsamlı verify-email endpoint'i eklendi. Provider şeması doğrudan değiştirilmedi; yeni migration gerekmedi.
- Ortak responsive giriş bileşeni iki okulun DB marka rengini kullanıyor. Platform okul listesi ve okul paneli korumalı ilk ekranlardır; tam yönetim/akademik özellikler değildir. Seed ve admin aktivasyonu audit ile aynı transaction sınırında çalışır.
- Development/preview/production cookie sırları ayrı oluşturuldu. DB/Auth ortam ayrımının henüz yapılmadığı, RLS/kısıtlı DB rolünün gerçek veri öncesi kabul kapısı olduğu kaydedildi.
- 30 unit test, 36 DB kontrolü, Prisma validate, TypeScript, lint ve production build geçti. Yerel 14 ve canlı 13 HTTP kontrolü geçti. Yerel tarayıcıda iki marka ve mobil giriş formu doğrulandı.
- İlk production deployment READY oldu: `dpl_HRdYztjygGPubEDP5oThsu6N6DQE`; üç domain aynı yayını açıyor. Son bir saatlik production error taraması kayıt bulmadı; harici drain/alarm kurulmadı.
- Girişin POST sınamasında üç origin için `INVALID_ORIGIN` bulundu. Neon Auth Domains listesine yalnız üç Arsimio adresinin eklenmesi için kullanıcı onayı istendi; başarılı oturum testi bu ayar ve hesap sahibinin doğrulamasından sonra yapılacak.
- Yerel Git Xcode lisansı engeli nedeniyle çalışmadı; commit/push yapılmadı. İlk yayın CLI ile yerel kaynaklardan yapıldı. Lisans kullanıcı adına kabul edilmedi.
- [Pilot kurulum/kanıt/açık işler](./pilot-setup.md) eklendi; yol haritası, mimari ve pilot planı güncellendi. Tam pilot kabulü bitmiş olarak işaretlenmedi.

## 2026-09-19 — GitHub üzerinden yayın hazırlığı

- Kullanıcı mevcut değişikliklerin GitHub'a gönderilmesini ve Vercel'in otomatik deployment'ının kontrol edilmesini istedi.
- Varsayılan Git'in Xcode lisans engeli sürerken, zaten kurulu Command Line Tools Git'i kullanılabilir bulundu. Lisans kabul edilmedi ve global sistem/Git ayarı değiştirilmedi.
- `origin` hedefi `ademaymevlut-Dev/arsimio`; yerel `main` ve uzak `main` başlangıç commit'i eşleşiyor. Vercel bağlantısının bu repo ve production `main` dalını kullandığı API üzerinden doğrulandı.
- Push öncesi 30 unit test, lint, Prisma şema doğrulaması ve diff whitespace kontrolü geçti. `.env.local`, eski Flask referans klasörü ve üretilen Prisma Client Git dışında; gönderilecek kaynaklarda sır örüntüsü taraması eşleşme bulmadı.
- Neon Auth güvenilir origin izni bu Git yayını işleminin dışında tutuldu; girişin açık işi olarak kalır. Otomatik yayın sonucunda deployment commit eşleşmesi ve üç adresin HTTP kontrolleri ayrıca doğrulanır.

## 2026-09-19 — Önbellekli Vercel build'inde Prisma Client düzeltmesi

- Kullanıcının paylaştığı `22f2deb` Git deployment logunda `Can't resolve '@/generated/prisma/client'` hatası görüldü. Bağımlılık önbelleği geri yüklenmiş, install güncel bulunmuş ve `postinstall` çalışması logda yer almamıştı; build script'i yalnız `next build` çağırıyordu.
- `package.json` içindeki build komutu `prisma generate && next build` yapıldı. `postinstall` korundu; generated client Git dışında tutulmaya devam ediyor. Yeni bağımlılık, migration, seed veya ortam değişkeni değişikliği yok.
- Mevcut generated Prisma dizini geçici klasöre yedeklenerek client dosyasının yokluğu doğrulandı. `pnpm build` client'ı yeniden üretti; Next.js production derlemesi ve TypeScript kontrolü geçti. Lint ve diff whitespace kontrolü de geçti.
- Yerel düzeltme doğrulandı; commit/push kullanıcının tercihine bırakıldı. Yeni Vercel deployment sonucu henüz doğrulanmadı. Neon Auth trusted-origin sorunu bu build hatasından bağımsızdır ve açık kalır.

## 2026-09-19 — E-posta/username ayrımı ve parolalı giriş

- Kullanıcı önceki domain/deployment diliminin çalıştığını bildirdi. Geliştirmede mail/SMS istemediğini; yalnız Süper Admin'in e-posta, bütün okul rollerinin username + parola kullanacağını kesinleştirdi.
- Okul kullanıcı adı üyelikte `(school_id, username)` ile benzersiz tutuldu; farklı okullarda aynı ad farklı kişilere ait olabilir. Okul hesabında e-posta zorunluluğu kaldırıldı. Küresel kişi/üyelik modeli korundu: tek kullanıcının farklı okul üyelikleri tek parolayı paylaşır.
- Node.js scrypt ile salt'lı hash, hash'i saklanan rastgele 8 saatlik DB session, host/okul/üyelik/credential sürümü kontrolleri, HttpOnly/Secure host cookie, Origin doğrulaması ve hesap/okul başına DB tabanlı giriş limiti eklendi. Giriş türü formdan değil sunucuda tenant'tan seçilir.
- Giriş/çıkış ve ilk aktivasyon transactional audit üretir; parola, hash ve token audit'e aktarılmaz. Yetkilendirme güncel DB üyelik/permission kontrollerinde kalır.
- İlk Süper Admin için yalnız sahibinin terminalinde gizli parola alan `pnpm auth:bootstrap` hazırlandı. Public signup kaldırıldı; `/setup` bilgi sayfasıdır. Araç yalnız ayrılmış PENDING SUPER_ADMIN'i etkinleştirir; var olan parolayı değiştirmez veya yönetici rolü vermez. Gerçek parola belirlenmedi, kullanıcı terminaline bırakıldı.
- `20260919000200_password_auth` migration'ı SQL kısıtlarıyla incelendi, 18 rollback kontrolüyle prova edildi ve yalnız Arsimio DB'ye uygulandı. 3 yeni auth tablosuyla toplam 16 uygulama tablosu var; mevcut veriler silinmedi/reset yapılmadı. Migration durumu güncel.
- Uygulama sonrası 17 auth DB testi ve önceki 36 çekirdek DB testi geçti; tüm test kimlikleri rollback edildi. Son incelemede iki okul, bir PENDING kullanıcı, sıfır parola hesabı/sıfır aktif session görüldü.
- 36 birim testi, Prisma validate/generate, TypeScript, lint ve production build geçti. 14 yerel HTTP kontrolü geçti. Form türü kontrolünün 404 sayfasına yanlış uygulanması test script'inde düzeltildi; bilinmeyen hostname hâlâ reddediliyor.
- Tarayıcıda platform e-posta formu, iki okulun username formu ve formsuz setup doğrulandı. Var olmayan test hesabıyla okul girişinin genel hata yanıtı UI'da görüldü; console error yoktu. Gerçek kullanıcıyla başarılı browser/production giriş testi yapılmadı.
- Neon Auth SDK, eski proxy ve iki kullanılmayan yerel auth kurulum/probe script'i kaldırıldı; Git geçmişinden geri alınabilir. Dış Neon Auth servisi/şeması veya Vercel ortam değişkenleri silinmedi. Neon PostgreSQL korunuyor, başka Vercel projelerine dokunulmadı. Önceki origin engeli yeni kod yayımlandığında bağımlılık olmaktan çıkar.
- Next.js ve React rehberleri doğrultusunda sunucuda yetki/origin kontrolü, minimal kullanıcı DTO'su ve istemciye sır taşımama sınırı korundu. Tarayıcı doğrulama rehberleriyle UI ve sunucu/DB kanıtları ayrı değerlendirildi.
- [Parolalı giriş](./password-auth.md) eklendi; mimari, roller, veri modeli, migration, pilot ve yol haritası güncellendi. Önceki Neon Auth notları bu günlükte tarihsel kayıt olarak korundu.
- Commit/push/deploy yapılmadı. Sonraki adım sahibin parolayı belirlemesi ve yeni yayında giriş/çıkış kabulü; ardından username/parola ile Okul Admin ve okul kullanıcı yönetimi. Ortam branch ayrımı, kısıtlı DB rolü/RLS, parola kurtarma, IP/WAF, MFA ve gerçek özel domain kabulü açık işlerdir.

## 2026-09-19 — Canlı Süper Admin girişi kullanıcı tarafından doğrulandı

- Kullanıcı ilk parolasını kendi terminalinde belirlediğini, deployment'ın başarılı olduğunu ve Süper Admin olarak giriş yaptığını bildirdi.
- Paylaşılan 09.19 Safari ekran görüntüsünde `arsimio.vercel.app` platform paneli, Süper Admin kimliği, HorizonEdu/GjimCamEdu aktif okul kartları ve doğrulanmış domainleri görüldü.
- Yayın, ilk aktivasyon ve canlı giriş adımı yol haritasında tamamlandı olarak kaydedildi. Bu kanıt kullanıcı bildirimi/ekran görüntüsüdür; bu turda deployment API'si veya DB yeniden sorgulanmadı.
- Canlı çıkış/oturum iptali, okul kullanıcılarıyla giriş ve çapraz okul veri/işlem izolasyonu ayrıca açık tutuldu; tam pilot veya bütün güvenlik kabulü tamamlanmış sayılmadı.
- Yalnız Markdown durum belgeleri güncellendi. Uygulama kodu, hesap/parola, DB ve dış servis ayarları değiştirilmedi; commit/push/deploy yapılmadı.

## 2026-09-19 — Eski veri modeli ve okul işleyişinin ayrıntılı incelemesi

- Kullanıcı; toplu sınıf yükseltme/yıl geçişi, birleşik dersler, sınıf sorumlusu ekranları, öğretmen atamalarının devri, mezuniyet ve ayrılma nedenlerinin raporlanmasını öncelikli kullanım ihtiyaçları olarak aktardı.
- Yerel `horizonedu/backend/app/modeller/models.py` dosyasının tamamı incelendi: 46 model, 316 kolon ve 80 foreign key bildirimi. Bunlar kod sayımlarıdır; canlı DB envanteri değildir.
- İlgili öğrenci, yönetim, ayar, öğretmen, veli, finans ve mobil route gövdeleri; kayıt/program şablonları, uygulama factory'si, durum betiği ve günlük rapor akışı incelendi.
- [Eski sistem veri modeli incelemesi](./legacy-data-model-review.md) eklendi: mevcut işleyiş ve ilişki haritası, kullanıcı ihtiyaçlarıyla eşlenen 27 bulgu, tam model envanteri, kavramsal yeni çekirdek, alan eşleme notları, aktarım kontrolleri, kabul senaryoları ve görüşme soruları.
- Temel bulgular: Active/Passive kullanımının farklı iş durumlarını birleştirmesi, öğrenci yıl/sınıf bağlantılarında eksik FK'ler, program yılının metin tutulması ve sorgu kapsamındaki farklar, tarihli yerleşim/görev geçmişinin eksikliği, günlük/ders bazlı yoklama karışımı ve yıl filtresiz 15 tabloyu pasifleştiren betik. Kaynakta görülen davranışlar, koşullu sonuçlar ve öneriler raporda ayrıldı.
- Yeni akademik modeller ve okul kuralları `ARAŞTIRMA` olarak tutuldu; doküman dizini ve yol haritasına keşif kaydı eklendi. Önceki pilot/test durumları değiştirilmedi.
- Flask uygulaması, `create_all`, durum betiği veya migration çalıştırılmadı; canlı DB'ye bağlanılmadı. Eski kaynaklar, uygulama kodu ve şema değiştirilmedi; yalnız Markdown belgeleri güncellendi. Commit/push/deploy yapılmadı.

## 2026-09-19 — Eski canlı veri incelemesi için erişim kontrolü

- Kullanıcı canlı HorizonEdu verisini salt okunur sorgularla incelemeyi istedi. Verilen yönetim adresi HTTP 302 ile giriş ekranına yönlendi; Codex tarayıcısında da kullanıcı adı/parola formu görüldü. Site erişilemez olarak değerlendirilmedi.
- Eski yerel yapılandırmadan yalnız MySQL bağlantı hedefi ayrıştırıldı: localhost üzerindeki horizon_mysql. Yerel 127.0.0.1:3306 kontrolü ECONNREFUSED döndü; bu kontrol canlı sunucunun DB durumunu göstermiyor.
- Kullanıcıdan şifresini sohbetle paylaşmadan panelde giriş yapması veya mevcut salt-okunur bağlantı/tünelin yerini belirtmesi istendi. Giriş ekranı devam için açık bırakıldı.
- [Canlı veri inceleme kaydı](./legacy-live-data-review.md) eklendi: doğrulanmış erişim bulguları, kişisel veriyi sınırlayan okuma kuralları ve yerel modellere göre hazırlanmış 10 sorgu grubu. Sorgular çalıştırılmadı; öğrenci/öğretmen verisi ve gerçek veri kalitesi sayımları alınmadı.
- Tarayıcı iş akışı için agent-browser rehberi incelendi; ilgili komut kurulu olmadığı için mevcut tarayıcı bağlantısıyla giriş durumu kontrol edildi. Oturum kontrolü aşılmadı, parola denenmedi. Uygulama/şema/canlı kayıt değişikliği, commit/push/deploy yapılmadı.

## 2026-09-19 — Canlı API/panel verileriyle akademik çekirdeğin doğrulanması

- Kullanıcı doğrudan backend okuma uçlarının kullanılabileceğini belirtti; yönetici panelindeki oturum da açıldı. İlk erişim engeli aşıldı; parola/token kopyalanmadı, DB bağlantısı kurulmuş gibi raporlanmadı.
- Normal yetkili panel/API üzerinden 447 öğrenci profili ve her biri için yıllık kayıt geçmişi okundu: 1.051 satır. 330 aktif, 117 pasif öğrenci; pasiflerin 27'sinde yıllık kayıt yok. Öğrenci+yıl tekrarına rastlanmadı; bunlar görünür kayıtların kontrolüdür, DB constraint kanıtı değildir.
- Çerez/Authorization göndermeyen GET istekleriyle 20 sınıf, 49 ders, 7 saat, 52 öğretmen kartı; 797 görünür atama, 668 aktif program ve ilk-aktif-kayıt yöntemiyle 19 sorumluluk incelendi. Atama/program/öğretmen durumu eşlemesi yapıldı; bu kapsamda program çakışması veya atamasız program bulunmadı, 5 aktif atama henüz programda görünmüyor.
- Gerçek yıl geçişi: 2025/26'daki 297 kaydın 233'ü 2026/27'de de var; 64'ü yok, hedefte 97 ek kişi var. Sınıf bölünmesi ve PRF'de devam örnekleri görüldü; mezuniyet/ayrılma nedeni uydurulmadı.
- Canlı bulgular: 2024/25 yılının ters tarih aralığı; 121 sınıf adı snapshot farkı (boşluklar ayıklanınca 50); farklı kaynaklardan 51 öğretmen hesabı/38 aktif personel kartı/32 görevli öğretmen; bir sınıfta sorumluluk sonucu görünmemesi (API sınırlamasıyla); yıl sonundan erken biten aktif takvim; 51 performans sonucunun 47'sinin %100'ü aşması. Oturumsuz API'nin öğretmen iletişim alanlarını döndürmesi ayrıca güvenlik bulgusu olarak kaydedildi; yazma uçları denenmedi.
- [Canlı inceleme raporu](./legacy-live-data-review.md) gerçek sayımlar, yöntem/filtre sınırları, 10 bulgu ve ürün kararlarıyla güncellendi. Kaynak rapor, dizin ve yol haritasındaki başlangıç erişim durumu güncellendi; bu günlüğün önceki erişim kaydı tarihsel olarak korundu.
- API sonuçları bellekte daraltılıp toplulaştırıldı; kişi adları, iletişim bilgileri ve ham yanıtlar rapor/veri dosyası olarak kaydedilmedi. Uygulama kodu, şema veya canlı kayıt değişmedi; SQL örnekleri çalıştırılmadı, commit/push/deploy yapılmadı.

## 2026-09-19 — PRF, toplu sınıf yükseltme ve mezuniyet görüşmesi

- Kullanıcı PRF/Parafillor'un anaokulu olduğunu; birinci sınıf şube dağılımının okul tarafından daha sonra belirlendiğini açıkladı. Anaokulunu ayrı yönetme fikri öneri olarak kaydedildi; ayrı uygulama/tenant/DB kararı alınmadı.
- Mevcut okul işleyişi netleşti: ayrılanlar önce pasifleştirilir; kalanlar belirlendikten sonra yönetici “Sınıfları atlat” ile toplu yükseltme yapabilmelidir. 12. sınıflar için ayrı mezuniyet değerlendirmesi/onayı öngörüldü; zorunlu ayrıntılar henüz kesinleşmedi.
- [Kaynak rapora](./legacy-data-model-review.md) kullanıcı kararları ile tasarım önerilerini ayıran 17. bölüm eklendi. PRF yerleştirmesini normal geçişten ayırma, açık kaynak/hedef yıl, önizleme, geçmişi koruma ve tekrar güvenliği önerildi. Yeni sistemde ayrılma nedeni/tarihi ile hesap durumunun ayrı tutulması korundu.
- Canlı rapordaki önceki yenileme sorusu yanıtlandı olarak güncellendi; sıradaki soru 1–11. sınıflarda sınıf tekrarı/karar bekleme istisnası olup olmadığıdır. Eski pasif kayıtlar geriye dönük mezun/ayrılmış diye sınıflandırılmadı.
- Yalnız ürün görüşmesi belgeleri güncellendi; uygulama kodu, şema ve canlı veriler değiştirilmedi. Yeni canlı sorgu, migration, commit/push/deploy yapılmadı.

## 2026-09-19 — Normal sınıf geçişinin sadeleştirilmesi

- Kullanıcı devam eden 1–11 öğrencilerinin tamamının bir üst seviyeye geçtiğini kesinleştirdi. Çok nadir durumlarda öğrenci detayından manuel kayıt düzeltmesi yeterli; normal geçişe sınıf tekrarı, not koşulu veya öğrenci bazlı karar/onay kuyruğu eklenmeyecek.
- Kaynak raporun öneri, kabul senaryosu ve karar bölümleri; canlı rapordaki açık soru ve yol haritası bu kararla güncellendi. PRF yerleştirmesi ve 12. sınıf mezuniyetinin ayrı ele alınması korundu.
- Sıradaki soru, normal geçişte grubun/şube numarasının korunup korunmadığıdır. Yalnız dokümantasyon değişti; uygulama geliştirilmedi ve canlı kayıtlar değiştirilmedi.

## 2026-09-19 — Normal geçişte şube devamlılığı

- Kullanıcı normal sınıf geçişinde öğrenci grubunun ve şube numarasının korunduğunu doğruladı: `3 / 2 → 4 / 2`. Toplu yükseltmede rutin elle şube eşlemesi/dağıtımı istenmeyecek; PRF'nin ayrı dağıtım akışı korunacak.
- Kaynak rapor, canlı veriden çıkan önceki UI önerisi ve yol haritası bu kararla güncellendi. Geçmişte gözlenen şube bölünmeleri veri aktarımı kanıtı olarak korundu; yeni normal akışa ek karmaşıklık gerekçesi yapılmadı.
- Sıradaki görüşme için 12. sınıflarda “tümünü seç, mezuniyet tarihi, onayla” önerisi kaydedildi; henüz onaylanmış karar değildir. Yalnız dokümantasyon değişti; uygulama kodu, şema ve canlı kayıtlar değiştirilmedi.

## 2026-09-19 — Toplu mezuniyet akışının onaylanması

- Kullanıcı 12. sınıflar için “Tümünü seç → Mezuniyet tarihi → Mezun et” yöntemini onayladı. Sınıf tekrar etmesi gereken öğrenci seçim dışı bırakılabilir; ayrı bir karar kuyruğu/tekrar modülü gerekmiyor.
- Yalnız seçilen öğrencilerin mezuniyet durumu/tarihinin değişeceği; seçim dışındakilerin bu işlemle pasifleştirilmeyeceği, mezun edilmeyeceği veya otomatik yeni yıl kaydı açılmayacağı belgelendi. Geçmişi koruma ve tekrar çalıştırmada mükerrer mezuniyet üretmeme tasarım sınırları kaydedildi.
- Kaynak rapor, kabul senaryosu, canlı raporun görüşme özeti ve yol haritası güncellendi. Sıradaki soru PRF'deki herkesin 1. sınıfa geçip geçmediği, yoksa anaokulunda devam edenlerin de bulunup bulunmadığıdır.
- Yalnız ürün dokümantasyonu değişti. Canlı öğrenci kaydı değiştirilmedi; mezuniyet işlemi, kod/şema geliştirmesi veya migration yapılmadı.

## 2026-09-19 — PRF'den manuel sınıf/şube yerleştirmesi

- Kullanıcı PRF'de devam etmeyen öğrenciler de olabildiğini ve kalabalık grubun birden fazla şubeye dağıtıldığını açıkladı. Karar: yönetici öğrenciyi seçer, hedef sınıf/şubeyi belirler ve kaydeder; PRF otomatik yükseltmeye dahil edilmez.
- Seçim dışındakilere otomatik işlem yapılmaması, seçilmemenin ayrılma/tekrar kararı sayılmaması ve eski kaydın korunması belgelendi. Önceki ayrı geçiş onayı/şube bekleme önerisi zorunlu süreç olmaktan çıkarıldı; aynı hedefe çoklu seçim yalnız UI kolaylığı önerisi olarak tutuldu.
- Kaynak rapor, kabul senaryosu, canlı raporun görüşme özeti ve yol haritası güncellendi. Üç temel geçiş yolu netleşti: PRF manuel; 1–11 aynı şubeyle otomatik; 12. sınıf seçimli toplu mezuniyet. Sıradaki konu ayrılma nedeni istatistikleri.
- Yalnız dokümantasyon değişti; uygulama kodu, şema ve canlı veriler değiştirilmedi.

## 2026-09-19 — Ayrılma nedeni sözlüğü için ilk öneri

- Kullanıcı aile taşınması, şehir/ülke değişikliği, okul ücretini pahalı bulma ve başka okula transfer örneklerini verdi; kesin listeyi belirlemediğini söyledi.
- Kaynak rapora 18. bölüm eklendi: aile taşınması, okul ücreti/maliyet, başka okul tercihi, diğer ve nedeni belirtilmedi/bilinmiyor şeklinde beş ana neden önerisi. Taşınma ayrıntısı ile isteğe bağlı transfer bilgisi ayrı tutuldu; kullanıcı onayı alınmış gibi işaretlenmedi.
- Yıl, ana neden ve ayrılma anındaki kademe/sınıf sayımları önerildi. Transferin nedenlerle üst üste sayılmaması, mezuniyetin ayrı tutulması ve eski pasif öğrencilere neden uydurulmaması belirtildi.
- Canlı inceleme özeti ve yol haritası güncellendi. Yalnız dokümantasyon üretildi; öğrenci verisi, uygulama kodu veya şema değiştirilmedi.

## 2026-09-19 — Beş ayrılma nedeninin onayı ve öğretmen atamalarına geçiş

- Kullanıcı önerilen beş ana ayrılma nedenini yeterli bulup onayladı. Kaynak rapor, canlı rapor özeti ve yol haritasında sözlük kararı tamamlandı olarak kaydedildi; ek alan/rapor önerileri veya uygulama tamamlanmış sayılmadı.
- Sıradaki görüşme öğretmen–ders–sınıf atamaları ve yıl/dönem devri olarak açıldı; sonrasında sınıf sorumluluğu ve program/birleşik ders ele alınacak. İlk soru öğretmenin öğrencilerle üst sınıfa ilerlemesi veya aynı seviyede kalması ve kademe farklarıdır; yanıt henüz alınmadı.
- Yalnız ürün dokümantasyonu değişti; uygulama kodu, şema ve canlı veriler değiştirilmedi.

## 2026-09-19 — Öğretmenlerde otomasyon yerine manuel atama UI'si

- Kullanıcı ilkokulda 1–4 öğretmenlerinin öğrenci grubuyla ilerlediğini, 5. sınıf öğretmeninin yeni 1. sınıfa dönebildiğini; 6–12'de branş öğretmenleri bulunduğunu açıkladı. Belirsizlikler nedeniyle otomatik öğretmen yükseltme istemediğini, asıl ihtiyacın profesyonel UI olduğunu kesinleştirdi.
- Önceki otomatik/taslak devir önerisi güncel kapsamdan çıkarıldı. Kaynak raporun B04, teslim sırası, kabul senaryoları ve 19. bölümü; canlı rapor ve yol haritası buna göre düzeltildi. Öğrenci geçişinin öğretmen/sorumlu atamalarını değiştirmemesi korundu.
- Yıl/dönem/kademe filtreleri, ayrı sorumlu ve ders ataması, sınıf/öğretmen görünümleri ve yöneticinin manuel çoklu seçimi UI önerisi olarak kaydedildi; uygulanmış veya bütün ayrıntıları onaylanmış sayılmadı.
- Sıradaki soru 1–5'te sınıf öğretmeninin yanında branş öğretmenlerinin de derse girip girmediğidir. Yalnız dokümantasyon değişti; ekran, uygulama kodu, şema ve canlı atamalar değiştirilmedi.

## 2026-09-19 — İlkokulda sınıf ve branş öğretmenlerinin birlikte çalışması

- Kullanıcı ilkokulda beden eğitimi, resim, müzik, İngilizce/dil eğitimi gibi derslere ayrıca branş öğretmenlerinin girdiğini doğruladı.
- Atama UI'sinde ilkokulun da ders bazında öğretmen seçimi kullanacağı; sınıf/sorumlu öğretmeni seçmenin bütün dersleri otomatik bu kişiye atamayacağı belgelendi. Örnek branşlar sabit/kapalı bir liste olarak yorumlanmadı.
- Kaynak raporun 19. bölümü ve kabul senaryosu, canlı inceleme görüşme özeti ve yol haritası güncellendi. Sıradaki konu sınıf sorumlusunun panelinde hangi bilgileri takip edeceği; henüz panel kapsamı veya başkalarının kayıtlarını düzenleme yetkisi onaylanmadı.
- Yalnız dokümantasyon değişti; uygulama kodu, şema, yetkiler ve canlı atamalar değiştirilmedi.

## 2026-09-19 — Program ekranları, dönemlik ortak ders ve nadir düzenlemeler

- Kullanıcının paylaştığı öğretmen detay ve program oluşturma ekranları ile açıklamaları belgelendi. Öğretmen detayının yalnız ilgili öğretmenin saatlerini göstermesi doğru kapsamdır; sınıfın tüm programını göstermemesi eksiklik olarak yorumlanmadı.
- Mevcut akış sınıf/şube → atanmış ders–öğretmen eşleşmesi → gün → saat → ekle şeklindedir. Sınıfa göre eşleşme filtrelemesi korunacak başlangıç olarak kaydedildi; gün/saat modallarını tablo hücresi seçimiyle azaltma yalnız UI önerisidir.
- Kullanıcı ortak beden eğitimi örneklerini hem farklı seviyeler (`4 + 5`) hem aynı seviyenin şubeleri (`4/1 + 4/2`) için doğruladı. Ortak dersler dönem boyunca sürer; çok nadir program değişiklikleri mevcut haftalık program ekranından manuel yapılır.
- Kaynak rapora 20. bölüm eklendi; yol haritası ve canlı raporun ürün görüşmesi özeti güncellendi. Tek ortak kayıt/çok katılımcı sınıf, saat aralığı çakışması ve geçmişi koruyan sade düzenleme tasarım önerileri olarak ayrıldı; öğretmen otomasyonu veya karmaşık değişiklik modülü kararı alınmadı.
- Sıradaki soru haftalık hedef ders sayılarının yönetimidir; sınıf sorumlusunun takip paneli konusu açık kalır. Yalnız dokümantasyon değişti; yeni canlı sorgu, uygulama/şema değişikliği, migration, commit/push/deploy yapılmadı.

## 2026-09-19 — Öğretmen ana sayfasının beş CTA'sı ve çok sınıflı ders işlemleri

- Kullanıcı öğretmenin tarihli haftalık ana sayfasını paylaştı; yoklama, işlenen ders, öğrenci yorumu, sınav planı ve materyal CTA'larını açıkladı. Aynı saatte iki sınıfın aynı hücrede görünerek işlemlerine erişilebildiğini doğruladı.
- İlgili yerel Flask şablonu `teacher_login.html`, öğretmen route'ları, model alanları ve program oluşturma kontrolü salt okunur incelendi. Aynı hücreye her sınıfın ayrı butonları eklenir; bütün sınıflara tek seferde kayıt yapan birleşik form varsayılmadı. İkinci CTA'daki ayrı ödev sekmesi ve yorumdaki öğrenci seçimi/kategori/puan işlevleri de belgelendi.
- Kaynak rapora 21. bölüm ve `UI-T` kaynak anahtarı eklendi. B02'de çoklu sınıf gösteriminin, yerel kayıt oluşturma kontrolünden ayrı olduğu açıklandı. Ortak dersin tek oturum olarak modellenmesi önerisi sınıf bazlı CTA/içerikleri ortadan kaldırmayacak şekilde netleştirildi.
- Yoklama modelinde saat bulunmaması, günlük yokluk kontrolü ve mevcut öğrenciler için kayıt tutulmaması B12 ile ilişkilendirildi. Yeni sistem için günlük/ders bazlı yoklama sorusu açıldı; eski işleyiş otomatik hata veya onaylanmış yeni kural sayılmadı. Sınavdaki sınıf başına bir günlük sınav sınırı ve tarihsel programın aktif çizelgeden kurulması da kaynak sınırlarıyla kaydedildi.
- Yol haritası ve canlı raporun ürün görüşmesi özeti güncellendi. Haftalık hedef ders sayısı ile sınıf sorumlusunun takip paneli soruları açık kalır. Canlı öğretmen oturumu/CTA işlemi, API/SQL sorgusu, uygulama/şema değişikliği veya commit/push/deploy yapılmadı.

## 2026-09-19 — Saat bazlı yoklama ve öğretmenler arası gün içi durum devamlılığı

- Kullanıcı mevcut yoklamayı eksik bulduğunu, kesinlikle ders saatine bağlanması gerektiğini ve bunun önemli/öncelikli not olmasını istedi. Yok yazılma ve gerçek geliş saatleri; farklı ders/teneffüs gecikmelerinin ayrı analizi; ilk derslerde yokken sonradan gelme veya ilk derslerde mevcutken sonradan ayrılma senaryoları netleşti.
- Önceki yoklama durumu sonraki öğretmene görünür; değişiklik yoksa aynı gün devam edebilir. Öğrenci geldiğinde ilgili öğretmen Late ve geliş saati kaydedebilir; yok olduğunda ilgili dersten itibaren Absent yapılabilir. Bu devamlılık için her öğretmene zorunlu yeniden işaretleme/onay süreci eklenmedi.
- Kaynak rapora 22. bölüm eklendi, B12 öncelikli ürün kararıyla güncellendi ve bölüm 14'e kabul senaryoları eklendi. Geçmiş ders sonuçlarını koruma, gerçek olay/kayıt zamanı ayrımı, devralınan bilgi ile doğrudan gözlem ayrımı, gecikmeyi sonraki derslerde tekrar saymama ve eşzamanlı düzenleme güvenliği tasarım korumaları olarak kaydedildi.
- Kullanıcının eski sisteme yeni eklediğini bildirdiği öğretmen kontrollü aile SMS CTA'sı, kod/canlı doğrulaması olmayan ayrı bir not olarak kaydedildi. Sağlayıcı/teslim davranışı varsayılmadı; otomatik gönderim veya öğrenci geldiğinde yeni SMS kararı alınmadı, hiçbir mesaj gönderilmedi.
- Yol haritası ve canlı raporun ürün görüşmesi özeti güncellendi. Yalnız dokümantasyon değişti; uygulama/şema, canlı yoklama veya SMS entegrasyonu değiştirilmedi; yeni API/SQL sorgusu, migration veya commit/push/deploy yapılmadı.

## 2026-09-19 — Öncelikli öğretmen ders akışı ve gün sonu rapor hazırlığı

- Kullanıcı öğretmenin her dersi başlatması, yoklama/konu/ödev adımlarını takip etmesi, okulun platform kullanımını izlemesi ve 17:00 günlük e-posta raporundaki eksiklerin azaltılması ihtiyacını öğretmen UI önceliği olarak belirtti.
- Kaynak rapora 23. bölüm eklendi. Ders başında başlatma/yoklama, ders sırasında veya sonunda konu/ödev/tamamlama; açık “Ödev yok” yanıtı; kaldığı yerden devam ve sınıf bazlı eksik göstergeleri tasarım önerileri olarak ayrıldı. Kesin adım zorunlulukları veya ek bildirim politikası onaylanmış sayılmadı.
- Önceki yoklama devamlılığıyla yeni kontrol adımı uyumlandırıldı: önceki öğrenci durumları taşınabilir, ama o öğretmenin kontrol ettiği varsayılmaz; bütün öğrencileri her ders sıfırdan işaretleme gerekmiyor. Bölüm 14'e başlatma/yenileme, eksik adım, ortak sınıf, geç rapor ve sıfır ders senaryoları eklendi.
- Eski `run.py` ve performans hesaplaması yalnız okundu. Yerel zamanlayıcı 16:58, kullanıcı açıklaması 17:00; canlı dağıtım/saat dilimi teyit edilmedi. Dosya import/execute edilmedi; zamanlayıcı veya e-posta gönderimi başlatılmadı.
- Yeni ölçüm platformda başlatma/tamamlama/rapora yetişme olarak tanımlandı; eğitim kalitesi veya fiziksel devam kanıtı sayılmadı. Eski L09 kapsam hatasının yeni metriğe taşınmaması, aynı tarihli oturum kapsamı ve ortak dersin tek sayılması önerildi.
- Yol haritası ve canlı raporun ürün görüşmesi özeti güncellendi. Yalnız dokümantasyon değişti; uygulama/şema, canlı veri, yeni otomasyon/mesajlaşma, API/SQL sorgusu veya commit/push/deploy yapılmadı.

## 2026-09-19 — Süper Admin ilk çalışma alanı

- Kullanıcı, akademik keşiften önce mevcut iki okulu Süper Admin panelinde yönetmek ve marka/görsel ayarlarına temel hazırlamak istedi. Çalışma bu dikey dilimle sınırlandı.
- Neon'daki HorizonEdu/GjimCamEdu kayıtları ve VERIFIED domainleri salt okunur doğrulandı; yeni okul eklenmedi, seed tekrarlanmadı. Mevcut renkler ve domain eşleşmeleri korundu.
- Platforma özel koyu tema, masaüstü/mobil navigasyon, DB özeti, okul arama/durum filtresi, okul detayları ve kaydedilebilir kurum adı/resmî unvan/üç marka rengi geliştirildi. Okul giriş ekranı panel/vurgu renklerini de okur; renk önizlemesi ve kontrastlı metin eklendi.
- Server Action/DAL yetki ve origin doğrulaması, sınırlı alan yazımı, Serializable transaction, önce/sonra audit ve revizyon çakışma kontrolü eklendi. Değişiklik olmayan gönderim DB/audit yazmaz; asset anahtarları korunur.
- 42 birim testi, 20 HTTP izolasyon testi, 9 rollback-only DB servis testi, lint/tip/build kontrolleri başarılı. Kullanıcının normal girişiyle panel, detay, arama/filtre, renk önizleme/validasyon ve değişikliksiz form gönderimi tarayıcıda doğrulandı. Mobil 390 px tablo taşması düzeltildi. Gerçek okul ayarı değiştirilen bir browser yazma testi yapılmadı; yazma servisi rollback içinde sınandı.
- [Teslim belgesi](./platform-workspace.md) eklendi. Logo/görsel yükleme ve giriş şablonları açıkça sonraki aşama; kalıcı depolama henüz bağlı değil. Şema/migration, commit/push/deploy yapılmadı. Mevcut dokümantasyon değişiklikleri korundu.

## 2026-09-19 — Legacy açık palet ve ortak UI Kit

- Kullanıcı koyu Süper Admin istemediğini, projede yalnız light mode ve eski projenin varsayılan renklerini istediğini belirtti. Önceki koyu tema kararı geçersiz kılındı.
- Eski backend/app/static/css/base_login.css light değişkenleri ve btn_horizon okundu. #EDF2F9 zemin, #142D55 ana renk, #DCDDE2 ikincil renk, #BB992F vurgu ve durumların zemin/metin/kenarlık üçlüleri globals.css'e taşındı.
- Background bağımsız ama bu aşamada ortak token olarak tutuldu. Okulların kayıtlı üç marka rengi silinmedi; secondary'nin koyu panel boyaması kaldırıldı. Varsayılan paleti önizle düğmesi kaydetmeden deneme sağlar.
- Radix/shadcn ve React rehberleriyle mevcut altyapı korundu; 11 temel UI dosyası eklendi, mevcut button/badge/input ortak renklerle düzenlendi. Platform UI Kit sayfası eklendi; bütün örnekler DB yazımı yapmadan çalışır.
- Agent-browser CLI ortamda bulunmadığından tarayıcı doğrulaması uygulamanın CUA arayüzüyle yapıldı. 1440/390 px, modal odak/escape, tooltip klavye, checkbox/switch/select, onay ve önizleme/reset kontrol edildi. İki okulun yerel girişlerinin açık zeminleri ve bağımsız marka renkleri doğrulandı.
- 46 birim testi, 23 HTTP izolasyon testi, TypeScript, ESLint ve production build başarılı. Kaynak palet ve kontrast regresyon testleri eklendi. DB servis katmanı değişmedi; önceki rollback-only testleri bu dilimde tekrarlanmadı.
- [Tasarım sistemi belgesi](./design-system.md) eklendi. Kalıcı DB yazımı, migration, commit/push/deploy yapılmadı.

## 2026-09-20 — Okul Admin analizi ve faz planı

- Kullanıcı Süper Admin alanını şimdilik yeterli buldu; logo, okul görselleri ve giriş şablonlarını ortak tasarım daha fazla oturana kadar erteledi. Yeni öncelik Okul Admin çalışma alanıdır.
- Eski Flask yönetim kabuğu, sidebar, dashboard, personel/öğretmen, öğrenci/veli, akademik ayarlar, program ve finans şablonları ile ilgili route'lar salt okunur incelendi. Sol menü + sağ içerik alışkanlığı korunurken kişi/hesap/atama kavramlarının karışması, tek büyük öğrenci ekranı, Active/Passive yükü, DataTables/inline JS, programdaki ortak ders engeli ve güvenilir olmayan performans oranının taşınmaması kararlaştırıldı.
- [Okul Admin faz planı](./school-admin-plan.md) oluşturuldu. Toplam `1400px` çalışma alanı, yaklaşık `252px` sidebar, mobil sheet, permission tabanlı menü, ortak tablo standardı ve Next.js route group sınırı belgelendi.
- Geliştirme yöntemi; önce görsel kabuk, sonra veri bağımlılık sırası ve her modülde dikey dilim olarak belirlendi. Sıra: kabuk/tablo temeli → akademik yapı → personel/öğretmen → öğrenci/veli/yaşam döngüsü → atama/program → tarihli ders/yoklama → finans → servis → raporlama/aktarım.
- İlk önerilen uygulama backlog'u yalnız Faz 0'dır; yeni akademik migration içermez. İlk gerçek CRUD Faz 0 kabulünden sonra öğretim yılları ve dönemler olacaktır. Bu turda uygulama kodu, şema, migration veya canlı veri değiştirilmedi; sunucu başlatılmadı.

## 2026-09-20 — İlk Okul Admin oluşturma ve Okul Admin Faz 0 teslimi

- Süper Admin okul detayına yalnız ilk `SCHOOL_ADMIN` hesabını oluşturan ad/soyad, kullanıcı adı, geçici parola ve parola tekrar formu eklendi. İlk yönetici mevcutsa form kaldırılıp güvenli üyelik özeti gösterilir; sonraki kullanıcıların Okul Admin alanından yönetileceği açıkça belirtilir.
- Sunucu akışı platform oturumu ve `platform.admins.invite` permission'ı, Origin/Host, okul UUID'si, ad/kullanıcı adı/parola doğrulaması uygular. User, credential, okul üyeliği, okul kapsamlı rol ataması ve `platform.school_admin.created` audit kaydı tek Serializable transaction'da yazılır. Düz parola veya hash audit'e girmez; aynı okulda ikinci ilk yönetici ve aynı kullanıcı adı reddedilir.
- Geçici `/dashboard`, URL değişmeden `(school-admin)` route group'una taşındı. Toplam `1400px` açık kabuk, `252px` masaüstü sidebar, mobil `Sheet`, permission tabanlı menü, üst çubuk, okul/oturum özeti, çıkış ve kurulum kontrol listesi eklendi. Akademik şema olmadığı için sahte öğrenci/öğretmen sayıları gösterilmedi.
- Ortak `PageHeader`, `DataTableShell`, `Table`, empty state ve Okul Admin loading/error yüzeyleri eklendi. Sonraki modüller hazır olmadığından dead link gösterilmedi; ilk gerçek CRUD olarak öğretim yılı ve dönem planı korundu.
- 50/50 birim testi, TypeScript, ESLint ve production webpack build başarılıdır. İlk yönetici servisinde 6/6 gerçek DB kontrolü transaction sonunda geri alındı; hiçbir test hesabı veya audit kaydı tutulmadı. Turbopack build, ortamın child-process port izni nedeniyle çalışmadı; aynı kaynak webpack production build ile doğrulandı.
- Yerelde `horizonedu.localhost:3000/dashboard` oturumsuz isteğinin doğru HorizonEdu girişine yönlenmesi doğrulandı. Gerçek okul hesabı bilinçli olarak oluşturulmadığı için korumalı kabuğun iki okulda tam oturumlu tarayıcı kabulü, kullanıcı ilk hesapları oluşturduktan sonra açıktır. Şema/migration, canlı okul kaydı, commit/push/deploy yapılmadı.

## 2026-09-21 — İki okul giriş kabulü ve Faz 1 öğretim yılı/dönem CRUD'u

- Kullanıcı iki pilot okulun ilk Okul Admin hesaplarını oluşturdu; her okulda giriş/çıkışı ve HorizonEdu hesabının GjimCamEdu girişinde reddedilmesini doğruladı. Parola ve kullanıcı adları belgelere yazılmadı. Kaynak kimliğiyle çapraz okul okuma/yazma, askıya alma ve eski oturum reddi tam pilot güvenlik kabulünde açık kalır.
- Okul Admin'e `/academics/years` çalışma alanı eklendi. Öğretim yılı ve dönem oluşturma/düzenleme, taslaktan etkinleştirme, kapatma, arşivleme ve geri alma işlemleri; gerçek özetler, seçili yıl bağlamı, responsive tablolar ve erişilebilir Dialog/AlertDialog akışlarıyla tamamlandı.
- `academic_years` ve `academic_terms` eklendi. Okul başına tek aktif yıl, yıl başına tek aktif dönem, dönemlerin yıl sınırında ve çakışmasız olması, çapraz okul FK'si ve izinli durum geçişleri PostgreSQL index/trigger'larıyla korunur. `academics.read/manage` izinleri mevcut `SCHOOL_ADMIN` rollerine bağlandı.
- Bütün okumalar tenant kapsamında; yazmalar permission + Origin/Host kontrolü, Serializable transaction, optimistic revision ve actor/üyelik bağlı append-only audit kullanır. Yeni yılı etkinleştirmek önceki aktif yılı ve aktif dönemini audit ile kapatır; kalıcı silme yoktur.
- `20260921000100_add_academic_calendar` bağlı Neon veritabanına uygulandı. Beş gerçek DB kontrolü rollback ile geçti ve test verisi tutulmadı. 55/55 birim testi, TypeScript, ESLint ve production webpack build başarılıdır. İki okulda yeni route'un oturumsuz yönlendirmesi, doğru marka ve hata katmanı tarayıcıda; route/tenant izolasyonu 25/25 HTTP kontrolüyle doğrulandı. Parola paylaşılmadığı için yeni CRUD'un tam oturumlu tarayıcı yazma kabulü kullanıcıya bırakıldı; geliştirme sunucusu ve `3000` portu kapatıldı.
