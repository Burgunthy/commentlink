export type Lang = 'en' | 'ko' | 'ja';

export const SUPPORTED_LANGS: Lang[] = ['en', 'ko', 'ja'];

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
};

export const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Nav (landing)
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

    // Dashboard nav
    'dash.nav.dashboard': 'Dashboard',
    'dash.nav.history': 'History',
    'dash.nav.pricing': 'Pricing',
    'dash.nav.posts': 'Posts',
    'dash.nav.accounts': 'Accounts',
    'dash.nav.raffle': 'Raffle',
    'dash.nav.settings': 'Settings',
    'dash.nav.signout': 'Sign Out',
  },

  ko: {
    // Nav (landing)
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

    // Dashboard nav
    'dash.nav.dashboard': '대시보드',
    'dash.nav.history': '히스토리',
    'dash.nav.pricing': '요금제',
    'dash.nav.posts': '게시물',
    'dash.nav.accounts': '계정',
    'dash.nav.raffle': '래플',
    'dash.nav.settings': '설정',
    'dash.nav.signout': '로그아웃',
  },

  ja: {
    // Nav (landing)
    'nav.features': '機能',
    'nav.howItWorks': '使い方',
    'nav.pricing': '料金',
    'nav.getStarted': '始める',

    // Hero
    'hero.badge': 'Instagram Graph API v25',
    'hero.headline.1': 'Instagramのコメントを',
    'hero.headline.2': 'に変える',
    'hero.headline.highlight': 'アフィリエイト収益',
    'hero.subtitle.1': 'コメント自動返信 → フォロー確認 → DMでアフィリエイトリンク送信。',
    'hero.subtitle.2': '手作業なしで24時間自動化されたインフルエンサーマーケティング。',
    'hero.cta.primary': '無料で始める →',
    'hero.cta.secondary': '使い方を見る',
    'hero.stat.autoReplies': '自動返信',
    'hero.stat.avgResponse': '平均応答',
    'hero.stat.accountLinks': 'アカウント連携',

    // Features
    'features.title': 'コア機能',
    'features.subtitle': 'Instagramビジネスを自動化するために必要なすべてのツール',
    'features.autoReply.title': 'コメント自動返信',
    'features.autoReply.desc': '新しいコメントが投稿されたら、 presetメッセージで即座に返信します。ランディングページURLも対応。',
    'features.followVerify.title': 'フォロー認証DM',
    'features.followVerify.desc': 'コメント投稿者に自動でDMを送信します。フォロー認証ボタンでフォロワーに転換しましょう。',
    'features.affiliate.title': 'アフィリエイトリンク管理',
    'features.affiliate.desc': '商品ごとにアフィリエイトリンクを登録すると、DMに自動挿入されます。コンバージョン率も追跡可能。',

    // How It Works
    'howItWorks.title': '使い方',
    'howItWorks.subtitle': '3ステップで自動収益パイプラインを構築',
    'howItWorks.step1.title': 'Instagramを連携',
    'howItWorks.step1.desc': 'Meta BusinessアカウントとInstagramプロフィールを連携してください。',
    'howItWorks.step2.title': '自動返信を設定',
    'howItWorks.step2.desc': 'コメント返信テンプレートとDMメッセージを書いてください。',
    'howItWorks.step3.title': 'アフィリエイトリンクを追加',
    'howItWorks.step3.desc': '商品のアフィリエイトリンクを登録すると、DMに自動的に含まれます。',

    // Pricing
    'pricing.title': 'シンプルな料金',
    'pricing.subtitle': '30日間無料で開始。いつでもキャンセル可能。',
    'pricing.badge': '30日間無料',
    'pricing.planName': 'DMify',
    'pricing.perMonth': '/月',
    'pricing.billed': '無料体験後に月額請求',
    'pricing.feature1': '複数のInstagramアカウント',
    'pricing.feature2': '無制限の投稿',
    'pricing.feature3': 'アフィリエイトリンク付き自動DM',
    'pricing.feature4': 'コメント自動返信',
    'pricing.feature5': 'フォロー認証',
    'pricing.feature6': '分析ダッシュボード',
    'pricing.cta': '無料体験を開始',

    // CTA
    'cta.headline': '今日から自動化を始めよう',
    'cta.subtitle': '5分でセットアップ完了。クレジットカード不要で無料開始。',
    'cta.button': '無料で始める →',

    // Footer
    'footer.copyright': '© 2026 DMify. All rights reserved.',
    'footer.terms': '利用規約',
    'footer.privacy': 'プライバシーポリシー',

    // Dashboard nav
    'dash.nav.dashboard': 'ダッシュボード',
    'dash.nav.history': '履歴',
    'dash.nav.pricing': '料金',
    'dash.nav.posts': '投稿',
    'dash.nav.accounts': 'アカウント',
    'dash.nav.raffle': 'プレゼント',
    'dash.nav.settings': '設定',
    'dash.nav.signout': 'ログアウト',
  },
};
