# Burak Altaş Atelier — Web Sitesi

Statik bir site (HTML + CSS + JavaScript). Kurulum, veritabanı ya da aylık sunucu ücreti gerektirmez. Site Türkçe ve İngilizcedir.

## Admin paneli — siteyi buradan yönetin
**`Admin Paneli.bat`** dosyasına çift tıklayın. Tarayıcıda panel açılır (`http://localhost:5600/admin`).

- Açık kalan siyah pencere panelin kendisidir; işiniz bitince kapatın.
- Bilgisayarda **Node.js** kurulu olmalıdır. Kurulu değilse pencere bunu söyler; https://nodejs.org adresinden "LTS" sürümünü kurun.

Paneldeki sekmeler:

| Sekme | Ne yapılır |
|---|---|
| **Modeller** | Yeni model ekleme, düzenleme, kopyalama, silme. Fotoğrafları sürükleyip bırakın, panel küçültüp web için hazırlar. ↑↓ ile sıralayın, ★ ile ana sayfada öne çıkarın. Her modele bir **video** eklenebilir. Her modelde eksikleri gösteren bir kontrol listesi vardır. |
| **Tasarımcı** | Burak'ın sayfası (`designer.html`): portre, atölye fotoğrafı, hikâye, alıntı, rakamlar, basın. Boş alanlar sitede görünmez. |
| **Gelin yorumları** | Gerçek yorumları ekleyin, sıralayın, silin. Yoruma gelinin fotoğrafını ekleyebilirsiniz. "Giydiği model" alanı bir modelin adıyla aynıysa, yorum o modelin sayfasında **"… modelini giyen gelinler"** bölümünde de görünür. |
| **Ayarlar** | WhatsApp, e-posta, Etsy, Instagram, adres, çalışma saatleri, online randevu gün ve saatleri, **kişiselleştirme ücretleri**, **canlı sohbet**, **ziyaretçi istatistikleri**, fiyatları göster/gizle. |
| **Yayınla** | Üstte **Yayına hazırlık** listesi bulunur. Yayından önce eksik olanları kendisi bulur: örnek fotoğraflar, Etsy linkleri, örnek yorumlar, boş tasarımcı sayfası, teyit bekleyen metinler. Her maddede "Düzelt →" bağlantısı vardır. Altta internete yüklenecek **`yayin`** klasörünü hazırlama adımları yer alır. |

Panel kaydettiğiniz anda siteyi günceller: model sayfaları, paylaşım önizlemeleri ve sitemap kendiliğinden üretilir. Her kayıttan önce eski veriler **`.yedek`** klasörüne kopyalanır; yanlışlıkla silinen bir şey oradan geri alınabilir.

## Yayınlamadan önce Burak'a göstermek (uzaktan önizleme)
**`Uzaktan Önizleme.bat`** dosyasına çift tıklayın. 10–20 saniye içinde pencerede `https://…trycloudflare.com` gibi bir link çıkar ve panoya kopyalanır. WhatsApp'tan Burak'a yapıştırın.

- Burak siteyi telefonunda (iPhone dahil) ya da bilgisayarında, yayındaki gibi görür. Bağlantı HTTPS'tir.
- Admin panelinde kaydettiğiniz her değişiklik linkte **anında** görünür; Burak sayfayı yenilesin. Panel ve önizleme aynı anda açık olabilir.
- Yalnızca sitenin kendisi paylaşılır. Admin paneli, yedekler, notlar ve betikler linkten açılamaz.
- Link, pencere açık ve bilgisayar uyanık kaldığı sürece çalışır. Her açılışta **yeni bir link** verilir. Kapatmak için pencereyi kapatın.
- Bu geçici adres Google'da çıkmaz (Cloudflare ve site "dizine ekleme" der). Gerçek alan adı canlıya alınınca Google onu listeler.
- Gerekli program (Cloudflare `cloudflared`) bu bilgisayara kuruldu. Başka bir bilgisayarda: `winget install --id Cloudflare.cloudflared`.

**Burak iPhone'dan bakarken:**
- Safari ile açsın. Paylaş › **Ana Ekrana Ekle** yaparsa site, BA simgesiyle uygulama gibi açılır.
- Pil tasarrufu (Düşük Güç Modu) açıksa iPhone videoları kendiliğinden oynatmaz; oynat düğmesine basınca oynar. Bu normaldir.

