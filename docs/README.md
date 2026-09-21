# Arsimio dokümantasyonu

Bu klasör, Arsimio'nun ürün kararlarını, teknik mimarisini, veri güvenliği kurallarını ve geliştirme ilerlemesini tek yerde tutar.

Arsimio sıfırdan geliştirilen yeni bir üründür. Eski HorizonEdu/Flask projesi; alan adlarını, iş ilişkilerini, ekran ihtiyaçlarını ve geçmişte edinilen alan bilgisini anlamak için referanstır. Eski kod, güvenlik yaklaşımı veya mimari birebir taşınmaz.

## Belgeler

- [Ürün ilkeleri](./product-principles.md): Yeni ürün yaklaşımı ve eski projeden yararlanma sınırları.
- [Teknik mimari](./architecture.md): Çok kiracılı yapı, istek akışı ve güvenlik katmanları.
- [Kullanıcılar, roller ve yetkiler](./users-roles-permissions.md): Roller, izin modeli ve temel yetki matrisi.
- [Veri modeli](./data-model.md): Çekirdek tablolar, ilişkiler ve veri modelleme standartları.
- [Eski sistem veri modeli incelemesi](./legacy-data-model-review.md): HorizonEdu'nun 46 modeli, kayıt/yıl geçişi/program akışları, 27 bulgu ve yeni akademik çekirdek için görüşme zemini.
- [Eski sistem canlı veri incelemesi](./legacy-live-data-review.md): 447 öğrenci/1.051 yıllık kayıt, öğretmen/program sayımları, gerçek yıl geçişleri ve 10 canlı bulgu; doğrudan SQL doğrulaması açık.
- [Migration çalışma düzeni](./database-migrations.md): Artımlı şema geliştirme, uygulanan migration, SQL kısıtları ve doğrulama.
- [İki okul pilotu](./two-school-pilot.md): Sıradaki teslim; iki domain, markalı giriş, üyelik/yetki ve veri izolasyonu kabul planı.
- [Pilot kurulum ve doğrulama](./pilot-setup.md): Canlı adresler, ilk hesap aktivasyonu, komutlar ve açık kabul işleri.
- [Parolalı giriş](./password-auth.md): Süper Admin e-posta, okul kullanıcı adı politikası; hash/oturum ve terminalden ilk aktivasyon.
- [Süper Admin çalışma alanı](./platform-workspace.md): İlk yönetim teması, iki mevcut okulun detayları, kaydedilebilir marka renkleri ve ilk Okul Admin hesabı; logo/görseller sonraki aşama.
- [Ortak tasarım sistemi](./design-system.md): Eski projeden taşınan açık palet, ortak durum renkleri, UI Kit ve bileşen doğrulaması.
- [Çoklu dil mimarisi](./internationalization.md): Türkçe/Arnavutça/İngilizce UI sözlükleri, okul/üyelik dil tercihi ve tek iş kaydına bağlı DB çeviri tabloları.
- [Okul Admin faz planı](./school-admin-plan.md): Yerelde tamamlanan `1400px` Faz 0 kabuğu ve tablo temeli; akademik yapıdan servis modülüne uzanan bağımlılık sıralı geliştirme planı.
- [Denetim, geçmiş ve veri yaşam döngüsü](./audit-history-data-lifecycle.md): İşlem geçmişi, silme, geri alma ve kalıcı silme kuralları.
- [Yol haritası](./roadmap.md): Tamamlanan, sıradaki ve ileride yapılacak işler.
- [Çalışma günlüğü](./work-log.md): Tarih sırasıyla alınan kararlar ve yapılan işlemler.

## Durum etiketleri

- `TAMAMLANDI`: Uygulandı ve doğrulandı.
- `SIRADAKİ`: Bir sonraki geliştirme diliminde ele alınacak.
- `PLANLANDI`: Kapsamı belli, henüz başlanmadı.
- `ARAŞTIRMA`: Teknik doğrulama veya ürün kararı gerekiyor.
- `DEVAM EDİYOR`: Bir kısmı uygulandı; tam kabul ölçütleri henüz kapanmadı.
- `BLOKE`: Dış bağımlılık ya da kullanıcı kararı bekliyor.

## Güncelleme kuralı

Her anlamlı geliştirmede:

1. Yapılan iş [çalışma günlüğüne](./work-log.md) eklenir.
2. İlgili madde [yol haritasında](./roadmap.md) güncellenir.
3. Mimari veya güvenlik kararı değiştiyse ilgili belge de aynı değişiklik içinde güncellenir.
4. Geçici fikirler kesin karar gibi yazılmaz; `ARAŞTIRMA` olarak işaretlenir.
