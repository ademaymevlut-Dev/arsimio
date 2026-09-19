# Kullanıcılar, roller ve yetkiler

## Temel yaklaşım

Arsimio'da rol, kullanıcıya doğrudan sınırsız güç veren bir etiket değildir. Rol; belirli permission'ların yönetilebilir bir paketidir. Yetki kontrolü her zaman kullanıcı, okul, kaynak ve eylem birlikte değerlendirilerek yapılır.

```text
Kullanıcı + aktif okul üyeliği + rol(ler) + permission + kaynak kapsamı
```

Bir kullanıcı:

- Birden fazla okula üye olabilir.
- Her okulda farklı role sahip olabilir.
- Aynı okulda birden fazla rol taşıyabilir.
- Geçici veya kapsamı daraltılmış ek izinlere sahip olabilir.

## Giriş kimliği

- Süper Admin yalnız ana platform domaininde **e-posta + parola** ile giriş yapar.
- Okul Admin, öğretmen, öğrenci, veli ve servis şoförü kendi okul domaininde **kullanıcı adı + parola** kullanır; e-posta zorunlu değildir.
- Kullanıcı adı okul üyeliğine aittir ve okul içinde benzersizdir. İki ayrı okulda aynı kullanıcı adı farklı kişilere ait olabilir.
- Aynı küresel kullanıcının birden fazla okul üyeliği varsa kullanıcı adları/rolleri farklı olabilir; parolası küresel hesap üzerinde ortaktır.
- Mail/SMS doğrulaması şu an istenmez. Hash, oturum, tenant ve sunucu permission kontrolleri geliştirmede de zorunludur.
- Açık kayıt yoktur. İlk yönetici yerel operatör komutuyla etkinleşir; okul kullanıcı oluşturma ekranı sıradaki geliştirmedir. Giriş hesabı oluşturulması tek başına rol/yetki vermez.

Güncel uygulama ve kurulum: [parolalı giriş](./password-auth.md).

## Başlangıç rolleri

### Süper Admin

Platform düzeyindeki kullanıcıdır. Okul oluşturur, okulu etkinleştirir veya askıya alır; alan adı, marka, tema ve platform özelliklerini yönetir. Günlük okul operasyonlarına varsayılan olarak müdahale etmez.

### Okul Admin

Yalnızca üyesi olduğu okulda kullanıcı davetlerini, akademik ana verileri, çalışanları, öğretmenleri ve okul ayarlarını yönetir. Yetkileri okul sınırını aşamaz.

Yönetim, insan kaynakları veya finans gibi bölümler ileride ayrı dev roller yerine permission paketleriyle sınırlandırılabilir.

### Öğretmen

Atandığı sınıf, ders ve öğrenci kapsamındaki yoklama, not, ödev, yorum ve materyal işlemlerini yürütür. Öğrenci hesabını kalıcı silemez ve yetkisi dışındaki akademik kayıtları göremez.

### Öğrenci

Kendi programını, yoklamasını, notlarını, ödevlerini ve izin verilen okul içeriklerini görür. Teslim tarihine kadar ödev taslağı gibi kendi ürettiği sınırlı verileri değiştirebilir.

### Veli

Yalnızca doğrulanmış biçimde ilişkilendirildiği çocukların izin verilen akademik, yoklama ve bildirim verilerini görür. Onay, izin formu veya mesaj gibi tanımlanmış eylemleri yapabilir.

### Servis Şoförü

Yalnızca atandığı rota, sefer, durak ve yolcu listesinin operasyon için gerekli en az bilgisini görür. Biniş/iniş veya sefer durumu kaydedebilir; akademik ve finansal verilere erişemez.

## Permission adlandırma

Permission'lar `kaynak.eylem` biçiminde açıkça adlandırılır. Genel bir `canDelete` veya yalnızca `isAdmin` kontrolü kullanılmaz.

