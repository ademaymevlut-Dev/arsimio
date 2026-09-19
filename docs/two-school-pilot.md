# İki okul pilotu — domain, giriş ve tenant izolasyonu

Tarih: 2026-09-19. Durum: `DEVAM EDİYOR`; okul/domain altyapısı ve ilk giriş ekranları yayında. Tam pilot kabulü henüz tamamlanmadı.

Güncel karar: mail/SMS ve Neon Auth tabanlı aktivasyon ertelendi. Süper Admin e-posta + parola, bütün okul rolleri username + parola kullanır. Kod ve ikinci migration tamamlandı; yeni giriş kodu henüz yayımlanmadı. [Parolalı giriş](./password-auth.md) bu konudaki güncel kaynaktır; çalışma günlüğündeki önceki provider denemeleri tarihsel kayıttır.

## Hedef ve mevcut durum

İlk çalışan ürün dilimi: iki örnek okulun farklı adreslerden, kendi markası ve giriş ekranıyla aynı Arsimio uygulamasını kullanması; kullanıcıların yalnızca yetkili oldukları okulun verilerine erişmesi.

Mevcut 16 uygulama tablosu bu pilotun çekirdeği için yeterlidir. Çekirdek ve parolalı giriş migration'ları, ilişkisel bütünlük ve auth DB testleri tamamlandı. İki okul, doğrulanmış domainler, rol/permission seed'i, hostname çözümleme, markalı giriş, kontrollü terminal bootstrap'ı ve korumalı ilk panel sayfaları uygulandı. Seed, bootstrap ve giriş/çıkış audit üretir. Bu, bütün eğitim/operasyon tablolarının veya aşağıdaki tam kabul senaryosunun tamamlandığı anlamına gelmez. Okul Admin oluşturma, üyelik yönetimi, yönetim yazma akışları ve canlı oturumlu izolasyon testleri bekliyor. Güncel operasyon ve doğrulama kaydı: [pilot kurulum notları](./pilot-setup.md).

## Temel kararlar

- Tek kod tabanı, tek Vercel projesi ve aynı ortamda ortak Neon veritabanı kullanılacak. Her okul için ayrı uygulama kopyası oluşturulmayacak.
- Okul, doğrulanmış hostname üzerinden bulunacak; `school_id` kullanıcı isteğinden alınarak güvenilir kabul edilmeyecek.
- Kullanıcı kimliği küresel; üyelik ve yetkiler okul bazlı olacak. Aynı kişi iki okulda farklı rollere sahip olabilecek.
- Giriş ekranlarının bileşenleri ortak, okul adı/logo/renkleri farklı olacak. Pilot, okulların tanıtım sitelerini veya sayfa oluşturucusunu kapsamayacak.
- Süper Admin platform kontrol panelini kullanacak. Platform rolü, okulun günlük işlemlerine sessizce sınırsız erişim sağlamayacak.
- Başlangıçta yetkili yöneticinin hesap oluşturması kullanılacak; açık kayıt formuyla okul üyeliği veya yönetici yetkisi edinilemeyecek. Mail/SMS ile davet teslimi sonraya bırakıldı.
- İlk pilotta domainler arasında otomatik tek oturum açma (SSO) hedeflenmeyecek. Her okul adresindeki uygulama oturumu ayrı doğrulanacak; okul erişimi her istekte yeniden denetlenecek.

## Adres ve ekran düzeni

Aşağıdaki adresler kullanıcı tarafından seçildi ve aynı Arsimio Vercel projesine bağlandı. İki okul domaini Vercel proje sahipliği/doğrulaması ve HTTPS erişimi kontrol edildikten sonra DB'de `VERIFIED` olarak kaydedildi.

| Alan | Canlı adres | İlk dilimde içerik |
| --- | --- | --- |
| Platform yönetimi | `arsimio.vercel.app/platform` | Süper Admin: korumalı okul/domain listesi; diğer yönetim işlemleri sıradaki |
| HorizonEdu | `horizonedu.vercel.app` | Mavi markalı giriş, üyelik/permission gerektiren panel temeli |
| GjimCamEdu | `gjimcamedu.vercel.app` | Yeşil markalı giriş, üyelik/permission gerektiren panel temeli |

Okul adreslerinde `/` markalı karşılama, `/login` giriş, `/dashboard` korumalı panel olacak. Girişten sonra kullanıcı aynı okul adresinde kalacak. Okul adresinden `/platform` açılması platform yetkisi sağlamayacak; platform paneli ayrıca tanımlı ana hostname ve platform yetkisiyle sınırlandırılacak.

