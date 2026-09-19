# Teknik mimari

## Başlangıç mimarisi

İlk sürümde tek bir Next.js uygulaması ve tek bir Neon PostgreSQL veritabanı kullanılacaktır. Uygulama Vercel üzerinde çalışacak; okullar ortak uygulamayı kendi alt alan adları veya doğrulanmış özel alan adları üzerinden kullanacaktır.

```text
Okul alan adı
      |
      v
Hostname çözümleme
      |
      v
Tenant bağlamı + oturum
      |
      v
Yetki kontrolü
      |
      v
Tenant filtreli veri erişimi
      |
      v
Neon PostgreSQL + denetim kaydı
```

## Tenant çözümleme

- Her okulun değişmeyen bir iç kimliği (`school_id`) vardır.
- Okula varsayılan olarak `{slug}.arsimio...` biçiminde bir alan adı atanabilir.
- Bir okul bir veya daha fazla doğrulanmış özel alan adına sahip olabilir.
- Gelen isteğin hostname değeri `school_domains` üzerinden okula çevrilir.
- İlk uygulamada `src/server/tenancy/context.ts` hostname'i sunucuda çözer; `src/proxy.ts` yoktur. İleride eklenirse yalnızca erken yönlendirme gibi ağ katmanı işleri üstlenir.
- Nihai kimlik doğrulama ve yetkilendirme Server Action, Route Handler veya veri erişim katmanında yeniden yapılır.
- Host header tek başına güvenilir tenant kanıtı değildir; alan adının doğrulanmış ve aktif olması gerekir.

## Uygulama katmanları

```text
src/
├── app/                  # App Router sayfaları, layout'lar ve route handler'lar
├── components/           # Paylaşılan uygulama bileşenleri
│   └── ui/               # shadcn/ui temel bileşenleri
├── features/             # İş alanına göre ekran, action ve şema bileşimi
├── server/
│   ├── auth/             # Oturum ve kullanıcı eşleme
│   ├── tenancy/          # Hostname -> school bağlamı
│   ├── authorization/    # Rol ve permission değerlendirme
│   ├── db/               # Prisma veri erişimi ve tenant kapsamlı sorgular
│   └── audit/            # Denetim olayı üretimi
└── lib/                  # Framework bağımsız ortak yardımcılar
prisma/
└── schema.prisma         # PostgreSQL şeması ve ilişkilerin ana kaynağı
```

Bu dizin yapısı hedef yapıdır; modüller geliştikçe aşamalı kurulacaktır.

## Kimlik ve üyelik modeli

- `users`, uygulamadaki küresel insan kimliğini temsil eder.
- Bir kullanıcı birden fazla okulun üyesi olabilir.
- Bir kullanıcının aynı okul içinde birden fazla rolü olabilir.
- Süper Admin e-posta + parola; bütün okul rolleri kullanıcı adı + parola ile giriş yapar. Okul kullanıcı adı üyelik üzerinde okul kapsamında benzersizdir; e-posta zorunlu değildir.
- Parola ve DB oturumlarını Arsimio yönetir; mail/SMS veya harici kimlik sağlayıcısı giriş bağımlılığı değildir. Aynı küresel kullanıcının farklı okul üyelikleri tek parolayı paylaşır.

2026-09-19 kararıyla ilk Neon Auth denemesi yerini scrypt hash + rastgele opaque DB session modeline bıraktı. Cookie host kapsamlıdır; session hostname/üyelik/kullanıcı/parola sürümüne bağlıdır. Okul üyeliği/permission her korumalı istekte uygulama DB'sinden kontrol edilir. Ayrıntılar [parolalı giriş belgesinde](./password-auth.md).

İlk yönetici, operatörün kendi terminalindeki bir defalık `pnpm auth:bootstrap` komutuyla önceden ayrılmış PENDING hesabın parolasını belirler. Public signup/bootstrap endpoint'i yoktur; ilk kayıt olana veya e-posta eşitliğine göre yetki verilmez. Okul kullanıcılarını yetkili yöneticinin oluşturacağı ekran sonraki dilimdir. Eski provider kolonları ve dış `neon_auth` şeması korunur, yeni auth akışında kullanılmaz.

## Güvenlik sınırları

Savunma tek bir kontrole dayanmaz:

1. Doğrulanmış hostname tenant'ı belirler.
2. Oturum, küresel kullanıcıyı belirler.
3. Aktif okul üyeliği tenant erişimini doğrular.
4. Permission kontrolü yapılabilecek eylemi doğrular.
5. Veri erişim katmanı bütün sorguları `school_id` ile sınırlar.
6. Veritabanı kısıtları, eşsiz anahtarlar ve gerekli yerlerde PostgreSQL RLS ikinci savunma hattını oluşturur.
7. Yazma işlemi, denetim olayını aynı işlem sınırı içinde üretir.

İstemci tarafındaki gizleme veya devre dışı bırakma bir güvenlik kontrolü sayılmaz.

## Veri ve dosya saklama

- İlişkisel uygulama verileri Neon PostgreSQL'de tutulur.
- Logo, belge ve medya dosyaları yerel diskte değil nesne depolamada tutulur.
- Veritabanında dosyanın sahibi olan okul, depolama anahtarı, MIME türü, boyut ve yükleyen kullanıcı saklanır.
- Hassas öğrenci ve veli verileri için minimum veri erişimi esastır.

## Teknoloji kararları

- Next.js 16 App Router, React ve TypeScript.
- Tailwind CSS ve shadcn/ui.
- Neon PostgreSQL.
- Şema, type-safe istemci ve migration yönetimi için Prisma ORM 7 ve `schema.prisma` kullanılacaktır.
- Çalışma zamanı Neon'un pooled bağlantısını `@prisma/adapter-neon` üzerinden, migration işlemleri unpooled bağlantıyı kullanacaktır.
- PostgreSQL RLS ve Prisma şemasında doğrudan ifade edilemeyen veritabanı kuralları sürümlü özel SQL migration'larıyla yönetilecektir.
- Giriş için Node.js scrypt ve Prisma DB oturumları; parola ve session sırları istemciye serialize edilmez. Mail/SMS/MFA eklemeleri daha sonraki dilimdir.

## İlk uygulama dilimi

[İki okul pilotu](./two-school-pilot.md), bu mimarinin ilk uçtan uca doğrulamasıdır. Tek Vercel projesine bağlı iki test hostname'i aynı uygulamayı, farklı okul markaları ve üyelik yetkileriyle açar. Giriş ekranı ortak bileşenlerden üretilir; okulda kullanıcı adı, platformda e-posta istenir. Domainler arası otomatik SSO hedeflenmez. Nihai yetki kontrolü proxy veya menü görünürlüğüne bırakılmaz. Gerçek özel domain ve oturumlu yönetim kabul testleri henüz açıktır.
