# 14 — Personel kontrat template / madde altyapısı notları

Tarih: 2026-10-06  
Durum: İlk çekirdek faz kodlandı.

Bu fazda amaç, personel kontrat kaydının üzerine serbest Word editörü koymadan okul bazlı tekrar kullanılabilir kontrat metni altyapısını başlatmaktır.

## Bu fazda eklenenler

- Okul bazlı kontrat şablonu tablosu:
  - kod
  - dil
  - başlık
  - header / giriş metni
  - footer / imza metni
  - not
  - arşiv bilgisi
- Şablona bağlı sıralı kontrat maddeleri:
  - sıra
  - madde başlığı
  - madde metni
  - arşiv bilgisi
- Personel kontrat kaydına isteğe bağlı şablon bağlantısı.
- Personel tanımları ekranında şablon ve madde yönetimi.
- Personel kontrat formunda aktif şablon seçimi.

## Bilerek kapsam dışında bırakılanlar

- PDF üretimi
- Yazdırılabilir kontrat önizleme ekranı
- Kontrat imza alanlarının gerçek çıktı tasarımı
- Header/footer görsel veya PNG ekleme
- Değiştirilebilir placeholder/macro motoru
- Kontrat oluşturulduğu anda madde snapshot alma

## Neden snapshot henüz eklenmedi?

Şablon maddelerini önce yönetilebilir hale getirmek daha güvenli. Bir sonraki fazda kontrat çıktısı tasarlanırken hangi alanların placeholder olacağı ve kontrat metninin kontrat oluşturulduğu anda dondurulup dondurulmayacağı ayrıca netleştirilecek.

Önerilen sonraki faz:

1. Şablon metninde kullanılacak otomatik alanları belirlemek.
2. Kontrat detayından “önizleme / yazdır” ekranı açmak.
3. Kontrat çıktısı üretildiğinde metni snapshot olarak saklamak.
4. PDF veya yazıcı çıktısı akışını eklemek.
