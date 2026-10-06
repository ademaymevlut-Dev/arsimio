# Personel izin / devamsızlık fazı

Tarih: 2026-10-06

Bu küçük fazda personel için yalnız izin/devamsızlık kayıt çekirdeği kuruldu. Amaç; yıllık izin, hastalık izni, ücretsiz izin ve benzeri kayıtları personelin çalışma kaydına bağlı tarihçe olarak saklamak.

## Uygulanan kapsam

- `employment_leaves` tablosu eklendi.
- Kayıt `Employment` kaydına bağlıdır; gerçek kişinin genel profiline veya kontrat/maaş tablosuna gömülmez.
- İzin türleri:
  - yıllık izin
  - hastalık izni
  - ücretsiz izin
  - doğum / uzun izin
  - idari / mazeret
  - diğer
- İzin durumları:
  - planlandı
  - onaylandı / işlendi
  - iptal
- Başlangıç tarihi, bitiş tarihi, gün sayısı ve not alanları eklendi.
- Gün sayısı boş bırakılırsa başlangıç/bitiş tarihinden otomatik hesaplanır.
- Yarım gün gibi durumlar için manuel ondalıklı gün sayısı girilebilir.
- İzin tarihi personelin işe giriş/çıkış tarihleri dışında olamaz.
- Personel detay ekranında yeni izin formu ve izin geçmişi eklendi.
- `hr.leave.read` ve `hr.leave.manage` yetkileri eklendi.
- Okul Admin rollerine izin yetkileri migration içinde bağlandı.

## Bilerek dışarıda bırakılanlar

- yıllık izin hak bakiyesi
- otomatik izin hakkı kazanımı
- öğretmen/personel izin talep akışı
- yönetici onay zinciri
- bordro/maaş etkisi
- izin raporları

Bu başlıklar ayrı fazlarda ele alınacak.
