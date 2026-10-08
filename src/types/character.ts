export interface CharacterOutfit {
  id: string;
  name: string;
  price: number;
  suitColor: number;
  armorColor: number;
  accentColor: number;
  glowColor: number;
  description: string;
}

export type CharacterModelStyle =
  | 'bolt'
  | 'titan'
  | 'valkyrie'
  | 'shinobi'
  | 'paladin'
  | 'king'
  | 'zoe'
  | 'harumi'
  | 'pilot'
  | 'tasha'
  | 'samurai'
  | 'frank'
  | 'frizzy'
  | 'cyberpunk'
  | 'carmen'
  | 'biker'
  | 'princek'
  | 'frost'
  | 'kim'
  | 'ella'
  | 'sun'
  | 'alex';

export interface CharacterItem {
  id: string;
  name: string;
  role: string;
  price: number;
  description: string;
  modelStyle: CharacterModelStyle;
  outfits: CharacterOutfit[];
}

export const CHARACTERS_CATALOG: CharacterItem[] = [
  // 1. JAKE
  {
    id: 'bolt',
    name: 'Jake',
    role: 'Asosiy Surfer (Original Crew)',
    price: 0,
    description: 'Subway Surfers afsonaviy qahramoni! Qizil-oq "SUB" kepka, oq xudi, ko‘k jinsi yelek va yashil krossovka.',
    modelStyle: 'bolt',
    outfits: [
      {
        id: 'bolt_default',
        name: 'Klassik Jake',
        price: 0,
        suitColor: 0xf8fafc,
        armorColor: 0x2563eb,
        accentColor: 0xdc2626,
        glowColor: 0x22c55e,
        description: 'Oq xudi, ko‘k jinsi yelek va qizil-oq kepka.',
      },
      {
        id: 'bolt_dark',
        name: 'Dark Outfit Jake',
        price: 80,
        suitColor: 0x1e293b,
        armorColor: 0x0f172a,
        accentColor: 0xef4444,
        glowColor: 0x38bdf8,
        description: 'Qora ko‘cha grafiti xudisi.',
      },
      {
        id: 'bolt_star',
        name: 'Star Outfit Jake',
        price: 150,
        suitColor: 0xf59e0b,
        armorColor: 0x1d4ed8,
        accentColor: 0xfacc15,
        glowColor: 0xfde047,
        description: 'Oltin yulduzli syorfer libosi.',
      },
    ],
  },

  // 2. TRICKY
  {
    id: 'titan',
    name: 'Tricky',
    role: 'Breakdance & Skater Qiz',
    price: 100,
    description: 'Qizil trikotaj shapka, qora ko‘zoynak, oq-qizil sport top va keng jinsi shim kiygan epchil qiz.',
    modelStyle: 'titan',
    outfits: [
      {
        id: 'titan_default',
        name: 'Klassik Tricky',
        price: 0,
        suitColor: 0xffffff,
        armorColor: 0x60a5fa,
        accentColor: 0xdc2626,
        glowColor: 0x22c55e,
        description: 'Qizil shapka, oq top va keng moviy jinsi.',
      },
      {
        id: 'titan_camo',
        name: 'Camo Tricky',
        price: 90,
        suitColor: 0x65a30d,
        armorColor: 0x365314,
        accentColor: 0xfacc15,
        glowColor: 0x84cc16,
        description: 'Harbiy kamo uslubidagi breykdans libosi.',
      },
      {
        id: 'titan_heart',
        name: 'Heart Tricky',
        price: 160,
        suitColor: 0xec4899,
        armorColor: 0x831843,
        accentColor: 0xf43f5e,
        glowColor: 0xfbcfe8,
        description: 'Yorqin pushti skeyter formasi.',
      },
    ],
  },

  // 3. FRESH
  {
    id: 'valkyrie',
    name: 'Fresh',
    role: 'Boombox & Hip-Hop Ustasi',
    price: 150,
    description: 'Baland tekis soch turmagi, ko‘zoynak, yashil mayka, qizil shortik va yelkasida ulkan kumush Boombox!',
    modelStyle: 'valkyrie',
    outfits: [
      {
        id: 'valkyrie_default',
        name: 'Klassik Fresh',
        price: 0,
        suitColor: 0x22c55e,
        armorColor: 0xdc2626,
        accentColor: 0xfacc15,
        glowColor: 0x4ade80,
        description: 'Yashil sport maykasi, qizil shortik va ulkan magnitofon.',
      },
      {
        id: 'valkyrie_funk',
        name: 'Funk Fresh',
        price: 100,
        suitColor: 0x8b5cf6,
        armorColor: 0x4c1d95,
        accentColor: 0xf59e0b,
        glowColor: 0xc084fc,
        description: '80-yillar hip-hop binafsha libosi.',
      },
    ],
  },

  // 4. SPIKE
  {
    id: 'shinobi',
    name: 'Spike',
    role: 'Pank-Rok Isyonchisi',
    price: 200,
    description: 'Tikka turgan pank mohawk soch, oq ko‘ylak va ko‘k galstuk ustidan qora jilet hamda baland pank etiklar!',
    modelStyle: 'shinobi',
    outfits: [
      {
        id: 'shinobi_default',
        name: 'Klassik Spike',
        price: 0,
        suitColor: 0x18181b,
        armorColor: 0x60a5fa,
        accentColor: 0xdc2626,
        glowColor: 0x84cc16,
        description: 'Qora pank jilet, moviy galstuk va tikanli mohawk.',
      },
      {
        id: 'shinobi_rock',
        name: 'Glam Rock Spike',
        price: 120,
        suitColor: 0x991b1b,
        armorColor: 0x1e293b,
        accentColor: 0xfacc15,
        glowColor: 0xef4444,
        description: 'Olovli rok-konsert formasi.',
      },
    ],
  },

  // 5. YUTANI
  {
    id: 'paladin',
    name: 'Yutani',
    role: 'O‘zga Sayyoralik Qiz (Alien Suit)',
    price: 250,
    description: 'Boshida ikkita katta oq ko‘zi va shoxchalari bor yoqimtoy yashil o‘zga sayyoralik kostyumidagi qiz!',
    modelStyle: 'paladin',
    outfits: [
      {
        id: 'paladin_default',
        name: 'Klassik Yutani',
        price: 0,
        suitColor: 0x84cc16,
        armorColor: 0x4d7c0f,
        accentColor: 0xec4899,
        glowColor: 0xa3e635,
        description: 'Yashil o‘zga sayyoralik kombinezoni.',
      },
      {
        id: 'paladin_gadget',
        name: 'Kosmik Yutani',
        price: 130,
        suitColor: 0x06b6d4,
        armorColor: 0x0e7490,
        accentColor: 0xfacc15,
        glowColor: 0x22d3ee,
        description: 'Moviy galaktika skafandri.',
      },
    ],
  },

  // 6. KING
  {
    id: 'king',
    name: 'King',
    role: 'Qirol Syorfer (Peace & Crown)',
    price: 300,
    description: 'Qizil-oq toj shapka, pushti dumaloq ko‘zoynak, Tinchlik (Peace) belgili ko‘k futbolka va qizil-yashil shortik!',
    modelStyle: 'king',
    outfits: [
      {
        id: 'king_default',
        name: 'Klassik King',
        price: 0,
        suitColor: 0x1d4ed8,
        armorColor: 0xdc2626,
        accentColor: 0x84cc16,
        glowColor: 0xec4899,
        description: 'Qizil toj, pushti ko‘zoynak va Peace futbolkasi.',
      },
      {
        id: 'king_royal',
        name: 'Oltin King',
        price: 150,
        suitColor: 0x7e22ce,
        armorColor: 0xb45309,
        accentColor: 0xfacc15,
        glowColor: 0xfde047,
        description: 'Qirollik binafsha va oltin libosi.',
      },
    ],
  },

  // 7. ZOE
  {
    id: 'zoe',
    name: 'Zoe',
    role: 'Zombi-Rokchi Qiz (Zombie Surfer)',
    price: 350,
    description: 'Yashil zombi terisi, sariq sochlar, qizil ko‘zoynak va qizil-qora ko‘cha kiyimidagi jasur qiz!',
    modelStyle: 'zoe',
    outfits: [
      {
        id: 'zoe_default',
        name: 'Klassik Zoe',
        price: 0,
        suitColor: 0xb91c1c,
        armorColor: 0x18181b,
        accentColor: 0xfacc15,
        glowColor: 0x84cc16,
        description: 'Zoe-ning sarg‘ish sochlari va qizil ko‘zoynagi.',
      },
      {
        id: 'zoe_curly',
        name: 'Neon Zoe',
        price: 150,
        suitColor: 0x9333ea,
        armorColor: 0x1e1b4b,
        accentColor: 0x4ade80,
        glowColor: 0xc084fc,
        description: 'Neon binafsha zombi kostyumi.',
      },
    ],
  },

  // 8. HARUMI
  {
    id: 'harumi',
    name: 'Harumi',
    role: 'Tokio Anime Qizi (Meow Surfer)',
    price: 400,
    description: 'Baland qora kokilli soch, qizil bantli oq-ko‘k yapon maktab formasi va pushti paypoqlar!',
    modelStyle: 'harumi',
    outfits: [
      {
        id: 'harumi_default',
        name: 'Klassik Harumi',
        price: 0,
        suitColor: 0xf8fafc,
        armorColor: 0x1e3a8a,
        accentColor: 0xef4444,
        glowColor: 0xf472b6,
        description: 'Tokio maktab formasi va qizil kapalak bant.',
      },
      {
        id: 'harumi_kitty',
        name: 'Fury Harumi',
        price: 160,
        suitColor: 0xf43f5e,
        armorColor: 0x881337,
        accentColor: 0xfde047,
        glowColor: 0xfb7185,
        description: 'Pushti anime mushukcha uslubi.',
      },
    ],
  },

  // 9. TAGBOT
  {
    id: 'pilot',
    name: 'Tagbot',
    role: 'Magnitli Ko‘cha Roboti',
    price: 450,
    description: 'Dumaloq kumush boshli, yashil LED ko‘zli va magnit bo‘g‘inli mashhur Subway Surfers roboti!',
    modelStyle: 'pilot',
    outfits: [
      {
        id: 'pilot_default',
        name: 'Klassik Tagbot',
        price: 0,
        suitColor: 0xcbd5e1,
        armorColor: 0x475569,
        accentColor: 0x2563eb,
        glowColor: 0x84cc16,
        description: 'Kumush po‘lat korpus va yashil neon ko‘zlar.',
      },
      {
        id: 'pilot_toy',
        name: 'Space Tagbot',
        price: 180,
        suitColor: 0xf59e0b,
        armorColor: 0x1d4ed8,
        accentColor: 0xef4444,
        glowColor: 0x38bdf8,
        description: 'Kosmik oltin-moviy robot korpusi.',
      },
    ],
  },

  // 10. TASHA
  {
    id: 'tasha',
    name: 'Tasha',
    role: 'Sportchi & Gimnastikachi Qiz',
    price: 500,
    description: 'Ikki tomonga bog‘langan sariq kokillar, qizil tasma va binafsha-pushti sport formasi!',
    modelStyle: 'tasha',
    outfits: [
      {
        id: 'tasha_default',
        name: 'Klassik Tasha',
        price: 0,
        suitColor: 0x9333ea,
        armorColor: 0xec4899,
        accentColor: 0xef4444,
        glowColor: 0xfacc15,
        description: 'Sariq kokillar va binafsha gimnastika formasi.',
      },
      {
        id: 'tasha_cheer',
        name: 'Cheer Tasha',
        price: 170,
        suitColor: 0x0284c7,
        armorColor: 0xf8fafc,
        accentColor: 0xfacc15,
        glowColor: 0x38bdf8,
        description: 'Moviy chempionat sport libosi.',
      },
    ],
  },

  // 11. NINJA
  {
    id: 'samurai',
    name: 'Ninja',
    role: 'Sharq Jang San’ati Ustasi',
    price: 550,
    description: 'Qora niqob, qizil peshona bandi va qora kimono kiygan chaqqon nindzya!',
    modelStyle: 'samurai',
    outfits: [
      {
        id: 'samurai_default',
        name: 'Klassik Ninja',
        price: 0,
        suitColor: 0x1c1917,
        armorColor: 0x292524,
        accentColor: 0xdc2626,
        glowColor: 0xef4444,
        description: 'Qora nindzya kimonosi va qizil belbog‘.',
      },
      {
        id: 'samurai_flame',
        name: 'Yang Ninja',
        price: 190,
        suitColor: 0xf8fafc,
        armorColor: 0x1e293b,
        accentColor: 0xf59e0b,
        glowColor: 0xfacc15,
        description: 'Oq-oltin nindzya ustasi libosi.',
      },
    ],
  },

  // 12. FRANK
  {
    id: 'frank',
    name: 'Frank',
    role: 'Sirli Niqobli Jentlmen',
    price: 600,
    description: 'Qora smoking kostyum-shim, galstuk va yo‘lbars/masxaraboz niqobidagi sirli qahramon!',
    modelStyle: 'frank',
    outfits: [
      {
        id: 'frank_default',
        name: 'Klassik Frank',
        price: 0,
        suitColor: 0x18181b,
        armorColor: 0x27272a,
        accentColor: 0xf97316,
        glowColor: 0xfacc15,
        description: 'Qora kostyum-shim va yo‘lbars/masxaraboz niqobi.',
      },
      {
        id: 'frank_gold',
        name: 'VIP Frank',
        price: 200,
        suitColor: 0x4c1d95,
        armorColor: 0x1e1b4b,
        accentColor: 0xfacc15,
        glowColor: 0xfde047,
        description: 'Tilla niqobli VIP smoking.',
      },
    ],
  },

  // 13. FRIZZY
  {
    id: 'frizzy',
    name: 'Frizzy',
    role: 'Afro-Pop Raqqosa',
    price: 650,
    description: 'Baland jingalak soch turmagi, tilla ziraklar va yorqin to‘q sariq ko‘cha libosi!',
    modelStyle: 'frizzy',
    outfits: [
      {
        id: 'frizzy_default',
        name: 'Klassik Frizzy',
        price: 0,
        suitColor: 0xea580c,
        armorColor: 0x1e293b,
        accentColor: 0xfacc15,
        glowColor: 0xfbbf24,
        description: 'Baland afro soch va oltin halqali ko‘cha libosi.',
      },
    ],
  },

  // 14. LUCY
  {
    id: 'cyberpunk',
    name: 'Lucy',
    role: 'Steampunk & Got-Pank Qiz',
    price: 700,
    description: 'Pushti-moviy sochlar, soatli shlyapa (Top Hat), yashil ko‘zoynak va pank uslubi!',
    modelStyle: 'cyberpunk',
    outfits: [
      {
        id: 'cyberpunk_default',
        name: 'Klassik Steam Lucy',
        price: 0,
        suitColor: 0x1e1b4b,
        armorColor: 0x7f1d1d,
        accentColor: 0xf43f5e,
        glowColor: 0x22c55e,
        description: 'Soatli shlyapa, pushti-moviy soch va yashil ko‘zoynak.',
      },
    ],
  },

  // 15. CARMEN
  {
    id: 'carmen',
    name: 'Carmen',
    role: 'Rio Karnaval Qirolichasi',
    price: 750,
    description: 'Yashil, moviy va oltin patlardan yasalgan ulkan Rio karnaval toji kiygan raqqosa!',
    modelStyle: 'carmen',
    outfits: [
      {
        id: 'carmen_default',
        name: 'Klassik Carmen',
        price: 0,
        suitColor: 0xfacc15,
        armorColor: 0x16a34a,
        accentColor: 0x0284c7,
        glowColor: 0x4ade80,
        description: 'Braziliya karnaval patli toji va yorqin libos.',
      },
    ],
  },

  // 16. ROBERTO (BIKER)
  {
    id: 'biker',
    name: 'Roberto',
    role: 'Moto-Kaskadyor (Stunt Rider)',
    price: 800,
    description: 'Oq-ko‘k chiziqli motoshlem va sariq himoya ko‘zoynagi taqqan poygachi!',
    modelStyle: 'biker',
    outfits: [
      {
        id: 'biker_default',
        name: 'Klassik Roberto',
        price: 0,
        suitColor: 0x1d4ed8,
        armorColor: 0xf8fafc,
        accentColor: 0xfacc15,
        glowColor: 0x38bdf8,
        description: 'Chiziqli kaskadyor shlemi va sariq vizor.',
      },
    ],
  },

  // 17. PRINCE K
  {
    id: 'princek',
    name: 'Prince K',
    role: 'Hashamatli Shahzoda',
    price: 900,
    description: 'Yashil trikotaj shapka, qora quyosh ko‘zoynagi, tilla zanjir va oq-oltin kurtka!',
    modelStyle: 'princek',
    outfits: [
      {
        id: 'princek_default',
        name: 'Klassik Prince K',
        price: 0,
        suitColor: 0xf8fafc,
        armorColor: 0x15803d,
        accentColor: 0xfacc15,
        glowColor: 0xfde047,
        description: 'Oq-oltin lyuks kurtka va qora ko‘zoynak.',
      },
    ],
  },

  // 18. BRODY
  {
    id: 'frost',
    name: 'Brody',
    role: 'Plyaj va To‘lqin Syorferi',
    price: 950,
    description: 'Sariq sochli, jigarrang kepkali va plyaj kiyimidagi quyoshli syorfer yigit!',
    modelStyle: 'frost',
    outfits: [
      {
        id: 'frost_default',
        name: 'Klassik Brody',
        price: 0,
        suitColor: 0xd97706,
        armorColor: 0x0284c7,
        accentColor: 0xfacc15,
        glowColor: 0x38bdf8,
        description: 'Sariq soch va plyaj syorf formasi.',
      },
    ],
  },

  // 19. KIM (OUTBACK)
  {
    id: 'kim',
    name: 'Kim',
    role: 'Avstraliya Sayohatchisi',
    price: 1000,
    description: 'Keng qora shlyapa, qora ko‘zoynak va zamonaviy sayohat kurtkasidagi qahramon!',
    modelStyle: 'kim',
    outfits: [
      {
        id: 'kim_default',
        name: 'Klassik Kim',
        price: 0,
        suitColor: 0x27272a,
        armorColor: 0x18181b,
        accentColor: 0xf59e0b,
        glowColor: 0xfbbf24,
        description: 'Keng qora fedora shlyapa va ko‘zoynak.',
      },
    ],
  },

  // 20. COCO (PARISIENNE)
  {
    id: 'ella',
    name: 'Coco',
    role: 'Parij Rassomi & Mim',
    price: 1100,
    description: 'Qizil fransuz bereti, qora kare soch va chiziqli Parij ko‘ylagi!',
    modelStyle: 'ella',
    outfits: [
      {
        id: 'ella_default',
        name: 'Klassik Coco',
        price: 0,
        suitColor: 0xf8fafc,
        armorColor: 0x18181b,
        accentColor: 0xdc2626,
        glowColor: 0xf43f5e,
        description: 'Qizil beret shlyapa va chiziqli Parij libosi.',
      },
    ],
  },

  // 21. SUN (MONKEY KING)
  {
    id: 'sun',
    name: 'Sun',
    role: 'Afsonaviy Kung-Fu Qahramoni',
    price: 1200,
    description: 'Tilla peshona halqasi, qizil-sariq yuz bo‘yog‘i va tikka jangovar soch turmagi!',
    modelStyle: 'sun',
    outfits: [
      {
        id: 'sun_default',
        name: 'Klassik Sun',
        price: 0,
        suitColor: 0xdc2626,
        armorColor: 0x78350f,
        accentColor: 0xfacc15,
        glowColor: 0xfde047,
        description: 'Qizil-oltin kung-fu zirhi va tilla toj halqasi.',
      },
    ],
  },

  // 22. ALEX (MOSCOW)
  {
    id: 'alex',
    name: 'Alex',
    role: 'Qishki Skeyt Ustasi',
    price: 1300,
    description: 'Qizil quloqchinli shapka (ushanka), sariq mayka va epchil ko‘cha harakatlari!',
    modelStyle: 'alex',
    outfits: [
      {
        id: 'alex_default',
        name: 'Klassik Alex',
        price: 0,
        suitColor: 0xfacc15,
        armorColor: 0x1d4ed8,
        accentColor: 0xdc2626,
        glowColor: 0xef4444,
        description: 'Qizil ushanka shapka va sariq sport kiyimi.',
      },
    ],
  },
];
