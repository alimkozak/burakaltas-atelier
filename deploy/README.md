# Sunucuya yayın: kurulum rehberi

Site, Aldivent ile aynı sunucuda, Aldivent'in mevcut **Caddy** web sunucusu üzerinden yayınlanır. Önde Cloudflare durur. GitHub'a her gönderimden sonra site kendiliğinden derlenip sunucuya yüklenir.

```
GitHub (main) ──► GitHub Actions: node build.js --yayin ──► rsync ──► sunucu: /srv/burakaltas/yayin
                                                                       └─► Caddy (Aldivent'inki) ──► Cloudflare ──► ziyaretçi
```

`burakaltas.caddy` dosyası bilgisayarda Caddy 2.11 ile test edildi. Test edilenler:
- **Önbellek:** Sayfalar her seferinde kontrol ediliyor; JS, CSS ve fontlar bir yıl önbellekte kalıyor.
- **Sıkıştırma:** zstd ve gzip açık.
- **Güvenlik:** 5 güvenlik başlığı gönderiliyor.
- **Yönlendirmeler ve hata sayfası:** `/tr` → `/tr/` yönlendirmesi ve 404 sayfası doğru çalışıyor.
- **Dosya türleri:** Font ve manifest dosyaları doğru türle gidiyor.

GitHub Actions iş akışı (`.github/workflows/deploy.yml`) ise sunucu olmadan denenemedi. İlk gerçek yayında kontrol edin.

## 1. Sunucuda bir kez

```bash
# yayın kullanıcısı ve klasör
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /srv/burakaltas && sudo chown deploy:deploy /srv/burakaltas

# GitHub'ın bağlanacağı anahtar (özel anahtarı GitHub'a koyacaksınız)
sudo -u deploy ssh-keygen -t ed25519 -N "" -f /home/deploy/gh_deploy
sudo -u deploy sh -c 'mkdir -p ~/.ssh && cat ~/gh_deploy.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
sudo cat /home/deploy/gh_deploy        # bunu kopyalayın → GitHub secret DEPLOY_SSH_KEY
sudo rm /home/deploy/gh_deploy         # sonra sunucudan silin
```

## 2. Caddy'ye siteyi tanıtın (Aldivent'in docker-compose dosyası)

Aldivent'in Caddy kapsayıcısına iki satır eklenir: site klasörü ve bu ayar dosyası. Salt okunur bağlanır, Caddy siteyi değiştiremez.

```yaml
  caddy:
    volumes:
      - /srv/burakaltas/yayin:/srv/burakaltas/yayin:ro
      - ./sites/burakaltas.caddy:/etc/caddy/sites/burakaltas.caddy:ro
```

`deploy/burakaltas.caddy` dosyasını sunucuda `sites/` klasörüne kopyalayın ve Aldivent'in `Caddyfile`'ının sonuna şunu ekleyin:

```
import /etc/caddy/sites/burakaltas.caddy
```

Ardından:

```bash
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile   # "Valid configuration"
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Bu değişiklikleri Aldivent'in Claude oturumuna yaptırmak isterseniz, bu bölümü ona olduğu gibi verebilirsiniz.

## 3. Cloudflare (alan adları)

| Kayıt | Tür | Değer | Proxy |
|---|---|---|---|
| `www.burakaltas.com` | A | sunucu IP'si | Açık (turuncu bulut) |
| `burakaltas.com` | A | sunucu IP'si | Açık |
| `burakaltas.com.tr`, `www.burakaltas.com.tr` | A | sunucu IP'si | Açık |

- **SSL/TLS ayarı:** **Full (strict)**. Caddy sertifikayı kendisi alır.
- **Yönlendirmeler:** `burakaltas.com` → `www`, `.com.tr` → Türkçe sayfalar. Bunları `burakaltas.caddy` yapar; Cloudflare'de ayrıca kural gerekmez.

## 4. GitHub'da (Settings › Secrets and variables › Actions)

| Ad | Tür | Örnek |
|---|---|---|
| `DEPLOY_HOST` | Variable | `203.0.113.10` |
| `DEPLOY_USER` | Variable | `deploy` |
| `DEPLOY_PATH` | Variable | `/srv/burakaltas` |
| `DEPLOY_SSH_KEY` | **Secret** | 1. adımda kopyaladığınız özel anahtar |

`DEPLOY_HOST` girilmeden iş akışı çalışmaz, "skipped" görünür. Girildikten sonra Actions › **Build & deploy** › **Run workflow** ile ilk yayını başlatın.

## Elle yayın (GitHub'sız, acil durum)

```bash
node build.js --yayin
rsync -az --delete yayin/ deploy@SUNUCU:/srv/burakaltas/yayin/
```

Windows'ta `rsync` yoksa `scp -r yayin/* deploy@SUNUCU:/srv/burakaltas/yayin/` da olur.

## Notlar
- **Fotoğraf ve videolar:** Panelden yüklenenler `assets/img/uploads` ve `assets/video/uploads` klasörlerine yazılır ve Git ile GitHub'a gönderilmelidir; GitHub'daki kopya yayına gider. Panel videoyu 95 MB ile sınırlar, çünkü GitHub 100 MB üstü dosyaları kabul etmez.
- **Geri dönüş:** Bir önceki yayın sunucuda `yayin.old` olarak durur. Geri dönmek için:
  ```bash
  cd /srv/burakaltas && mv yayin yayin.bad && mv yayin.old yayin
  ```
- **Önbellek temizliği gerekmez:** HTML her seferinde kontrol edilir, JS ve CSS'in adresi her yayında değişir. Cloudflare'de önbellek temizlemeye gerek yoktur.
