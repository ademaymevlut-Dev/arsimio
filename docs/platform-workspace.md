# Süper Admin çalışma alanı — İlk teslim

Tarih: 2026-09-19. Durum: yerelde uygulandı ve aşağıdaki sınırlar içinde doğrulandı; bu değişiklikler henüz yayımlanmadı.

## Kapsam

- `/platform`: ortak açık tema, masaüstü yan menü/mobil üst menü, veritabanından okul/domain/renk paleti sayımları. İlk koyu tasarım kullanıcının isteğiyle kaldırıldı.
- `/platform/schools`: okul adı veya domain araması, durum filtresi, boş sonuç durumu, okul detayına erişim.
- `/platform/schools/[schoolId]`: okul adı/resmî kurum adı düzenleme; domain ve durum bilgisi; ana renk, ikincil renk ve vurgu rengini önizleme/kaydetme.
- `/platform/schools/[schoolId]`: ayrıca yalnız okulun ilk yöneticisini kullanıcı adı ve geçici parolayla oluşturma. İlk yönetici varsa form yerine güvenli hesap özeti görünür; sonraki kullanıcılar bu alandan oluşturulmaz.
- Giriş ekranı okulun üç marka rengini okur. Buton ve küçük marka detaylarının yazısı kontrasta göre seçilir. Arka plan ayrı, ortak açık token'dır; secondary bütün paneli boyamaz. Süper Admin ve durum renkleri okul renklerinden bağımsızdır.
- `/platform/ui`: ortak renkler ve etkileşimli bileşen örnekleri. [Açık tema/UI Kit teslimi ve güncel testler](./design-system.md).
- Mevcut iki okul veritabanında doğrulandı: HorizonEdu (`horizonedu.vercel.app`) ve GjimCamEdu (`gjimcamedu.vercel.app`), ikisi de ACTIVE, domainleri VERIFIED. Yeniden seed çalıştırılmadı; okul/domain çoğaltılmadı.

Bu aşama yeni okul oluşturma veya domain değiştirme ekranı değildir. İlk yönetici tanımlama yerelde tamamlandı; yeni okul açılışı, sonraki okul kullanıcılarının yönetimi, anlaşmalar ve ödemeler ayrı teslimlerdir.

## Marka yönetiminde sınırlar

Mevcut `school_branding` alanları kullanılır; migration gerekmez. Renk güncellemesi `logo_asset_key` / `icon_asset_key` alanlarına dokunmaz. İki okulda da logo kaydı bulunmadı.

Logo yükleme, favicon, okul/kapak görselleri ve giriş şablonu seçimi **sonraki aşamadır**; UI bunu açıkça belirtir, çalışmayan yükleme butonu göstermez. Kalıcı depolama henüz bağlanmadı. Vercel uygulamasının geçici dosya sistemine yükleme yapılmaz. Okulun herkese açık tanıtım sitesi ile giriş şablonu ayrı kapsamda ele alınacak.

## Güvenlik ve veri davranışı

- Okuma, layout ve her Server Action kendi platform hostname/oturum/permission kontrolünü yapar. Layout kontrolüne tek başına güvenilmez.
- Bilgiler için `platform.schools.update`, renkler için `platform.branding.update` gerekir. Formlar okuma yetkisi olsa bile düzenleme yetkisi yoksa salt okunur kalır.
- Origin/host, UUID, revizyon, metin uzunluğu ve HEX renk doğrulaması sunucuda tekrar yapılır. İstemciden gelen status, slug veya asset alanları yazılmaz.
- Değişiklik ve önce/sonra audit verisi aynı Serializable transaction içinde tutulur. Gerçek değişen alanlar kaydedilir.
- `updatedAt` revizyonu eskiyse başka ekrandaki kayıt ezilmez; kullanıcıdan yenileme istenir. Aynı bilgilerin tekrar gönderilmesi update/audit üretmez.
- Arşivlenmiş veya bulunamayan okul değiştirilemez. Marka kaydı yoksa yalnız o okul için oluşturulur.
- DTO'lar istemciye parola, session veya bütün kullanıcı/DB kayıtlarını taşımaz. Tenant bağlamı request-local kalır.
- Renk önizlemesi kaydetmeden önce yalnız tarayıcıda değişir. Kaydedilmiş okul renkleri, okul giriş ekranının sonraki isteğinde DB'den okunur.
- İlk yönetici yazımı ayrıca `platform.admins.invite` ister. Ad/soyad/kullanıcı adı/parola sunucuda doğrulanır; parola hash'i transaction öncesinde üretilir ve düz parola hiçbir audit veya yanıta yazılmaz.
- User, credential, okul üyeliği, `SCHOOL_ADMIN` rol ataması ve `platform.school_admin.created` audit kaydı tek Serializable transaction içindedir. Aynı okul için ikinci ilk yönetici ve okul içi aynı kullanıcı adı reddedilir.

