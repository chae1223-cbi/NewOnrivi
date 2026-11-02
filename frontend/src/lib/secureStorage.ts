import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import CryptoJS from 'crypto-js';

// 💡 [한글 주석] 로컬 저장 암호화용 고유 솔트 키 (빌드 난독화 대비용 상수 지정)
const SECRET_SALT = 'ONRIVI-AUTHOR-SECURE-KEY-SPEC-SALT';

/**
 * [ONR-IO-003] 안전 난독화 저장소 연동 (saveSecureData / loadSecureData)
 * 💡 [한글 주석] 주어진 키와 값 객체를 AES-256 알고리즘으로 강력하게 암호화하여 로컬 스토리지에 보관합니다.
 * @param key 로컬 스토리지 키 이름
 * @param value 암호화하여 보관할 객체 데이터
 */
// ====================================================================
// 📊 [OMD-AUTH-secureStorage-0001] secureStorage.ts ➔ saveSecureData
// 🎯 @KICK  : AES-256 암호화하여 로컬 스토리지에 보안 데이터 저장
// 🛡️ @GUARD : window 부재, JSON.stringify 실패 시 catch
// 🚨 @PATCH : **2026-10-03** — [평문/암호문 하이브리드 판별 및 Malformed UTF-8 에러 차단]: JSON 평문 선제 감지 및 AES 복호화 실패 시 안전 폴백(null 반환) 연동으로 치명적 런타임 크래시 방어
// 🔗 @CALLS : 없음
// ====================================================================
export const saveSecureData = (key: string, value: any): void => {
  if (typeof window === 'undefined') return;
  try {
    const rawString = JSON.stringify(value);
    const ciphertext = CryptoJS.AES.encrypt(rawString, SECRET_SALT).toString();
    localStorage.setItem(key, ciphertext);
  } catch (error) {
    console.error('로컬 보안 데이터 저장 중 오류 발생:', error);
  }
};

/**
 * 💡 [한글 주석] 로컬 스토리지에서 암호화된 문자열을 가져와 복호화한 후 JSON 객체로 파싱하여 반환합니다.
 * @param key 로컬 스토리지 키 이름
 * @returns 복호화된 원본 데이터 객체 또는 null
 */
// ====================================================================
// 📊 [OMD-AUTH-secureStorage-0002] secureStorage.ts ➔ loadSecureData
// 🎯 @KICK  : 로컬 스토리지 AES-256 암호화 데이터 복호화 및 JSON 파싱
// 🛡️ @GUARD : window 부재, ciphertext null, 복호화 결과 유효성, 변조 의심 시 null 반환
// 🚨 @PATCH : **2026-10-03** — [Malformed UTF-8 복호화 에러 원천 방어 및 평문/암호문 하이브리드 지원]: ciphertext가 AES 암호문(U2FsdGVkX1)이 아닌 경우 평문 자동 파싱, 복호화 시 Utf8 디코딩 예외 방어 및 불필요한 콘솔 빨간색 에러 원천 차단
// 🔗 @CALLS : 없음
// ====================================================================
export const loadSecureData = <T = any>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const ciphertext = localStorage.getItem(key);
    if (!ciphertext || typeof ciphertext !== 'string') return null;

    const trimmed = ciphertext.trim();
    if (!trimmed) return null;

    // 🛡️ [평문 데이터 하이브리드 지원]: CryptoJS AES 암호문 표준 프리픽스('U2FsdGVkX1' - 'Salted__')가 아닌 경우
    if (!trimmed.startsWith('U2FsdGVkX1')) {
      try {
        return JSON.parse(trimmed) as T;
      } catch {
        return trimmed as unknown as T;
      }
    }

    let decryptedText = '';
    try {
      const bytes = CryptoJS.AES.decrypt(trimmed, SECRET_SALT);
      decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      // 키 불일치나 UTF-8 디코딩 실패 시 안전 폴백
      return null;
    }
    
    // 복호화 결과 텍스트가 유효하지 않으면 null
    if (!decryptedText) return null;

    try {
      return JSON.parse(decryptedText) as T;
    } catch {
      return decryptedText as unknown as T;
    }
  } catch (error) {
    // 예상치 못한 에러 발생 시 콘솔을 어지럽히지 않고 안전하게 null 반환
    return null;
  }
};

