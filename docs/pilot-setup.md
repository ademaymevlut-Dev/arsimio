# Pilot kurulumu ve doğrulama

Tarih: 2026-09-19. Durum: `DEVAM EDİYOR`. Üç domain/marka dilimi yayında; yeni parolalı giriş kodu yerelde doğrulandı, GitHub/Vercel yayını ve gerçek hesap aktivasyonu bekliyor.

## Adresler ve giriş biçimi

| Alan | Canlı adres | Yeni giriş biçimi |
| --- | --- | --- |
| Platform | `arsimio.vercel.app/login` | Süper Admin e-posta + parola |
| HorizonEdu | `horizonedu.vercel.app/login` | Kullanıcı adı + parola |
| GjimCamEdu | `gjimcamedu.vercel.app/login` | Kullanıcı adı + parola |

Üç adres aynı `arsimio` Vercel projesindedir. Okul adresleri kalıcı proje domainidir; başka projeden domain taşınmadı. DB'de iki okul ve iki VERIFIED ana okul domaini vardır. Her okulda SCHOOL_ADMIN, TEACHER, STUDENT, GUARDIAN ve DRIVER rolleri; platformda SUPER_ADMIN rolü bulunur. Henüz gerçek Okul Admin üyeliği veya okul kullanıcıları oluşturulmadı.

Kullanıcının talebiyle mail/SMS ve doğrulama e-postası bağımlılığı kaldırıldı. Önceki Neon Auth origin hatası yeni kodda kullanılan bir servise ait değildir; yeni yayın için Neon Auth Domains ayarı gerekmez. Dış Neon Auth entegrasyonu, `neon_auth` şeması ve eski ortam değişkenleri silinmedi. Neon PostgreSQL kullanılmaya devam ediyor.

## İlk Süper Admin aktivasyonu

Proje sahibi kendi terminalinde:

```bash
cd /Users/mevlutademay/arsimio
pnpm auth:bootstrap
```

Araç hedef hesabı gösterir; sahibi `EVET` yazar ve en az 12 karakterli yeni parolasını iki kez gizli olarak girer. `ARSIMIO_BOOTSTRAP_ADMIN_EMAIL` ile önceden ayrılmış, PENDING ve SUPER_ADMIN rolü mevcut hesap etkinleşir. Aktif hesabın parolasını değiştirmez veya yeni yönetici atamaz. Parola sohbete, `.env` dosyasına veya Git'e konmaz. `/setup` yalnızca bu komutu açıklayan bilgi sayfasıdır.

Yerelde `http://localhost:3000/login` kullanılabilir. Canlıda e-posta/parolayla giriş için yeni kod önce yayımlanmalıdır. Ayrıntılar, güvenlik kuralları ve kurtarma akışının mevcut sınırları [parolalı giriş belgesinde](./password-auth.md).

Bu çalışma sırasında gerçek parola oluşturulmadı; DB incelemesi iki okul, bir PENDING kullanıcı, sıfır parola hesabı ve sıfır aktif oturum gösterdi. Başarılı gerçek kullanıcı giriş/çıkış kabulü henüz yapılmadı.

## Güvenlik ve ortam sınırları

- Hostname tam eşleşmeyle çözülür; bilinmeyen host, doğrulanmamış/devre dışı domain veya aktif olmayan okul kabul edilmez.
- Kullanıcıdan gelen okul/forwarded-host header'ları tenant yetkisi vermez. Sunucu her istekte tenant ve session'ı kontrol eder.
- Platform paneli yalnız platform hostname'inde açılır. Süper Admin rolü okul üyeliğinin yerine geçmez.
- Okul paneli aktif kullanıcı, aktif okul üyeliği ve aynı okul kapsamında permission gerektirir. Okul girişinde e-posta istenmez.
- Cookie ortak domain taşımaz; session hostname ve okul üyeliğine bağlıdır. Oturumlu sayfalar ortak cache'e yazılmaz.
- Scrypt hash, rastgele DB session, hesap/okul bazlı rate limit, origin kontrolü ve giriş/çıkış audit'i uygulanmıştır. Açık signup/auth proxy endpoint'i yoktur.
- Development/preview/production başlangıçta aynı DB bağlantısını kullanıyor. Ayrı cookie, DB izolasyonu sağlamaz. Gerçek öğrenci/veli verisi öncesi branch ayrımı, kısıtlı runtime rolü, RLS ve uçtan uca tenant testleri tamamlanmalıdır.

Runtime için `DATABASE_URL`; migration için mevcut unpooled bağlantı değişkeni kullanılır. İlk kurulum/seed için `ARSIMIO_BOOTSTRAP_ADMIN_EMAIL` gerekir. Yeni kod `NEON_AUTH_BASE_URL` veya `NEON_AUTH_COOKIE_SECRET` kullanmaz; bunların varlığı yeni parolalı girişi etkilemez.

Yerel alias'lar yalnız development modunda:

- `http://localhost:3000` — platform
- `http://horizonedu.localhost:3000` — HorizonEdu
- `http://gjimcamedu.localhost:3000` — GjimCamEdu

