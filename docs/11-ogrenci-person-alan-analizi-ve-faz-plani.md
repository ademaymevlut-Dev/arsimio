# 11 — Öğrenci, kişi ve veli alan analizi / faz planı

Tarih: 2026-10-05  
Durum: `İNCELEME / İLK FAZ ÖNERİSİ`

Bu doküman, `10-eksik-alanlar-ve-modul-karar-sorulari.md` cevaplarından sonra hazırlandı. Özellikle eski Flask projesindeki öğrenci kayıt alanları ile yeni Next.js/Prisma veri modeli karşılaştırıldı.

Amaç, kodlamaya başlamadan önce şunu netleştirmek:

- Eski projeden hangi alanlar yeni sisteme taşınmalı?
- Hangi alanlar zaten yeni sistemde var?
- Hangi alanlar yeni mimaride farklı tabloya taşınmalı?
- Hangi alanlar finans/kontrat modülüne ertelenmeli?
- İlk kodlama fazı güvenli olarak nereden başlamalı?

## 1. İncelenen eski dosyalar

Eski proje tarafında özellikle şu dosyalar incelendi:

- `horizonedu/backend/app/modeller/models.py`
- `horizonedu/backend/app/blueprints/students/routes.py`
- `horizonedu/backend/app/templates/admin_tem/student_list.html`

Yeni proje tarafında özellikle şu alanlar incelendi:

- `prisma/schema.prisma`
- `src/components/school-admin/student-registration-form.tsx`
- `src/lib/student-validation.ts`
- `src/server/students/student-service.ts`
- `src/server/students/students.ts`

## 2. Eski öğrenci ana kartı alanları

Eski model: `student_tbl`

| Eski alan | Eski anlamı | Yeni sistemde durum | Öneri |
| --- | --- | --- | --- |
| `stu_date_reg` | kayıt tarihi | `StudentProfile.admittedOn`, `Enrollment.enrolledOn` var | Var, korunsun |
| `stu_reg_class` | kayıt olunan sınıf/kademe | yeni sistemde sınıf `StudentGroupPlacement` üzerinden tutuluyor | Ayrı alan gerekmez |
| `stu_persid` | personel/personal no gibi kullanılmış; öğrenci kimlik no | `PersonIdentity` var | Var; UI’da kimlik/pasaport alanı olarak kalmalı |
| `stu_name` | ad | `Person.firstName` var | Var |
| `stu_surname` | soyad | `Person.lastName` var | Var |
| `stu_father` | baba adı | artık baba ayrı `Person` + `GuardianRelationship` | Eski tek metin alan taşınmamalı |
| `stu_mother` | anne adı | artık anne ayrı `Person` + `GuardianRelationship` | Eski tek metin alan taşınmamalı |
| `stu_profession` | eski formda “Profession” | yeni sistemde yok | Anlamı net değil; öğrenci alanı olarak doğrudan taşımayalım |
| `stu_gender` | cinsiyet | `Person.sex` var | Var |
| `stu_birthday` | doğum tarihi | `Person.birthDate` var | Var |
| `stu_borned` | doğum yeri | `Person.birthPlace` var | Var |
| `stu_nationaly` | uyruk | `Person.nationalityText` var | Var |
| `stu_rezidence` | şehir/ikamet | yok | Öğrenci adres alanına eklenmeli |
| `stu_lagja` | mahalle | yok | Öğrenci adres alanına eklenmeli |
| `stu_adresses` | açık adres | yok | Öğrenci adres alanına eklenmeli |
| `stu_phones1` | telefon 1 | yeni sistemde veli kişi kontaktları var | Öğrenci kartına ayrıca eklemeyelim |
| `stu_phones2` | telefon 2 | yeni sistemde veli kişi kontaktları var | Öğrenci kartına ayrıca eklemeyelim |
| `stu_email1` | e-posta 1 | yeni sistemde veli kişi kontaktları var | Öğrenci kartına ayrıca eklemeyelim |
| `stu_email2` | e-posta 2 | yeni sistemde veli kişi kontaktları var | Öğrenci kartına ayrıca eklemeyelim |
| `stu_situation` | Active/passive durum | `StudentStatus` var ama eksik | `WITHDRAWN`, `TRANSFERRED` eklenmeli |
| `studpass_hash` | öğrenci portal şifresi | yeni sistemde `PersonAccount`/`UserCredential` var | Var, eski alan taşınmaz |

### Yorum

Yeni mimari doğru yönde: öğrenci artık tek başına dev bir tablo değil; gerçek kişi, öğrenci profili, veli ilişkisi, sınıf yerleşimi ve portal hesabı olarak ayrılmış.

