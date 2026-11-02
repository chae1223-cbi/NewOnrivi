// ====================================================================
// 📊 [OMD-CORE-singleTabGuard-0001] singleTabGuard.ts ➔ 동일 브라우저 다중 에디터 중복 접근 방어 훅
// 🎯 @KICK  : BroadcastChannel 기반 동일 브라우저 내 에디터 다중 탭 동시 접근 감지 및 단일 인스턴스 보장
// 🛡️ @GUARD : 파일 동시 쓰기 경합 및 SQLite DB WAL 락 방어, 제어권 인수(Take Over) 지원
// 🚨 @PATCH : **2026-09-05** — 중복 탭 진입 시 화면 전면 차단 모달 대신 제한사용자(읽기 전용) 모드로 부드럽게 진입하도록 지원하고, 활성 탭 종료 시 잔류 탭 자동 승격(RELEASE_LOCK) 지원
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 동일 브라우저 내 에디터 다중 인스턴스 방어 훅 최초 구현
// 🔗 @CALLS : BroadcastChannel
// ====================================================================

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SingleTabGuardState {
  isDuplicateInstance: boolean;
  takeOverControl: () => void;
}

export function useSingleTabGuard(enabled: boolean = true): SingleTabGuardState {
  const [isDuplicateInstance, setIsDuplicateInstance] = useState(false);
  const isDuplicateInstanceRef = useRef(false);
  const tabIdRef = useRef<string>(`tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    isDuplicateInstanceRef.current = isDuplicateInstance;
  }, [isDuplicateInstance]);

  const takeOverControl = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'CLAIM_LOCK',
        tabId: tabIdRef.current,
      });
      setIsDuplicateInstance(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      setIsDuplicateInstance(false);
      return;
    }

    const channel = new BroadcastChannel('onrivi_editor_single_instance');
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'PING') {
        // 이미 활성 상태인 탭이 다른 탭의 접속 요청에 응답하여 존재를 알림
        if (!isDuplicateInstanceRef.current && data.tabId !== tabIdRef.current) {
          channel.postMessage({
            type: 'PONG',
            tabId: tabIdRef.current,
          });
        }
      } else if (data.type === 'PONG') {
        // 기존 탭이 이미 활성화되어 있음을 확인 -> 중복 탭(제한사용자)으로 전환
        if (data.tabId !== tabIdRef.current) {
          setIsDuplicateInstance(true);
        }
      } else if (data.type === 'CLAIM_LOCK') {
        // 다른 탭에서 제어권을 강제로 인수한 경우 -> 현재 탭을 제한사용자로 전환
        if (data.tabId !== tabIdRef.current) {
          setIsDuplicateInstance(true);
        }
      } else if (data.type === 'RELEASE_LOCK') {
        // 기존 활성 탭이 닫히거나 해제된 경우 -> 현재 탭을 정상 활성 탭으로 자동 승격
        if (data.tabId !== tabIdRef.current && isDuplicateInstanceRef.current) {
          setIsDuplicateInstance(false);
        }
      }
    };

    const handleUnload = () => {
      if (!isDuplicateInstanceRef.current && channelRef.current) {
        try {
          channelRef.current.postMessage({
            type: 'RELEASE_LOCK',
            tabId: tabIdRef.current,
          });
        } catch {
          // ignore
        }
      }
    };

    channel.addEventListener('message', handleMessage);
    window.addEventListener('beforeunload', handleUnload);

    // 접속 시 기존 활성 탭이 있는지 확인
    channel.postMessage({
      type: 'PING',
      tabId: tabIdRef.current,
    });

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [enabled]);

  return {
    isDuplicateInstance,
    takeOverControl,
  };
}
