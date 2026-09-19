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
