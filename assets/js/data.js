/* ==========================================================================
   KATALOG VERİSİ — Admin panelinden yönetilir:
   "Admin Paneli.bat" → http://localhost:5600/admin
   (Elle de düzenleyebilirsiniz; kaydettikten sonra: node build.js)
   images: kendi fotoğraflarınız "assets/img/…" yolu ile, örnek görseller Unsplash ID'si ile.
   silhouette: ballgown | aline | mermaid | column | mini
   neckline:   strapless | sweetheart | offshoulder | square | halter | vneck | highneck
   features:   pearls | feathers | lace | slit | detachable | sleeves | corset | train | gloves | beading
   ========================================================================== */

window.COLLECTIONS = [
  {
    "id": "yakamoz",
    "name": {
      "tr": "Yakamoz",
      "en": "Yakamoz"
    },
    "season": "Couture 2027",
    "meaning": {
      "tr": "Ay ışığının gece denizde bıraktığı parıltı.",
      "en": "The shimmer moonlight leaves on the night sea — a Turkish word with no translation."
    }
  },
  {
    "id": "afterparty",
    "name": {
      "tr": "After Party",
      "en": "After Party"
    },
    "season": "Edition 2027",
    "meaning": {
      "tr": "Düğünün ikinci yarısı için: tüyler, inciler ve özgürlük.",
      "en": "For the second half of the night: feathers, pearls and freedom to dance."
    }
  }
];

