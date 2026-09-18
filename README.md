# Arsimio

Arsimio, mevcut HorizonEdu uygulamasının modern Next.js tabanlı devamıdır.

## Teknoloji yığını

- Next.js 16 (App Router)
- React 19 ve TypeScript
- Tailwind CSS 4
- shadcn/ui (Radix tabanı)
- Neon PostgreSQL için `@neondatabase/serverless`
- Vercel dağıtımına hazır yapı

## Yerel geliştirme

Gereksinimler: Node.js 20.9+ ve pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde açılır.
Sağlık kontrolü: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Neon bağlantısı

Vercel projesine Neon entegrasyonu eklendiğinde `DATABASE_URL` ortam değişkenini bağlayın. Yerel geliştirmede aynı değeri `.env.local` içinde kullanın. Veritabanı istemcisi `src/lib/db.ts` dosyasındaki `getSql()` fonksiyonuyla sunucu tarafında alınabilir.

## Proje yapısı

```text
src/
├── app/                 # Sayfalar, layout ve route handler'lar
├── components/ui/       # shadcn/ui bileşenleri
└── lib/                 # Veritabanı ve ortak yardımcılar
```

Kökteki `horizonedu/` klasörü eski Flask/Expo uygulamasını incelemek ve geçiş sırasında referans almak için yerelde tutulur. Boyutu nedeniyle Git tarafından takip edilmez ve Vercel dağıtımına dahil olmaz.

## Kontroller

```bash
pnpm lint
pnpm build
```
