# Arsimio yol haritası

Bu belge yaşayan plandır. Sıralama, güvenli bir temel üzerinde küçük ama uçtan uca çalışan ürün dilimleri üretmek için tasarlanmıştır.

## Sıradaki teslim — İki okul pilotu

Faz 1 ve Faz 2'nin minimum çalışan kapsamı birlikte teslim edilecek: iki kurgusal okul, aynı Vercel projesine bağlı iki adres, ayrı marka/giriş, okul bazlı yetkiler ve denetlenmiş veri izolasyonu. Ayrıntılı sıra ve kabul testleri [iki okul pilotu planında](./two-school-pilot.md).

Sıra: ortam/domain doğrulaması → iki okul seed'i ve tenant çözümleme → parolalı giriş ve yetki → kullanıcı/okul yönetimi ve audit → DB izolasyonu → iki adreste uçtan uca kabul. Domain/marka dilimi yayında. Süper Admin için e-posta, okul kullanıcıları için username ile parolalı giriş kodu ve migration tamamlandı; henüz gönderilmedi. Hesap aktivasyonu ve tam pilot kabulü açık. Ayrıntılar [kurulum notlarında](./pilot-setup.md) ve [giriş kararında](./password-auth.md).

## Faz 0 — Proje temeli

- [x] `TAMAMLANDI` Next.js 16, TypeScript, Tailwind CSS ve shadcn/ui temeli kuruldu.
- [x] `TAMAMLANDI` GitHub deposu bağlandı ve ilk proje gönderildi.
- [x] `TAMAMLANDI` Vercel projesi oluşturuldu ve yerel proje bağlandı.
- [x] `TAMAMLANDI` Neon `neon-arsimio` veritabanı Vercel'e bağlandı.
- [x] `TAMAMLANDI` Yerel ortam değişkenleri alındı ve veritabanına `SELECT 1` ile bağlantı doğrulandı.
- [x] `TAMAMLANDI` Eski Flask backend'in ana modül ve model envanteri incelendi.
- [x] `TAMAMLANDI` Mimari, kullanıcı/yetki, veri modeli ve denetim yaklaşımı belgelendi.
- [ ] `SIRADAKİ` Eski projede kullanılmış olabilecek SMTP/JWT sırlarını değiştir ve geçersiz kıl.

## Faz 1 — Tenant, kimlik ve güvenlik çekirdeği

- [x] `TAMAMLANDI` Prisma ORM, Neon adaptörü, `schema.prisma` ve migration komut düzenini kur.
- [x] `TAMAMLANDI` İlk çekirdek şema taslağını oluştur: okullar, alan adları, kullanıcılar, üyelikler, roller, permission'lar, davetler ve audit events.
- [x] `TAMAMLANDI` İlk migration SQL'ini incele, tenant/audit kısıtlarını ekle ve Neon'a uygula (2026-09-19).
- [x] `TAMAMLANDI` Okullar arası rol/davet bağlantıları, permission kapsamı ve append-only audit için DB bütünlük testleri.
- [x] `TAMAMLANDI` Tekrarlanabilir pilot seed'i: iki okul, başlangıç rol/permission'ları ve PENDING Süper Admin rezervasyonu; build sırasında çalışmaz.
- [x] `TAMAMLANDI` İlk tenant context ve aktif üyelik/permission gerektiren panel guard'ları.
- [x] `TAMAMLANDI` Doğrulanmış hostname çözümlemesi ve aynı Arsimio projesindeki HorizonEdu/GjimCamEdu domainleri.
- [x] `TAMAMLANDI` E-posta/username ayrımı, scrypt parola hash'i, DB oturumları ve bir defalık terminalden Süper Admin aktivasyon kodu.
- [x] `TAMAMLANDI` `password_auth` migration'ı, hesap/okul bazlı rate limit, sunucu origin kontrolü, giriş/çıkış audit ve rollback'li auth DB testleri.
- [ ] `SIRADAKİ` Yeni kodun GitHub/Vercel yayını; Süper Admin'in kendi terminalinde ilk parolasını belirlemesi ve canlı giriş/çıkış kabul testi.
- [ ] `SIRADAKİ` Development/preview/production DB branch ayrımını kur ve doğrula; şu an ortak başlangıç bağlantısı kullanılıyor.
- [ ] `PLANLANDI` Gerçek okul kabulünden önce özel test alan adı ve Safari oturum provasını tamamla.
- [ ] `PLANLANDI` İlk panel guard'larını bütün iş modüllerinin Server Action ve Route Handler'larına genişlet.
- [ ] `PLANLANDI` Seed/ilk admin aktivasyonunda çalışan transactional audit yazımını iş modüllerine genişlet; arşivleme ve geri alma ekle.
- [ ] `PLANLANDI` Oturum bazlı okuma/yazma izolasyon testleri, kısıtlı runtime DB rolü ve PostgreSQL RLS politikaları.

## Faz 2 — Okul kurulumu ve premium uygulama kabuğu