Eksik olan kısım, eski öğrenci formunda bulunan bazı okul operasyon alanlarının yeni modele henüz eklenmemiş olmasıdır:

- öğrenci adresi
- özel durum / yönetim notu
- öğrenci fotoğrafı
- önceki okul / fletaparaqite bilgileri
- öğrenci durumları: transfer oldu / okuldan ayrıldı

## 3. Adres alanı

Eski sistemde adres öğrenci kartı içinde tutulmuş:

- `stu_rezidence`
- `stu_lagja`
- `stu_adresses`

Senin cevabına göre adres öğrenci kayıt ekranında olmalı; veli kartında tekrar adres açmaya gerek yok.

### Öneri

Adres alanlarını `StudentProfile` üzerinde tutalım:

- `residenceCity`
- `neighborhood`
- `addressLine`

Neden `Person` üzerinde değil?

- Aynı gerçek kişi ileride personel/veli/öğrenci rolleri alabilir.
- Öğrenci adresi okul kayıt operasyonuna ait bir bilgi.
- Veli adresi ayrı istenmedi.
- Finans/fatura modülünde gerekirse ayrıca fatura adresi açılır.

## 4. Öğrenci notu ve özel durum

Senin cevabına göre:

- yönetimin göreceği okul içi öğrenci notu iyi olur
- özel durumu olan öğrenciler için seçenekli alan olmalı
- veli/öğrenci bu alanları görmemeli

### Öneri

`StudentProfile` içine şu alanlar eklenebilir:

- `internalNote`
- `hasSpecialCondition`
- `specialConditionNote`

İlk sürümde özel durum için ayrı katalog açmayalım. Çünkü kapsam büyür. Önce boolean + not yeterli.

## 5. Öğrenci durumları

Şu an Prisma tarafında:

- `ACTIVE`
- `INACTIVE`
- `GRADUATED`

Senin cevabına göre “kayıt bekliyor” olmayacak; kesin kayıt olan öğrenciler yönetim tarafından girilecek.

Gerekli durumlar:

- `ACTIVE`
- `INACTIVE`
- `GRADUATED`
- `WITHDRAWN`
- `TRANSFERRED`

### Öneri

`StudentStatus` enum’una şu iki değer eklenmeli:

- `WITHDRAWN`
- `TRANSFERRED`

`StudentLifecycleEventType` ve `StudentExitReason` tarafında zaten bu mantığa yakın yapı var. Ancak listelerde ve öğrenci kartında güncel durumun doğrudan görünmesi için `StudentProfile.status` da bu iki değeri desteklemeli.

## 6. Öğrenci fotoğrafı

Eski sistem:

- `student_photo`
- `stud_imgfile`
- `stud_imgtype`

Senin cevabına göre öğrenci fotoğrafı gerekiyor ve yükleme sırasında webp formatına çevrilmeli.

### Öneri

Fotoğrafı `Person` seviyesinde düşünmek daha doğru olur. Çünkü:

- öğrenci fotoğrafı gerekir
- personel fotoğrafı da gerekir
- aynı gerçek kişi farklı rollere sahip olabilir

Olası alanlar:

- `photoUrl`
- `photoStorageKey`
- `photoMimeType`
- `photoUpdatedAt`

### Dikkat edilmesi gereken nokta

Proje Vercel’de çalıştığı için kalıcı dosya saklama yerel disk ile yapılmamalı. Fotoğraf için ayrıca bir saklama kararı gerekir.

Önerim:

- Vercel Blob veya benzeri object storage kullanmak
- yüklenen görseli webp’ye çevirip saklamak
- veritabanında sadece URL/key bilgisini tutmak

Bu nedenle fotoğraf upload işlemini ilk veritabanı fazına dahil etmeyip ayrı küçük faz yapmak daha güvenli olur.

## 7. Fletaparaqite / önceki okul bilgisi

Eski sistemde ayrı tablo var: `stu_fletaparaqit`

Alanlar:

- `stuflet_klasa`
- `stuflet_vitishkol`
- `stuflet_shkola`
- `stuflet_suksesi`
- `stuflet_transporti`
- `stuflet_zbritje`
- `stuflet_stuID`

Senin cevabına göre önceki okul bilgisi “Fletepareqite” evrağı için gerekiyor.

### Öneri

Bu bilgiyi `StudentProfile` içine karıştırmak yerine ayrı model yapalım:

`StudentPreviousEducationRecord`

Önerilen alanlar:

- `studentProfileId`
- `gradeLevelText`
- `academicYearText`
- `schoolName`
- `successText`
- `transportText`
- `discountText`
- `note`
- `createdAt`
- `updatedAt`

Neden ayrı tablo?