Şemada rol ve permission için `PLATFORM`/`SCHOOL` kapsamı tanımlıdır. Okul rolleri her okul için ayrı oluşturulur; aynı `TEACHER` kodunun farklı okullarda farklı kayıtları vardır. `membership_roles` okul rollerini, `user_roles` platform rollerini bağlar. Veritabanı farklı okul veya kapsamları bağlamayı reddeder. Kullanıcının gerçekten bu yetkiyi kullanıp kullanamayacağı, aktif üyelik ve kaynak kapsamı kontrolüyle uygulamada ayrıca doğrulanacaktır.

Örnekler:

```text
schools.create
school.settings.update
school.branding.update
domains.manage
users.invite
memberships.manage
students.read
students.create
students.update
students.archive
attendance.read
attendance.write
grades.read
grades.write
finance.read
transport.trip.update
audit.read
```

Gerekirse permission'a kaynak kapsamı eklenir: `own`, `linked_children`, `assigned_classes`, `assigned_routes`, `school` veya `platform`.

## Başlangıç yetki matrisi

| İşlem | Süper Admin | Okul Admin | Öğretmen | Öğrenci | Veli | Şoför |
| --- | --- | --- | --- | --- | --- | --- |
| Okul oluşturma/askıya alma | Evet | Hayır | Hayır | Hayır | Hayır | Hayır |
| Alan adı ve marka yönetimi | Evet | Yetkiye bağlı | Hayır | Hayır | Hayır | Hayır |
| Okul kullanıcısı davet etme | Gerektiğinde | Evet | Hayır | Hayır | Hayır | Hayır |
| Ders/sınıf yönetimi | Gerektiğinde | Evet | Atananı okur | Kendi programını okur | Bağlı çocuğu okur | Hayır |
| Yoklama yazma | Hayır | Yetkiye bağlı | Atandığı sınıflar | Hayır | Hayır | Biniş/iniş ayrı izni |
| Not yazma | Hayır | Yetkiye bağlı | Atandığı dersler | Hayır | Hayır | Hayır |
| Öğrenci arşivleme | İstisnai | Evet | Hayır | Hayır | Hayır | Hayır |
| Akademik kayıt kalıcı silme | Onaylı istisna | Hayır | Hayır | Hayır | Hayır | Hayır |
| Okul denetim kayıtlarını okuma | Platform kapsamı | Yetkiye bağlı | Hayır | Hayır | Hayır | Hayır |
| Sefer/rota operasyonu | Hayır | Evet | Hayır | Hayır | Bağlı çocuğu okur | Atandığı rota |

Bu tablo başlangıç politikasıdır. Uygulamadaki gerçek karar permission kayıtlarından gelir.

## Yetki değerlendirme kuralları

- Varsayılan sonuç reddetmektir.
- Kullanıcı aktif, okul aktif ve üyelik aktif olmalıdır.
- Kaydın `school_id` değeri aktif tenant ile uyuşmalıdır.
- Rol kontrolü arayüzde kolaylık sağlar; asıl kontrol sunucuda permission üzerinden yapılır.
- Bir öğretmenin sınıf ataması veya velinin öğrenci bağlantısı gibi kaynak kapsamı ayrıca doğrulanır.
- Permission değişiklikleri ve üyelik işlemleri denetim kaydı üretir.
- Hassas izinler süreli veya ikinci onaylı olarak verilebilir.
- Süper Admin'in tenant verisine destek amacıyla erişimi gerekçe, süre ve denetim kaydı gerektirir.

## Silme özeti

- Normal kullanıcılar kalıcı silme yapmaz.
- Okul Admin çoğu kaydı arşivler; geri alma mümkündür.
- Öğretmen yalnızca izin verilen kendi taslaklarını silebilir veya arşivleyebilir.
- Öğrenci kendi teslim edilmemiş taslağını tanımlı süre içinde silebilir.
- Denetim kayıtları uygulama üzerinden değiştirilemez veya silinemez.
- Kalıcı silme yalnızca yasal saklama politikası, otomatik yaşam döngüsü veya onaylı platform işlemiyle yapılır.
