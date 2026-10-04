# 09 — Yoklama akışı ve kararları

Tarih: 2026-10-04  
Durum: `SADELEŞTİRİLDİ / KODLAMA ÖNCESİ KARAR`
Kapsam: Öğretmen portalındaki haftalık program hücresinden alınacak ders/saat bazlı yoklama, yönetim dashboard görünümü, veli/öğrenci ekranı ve ilerideki SMS/e-posta kullanımının temel veri modelini netleştirmek.

Bu belge, yoklama kodlamasına başlamadan önce ortak anlayışı sabitlemek içindir. UI tasarımı şimdilik öncelik değildir; amaç doğru veritabanı ve doğru iş akışıdır.

## 1. Temel kabul

Bu sistem klasik anlamda “her ders tüm öğrenciler için yoklama alındı” sistemi olmayacaktır.

Ana kural:

> Uygulamaya yalnızca **olmayan öğrenci** girilir.

Öğretmen her ders saatinde sisteme girip “herkes burada” diye kayıt oluşturmayacaktır. Eğer sınıfta eksik öğrenci yoksa öğretmenin uygulamada yapacağı bir işlem yoktur.

Bir öğrenci yok yazıldıktan sonra okula/derse gelirse aynı aktif kayıt `Late` durumuna çevrilir. Yeni bir ikinci kayıt oluşturulmaz.

Bir öğretmen haftalık programında bir ders hücresindeki `Yoklama` CTA'sına bastığında sistem şu bağlamı bilir:

- okul
- aktif öğretim yılı
- gerçek takvim günü
- seçili akademik hafta
- ders saati
- öğretmen
- ders
- sınıf / şube
- birleşik ders varsa seçilen tek sınıf katılımcısı

Teknik bağlam:

```text
TeacherProfile
  └─ TimetableSession
      └─ TimetableSessionParticipant
          ├─ AcademicCalendarDay
          ├─ SchedulePeriod
          ├─ AcademicYearClassSection
          ├─ CourseOffering / Subject
          └─ StudentGroupPlacement üzerinden aktif öğrenciler
```

## 2. Kayıt mantığı

Bu tasarımda “yoklama oturumu tamamlandı” gibi ek bir kayıt tutulmaz.

Sistem yalnız şu olayları saklar:

1. Öğrenci o gün/sınıf bağlamında `Absent` yazıldı.
2. Aynı öğrenci daha sonra geldiyse kayıt `Late` olarak güncellendi.
3. Yanlış işaretleme yapıldıysa kayıt temizlendi/silindi.

Bu nedenle “kayıt yok” şu anlama gelir:

- öğretmen uygulamada yok öğrenci girmemiştir;
- bu öğrencinin o gün için aktif `Absent/Late` kaydı yoktur.

Bu bilinçli bir ürün kararıdır. Proje, öğretmeni her saat tam yoklama doldurmaya zorlamayacaktır.

## 3. Önerilen ilk veri modeli

### 3.1 StudentAttendanceRecord

Her satır, bir öğrencinin bir okul günü ve sınıf bağlamındaki aktif yok/geç durumudur.

Önerilen alanlar:

- `id`
- `schoolId`
- `academicYearId`
- `academicCalendarDayId`
- `academicYearClassSectionId`
- `studentProfileId`
- `status`
  - `ABSENT`
  - `LATE`
- `openedTimetableSessionParticipantId`
  - öğrenciyi ilk yok yazan ders/saat/sınıf bağlamı
- `openedTeacherProfileId`
  - öğrenciyi ilk yok yazan öğretmen
- `openedAt`
  - yok kaydının oluşturulma zamanı
- `lateTimetableSessionParticipantId`
  - kayıt `Late` yapılırsa, öğrencinin geldiğinin görüldüğü ders/saat bağlamı
- `lateTeacherProfileId`
  - kaydı `Late` yapan öğretmen
- `lateAt`
  - geliş/geç kalma zamanı
- `note`
  - ilk sürümde opsiyonel
- `createdByUserId`
- `updatedByUserId`
- `createdAt`
- `updatedAt`

Tekillik:

```text
academicCalendarDayId + academicYearClassSectionId + studentProfileId
```

Bu tekillik sayesinde aynı öğrenci aynı gün aynı sınıfta iki kez aktif yok yazılamaz.

## 4. Durum mantığı

İlk sürümde aktif durumlar:

| Durum | Anlamı | Veri yazımı |
| --- | --- | --- |
| Kayıt yok | Öğrenci için aktif yok/geç olayı yok | Satır yok |
| Absent / Yok | Öğrenci o gün/saatte sınıfta yok görüldü | `status = ABSENT` |
| Late / Geç | Öğrenci yok yazıldıktan sonra geldi | Aynı kayıt `status = LATE` olur |

`Present`, `COMPLETED`, `DRAFT`, “herkes mevcut” gibi kayıtlar ilk sürümde yoktur.

## 5. Öğretmen akışı

