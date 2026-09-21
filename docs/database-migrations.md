# Veritabanı ve migration çalışma düzeni

## Karar — 2026-09-19

Migration kullanmaya çekirdek şemadan itibaren başlıyoruz. Bütün modüllerin veya tabloların bitmesini beklemiyoruz. Her kolon için ayrı migration zorunlu değildir: aynı özelliği tamamlayan tablo, kolon, index ve ilişkiler tek bir anlamlı migration içinde gruplanır.

Örnek sıra: `init_core` → `add_academic_years` → `add_student_enrollments` → `add_attendance`. Her adım küçük, gözden geçirilebilir ve çalıştırılabilir olmalıdır. Prisma şema dosyasını kaydetmek kendiliğinden veritabanını değiştirmez; SQL üretilir, incelenir ve uygulanır.

## Uygulanan migration'lar

`20260919000100_init_core`, Arsimio'ya bağlı Neon veritabanının `public` şemasına uygulandı. Uygulama öncesinde bu şema boştu. Ayrı `neon_auth` şemasındaki 9 servis tablosu korundu.

Oluşturulan 13 uygulama tablosu:

- `schools`, `school_domains`, `school_branding`
- `users`, `school_memberships`
- `roles`, `permissions`, `role_permissions`, `membership_roles`, `user_roles`
- `school_invitations`, `invitation_roles`
- `audit_events`

`20260919000200_password_auth` da 2026-09-19'da uygulandı: okul üyeliğine okul kapsamında benzersiz username eklendi, kullanıcı e-postası nullable oldu; `user_credentials`, `auth_sessions`, `auth_throttles` tablolarıyla toplam 16 uygulama tablosuna ulaşıldı. Oturumun kullanıcı/üyelik/okul bağlantısı bileşik FK ile korunur; username, token hash, sayaç ve süre kısıtları SQL'dedir. Önce 18 kontrollü rollback provası, uygulama sonrası 17 auth DB kontrolü geçti. Veri silme/reset yapılmadı; `neon_auth` şemasına dokunulmadı.

Prisma ayrıca uygulanan migration'ları `_prisma_migrations` tablosunda izler. Akademik ve operasyon tabloları ilgili modüller geliştikçe eklenecek. Pilot seed'i iki okul, doğrulanmış domainler, roller/permission'lar ve bir PENDING Süper Admin hesabı oluşturdu. Sonrasında kullanıcı kendi terminalinde ilk parolasını belirledi ve canlı Süper Admin girişini doğruladı. Okul kullanıcı hesapları henüz oluşturulmadı.

## İncelemede düzeltilen kurallar

| Alan | Veritabanı kuralı |
| --- | --- |
| Okul rolleri | Her `SCHOOL` rolü bir okula ait; `PLATFORM` rolünün okul bağlantısı yok. |
| Rol atamaları | Üyelik, davet ve rolün `school_id` değerleri bileşik foreign key ile eşleşir. |
| Platform atamaları | `user_roles` yalnızca platform rollerini kabul eder. |
| Permission kapsamı | Rolün ve permission'ın `PLATFORM`/`SCHOOL` kapsamları eşleşir. |
| Audit actor | Üyelik varsa okul, kullanıcı ve üyelik aynı kaydı göstermelidir. |
| Audit koruması | UPDATE, DELETE ve TRUNCATE trigger tarafından reddedilir. Referanslar silinerek actor kaybettirilemez. |
| Ana domain | Okul başına en fazla bir ana domain; ana domain doğrulanmış olmalıdır. |
| Kimlik eşsizliği | E-posta küçük harf/trim biçiminde; hostname ASCII/punycode biçiminde saklanır. |

`schema.prisma` bileşik ilişkileri ve kapsam alanlarını içerir. CHECK constraint'ler, iki koşullu unique index ve audit trigger'ı migration SQL'inde tutulur. Uygulanmış SQL dosyası değiştirilmez; yeni kurallar yeni migration ile eklenir.

Okul açılırken standart okul rolleri o okul için oluşturulacak. Örneğin iki okulun `TEACHER` rolü aynı kodu taşır fakat farklı role ID ve `school_id` kullanır. Süper Admin `user_roles` üzerinden platforma atanır. `role_permissions` bir bağlantı tablosudur; okul sahipliğini referans verdiği rolden alır, permission kataloğu küreseldir.

Bu kısıtlar ilişkisel bütünlüğü sağlar. Giriş yapan kullanıcının hangi satırları okuyabileceği ve hangi işlemleri yapabileceği ayrıca DAL/permission guard ile denetlenir. Seed, ilk aktivasyon ve giriş/çıkış audit üretir; yeni iş modülleri de aynı transaction düzenini kullanmalıdır. PostgreSQL RLS ve ayrı yetkileri kısıtlanmış runtime DB rolü henüz uygulanmadı. Şu anki bağlantı DB sahibi rolünü kullanır; gerçek öğrenci/veli verisi alınmadan bu sınırlar tamamlanmalıdır.

