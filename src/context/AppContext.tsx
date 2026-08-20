import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase, fetchProfile } from '../services/supabaseClient'
import { signInWithEmail, signOut as sbSignOut } from '../services/supabaseClient'


export type Lang = 'en' | 'sw' | 'fr' | 'es' | 'pt' | 'ar'

export interface CartItem {
  id: string
  name: string
  price: number
  size: string
  quantity: number
  image: string
}

interface AppContextType {
  refreshProfile: () => Promise<void>
  currency: string
  setCurrency: (code: string) => void
  formatPrice: (amountUsd: number) => string
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
  darkMode: boolean
  toggleDark: () => void
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string, size: string) => void
  updateQty: (id: string, size: string, qty: number) => void
  clearCart: () => void
  cartTotal: number
  cartCount: number
  user: { id: string; name: string; email: string; role: string; avatar_url: string | null } | null
  authLoading: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
}

const translations: Record<Lang, Record<string, string>> = {
  en: {
    scores: 'Scores', fixtures: 'Fixtures', standings: 'Standings',
    news: 'News', transfers: 'Transfers', videos: 'Videos',
    mixes: 'Mixes', shop: 'Shop', advertise: 'Advertise',
    home: 'Home', account: 'Account', predictions: 'Predictions',
    about: 'About', contact: 'Contact',
    login: 'Log In', signup: 'Sign Up', logout: 'Log Out',
    readMore: 'Read More', viewAll: 'View All', viewFull: 'View Full Table',
    addToCart: 'Add to Cart', buyNow: 'Buy Now', checkout: 'Checkout',
    logInToComment: 'Log in to comment', postComment: 'Post Comment',
    listenNow: 'Listen Now', bookNow: 'Book Now', sendInquiry: 'Send Inquiry',
    liveNow: 'LIVE', fullTime: 'FT', halfTime: 'HT',
    topStories: 'Top Stories', latestNews: 'Latest News',
    djMixes: 'DJ Mixes & Events', bigstoneShowcase: 'Bigstone Entertainment Showcase',
    advertiseWithUs: 'Advertise With Us', contactUs: 'Contact Us',
    cancel: 'Cancel', back: 'Back', next: 'Next', submit: 'Submit',
    search: 'Search', close: 'Close', save: 'Save',
    followClub: 'Follow Club', following: 'Following',
    chatOnWhatsApp: 'Chat on WhatsApp', whatsappBooking: 'WhatsApp Booking',
    language: 'Language', darkMode: 'Dark Mode',
    copyright: '© 2026 FlowerZFC. All rights reserved.',
    tagline: 'Football. Music. Culture.',
    breakingNews: 'Breaking News',
    confirmed: 'Confirmed', rumour: 'Rumour', doneDeal: 'Done Deal',
    size: 'Size', quantity: 'Quantity', price: 'Price',
    shipping: 'Shipping', payment: 'Payment', orderConfirmation: 'Order Confirmation',
    myTeams: 'My Teams', savedArticles: 'Saved Articles',
    myPredictions: 'My Predictions', settings: 'Settings',
    signInSignUp: 'Sign In / Sign Up',
    overview: 'Overview', lineups: 'Lineups', stats: 'Stats',
    commentary: 'Commentary', headToHead: 'H2H',
    all: 'All', shorts: 'Shorts', longForm: 'Long-form',
    upcomingEvents: 'Upcoming Events', pastEvents: 'Past Events',
    bookDJ: 'Book DJ Flowerz',
    newsletterPlaceholder: 'Enter your email',
    subscribe: 'Subscribe',
    shareOn: 'Share on',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied!',
    loadMore: 'Load more',
    backToShop: '← Back to Shop',
    cartEmpty: 'Your cart is empty',
    browseShop: 'Browse Shop',
    orderSummary: 'Order Summary',
    subtotal: 'Subtotal',
    total: 'Total',
    freeShipping: 'Free Shipping',
  },
  sw: {
    scores: 'Matokeo', fixtures: 'Ratiba', standings: 'Jedwali',
    news: 'Habari', transfers: 'Uhamisho', videos: 'Video',
    mixes: 'Mchanganyiko', shop: 'Duka', advertise: 'Tangaza',
    home: 'Nyumbani', account: 'Akaunti', predictions: 'Utabiri',
    about: 'Kuhusu', contact: 'Wasiliana',
    login: 'Ingia', signup: 'Jisajili', logout: 'Toka',
    readMore: 'Soma Zaidi', viewAll: 'Ona Yote', viewFull: 'Ona Jedwali Kamili',
    addToCart: 'Ongeza kwenye Kikapu', buyNow: 'Nunua Sasa', checkout: 'Malipo',
    logInToComment: 'Ingia kutoa maoni', postComment: 'Tuma Maoni',
    listenNow: 'Sikiliza Sasa', bookNow: 'Hifadhi Sasa', sendInquiry: 'Tuma Ombi',
    liveNow: 'MOJA KWA MOJA', fullTime: 'FT', halfTime: 'HT',
    topStories: 'Habari Kuu', latestNews: 'Habari za Hivi Karibuni',
    djMixes: 'Mchanganyiko wa DJ', bigstoneShowcase: 'Onyesho la Bigstone Entertainment',
    advertiseWithUs: 'Tangaza Nasi', contactUs: 'Wasiliana Nasi',
    cancel: 'Ghairi', back: 'Rudi', next: 'Endelea', submit: 'Wasilisha',
    search: 'Tafuta', close: 'Funga', save: 'Hifadhi',
    followClub: 'Fuata Klabu', following: 'Unafuata',
    chatOnWhatsApp: 'Piga Gumzo WhatsApp', whatsappBooking: 'Uhifadhi wa WhatsApp',
    language: 'Lugha', darkMode: 'Hali ya Giza',
    copyright: '© 2026 FlowerZFC. Haki zote zimehifadhiwa.',
    tagline: 'Soka. Muziki. Utamaduni.',
    breakingNews: 'Habari za Haraka',
    confirmed: 'Imethibitishwa', rumour: 'Uvumi', doneDeal: 'Makubaliano',
    size: 'Ukubwa', quantity: 'Idadi', price: 'Bei',
    shipping: 'Usafirishaji', payment: 'Malipo', orderConfirmation: 'Uthibitisho wa Agizo',
    myTeams: 'Timu Zangu', savedArticles: 'Makala Zilizohifadhiwa',
    myPredictions: 'Utabiri Wangu', settings: 'Mipangilio',
    signInSignUp: 'Ingia / Jisajili',
    overview: 'Muhtasari', lineups: 'Mpangilio', stats: 'Takwimu',
    commentary: 'Maelezo', headToHead: 'Kichwa kwa Kichwa',
    all: 'Yote', shorts: 'Mafupi', longForm: 'Mrefu',
    upcomingEvents: 'Matukio Yajayo', pastEvents: 'Matukio Yaliyopita',
    bookDJ: 'Hifadhi DJ Flowerz',
    newsletterPlaceholder: 'Ingiza barua pepe yako',
    subscribe: 'Jiandikishe',
    shareOn: 'Shiriki',
    copyLink: 'Nakili Kiungo',
    linkCopied: 'Kiungo imenakiliwa!',
    loadMore: 'Pakia zaidi',
    backToShop: '← Rudi Dukani',
    cartEmpty: 'Kikapu chako kiko tupu',
    browseShop: 'Tazama Duka',
    orderSummary: 'Muhtasari wa Agizo',
    subtotal: 'Jumla ndogo',
    total: 'Jumla',
    freeShipping: 'Usafirishaji Bure',
  },
  fr: {
    scores: 'Scores', fixtures: 'Calendrier', standings: 'Classement',
    news: 'Actualités', transfers: 'Transferts', videos: 'Vidéos',
    mixes: 'Mixes', shop: 'Boutique', advertise: 'Publicité',
    home: 'Accueil', account: 'Compte', predictions: 'Pronostics',
    about: 'À propos', contact: 'Contact',
    login: 'Connexion', signup: "S'inscrire", logout: 'Déconnexion',
    readMore: 'Lire la suite', viewAll: 'Voir tout', viewFull: 'Voir le classement complet',
    addToCart: 'Ajouter au panier', buyNow: 'Acheter', checkout: 'Commander',
    logInToComment: 'Connectez-vous pour commenter', postComment: 'Publier',
    listenNow: 'Écouter maintenant', bookNow: 'Réserver', sendInquiry: 'Envoyer',
    liveNow: 'EN DIRECT', fullTime: 'FT', halfTime: 'MT',
    topStories: 'À la une', latestNews: 'Dernières actualités',
    djMixes: 'Mixes DJ & Événements', bigstoneShowcase: 'Vitrine Bigstone Entertainment',
    advertiseWithUs: 'Annoncez avec nous', contactUs: 'Contactez-nous',
    cancel: 'Annuler', back: 'Retour', next: 'Suivant', submit: 'Soumettre',
    search: 'Rechercher', close: 'Fermer', save: 'Enregistrer',
    followClub: 'Suivre le club', following: 'Abonné',
    chatOnWhatsApp: 'Chatter sur WhatsApp', whatsappBooking: 'Réservation WhatsApp',
    language: 'Langue', darkMode: 'Mode sombre',
    copyright: '© 2026 FlowerZFC. Tous droits réservés.',
    tagline: 'Football. Musique. Culture.',
    breakingNews: 'Flash Info',
    confirmed: 'Confirmé', rumour: 'Rumeur', doneDeal: 'Accord conclu',
    size: 'Taille', quantity: 'Quantité', price: 'Prix',
    shipping: 'Livraison', payment: 'Paiement', orderConfirmation: 'Confirmation',
    myTeams: 'Mes équipes', savedArticles: 'Articles sauvegardés',
    myPredictions: 'Mes pronostics', settings: 'Paramètres',
    signInSignUp: 'Connexion / Inscription',
    overview: 'Aperçu', lineups: 'Compositions', stats: 'Statistiques',
    commentary: 'Commentaires', headToHead: 'Face à face',
    all: 'Tout', shorts: 'Courts', longForm: 'Longs',
    upcomingEvents: 'Événements à venir', pastEvents: 'Événements passés',
    bookDJ: 'Réserver DJ Flowerz',
    newsletterPlaceholder: 'Votre adresse email',
    subscribe: "S'abonner",
    shareOn: 'Partager sur',
    copyLink: 'Copier le lien',
    linkCopied: 'Lien copié !',
    loadMore: 'Charger plus',
    backToShop: '← Retour à la boutique',
    cartEmpty: 'Votre panier est vide',
    browseShop: 'Parcourir la boutique',
    orderSummary: 'Récapitulatif',
    subtotal: 'Sous-total',
    total: 'Total',
    freeShipping: 'Livraison gratuite',
  },
  es: {
    scores: 'Resultados', fixtures: 'Partidos', standings: 'Clasificación',
    news: 'Noticias', transfers: 'Fichajes', videos: 'Vídeos',
    mixes: 'Mezclas', shop: 'Tienda', advertise: 'Publicidad',
    home: 'Inicio', account: 'Cuenta', predictions: 'Predicciones',
    about: 'Acerca de', contact: 'Contacto',
    login: 'Iniciar sesión', signup: 'Registrarse', logout: 'Cerrar sesión',
    readMore: 'Leer más', viewAll: 'Ver todo', viewFull: 'Ver tabla completa',
    addToCart: 'Añadir al carrito', buyNow: 'Comprar', checkout: 'Pagar',
    logInToComment: 'Inicia sesión para comentar', postComment: 'Publicar',
    listenNow: 'Escuchar ahora', bookNow: 'Reservar', sendInquiry: 'Enviar consulta',
    liveNow: 'EN VIVO', fullTime: 'FT', halfTime: 'MT',
    topStories: 'Principales noticias', latestNews: 'Últimas noticias',
    djMixes: 'Mezclas DJ y Eventos', bigstoneShowcase: 'Escaparate Bigstone Entertainment',
    advertiseWithUs: 'Anúnciate con nosotros', contactUs: 'Contáctanos',
    cancel: 'Cancelar', back: 'Atrás', next: 'Siguiente', submit: 'Enviar',
    search: 'Buscar', close: 'Cerrar', save: 'Guardar',
    followClub: 'Seguir club', following: 'Siguiendo',
    chatOnWhatsApp: 'Chatear en WhatsApp', whatsappBooking: 'Reserva por WhatsApp',
    language: 'Idioma', darkMode: 'Modo oscuro',
    copyright: '© 2026 FlowerZFC. Todos los derechos reservados.',
    tagline: 'Fútbol. Música. Cultura.',
    breakingNews: 'Noticias de última hora',
    confirmed: 'Confirmado', rumour: 'Rumor', doneDeal: 'Trato hecho',
    size: 'Talla', quantity: 'Cantidad', price: 'Precio',
    shipping: 'Envío', payment: 'Pago', orderConfirmation: 'Confirmación del pedido',
    myTeams: 'Mis equipos', savedArticles: 'Artículos guardados',
    myPredictions: 'Mis predicciones', settings: 'Configuración',
    signInSignUp: 'Iniciar sesión / Registrarse',
    overview: 'Resumen', lineups: 'Alineaciones', stats: 'Estadísticas',
    commentary: 'Comentarios', headToHead: 'H2H',
    all: 'Todo', shorts: 'Cortos', longForm: 'Largos',
    upcomingEvents: 'Próximos eventos', pastEvents: 'Eventos pasados',
    bookDJ: 'Contratar DJ Flowerz',
    newsletterPlaceholder: 'Tu correo electrónico',
    subscribe: 'Suscribirse',
    shareOn: 'Compartir en',
    copyLink: 'Copiar enlace',
    linkCopied: '¡Enlace copiado!',
    loadMore: 'Cargar más',
    backToShop: '← Volver a la tienda',
    cartEmpty: 'Tu carrito está vacío',
    browseShop: 'Ver tienda',
    orderSummary: 'Resumen del pedido',
    subtotal: 'Subtotal',
    total: 'Total',
    freeShipping: 'Envío gratis',
  },
  pt: {
    scores: 'Resultados', fixtures: 'Jogos', standings: 'Classificação',
    news: 'Notícias', transfers: 'Transferências', videos: 'Vídeos',
    mixes: 'Mixes', shop: 'Loja', advertise: 'Publicidade',
    home: 'Início', account: 'Conta', predictions: 'Previsões',
    about: 'Sobre', contact: 'Contato',
    login: 'Entrar', signup: 'Cadastrar', logout: 'Sair',
    readMore: 'Leia mais', viewAll: 'Ver tudo', viewFull: 'Ver tabela completa',
    addToCart: 'Adicionar ao carrinho', buyNow: 'Comprar', checkout: 'Finalizar',
    logInToComment: 'Entre para comentar', postComment: 'Publicar',
    listenNow: 'Ouvir agora', bookNow: 'Reservar', sendInquiry: 'Enviar consulta',
    liveNow: 'AO VIVO', fullTime: 'FT', halfTime: 'HT',
    topStories: 'Principais notícias', latestNews: 'Últimas notícias',
    djMixes: 'Mixes DJ e Eventos', bigstoneShowcase: 'Bigstone Entertainment',
    advertiseWithUs: 'Anuncie conosco', contactUs: 'Fale conosco',
    cancel: 'Cancelar', back: 'Voltar', next: 'Próximo', submit: 'Enviar',
    search: 'Buscar', close: 'Fechar', save: 'Salvar',
    followClub: 'Seguir clube', following: 'Seguindo',
    chatOnWhatsApp: 'Chat no WhatsApp', whatsappBooking: 'Reserva WhatsApp',
    language: 'Idioma', darkMode: 'Modo escuro',
    copyright: '© 2026 FlowerZFC. Todos os direitos reservados.',
    tagline: 'Futebol. Música. Cultura.',
    breakingNews: 'Notícia urgente',
    confirmed: 'Confirmado', rumour: 'Rumor', doneDeal: 'Acordo fechado',
    size: 'Tamanho', quantity: 'Quantidade', price: 'Preço',
    shipping: 'Entrega', payment: 'Pagamento', orderConfirmation: 'Confirmação',
    myTeams: 'Meus times', savedArticles: 'Artigos salvos',
    myPredictions: 'Minhas previsões', settings: 'Configurações',
    signInSignUp: 'Entrar / Cadastrar',
    overview: 'Visão geral', lineups: 'Escalações', stats: 'Estatísticas',
    commentary: 'Comentários', headToHead: 'H2H',
    all: 'Tudo', shorts: 'Curtos', longForm: 'Longos',
    upcomingEvents: 'Próximos eventos', pastEvents: 'Eventos passados',
    bookDJ: 'Contratar DJ Flowerz',
    newsletterPlaceholder: 'Seu email',
    subscribe: 'Assinar',
    shareOn: 'Compartilhar em',
    copyLink: 'Copiar link',
    linkCopied: 'Link copiado!',
    loadMore: 'Carregar mais',
    backToShop: '← Voltar à loja',
    cartEmpty: 'Seu carrinho está vazio',
    browseShop: 'Ver loja',
    orderSummary: 'Resumo do pedido',
    subtotal: 'Subtotal',
    total: 'Total',
    freeShipping: 'Frete grátis',
  },
  ar: {
    scores: 'النتائج', fixtures: 'المباريات', standings: 'الترتيب',
    news: 'الأخبار', transfers: 'الانتقالات', videos: 'فيديو',
    mixes: 'ميكسات', shop: 'المتجر', advertise: 'إعلن معنا',
    home: 'الرئيسية', account: 'الحساب', predictions: 'التوقعات',
    about: 'عن الموقع', contact: 'اتصل بنا',
    login: 'تسجيل الدخول', signup: 'إنشاء حساب', logout: 'تسجيل الخروج',
    readMore: 'اقرأ المزيد', viewAll: 'عرض الكل', viewFull: 'عرض الجدول كاملاً',
    addToCart: 'أضف للسلة', buyNow: 'اشتر الآن', checkout: 'الدفع',
    logInToComment: 'سجّل دخولك للتعليق', postComment: 'نشر التعليق',
    listenNow: 'استمع الآن', bookNow: 'احجز الآن', sendInquiry: 'إرسال الاستفسار',
    liveNow: 'مباشر', fullTime: 'ن.م', halfTime: 'ن.أ',
    topStories: 'أبرز الأخبار', latestNews: 'آخر الأخبار',
    djMixes: 'ميكسات DJ والفعاليات', bigstoneShowcase: 'عروض Bigstone Entertainment',
    advertiseWithUs: 'أعلن معنا', contactUs: 'اتصل بنا',
    cancel: 'إلغاء', back: 'رجوع', next: 'التالي', submit: 'إرسال',
    search: 'بحث', close: 'إغلاق', save: 'حفظ',
    followClub: 'تابع النادي', following: 'تتابع',
    chatOnWhatsApp: 'دردشة على واتساب', whatsappBooking: 'الحجز عبر واتساب',
    language: 'اللغة', darkMode: 'الوضع المظلم',
    copyright: '© 2026 FlowerZFC. جميع الحقوق محفوظة.',
    tagline: 'كرة القدم. الموسيقى. الثقافة.',
    breakingNews: 'عاجل',
    confirmed: 'مؤكد', rumour: 'شائعة', doneDeal: 'صفقة مكتملة',
    size: 'المقاس', quantity: 'الكمية', price: 'السعر',
    shipping: 'الشحن', payment: 'الدفع', orderConfirmation: 'تأكيد الطلب',
    myTeams: 'أنديتي', savedArticles: 'المقالات المحفوظة',
    myPredictions: 'توقعاتي', settings: 'الإعدادات',
    signInSignUp: 'تسجيل الدخول / إنشاء حساب',
    overview: 'نظرة عامة', lineups: 'التشكيلة', stats: 'الإحصائيات',
    commentary: 'التعليق', headToHead: 'المواجهات',
    all: 'الكل', shorts: 'مقاطع قصيرة', longForm: 'فيديو طويل',
    upcomingEvents: 'الفعاليات القادمة', pastEvents: 'الفعاليات السابقة',
    bookDJ: 'احجز DJ Flowerz',
    newsletterPlaceholder: 'بريدك الإلكتروني',
    subscribe: 'اشترك',
    shareOn: 'شارك على',
    copyLink: 'نسخ الرابط',
    linkCopied: 'تم نسخ الرابط!',
    loadMore: 'تحميل المزيد',
    backToShop: '← العودة للمتجر',
    cartEmpty: 'سلتك فارغة',
    browseShop: 'تصفح المتجر',
    orderSummary: 'ملخص الطلب',
    subtotal: 'المجموع الفرعي',
    total: 'الإجمالي',
    freeShipping: 'شحن مجاني',
  },
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  // Load initial settings from localStorage if available
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('flowerzfc_lang')
    return (saved && translations[saved as Lang]) ? (saved as Lang) : 'en'
  })

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('flowerzfc_theme')
    return saved ? saved === 'dark' : true
  })

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('flowerzfc_cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [currency, setCurrencyState] = useState<string>(() => {
    try { return localStorage.getItem('flowerzfc_currency') || 'USD' } catch { return 'USD' }
  })
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USD: 1 })

  const setCurrency = (code: string) => {
    setCurrencyState(code)
    try { localStorage.setItem('flowerzfc_currency', code) } catch {}
  }

  useEffect(() => {
    const CACHE_KEY = 'flowerzfc_exchange_rates'
    const CACHE_HOURS = 6
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { rates, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_HOURS * 60 * 60 * 1000) {
          setExchangeRates(rates)
          return
        }
      }
    } catch {}

    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setExchangeRates(data.rates)
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, timestamp: Date.now() }))
          } catch {}
        }
      })
      .catch(() => { /* fall back to cached/default rates silently */ })
  }, [])

  // Stored prices in the database are in KES (Kenyan Shillings) — the site's base currency.
  const formatPrice = (amountKes: number): string => {
    const kesRate = exchangeRates['KES'] || 130 // fallback approx if rates haven't loaded
    const amountUsd = amountKes / kesRate
    const targetRate = exchangeRates[currency] || 1
    const converted = currency === 'KES' ? amountKes : amountUsd * targetRate
    const symbols: Record<string, string> = { USD: '$', KES: 'KES ', GBP: '£', EUR: '€' }
    const symbol = symbols[currency] || currency + ' '
    const decimals = currency === 'KES' ? 0 : 2
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  }

  // ── Supabase auth state listener ─────────────────────────────────────────
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; avatar_url: string | null } | null>(() => {
    try {
      const saved = localStorage.getItem('flowerzfc_user')
      if (!saved) return null
      const parsed = JSON.parse(saved)
      return { id: parsed.id || '', name: parsed.name || '', email: parsed.email || '', role: parsed.role || 'user', avatar_url: parsed.avatar_url || null }
    } catch { return null }
  })
  const [authLoading, setAuthLoading] = useState(true)

  const resolveUserFromSession = async (session: any) => {
    if (!session?.user) return null
    const { profile } = await fetchProfile(session.user.id)
    const role = profile?.role || 'user'
    const metaName = session.user.user_metadata?.name || session.user.user_metadata?.full_name
    const emailName = session.user.email ? session.user.email.split('@')[0] : ''
    const formattedEmailName = emailName ? emailName.charAt(0).toUpperCase() + emailName.slice(1) : ''
    const name = (profile?.name && profile.name !== 'User') ? profile.name.trim() : (metaName?.trim() || formattedEmailName || 'Member')
    const email = session.user.email || profile?.email || ''
    const avatar_url = profile?.avatar_url || session.user.user_metadata?.avatar_url || null
    return { id: session.user.id, name, email, role, avatar_url }
  }

  useEffect(() => {
    // Resolve initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const resolved = await resolveUserFromSession(session)
        if (resolved) {
          setUser(resolved)
          localStorage.setItem('flowerzfc_user', JSON.stringify(resolved))
        }
      } else {
        setUser(null)
        localStorage.removeItem('flowerzfc_user')
      }
      setAuthLoading(false)
    })

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const resolved = await resolveUserFromSession(session)
        if (resolved) {
          setUser(resolved)
          localStorage.setItem('flowerzfc_user', JSON.stringify(resolved))
        }
      } else {
        setUser(null)
        localStorage.removeItem('flowerzfc_user')
      }
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])

  // Persist language
  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('flowerzfc_lang', l)
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
  }

  // Persist theme
  const toggleDark = () => {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem('flowerzfc_theme', next ? 'dark' : 'light')
      return next
    })
  }

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem('flowerzfc_cart', JSON.stringify(cart))
    } catch { /* ignore */ }
  }, [cart])

  const t = (key: string) => translations[lang][key] || translations['en'][key] || key

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.size === item.size)
      if (existing) {
        return prev.map(i =>
          i.id === item.id && i.size === item.size
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      }
      return [...prev, item]
    })
  }

  const removeFromCart = (id: string, size: string) =>
    setCart(prev => prev.filter(i => !(i.id === id && i.size === size)))

  const clearCart = () => setCart([])

  const updateQty = (id: string, size: string, qty: number) =>
    setCart(prev =>
      qty <= 0
        ? prev.filter(i => !(i.id === id && i.size === size))
        : prev.map(i => (i.id === id && i.size === size ? { ...i, quantity: qty } : i))
    )

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  // login: calls Supabase Auth — role is resolved from profiles table via onAuthStateChange
  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    const { error } = await signInWithEmail(email, password)
    if (error) return { error: error.message }
    return {}
  }

  const logout = async () => {
    await sbSignOut()
    setUser(null)
    localStorage.removeItem('flowerzfc_user')
    localStorage.removeItem('flz_auth_user_v1')
  }

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { profile } = await fetchProfile(session.user.id)
    const role = profile?.role || 'user'
    const name = profile?.name || session.user.email?.split('@')[0] || 'User'
    const email = session.user.email || ''
    const resolved = { id: session.user.id, name, email, role, avatar_url: profile?.avatar_url || null }
    setUser(resolved)
    localStorage.setItem('flowerzfc_user', JSON.stringify(resolved))
  }

  return (
    <AppContext.Provider
      value={{
        lang, setLang, t, darkMode, toggleDark,
        cart, addToCart, removeFromCart, updateQty, clearCart,
        cartTotal, cartCount, user, authLoading, login, logout, refreshProfile, currency, setCurrency, formatPrice,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
