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
- Kimlik sağlayıcısı giriş ve oturum güvenliğini sağlar; okul üyeliği ve iş yetkileri Arsimio veritabanında tutulur.
- Kimlik sağlayıcısı seçimi, özel okul alan adlarında oturum davranışı kanıtlandıktan sonra kesinleştirilir.

Pilotun ilk diliminde `@neondatabase/auth` sürümü `0.5.0-beta` olarak sabitlendi. Server Action'lar sağlayıcının resmi SDK'sını kullanır; oturum cookie'si host kapsamlıdır. Okul üyeliği/permission her korumalı istekte uygulama DB'sinden kontrol edilir. `getSession` cookie cache'i devre dışı bırakılarak sağlayıcıya doğrulatılır. Beta SDK'nın boolean tipine rağmen literal `"true"` kontrolü yapan davranışı için sürüme özel uyarlama vardır; SDK yükseltmesinde yeniden sınanmalıdır.

Normal kullanıcı eşlemesi yalnızca `authProvider` + `authProviderUserId` ile yapılır. Tek istisna kontrollü ilk kurulumdur: ana platform hostunda, operatörün ayırdığı PENDING kullanıcı ve SUPER_ADMIN rolü, önceden yapılandırılmış e-postanın sağlayıcı tarafından doğrulanması sonrasında atomik olarak kimliğe bağlanır. İlk kaydolan kişiye yetki verilmez. Okul daveti kabulü sonraki dilimdir.

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
- Harici kimlik sağlayıcısı adayı kullanılmadan önce alt alan adı ve özel alan adı oturum senaryosu üzerinde teknik deneme yapılacaktır.

## İlk uygulama dilimi

[İki okul pilotu](./two-school-pilot.md), bu mimarinin ilk uçtan uca doğrulamasıdır. Tek Vercel projesine bağlı iki test hostname'i aynı uygulamayı, farklı okul markaları ve üyelik yetkileriyle açacaktır. İlk auth adayı mevcut Neon Auth entegrasyonudur; çoklu domain denemesi geçmeden sağlayıcı kararı kesinleşmiş sayılmaz. Giriş ekranı ortak bileşenlerden üretilecek, pilotta domainler arası otomatik SSO hedeflenmeyecektir. Nihai yetki kontrolü proxy veya menü görünürlüğüne bırakılmayacaktır.
