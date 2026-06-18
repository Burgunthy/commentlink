-- =====================================================
-- 전역 자동응답 설정 (Settings)
-- DMify 마이그레이션
-- =====================================================
-- Settings 페이지에서 관리하는 전역 DM 템플릿 / 키워드 / 웰컴 메시지를 저장한다.
-- 웹훅(handleComment)은 post_keywords → posts → accounts 체인으로 매칭되지
-- 않았을 때 이 테이블을 최후의 fallback 으로 사용한다.
-- 단일 행(row)만 사용한다.

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_template TEXT NOT NULL DEFAULT '',
  comment_keyword TEXT NOT NULL DEFAULT '',
  welcome_message TEXT NOT NULL DEFAULT '',
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 기본 행 삽입 (이미 존재하면 무시)
INSERT INTO settings (dm_template, comment_keyword, welcome_message, auto_reply_enabled)
VALUES (
  '안녕하세요! 문의해주셔서 감사합니다 😊

{product_name}에 관심을 가져주셨네요.
더 자세한 정보가 필요하시면 아래 링크를 확인해주세요!

🔗 {product_url}',
  '링크, 정보, 가격, 구매',
  '반갑습니다! 🎉
저희 상품에 관심이 있으시면 댓글로 남겨주세요.
키워드를 입력하시면 자동으로 DM이 발송됩니다.',
  true
)
ON CONFLICT DO NOTHING;