Öğretmen dashboard'da ilgili ders hücresindeki `Yoklama` CTA'sına basar.

Modal içinde:

- Sınıfın aktif öğrenci listesi görünür.
- Öğretmen yalnız olmayan öğrencileri seçer ve `Yok yaz` kaydı oluşturur.
- Aynı gün aynı sınıfta daha önce yok yazılmış öğrenci modalda görünür.
- Sonraki ders öğretmeni bu öğrenciyi gördüğünde kaydı `Late` yapabilir.
- Yanlış kayıt varsa öğretmen kaydı temizleyebilir/silebilir.
- Öğretmen kaydettiğinde:
  - yeni yok kayıtları oluşturulur;
  - mevcut yok kayıtları `Late` yapılabilir;
  - yanlış kayıtlar temizlenebilir.

Öğretmen “herkes mevcut” şeklinde bir tamamlandı işlemi yapmaz.

## 6. Örnek akış

1. 9/A sınıfına ilk ders Matematik öğretmeni girer.
2. Ahmet sınıfta yoktur.
3. Matematik öğretmeni Ahmet için `Absent` kaydı oluşturur.
4. Kayıtta şu bilgiler saklanır:
   - gün
   - sınıf
   - öğrenci
   - ders saati
   - ders
   - kaydı oluşturan öğretmen
5. İkinci ders Biyoloji öğretmeni 9/A sınıfına girer.
6. Biyoloji öğretmeni yoklama CTA'sını açtığında Ahmet'in o gün 9/A için aktif `Absent` kaydı olduğunu görür.
7. Ahmet derse gelmişse Biyoloji öğretmeni aynı kaydı `Late` yapar.
8. Akşam mailinde kayıt, ilk yok yazıldığı ders/öğretmen bilgisiyle ve güncel `Late` durumuyla kullanılabilir.

## 7. Geçmiş / gelecek tarih kuralı

Şu ana kadarki CTA kararlarıyla uyumlu olarak ilk sürümde tarih kilidi koymayacağız.

- Öğretmen geçmiş haftaya dönüp yoklama kaydını görebilir ve düzeltebilir.
- Öğretmen yanlış işaretlemeyi temizleyebilir.
- Öğretmen `Absent` kaydını `Late` olarak güncelleyebilir.

İleride okul bazlı “kaç gün geriye düzeltme yapılabilir?” ayarı eklenebilir; ilk kodlama paketinde yoktur.

## 8. Aynı gün devamlılık

Bu sade modelde aynı gün devamlılık şu şekilde çözülür:

- Aynı gün + aynı sınıf + aynı öğrenci için aktif kayıt aranır.
- Kayıt varsa sonraki ders öğretmeninin modalında görünür.
- Öğretmen öğrenciyi sınıfta gördüyse `Late` yapar.
- Öğrenci hâlâ yoksa kayıt `Absent` olarak kalır.

Bu işlem için her ders saatinde ayrı yoklama oturumu açmaya gerek yoktur.

## 9. Admin dashboard görünümü

Öğretmen bir öğrenci için `Absent` veya `Late` kaydı oluşturduğunda bu kayıt okul yönetim dashboard'unda görünmelidir.

İlk tablo `src/app/(school-admin)/dashboard/page.tsx` ekranına eklenebilir.

Tablo önerilen kolonları:

| Kolon | İçerik |
| --- | --- |
| Durum | `Absent` veya `Late` |
| Sınıf | Örnek: `1/A` |
| Öğrenci | Ad soyad ve öğrenci no |
| İlk yok yazılan ders / saat | Ders adı, gün ve saat |
| Kaydı oluşturan öğretmen | Öğrenciyi ilk yok yazan öğretmen |
| Late bilgisi | Varsa öğrenciyi `Late` yapan öğretmen ve zaman |
| Sorumlu veli | Primary veli adı soyadı |
| Veli telefonu | Primary veli telefon numarası |
| SMS | Şimdilik disabled CTA |

İlk sürümde SMS gönderimi yapılmaz. Buton yalnız yer tutucu olarak disabled görünür.

## 10. Veli ve öğrenci görünürlüğü

Yoklama kaydı ileride:

- veli dashboard'unda,
- öğrenci dashboard'unda,
- saat 17:00 günlük e-posta raporunda

kullanılacaktır.

İlk yoklama kodlama paketinde bu ekranların tamamını yapmak zorunda değiliz. Ancak veri modeli bu kullanımları destekleyecek şekilde kurulmalıdır.

## 11. SMS / e-posta kuralı

İlk paket:

- otomatik SMS göndermez;
- otomatik e-posta göndermez;
- admin dashboard'da SMS butonunu disabled gösterir;
- primary veli bilgisini doğru getirir.

Sonraki paketlerde:

- SMS gönderimi manuel admin CTA'sı ile mi olacak?
- aynı yokluk için mükerrer SMS engeli nasıl tutulacak?
- öğrenci `Late` olunca veliye ayrıca bilgi gidip gitmeyeceği
- 17:00 günlük e-posta raporunda hangi yoklama kayıtlarının yer alacağı

