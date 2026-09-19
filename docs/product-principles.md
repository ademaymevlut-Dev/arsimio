# Ürün ilkeleri

## Ürün tanımı

Arsimio; okullar, çalışanlar, öğretmenler, öğrenciler, veliler ve servis ekipleri için geliştirilen, çok kiracılı bir okul yönetim platformudur. Hedef; modern, hızlı, güvenilir, erişilebilir ve kurum kimliğine uyarlanabilen premium bir deneyim sunmaktır.

## Sıfırdan geliştirme kararı

Arsimio, HorizonEdu'nun doğrudan dönüşümü değildir. Yeni veri modeli, güvenlik sınırları, kullanıcı deneyimi ve uygulama mimarisi güncel ihtiyaçlara göre tasarlanır.

Eski Python/Flask projesinden yalnızca şu amaçlarla yararlanılır:

- Kullanılmış alan adlarını ve okul terminolojisini keşfetmek.
- Varlıklar arasındaki gerçek iş ilişkilerini anlamak.
- Unutulmaması gereken ekranları ve iş akışlarını belirlemek.
- Veri aktarımı gerektiğinde kaynak verinin anlamını çözmek.

Şunlar birebir kopyalanmaz:

- Eski tablo ve sınıf yapıları.
- Rol adlarına bağlı dağınık yetki kontrolleri.
- Sabit parolalar, uygulama sırları veya eski kimlik doğrulama yaklaşımı.
- Tek okul varsayımı ve tenant sınırı olmayan sorgular.
- Eski arayüzün görsel yapısı.

Eski projede bulunmuş olabilecek SMTP, JWT veya benzeri sabit sırlar yeniden kullanılmadan önce değiştirilmelidir.

## Ürün deneyimi ilkeleri

- Her kullanıcı yalnızca görevi için gereken bilgi ve eylemleri görür.
- Mobil, tablet ve masaüstü deneyimi birlikte tasarlanır.
- Kritik işlemlerde sonuç, kapsam ve geri alınabilirlik açıkça gösterilir.
- Formlar anlaşılır hata mesajları, yüklenme durumu ve veri kaybını önleyen davranışlar içerir.
- Klavye kullanımı, renk karşıtlığı ve ekran okuyucu uyumu temel gereksinimdir.
- Okul logosu, renkleri ve alan adı tenant bazında yönetilir; ürünün kullanılabilirliği temadan etkilenmez.
- Liste, arama, filtreleme ve toplu işlem deneyimleri büyük okul verisine göre tasarlanır.

## Teknik kalite ilkeleri

- Tenant izolasyonu yalnızca arayüze veya URL'ye bırakılmaz.
- Yetki kontrolü sunucuda ve eylem seviyesinde yapılır.
- Her önemli değişiklik denetlenebilir olmalıdır.
- Veriler varsayılan olarak arşivlenir; kalıcı silme istisnadır.
- Şema değişiklikleri sürümlü migration'larla yürütülür.
- Yeni modüller küçük, uçtan uca çalışan dilimler halinde teslim edilir.

