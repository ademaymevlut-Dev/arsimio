# Faz 1 — Akademik yapı teslimi

Tarih: 2026-09-22<br>
Durum: `ADIM 1–5 TAMAMLANDI · OKUL TAKVİMİ/ÇALIŞMA GÜNLERİ KARAR BEKLİYOR`

## Teslim edilen çalışma alanı

Okul Admin sol menüsüne `/academics/structure` sayfası eklendi. Sayfa öğretim yılı seçimini tek yerde tutar ve bağımlılık sırasıyla beş sekme sunar:

1. Kademe ve seviyeler
2. Sınıf ve şubeler
3. Üç dilli ders kataloğu
4. Sınıf–ders planı
5. Ders saatleri

Sayfa mevcut açık renkli, en fazla `1400px` Okul Admin kabuğunu kullanır. Formlar Safari ile uyumlu Radix Dialog, arşivleme kararları AlertDialog, listeler ortak Table/DataTableShell bileşimiyle çalışır. Menü ve bütün yazmalar mevcut `academics.read` / `academics.manage` izinleriyle korunur.

## Kademe ve seviye kararı

Ülke ve öğretim yılına göre değişebilen sistemi sabit enum olarak uygulamaya gömmek yerine iki kavram ayrıldı:

- Kademe: `PRESCHOOL`, `PRIMARY`, `MIDDLE`, `HIGH` gibi okulun kendisinin belirlediği kod, sıra ve üç dilde ad.
- Seviye: `PRF`, `1` … `12` gibi kod; seçili kademe ve öğretim yılına bağlıdır.

Seviye formundaki iki ana kullanıcı girdisi **kademe + seviye kodudur**. `sequence`, PRF'nin 1'den önce gelmesi ve farklı ülke sistemlerinin doğru sıralanması için teknik ama düzenlenebilir alandır. Varsayılan sistem zorunlu seed olarak oluşturulmaz; okul şu örnek düzeni kurabilir:

| Kademe | Seviyeler |
| --- | --- |
| Anaokulu | PRF |
| İlkokul | 1–5 |
| Ortaokul | 6–9 |
| Lise | 10–12 |

Bu yaklaşım aynı okulun sonraki öğretim yılında farklı kademe/seviye düzeni kurmasını engellemez.

## Sınıf/şube ve ders planı

Şube, seçili yıldaki seviyeye bağlanır. Seviye `4` ve şube kodu `1`, UI'da `4 / 1` olarak gösterilir. Aynı seviye/şube kodu bir yılda tekrarlanamaz.

Ders kataloğu okul genelindedir ve yıllar arasında tekrar kullanılabilir. Türkçe, Arnavutça ve İngilizce adlar ayrı dersler değil aynı `subject_id` kaydının çevirileridir.

2026-09-23 incelemesinde, sınıf/şube ve kademe/seviyenin hâlen yıl kapsamında ayrı ayrı oluşturulması gerektiği doğrulandı. Eski HorizonEdu'nun global sınıf/şube seçme işleyişine dönüş için [yıl tekrar kullanımı önerisi](./legacy-subject-seed-and-year-reuse.md) açıldı. Ders kataloğuna ayrıca `GENERAL`, `ELECTIVE`, `IGCSE` türü eklendi; tür ile not hanesi aynı kavram değildir.

`course_offerings`, seçili yılda bir sınıf/şubede okutulacak dersleri belirler. Bu yıllık plan öğretmen veya dönem ataması içermez. Faz 4'teki dönemlik öğretmen görevlendirmeleri bu planı referans alacaktır. Aynı sınıf–ders çifti aynı yılda ikinci kez eklenemez.

## Ders saatleri

Ders saatleri öğretim yılına bağlıdır. Her kayıt sıra, başlangıç, bitiş ve üç dilde görünen ad taşır. Örneğin `1. Ders`, `Ora e 1-rë` ve `Period 1` tek zaman dilimidir.

- Bitiş saati başlangıçtan sonra olmalıdır.
- Aynı yıldaki kullanımda olan zaman dilimleri çakışamaz.
- Çakışma servis katmanında kullanıcı mesajıyla ve PostgreSQL trigger'ıyla yarış durumlarına karşı iki kez korunur.
- Haftalık program ve ortak ders oturumları bu zaman dilimlerini ileride referans alacaktır.

## Yaşam döngüsü ve güvenlik

- Fiziksel silme yok; arşivleme ve geri alma vardır.
- Kullanımda alt seviyesi olan kademe, şubesi olan seviye, ders planı olan şube veya ders arşivlenemez.
- Geri alma sırasında gerekli üst kayıtlar kullanımda değilse ilişki geri getirilemez.
- Bütün okumalar `school_id`; yıllık veriler ayrıca `academic_year_id` kapsamında yapılır.
- Bileşik foreign key'ler başka okul/yıl kaydına bağlanmayı DB seviyesinde reddeder.
- Yazmalar Origin/Host, permission, Serializable transaction, optimistic revision ve actor/üyelik bağlı audit kullanır.

## Migration ve doğrulama

`20260922000100_add_academic_structure` bağlı Neon veritabanına uygulandı ve dokuz tablo ekledi. Doğrulama komutları:

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm db:verify:academic-structure
pnpm exec next build --webpack
pnpm db:status
```

DB doğrulaması; üç dilin tek kimliği paylaşması, tenant/yıl izolasyonu, sınıf–ders tekrar engeli, saat çakışması, bağımlı arşivleme/geri alma ve audit için dokuz kontrol çalıştırır. Fixture'lar aynı transaction sonunda rollback edilir.

## Bilinçli durma noktası

Bu teslim şunları **içermez**:

- Okul takvimi ve çalışma günleri
- Tatil, resmî tatil, yarım gün veya istisna günleri
- Hafta üretimi
- Öğretmen/sorumlu öğretmen ataması
- Haftalık ders programı
- Ortak ders oturumları
- Öğrenci yerleşimi/yıl geçişi

Kullanıcı talebi gereği sonraki görüşme yalnız okul takvimi ve çalışma günü modelinin ürün kararlarıyla başlayacaktır. Karar verilmeden tablo, migration veya UI eklenmeyecektir.