ayrı tasarlanacaktır.

## 12. İlk kodlama paketi

Benim önerdiğim ilk küçük paket:

1. Prisma enum/model/migration:
   - `StudentAttendanceStatus`
   - `StudentAttendanceRecord`
2. Öğretmen portalında disabled `Yoklama` CTA'sını aktif dialog'a dönüştürme.
3. Dialog içinde aktif sınıf öğrenci listesini gösterme.
4. Öğrenci bazlı `Absent / Late / Temizle` kaydı.
5. Aynı gün/sınıf/öğrenci için mevcut aktif kayıtları gösterme.
6. Yanlış kayıt temizleme ve `Absent → Late` güncelleme.
7. Okul admin dashboard'da bugünün `Absent / Late` kayıtlarını tablo olarak gösterme.
8. SMS butonunu disabled yer tutucu olarak gösterme.
9. Tenant, öğretmen yetkisi ve sınıf kapsamı kontrollerini servis katmanında yapma.

## 13. Açık karar soruları

Kodlamaya geçmeden önce aşağıdaki küçük kararları netleştirelim.

### YK01 — `Late` için saat girişi

Öğretmen `Late` seçtiğinde geliş saati tutulmalı mı?

**Karar:** İlk sürümde manuel saat alanı yok. Öğretmen kaydı `Late` yaptığında sistem o anki zamanı `lateAt` olarak yazar.

**Cevabınız:**

Sade kullanım için otomatik kayıt zamanı yeterli.


### YK02 — Yanlış kaydı silme yöntemi

Öğretmen yanlış işaretlediği kaydı temizlediğinde veritabanında fiziksel silme mi olsun, yoksa `removedAt` ile pasif kayıt mı?

**Karar:** İlk sürümde sade kalmak için temizleme işlemi aktif satırı fiziksel siler. Audit/geçmiş gerekiyorsa sonraki sürümde ayrı geçmiş tablosu eklenebilir.

**Cevabınız:**

Çok detaylı yoklama sistemi istenmediği için ilk sürümde fiziksel silme kabul edildi.


### YK03 — Herkes mevcutsa öğretmen ne yapacak?

Sınıfta yok/geç öğrenci yoksa öğretmen uygulamada işlem yapacak mı?

**Karar:** Hayır. Uygulama yalnız olmayan öğrencinin kaydını alır.

**Cevabınız:**

Öğretmen “herkes mevcut” kaydı oluşturmayacak.


### YK04 — Admin dashboard kapsamı

Admin dashboard ilk sürümde sadece bugünü mü göstersin, yoksa tarih filtresi de olsun mu?

**Karar:** İlk sürümde yalnız bugünün kayıtları görünsün. Tarih filtresi sonraki rapor ekranına bırakıldı.

**Cevabınız:**

Bugünün aktif yok/lated kayıtları yönetim ekranında görünecek.


### YK05 — Dashboard'da `Late` öğrenciler de listelensin mi?

Admin ekranında sadece o an okulda olmayanlar mı görünsün, yoksa `Late` kayıtları da görünsün mü?

**Karar:** İlk tabloda `Absent` ve `Late` birlikte görünsün; durum kolonu ayırsın. `Late`, öğrencinin geldiğini gösterir ama günlük rapor ve veli bilgilendirmesi için yine önemli bir olaydır.

**Cevabınız:**

`Absent` ve `Late` birlikte listelenecek.


### YK06 — Öğretmenin geçmiş yoklamayı düzeltme sınırı

Öğretmen geçmiş haftanın yoklamasını sınırsız düzeltebilsin mi?

**Karar:** Şimdilik evet. Sistem oturunca okul ayarı olarak geriye dönük düzeltme sınırı eklenebilir.

**Cevabınız:**

İlk sürümde tarih kilidi yok.


### YK07 — Not alanı

Yoklama kaydında öğrenci bazlı kısa not alanı olsun mu?

Örnek: “Servis gecikti”, “Velisi aradı”, “Doktor randevusu”.

**Karar:** Veritabanı alanı opsiyonel olarak hazır tutuldu, fakat ilk UI paketinde not girişi açılmadı. Önce temel `Absent/Late/Temizle` akışı oturtulacak.

**Cevabınız:**

İlk kullanımda not alanı gösterilmeyecek.


## 14. Şimdilik kodlanmayacaklar

İlk yoklama paketinde aşağıdakiler kodlanmayacak:

- gerçek SMS gönderimi
- SMS gönderim geçmişi
- 17:00 e-posta raporu entegrasyonu
- veli/öğrenci dashboard yoklama kartları
- mazeretli/izinli/raporlu ayrımı
- tam yoklama oturumu / herkes mevcut kontrolü
- geliş/ayrılış olay geçmişi raporu

Bunlar veri modeli oturduktan sonra ayrı paketler halinde yapılacaktır.
