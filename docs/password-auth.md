# Parolalı giriş — güncel karar ve işletim

Tarih: 2026-09-19. Kod, migration ve yerel kontroller tamamlandı; bu değişiklik henüz GitHub/Vercel'e gönderilmedi. Gerçek hesap aktivasyonu ve canlı oturum kabulü bekliyor.

## Kim nasıl giriş yapar?

| Kullanıcı | Giriş adresi | Kimlik bilgisi |
| --- | --- | --- |
| Süper Admin | `arsimio.vercel.app/login` | E-posta + parola |
| Okul Admin, öğretmen, öğrenci, veli, şoför | Kendi okulunun `/login` adresi | Kullanıcı adı + parola |

Giriş türü ve okul sunucuda hostname üzerinden belirlenir; formdan gelen rol veya okul kimliğine güvenilmez. Platform girişi önceden atanmış SUPER_ADMIN rolü, okul girişi aktif okul üyeliği gerektirir. Giriş yapmak iş modüllerinin permission kontrollerini kaldırmaz.

Kullanıcı adı `school_memberships.username` alanındadır. Okul içinde benzersiz, farklı okullar arasında tekrar edebilir. Baş/son boşluklar kaldırılır ve küçük harfe çevrilir; 3–64 karakter, ilk karakter harf/rakam, devamı ASCII harf/rakam/nokta/alt çizgi/tiredir. Okul hesabında e-posta zorunlu değildir; sahte e-posta üretilmez. Geçiş nedeniyle username nullable, fakat kullanıcı adı olmayan üyelik bu yöntemle giriş yapamaz.

Küresel `User` kimliği korunur: aynı kişi iki okulda farklı kullanıcı adı/rol kullanabilir, fakat **tek küresel hesabın parolası ortaktır**. Ayrı kişilerin aynı kullanıcı adını kullanması hesapları birleştirmez. E-posta eşitliğiyle otomatik hesap birleştirilmez. Eski provider identity kolonları uyumluluk için korunur; yeni girişte kullanılmaz.

## Şimdiki güvenlik temeli

- Parolalar Node.js `crypto.scrypt` ile rastgele salt kullanılarak hash edilir (`N=32768`, `r=8`, `p=3`). Salt ve parametreler hash kaydında tutulur; düz parola saklanmaz. 12–128 karakter; boşluklar korunur, parola kısaltılmaz. Parametre seçimi [OWASP parola saklama rehberindeki](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) scrypt seçeneklerinden biridir.
- Bilinmeyen veya aktif olmayan hesapta da aynı maliyetli hash kontrolü yapılır; genel hata mesajı hesap varlığını açıklamaz.
- Hesap/okul kapsamındaki giriş denemeleri DB'de atomik olarak sınırlandırılır: 15 dakikada 10 deneme. Başarılı denemeler de sayılır. Aynı okulun alias'ları ve ayrı sunucu örnekleri ortak sayacı kullanır. IP/cihaz/WAF katmanı henüz yoktur.
- Oturum token'ı 256 bit rastgeledir; DB'de yalnız token'ın SHA-256 özeti bulunur. Bu hızlı hash **parolalar için kullanılmaz**.
- Oturum 8 saatlik sabit süreyle hostname, kullanıcı, okul/üyelik ve parola sürümüne bağlanır. Başka okul veya alias aynı token'ı kabul etmez. Domainler arası otomatik SSO yoktur.
- Cookie: `HttpOnly`, `SameSite=Lax`, production'da `Secure` ve `__Host-` öneki; `Path=/`, ortak `Domain` yok. Development cookie adı ayrıdır.
- Her istekte kullanıcı/okul/üyelik durumu, iptal/süre sonu ve credential sürümü DB'den doğrulanır. Rol ve permission ayrıca güncel olarak kontrol edilir.
- Girişte önceki host oturumu yenilenir; çıkış DB oturumunu iptal eder ve cookie'yi temizler. Giriş/çıkış ve ilk aktivasyon audit kayıtları aynı transaction içinde yazılır. Parola, hash veya token audit'e yazılmaz.
- Next.js Server Action korumasına ek olarak Origin/Host eşleşmesi kontrol edilir; production HTTPS gerektirir. Yönlendirmeler sabit uygulama yollarıdır.

Mail, SMS ve e-posta doğrulaması bu geliştirme diliminin parçası değildir. Neon Auth SDK/proxy ve kullanılmayan kurulum script'leri kaldırıldı; **Neon PostgreSQL bağlantısı korunuyor**. Dış servisteki `neon_auth` şeması, entegrasyon ve eski ortam değişkenleri silinmedi. Eski trusted-origin ayarı yeni kod yayımlandığında giriş bağımlılığı olmaktan çıkar.

