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

`20260921000100_add_academic_calendar`, 2026-09-21'de uygulandı. `academic_years` ve `academic_terms` ile uygulama tablo sayısı 18'e çıktı; `academics.read` ve `academics.manage` izinleri eklenip mevcut `SCHOOL_ADMIN` rollerine bağlandı. Okul/yıl bileşik foreign key'i çapraz okul dönem ilişkisini engeller. İlk sürümde okul başına tek aktif yıl ve yıl başına tek aktif dönem kısıtı bulunuyordu; ikinci kural aşağıdaki düzeltme migration'ı ile kaldırıldı. Trigger'lar yaşam döngüsünü, dönemlerin yıl sınırında kalmasını, tarih çakışmamasını ve kapalı/arşivli yıl durumlarını korur. Beş rollback-only gerçek DB kontrolü geçti; test verisi tutulmadı.

`20260921000200_add_i18n_term_translations`, 2026-09-21'de uygulandı. `academic_term_translations` ile uygulama tablo sayısı 19'a çıktı; dönemlerin Türkçe, Arnavutça ve İngilizce adları aynı dönem ID'sine bağlandı. Okul/üyelik locale değerleri `tr/sq/en` CHECK constraint'leriyle sınırlandı ve üyeliğe okul bazlı `preferred_locale` eklendi. Mevcut iki dönem adı okulun varsayılan dili için kayıpsız taşındı; anlamı bilinmeyen diğer diller otomatik üretilmedi. Eski `academic_terms.name` expand/contract deploy uyumluluğu için korundu. Altı rollback-only akademik DB kontrolü geçti; test verisi tutulmadı.

`20260921000300_sync_term_lifecycle_with_year`, dönem yaşam döngüsünü okul işleyişiyle düzeltti. Yıl başına tek aktif dönem index'i kaldırıldı. Bir yıl etkinleştiğinde arşivlenmemiş bütün dönemler birlikte `ACTIVE`, yıl kapandığında birlikte `CLOSED` olur; dönem için ayrı etkinleştir/kapat işlemi yoktur. Önceki akışın aktif yılda kapattığı dönemler migration sırasında veri kaybetmeden tekrar `ACTIVE` yapıldı. Tarihli iş kayıtlarının dönem bağı bundan sonra okul saat dilimindeki kayıt tarihi ile dönem tarih aralığından çözülecektir.

`20260922000100_add_academic_structure`, 2026-09-22'de uygulandı. Dokuz tablo eklenerek uygulama tablo sayısı 28'e çıktı: `education_stages`, `education_stage_translations`, `grade_levels`, `class_sections`, `subjects`, `subject_translations`, `course_offerings`, `lesson_periods`, `lesson_period_translations`. Kademe, seviye, şube, sınıf–ders planı ve ders saati seçili okul/yıl bileşik foreign key'leriyle; ders kataloğu okul kapsamıyla korunur. Kademe, ders ve ders saati adları tek iş kimliği altında `tr/sq/en` çeviri satırlarıdır. Ders saati bitişinin başlangıçtan sonra olması CHECK, aynı yıldaki arşivlenmemiş saatlerin çakışmaması trigger ile zorunludur. Dokuz rollback-only gerçek DB kontrolü tenant sınırı, çeviriler, tekrarlar, bağımlı arşivleme, geri alma ve audit'i doğruladı; test verisi tutulmadı. Okul takvimi/çalışma günü tablosu bu migration'a eklenmedi.

`20260923000100_add_subject_track`, 2026-09-23'te bağlı Neon'a uygulandı. Ders kataloğuna `GENERAL`/`ELECTIVE`/`IGCSE` türünü ekler, mevcut dersleri `GENERAL` varsayılanıyla korur ve okul+tür indeksi oluşturur. Migration ders eklemez; ayrı seed komutu HorizonEdu'ya 49 ders ve 147 çeviri oluşturdu. GjimCamEdu değişmedi.

Prisma ayrıca uygulanan migration'ları `_prisma_migrations` tablosunda izler. Diğer akademik ve operasyon tabloları ilgili modüller geliştikçe eklenecek. Pilot seed'i iki okul, doğrulanmış domainler, roller/permission'lar ve bir PENDING Süper Admin hesabı oluşturdu. Sonrasında kullanıcı kendi terminalinde Süper Admin parolasını belirledi; iki okul için ilk yöneticileri oluşturup giriş/çıkış ve çapraz okul giriş reddini doğruladı. Parolalar belgelere yazılmaz.

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

`pnpm db:verify:academic-calendar` akademik izinleri, tek dönem ID'si altındaki üç tenant-kapsamlı çeviriyi, dönem çakışmasını, tek aktif yıl geçişini, yıl etkinleşince bütün dönemlerin birlikte etkinleşmesini, dönemlerin tek başına kapatılamamasını, otomatik lifecycle audit'ini ve çapraz okul yazma reddini gerçek servisler üzerinden kontrol eder. Bütün fixture ve yazmalar transaction sonunda rollback edilir.

`pnpm db:verify:academic-structure` kademe/seviye/şube kapsamını, tek ders ID'si altındaki üç çeviriyi, sınıf–ders tekrar engelini, ders saati çakışmasını, bağımlı kayıt arşivleme/geri alma kurallarını ve tenant actor audit'ini gerçek servisler üzerinden kontrol eder. Bütün fixture ve yazmalar transaction sonunda rollback edilir.

## Kaynaklar

- [Prisma 7 geliştirme ve production migration akışı](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)
- [Prisma'nın desteklemediği DB özelliklerini SQL ile yönetme](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/native-database-types)
- [PostgreSQL constraint kuralları](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL trigger kuralları](https://www.postgresql.org/docs/current/sql-createtrigger.html)