Audit trigger'ı normal veri değiştirme işlemlerini engeller; şema sahibi veya yetkili yönetici DDL ile korumayı kaldırabilir. Saklama ve anonimleştirme için henüz bypass tanımlanmadı; ileride ayrı, kayıtlı bir yönetim akışı hazırlanacak. Kullanıcı profilinin anonimleştirilmesi, audit actor UUID referansının silinmesini gerektirmez.

## Geliştirmede sonraki değişiklik

Bu komutlar yalnızca geliştirmeye ayrılmış Neon branch/veritabanı üzerinde çalıştırılır. `.env.local` dosyasının development ortamından gelmesi, branch'in production'dan ayrı olduğunu tek başına kanıtlamaz; bağlantı hedefi kontrol edilir. `migrate dev`, geçmişi yeniden oynatmak için ayrı bir shadow veritabanı kullanır. Neon izinleri otomatik oluşturmayı karşılamazsa ayrı shadow veritabanı yapılandırılır; production bağlantısı shadow olarak kullanılmaz.

1. `prisma/schema.prisma` dosyasında ilgili özelliğin değişikliklerini yap.
2. Taslağı üret:

   ```bash
   pnpm db:format
   pnpm db:validate
   pnpm db:migrate --name add_student_enrollments --create-only
   ```

3. Yeni `migration.sql` dosyasını incele; gerekli CHECK, index, trigger ve veri dönüştürme adımlarını ekle. Prisma'nın yeniden adlandırmayı DROP/ADD olarak yorumlayıp yorumlamadığını kontrol et.
4. Geliştirme veritabanına uygula ve Client'ı üret:

   ```bash
   pnpm db:migrate
   pnpm db:generate
   pnpm db:verify
   ```

5. Şema, migration klasörü, migration lock ve ilgili dokümanları aynı değişiklikle Git'e ekle.

Yeni tabloda zorunlu kolon eklemek kolaydır. Veri bulunan tabloda yeni zorunlu alan için önce nullable alan ekleme, mevcut veriyi doldurma ve sonra NOT NULL yapma gibi aşamalı değişiklik gerekebilir. Uygulanmış migration geri dönük düzenlenmez veya silinmez; düzeltme yeni migration ile yapılır.

## Paylaşılan ortam ve production

Gözden geçirilmiş migration dosyaları şu komutla uygulanır:

```bash
pnpm db:deploy
pnpm db:status
```

`migrate deploy` mevcut migration'ları uygular; yeni SQL üretmez, reset yapmaz, Client üretmez ve drift kontrolü yapmaz. Client ayrı üretilir. Vercel'deki her preview build'in ortak production DB'ye migration çalıştırması yerine, production için tek kontrollü CI/CD adımı kullanılacak. Henüz otomatik migration dağıtımı kurulmadı.

`db push` migration geçmişi üretmediği için Arsimio'nun paylaşılan veritabanı akışında kullanılmaz. `migrate reset` gerçek/veri korunması gereken veritabanında kullanılmaz.

İlk migration boş uygulama şemasından `migrate diff --from-empty --to-schema ... --script` ile üretildi, SQL kısıtları eklendi ve `migrate deploy` ile uygulandı. Bu ilk kurulum yöntemidir; sonraki değişikliklerde başlangıç tekrar boş kabul edilmez.

## Doğrulama

`pnpm db:verify` iki geçici okul ve ilişkili test kayıtlarını tek transaction içinde oluşturur. Doğru ilişkilerin kabul edildiğini, çapraz okul atamalarının ve audit değişikliklerinin reddedildiğini kontrol eder; tüm test verisini ROLLBACK ile geri alır. Bu DB bütünlüğü testidir, kullanıcı yetkilendirmesi/RLS testi değildir. Geliştirme veya test ortamında çalıştırılır.

İlk uygulama öncesi `node scripts/verify-core-schema.mjs --preview-migration` kullanıldı. Bu seçenek yalnızca `public` şeması boşken ilk migration'ın tamamını rollback içinde dener; artık oluşturulmuş veritabanında normal `pnpm db:verify` kullanılır.

`pnpm db:verify:auth` parola/oturum, çapraz okul/hostname, üyelik ve credential iptali, rate limit ve bir defalık bootstrap için 17 kontrol çalıştırır. Test kayıtları rollback edilir; gerçek kullanıcının parolası değiştirilmez. HTTP/tarayıcı ve production kabulü ayrı test katmanlarıdır. Güncel kurulum [parolalı giriş belgesindedir](./password-auth.md).

## Kaynaklar

- [Prisma 7 geliştirme ve production migration akışı](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)
- [Prisma'nın desteklemediği DB özelliklerini SQL ile yönetme](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/native-database-types)
- [PostgreSQL constraint kuralları](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL trigger kuralları](https://www.postgresql.org/docs/current/sql-createtrigger.html)
