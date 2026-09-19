# Pilot kurulumu ve doğrulama

Tarih: 2026-09-19. Durum: `DEVAM EDİYOR` — ilk dilim production'da, tam pilot kabulü açık.

## Canlı adresler

| Alan | Adres | Durum |
| --- | --- | --- |
| Platform | https://arsimio.vercel.app | Giriş ve kontrollü ilk hesap kurulumu |
| HorizonEdu | https://horizonedu.vercel.app | Mavi okul markası ve ayrı giriş |
| GjimCamEdu | https://gjimcamedu.vercel.app | Yeşil okul markası ve ayrı giriş |

Üç adres aynı `arsimio` Vercel projesindedir. Okul adresleri kalıcı proje domaini olarak eklendi; başka projeden domain taşınmadı. Veritabanında iki okul ve iki doğrulanmış ana okul domaini vardır. Her okulda SCHOOL_ADMIN, TEACHER, STUDENT, GUARDIAN ve DRIVER rolleri; platformda ayrı SUPER_ADMIN rolü bulunur. Henüz Okul Admin üyeliği veya gerçek okul kullanıcıları oluşturulmadı.

## Giriş için mevcut engel

İlk deployment sonrasında Neon Auth `trusted_origins` listesi boş kaldı. Üç origin için oturumsuz GET isteği 200/null dönse de negatif POST giriş denemesi `403 INVALID_ORIGIN` verdi. Dolayısıyla sayfaların açılması, girişin tamamlandığı anlamına gelmez.

Yalnızca yukarıdaki üç HTTPS origin'in `neon-arsimio → Settings → Auth → Domains` listesine eklenmesi gerekir. Güvenlik ayarı değişikliği için kullanıcı onayı istendi; henüz uygulanmadı. Wildcard veya başka proje adresi eklenmeyecek. Sonrasında negatif giriş isteğinin origin kontrolünü geçip yanlış kimlik bilgisi yanıtı vermesi ve gerçek hesapla pozitif giriş ayrıca sınanmalıdır.

## İlk Süper Admin aktivasyonu

Origin engeli giderildikten sonra hesap sahibi şu adımları kendisi tamamlar:

1. https://arsimio.vercel.app/setup adresini açar.
2. Onayladığı e-posta adresiyle, yalnız Arsimio için yeni ve en az 12 karakterli parola belirler. GitHub/Vercel parolası kullanılmaz; parola sohbet veya belgeye yazılmaz.
3. Neon'un gönderdiği e-posta doğrulama bağlantısını açar.
4. https://arsimio.vercel.app/login üzerinden giriş yapar.
5. Doğrulanmış provider kimliği, önceden ayrılmış PENDING uygulama hesabına atomik olarak bağlanır; aktivasyon audit kaydıyla birlikte tamamlanır.

Adres `ARSIMIO_BOOTSTRAP_ADMIN_EMAIL` ortam değişkenindedir. Sırf kayıt olmak, aynı e-postayı forma yazmak veya ilk kullanıcı olmak yetki vermez. Normal kullanıcılar yalnız immutable provider kimliğiyle eşleşir. İlk hesap aktivasyonundan sonra bootstrap ortam değişkeninin kaldırılması operasyon adımıdır; mevcut ACTIVE hesap yeniden bootstrap edilmez.

Provider hesabı/gerçek oturum henüz oluşturulmadığından başarılı giriş, e-posta teslimi, çıkış ve eski oturum iptali kabul testleri açık. Hesap oluşturulup doğrulama e-postası alınamazsa yeniden gönderme/parola kurtarma akışı tamamlanmadan ikinci bir hesap oluşturulmaz.

## Güvenlik sınırları

- Hostname tam eşleşmeyle çözülür; bilinmeyen host, doğrulanmamış/devre dışı domain veya aktif olmayan okul kabul edilmez.
- Kullanıcı tarafından gönderilen okul/forwarded-host header'ları tenant yetkisi vermez. Next.js sunucu katmanı tenant'ı yeniden çözer; proxy tek güvenlik katmanı değildir.
- Platform paneli yalnız ana platform hostname'inde açılır. Süper Admin rolü okul üyeliğinin yerine geçmez.
- Okul paneli aktif kullanıcı, doğrulanmış e-posta, aktif okul üyeliği, aynı okul kapsamındaki rol ve permission gerektirir.
- Oturum cookie'sinde ortak domain tanımlanmaz. Her hostname'in cookie'si ayrıdır; domainler arası otomatik SSO yoktur.
- Auth Route Handler yalnız GET `verify-email` akışını açar; genel admin/organization/kayıt API proxy'si sunulmaz. Neon'un kendi public kayıt endpoint'inde oluşan bir hesap Arsimio yetkisi kazanmaz.
- Okul marka/context verisi istek içi memoization kullanır; oturumlu sayfalar paylaşılan cache'e yazılmaz.
- Neon Auth'un provider düzeyinde e-posta doğrulama zorunluluğu kapalı olsa da Arsimio, `emailVerified` olmayan kullanıcıyı kabul etmez.

Auth SDK `@neondatabase/auth@0.5.0-beta` sabit sürümündedir. `getSession` sorgusunda beta SDK'nın tip/runtime farkı için belgeli literal `"true"` uyarlaması vardır; sürüm yükseltilince cache iptal davranışı yeniden test edilmelidir.

## Ortamlar ve yerel çalışma

