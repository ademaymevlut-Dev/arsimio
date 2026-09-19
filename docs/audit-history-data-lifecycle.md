# Denetim, geçmiş ve veri yaşam döngüsü

## Amaç

Arsimio'da önemli bir verinin kim tarafından, ne zaman, hangi okul kapsamında ve nasıl değiştirildiği sonradan açıklanabilmelidir. Denetim sistemi yalnızca hata günlüğü değil, ürünün temel güvenlik özelliğidir.

## Denetlenecek işlemler

En az şu işlemler denetim olayı üretir:

- Oturum ve güvenlik açısından önemli hesap olayları.
- Kullanıcı daveti, üyelik, rol ve permission değişiklikleri.
- Okul, alan adı, marka ve ayar değişiklikleri.
- Öğrenci, veli, çalışan ve öğretmen kayıtlarındaki değişiklikler.
- Yoklama, not, sınav, ödev ve davranış/yorum kayıtları.
- Finansal kayıtlar ve ödeme durumları.
- Rota, sefer ve öğrenci biniş/iniş olayları.
- Dışa aktarma, toplu işlem, arşivleme, geri alma ve kalıcı silme talepleri.

## Denetim olayı alanları

Başlangıç `audit_events` kaydı aşağıdaki bilgileri taşır:

| Alan | Açıklama |
| --- | --- |
| `id` | Değişmeyen olay kimliği |
| `school_id` | Olayın ait olduğu okul; platform olaylarında boş olabilir |
| `actor_user_id` | İşlemi başlatan kullanıcı |
| `actor_membership_id` | Kullanıcının işlem anındaki okul üyeliği |
| `action` | Örneğin `student.updated` veya `membership.role_changed` |
| `entity_type` / `entity_id` | Etkilenen kaynağın türü ve kimliği |
| `before_data` | Hassas alanları filtrelenmiş önceki değerler |
| `after_data` | Hassas alanları filtrelenmiş yeni değerler |
| `changed_fields` | Değişen alanların özeti |
| `reason` | Kritik işlemlerde zorunlu gerekçe |
| `request_id` | Aynı istekteki olayları ilişkilendiren kimlik |
| `ip_address` / `user_agent` | Hukuki ve gizlilik politikası izin verdiğinde istemci bağlamı |
| `created_at` | Sunucu tarafından üretilen zaman |

Parola, erişim token'ı, bağlantı dizesi ve benzeri sırlar hiçbir koşulda denetim verisine yazılmaz.

## Yazma güvenilirliği

2026-09-19 itibarıyla DB üzerinde append-only trigger aktiftir: UPDATE, DELETE ve TRUNCATE reddedilir. Audit actor/üyelik/okul referansları RESTRICT ile korunur. İş verisiyle audit olayını aynı transaction'da üreten uygulama katmanı henüz geliştirilmedi. DB sahibi DDL ile trigger'ı değiştirebilir; runtime yetkilerinin ayrılması yol haritasındadır.

- İş verisi değişikliği ile denetim olayı mümkün olduğunca aynı veritabanı transaction'ında yazılır.
- Başarısız işlem başarılıymış gibi denetim geçmişine girmez; güvenlik açısından gerekli başarısız denemeler ayrı güvenlik olayları olarak tutulur.
- Denetim olayları append-only'dir.
- Uygulama kullanıcıları `audit_events` üzerinde update veya delete yetkisine sahip olmaz.
- Sistem kaynaklı işlemlerde actor türü ve ilgili job/istek kimliği kaydedilir.

## Kayıt geçmişi ve sürümleme

Audit log, kullanıcının anlayabileceği alan geçmişiyle aynı şey değildir. Aşağıdaki yüksek önem taşıyan alanlarda ayrıca sürüm veya domain event yaklaşımı kullanılabilir:

- Not değişiklikleri.
- Yoklama düzeltmeleri.
- Finansal tutar ve ödeme durumu değişiklikleri.
- Öğrenci/veli ilişkilendirmeleri.
- Resmi belge veya onay durumları.

Bu sayede yalnızca teknik JSON farkı değil, “hangi not neden değişti?” gibi iş bağlamı da gösterilebilir.

## Silme ve geri alma politikası

### Arşivleme

Kullanıcıların “sil” olarak gördüğü çoğu işlem aslında arşivlemedir. Kayıtta en az `archived_at` ve `archived_by` tutulur. Gerekirse `archive_reason` eklenir.

### Geri alma

Yetkili kullanıcı arşivlenen kaydı geri alabilir. Geri alma ayrı bir denetim olayı üretir ve ilişkisel çakışmalar yeniden doğrulanır.

### Kalıcı silme

Kalıcı silme yalnızca:

- Yasal veri silme talebi,
- Tanımlı saklama süresinin sona ermesi,
- Anonimleştirme/purge işi,
- Açık gerekçeli ve onaylı platform operasyonu

durumlarında yapılır. Yüksek riskli işlemlerde dört göz ilkesi uygulanır: talep eden ve onaylayan aynı kişi olamaz.

Denetim geçmişi hukuki saklama politikasıyla çelişiyorsa kişisel alanlar anonimleştirilir; olay bütünlüğü korunur.

## Saklama politikası

Kesin saklama süreleri ürünün faaliyet göstereceği ülke, okul sözleşmesi ve veri koruma yükümlülükleri belirlendikten sonra yazılacaktır. Süre belirlenene kadar sistem sessizce kalıcı veri silmez.