Vercel tarafında iki uygun `.vercel.app` adı aynı Arsimio projesine domain/alias olarak bağlanacak. Kalıcı proje domain bağlantısı tercih edilecek; tek bir deployment'a verilmiş manuel alias'ın sonraki yayında güncellendiği varsayılmayacak. Güncel sürümün iki adreste de açılması teslim testidir. Kullanılan ad başkasına aitse yeni bir isim seçilecek; başka projeden domain taşınmayacak.

`okul-a.arsimio.vercel.app` gibi iç içe adreslerin otomatik çalıştığı varsayılmayacak. Gerçek okul domainleri daha sonra aynı `school_domains` eşlemesine bağlanacak; kodun okul başına değişmesi gerekmeyecek. İki `.vercel.app` adresinin geçmesi, farklı kök alan adında bütün auth/DNS senaryolarının kanıtı sayılmayacak. Gerçek okul kabulünden önce bize ait bir özel test alan adıyla da prova yapılacak.

## Geliştirme sırası

### 1. Ortam, domain ve kimlik doğrulama ön kontrolü

- Arsimio Vercel projesinin, hedef deployment'ın ve Neon ortamının eşleşmesini doğrula. Diğer projelerin domain, entegrasyon ve ortam değişkenlerini değiştirme.
- Geliştirme/preview ile canlı ortamın veritabanı bağlantılarını ayır; entegrasyonun otomatik branch ayarlarını mevcut kabul etmeden kontrol et.
- İki test adresinin uygunluğunu ve aynı projeye bağlanmasını doğrula.
- Yerel parolalı giriş kararını iki hostname'de doğrula: platform e-posta, okul username, giriş/çıkış ve oturum izolasyonu. Mail/SMS doğrulaması bu dilime dahil değildir.
- Safari dahil çerez davranışını ve özel domain desteğini doğrula. Kendiliğinden yeni ücretli auth servisi oluşturma.
- Arsimio scrypt hash ve DB session kullanır; okul üyelikleri ve permission'lar yine Arsimio tablolarıdır. Kullanılmayan dış `neon_auth` tablolarını Prisma migration'larıyla değiştirme.

Çıktı: doğrulanmış ortam/adres listesi ve auth karar kaydı. Nihai auth entegrasyonuna geçiş için bu kontrol tamamlanmalıdır.

### 2. İki okul ve tenant altyapısı

- Tekrar çalıştırıldığında kopya üretmeyen seed ile iki kurgusal okul, farklı marka renkleri, güvenli yerel demo görselleri ve başlangıç rol/permission kayıtları oluştur.
- Platform `SUPER_ADMIN` rolünü, okul rollerinden ayrı tut. Her okul için `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`, `GUARDIAN`, `DRIVER` rol kayıtlarını oluştur; henüz geliştirilmemiş modüllere çalışan özellik görüntüsü verme.
- Okul domain kaydını önce `PENDING` oluştur. Vercel bağlantısı/sahipliği ve TLS doğrulandıktan sonra `VERIFIED` ve ana domain yap; seed içinde körlemesine doğrulanmış sayma.
- Hostname normalizasyonu ve tam eşleşme üzerinden tenant context oluştur. Bilinmeyen/devre dışı domain veya askıya alınmış okul güvenli biçimde reddedilsin; varsayılan başka okula düşmesin.
- Nihai tenant ve yetki kontrolleri sunucu veri erişim katmanında çalışsın. İlk dilimde doğrudan bu katman uygulandı; `src/proxy.ts` gerekmedi. İleride eklenirse yalnızca erken yönlendirme gibi hafif ağ işleri yapsın.
- İstemciden gelen okul header'ını veya query/body içindeki okul kimliğini yetki kaynağı kabul etme. Doğrudan iç rotalara erişim ve proxy atlama da tenant denetimini geçemesin.
- Domain/marka önbelleği okul ve hostname kapsamlı olsun; domain kapatma ve okul askıya alma değişiklikleri erişime zamanında yansısın. Oturumlu içerik ortak cache'e girmesin.

Çıktı: iki adreste doğru okul adı/markası; bilinmeyen adreste erişim yok. Demo seed canlı ortamda build sırasında otomatik çalıştırılmayacak.

### 3. Giriş, kullanıcı oluşturma ve yetki bağlama

