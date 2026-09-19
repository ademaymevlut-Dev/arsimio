# Veri modeli

Bu modelin uygulamadaki ana kaynağı [`prisma/schema.prisma`](../prisma/schema.prisma) dosyasıdır. Şema değişiklikleri Prisma Migrate ile sürümlenir; PostgreSQL RLS ve Prisma'nın doğrudan ifade edemediği kısıtlar migration SQL'ine açıkça eklenir.

2026-09-19 tarihinde 13 çekirdek tablo Neon'a uygulandı. [Migration çalışma düzeni](./database-migrations.md) mevcut kısıtları ve henüz uygulanmamış güvenlik katmanlarını ayırır. Aşağıdaki akademik/profil tabloları ve `school_settings` sonraki aşamalar için planlanmıştır.

## Modelleme standartları

- Birincil anahtarlar UUID kullanır.
- Tenant kayıtlarında `school_id` bulunur; üyelik ve davet rol bağlantıları da bu alanı taşır. Platform kayıtları tenant gerektirmez. `role_permissions` bağlantısının okul sahipliği referans verdiği rolden gelir.
- Tenant içindeki eşsizlikler mümkün olduğunca `school_id` ile bileşik constraint olarak tanımlanır.
- Kayıtlarda `created_at`, `updated_at`, gerekli yerlerde `created_by` ve `updated_by` tutulur.
- Silinebilir iş kayıtları `archived_at`/`archived_by` ile arşivlenir.
- Durumlar serbest metin yerine sınırlı enum/check constraint veya referans veriyle modellenir.
- Para değerleri kayan nokta ile değil, para birimiyle birlikte kesin sayısal türde tutulur.
- Tarih/saat değerleri UTC saklanır; okulun saat diliminde gösterilir.
- Hassas ilişkiler yalnızca uygulama doğrulamasına değil foreign key ve constraint'lere de dayanır.

## Platform ve tenant çekirdeği

### `schools`

Okul tenant'ını temsil eder. Ad, benzersiz slug, durum, varsayılan saat dilimi, dil ve temel iletişim bilgilerini içerir.

### `school_domains`

Bir hostname'i bir okula bağlar. `hostname`, `school_id`, doğrulama durumu, varsayılan alan adı işareti ve doğrulama tarihini içerir.

### `school_branding`

Logo/dosya anahtarları, renk token'ları ve izin verilen görünüm ayarlarını tutar. Serbest CSS veya çalıştırılabilir içerik kabul edilmez.

### `school_settings`

Okulun özellik ve davranış ayarlarını sürümlenebilir şekilde tutar. Sık sorgulanan ve kritik ayarlar yalnızca büyük bir JSON alanına gömülmez.

## Kimlik ve yetkilendirme çekirdeği

### `users`

Küresel kullanıcı profili ve harici kimlik sağlayıcısı eşlemesini tutar. Kullanıcının okul rolü bu tabloda tutulmaz.

### `school_memberships`

Kullanıcı ile okul arasındaki üyeliği, durumunu ve yaşam döngüsünü tutar. Aynı kullanıcı farklı okullarda farklı üyeliklere sahip olabilir.

### `roles`, `permissions`, `role_permissions`

Rol paketlerini ve atomik eylem izinlerini tanımlar. Her okulun rolleri ayrı kayıttır; `SCHOOL` rolü mutlaka bir okula aittir, `PLATFORM` rolünde okul alanı boştur. Permission kataloğu küreseldir, rol/permission kapsamı bileşik foreign key ile eşleşir. `is_system`, standart rolü işaretler; bu rollerin kim tarafından değiştirilebileceği uygulama yetkilendirmesinde tamamlanacaktır.

### `membership_roles`

Bir okul üyeliğine bir veya daha fazla rol atar. Rol ve üyeliğin aynı okula ait olması DB tarafından zorunlu tutulur. Atayan kullanıcı ve zaman kaydedilir.

### `user_roles`

Kullanıcıya okuldan bağımsız platform rolü atar. Okul rolleri bu tabloda kullanılamaz.

### `school_invitations`, `invitation_roles`

Okula davet sürecini; hedef iletişim bilgisi, amaçlanan rol, süre sonu, kullanan kişi ve durumuyla tutar. Davet token'ının kendisi düz metin saklanmaz.

Bir davete birden fazla rol eklenebilir; davet ve roller aynı okula ait olmalıdır.

### `audit_events`

Değiştirilemeyen işlem geçmişidir. Ayrıntılar [denetim belgesinde](./audit-history-data-lifecycle.md) tanımlanmıştır.

## Kişi profilleri

Kimlik hesabı ile okul içindeki kişi/profil kavramı ayrılmalıdır:

- `staff_profiles`
- `teacher_profiles`
- `student_profiles`
- `guardian_profiles`
- `driver_profiles`

Her profilin hemen bir giriş hesabı olmak zorunda değildir. Örneğin öğrenci kaydı oluşturulabilir, kullanıcı hesabı daha sonra davet edilebilir. Profil ile `school_membership` bağlantısı isteğe bağlı başlayıp doğrulandıktan sonra kurulabilir.

## Temel ilişkiler

```text
users
  └── school_memberships ── schools ── school_domains
          ├── membership_roles ── roles ── role_permissions ── permissions
          └── kişi profili bağlantıları

schools
  ├── academic_years ── terms
  ├── classes / sections
  ├── subjects / courses
  ├── enrollments
  ├── teaching_assignments
  ├── attendance
  ├── assessments / grades
  ├── homework / submissions
  ├── guardian_student_links
  └── transport_routes / trips / riders
```

## İş alanı modülleri

Çekirdek tenant ve yetki sistemi kurulduktan sonra aşağıdaki modüller aşamalı tasarlanacaktır:

1. Okul kurulumu, akademik yıl ve dönemler.
2. Çalışan, öğretmen, öğrenci ve veli profilleri.
3. Sınıf, ders, kayıt ve öğretmen atamaları.
4. Program ve yoklama.
5. Sınav, değerlendirme, not ve yorumlar.
6. Ödev, teslim ve materyaller.
7. Bildirim ve iletişim.
8. Finans.
9. Servis, rota, sefer ve biniş/iniş takibi.

## Eski proje ile eşleme

HorizonEdu'daki model ve alanlar, her modül tasarlanırken bir envanter kaynağı olarak incelenir. Her eski alan için şu karar verilir:

- Yeni üründe gerçekten gerekli mi?
- Hangi iş kavramını temsil ediyor?
- Kişisel veya hassas veri mi?
- Tenant sınırı ve sahibi nedir?
- Yeni modelde normalleştirilmeli mi?
- Aktarılacaksa dönüşüm ve doğrulama kuralı nedir?

Eski tablo adına benzediği için yeni şemaya otomatik olarak alan eklenmez.
