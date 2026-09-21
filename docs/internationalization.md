# Çoklu dil mimarisi

Arsimio'nun desteklediği uygulama dilleri `tr`, `sq` ve `en` olarak sabittir. İlk dilim okul girişini, Okul Admin kabuğunu, genel bakışı ve öğretim yılı/dönem çalışma alanını kapsar. Yönetim URL'leri dile göre çoğaltılmaz; `/dashboard` ve `/academics/years` aynı kalır.

## Dil çözümleme sırası

- Giriş öncesinde hostname ile bulunan okulun `default_locale` değeri varsayılandır.
- Kullanıcının dil seçimi bir yıllık, `HttpOnly`, `SameSite=Lax` cookie ile aynı hostname için korunur.
- Okul oturumunda seçim ayrıca `school_memberships.preferred_locale` alanına yazılır. Böylece tercih küresel kullanıcıya değil ilgili okul üyeliğine aittir.
- Desteklenmeyen veya bozuk değerler `tr` değerine düşer. PostgreSQL CHECK constraint'leri okul varsayılanını ve üyelik tercihini `tr/sq/en` ile sınırlar.
- `<html lang>` seçilen dile göre `tr-TR`, `sq-AL` veya `en-US` olur; tarih gösterimi de aynı locale'i kullanır.

## UI metinleri

UI sözlükleri `src/i18n/dictionaries` altında tutulur ve sunucu tarafından dinamik yüklenir. Client bileşenlere yalnız kullanılan, serileştirilebilir sözlük nesnesi geçirilir. Giriş ve akademik Server Action hata/başarı metinleri de istek dilinde döner.

Yeni bir ekran eklenirken metinler JSX içine sabit yazılmaz. Türkçe sözlük tip kaynağıdır; Arnavutça ve İngilizce sözlükler aynı anahtar yapısını TypeScript ile tamamlamak zorundadır.

## Veritabanından gelen çevrilebilir alanlar

İş kavramı ile çeviri birbirinden ayrılır. Her dil için ayrı dönem, ders veya benzeri alan kaydı oluşturulmaz.

```text
academic_terms
  id = tek dönem kimliği
  └── academic_term_translations
        (academic_term_id, locale) = bileşik birincil anahtar
        name
```

`academic_term_translations` ayrıca `school_id` taşır. `(academic_term_id, school_id)` bileşik foreign key'i çevirinin başka okula bağlanmasını engeller. Yeni dönem formu üç adı birlikte zorunlu tutar; servis üç çeviriyi dönem kaydıyla aynı transaction içinde yazar. Okuma sırası istenen dil → okul varsayılan dili → geçiş amaçlı eski `academic_terms.name` alanıdır.

Mevcut `academic_terms.name` alanı ilk i18n migration'ında kaldırılmadı. Uygulama deploy'undan önce migration'ın güvenle uygulanabilmesi için okulun varsayılan dilindeki ad bu alana da yazılır. Alanın kaldırılması ancak bütün okuyucu/yazıcı sürümler çeviri tablosunu kullandıktan sonra ayrı bir daraltma migration'ı ile değerlendirilecektir.

Dönem dili ile dönem seçimi ayrı konulardır. Aynı dönem üç çevrilmiş ada sahip olur; not, yorum, yoklama gibi bir iş kaydı ise kullanıcının seçtiği dile göre değil okulun saat dilimindeki kayıt tarihine göre bu tek dönem ID'sine bağlanır. Aktif öğretim yılının bütün arşivlenmemiş dönemleri birlikte kullanılabilir durumdadır.

Eski iki dönem adı, anlamı tahmin edilmeden yalnız okulun mevcut varsayılan dili olan `tr` için çeviri satırına taşındı. Eksik Arnavutça ve İngilizce adlar yönetici tarafından gerçek karşılıklarıyla tamamlanmalıdır; sistem otomatik çeviri uydurmaz.

## Sonraki çevrilebilir kataloglar

Ders, kademe etiketi ve merkezi ayrılma nedeni gibi kullanıcıya gösterilen sözlükler aynı tek-kimlik + çeviri-tablosu standardını kullanır. Öğretim yılı `2026 / 2027` gibi dile bağlı olmayan bir tanımlayıcı olduğu için bu aşamada çeviri tablosuna ayrılmaz. Öğrenci/öğretmen adı gibi kişi verileri çevrilebilir katalog değildir.

## Doğrulama

- Üç dönem adı tek `academic_term_id` altında oluşturulur.
- Çeviri satırının `school_id` değeri dönem tenant'ıyla eşleşir.
- Bir dil eksikse dönem formu kaydedilmez.
- Dil cookie'si iki okul hostname'i arasında paylaşılmaz.
- Dil değişince UI, `<html lang>`, tarih biçimi ve Server Action mesajları birlikte değişir.