- Platformda e-posta + atanmış SUPER_ADMIN rolü, okulda `(school_id, username)` üzerinden kimliği çöz. Parola doğrulamasını sunucuda yap. E-posta eşitliği hesap birleştirme veya yetki verme gerekçesi olmasın.
- İlk Süper Admin parolasını bir defalık yerel operatör komutuyla belirle. İlk kayıt olan kişiyi otomatik Süper Admin yapma; depo/seed içinde parola tutma.
- Yetkili kullanıcı yönetimi ekranında her okul için bir Okul Admin; ayrıca okul dışı erişimi ve iki okulda farklı rolü sınayan test kimlikleri oluştur. Şu an bu hesaplar henüz oluşturulmadı.
- Mail/SMS ve davet kabulü sonra: token, son kullanma, iptal, alıcı ve okul kapsamı kontrolleriyle tek kullanımlık akış. Davet tabloları bu amaçla korunur.
- Aktif kullanıcı + aktif okul + aktif üyelik + permission + hedef kayıt okulu kontrollerini merkezi sunucu yardımcılarında uygula. UI'da düğme gizlemek yeterli değil.
- Rol/üyelik iptalini eski oturumla aşmayı engelle. Yanlış okulda giriş yapan kullanıcıya o okulun özel verilerini göstermeden erişim reddi sun.
- Cookie kapsamını ilgili hostla sınırla; domainler arası ortak cookie varsayma. Dönüş URL'leri doğrulanmış izin listesine ve güvenli bağlama dayansın; açık yönlendirme ve CSRF testleri olsun.

Çıktı: iki farklı okulun giriş/çıkış akışı ve farklı yetkileri; aynı kullanıcının A'daki yetkisi B'ye taşınmıyor.

### 4. Minimum yönetim ekranları ve premium kabuk

- Süper Admin: okul listesi, okul oluşturma, durum değiştirme, domain durumu, marka ayarları ve ilk Okul Admin hesabı oluşturma. İlk pilotta DNS/Vercel doğrulaması kontrollü operasyon adımı olabilir; tam otomatik domain provisioning sonraki geliştirmedir.
- Okul tarafı: logo/renklerle markalı giriş, responsive ortak panel kabuğu, profil/çıkış ve izin bazlı menüler. Öğretmen, öğrenci, veli ve şoför için rol uygun boş durumlar; hayali not/yoklama verisi yok.
- İlk gerçek yazma senaryosu: izinli okul ayarını güncelleme ve yetkili kullanıcı oluşturma/üyelik yönetimi. Okul Admin platform rolü atayamasın veya kendi yetki sınırını yükseltemesin.
- Marka/domain yönetimi varsayılan olarak Süper Admin'de; Okul Admin'e yalnızca açıkça izin verilirse açılacak.
- İş değişikliği ve audit kaydı aynı transaction içinde yazılsın. Kim, hangi okulda, neyi değiştirdi görülebilsin; parola/token/oturum sırrı audit'e yazılmasın.
- Yetkili kullanıcı için salt okunur okul audit ekranı. Üyelik arşivleme/geri alma, sunucu yetkisi ve audit ile sınansın; kalıcı silme ekranı yapılmasın.
- Pilot logo farkı yerel demo varlıklarıyla gösterilebilir. Gerçek dosya yükleme için nesne depolama, dosya doğrulama ve tenant sahipliği ayrı kapsam olarak eklenecek.

Çıktı: sadece iki farklı giriş tasarımı değil, yetkilendirilmiş ve geçmişi tutulan çalışan yönetim akışı.

### 5. Veri izolasyonu ve güvenlik kapısı

- Bütün okul sorguları merkezi, `school_id` kapsamlı veri erişiminden geçsin; liste, detay, güncelleme, arşivleme ve audit okuma dahil.
- Migration/owner kimliğiyle çalışan uygulama yerine kısıtlı runtime DB rolü ve tenant tablolarında uygun PostgreSQL RLS politikaları oluştur. Bu değişiklikler ayrı, incelenmiş migration ile ilerlesin.
- Pooled bağlantıda tenant bağlamı transaction-local olsun; sonraki isteğe taşınmasın. Runtime rolü tablo sahibi veya RLS bypass yetkili olmasın.
- Giriş öncesi hostname/marka bulma ve platform okul yönetimi için gereken sınırlı erişim açıkça tasarlansın; bunları çözmek için bütün runtime'a sınırsız yetki verme.
- Mevcut ilişkisel DB testlerini koru; bunların oturumlu erişim testlerinin yerine geçmediğini kabul et.

