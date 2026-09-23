# Veri modeli

Bu modelin uygulamadaki ana kaynağı [`prisma/schema.prisma`](../prisma/schema.prisma) dosyasıdır. Şema değişiklikleri Prisma Migrate ile sürümlenir; PostgreSQL RLS ve Prisma'nın doğrudan ifade edemediği kısıtlar migration SQL'ine açıkça eklenir.

2026-09-23 itibarıyla 13 çekirdek + 3 parola/oturum + 2 akademik takvim + 1 dönem çeviri + 9 akademik yapı tablosu, toplam 28 uygulama tablosu Neon'a uygulandı. Ders kataloğuna ayrıca `track` alanı eklendi. [Migration çalışma düzeni](./database-migrations.md) mevcut kısıtları ve henüz uygulanmamış güvenlik katmanlarını ayırır. Aşağıdaki profil tabloları, okul takvimi/çalışma günleri ve `school_settings` sonraki aşamalar için planlanmıştır.

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

Küresel kullanıcı profilini tutar. `email` nullable'dır; okul kullanıcıları için zorunlu değildir. Süper Admin girişinde normalize e-posta kullanılır. Eski provider eşleme kolonları korunur ancak parolalı giriş bunları kullanmaz. Kullanıcının okul rolü bu tabloda tutulmaz.

### `school_memberships`

Kullanıcı ile okul arasındaki üyeliği, kullanıcı adını, tercih edilen UI dilini, durumunu ve yaşam döngüsünü tutar. `(school_id, username)` benzersizdir; username normalize ASCII olarak saklanır. `preferred_locale` nullable ve `tr/sq/en` ile sınırlıdır; tercih küresel kullanıcıya değil okul üyeliğine aittir. Geçiş için nullable olmakla birlikte kullanıcı adı olmayan üyelik okul girişini kullanamaz. Aynı kullanıcı farklı okullarda farklı üyeliklere sahip olabilir.

### `user_credentials`

Küresel kullanıcı başına bir scrypt parola hash'i, credential sürümü ve tarihleri içerir. Aynı kişinin farklı okul üyelikleri aynı parolayı kullanır. Parola değişikliğinde sürüm artırılarak önceki session'lar geçersizleştirilmelidir.

### `auth_sessions`

Rastgele token'ın SHA-256 özeti, kullanıcı, hostname, okul/üyelik, credential sürümü, son kullanma ve iptal tarihini tutar. Platform session'ında okul/üyelik birlikte boş, okul session'ında birlikte doludur. Üyelik/okul/kullanıcı aynı kaydı işaretlemek zorundadır; bileşik FK bu ilişkiyi doğrular. Düz token saklanmaz.

### `auth_throttles`

Giriş deneme sayacı ve süre sonunu tutar. Anahtar platform+e-posta veya okul+kullanıcı adı kapsamının hash'idir; aynı okulun alias'ları ortak limit kullanır. Sunucu örneklerinden bağımsız atomik artırım yapılır.

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

## Akademik takvim

### `academic_years`

Okula ait öğretim yılını ad, başlangıç/bitiş tarihi ve `DRAFT → ACTIVE → CLOSED → ARCHIVED` yaşam döngüsüyle tutar. Okul başına aynı anda yalnız bir aktif yıl olabilir. Kayıt fiziksel olarak silinmez; arşiv actor ve zamanıyla izlenir. Taslak yıl etkinleştirilmeden önce en az bir dönemi olmalıdır.

### `academic_terms`

Bir öğretim yılının sıralı dönemlerini tutar. Dönemin okul kimliği üst yılıyla bileşik foreign key üzerinden eşleşir; tarihleri yıl aralığında kalır ve arşivlenmemiş dönemlerle çakışamaz. Dönemler ayrı ayrı etkinleştirilmez: yıl etkinleşince arşivlenmemiş dönemlerin tamamı etkinleşir, yıl kapanınca birlikte kapanırlar. Not, yorum, yoklama ve benzeri tarihli bir kaydın dönemi; okulun saat dilimindeki işlem tarihi ile dönem başlangıç/bitiş aralığından otomatik çözülür. Kapalı/arşivli yılın geçersiz dönem durumları migration trigger'larıyla reddedilir.

### `academic_term_translations`