- Eski sistemde de ayrı tablo.
- Bir öğrenci için geçmişte birden fazla kayıt tutulabilir.
- Fletaparaqite dokümanı için kullanılan alanlar öğrenci ana kimlik alanları değildir.

## 8. Öğrenciye ait telefon/e-posta alanları

Eski sistemde öğrenci tablosunda iki telefon ve iki e-posta vardı.

Senin cevabına göre anne/baba telefon ve e-posta kayıtları yeterli. Bu yüzden öğrenci kartına tekrar:

- telefon 1
- telefon 2
- e-posta 1
- e-posta 2

eklemeyelim.

Öğrencinin portal hesabı zaten `PersonAccount` üzerinden yönetiliyor.

## 9. Veli alanları

Senin cevabına göre:

- anne ve baba dışında ilişki tipi gerekmiyor
- meslek bilgisi tutulacak
- iş yeri detaylı tutulmayacak
- veli adresi tutulmayacak
- veliye özel not alanı olsun
- günlük rapor ve yoklama SMS’i primary veliye gitsin
- ödeme sorumlusu ayrı seçilebilsin

### Mevcut durum

Yeni sistemde şunlar var:

- `GuardianRelationship.relationshipType`
- `isLegalGuardian`
- `isPrimaryContact`
- veli kişi telefon/e-posta `PersonContactPoint`

### Eksikler

Şunlar henüz yok:

- veli mesleği
- veliye özel not
- ödeme sorumlusu işareti

### Öneri

`Person` içine genel `occupationText` eklenebilir.

`GuardianRelationship` içine:

- `note`
- `isFinancialResponsible`

eklenebilir.

Neden ödeme sorumlusu `GuardianRelationship` üzerinde?

- Ödeme sorumlusu öğrenciyle veli arasındaki ilişkiye bağlıdır.
- Aynı veli bir çocukta ödeme sorumlusu, diğer çocukta olmayabilir.
- Kontrat modülü başladığında bu bilgi kontrat için varsayılan ödeme sorumlusu olarak kullanılabilir.

## 10. Finans alanları

Eski sistemde finans öğrenci ekranına çok karışmış:

- `stu_prices`
- `stu_cost_tbl`
- `Stu_pay_statement_tbl`
- protokol no
- kontrat tarihi
- servis/yemek/üniforma vb. ödeme kalemleri
- indirim
- taksit planı
- borç/alacak hareketleri

Senin yeni cevabına göre finans:

- özel okullarda kullanılacak
- devlet okullarında kullanılmayacak
- veli üzerinden yürütülecek
- her öğrencinin yıllık kontrat kalemleri olacak
- veli birden fazla çocuk için aynı ekranda kontrat kalemlerini görebilecek
- muhasebe mantığı borç/alacak hareketleri gibi olmalı
- taksit kapandı/bekliyor işaretinden çok hareket toplamı üzerinden takip edilmeli

### Öneri

Finans alanlarını bu faza dahil etmeyelim.

Ayrı bir doküman açılmalı:

`12-finans-kontrat-teknik-plan.md`

Bu dokümanda eski `stu_prices`, `stu_cost_tbl`, `Stu_pay_statement_tbl` ayrıntılı incelenip yeni yapı kurulmalı.

Şu aşamada öğrenci kartına finans alanı eklemek yanlış olur.

## 11. Personel alanları

Senin cevabına göre personel tarafında gerekli olacaklar:

- maaş/ücret
- kontrat no
- kontrat süresi
- acil durum kişisi
- adres
- kimlik
- fotoğraf
- istihdam tipi

Yeni sistemde şu an var:

- person
- employment
- department
- position
- staff number
- employment type
- status
- hired/ended dates
- teacher profile

Eksik olanlar:

- maaş/ücret
- kontrat no
- kontrat başlangıç/bitiş
- acil durum kişisi
- personel adresi
- fotoğraf

### Öneri

Personel detayları öğrenci alanları tamamlandıktan sonra ayrı fazda ele alınmalı. Çünkü personel kontratı/maaşı ayrı bir mini HR modülüdür.

## 12. Doküman upload

Cevap net:

- doküman upload olmayacak
- personel/öğrenci resmi evrak upload olmayacak
- kaynak doküman olmayacak

### Sonuç

Bu fazda dosya/doküman modeli açılmamalı.

Tek istisna: fotoğraf upload. O da “doküman” değil, profil fotoğrafı olarak ayrı ele alınmalı.

## 13. Günlük e-posta / SMS

Cevap net:

- UI ve ana akış bitince yapılacak
- daily report sadece primary veliye gidecek
- Brevo kullanılacak
- SMS/e-posta ücretli olduğu için tek primary veli mantığı korunacak

### Sonuç

Bu fazda mail/SMS kodlaması yapılmamalı.

