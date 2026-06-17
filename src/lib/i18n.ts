export type Lang = 'en' | 'ko';

export const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Nav
    'nav.features': 'Features',
    'nav.howItWorks': 'How It Works',
    'nav.pricing': 'Pricing',
    'nav.getStarted': 'Get Started',

    // Hero
    'hero.badge': 'Instagram Graph API v25',
    'hero.headline.1': 'Turn Instagram Comments',
    'hero.headline.2': 'Into ',
    'hero.headline.highlight': 'Affiliate Revenue',
    'hero.subtitle.1': 'Auto-reply on comments → Verify follows → Send affiliate link via DM.',
    'hero.subtitle.2': '24/7 automated influencer marketing with zero manual work.',
    'hero.cta.primary': 'Get Started Free →',
    'hero.cta.secondary': 'See How It Works',
    'hero.stat.autoReplies': 'Auto Replies',
    'hero.stat.avgResponse': 'Avg Response',
    'hero.stat.accountLinks': 'Account Links',

    // Features
    'features.title': 'Core Features',
    'features.subtitle': 'All the tools you need to automate your Instagram business',
    'features.autoReply.title': 'Auto Comment Reply',
    'features.autoReply.desc': 'Instantly reply with a preset message when a new comment is posted. Landing page URLs supported.',
    'features.followVerify.title': 'Follow Verification DM',
    'features.followVerify.desc': 'Automatically send DMs to commenters. Convert them into followers with a follow-verify button.',
    'features.affiliate.title': 'Affiliate Link Management',
    'features.affiliate.desc': 'Register affiliate links per product and auto-insert them into DMs. Track conversion rates.',

    // How It Works
    'howItWorks.title': 'How It Works',
    'howItWorks.subtitle': 'Build an automated revenue pipeline in 3 steps',
    'howItWorks.step1.title': 'Connect Instagram',
    'howItWorks.step1.desc': 'Link your Meta Business account and Instagram profile.',
    'howItWorks.step2.title': 'Set Up Auto-Reply',
    'howItWorks.step2.desc': 'Write comment reply templates and DM messages.',
    'howItWorks.step3.title': 'Add Affiliate Links',
    'howItWorks.step3.desc': "Register product affiliate links and they'll be auto-included in DMs.",

    // Pricing
    'pricing.title': 'Simple Pricing',
    'pricing.subtitle': 'Start free for 30 days. Cancel anytime.',
    'pricing.badge': '30 Days Free',
    'pricing.planName': 'DMify',
    'pricing.perMonth': '/month',
    'pricing.billed': 'Billed monthly after free trial',
    'pricing.feature1': 'Multiple Instagram accounts',
    'pricing.feature2': 'Unlimited posts',
    'pricing.feature3': 'Auto DM with affiliate links',
    'pricing.feature4': 'Comment auto-reply',
    'pricing.feature5': 'Follow verification',
    'pricing.feature6': 'Analytics dashboard',
    'pricing.cta': 'Start Free Trial',

    // CTA
    'cta.headline': 'Start Automating Today',
    'cta.subtitle': 'Up and running in 5 minutes. No credit card required to get started.',
    'cta.button': 'Get Started Free →',

    // Footer
    'footer.copyright': '© 2026 DMify. All rights reserved.',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
  },

  ko: {
    // Nav
    'nav.features': '기능',
    'nav.howItWorks': '이용 방법',
    'nav.pricing': '요금제',
    'nav.getStarted': '시작하기',

    // Hero
    'hero.badge': 'Instagram Graph API v25',
    'hero.headline.1': '인스타그램 댓글을',
    'hero.headline.2': '으로 변환하세요',
    'hero.headline.highlight': '수익 창출',
    'hero.subtitle.1': '댓글 자동 답변 → 팔로우 확인 → DM으로 제휴 링크 전송.',
    'hero.subtitle.2': '수동 작업 없이 24시간 자동화된 인플루언서 마케팅.',
    'hero.cta.primary': '무료로 시작하기 →',
    'hero.cta.secondary': '이용 방법 보기',
    'hero.stat.autoReplies': '자동 답변',
    'hero.stat.avgResponse': '평균 응답',
    'hero.stat.accountLinks': '계정 연동',

    // Features
    'features.title': '핵심 기능',
    'features.subtitle': '인스타그램 비즈니스 자동화에 필요한 모든 도구',
    'features.autoReply.title': '댓글 자동 답변',
    'features.autoReply.desc': '새 댓글이 등록되면 미리 설정한 메시지로 즉시 답변합니다. 랜딩 페이지 URL도 지원됩니다.',
    'features.followVerify.title': '팔로우 인증 DM',
    'features.followVerify.desc': '댓글 작성자에게 자동으로 DM을 발송합니다. 팔로우 확인 버튼으로 팔로워로 전환하세요.',
    'features.affiliate.title': '제휴 링크 관리',
    'features.affiliate.desc': '상품별 제휴 링크를 등록하면 DM에 자동 삽입됩니다. 전환율까지 추적 가능합니다.',

    // How It Works
    'howItWorks.title': '이용 방법',
    'howItWorks.subtitle': '3단계로 자동 수익 파이프라인 구축',
    'howItWorks.step1.title': '인스타그램 연동',
    'howItWorks.step1.desc': 'Meta Business 계정과 인스타그램 프로필을 연결하세요.',
    'howItWorks.step2.title': '자동 답변 설정',
    'howItWorks.step2.desc': '댓글 답변 템플릿과 DM 메시지를 작성하세요.',
    'howItWorks.step3.title': '제휴 링크 추가',
    'howItWorks.step3.desc': '상품 제휴 링크를 등록하면 DM에 자동으로 포함됩니다.',

    // Pricing
    'pricing.title': '간단한 요금제',
    'pricing.subtitle': '30일 무료 체험. 언제든 해지 가능.',
    'pricing.badge': '30일 무료',
    'pricing.planName': 'DMify',
    'pricing.perMonth': '/월',
    'pricing.billed': '무료 체험 후 월간 결제',
    'pricing.feature1': '여러 인스타그램 계정 연동',
    'pricing.feature2': '무제한 게시물',
    'pricing.feature3': '제휴 링크 자동 DM 발송',
    'pricing.feature4': '댓글 자동 답변',
    'pricing.feature5': '팔로우 인증',
    'pricing.feature6': '분석 대시보드',
    'pricing.cta': '무료 체험 시작',

    // CTA
    'cta.headline': '지금 자동화를 시작하세요',
    'cta.subtitle': '5분 만에 세팅 완료. 신용카드 없이 무료로 시작하세요.',
    'cta.button': '무료로 시작하기 →',

    // Footer
    'footer.copyright': '© 2026 DMify. All rights reserved.',
    'footer.terms': '이용약관',
    'footer.privacy': '개인정보 처리방침',
  },
};