## Burak'a (ya da ekibe) admin panelini uzaktan açmak
**`Burak'a Admin Paneli.bat`** dosyasına çift tıklayın. 10–20 saniye içinde pencerede bir **link** ve bir **şifre** çıkar. İkisi birlikte panoya kopyalanır; WhatsApp'tan Burak'a yapıştırın.

- **Telefondan da çalışır.** Burak linki açar, şifreyi girer ve paneli sizin gibi kullanır: model ekleme, fotoğraf ve video yükleme, ayarlar, yayınlama.
- **Şifre her açılışta yeniden üretilir.** Pencere kapanınca link de şifre de geçersiz olur. Sekiz hatalı denemeden sonra o bağlantıdan 15 dakika giriş yapılamaz.
- **Uzaktan yalnızca panel ve site açılır.** README, betikler ve yedekler kapalıdır. "Klasörü göster" düğmesi yalnızca sizin bilgisayarınızda çalışır.
- **Aynı anda çalışabilirsiniz.** Siz kendi panelinizi (`Admin Paneli.bat`) açık tutarken Burak uzaktan çalışabilir. İkiniz aynı anda kaydederseniz panel bunu fark eder: ikinci kaydı reddeder, "Bu arada başka biri de kaydetti, sayfayı yenileyin" der. Kimsenin işi sessizce silinmez.
- **Değişiklikler gerçek dosyalara yazılır.** Burak'ın panelde yaptığı her şey sizin bilgisayarınızdaki siteyi değiştirir. Yanlışlık olursa eski hali `.yedek` klasöründedir; Git kullanıyorsanız `git diff` ile de görebilirsiniz.

Bu, test ve küçük ekip için geçici bir çözümdür. Kalıcı çözüm, sunucuda kullanıcı adı, şifre ve rollerle çalışan paneldir (2. aşama).

