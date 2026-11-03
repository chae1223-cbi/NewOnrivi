// ====================================================================
// 📊 [OMD-PLAN-CONST-0001] frontend/src/constants/plans.ts
// 🎯 @KICK  : OnriviAuthor 요금제(Plan)별 권한, 기능 허용 범위, 기기 한도 단일 소스(SSoT) 정의
// 🛡️ @GUARD : DB_CODES.PLAN_NAME 대문자 코드 연동, 플랜별 웹 편집/데스크톱/기기 한도 중앙 일괄 통제
// 🚨 @PATCH : 2026-11-03 — [플랜 권한 체계 단일화] PLAN_CAPABILITIES 및 getPlanCapability 헬퍼 신설 및 표준 주석 완비
// ====================================================================

import { DB_CODES } from './dbCodes';

/**
 * ========================================================================================
 * 📌 [인터페이스] PlanCapability
 * 각 요금제 플랜이 보유한 세부 실행 권한 및 리소스 제약 정의 모델
 *
 * @property {string} code - 요금제 고유 영문 대문자 코드 (예: 'READER', 'PRO')
 * @property {string} name - 사용자 화면 표출용 한국어 플랜 명칭
 * @property {boolean} canWebEdit - 웹 브라우저 SaaS 환경에서 마크다운 편집 허용 여부
 * @property {boolean} canDesktop - 일렉트론 데스크톱 앱 실행 및 라이선스 등록 허용 여부
 * @property {number} maxDevices - 동시 접속 허용 기기 최대 대수 (기본 1대)
 * @property {boolean} isTrial - 무료 체험판 플랜 여부 (14일 카운트다운 대상)
 * @property {boolean} isRestricted - 읽기 전용 제한 사용자 모드 강제 여부
 * @property {string} description - 플랜 혜택 및 서비스 범위 요약 설명
 * ========================================================================================
 */
export interface PlanCapability {
  code: string;
  name: string;
  canWebEdit: boolean;
  canDesktop: boolean;
  maxDevices: number;
  isTrial: boolean;
  isRestricted: boolean;
  description: string;
}

/**
 * ========================================================================================
 * 📌 [상수그룹] PLAN_CAPABILITIES
 * 시스템 전역 플랜 권한 마스터 테이블 (Single Source of Truth)
 * 불변 객체(Object.freeze)로 관리되어 런타임 변조를 방지합니다.
 * ========================================================================================
 */
export const PLAN_CAPABILITIES: Record<string, PlanCapability> = Object.freeze({
  [DB_CODES.PLAN_NAME.READER]: Object.freeze({
    code: 'READER',
    name: '읽기 전용 (만료)',
    canWebEdit: false,
    canDesktop: false,
    maxDevices: 0,
    isTrial: false,
    isRestricted: true,
    description: '문서 열람 및 내보내기만 가능한 제한 모드입니다.',
  }),
  [DB_CODES.PLAN_NAME.APPRENTICE]: Object.freeze({
    code: 'APPRENTICE',
    name: '무료 체험판 (14일)',
    canWebEdit: true,
    canDesktop: true,
    maxDevices: 1,
    isTrial: true,
    isRestricted: false,
    description: '14일간 모든 기능을 제한 없이 체험할 수 있습니다.',
  }),
  [DB_CODES.PLAN_NAME.FREE]: Object.freeze({
    code: 'FREE',
    name: '무료 플랜',
    canWebEdit: true,
    canDesktop: false,
    maxDevices: 1,
    isTrial: false,
    isRestricted: false,
    description: '기본 웹 에디터 편집 기능을 제공합니다.',
  }),
  [DB_CODES.PLAN_NAME.BASIC]: Object.freeze({
    code: 'BASIC',
    name: '베이직',
    canWebEdit: true,
    canDesktop: true,
    maxDevices: 1,
    isTrial: false,
    isRestricted: false,
    description: '개인용 표준 에디터 플랜입니다.',
  }),
  [DB_CODES.PLAN_NAME.PRO]: Object.freeze({
    code: 'PRO',
    name: '프로',
    canWebEdit: true,
    canDesktop: true,
    maxDevices: 1,
    isTrial: false,
    isRestricted: false,
    description: '전문가를 위한 고성능 에디터 플랜입니다.',
  }),
  [DB_CODES.PLAN_NAME.PREMIUM]: Object.freeze({
    code: 'PREMIUM',
    name: '프리미엄',
    canWebEdit: true,
    canDesktop: true,
    maxDevices: 2,
    isTrial: false,
    isRestricted: false,
    description: '모든 확장 기능과 우선 지원을 포함합니다.',
  }),
  [DB_CODES.PLAN_NAME.REGULAR]: Object.freeze({
    code: 'REGULAR',
    name: '레귤러',
    canWebEdit: true,
    canDesktop: true,
    maxDevices: 1,
    isTrial: false,
    isRestricted: false,
    description: '정기 구독 사용자 플랜입니다.',
  }),
  [DB_CODES.PLAN_NAME.ELITEPRO]: Object.freeze({
    code: 'ELITEPRO',
    name: '엘리트프로',
    canWebEdit: true,
    canDesktop: true,
    maxDevices: 3,
    isTrial: false,
    isRestricted: false,
    description: '최상위 전문가 및 팀을 위한 플랜입니다.',
  }),
});

/**
 * ========================================================================================
 * [함수명] getPlanCapability - 입력된 플랜 코드 문자열을 정규화하여 시스템 표준 권한 객체를 반환합니다.
 * 알 수 없는 코드나 누락 시 가장 안전한 READER(읽기 전용 제한) 권한으로 안전하게 폴백합니다.
 *
 * @param {string | null} [rawPlanName] - 사용자 구독 레코드에서 조회된 원본 플랜명 문자열
 * @returns {PlanCapability} 해당 요금제에 매핑된 권한 및 기능 허용 스펙 객체
 *
 * @example
 * // 구독 정보에서 권한 조회
 * const capability = getPlanCapability(subscription?.plan_name);
 * if (!capability.canWebEdit) {
 *   showToast('현재 요금제는 웹 편집을 사용할 수 없습니다.', 'warning');
 * }
 * ========================================================================================
 */
export function getPlanCapability(rawPlanName?: string | null): PlanCapability {
  const code = (rawPlanName || '').trim().toUpperCase();
  return PLAN_CAPABILITIES[code] || PLAN_CAPABILITIES[DB_CODES.PLAN_NAME.READER];
}