Tek bir dönemin `tr`, `sq` ve `en` görünen adlarını tutar. `(academic_term_id, locale)` birincil anahtardır; dil başına ayrı dönem ID'si üretilmez. `school_id` ve dönem kimliği bileşik foreign key ile eşleşir. Eski `academic_terms.name` kolonu sıfır kesintili geçiş için geçici olarak korunur; yeni yazımlar üç çeviriyi aynı transaction'da üretir.

Her iki tablo da oluşturan, güncelleyen ve arşivleyen kullanıcı bağlarını taşır. Uygulama yazmaları okul permission'ı, optimistic revision ve aynı transaction içindeki `audit_events` kaydıyla yürür.

## Akademik yapı

### `education_stages`, `education_stage_translations`

Anaokulu, ilkokul, ortaokul ve lise gibi okulun seçili öğretim yılında kullandığı kademeleri tutar. Kademe kodu ve sırası okul/yıl kapsamında benzersizdir. Görünen adlar tek kademe kimliği altında `tr`, `sq` ve `en` çeviri satırlarıdır; ülke sistemi enum olarak uygulamaya gömülmez.

### `grade_levels`

`PRF`, `1` … `12` veya başka bir ülke sistemindeki seviye kodlarını bir kademeye bağlar. Ana kullanıcı girdileri kademe ve seviye kodudur; `sequence` dil bağımsız doğru sıralama ve gelecekteki yıl geçişi eşlemesi için tutulur. Seviye seçili öğretim yılına aittir; aynı kod ve sıra aynı yılda tekrarlanamaz.

### `class_sections`

Seviyenin yıllık şubesini tutar. `grade_level=4` ve `code=1` birlikte ekranda `4 / 1` olarak gösterilir. Şube üst seviyenin okul ve öğretim yılıyla bileşik foreign key üzerinden eşleşir; aynı seviye içinde şube kodu tekrarlanamaz.

### `subjects`, `subject_translations`

Okulun yıllar arasında tekrar kullanabildiği ders kataloğudur. Bir dersin tek UUID'si, üç dilde görünen adı vardır; dil başına ayrı ders kaydı oluşturulmaz. Dil/ad eşsizliği okul kapsamında korunur. Dersin belirli yılda hangi sınıfta okutulduğu katalog kaydına yazılmaz.

`subjects.track` `GENERAL`, `ELECTIVE` veya `IGCSE` değerini taşır. Programdaki ayrı seçmeli ve IGCSE adları ayrı ders ID'leridir; not modülündeki ortak hane ilişkisi daha sonra kurulacaktır. Yeni yıl için sınıf/şube tekrar kullanımı ihtiyacı ve önerilen katalog/yıllık ilişki [ayrı incelemede](./legacy-subject-seed-and-year-reuse.md) tutulur.

### `course_offerings`

Bir dersin seçili öğretim yılında hangi sınıf/şubede okutulacağını belirleyen yıllık plandır. Aynı sınıf–ders çifti bir yılda yalnız bir kez bulunur. Öğretmen veya dönem ataması bu tabloya gömülmez; Faz 4'te dönemlik öğretmen görevlendirmeleri bu planı referans alacaktır.

### `lesson_periods`, `lesson_period_translations`

Seçili öğretim yılının günlük zaman dilimlerini sıra, başlangıç ve bitiş saatiyle tutar. `1. Ders`, `Ora e 1-rë`, `Period 1` aynı zaman diliminin çevirileridir. Bitiş başlangıçtan sonra olmalı; arşivlenmemiş zaman dilimleri aynı yıl içinde çakışmamalıdır. Çakışma hem servis sorgusu hem PostgreSQL trigger'ı ile korunur.

Bu kayıtların tamamı kalıcı silme yerine arşivleme/geri alma kullanır. Aktif alt kayıt varken kademe, seviye, şube veya ders arşivlenemez; geri alma sırasında üst ilişkilerin kullanımda olması gerekir. Yazmalar `academics.manage`, origin doğrulaması, Serializable transaction, optimistic revision ve audit kaydıyla yürür.

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
  ├── academic_years ── academic_terms ── academic_term_translations
  │       ├── education_stages ── education_stage_translations
  │       │       └── grade_levels ── class_sections ── course_offerings
  │       └── lesson_periods ── lesson_period_translations
  ├── subjects ── subject_translations ── course_offerings
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
