# Arsimio

Arsimio, okul yönetimi için sıfırdan geliştirilen modern ve çok kiracılı bir platformdur. HorizonEdu uygulaması yalnızca alan bilgisi, veri ilişkileri ve iş akışlarını anlamak için referans olarak kullanılır; eski mimari birebir taşınmaz.

## Teknoloji yığını

- Next.js 16 (App Router)
- React 19 ve TypeScript
- Tailwind CSS 4
- shadcn/ui (Radix tabanı)
- Prisma ORM 7 (`schema.prisma` ve Prisma Migrate)
- Neon PostgreSQL ve `@prisma/adapter-neon`
- Scrypt parola hash'i ve hostname/üyelik kapsamlı veritabanı oturumları
- Vercel dağıtımına hazır yapı

## Yerel geliştirme

Gereksinimler: Node.js 22.18+ (önerilen: 24) ve pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde açılır.
Sağlık kontrolü: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Prisma ve Neon bağlantısı

Vercel projesine Neon entegrasyonu eklendiğinde ortam değişkenlerini yerel geliştirmeye alın. Prisma Client çalışma zamanında pooled `DATABASE_URL`, Prisma Migrate ise mevcutsa `DATABASE_URL_UNPOOLED` veya `POSTGRES_URL_NON_POOLING` kullanır.

```bash
vercel env pull .env.local --environment=development
pnpm db:generate
pnpm db:validate
```

Veritabanı modeli `prisma/schema.prisma`, Prisma yapılandırması `prisma7.config.ts` içindedir. Sunucu tarafındaki istemci `src/lib/db.ts` dosyasındaki `getPrisma()` fonksiyonuyla alınır.

## Proje yapısı

```text
src/
├── app/                 # Sayfalar, layout ve route handler'lar
├── components/ui/       # shadcn/ui bileşenleri
├── generated/prisma/    # Otomatik üretilen Prisma Client (Git'e eklenmez)
└── lib/                 # Veritabanı ve ortak yardımcılar
prisma/
├── schema.prisma        # Veritabanı modellerinin ana kaynağı
└── migrations/          # Uygulanan SQL değişikliklerinin sürüm geçmişi
scripts/                 # Transaction içinde geri alınan DB doğrulama testleri
docs/                    # Mimari, güvenlik, yol haritası ve çalışma günlüğü
```

Kökteki `horizonedu/` klasörü eski Flask/Expo uygulamasını incelemek ve geçiş sırasında referans almak için yerelde tutulur. Boyutu nedeniyle Git tarafından takip edilmez ve Vercel dağıtımına dahil olmaz.

## Dokümantasyon

Dokümantasyon başlangıç noktası: [`docs/README.md`](./docs/README.md)

- [Ürün ilkeleri](./docs/product-principles.md)
- [Teknik mimari](./docs/architecture.md)
- [Kullanıcılar, roller ve yetkiler](./docs/users-roles-permissions.md)
- [Veri modeli](./docs/data-model.md)
- [Migration çalışma düzeni](./docs/database-migrations.md)
- [İki okul pilotu](./docs/two-school-pilot.md)
- [Pilot kurulum ve doğrulama](./docs/pilot-setup.md)
- [Parolalı giriş ve ilk yönetici kurulumu](./docs/password-auth.md)
- [Denetim, geçmiş ve veri yaşam döngüsü](./docs/audit-history-data-lifecycle.md)
- [Yol haritası](./docs/roadmap.md)
- [Çalışma günlüğü](./docs/work-log.md)

## Kontroller

```bash
pnpm test
pnpm lint
pnpm build
pnpm db:validate
```

İlk çekirdek ve parolalı giriş migration'ları Neon'a uygulanmıştır. Sonraki değişiklikler özellik bazlı migration'larla ilerler. `pnpm db:status` uygulanan sürümü gösterir; `pnpm db:verify` ve `pnpm db:verify:auth` kontrollü test DB'sinde geçici kayıtlarla kuralları sınar ve kayıtları geri alır. Ayrıntılar [migration çalışma düzeninde](./docs/database-migrations.md).