Çıktı: aşağıdaki olumsuz erişim testleri geçiyor. Gerçek öğrenci/veli verisi bu kapı tamamlanmadan alınmayacak.

### 6. Vercel uçtan uca kabul ve belge güncellemesi

| Senaryo | Beklenen sonuç |
| --- | --- |
| A/B adresleri ve yenilenen deployment | Doğru marka, doğru okul; iki adres de hedeflenen güncel sürümde |
| Oturumsuz panel veya doğrudan API isteği | Özel veri yok; giriş yönlendirmesi veya uygun erişim hatası |
| A Admin'in B kaydını kimliğiyle istemesi/değiştirmesi | Okuma ve yazma reddediliyor; B verisi sızmıyor |
| A'da Admin, B'de Öğretmen olan aynı kişi | B'de yönetici işlemi yapamıyor |
| Öğrenci/veli/şoför rolüyle admin endpoint'i | Arayüzden bağımsız olarak sunucuda reddediliyor |
| Üyelik/kullanıcı/okul askıya alma veya domain kapatma | Önceki oturum erişimi sürdürmüyor |
| Parola/oturum hatalı, süresi geçmiş, iptal edilmiş veya başka okula ait | Kabul edilmiyor; kimse yetki yükseltemiyor |
| İki okul sekmesi, cache ve pooled DB istekleri | Marka, oturum bağlamı veya veri okullar arasında karışmıyor |
| Ayar değişikliği ve üyelik arşivleme/geri alma | Yetkili işlem başarılı; doğru actor ve okul ile audit kaydı var |
| Okul Admin'in platform paneline doğrudan erişimi | Platform işlemi ve platform verisi yok |

Testler yalnız tarayıcı ekranına bakılarak tamamlanmış sayılmayacak: sunucu/API, veri erişimi ve kısıtlı DB rolü testleri de çalışacak. Sonuçlar çalışma günlüğüne yazılacak. Sahip olduğumuz gerçek özel alan adı yoksa ilgili auth/domain testi açık iş olarak kalacak; gerçek okul onboarding'i için kapanması gerekecek.

## Pilot sonrasında

İki okul pilotu kabul edildiğinde sıradaki modül akademik çekirdektir: akademik yıl/dönem → sınıf/şube/ders → öğretmen/öğrenci/veli profilleri → kayıtlar ve atamalar. Sonrasında ilk tam eğitim iş akışı olarak yoklama geliştirilecek. Not, ödev, finans ve servis modülleri bu temelin ardından gelecek.

Şema yalnız ihtiyaç doğduğunda, anlamlı özellik migration'larıyla büyütülecek; mevcut migration yeniden yazılmayacak. Parolalı giriş için ikinci migration eklendi. RLS/izin değişiklikleri de SQL migration gerektirebilir.

## Kesinleştirilecek bilgiler

- İki test hostname'i kesinleşti ve bağlandı; sonraki özel domainler ayrıca doğrulanacak.
- Süper Admin e-postası kullanıcı onayıyla ortam değişkenine kondu ve `PENDING` hesabı ayrıldı; sahibinin yerel terminalde parola belirlemesi bekliyor. İki Okul Admin test kimliği henüz belirlenmedi; şifreler belgeye yazılmayacak.
- Parolalı giriş kararı kesinleşti; yeni kodun yayını ve canlı kabul testi bekliyor.
- Gerçek özel domain provası için sahip olunan test adresi.

Bu bilgiler olmadan mimari/tenant yardımcıları tasarlanabilir; dış servis bağlantıları ve gerçek hesap davetleri varsayımla yapılmayacak.

## Resmî kaynaklar

- [Vercel multi-tenant yaklaşımı](https://vercel.com/solutions/multi-tenant-saas): aynı proje üzerinden birden fazla tenant/domain.
- [Vercel domain ekleme](https://vercel.com/docs/domains/working-with-domains/add-a-domain): proje domainleri ve doğrulama.
- [Vercel alias komutu](https://vercel.com/docs/cli/alias): deployment'a alias bağlama; proje domain yönetiminden farkı.
- [Vercel alias uygunluk hataları](https://vercel.com/kb/guide/how-to-resolve-alias-errors-on-vercel): `.vercel.app` adının başkasında kullanımda olması.
