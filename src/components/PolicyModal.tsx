import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { panelBg } from '../design/tokens';
import { useLanguage } from '../lib/i18n';

export type PolicyType = 'privacy' | 'terms';

interface PolicyModalProps {
  type: PolicyType;
  onClose: () => void;
}

const PRIVACY_POLICY = `개인정보처리방침

Matcha(이하 "서비스")는 이용자의 개인정보를 소중히 여기며, 개인정보 보호법 및 관련 법령을 준수합니다.

제1조 (수집하는 개인정보 항목)
서비스는 회원가입 및 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.

• 필수 항목: Google 계정 정보(이름, 이메일 주소, 프로필 사진)
• 서비스 이용 중 생성 정보: 위치 정보(GPS), 채팅 메시지, 업로드 이미지, 체크인 기록, 마킹 기록
• 자동 수집 정보: 서비스 이용 기록, 접속 로그

제2조 (개인정보의 수집 목적)
• 회원 식별 및 서비스 제공
• 장소 기반 사용자 매칭 서비스 운영
• 채팅 및 커뮤니케이션 기능 제공
• 서비스 개선 및 개인화

제3조 (개인정보의 보유 및 이용 기간)
• 원칙: 회원 탈퇴 시까지 보유 후 즉시 파기
• 채팅 메시지: 채팅 종료 후 7일
• 체크인 기록: 체크아웃 후 자동 삭제 (1시간 TTL)
• 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관

제4조 (개인정보의 제3자 제공)
서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 이용자의 동의가 있거나 법령에 의한 경우 예외로 합니다.

제5조 (개인정보 처리 위탁)
서비스는 원활한 운영을 위해 다음과 같이 개인정보 처리를 위탁합니다.

• 수탁 업체: Google LLC (Firebase)
• 위탁 업무: 데이터 저장, 인증, 파일 스토리지 서비스
• 보유 기간: 위탁 계약 종료 시까지

제6조 (정보주체의 권리)
이용자는 언제든지 다음 권리를 행사할 수 있습니다.

• 개인정보 열람 요청
• 개인정보 수정 요청
• 개인정보 삭제 요청 (회원 탈퇴)
• 개인정보 처리 정지 요청

행사 방법: 서비스 내 프로필 설정 또는 아래 개인정보 보호책임자 이메일로 문의

제7조 (개인정보의 안전성 확보 조치)
• Firebase Security Rules를 통한 접근 제어
• Google OAuth를 통한 안전한 인증
• HTTPS 암호화 통신

제8조 (개인정보 보호책임자)
• 이메일: youngjoosuh23@gmail.com
• 개인정보 관련 문의는 이메일로 접수하며, 7일 이내 답변드립니다.

제9조 (개인정보처리방침의 변경)
본 방침은 법령·서비스 변경 시 개정될 수 있으며, 변경 시 서비스 내 공지합니다.

시행일: 2026년 5월 22일`;

const TERMS_OF_SERVICE = `이용약관

제1조 (목적)
본 약관은 Matcha 서비스(이하 "서비스") 이용에 관한 조건 및 절차, 회사와 이용자 간의 권리·의무를 규정함을 목적으로 합니다.

제2조 (정의)
• "서비스": Matcha가 제공하는 장소 기반 소셜 네트워킹 서비스
• "이용자": 본 약관에 동의하고 서비스를 이용하는 자
• "체크인": 특정 장소에 현재 방문 중임을 등록하는 기능

제3조 (서비스 이용 계약)
• 이용자가 본 약관에 동의하고 Google 계정으로 가입하면 계약이 성립됩니다.
• 만 14세 미만은 서비스를 이용할 수 없습니다.

제4조 (서비스 제공)
서비스는 다음 기능을 제공합니다.
• 장소 기반 체크인 및 주변 이용자 확인
• 채팅 요청 및 1:1 채팅
• 오픈 채팅방
• 이벤트 생성 및 참여
• 장소 마킹(개인 다이어리)

제5조 (이용자의 의무)
이용자는 다음 행위를 해서는 안 됩니다.

• 타인을 사칭하거나 허위 정보를 등록하는 행위
• 다른 이용자를 괴롭히거나 불쾌하게 하는 행위
• 음란·폭력적 내용을 전송하는 행위
• 서비스의 정상적인 운영을 방해하는 행위
• 타인의 개인정보를 무단으로 수집·이용하는 행위
• 상업적 목적의 광고·홍보 행위

제6조 (서비스 이용 제한)
위 금지 행위 위반 시 서비스 이용이 제한될 수 있습니다.

제7조 (면책 조항)
• 서비스는 이용자 간 분쟁에 대해 책임을 지지 않습니다.
• 서비스 중단으로 인한 손해에 대해 불가항력적 사유가 있는 경우 책임을 지지 않습니다.
• 이용자가 서비스 내에서 게시한 정보의 신뢰성에 대해 보증하지 않습니다.

제8조 (개인정보 보호)
이용자의 개인정보는 개인정보처리방침에 따라 처리됩니다.

제9조 (분쟁 해결)
서비스 이용과 관련한 분쟁은 대한민국 법률에 따르며, 관할 법원은 민사소송법에 따릅니다.

제10조 (약관의 변경)
서비스는 필요 시 약관을 변경할 수 있으며, 변경 시 서비스 내 사전 공지합니다.

시행일: 2026년 5월 22일`;

export default function PolicyModal({ type, onClose }: PolicyModalProps) {
  const { lang, t } = useLanguage();
  const title = type === 'privacy' ? t('개인정보처리방침', 'Privacy Policy') : t('이용약관', 'Terms of Service');
  const content = type === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[2px] font-sans"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-full sm:max-w-lg h-[80vh] sm:h-[75vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden border border-white/60 shadow-2xl flex flex-col"
          style={panelBg}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-black/[0.06]">
            <h2 className="text-lg font-bold text-zinc-800">{title}</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors"
              style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {lang === 'en' && (
              <p className="text-xs text-zinc-400 italic mb-3">
                This legal document is only available in Korean. It governs the service regardless of display language.
              </p>
            )}
            <pre className="whitespace-pre-wrap text-xs text-zinc-600 leading-relaxed font-sans">
              {content}
            </pre>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 shrink-0 border-t border-black/[0.06]">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl font-bold text-white text-sm active:scale-95 transition-all"
              style={{ background: '#1a2418' }}
            >
              {t('확인', 'OK')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