## İlk teslim doğrulama kaydı

Aşağıdaki sayımlar ilk çalışma alanı teslimine aittir. Sonraki açık tema/UI Kit
tesliminde 46 birim ve 23 HTTP testi geçti; güncel kapsam tasarım sistemi belgesindedir.

| Kontrol | Sonuç / sınır |
| --- | --- |
| Birim testleri | `pnpm test`: 42/42; 6 yeni renk/profil/revizyon testi dahil. |
| Tip/lint/build | TypeScript, ESLint ve production build başarılı. |
| HTTP izolasyonu | `node scripts/verify-pilot-http.mjs`: 20/20; yeni okul listesi/detayı oturumsuz platformda girişe yönlenir, okul domainlerinde 404 olur. |
| Gerçek DB servis testi | `pnpm db:verify:platform`: 9/9; profil yazımı, no-op, eski revizyon, branding oluşturma/güncelleme, asset koruma, diğer okul izolasyonu, audit ve arşiv engeli. Tümü rollback-only; test kayıtları tutulmaz. |
| Oturumlu tarayıcı | Kullanıcının normal Süper Admin girişiyle ana ekran ve okul detayları açıldı. Arama, filtre, boş sonuç, reset, canlı renk önizlemesi ve geçersiz renk için kaydetme engeli doğrulandı. |
| Browser → action → DB → UI | Mevcut okul bilgileri değiştirilmeden gönderildi; sunucunun “Değişiklik bulunmadı” yanıtı UI'da görüldü. Gerçek değişiklik yazımı yukarıdaki rollback-only servis testinde doğrulandı; canlı marka değişimi yapılmadı. |
| Responsive | Masaüstü ve 390 px mobil kontrolü; mobil tablo taşması düzeltildi, belge genişliği 390 px. Tablo kendi bölgesinde yatay kaydırılır. Tarayıcı hata günlüğünde hata yok. |

Yerel geliştirme sunucusu ortak başlangıç DB bağlantısını kullanır. Panelden gerçek bir ayar kaydedilirse veritabanına kalıcı yazılır; deployment yapılmamış olması DB'yi test ortamına dönüştürmez. Development/preview/production DB ayrımı ayrı açık iştir.

Bu kontroller, henüz oluşturulmamış okul kullanıcılarıyla tam oturumlu izolasyon kabulünün veya canlı deployment kontrolünün yerine geçmez. Bu teslimde commit/push/deploy veya şema değişikliği yapılmadı.

İlk yönetici genişletmesinde toplam 50/50 birim testi ve 6/6 rollback-only DB servis kontrolü geçti. TypeScript, ESLint ve production webpack build başarılıdır. Doğrulama transaction'ları geri alındı; gerçek Okul Admin hesabı oluşturulmadı. Yerel okul hostname'i doğru markalı girişe yönlendi; korumalı Okul Admin kabuğunun tam oturumlu tarayıcı kabulü, kullanıcı ilk hesapları oluşturduktan sonra yapılacaktır.

Son build tekrarında Turbopack önbelleğinde port izni hatası kaldı. Yalnız üretilmiş `.next/cache/turbopack` önbelleği geçici klasöre taşındı; temiz önbellekle aynı `pnpm build` başarıyla tamamlandı. Bundler veya uygulama ayarları değiştirilmedi.

## Sonraki dilim

1. Kullanıcı, iki okul için ilk Okul Admin hesaplarını Süper Admin okul detayından oluşturur; parolalar dokümana veya sohbete yazılmaz.
2. Hesaplarla iki hostname'de giriş/çıkış, oturum ve okul izolasyonu kabul edilir.
3. Ürün sırasına göre Okul Admin Faz 1 öğretim yılı/dönem CRUD'una geçilir.
4. Logo/ikon/kapak ve giriş şablonu yönetimi, ortak tasarım yeterince oturduğunda ayrı marka dilimi olarak ele alınır.