## İlk Süper Admin parolasını belirleme

Yalnız proje sahibi kendi terminalinde çalıştırır:

```bash
cd /Users/mevlutademay/arsimio
pnpm auth:bootstrap
```

1. Araç `.vercel/project.json` Arsimio proje kimliğini, DB bağlantısını ve `ARSIMIO_BOOTSTRAP_ADMIN_EMAIL` ile ayrılmış PENDING hesabı kontrol eder. Hedef e-posta ve DB hostname'i gösterilir; bağlantı sırrı gösterilmez.
2. Sahibi doğru hedefi gördükten sonra `EVET` yazar, yeni ve en az 12 karakterli parolayı iki kez girer. Parola terminalde görünmez; komut argümanı/env/pipe ile kabul edilmez. GitHub/Vercel parolası tekrar kullanılmaz.
3. PENDING, arşivlenmemiş, provider'a bağlanmamış ve önceden SUPER_ADMIN rolü ayrılmış hesap; credential ve audit ile tek transaction'da ACTIVE olur. Araç yeni yönetici atamaz; etkin hesabın parolasını sıfırlamaz ve tekrar çalıştırılarak yetki geri vermez.
4. Yeni kod Vercel'e gönderildikten sonra ana domainin `/login` sayfasında e-posta + parola ile giriş/çıkış sınanır. Yayından önce yerelde `http://localhost:3000/login` kullanılabilir.

`/setup` yalnız bu komutu açıklayan bir bilgi sayfasıdır; internetten hesap/parola oluşturmaz. Parola sohbete, Git'e, dokümana veya `.env` dosyasına yazılmaz. Bu geliştirme sırasında gerçek parola belirlenmedi; test kimlikleri transaction sonunda geri alındı. Henüz okul kullanıcıları yoktur; kullanıcı adı/parola ve rol atayan yetkili yönetim ekranı sıradaki iştir.

## Veri ve kontroller

`20260919000200_password_auth` migration'ı uygulandı: `users.email` nullable, üyelikte okul kapsamında benzersiz username; yeni `user_credentials`, `auth_sessions`, `auth_throttles` tabloları. Mevcut okul/domain/rol kayıtları korundu. Oturumun kullanıcı/üyelik/okul eşleşmesi bileşik FK ile de korunur.

```bash
pnpm test                 # 36 birim testi
pnpm db:verify            # 36 çekirdek DB kontrolü; rollback
pnpm db:verify:auth       # 17 auth DB kontrolü; rollback
pnpm db:status
pnpm lint
pnpm build
node scripts/inspect-pilot.mjs
node scripts/verify-pilot-http.mjs  # Yerel sunucu çalışırken
```

DB testleri kullanıcı adı/okul ayrımı, parola doğrulama, oturum süresi/iptali/rotasyonu, diğer hostname/okul reddi, askıya alınmış hesap/okul/üyelik, credential sürüm değişimi, rate limit, bir defalık bootstrap, audit sır filtresi ve kısıtları kapsar. Migration öncesindeki `--preview-migration` provası 18 kontrolle geri alındı; uygulanmış DB'de bu seçenek tekrar kullanılmaz. Yerel HTTP ve tarayıcı kontrolleri gerçek Süper Admin ile canlı başarılı giriş testi yerine geçmez.

## Sonraki adımlar ve sınırlar

- Süper Admin'in ilk parolasını belirlemesi ve yeni yayında giriş/çıkış kabulü.
- Yetkili okul kullanıcı oluşturma, üyelik/rol yönetimi; ardından iki gerçek test hesabıyla uçtan uca izolasyon testi.
- Parola değiştirme/sıfırlama akışı: credential sürümü artırılmalı ve mevcut oturumlar geçersizleşmelidir. Henüz public kurtarma endpoint'i yoktur.
- Gerçek öğrenci/veli verisi öncesi development/preview/production DB branch ayrımı, kısıtlı runtime rolü, RLS ve iş modülü bazlı yetki testleri.
- Canlı kullanıma hazırlıkta IP/WAF katmanı, çok faktörlü doğrulama, oturum yönetimi ve süresi dolmuş session/throttle kayıtlarının kontrollü temizliği. Mail/SMS daha sonra ayrıca planlanır; temel parola/oturum/tenant kontrolleri ertelenmedi.

Başlangıç ortamları hâlâ ortak DB bağlantısını kullanıyor. Cookie ayrımı veri ortamı ayrımı değildir; bu uygulama dilimi tüm production güvenlik kabulünün tamamlandığı anlamına gelmez.
