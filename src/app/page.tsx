export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-background">
      {/* Header */}
      <header className="w-full border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-foreground">CommentLink</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
            <a href="#features" className="hover:text-primary transition-colors">기능</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">작동 원리</a>
            <a href="#pricing" className="hover:text-primary transition-colors">요금제</a>
          </nav>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            시작하기
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Instagram Graph API v25
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
            인스타그램 댓글이
            <br />
            <span className="text-primary">제휴 수익</span>으로 변합니다
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            댓글 작성 시 자동 답장 → 팔로우 확인 → 제휴링크 DM 발송.
            <br className="hidden md:block" />
            수동 작업 없이 24시간 자동화된 인플루언서 마케팅.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
            >
              무료로 시작하기 →
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-border text-foreground font-medium hover:bg-surface-hover transition-colors"
            >
              작동 원리 보기
            </a>
          </div>
          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
            <div>
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted mt-1">자동 답장</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">3초</div>
              <div className="text-sm text-muted mt-1">평균 응답</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted mt-1">계정 연결</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-surface">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">핵심 기능</h2>
            <p className="mt-3 text-muted">인스타그램 비즈니스를 자동화하는 모든 도구</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                ),
                title: '자동 댓글 답장',
                desc: '새 댓글이 달리면 즉시 설정한 메시지로 자동 답장. 랜딩 페이지 URL 포함 가능.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
                title: '팔로우 확인 DM',
                desc: '댓글 작성자에게 자동 DM 발송. 팔로우 확인 버튼으로 팔로워 전환.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: '제휴링크 관리',
                desc: '상품별 제휴링크를 등록하고, DM에 자동 삽입. 전환율 추적.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-border bg-background hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">작동 원리</h2>
            <p className="mt-3 text-muted">3단계로 자동 수익 파이프라인 구축</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: '인스타 계정 연결', desc: 'Meta Business 계정과 Instagram 프로필을 연결합니다.' },
              { step: '02', title: '자동 답장 설정', desc: '댓글 답장 템플릿과 DM 메시지를 작성합니다.' },
              { step: '03', title: '제휴링크 등록', desc: '상품 제휴링크를 등록하면 DM에 자동 포함됩니다.' },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white text-xl font-bold mb-6">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-surface">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">요금제</h2>
            <p className="mt-3 text-muted">지금 시작하면 첫 달 무료</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                name: '스타터',
                price: '무료',
                period: '',
                features: ['인스타 계정 1개', '게시물 10개', '기본 댓글 답장'],
              },
              {
                name: '프로',
                price: '₩29,000',
                period: '/월',
                features: ['인스타 계정 5개', '게시물 무제한', '자동 DM 발송', '제휴링크 관리', '분석 대시보드'],
                highlight: true,
              },
              {
                name: '비즈니스',
                price: '₩79,000',
                period: '/월',
                features: ['인스타 계정 무제한', '모든 프로 기능', 'API 액세스', '우선 지원'],
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`relative p-8 rounded-2xl border ${
                  plan.highlight
                    ? 'border-primary bg-background shadow-lg shadow-primary/10'
                    : 'border-border bg-background'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-xs font-medium">
                    인기
                  </div>
                )}
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted text-sm">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted">
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-8 w-full py-2.5 rounded-full text-sm font-medium transition-colors ${
                    plan.highlight
                      ? 'bg-primary text-white hover:bg-primary-dark'
                      : 'border border-border text-foreground hover:bg-surface-hover'
                  }`}
                >
                  {plan.price === '무료' ? '무료 시작' : '구독하기'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            지금 바로 자동화를 시작하세요
          </h2>
          <p className="mt-4 text-muted text-lg">
            설치까지 5분. 카드 없이 무료로 시작할 수 있습니다.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center mt-8 px-10 py-4 rounded-full bg-primary text-white font-semibold text-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
          >
            무료로 시작하기 →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span>© 2025 CommentLink. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-primary transition-colors">이용약관</a>
            <a href="#" className="hover:text-primary transition-colors">개인정보처리방침</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