window.GOWNS = [
  {
    "id": "yakamoz",
    "no": "BA-101",
    "name": "Yakamoz",
    "collection": "yakamoz",
    "meaning": {
      "en": "moonlight on the sea",
      "tr": "denizde ay parıltısı"
    },
    "silhouette": "ballgown",
    "neckline": "strapless",
    "features": [
      "pearls",
      "corset",
      "train",
      "beading"
    ],
    "fabric": {
      "en": "Italian mikado, hand-sewn pearls and crystal beading",
      "tr": "İtalyan mikado, el işi inci ve kristal işleme"
    },
    "hours": 310,
    "price": 1490,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1622277430358-f4d134452e2e",
      "1532454781337-fc3edff34f91",
      "1524563970700-a302b6888e17"
    ],
    "story": {
      "en": "The atelier's signature. A boned corset sculpts the waist, two thousand pearls are hand-sewn one by one, and the skirt moves like moonlight on water.",
      "tr": "Atölyenin imza modeli. Balenli korse beli inceltir, iki bin incinin her biri elde dikilir; etek, yürürken denizin ışığı gibi kıpırdar."
    },
    "featured": true
  },
  {
    "id": "sedef",
    "no": "BA-102",
    "name": "Sedef",
    "collection": "yakamoz",
    "meaning": {
      "en": "mother-of-pearl",
      "tr": "inci kabuğunun iç parıltısı"
    },
    "silhouette": "mermaid",
    "neckline": "vneck",
    "features": [
      "lace",
      "train",
      "beading"
    ],
    "fabric": {
      "en": "French Chantilly lace over silk tulle",
      "tr": "Fransız Chantilly dantel, ipek tül"
    },
    "hours": 240,
    "price": 1290,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1585241920473-b472eb9ffbae",
      "1660325848053-f067c31f22ca",
      "1512750129023-cacd58b7be35"
    ],
    "story": {
      "en": "A mermaid line that follows the body like a second skin. The open back closes with forty-two covered buttons.",
      "tr": "Vücudu ikinci bir ten gibi saran balık kesim. Açık sırt, kırk iki kaplı düğmeyle kapanır."
    },
    "featured": true
  },
  {
    "id": "mehtap",
    "no": "BA-103",
    "name": "Mehtap",
    "collection": "yakamoz",
    "meaning": {
      "en": "moonlight",
      "tr": "ay ışığı"
    },
    "silhouette": "aline",
    "neckline": "sweetheart",
    "features": [
      "train",
      "corset"
    ],
    "fabric": {
      "en": "Layered silk chiffon over organza",
      "tr": "Katmanlı ipek şifon, organze astar"
    },
    "hours": 160,
    "price": 990,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1599142296733-1c1f2073e6de",
      "1502955422409-06e43fd3eff3"
    ],
    "story": {
      "en": "A skirt that talks to the wind. Light yet grand — made for seaside, vineyard and open-air weddings.",
      "tr": "Rüzgârla konuşan bir etek. Sahil, bağ ve açık hava düğünleri için hafif ama görkemli."
    },
    "featured": true
  },
  {
    "id": "efsun",
    "no": "BA-104",
    "name": "Efsun",
    "collection": "yakamoz",
    "meaning": {
      "en": "enchantment",
      "tr": "büyü"
    },
    "silhouette": "ballgown",
    "neckline": "offshoulder",
    "features": [
      "train",
      "corset"
    ],
    "fabric": {
      "en": "Ruffled silk tulle, twelve-layer skirt",
      "tr": "Volanlı ipek tül, on iki kat etek"
    },
    "hours": 280,
    "price": 1390,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1549417229-7686ac5595fd",
      "1549416878-b9ca95e26903"
    ],
    "story": {
      "en": "A cloud of twelve tulle layers with a soft off-shoulder line. Designed for grand staircase entrances.",
      "tr": "On iki kat tülden oluşan bulut etek ve omuz açık yaka. Merdiven inişleri için tasarlandı."
    }
  },
  {
    "id": "nilufer",
    "no": "BA-105",
    "name": "Nilüfer",
    "collection": "yakamoz",
    "meaning": {
      "en": "water lily",
      "tr": "su zambağı"
    },
    "silhouette": "mermaid",
    "neckline": "sweetheart",
    "features": [
      "detachable",
      "corset",
      "lace"
    ],
    "fabric": {
      "en": "Crepe-satin body with a detachable lace overskirt",
      "tr": "Krep saten gövde, çıkarılabilir dantel etek"
    },
    "hours": 220,
    "price": 1450,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1596181243306-e02a1897afb1",
      "1556953336-d4f940b602ac"
    ],
    "story": {
      "en": "Two gowns in one: a lace overskirt with train for the ceremony, removed at night to reveal a sleek mermaid.",
      "tr": "İki gelinlik bir arada: tören için kuyruklu dantel etek, gece için çıkarılınca sade bir balık kesim."
    },
    "featured": true
  },
  {
    "id": "lal",
    "no": "BA-106",
    "name": "Lâl",
    "collection": "yakamoz",
    "meaning": {
      "en": "speechless",
      "tr": "sessiz, hayran"
    },
    "silhouette": "column",
    "neckline": "square",
    "features": [
      "slit"
    ],
    "fabric": {
      "en": "Heavy silk crepe",
      "tr": "Ağır ipek krep"
    },
    "hours": 90,
    "price": 790,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1631234764568-996fab371596",
      "1595467959278-14cc0145842a"
    ],
    "story": {
      "en": "No ornament — only a flawless cut. Modern minimalism for civil ceremonies and city weddings.",
      "tr": "Hiç süs yok; yalnızca kusursuz kesim. Nikâh ve şehir düğünleri için modern minimalizm."
    }
  },
  {
    "id": "inci",
    "no": "BA-107",
    "name": "İnci",
    "collection": "yakamoz",
    "meaning": {
      "en": "pearl",
      "tr": "inci"
    },
    "silhouette": "aline",
    "neckline": "highneck",
    "features": [
      "sleeves",
      "lace",
      "pearls"
    ],
    "fabric": {
      "en": "Pearl-embroidered lace sleeves, silk mikado skirt",
      "tr": "İnci işlemeli dantel kollar, ipek mikado etek"
    },
    "hours": 260,
    "price": 1350,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1608245536505-9bab008d00d3",
      "1643216583837-f6d664d48eac",
      "1706741921247-0069d59ff55a"
    ],
    "story": {
      "en": "Long lace sleeves with pearl buttons to the wrist. Covered yet breathtaking — ideal for religious ceremonies.",
      "tr": "Uzun dantel kollar, bileğe kadar inci düğmeler. Kilise ve cami nikâhlarına uygun kapalı ama nefes kesen bir model."
    },
    "featured": true
  },
  {
    "id": "sebnem",
    "no": "BA-108",
    "name": "Şebnem",
    "collection": "yakamoz",
    "meaning": {
      "en": "morning dew",
      "tr": "çiy tanesi"
    },
    "silhouette": "aline",
    "neckline": "strapless",
    "features": [
      "corset",
      "train"
    ],
    "fabric": {
      "en": "Matte satin with a cathedral-length tulle veil",
      "tr": "Mat saten, katedral boy tül duvak"
    },
    "hours": 140,
    "price": 1090,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1529635004337-98bdc35214a7",
      "1529635322560-e767888a1583"
    ],
    "story": {
      "en": "As pure as morning dew. Designed together with its cathedral-length veil.",
      "tr": "Sabah çiyi kadar sade. Katedral boy duvakla birlikte tasarlandı."
    }
  },
  {
    "id": "nazende",
    "no": "BA-109",
    "name": "Nazende",
    "collection": "yakamoz",
    "meaning": {
      "en": "graceful",
      "tr": "nazlı, zarif"
    },
    "silhouette": "ballgown",
    "neckline": "sweetheart",
    "features": [
      "lace",
      "train",
      "beading"
    ],
    "fabric": {
      "en": "3D floral appliqué on silk tulle",
      "tr": "3D çiçek aplike, ipek tül"
    },
    "hours": 290,
    "price": 1450,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1594552072238-b8a33785b261",
      "1678831019375-249f108f78ce"
    ],
    "story": {
      "en": "Three-dimensional flowers, each cut by hand, are scattered over the skirt — arranged anew for every bride.",
      "tr": "Tek tek elde kesilen üç boyutlu çiçekler eteğe serpiştirilir; her gelin için yerleşim yeniden yapılır."
    }
  },
  {
    "id": "gulizar",
    "no": "BA-110",
    "name": "Gülizar",
    "collection": "yakamoz",
    "meaning": {
      "en": "rose-cheeked",
      "tr": "gül yanaklı"
    },
    "silhouette": "aline",
    "neckline": "offshoulder",
    "features": [
      "lace",
      "sleeves",
      "train"
    ],
    "fabric": {
      "en": "Lace bodice, silk organza skirt",
      "tr": "Dantel üst, ipek organze etek"
    },
    "hours": 180,
    "price": 1150,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1548313093-370cf4ba3892",
      "1681490395226-36e00f9bbd2b"
    ],
    "story": {
      "en": "Romantic, classic and timeless — like an heirloom from your mother's chest, cut for today.",
      "tr": "Romantik, klasik ve zamansız. Annenizin sandığından çıkmış gibi, ama bugüne göre kesilmiş."
    }
  },
  {
    "id": "peri",
    "no": "BA-111",
    "name": "Peri",
    "collection": "yakamoz",
    "meaning": {
      "en": "fairy",
      "tr": "peri"
    },
    "silhouette": "aline",
    "neckline": "vneck",
    "features": [
      "lace",
      "beading"
    ],
    "fabric": {
      "en": "Beaded lace with an illusion back",
      "tr": "Boncuk işlemeli dantel, şeffaf sırt"
    },
    "hours": 230,
    "price": 1190,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1574871786514-46e1680ea587",
      "1673960507883-5d7a5351726f",
      "1537790290047-3373a6871c84"
    ],
    "story": {
      "en": "Lace placed on sheer tulle across the back, as if embroidered directly onto the skin.",
      "tr": "Sırtta tül üzerine işlenmiş dantel, sanki tene işlenmiş gibi görünür."
    }
  },
  {
    "id": "gece",
    "no": "BA-112",
    "name": "Gece",
    "collection": "yakamoz",
    "meaning": {
      "en": "night",
      "tr": "gece"
    },
    "silhouette": "ballgown",
    "neckline": "strapless",
    "features": [
      "corset",
      "train",
      "gloves"
    ],
    "fabric": {
      "en": "Duchess satin with opera gloves",
      "tr": "Duchess saten, opera eldivenleri"
    },
    "hours": 200,
    "price": 1250,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1492175742197-ed20dc5a6bed",
      "1523263653976-003efe7f25cf"
    ],
    "story": {
      "en": "For brides who want an entrance: sculptural duchess satin and over-the-elbow opera gloves.",
      "tr": "Dramatik bir giriş isteyen gelinler için: heykel gibi duran saten ve dirseği geçen opera eldivenleri."
    }
  },
  {
    "id": "kugu",
    "no": "BA-113",
    "name": "Kuğu",
    "collection": "yakamoz",
    "meaning": {
      "en": "swan",
      "tr": "kuğu"
    },
    "silhouette": "ballgown",
    "neckline": "offshoulder",
    "features": [
      "feathers",
      "pearls",
      "train"
    ],
    "fabric": {
      "en": "Ostrich feathers on pearl-embroidered tulle",
      "tr": "Devekuşu tüyü, inci işlemeli tül"
    },
    "hours": 340,
    "price": 1690,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1727279523725-f7d619c2264b",
      "1727279523776-7d31dc928484",
      "1530519729491-aea5b51d1ee1"
    ],
    "story": {
      "en": "The atelier's most labour-intensive gown. Every feather is placed by hand and moves softly with each step.",
      "tr": "Atölyenin en çok emek isteyen modeli. Tüyler tek tek elle yerleştirilir; her adımda hafifçe dalgalanır."
    },
    "featured": true
  },
  {
    "id": "hare",
    "no": "BA-114",
    "name": "Hâre",
    "collection": "yakamoz",
    "meaning": {
      "en": "moiré shimmer",
      "tr": "ışıltılı dalga deseni"
    },
    "silhouette": "mermaid",
    "neckline": "strapless",
    "features": [
      "feathers",
      "beading",
      "corset"
    ],
    "fabric": {
      "en": "Sequin- and bead-embroidered tulle, feathered hem",
      "tr": "Pul ve boncuk işlemeli tül, tüy etek ucu"
    },
    "hours": 300,
    "price": 1590,
    "weeks": [
      8,
      12
    ],
    "etsy": "",
    "images": [
      "1688080338472-3d264db22dec",
      "1653976517210-38355016372c"
    ],
    "story": {
      "en": "Embroidery that shifts with the light, on a mermaid line finished with a feathered hem.",
      "tr": "Işıkla birlikte renk değiştiren işleme, eteğin ucunda tüylerle biten bir balık kesim."
    }
  },
  {
    "id": "lodos",
    "no": "AP-201",
    "name": "Lodos",
    "collection": "afterparty",
    "meaning": {
      "en": "the warm south wind",
      "tr": "sıcak güney rüzgârı"
    },
    "silhouette": "mini",
    "neckline": "strapless",
    "features": [
      "feathers",
      "pearls",
      "corset"
    ],
    "fabric": {
      "en": "Pearl-embroidered corset, ostrich-feather skirt",
      "tr": "İnci işlemeli korse, devekuşu tüyü etek"
    },
    "hours": 120,
    "price": 590,
    "weeks": [
      4,
      6
    ],
    "etsy": "",
    "images": [
      "1771621041446-aa8650a6a5ac",
      "1530519729491-aea5b51d1ee1"
    ],
    "story": {
      "en": "The star of the second half of the night, embroidered with the same pearls as your gown — two looks, one story.",
      "tr": "Gecenin ikinci yarısının yıldızı. Gelinlikle aynı incilerle işlenir; iki görünüm, tek hikâye."
    },
    "featured": true
  },
  {
    "id": "poyraz",
    "no": "AP-202",
    "name": "Poyraz",
    "collection": "afterparty",
    "meaning": {
      "en": "the cool north wind",
      "tr": "serin kuzey rüzgârı"
    },
    "silhouette": "mini",
    "neckline": "halter",
    "features": [
      "feathers"
    ],
    "fabric": {
      "en": "Crepe with a feathered hem",
      "tr": "Krep, tüy etek ucu"
    },
    "hours": 70,
    "price": 390,
    "weeks": [
      4,
      6
    ],
    "etsy": "",
    "images": [
      "1766299234906-22a5f7bbeb35"
    ],
    "story": {
      "en": "Halter neck, open back — born to dance.",
      "tr": "Boyundan bağlı, sırtı açık, dans etmek için doğmuş."
    }
  },
  {
    "id": "isil",
    "no": "AP-203",
    "name": "Işıl",
    "collection": "afterparty",
    "meaning": {
      "en": "sparkling",
      "tr": "ışıl ışıl"
    },
    "silhouette": "mini",
    "neckline": "offshoulder",
    "features": [
      "feathers",
      "corset"
    ],
    "fabric": {
      "en": "Satin corset, tiered feather skirt",
      "tr": "Saten korse, katlı tüy etek"
    },
    "hours": 95,
    "price": 490,
    "weeks": [
      4,
      6
    ],
    "etsy": "",
    "images": [
      "1685531372149-4bfcbbb93300"
    ],
    "story": {
      "en": "Off-shoulder corset and tiers of feathers — for henna night, engagement and after party.",
      "tr": "Omuz açık korse ve kat kat tüy. Kına, nişan ve after party için."
    }
  },
  {
    "id": "nisan",
    "no": "AP-204",
    "name": "Nisan",
    "collection": "afterparty",
    "meaning": {
      "en": "April",
      "tr": "bahar ayı"
    },
    "silhouette": "mini",
    "neckline": "square",
    "features": [
      "corset"
    ],
    "fabric": {
      "en": "Structured satin",
      "tr": "Yapılandırılmış saten"
    },
    "hours": 45,
    "price": 320,
    "weeks": [
      4,
      6
    ],
    "etsy": "",
    "images": [
      "1583346292527-522309cc9be3"
    ],
    "story": {
      "en": "Clean and sharp — for a civil ceremony morning, a brunch or a city wedding.",
      "tr": "Nikâh sabahı, brunch ya da şehir düğünü için sade ve keskin."
    }
  },
  {
    "id": "melek",
    "no": "AP-205",
    "name": "Melek",
    "collection": "afterparty",
    "meaning": {
      "en": "angel",
      "tr": "melek"
    },
    "silhouette": "mini",
    "neckline": "sweetheart",
    "features": [
      "feathers",
      "beading"
    ],
    "fabric": {
      "en": "Beaded tulle with feather sleeves",
      "tr": "Boncuk işlemeli tül, tüy kollar"
    },
    "hours": 110,
    "price": 550,
    "weeks": [
      4,
      6
    ],
    "etsy": "",
    "images": [
      "1684836340629-078500793b77"
    ],
    "story": {
      "en": "Feather sleeves and a sweetheart line that look like wings in every photograph.",
      "tr": "Tüy kollar ve kalp yaka; fotoğraflarda kanat gibi görünür."
    }
  },
  {
    "id": "sahil",
    "no": "AP-206",
    "name": "Sahil",
    "collection": "afterparty",
    "meaning": {
      "en": "shore",
      "tr": "kıyı"
    },
    "silhouette": "mini",
    "neckline": "strapless",
    "features": [
      "corset"
    ],
    "fabric": {
      "en": "Crepe satin",
      "tr": "Krep saten"
    },
    "hours": 40,
    "price": 290,
    "weeks": [
      4,
      6
    ],
    "etsy": "",
    "images": [
      "1609175161835-ae5e116aebd6"
    ],
    "story": {
      "en": "Light, easy and timeless — for beach weddings and the honeymoon.",
      "tr": "Plaj düğünleri ve balayı için hafif, rahat, zamansız."
    }
  }
];