- [ ] `SIRADAKİ` Süper Admin okul oluşturma ve ilk Okul Admin'i kullanıcı adı/parola ile tanımlama ekranı (mail/SMS bağımlılığı yok).
- [x] `TAMAMLANDI` İki farklı marka rengiyle responsive giriş ve korumalı ilk panel sayfaları.
- [ ] `PLANLANDI` Okul alan adı doğrulama ve durum yönetimi.
- [ ] `PLANLANDI` Logo yükleme ve marka/tema yönetim ekranları (ilk renkler DB'den okunuyor).
- [ ] `PLANLANDI` Rol bazlı navigasyon, responsive dashboard ve erişilebilir tasarım sistemi.
- [ ] `PLANLANDI` Okul ayarları, saat dilimi, dil ve akademik takvim başlangıcı.
- [ ] `PLANLANDI` Denetim geçmişi görüntüleme ekranı.

## Faz 3 — Kullanıcı ve akademik çekirdek

- [ ] `PLANLANDI` Pilotun kullanıcı oluşturma/üyelik/rol akışını genişlet; ayrıntılı kullanıcı yönetimi ve kaynak bazlı yetkiler.
- [ ] `PLANLANDI` Parola değiştirme/sıfırlama ve oturum iptali. Mail/SMS, davet teslimi ve MFA daha sonra eklenecek.
- [ ] `PLANLANDI` Çalışan ve öğretmen profilleri.
- [ ] `PLANLANDI` Öğrenci ve veli profilleri ile doğrulanmış bağlantılar.
- [ ] `PLANLANDI` Akademik yıl, dönem, sınıf, şube ve dersler.
- [ ] `PLANLANDI` Öğrenci kayıtları ve öğretmen atamaları.
- [ ] `PLANLANDI` Toplu içe aktarma için doğrulama ve hata raporu.

## Faz 4 — İlk uçtan uca okul iş akışı

İlk dikey dilim olarak yoklama önerilir; rollerin, tenant izolasyonunun, mobil kullanımın, bildirim ihtiyacının ve audit geçmişinin birlikte sınanmasını sağlar.

- [ ] `PLANLANDI` Öğretmenin atanmış sınıf listesini görmesi.
- [ ] `PLANLANDI` Günlük/ders bazlı yoklama kaydetmesi.
- [ ] `PLANLANDI` Düzeltme gerekçesi ve geçmişi.
- [ ] `PLANLANDI` Öğrenci ve velinin izin verilen yoklama özetini görmesi.
- [ ] `PLANLANDI` Okul Admin raporu ve dışa aktarma.

## Faz 5 — Eğitim, iletişim ve operasyon modülleri

- [ ] `PLANLANDI` Program yönetimi.
- [ ] `PLANLANDI` Sınav, değerlendirme ve notlar.
- [ ] `PLANLANDI` Ödev, teslim ve materyaller.
- [ ] `PLANLANDI` Yorum, davranış ve bildirimler.
- [ ] `PLANLANDI` Finans modülü.
- [ ] `PLANLANDI` Servis, rota, sefer ve biniş/iniş takibi.

## Faz 6 — Geçiş ve ölçekleme

- [ ] `PLANLANDI` Eski veri alanlarının kaynak-hedef eşleme belgesi.
- [ ] `PLANLANDI` Temizleme, dönüştürme, prova aktarımı ve mutabakat raporu.
- [ ] `PLANLANDI` Gözlemlenebilirlik, hata izleme, yedekleme ve geri yükleme tatbikatı.
- [ ] `PLANLANDI` Performans, erişilebilirlik ve güvenlik kontrolleri.
- [ ] `PLANLANDI` IP/WAF giriş koruması, session/throttle kayıt temizliği ve canlı kullanım öncesi güvenlik kabulü.
- [ ] `PLANLANDI` Saklama/anonymization politikalarının ülke ve sözleşmeye göre kesinleştirilmesi.

## İlk teslim ölçütü

Faz 1 ve Faz 2'nin pilot kapsamı, aşağıdaki senaryo kurgusal test verisiyle iki ayrı okul adresinde güvenli biçimde çalıştığında tamamlanır. Gerçek öğrenci/veli verisi, runtime DB yetkileri ve izolasyon testleri tamamlanmadan alınmaz:

1. Süper Admin bir okul oluşturur.
2. Okul doğrulanmış alan adından açılır.
3. Yetkili yönetici tarafından tanımlanan Okul Admin kullanıcı adı/parola ile kendi okuluna giriş yapar.
4. Yetkili bir kayıt oluşturur ve günceller.
5. Başka okulun kullanıcısı kaydı okuyamaz veya değiştiremez.
6. Değişiklik actor ve önce/sonra bilgisiyle denetim geçmişinde görünür.
7. Kayıt arşivlenebilir ve yetkili kullanıcı tarafından geri alınabilir.
8. İki okulun adı/markası, oturum bağlamı ve önbelleği birbirine karışmaz.
9. Yeni deployment sonrasında iki test domaini de hedeflenen güncel sürümü açar.

Akademik modüllere pilot kabulünden sonra geçilir. Gerçek okulların özel domainle kabulü ayrıca gerçek özel test alan adı provasını gerektirir.