Genel preview hostname'leri otomatik platform yetkisi almaz. Preview erişim stratejisi ortam ayrımıyla birlikte tamamlanacaktır.

## Komutlar

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm dev

pnpm db:seed:pilot          # Dry-run; yazmaz
pnpm db:seed:pilot --apply  # Yalnız operatör hedef kontrolünden sonra
pnpm test
pnpm lint
pnpm build
pnpm db:validate
pnpm db:status
pnpm db:verify             # Kontrollü DB; fixture'lar rollback edilir
pnpm db:verify:auth        # Kontrollü DB; fixture'lar rollback edilir
node scripts/inspect-pilot.mjs
node scripts/verify-pilot-http.mjs               # Yerel sunucu açıkken
node scripts/verify-pilot-http.mjs --production  # Yeni kod yayımlandıktan sonra
```

Seed Arsimio Vercel proje/team bağlantısını, domain sahipliği ve HTTPS'i kontrol eder. Transaction/advisory lock kullanır; var olan okul ayarını veya iptal edilmiş permission'ları tekrar yazmaz, mevcut kullanıcıya sessizce platform rolü vermez. Kopya okul/hesap oluşturmaz ve build/deploy sırasında çalışmaz. İlk hesap parolası seed'in parçası değildir.

### Vercel build ve Prisma Client

`pnpm build`, önce `prisma generate`, sonra `next build` çalıştırır. `src/generated/prisma` Git'e eklenmez; her build'de güncel şemadan üretilir. `postinstall` yerel kurulum kolaylığı için korunur, fakat bağımlılık cache'i kullanılan deployment'larda buna güvenilmez. Build migration/seed çalıştırmaz ve DB verisi değiştirmez.

`22f2deb` deployment'ında install cache nedeniyle client üretilmedi; build yalnız `next build` çağırdığı için import bulunamadı. Açık generate adımı bu hatayı çözer; generated dosyaları commit etmek veya her yayında cache temizlemek gerekmez. [Prisma'nın Vercel cache açıklaması](https://docs.prisma.io/docs/orm/v7/more/troubleshooting/nextjs).

## Kontrol kaydı

| Kontrol | Yeni parolalı giriş sonucu |
| --- | --- |
| Birim test | 36 geçti |
| Çekirdek DB bütünlüğü | 36 geçti; fixture'lar rollback |
| Auth DB testleri | Migration öncesi 18 prova, uygulama sonrası 17 geçti; fixture'lar rollback |
| Migration | İki migration uygulandı; güncel |
| Prisma validate / TypeScript / lint / build | Geçti |
| Yerel HTTP | 14 geçti; form türü, yetkisiz panel, bilinmeyen host/header sahteciliği |
| Yerel tarayıcı | Platform e-posta, iki okul username; hatalı okul girişinde genel hata, console error yok |
| Gerçek hesap / yeni production oturumu | Bekliyor; parola belirlenmedi, yeni kod gönderilmedi |

Tarayıcıda hatalı giriş testi yalnız var olmayan test kullanıcı adıyla yapıldı; hesap veya oturum oluşturulmadı. DB testleri gerçek browser/production oturum testinin yerine geçmez.

Sıradaki işler: gerçek Süper Admin aktivasyonu/yayın kabulü, kullanıcı adıyla Okul Admin oluşturma, okul/üyelik/rol yönetim ekranları, parola değişimi/kurtarma, logo yükleme, audit okuma, arşivleme/geri alma, ortam ayrımı ve kısıtlı DB/RLS, gerçek özel domain/Safari provası. Mail/SMS ve MFA sonraki güvenlik dilimidir.

## Önceki yayın kaydı

- İlk CLI deployment: `dpl_HRdYztjygGPubEDP5oThsu6N6DQE`, 2026-09-19, READY, Next.js 16.3.5. [Vercel inceleme](https://vercel.com/ademaymevlut-4764s-projects/arsimio/HRdYztjygGPubEDP5oThsu6N6DQE).
- O sürümde canlı 13 HTTP kontrolü geçti; negatif auth POST'unda Neon origin hatası bulundu. Bunlar eski sağlayıcı akışına ait tarihsel sonuçlardır, yeni girişin canlı kanıtı değildir.
- Kullanıcı sonrasında Prisma build düzeltmesini gönderdiğini, deployment ve üç domainin çalıştığını bildirdi.
- GitHub deposu `ademaymevlut-Dev/arsimio`, production dalı `main`. Yeni giriş için bu çalışmada commit/push/deploy yapılmadı; kullanıcı kendi terminalinden gönderecek.
- Varsayılan Git'in Xcode lisans sorunu için zaten kurulu `/Library/Developer/CommandLineTools/usr/bin/git` kullanılabilir; lisans veya global ayar değiştirilmedi.
- Önceki production hata taraması boştu; log drain/harici alarm henüz kurulmadı. Sonraki yayında commit/READY eşleşmesi ve üç domain yeniden sınanmalıdır.