/* Atölye ve hikâye görselleri */
window.MEDIA = {
  "hero": "1622277430358-f4d134452e2e",
  "heroAlt": "1532454781337-fc3edff34f91",
  "atelierHands": "1632378464836-a6a856632552",
  "atelierFitting": "1603796846900-d61a14c890ef",
  "atelierHanger": "1668996415041-8a6a1602a3a7",
  "sewing": "1568288796918-03e7d93306bd",
  "silk": "1606259458027-54d2a728b6ab",
  "lace": "1777566131330-43fd5946c8f8",
  "feathers": "1530519729491-aea5b51d1ee1",
  "pearls": "1649502066352-9cd7ade30316",
  "veil": "1550180390-11f5e76784c8",
  "window": "1678831019375-249f108f78ce",
  "underVeil": "1641836014185-61709635efe0"
};

/* Gelin yorumları */
window.REVIEWS = [
  {
    "name": "Elif",
    "place": {
      "en": "İstanbul",
      "tr": "İstanbul"
    },
    "gown": "Yakamoz",
    "text": {
      "en": "I cried the moment I saw myself in the mirror. The pearls glowed even in photos.",
      "tr": "Provada aynaya baktığım an ağladım. İnciler fotoğraflarda bile ışıl ışıldı."
    }
  },
  {
    "name": "Sarah",
    "place": {
      "en": "London, UK",
      "tr": "Londra, Birleşik Krallık"
    },
    "gown": "Nilüfer",
    "text": {
      "en": "We took my measurements on a video call and the dress fit perfectly — no alterations needed.",
      "tr": "Ölçülerimi görüntülü görüşmede aldık ve elbise üzerime tam oturdu. Hiç tadilat gerekmedi."
    }
  },
  {
    "name": "Layla",
    "place": {
      "en": "Dubai, UAE",
      "tr": "Dubai, BAE"
    },
    "gown": "İnci",
    "text": {
      "en": "They made every change I asked for on the sleeves and neckline, and sent photos at every stage.",
      "tr": "Kollar ve yaka için istediğim her değişikliği yaptılar. Her aşamada fotoğraf gönderdiler."
    }
  },
  {
    "name": "Anna",
    "place": {
      "en": "Berlin, Germany",
      "tr": "Berlin, Almanya"
    },
    "gown": "Lodos",
    "text": {
      "en": "My after-party dress was the talk of the night. The feathers were magic on the dance floor.",
      "tr": "After party elbisem gecenin en çok konuşulanıydı. Tüyler dans ederken büyüleyiciydi."
    }
  }
];

/* Tasarımcı sayfası (designer.html). Boş alanlar sitede görünmez. */
window.DESIGNER = {
  "name": "Burak Altaş",
  "title": {
    "en": "Designer & founder",
    "tr": "Tasarımcı & kurucu"
  },
  "photo": "",
  "photo2": "",
  "since": "",
  "intro": {
    "en": "",
    "tr": ""
  },
  "bio": {
    "en": "",
    "tr": ""
  },
  "quote": {
    "en": "",
    "tr": ""
  },
  "highlights": [],
  "press": []
};