## Siteyi internette güncellemek
> **Kendi sunucunuzda yayın** (Aldivent ile aynı sunucu, Caddy + Cloudflare, GitHub'a her gönderimde otomatik yayın): adımlar [`deploy/README.md`](deploy/README.md) dosyasındadır.

1. Panelde **Yayınla › Yayın klasörünü hazırla**'ya basın.
2. **"yayin" klasörünü göster** ile klasörü açın.
3. İlk kez yayınlıyorsanız https://app.netlify.com/drop adresine gidin ve `yayin` klasörünü sayfaya sürükleyin. Site birkaç saniyede yayına girer.
4. Sonraki güncellemelerde aynı adresi korumak için Netlify'da sitenizi açın, **Deploys** bölümüne gidin ve `yayin` klasörünü oradaki sürükle-bırak alanına bırakın.
5. Kendi alan adınızı Netlify'dan bağlayın (örn. burakaltas.com, yıllık ~10–15 $). Sonra paneldeki **Ayarlar › Alan adı** alanını güncelleyin.

`yayin` klasörüne yalnızca sitenin dosyaları girer. Admin paneli, yedekler ve bu not internete yüklenmez.

## Sayfalar
| Dosya | İçerik |
|---|---|
| `index.html` | Ana sayfa: hero, Yakamoz koleksiyonu, siluetler, uzaktan dikim süreci, "Yetişir mi?" hesaplayıcı, After Party, yorumlar, Instagram |
| `collection.html` | Katalog: koleksiyon, siluet, yaka ve detay filtreleri, sıralama, **ad ya da kodla arama** (Instagram'da paylaşılan "BA-104" gibi kodlar; `collection.html?q=BA-104` linki de çalışır) ve **son baktıklarınız** şeridi |
| `gown-<model>.html` | Model sayfaları (panel üretir): galeri, kişiselleştirme, Etsy ve WhatsApp butonları, takvim, kombin önerileri |
| `designer.html` | Burak Altaş'ın tanıtım sayfası (panelden doldurulur) |
| `atelier.html` | Atölye hikâyesi, malzemeler, uzaktan ölçü süreci, SSS |
| `fitting.html` | **Online prova odası:** 3 randevu türü, gelinin kendi saat diliminde gün ve saat seçimi, ölçü görüşmesi için kadın / erkek / fark etmez tercihi, hazırlık listesi, **ölçü kartı** (aşağıda) |
| `contact.html` | 3 adımlı talep formu (WhatsApp ya da e-posta ile gönderilir) |
| `policies.html` | Gizlilik (KVKK & GDPR), sipariş, üretim, kargo, iade & tadilat. Her sayfanın altından bağlantı verilir. |
| `shortlist.html` | Favoriler; "Ailemle paylaş" linki ve "kendime gönder" (WhatsApp / e-posta / link). Favoriler yalnızca o tarayıcıda saklandığı için gelin linki kendine gönderip başka cihazda listeyi geri açabilir. |
 Favoriler **yan yana karşılaştırılabilir** (fiyat, siluet, yaka, detaylar, kumaş, üretim süresi, el işçiliği, fotoğraftaki model).

## Online randevu sistemi
Site şu an **kendi talep sistemiyle** çalışıyor:
1. Gelin randevu türünü, günü ve saati seçer.
2. Saatler gelinin kendi saat diliminde, yanında İzmir saatiyle gösterilir.
3. Talep, iki saat de yazılı olarak WhatsApp'a düşer. Siz onaylayıp görüşme linkini gönderirsiniz.

Gün ve saatleri panelden (**Ayarlar › Online randevular**) değiştirebilirsiniz.

**Tam otomatik takvime geçmek için (ücretsiz, ~15 dakika):**
1. https://cal.com adresinden ücretsiz hesap açın.
2. Settings → Calendars bölümünden Google Takvim'i bağlayın. Dolu saatleriniz otomatik kapanır.
3. Availability bölümünde günleri ve saatleri ayarlayın; saat dilimi **Europe/Istanbul** olsun.
4. Şu linklerle 3 etkinlik (Event Type) oluşturun. Location olarak **Cal Video** (ücretsiz, tarayıcıda açılır) ya da Google Meet seçin.
   - `tasarim-gorusmesi` (30 dk)
   - `olcu-gorusmesi` (45 dk)
   - `prova-onay` (30 dk)
5. Her etkinliğe şu soruları ekleyin: "WhatsApp numarası", "Düğün tarihi", "Beğendiğiniz modeller". Ölçü görüşmesine "Ölçüyü kim alsın? (Fark etmez / Kadın / Erkek)" sorusunu da ekleyin.
6. Cal.com kullanıcı adınızı panelde **Ayarlar › Cal.com kullanıcı adı** alanına yazın.

## Ölçü kartı (`fitting.html#measure-card`)
Bir gelinlik kalıpçısının ve bir test mühendisinin incelemesiyle yeniden yazıldı.

- **31 ölçü**, yardımcının ölçtüğü sırayla gruplanır: boy › çevre ölçüleri › ön beden › yanlar ve kollar › arka › bacak ve etek › ayakkabıyla.
- **Yalnızca gereken ölçüler görünür.** Gelin siluet, kol ve yaka seçer. Straplez prenses modelde 18 ölçü çıkar, balık ve uzun kolda 30. "Henüz bilmiyorum" seçiliyse gerekebilecek tüm ölçüler görünür. Kısa elbise sayfasından gelinirse siluet kendiliğinden seçilir.
- **Başlamadan önce kuralları:** bele kurdele bağlama, ne giyileceği, duruş, her ölçüyü iki kez alma, gönderirken fotoğraf ekleme.
- **Akıllı uyarılar gönderimi engellemez:**
  - cm alanına inç, inç alanına cm ya da milimetre yazılırsa fark eder ve tek dokunuşla düzeltir ("111,8 cm yap").
  - Yarım tur ölçülmüş çevreyi fark eder.
  - Ölçüleri birbiriyle karşılaştırır. Örnekler: göğüs altı göğüsten büyükse "yer değişmiş olabilir mi?" diye sorar; boyun çukuru – yer, boyun çukuru – bel ile bel – yer toplamını tutmazsa uyarır; sırt genişliği omuzdan büyükse uyarır.
  - Yalnızca rakam olmayan değer gönderimi durdurur. Eksik ya da alışılmadık değerlerde bir kez sorar; mesajda ⚠ ile işaretler.
- **Kolay yazım:** `86,5`, `86.5 cm`, `34 in`, `34½`, `34 1/2`, boy için `5'6"` hepsi doğru okunur. Enter bir sonraki ölçüye geçer.
- **Gönderme:** WhatsApp, e-posta ya da "Metni kopyala". Mesajda gelinin seçimleri, ölçüyü kimin aldığı, eksik ölçüler ve notlar bulunur. İngilizce mesajlarda her satırda Türkçe ad da yazar.
- **Yazdırma:** Dolu kart ve boş şablon tek A4 sayfaya sığar (iki dilde ad, 1./2. ölçüm sütunları, işaret kutuları). Tarayıcıdan Ctrl+P ile de kart yazdırılır.
- **Diğer:** "Kartı temizle"nin 10 saniyelik geri alma seçeneği var. Kayıt başarısız olursa (gizli sekme) gelin uyarılır. Instagram içinden açanlara "tarayıcıda aç" önerilir.

## Canlı sohbet (site içi mesajlaşma)
Sağ alttaki buton **"Bize yazın"** olur ve iki seçenek sunar: **Canlı sohbet** (gelin sitede yazar) ve **WhatsApp**. Sohbette, gelinin baktığı model, favorileri ve düğün tarihi size otomatik görünür.

Kurulum (ücretsiz, ~10 dakika):
1. https://www.tawk.to adresinden ücretsiz hesap açın. Site adresi olarak alan adınızı yazın.
2. **Administration › Chat Widget** bölümünde:
   - Dili seçin.
   - Sohbet öncesi formu açın (**Pre-Chat Form:** ad ve e-posta). Böylece gelin siteden ayrılsa da cevabınız e-postasına gider.
   - Çevrimdışı mesajı ayarlayın.
3. Aynı sayfadaki embed kodunda `https://embed.tawk.to/…` ile başlayan adresi kopyalayın.
4. Panelde **Ayarlar › Canlı sohbet** alanına yapıştırıp kaydedin, ardından **Yayınla**.
5. Burak ve ekip, telefonlarına **tawk.to** uygulamasını (iOS / Android) kursun. Mesajlar telefona bildirim olarak gelir ve oradan cevaplanır.

Notlar:
- İsterseniz Tawk.to'da Türkçe ziyaretçiler için ikinci bir widget açıp ID'sini "Türkçe widget ID" alanına yazabilirsiniz.
- Sohbet servisi, gelin "Canlı sohbet"e basana kadar yüklenmez. Böylece site hızlı kalır, ziyaretçi de kendisi istemeden bir dış servise bağlanmamış olur.
- Etsy kuralını unutmayın: Etsy'den gelen bir alıcıyı sohbette Etsy dışında satın almaya yönlendirmeyin.

## Sizin bilgi vermeniz ya da karar vermeniz gerekenler
- [ ] **Burak'ın sayfası:** Panel › Tasarımcı. Portre, atölye fotoğrafı, hikâye (yardımcı sorular panelde), alıntı ve gerçek rakamlar girilmeli.
- [ ] **Her model için Etsy ilan linki:** Panel › Modeller › Düzenle › Satış. Şu an tüm butonlar mağaza ana sayfasına gidiyor; test gelinlerinin en büyük şikâyeti buydu.
- [ ] **Gerçek fotoğraflar:** Örnek görseller model açıklamalarıyla uyuşmuyor. Her modele en az 3 fotoğraf girin: ön, arka, detay. Panel, örnek fotoğraf kullanan modelleri listede işaretler.
- [ ] **Model bilgileri:** İsimler, hikâyeler, kumaşlar, işçilik saatleri ve fiyatlar örnektir; gerçek modellere göre düzenleyin.
- [ ] **Gelin yorumları:** Şu an örnek. Instagram'daki "Gelin yorumları"ndan izin alarak gerçekleriyle değiştirin.
- [ ] **Ana sayfadaki 340 saat / 2.000 inci** rakamlarını teyit edin.
- [ ] **E-posta adresi ve Etsy mağaza linki** tahminidir. Panel › Ayarlar'dan düzeltin.
- [ ] **Burak ile teyit edin:**
  - "Tasarım görüşmesi ücretsiz, ölçü ve prova randevuları siparişe dahil" ifadesi
  - Ekspres üretim ve değişikliklerin (kol, kuyruk) ek ücreti
  - İade, tadilat, gümrük ve numune politikaları
- [ ] **Görüşme saatleri** 10:00–21:00 (Türkiye) olarak ayarlı; İngiltere ve Körfez'deki gelinler akşam saati istedi. Panel › Ayarlar'dan değiştirebilirsiniz.
- [ ] **Gizlilik & koşullar sayfasını (`policies.html`) Burak ile okuyun.** Özellikle şunları teyit edin:
  - Ölçüye özel ürünlerde "fikir değişikliği" iadesi yok; atölye hatasında düzeltme yapılıyor.
  - Mesajlar, ölçüler ve fotoğraflar sipariş bitince siliniyor (ne kadar süre sonra?).
  - After party elbiseleri 4–6 hafta, kargo 3–7 gün.
  - Metni değiştirmek gerekirse `policies.html` (İngilizce) ve `assets/js/i18n.js` içindeki `pol.` satırları (Türkçe) düzenlenir.
- [ ] **Ölçü kartındaki üç ifadeyi Burak ile teyit edin.** Değiştirmek gerekirse `assets/js/fitting.js` içindeki `MX` metinlerindedir.
  - "Vücudun kendisini ölçün, fazladan pay eklemeyin": bolluk payını atölye mi ekliyor?
  - Ayakkabı seçilmediyse "yazdığınız topuk yüksekliği hesaba katılır".
  - "Kilonuz 2 kg'dan, göğüs ya da bel ölçünüz 2 cm'den fazla değişirse yeniden ölçün" eşiği.
- [ ] **Kişiselleştirme ücretleri:** Panel › Ayarlar. Boş bırakılan seçenekte ücret yazmaz, `0` yazılırsa "ücretsiz" yazar, sayı yazılırsa "+$120" gibi görünür ve fiyat gelin seçtikçe güncellenir.
- [ ] **Fotoğraftaki modelin boyu ve bedeni:** Panel › Modeller › Düzenle. Yurt dışındaki gelinlerin en çok sorduğu bilgilerden biri.

## Instagram'dan aktarma
Panel › **Instagram'dan aktar**. Instagram'daki eski gönderileri birkaç tıkla taslak modele çevirir.

1. **Arşivi isteyin (bir kez).** Instagram › Ayarlar › Hesaplar Merkezi › Bilgilerin ve izinlerin › Bilgilerini indir. Yalnızca **Gönderiler**, biçim **JSON**, medya kalitesi **Yüksek** seçin. Gelen zip'i bir klasöre çıkarın.
2. **Klasörü seçin.** Panel tüm gönderileri fotoğraflarıyla gösterir; açıklamada arama yapılabilir. Daha önce aktarılanlar "aktarıldı" diye işaretlenir.
3. **Gelinlik gönderilerini işaretleyin ve "taslak yap" deyin.** Her gönderi bir **taslak model** olur:
   - Fotoğrafları web için küçültülür (en fazla 12).
   - Adı açıklamanın başından çıkarılır.
   - Açıklaması Türkçe hikâyeye yazılır.
4. **Taslaklar sitede görünmez.** Modeller listesinde "Taslak" etiketiyle durur. Siluet, fiyat, İngilizce metin ve Etsy linkini girip **Taslak** kutusunu kaldırınca model yayına girer.

Notlar:
- **Gizlilik:** Arşiv bilgisayarınızda okunur; yalnızca seçtiğiniz fotoğraflar siteye eklenir.
- **Videolar:** Video gönderileri bu adımda atlanır. Videoyu model düzenleme ekranından ayrıca ekleyebilirsiniz.

## Henüz dikilmemiş tasarımlar
Daha önce üretilmemiş bir modeli de kataloğa koyabilirsiniz: Burak'ın çizimi ya da bir görselleştirme ile. Panel › Modeller › Düzenle › **"Henüz dikilmedi"** kutusunu işaretleyin.

- Kartta **"Tasarım · sipariş üzerine"** etiketi çıkar.
- Model sayfasında görsellerin çizim ya da görselleştirme olduğu ve modelin gelin için ilk kez dikileceği açıkça yazar.
- **Başka tasarımcıların fotoğraflarını kullanmayın.** Hem telif ihlalidir hem Etsy ilanı kapatabilir.
- **Yapay zekâ görselleri:** Kullanıyorsanız Etsy ilanında da bunu belirtin (Etsy'nin kuralı).

## Model videoları
Fotoğraf kumaşın hareketini, kuyruğun dökülüşünü göstermez; video gösterir. Panel › Modeller › Düzenle › **Video** bölümüne videoyu sürükleyin.

**Sitede nasıl görünür?**
- Model sayfasında galerinin 2. karesi olur. Ekrana gelince sessiz ve döngüde oynar, ekrandan çıkınca durur. Gelin ses açabilir ya da durdurabilir.
- Koleksiyon sayfasında videolu modellerin kartında küçük bir ▶ işareti çıkar. Bilgisayarda fare karta gelince video oynar.
- Telefonunda "veri tasarrufu" ya da "hareketi azalt" açık olan gelinde video kendiliğinden oynamaz; oynat düğmesi görünür.
- Google'a video olarak bildirilir. WhatsApp'ta veya sosyal medyada paylaşılan linkte de video bilgisi bulunur.

**Nasıl çekilmeli?**
- 10–20 saniye, **dikey**. Gelin yürür, döner, kuyruk yere dökülür. Bir de detay yakın çekimi.
- 1080p yeterli; 4K gereksiz büyük olur. 30 MB altı idealdir.
- Müzik eklemeyin; video sessiz başlar.
- **iPhone:** Ayarlar › Kamera › Formatlar › **"En Uyumlu"** seçin. Varsayılan "Yüksek Verimlilik" (HEVC) formatı yalnızca Apple cihazlarda oynar. Panel böyle bir videoyu fark edip uyarır.

**Kapak karesi:** Panel, video oynamadan önce görünen kareyi kendisi seçer. Beğenmezseniz paneldeki videoyu istediğiniz anda durdurup **"Bu kareyi kapak yap"**a basın.

## Ziyaretçi istatistikleri (isteğe bağlı, ücretsiz)
Kaç kişinin geldiğini, hangi model sayfalarına baktığını ve hangi ülkelerden geldiğini görmek için **Cloudflare Web Analytics** kullanılır. Çerez kullanmaz, bu yüzden çerez onay kutusu gerekmez.
1. https://dash.cloudflare.com adresinden ücretsiz hesap açın (alan adını Cloudflare'den alırsanız aynı hesap olur).
2. **Analytics & Logs › Web Analytics › Add a site** bölümüne alan adınızı yazın.
3. Size verilen kodun tamamını ya da yalnızca token'ı panelde **Ayarlar › Ziyaretçi istatistikleri** alanına yapıştırın, ardından **Yayınla**.

İstatistik yalnızca yayındaki sitede çalışır; bilgisayarınızda açtığınız sitede kendi ziyaretleriniz sayılmaz.

## Fiyatların yerel para birimiyle gösterimi
Model sayfasında dolar fiyatın yanında, gelinin bulunduğu ülkenin para birimiyle yaklaşık karşılığı görünür (≈ €1.370, ≈ £1.180, ≈ ₺73.200 gibi). Kurlar Avrupa Merkez Bankası verisidir ve her **Yayınla** ile güncellenir. Ödeme yine Etsy'de, Etsy'nin kuruyla yapılır.

## Etsy kuralları
Site bir vitrin işlevi görür; satış Etsy'den yapılır.
- Etsy üzerinden gelen müşteriye Etsy mesajlarında WhatsApp numarası ya da site linki **vermeyin**. Etsy, platform dışı satışa yönlendirmeyi yasaklıyor.
- Sitede Etsy'den daha ucuz bir "direkt fiyat" göstermeyin.

## Birlikte çalışma (GitHub)
Depo: https://github.com/alimkozak/burakaltas-atelier

**İlk kurulum** (Node.js 18 ya da üstü, önerilen 22 LTS; başka bir şey kurmaya gerek yok):
1. Depoyu indirin: `git clone https://github.com/alimkozak/burakaltas-atelier.git`
2. `node admin.js` çalıştırın. Panel http://localhost:5600/admin, site önizlemesi http://localhost:5600/ adresinde açılır.

Model sayfaları, sitemap, `built.js` ve `fx.js` **depoda tutulmaz**. Panel ve önizleme açılırken kendiliğinden üretilir; elle üretmek için: `node build.js`. Yayın klasöründeki sürüm damgaları (`app.js?v=…`) da yalnızca yayında basılır. Böylece iki kişi aynı anda çalışırken bu dosyalarda çakışma çıkmaz.

**Çalışma düzeni:**
- İşe başlamadan önce: `git pull`
- Her iş için ayrı dal açın: `git checkout -b olcu-karti-duzeltme`. Bitince GitHub'da Pull Request açın, diğer kişi baktıktan sonra birleştirin.
- **Katalog içeriği** (`data.js`, `config.js`, yüklenen fotoğraflar) tek kişinin, panelle yönettiği şey olsun. Kod değişiklikleri ise dallarda yapılsın. Aynı anda iki kişi panelden model eklerse `data.js`'de çakışma çıkabilir.
- Çakışma yine de çıkarsa ve üretilen bir dosyadaysa: dosyayı silin ve `node build.js` çalıştırın.

**Yayına alma:** Netlify'ı GitHub deposuna bağlarsanız `netlify.toml` gereken ayarı içerir: `node build.js --yayin` çalıştırır ve `yayin` klasörünü yayınlar. Her `main` güncellemesinde site kendiliğinden güncellenir.

## Türkçe sayfalar ve Google
Site iki dilde **ayrı adreslerle** yayınlanır: İngilizce `burakaltas.com/collection.html`, Türkçe `burakaltas.com/tr/collection.html`.

- **Google Türkçeyi de görür.** Türkçe sayfalar `build.js` ile hazır HTML olarak üretilir. Google ve WhatsApp ya da Instagram link önizlemeleri Türkçe başlık ve açıklamayı görür. Önceden Türkçe metin yalnızca tarayıcıda, JavaScript ile yazılıyordu ve Google'a görünmüyordu.
- **İki dil birbirine bağlıdır.** Her sayfa "bu sayfanın diğer dili şurada" bilgisini (hreflang) taşır. Site haritasında iki dil birlikte yer alır.
- **Dil düğmesi ikiz sayfaya geçer.** Türkçe tarayıcıyla İngilizce bir adrese gelen ziyaretçi Türkçe sayfaya yönlenir. Eski `?lang=tr` linkleri de çalışır.
- **Çeviriler tek yerden gelir.** Türkçe metinler yine `assets/js/i18n.js` dosyasındadır. Türkçe sayfaların başlık ve açıklamaları `build-tr.js` içindedir. `tr/` klasörü her build'de yeniden üretilir, elle düzenlemeyin.

## Teknik notlar (yazılımcı için)
- Veriler `assets/js/data.js` ve `assets/js/config.js` dosyalarındadır. Panel bu dosyaları yazar; elle de düzenlenebilir.
- Elle düzenlemeden sonra şunu çalıştırın: `node build.js` (yayın klasörü için `node build.js --yayin`).
- Metin çevirileri `assets/js/i18n.js` dosyasındadır. İngilizce metinler HTML'de, Türkçe karşılıkları bu dosyadadır. İngilizcesi boş bırakılan model metinlerinde sitede Türkçesi gösterilir.
- Panel yalnızca bu bilgisayardan erişilebilir (127.0.0.1), internete açılmaz.
- `onizleme.js` (port 5700) yalnızca yayına girecek dosyaları sunar (`yayin` klasörüyle aynı liste) ve Cloudflare Quick Tunnel açar. Önbelleği kapalıdır, `noindex` başlığı gönderir.
- Bilgisayardaki Node.js sürümü 18; desteği bitti. Panel çalışıyor ama https://nodejs.org adresinden 22 LTS'ye geçmek önerilir.
- `build.js`, **yayın klasöründeki** sayfaların JS/CSS bağlantılarına içerik özeti ekler (`app.js?v=…`); kaynak sayfalar temiz kalır. Böylece yayından sonra ziyaretçiler eski kataloğu önbellekten görmez. JS/CSS bir yıl önbelleğe alınabilir, HTML her seferinde kontrol edilir (bkz. `netlify.toml`; kendi sunucuda Caddy'de aynı başlıklar kullanılmalı).
- Videolar `assets/video/uploads/` klasörüne kaydedilir. Yayın klasörüne yalnızca sitede kullanılan fotoğraf ve videolar kopyalanır; silinen ya da değiştirilen eski dosyalar internete gitmez, bilgisayarda kalır.
- Döviz kurları `assets/js/fx.js` dosyasına yayın sırasında yazılır; ziyaretçinin tarayıcısı dış servise bağlanmaz.
- Yazı tipleri (Bodoni Moda, Jost — açık lisanslı) `assets/fonts` klasöründen sunulur, Google Fonts'a bağlanılmaz (AB'de GDPR riski). İletişim sayfasındaki Google Haritalar yalnızca ziyaretçi "Haritayı göster"e basınca yüklenir.