Ama yeni alanlardan `isPrimaryContact` ve ileride `isFinancialResponsible` bu modülün temelini oluşturacak.

## 14. Admin raporları

Senin cevabına göre öğretmen kullanım raporları daha sonra düşünülecek.

Önerilen yaklaşım:

- üstte işlem yapan/yapmayan öğretmenler
- öğretmen seçilince detay işlem ekranı
- export yok

### Sonuç

Bu fazda admin rapor ekranı yapılmamalı.

## 15. İlk kodlama fazı önerisi

Bence ilk gerçek kodlama fazı şu olmalı:

### Faz 1 — Öğrenci ve veli eksik veri alanları

Veritabanı:

1. `StudentStatus` içine:
   - `WITHDRAWN`
   - `TRANSFERRED`
2. `StudentProfile` içine:
   - `residenceCity`
   - `neighborhood`
   - `addressLine`
   - `internalNote`
   - `hasSpecialCondition`
   - `specialConditionNote`
3. Yeni model:
   - `StudentPreviousEducationRecord`
4. `Person` içine:
   - `occupationText`
5. `GuardianRelationship` içine:
   - `note`
   - `isFinancialResponsible`

UI / server action:

1. Öğrenci kayıt formuna adres ve not alanları eklensin.
2. Öğrenci detay ekranında bu alanlar görünsün/düzenlenebilsin.
3. Fletaparaqite / önceki okul bölümü öğrenci detayına eklensin.
4. Veli ekleme/detay alanında meslek, veli notu ve ödeme sorumlusu işareti desteklensin.
5. Öğrenci durum geçişlerinde `TRANSFERRED` ve `WITHDRAWN` kullanılabilsin.

Bu faz finans, mail, SMS, full UI tasarım ve fotoğraf upload işine girmemeli.

## 16. Faz 2 önerisi

### Faz 2 — Fotoğraf upload

Bu fazda:

- öğrenci fotoğrafı
- personel fotoğrafı
- webp dönüşümü
- kalıcı storage

ayrı ele alınmalı.

Karar gereken tek teknik konu:

> Vercel deploy ortamında fotoğrafları nerede saklayacağız?

Benim önerim Vercel Blob/object storage kullanmak. Veritabanında sadece URL/key tutulur.

## 17. Faz 3 önerisi

### Faz 3 — Personel/öğretmen detay alanları

Bu fazda:

- personel adresi
- personel acil durum kişisi
- kontrat no
- kontrat tarihleri
- maaş/ücret
- öğretmen diploma/sertifika metin alanları
- admin tarafından öğretmen aktivite detaylarının görünmesi

planlanabilir.

### 2026-10-05 Faz 3 / Aşama 1 uygulama notu

İlk aşama maaş, kontrat ve izin modüllerine girmeden tamamlandı:

- personel fotoğrafı, öğrenci fotoğrafı ile aynı Blob/WebP akışına taşındı
- personel adresi için `employment_hr_profiles` kaydı eklendi
- personel acil durum kişisi için ad, yakınlık ve telefon alanları eklendi
- personel iç notu eklendi
- personel kimlik/pasaport bilgisi öğrenciyle aynı şifreli `person_identities` yapısı üzerinden eklendi

Maaş/ücret, kontrat numarası, kontrat tarihleri, izinler ve personel belgeleri Faz 3 / Aşama 2+ kapsamına bırakıldı.

## 18. Faz 4 önerisi

### Faz 4 — Finans/kontrat teknik planı

Bu fazdan önce eski finans ekranları ayrıca incelenmeli:

- öğrenci kontrat/protokol ekranı
- servis/kalem fiyatları
- ödeme planı
- borç/alacak hareketleri
- veli ekranındaki finans görünümü

Sonra yeni model kurulmalı.

## 19. Yeni soru / karar gereken nokta

Şu an kodlamayı durduracak çok fazla soru yok. Ancak fotoğraf için bir teknik karar gerekli:

1. Fotoğrafları Vercel Blob gibi object storage’da mı saklayalım?
2. Yoksa ilk pilotta fotoğrafı biraz erteleyip önce öğrenci/veli metin alanlarını mı bitirelim?

Benim önerim:

- Faz 1’de fotoğrafı erteleyelim.
- Faz 1 tamamlanınca fotoğrafı ayrı küçük faz olarak ekleyelim.

## 20. Net sonuç

Kodlamaya başlamak için en güvenli ilk paket:

> Öğrenci + veli eksik alanları ve fletaparaqite/önceki okul yapısı.

Bu paket doğru oturursa ardından:

1. fotoğraf upload,
2. personel detayları,
3. finans/kontrat,
4. mail/SMS,
5. profesyonel UI

sırasıyla ilerlemek daha sağlıklı olur.
