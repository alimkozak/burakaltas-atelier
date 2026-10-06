/* ==========================================================================
   BURAK ALTAŞ ATELIER — SİTE AYARLARI
   Admin panelinin "Ayarlar" sekmesinden düzenlenir (elle de düzenlenebilir).
   ========================================================================== */
window.SITE = {
  brand: "Burak Altaş Atelier",
  // WhatsApp numarası: ülke kodu ile, + ve boşluk OLMADAN
  whatsapp: "905417169862",
  phoneDisplay: "+90 541 716 98 62",
  email: "hello@burakaltas.com",
  instagram: "https://www.instagram.com/burakaltas_atelier/",
  instagramHandle: "@burakaltas_atelier",
  // Yeni açılacak influencer hesabı
  instagramStudio: "",
  etsyShop: "https://www.etsy.com/shop/BurakAltasAtelier",
  mapsUrl: "https://maps.app.goo.gl/vkSZjnWCQ6dEiat17",
  city: "İzmir",
  address: "Akdeniz Mah., Gazi Blv. No:38, 35210 Konak / İzmir, Türkiye",
  hours: {"en":"Mon–Sat · 10:00–19:00 (GMT+3)","tr":"Pzt–Cmt · 10:00–19:00"},
  // Fiyatları sitede göstermek için true, gizlemek için false
  showPrices: true,
  // Kişiselleştirme ücretleri (USD). null = sitede ücret gösterme, 0 = "ücretsiz", sayı = "+$X"
  extras: {
    "colour": null,
    "sleevesLong": null,
    "sleevesDetachable": null,
    "trainShorter": null,
    "trainCathedral": null
  },
  currency: "USD",
  // Form gönderimi için (isteğe bağlı) formspree.io form ID'si. Boşsa form WhatsApp'a yönlenir.
  formspreeId: "",
  // Üretim süresi (hafta) — "Yetişir mi?" hesaplayıcısı bunu kullanır
  production: {"minWeeks":8,"maxWeeks":12,"expressWeeks":5,"shippingDays":7},
  // ONLINE PROVA RANDEVULARI
  // calcomUser boşken site kendi talep sistemini kullanır (seçilen saat WhatsApp'a gelir).
  // Cal.com kullanıcı adınızı yazınca takvim siteye gömülür.
  appointments: {
    "calcomUser": "",
    "timezone": "Europe/Istanbul",
    "utcOffset": 3,
    "days": [
      1,
      2,
      3,
      4,
      5,
      6
    ],
    "start": 10,
    "end": 21,
    "daysAhead": 21,
    "types": {
      "consult": {
        "minutes": 30,
        "cal": "tasarim-gorusmesi"
      },
      "measure": {
        "minutes": 45,
        "cal": "olcu-gorusmesi"
      },
      "fitting": {
        "minutes": 30,
        "cal": "prova-onay"
      }
    }
  },
  // CANLI SOHBET (Tawk.to — ücretsiz). Boşsa sitede yalnızca WhatsApp butonu görünür.
  // tawk.to › Administration › Chat Widget › embed kodundaki adres: https://embed.tawk.to/PROPERTY_ID/WIDGET_ID
  chat: {
    "tawkPropertyId": "",
    "tawkWidgetId": "default",
    "tawkWidgetTr": ""
  },
  // ZİYARETÇİ İSTATİSTİKLERİ (Cloudflare Web Analytics — ücretsiz, çerezsiz). Boşsa kapalı.
  analytics: {
    cloudflareToken: ""
  },
  // Sitenin yayınlanacağı alan adı (SEO ve paylaşım bağlantıları için)
  domain: "https://www.burakaltas.com"
};
