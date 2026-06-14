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
            <span className="text-lg font-bold text-foreground">DMify</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          </nav>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Get Started
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
            Turn Instagram Comments
            <br />
            Into <span className="text-primary">Affiliate Revenue</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            Auto-reply on comments → Verify follows → Send affiliate link via DM.
            <br className="hidden md:block" />
            24/7 automated influencer marketing with zero manual work.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
            >
              Get Started Free →
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-border text-foreground font-medium hover:bg-surface-hover transition-colors"
            >
              See How It Works
            </a>
          </div>
          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
            <div>
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted mt-1">Auto Replies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">3 sec</div>
              <div className="text-sm text-muted mt-1">Avg Response</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted mt-1">Account Links</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-surface">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">Core Features</h2>
            <p className="mt-3 text-muted">All the tools you need to automate your Instagram business</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                ),
                title: 'Auto Comment Reply',
                desc: 'Instantly reply with a preset message when a new comment is posted. Landing page URLs supported.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
                title: 'Follow Verification DM',
                desc: 'Automatically send DMs to commenters. Convert them into followers with a follow-verify button.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: 'Affiliate Link Management',
                desc: 'Register affiliate links per product and auto-insert them into DMs. Track conversion rates.',
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
            <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
            <p className="mt-3 text-muted">Build an automated revenue pipeline in 3 steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Connect Instagram', desc: 'Link your Meta Business account and Instagram profile.' },
              { step: '02', title: 'Set Up Auto-Reply', desc: 'Write comment reply templates and DM messages.' },
              { step: '03', title: 'Add Affiliate Links', desc: 'Register product affiliate links and they\'ll be auto-included in DMs.' },
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
            <h2 className="text-3xl font-bold text-foreground">Pricing</h2>
            <p className="mt-3 text-muted">Start now and get your first month free</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                name: 'Starter',
                price: 'Free',
                period: '',
                features: ['1 Instagram account', '10 posts', 'Basic comment replies'],
              },
              {
                name: 'Pro',
                price: '$29',
                period: '/mo',
                features: ['5 Instagram accounts', 'Unlimited posts', 'Auto DM sending', 'Affiliate link management', 'Analytics dashboard'],
                highlight: true,
              },
              {
                name: 'Business',
                price: '$79',
                period: '/mo',
                features: ['Unlimited Instagram accounts', 'All Pro features', 'API access', 'Priority support'],
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
                    Popular
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
                  {plan.price === 'Free' ? 'Start for Free' : 'Subscribe'}
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
            Start Automating Today
          </h2>
          <p className="mt-4 text-muted text-lg">
            Up and running in 5 minutes. No credit card required to get started.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center mt-8 px-10 py-4 rounded-full bg-primary text-white font-semibold text-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
          >
            Get Started Free →
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
            <span>© 2025 DMify. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