Gerekli değişkenler: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`; ilk kurulum/seed için ayrıca `ARSIMIO_BOOTSTRAP_ADMIN_EMAIL`. Migration komutları mevcut unpooled bağlantı değişkenini kullanır. Cookie sırları development/preview/production için ayrı oluşturuldu; hiçbir değer belgeye yazılmaz.

Önemli: Arsimio'nun başlangıç entegrasyonunda development/preview/production aynı DB/Auth bağlantısını kullanıyor. Ayrı branch izolasyonu kurulmuş kabul edilmez. Ayrı cookie sırrı, DB izolasyonu sağlamaz. Gerçek öğrenci/veli verisi alınmadan önce ortam ayrımı, kısıtlı runtime DB rolü, PostgreSQL RLS ve oturumlu tenant izolasyon testleri tamamlanmalıdır.

Yerel adresler:

- http://localhost:3000 — platform
- http://horizonedu.localhost:3000 — HorizonEdu
- http://gjimcamedu.localhost:3000 — GjimCamEdu

Yerel alias'lar yalnız development modunda çalışır. Genel preview deployment hostname'leri otomatik platform yetkisi almaz; preview stratejisi sonraki ortam ayrımı işinin parçasıdır.

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm dev
```

## Seed ve test komutları

```bash
pnpm db:seed:pilot          # Dry-run; yazma yapmaz
pnpm db:seed:pilot --apply  # Yalnız operatör kontrolüyle, hedef DB doğrulandıktan sonra
pnpm test
pnpm lint
pnpm build
pnpm db:validate
pnpm db:verify             # Kontrollü DB'de; geçici fixture'lar transaction sonunda rollback edilir
node scripts/verify-pilot-http.mjs
node scripts/verify-pilot-http.mjs --production
node scripts/inspect-pilot.mjs
node scripts/probe-auth.mjs --login
```

Seed, Arsimio'nun Vercel proje/team bağlantısını kontrol eder. Domain eklemeden önce Vercel sahipliği, doğrulanmış bağlantı ve HTTPS erişimini sınar. Tek transaction/advisory lock ile çalışır; var olan okul ayarını veya iptal edilmiş permission'ları yeniden yazmaz, var olan kullanıcıya sessizce platform rolü vermez. Tekrar çalıştırılması ikinci okul/hesap kopyaları üretmez. Build/postinstall/deploy sırasında otomatik çalıştırılmaz.

`scripts/setup-auth-env.mjs` ilk kurulum için operatör aracıdır; tamamlanmıştır, rutin olarak yeniden çalıştırılmaz. Cookie sırrı rotasyonu ayrıca planlanır.

## Kanıtlananlar ve açık kabul işleri

| Kontrol | Sonuç |
| --- | --- |
| Unit test | 30 geçti: hostname, domain/okul durumu, rol/kaynak tenant sınırı |
| DB bütünlüğü | 36 kontrol geçti, test verileri rollback edildi |
| Lint / TypeScript / Prisma validate | Geçti |
| Yerel production build ve Vercel build | Geçti |
| Seed tekrarı | İki çalıştırmadan sonra 2 okul, 1 PENDING uygulama kullanıcısı, 0 auth kullanıcısı |
| Yerel HTTP | 14 geçti; bilinmeyen host/header sahteciliği de sınandı |
| Canlı HTTP | 13 geçti; üç giriş adresi, yetkisiz panel yönlendirmeleri, okulda platform/setup/admin API reddi |
| Yerel tarayıcı | İki markalı giriş ve dar ekran formu görüldü |
| Neon origin POST | Başarısız: üç adres için INVALID_ORIGIN; ayar onayı bekliyor |
| Production hata taraması | `vercel logs --level error --since 1h` sonuç bulmadı; tam oturumlu akışın hatasızlık kanıtı değildir |

Henüz tamamlanmayanlar: gerçek Süper Admin aktivasyonu, Okul Admin davetleri/üyelik bağlama, e-posta tekrar gönderme/parola kurtarma, okul oluşturma/ayar değiştirme ekranları, logo yükleme, audit okuma ekranı, arşivleme/geri alma, ortam branch ayrımı, RLS/kısıtlı rol, iki gerçek test oturumuyla çapraz okul okuma/yazma reddi, özel kök domain ve Safari oturum provası.

## Yayın kaydı

- Production: **READY**, 2026-09-19, Next.js 16.3.5.
- Deployment: `dpl_HRdYztjygGPubEDP5oThsu6N6DQE`.
- [Vercel inceleme](https://vercel.com/ademaymevlut-4764s-projects/arsimio/HRdYztjygGPubEDP5oThsu6N6DQE).
- Vercel build yaklaşık bir dakika sürdü; CLI kaynak deployment'ı kullanıldı.
- İlk CLI yayını sırasında varsayılan `/usr/bin/git`, Xcode lisansı nedeniyle çalışmadı. Sonraki kontrolde bilgisayarda zaten kurulu `/Library/Developer/CommandLineTools/usr/bin/git` doğrulandı; lisans veya sistem ayarı değiştirilmeden bu Git ile commit/push yapılabilir.
- GitHub deposu `ademaymevlut-Dev/arsimio`, Vercel production dalı `main` olarak doğrulandı. Git üzerinden yayında, yalnız push başarısı değil aynı commit'in Vercel'de READY olması da kontrol edilir. Manuel CLI deployment'ı otomatik Git deployment'ının kanıtı sayılmaz.
- Log drain/harici hata alarmı bu dilimde kurulmadı; izleme eksikliği açık iş olarak kalır.

Kaynak: [Neon Auth Vercel entegrasyonu](https://neon.com/blog/auth-that-just-works-in-vercel-previews), otomatik güvenilir domain özelliğini anlatır; bu projede ilk CLI deployment'ı sonrası origin listesinin boş kaldığı ayrıca ölçüldü. Dokümandaki genel davranış, mevcut proje ayarının kanıtı yerine kullanılmadı.
