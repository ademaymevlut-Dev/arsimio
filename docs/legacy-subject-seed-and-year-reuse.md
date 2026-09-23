# Eski ders kataloğu ve yeni yıla taşıma incelemesi

Tarih: 2026-09-23

Durum: migration ve seed HorizonEdu'ya uygulandı. Canlı kontrolde 49 ders, 147 çeviri, 13 seçmeli, 5 IGCSE; GjimCamEdu'da 0 ders bulundu. Yeni yıl seçme akışı tasarım aşamasındadır.

## Görseldeki dersler

Eski HorizonEdu ekranındaki 49 Arnavutça ders adı [seed kataloğuna](../scripts/data/legacy-subject-catalog.ts) aynı yazımla aktarıldı. Her biri tek `subjects.id` ve bu ID'ye bağlı `tr`, `sq`, `en` çevirileri olarak oluşturulur. Türkçe/İngilizce adlar ilk çeviri önerisidir; okul yönetimi bunları ders kataloğu ekranından düzeltebilir.

| Tür | Adet | Örnek | Anlamı |
| --- | ---: | --- | --- |
| `GENERAL` | 31 | `Matematikë` | Normal ders veya etkinlik adı. Tür, tek başına not zorunluluğu anlamına gelmez. |
| `ELECTIVE` | 13 | `Mësim zgjedhor Matematikë`, `MZ. AS/A Level Math` | Programda ayrı görünen seçmeli dersler. |
| `IGCSE` | 5 | `Matematikë (IGCSE)`, `Global Prospektive (IGCSE)` | Programda ayrı görünen IGCSE dersleri. |

`MZ.` kısaltması mevcut adlarda korundu; seçmeli türü ayrıca açık veri alanı olarak tutulur. `Global Prospektive (IGCSE)` gibi eski ekrandaki yazım seed'in Arnavutça alanında birebir korunmuştur. Ders türü çeviri metninden türetilmez; `subjects.track` alanında saklanır. Bu alan `20260923000100_add_subject_track` migration'ıyla eklenir ve okul admin formunda düzenlenebilir.

Kullanıcının belirttiği not ilkesi: seçmeli derslerin notları kendi **ortak seçmeli hanesinde**, IGCSE derslerinin notları ayrı **ortak IGCSE hanesinde** toplanacak. Bu, ders programındaki 18 farklı seçmeli/IGCSE adını birleştirmez. Not sistemi henüz geliştirilmediğinden `track` alanı bugün sadece ders türünü sınıflandırır; not kaydı veya not birleştirmesi yapmaz. Not modülünde ayrıca öğrenci, öğretim yılı, dönem, sınıf ve ortak not hanesi kapsamında değerlendirme ilişkisi kurulmalıdır. `GENERAL` içindeki etkinliklerin notlandırılıp notlandırılmayacağı bu görselden çıkarılamaz.

## Seed kullanımı

Seed okul bazlıdır. Görsel HorizonEdu'dan geldiği için yalnız `horizonedu` okuluna uygulanır; GjimCamEdu'ya otomatik aktarılmaz. Mevcut eşleşen dersleri atlar; Arnavutça ad aynı olup çevirisi/türü farklıysa veya başka bir ders Türkçe/İngilizce adı kullanıyorsa tüm yazmayı durdurur. Mevcut adları sessizce değiştirmez. Yeni ders ve üç çevirisi ile `IMPORT` audit'i aynı transaction içinde yazılır.

```bash
pnpm db:deploy
pnpm db:seed:legacy-subjects --school=horizonedu
pnpm db:seed:legacy-subjects --school=horizonedu --apply
```

İkinci satır salt okunur önizlemedir. Üçüncü satır ilk çalıştırmada 49 ders oluşturur; tekrar çalıştırıldığında değişmemiş 49 dersi atlar. Başka okula aktarmak ayrı ve açık `--school=<slug>` seçimi gerektirir. Script build sırasında kendiliğinden çalışmaz. HorizonEdu'ya uygulama tamamlandığı için mevcut ortamda tekrar çalıştırmak gerekmez.

## Yıl bağımlılığı: mevcut durum

| Veri | Şu anki kapsam | Yeni yılda tekrar gerekir mi? |
| --- | --- | --- |
| Ders kataloğu ve çevirileri | Okul | Hayır; aynı ders ID'leri yeniden seçilebilir. |
| Kademe ve seviye | Okul + öğretim yılı | Evet, şu an elle yeniden oluşturulur. |
| Sınıf/şube | Okul + öğretim yılı | Evet, şu an elle yeniden oluşturulur. |
| Sınıf–ders planı | Okul + öğretim yılı | Evet, şu an sınıf ve ders tek tek seçilir. |
| Günlük ders saatleri | Okul + öğretim yılı | Evet, şu an elle yeniden oluşturulur. |

Bu, kullanıcının eski projedeki yıllık hazırlık işleyişiyle uyuşmuyor. Mevcut uygulama henüz yeni yıl hazırlama veya toplu seçme akışı sağlamıyor. Eğitim sisteminin kademeleri ve saatleri yıldan yıla değişebildiği için ders planı ve öğretim yılına ait operasyonel kayıtlar tarihsel bağlamda ayrı kalmalıdır; bu gerekçe aynı şube kodunu her yıl elle yazdırmayı gerektirmez.

## Önerilen yeni yıl hazırlığı

1. Okulun tekrar kullanılabilir **sınıf/şube kataloğu** `(seviye kodu, şube kodu)` kimliğiyle tutulur. Yeni açılan `4 / 3` gibi şube yalnız bir kez kataloğa eklenir.
2. Yeni öğretim yılı açılırken önceki yılın kademe/seviye düzeni, ders saatleri ve şube seçimleri önizlenir. Admin hangi şubelerin kullanılacağını çoklu seçimle belirler; yeni şube ekleyebilir.
3. Her seçili şube için geçen yılın dersleri önceden işaretli gelir. Admin ders ekleyip çıkarır ve tek onayla yeni yılın `course_offerings` kayıtlarını oluşturur. Dersler global katalogdaki **aynı subject ID** ile bağlanır.
4. Kopyalama bir taslak/önizleme ve tek transaction olarak yapılır. Hedef yılda mevcut kayıtlar varsa eşleşenler tekrar oluşturulmaz; farklı olanlar admin önüne çıkarılır. Öğretmen atamaları otomatik yükseltilmez; kullanıcı bu belirsizliği özellikle belirtmiştir.
5. Öğrenci kayıtları, yoklamalar, notlar, yorumlar ve geçmiş program oturumları bu kurulumla taşınmaz. Öğrenci yıl geçişi ayrı onaylı iş akışıdır.

Uygulama için önerilen ilişki: okul kapsamlı `class_section_catalog` → öğretim yılı kapsamlı `year_class_sections` → `course_offerings`. Mevcut `class_sections` kayıtlarını koruyan ve katalog kimliğine bağlayan genişletme migration'ı gerekir. Bu belge henüz o migration'ın veya yeni yıl UI'sinin uygulandığını iddia etmez.
