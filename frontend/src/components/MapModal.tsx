"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import { mediaDetails } from '@/lib/mediaMarkup';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, Minus, MapPin, Copy, Check, Map, Link2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { logError } from '@/lib/errorDiagnostics';
import { MediaAlignmentControl, MediaSizeInputs, MediaCaptionControl, normalizeMediaDimension, type MediaAlign, type MediaCaptionFormat } from '@/components/MediaLayoutFields';
import { formatMediaCaption } from '@/lib/aiFriendlyReport';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (code: string) => void;
  isDarkMode: boolean;
  initialSource?: string;
  captionConfig?: {
    position?: 'top' | 'bottom';
    format?: string;
    customTemplate?: string;
  };
  nextNumber?: number;
}

// ====================================================================
// 📊 [OMD-CORE-MapModal-0006] MapModal ➔ MapModal
// 🎯 @KICK  : Google Maps / My Maps iframe 기반 지도 삽입 모달 - 지도 URL 파싱, 주소 검색, 줌 제어, 크기/정렬 설정
// 🚨 @PATCH : **2026-11-16** — [한국 도로명 주소 검색 실패 개선 및 지도 위치명·캡션 중복 방지 보완]:
//             1) OpenStreetMap Nominatim 외 Photon(Komoot) 지오코더 폴백 추가 (&lang=default로 영문 로마자 치환 방지)
//             2) 한국 도로명 주소 공백 정규화('대로/로/길 + 번호·번길') 및 도로명 단위 폴백 후보 생성
//             3) 한글 검색어 입력 시 응답명이 영문일 경우 원본 한글 검색어를 위치명(placeName)으로 보존
//             4) 검색 예외 발생 시 logError 선제 기록 적용
//             5) Google Maps 임베드 URL의 빈 iwloc= 파라미터를 iwloc=A로 변경하여 지도 내 위치 정보창(주소명) 표시 및 프리뷰 배지에 placeName 표기
//             6) 기존 지도 수정(initialSource) 시 캡션 중복 삽입 방지 및 신규 삽입 시 MediaCaptionControl UI 노출·검색 주소명 자동 연동
// 🚨 @PATCH : **2026-10-21** — [지도 설명(캡션) 위치(상단/하단) 및 표현 구문(표준/대괄호/화살괄호/일반/제목만/커스텀) 설정 연동]:
//             1) MediaCaptionControl 위젯을 탑재하여 지도 제목, 순번, 상단/하단 위치, 표현 구문 선택 및 실시간 미리보기 제공
//             2) 서식 프로필의 mediaCaptionStructure 및 nextReportNumber(content, '지도') 기본값 자동 반영
//             3) 삽입 시 선택된 위치와 표현 구문으로 완성된 지도 캡션 마크다운 자동 생성
// 🚨 @PATCH : **2026-10-21** — [지도 삽입 모달 지도 주소(URL) 및 iframe 자동 파싱·삽입 지원]:
//             1) 주소/장소명 텍스트 검색뿐만 아니라 구글 지도/구글 내 지도(My Maps) 공유 링크(URL) 및 <iframe> 태그 직접 입력 지원
//             2) My Maps URL(edit/viewer/embed) 감지 시 임베드 주소(/embed?mid=...)로 자동 변환 및 프리뷰/삽입 코드 즉시 연동
//             3) URL 또는 iframe 붙여넣기 시 실시간 자동 파싱 및 검색 버튼 클릭 시 지능형 링크 모드 전환
// 🚨 @PATCH : **2026-10-13** — [지도 삽입 모달 초기 검색창 표시값 개선: 위경도 좌표 대신 실제 건축명('서울시청') 표기 및 title 속성 연동]:
//             1) 초기 진입 시 또는 신규 지도 삽입 시 위도,경도 숫자 대신 실건축명 '서울시청'이 검색창에 기본 표기되도록 개선
//             2) 삽입되는 iframe 코드에 title="${placeName}" 속성을 부여하여 웹 접근성 준수 및 재편집 시 건축명 보존
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-07-15 - 왼쪽 사이드바 제거 요청 반영 및 본문 영역 확장
// 🔗 @CALLS : handleSearch, handleInsert, setZoom, setMapAlign, showToast, createPortal
// ====================================================================

interface GeocodeResult {
  lat: number;
  lon: number;
  shortName: string;
}

/**
 * ========================================================================================
 * [buildKoreanAddressCandidates] 한국 도로명 주소 공백·건물번호 표기 차이를 보완한 검색 후보 목록을 생성합니다.
 *
 * @param {string} query - 사용자가 입력한 원본 주소 또는 장소명
 * @returns {string[]} 중복이 제거된 검색 후보 문자열 배열
 * ==========================================================================================
 */
function buildKoreanAddressCandidates(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const candidates = new Set<string>([trimmed]);
  const compactRoad = trimmed.replace(/(대로|로|길)\s+(\d+(?:-\d+)?(?:번길)?)/g, '$1$2');
  candidates.add(compactRoad);

  // 세부 건물번호('로 166' 등)가 없는 경우 도로명 단위 검색으로 폴백
  const streetOnly = trimmed.replace(/(대로|로|길)\s+\d+(?:-\d+)?(?=\s|$)/g, '$1').trim();
  if (streetOnly && streetOnly !== trimmed) {
    candidates.add(streetOnly);
  }

  return Array.from(candidates);
}

/**
 * ========================================================================================
 * [searchNominatim] OpenStreetMap Nominatim API로 주소/장소 좌표를 조회합니다.
 *
 * @param {string} query - 검색어
 * @returns {Promise<GeocodeResult | null>} 조회 결과 또는 null
 * ==========================================================================================
 */
async function searchNominatim(query: string): Promise<GeocodeResult | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=ko`,
    { headers: { 'Accept-Language': 'ko' } }
  );
  if (!response.ok) return null;

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = parseFloat(data[0].lat);
  const lon = parseFloat(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const shortName = String(data[0].display_name || '').split(',')[0].trim() || query;
  return { lat, lon, shortName };
}

/**
 * ========================================================================================
 * [searchPhoton] Komoot Photon 지오코딩 API로 한국 도로명/장소 좌표를 조회합니다.
 *
 * @param {string} query - 검색어
 * @returns {Promise<GeocodeResult | null>} 조회 결과 또는 null
 * ==========================================================================================
 */
async function searchPhoton(query: string): Promise<GeocodeResult | null> {
  const response = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=default`
  );
  if (!response.ok) return null;

  const data = await response.json();
  const feature = data?.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const props = feature?.properties || {};
  const streetPart = [props.street, props.housenumber].filter(Boolean).join(' ').trim();
  const shortName = String(props.name || streetPart || props.city || props.state || query).trim();
  return { lat, lon, shortName };
}

/**
 * ========================================================================================
 * [geocodeAddress] Nominatim과 Photon 다중 지오코더 및 도로명 정규화 후보를 순차 조회합니다.
 *
 * @param {string} query - 사용자가 입력한 주소 또는 장소명
 * @returns {Promise<GeocodeResult | null>} 최초 일치한 지오코딩 결과 또는 null
 * ==========================================================================================
 */
async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const candidates = buildKoreanAddressCandidates(query);
  const hasHangul = /[가-힣]/.test(query);
  for (const candidate of candidates) {
    const nominatimResult = await searchNominatim(candidate);
    if (nominatimResult) {
      if (hasHangul && !/[가-힣]/.test(nominatimResult.shortName)) {
        nominatimResult.shortName = query.trim();
      }
      return nominatimResult;
    }

    const photonResult = await searchPhoton(candidate);
    if (photonResult) {
      if (hasHangul && !/[가-힣]/.test(photonResult.shortName)) {
        photonResult.shortName = query.trim();
      }
      return photonResult;
    }
  }
  return null;
}

interface ParsedMapInput {
  type: 'mymaps' | 'google_coords' | 'raw_coords' | 'generic_embed';
  embedUrl?: string;
  coords?: string;
  zoom?: number | null;
  placeName?: string;
  width?: string;
  height?: string;
}

/**
 * 🗺️ [지도 입력값 지능형 파서]
 * - Google My Maps (edit, viewer, embed) 공유 URL 자동 감지 및 embed 주소 변환
 * - <iframe> HTML 태그 붙여넣기 시 src 및 크기 속성 추출
 * - Google Maps URL 내 @위도,경도,줌 좌표 추출
 * - 순수 위경도 좌표 직접 입력 감지
 */
function parseMapInput(input: string): ParsedMapInput | null {
  const text = (input || '').trim();
  if (!text) return null;

  // 1. iframe 태그 감지 및 src/크기/제목 추출
  const iframeMatch = text.match(/<iframe\b([^>]*)>/i);
  let targetUrl = text;
  let extractedWidth: string | undefined;
  let extractedHeight: string | undefined;
  let extractedTitle: string | undefined;

  if (iframeMatch) {
    const attrs = iframeMatch[1];
    const srcM = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (srcM) targetUrl = srcM[1];
    const widthM = attrs.match(/\bwidth=["']([^"']+)["']/i);
    if (widthM) extractedWidth = widthM[1];
    const heightM = attrs.match(/\bheight=["']([^"']+)["']/i);
    if (heightM) extractedHeight = heightM[1];
    const titleM = attrs.match(/\btitle=["']([^"']+)["']/i);
    if (titleM) extractedTitle = titleM[1];
  }

  // 2. 구글 내 지도 (Google My Maps: edit, viewer, embed)
  if (targetUrl.includes('google.com/maps/d/') || targetUrl.includes('google.com/mymaps/')) {
    const midMatch = targetUrl.match(/[?&]mid=([a-zA-Z0-9_\-]+)/);
    if (midMatch) {
      const mid = midMatch[1];
      const embedUrl = `https://www.google.com/maps/d/embed?mid=${mid}`;
      const llMatch = targetUrl.match(/[?&]ll=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) || targetUrl.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
      const zMatch = targetUrl.match(/[?&]z=(\d+)/);
      return {
        type: 'mymaps',
        embedUrl,
        coords: llMatch ? `${parseFloat(llMatch[1]).toFixed(4)}, ${parseFloat(llMatch[2]).toFixed(4)}` : undefined,
        zoom: zMatch ? parseInt(zMatch[1], 10) : undefined,
        placeName: extractedTitle || '구글 내 지도 (My Maps)',
        width: extractedWidth,
        height: extractedHeight,
      };
    }
  }

  // 3. 구글 일반 지도 URL 내 @위도,경도,줌 (@37.5665,126.9780,15z)
  const atCoordsMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)(?:,(\d+(?:\.\d+)?z))?/);
  if (atCoordsMatch) {
    const lat = parseFloat(atCoordsMatch[1]).toFixed(4);
    const lng = parseFloat(atCoordsMatch[2]).toFixed(4);
    const zoom = atCoordsMatch[3] ? parseInt(atCoordsMatch[3], 10) : undefined;
    return {
      type: 'google_coords',
      coords: `${lat}, ${lng}`,
      zoom,
      placeName: extractedTitle || '구글 지도 위치',
      width: extractedWidth,
      height: extractedHeight,
    };
  }

  // 4. 구글 지도 query 좌표: ?q=위도,경도
  const qCoordsMatch = targetUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qCoordsMatch) {
    const lat = parseFloat(qCoordsMatch[1]).toFixed(4);
    const lng = parseFloat(qCoordsMatch[2]).toFixed(4);
    const zMatch = targetUrl.match(/[?&]z=(\d+)/);
    return {
      type: 'google_coords',
      coords: `${lat}, ${lng}`,
      zoom: zMatch ? parseInt(zMatch[1], 10) : undefined,
      placeName: extractedTitle || '구글 지도 위치',
      width: extractedWidth,
      height: extractedHeight,
    };
  }

  // 5. 순수 위경도 좌표 직접 입력: "37.5665, 126.9780"
  const rawCoordsMatch = text.match(/^[\("'s]*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)[\)"'s]*$/);
  if (rawCoordsMatch) {
    const lat = parseFloat(rawCoordsMatch[1]).toFixed(4);
    const lng = parseFloat(rawCoordsMatch[2]).toFixed(4);
    return {
      type: 'raw_coords',
      coords: `${lat}, ${lng}`,
      placeName: `${lat}, ${lng}`,
    };
  }

  // 6. 일반 지도 임베드 URL (https://...embed... 또는 maps.google...output=embed)
  if (/^https?:\/\//i.test(targetUrl) && (targetUrl.includes('map') || targetUrl.includes('embed') || targetUrl.includes('osm'))) {
    return {
      type: 'generic_embed',
      embedUrl: targetUrl,
      placeName: extractedTitle || '지도 링크',
      width: extractedWidth,
      height: extractedHeight,
    };
  }

  return null;
}

export default function MapModal({ isOpen, onClose, onInsert, isDarkMode, initialSource, captionConfig, nextNumber = 1 }: MapModalProps) {
  useModalEscape(isOpen, onClose);
  const { showToast } = useToast();
  const [address, setAddress] = useState("서울시청");
  const [coords, setCoords] = useState("37.5665, 126.9780");
  const [placeName, setPlaceName] = useState("서울시청");
  const [customEmbedUrl, setCustomEmbedUrl] = useState<string>('');
  const [zoom, setZoom] = useState(15);
  const [mapWidth, setMapWidth] = useState("100%");
  const [mapHeight, setMapHeight] = useState("480");
  const [mapAlign, setMapAlign] = useState<MediaAlign>('center');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [captionTitle, setCaptionTitle] = useState("");
  const [captionNumber, setCaptionNumber] = useState(1);
  const [captionPosition, setCaptionPosition] = useState<'top' | 'bottom'>('top');
  const [captionFormat, setCaptionFormat] = useState<MediaCaptionFormat>('standard');
  const [customTemplate, setCustomTemplate] = useState('**{kind} {n}. {title}**');
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    const frame = requestAnimationFrame(() => addressInputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [isOpen, mounted]);

  const applyParsedInput = (parsed: ParsedMapInput) => {
    if (parsed.embedUrl) {
      setCustomEmbedUrl(parsed.embedUrl);
    } else {
      setCustomEmbedUrl('');
    }
    if (parsed.coords) {
      setCoords(parsed.coords);
    }
    if (parsed.zoom) {
      setZoom(parsed.zoom);
    }
    if (parsed.placeName) {
      setPlaceName(parsed.placeName);
      setCaptionTitle(parsed.placeName);
    }
    if (parsed.width) setMapWidth(parsed.width);
    if (parsed.height) setMapHeight(parsed.height);
  };

  useEffect(() => {
    if (!isOpen) return;
    if (initialSource) {
      const details = mediaDetails(initialSource);
      const path = details?.path || '';
      const parsed = parseMapInput(path);
      if (parsed?.embedUrl) {
        setCustomEmbedUrl(parsed.embedUrl);
        setAddress(path);
        setPlaceName(details?.title || parsed.placeName || '구글 내 지도');
        if (parsed.coords) setCoords(parsed.coords);
        if (parsed.zoom) setZoom(parsed.zoom);
      } else {
        const params = path ? new URL(path).searchParams : null;
        const q = params?.get('q') || '37.5665,126.9780';
        setCoords(q);
        setCustomEmbedUrl('');
        const displayName = details?.title || (q.includes(',') ? '서울시청' : q);
        setAddress(displayName);
        setPlaceName(details?.title || '서울시청');
        setZoom(Math.max(1, Math.min(20, Number(params?.get('z')) || 15)));
      }
      setMapWidth(details?.width || '100%');
      setMapHeight(details?.height || '480');
      setMapAlign((['left', 'center', 'right'].includes(details?.align || '') ? details!.align : 'center') as MediaAlign);
      const rawSavedCaption = details?.caption || '';
      const prefixMatch = rawSavedCaption.match(/^(?:\[지도\s+(\d+)\]|<지도\s+(\d+)>|지도\s+(\d+)\.)\s*(.*)$/);
      const parsedCaptionNumber = prefixMatch ? Number(prefixMatch[1] || prefixMatch[2] || prefixMatch[3]) : null;
      const parsedCaptionTitle = prefixMatch ? prefixMatch[4].trim() : rawSavedCaption;
      setCaptionTitle(parsedCaptionTitle || details?.title || parsed?.placeName || '');
      setCaptionNumber(parsedCaptionNumber || nextNumber || 1);
    } else {
      setCoords("37.5665, 126.9780");
      setAddress("서울시청");
      setPlaceName("서울시청");
      setCaptionTitle("서울시청");
      setCustomEmbedUrl('');
      setZoom(15);
      setMapWidth("100%");
      setMapHeight("480");
      setMapAlign('center');
      setCaptionNumber(nextNumber || 1);
    }
    const savedPos = initialSource ? mediaDetails(initialSource)?.captionPosition : '';
    setCaptionPosition(savedPos === 'top' || savedPos === 'bottom' ? savedPos : (captionConfig?.position || 'top'));
    setCaptionFormat((captionConfig?.format as MediaCaptionFormat) || 'standard');
    setCustomTemplate(captionConfig?.customTemplate || '**{kind} {n}. {title}**');
  }, [isOpen, initialSource, nextNumber, captionConfig]);

  // 지도 주소 파싱 또는 주소/장소명 검색
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = address.trim();
    if (!query) return;

    // 1. 지도 주소(URL) 또는 iframe 태그, 좌표 직접 입력인지 먼저 확인
    const parsed = parseMapInput(query);
    if (parsed) {
      applyParsedInput(parsed);
      const msg = parsed.type === 'mymaps'
        ? '✨ 구글 내 지도(My Maps) 링크를 연결했습니다.'
        : parsed.type === 'google_coords' || parsed.type === 'raw_coords'
          ? '✨ 지도 좌표를 성공적으로 연결했습니다.'
          : '✨ 지도 링크를 성공적으로 연결했습니다.';
      showToast(msg, 'success');
      return;
    }

    // 2. 일반 텍스트 주소/장소명인 경우 Nominatim + Photon 다중 지오코딩 검색
    setCustomEmbedUrl('');
    setIsLoading(true);
    try {
      const result = await geocodeAddress(query);

      if (result) {
        const newCoords = `${result.lat.toFixed(4)}, ${result.lon.toFixed(4)}`;
        setCoords(newCoords);
        setPlaceName(result.shortName);
        setCaptionTitle(result.shortName);
        showToast(`"${result.shortName}" 위치를 찾았습니다.`, 'success');
      } else {
        showToast("검색 결과를 찾을 수 없습니다. 지도 공유 링크(URL)나 다른 검색어를 입력해보세요.", 'error');
      }
    } catch (error) {
      logError({
        file: 'frontend/src/components/MapModal.tsx',
        func: 'handleSearch',
        doing: '지도 모달 주소/장소명 지오코딩 검색 중',
        target: query,
        error,
      });
      showToast("검색 중 오류가 발생했습니다.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 입력창에 URL 또는 iframe이 붙여넣어질 때 즉시 감지하여 미리보기 동기화
  const handleAddressChange = (val: string) => {
    setAddress(val);
    const trimmed = val.trim();
    if (trimmed.startsWith('http') || trimmed.startsWith('<iframe') || /^[\("'s]*-?\d{1,3}\.\d+/.test(trimmed)) {
      const parsed = parseMapInput(trimmed);
      if (parsed) {
        applyParsedInput(parsed);
      }
    }
  };

  const cleanCoords = useMemo(() => {
    return coords.trim().replace(/^[\("'s]+|[\)"'s]+$/g, '');
  }, [coords]);

  // 최종 임베드될 지도 URL 계산
  const googleEmbedUrl = useMemo(() => {
    if (customEmbedUrl) {
      return customEmbedUrl;
    }
    const [lat, lng] = cleanCoords.split(',').map(s => s.trim());
    return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&t=&ie=UTF8&iwloc=A&output=embed${isDarkMode ? '&theme=dark' : ''}`;
  }, [customEmbedUrl, cleanCoords, zoom, isDarkMode]);

  const [latVal, lngVal] = cleanCoords.split(',').map(s => s.trim());
  const escapeHtmlAttr = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeTitle = escapeHtmlAttr(placeName || address || '지도');
  const rawCaption = captionFormat !== 'none' && captionTitle.trim()
    ? formatMediaCaption('지도', captionNumber, captionTitle.trim(), captionFormat, customTemplate)
    : '';
  const cleanCaption = rawCaption ? rawCaption.replace(/\*\*/g, '').replace(/\\([\\`*_\[\]<>])/g, '$1').trim() : '';
  const captionAttrs = cleanCaption
    ? ` data-caption="${escapeHtmlAttr(cleanCaption)}" data-caption-position="${captionPosition}"`
    : '';
  const mapCode = `<iframe src="${googleEmbedUrl}" title="${safeTitle}" style="width:${normalizeMediaDimension(mapWidth, '100%')}; height:${normalizeMediaDimension(mapHeight, '480px')}; border:0;" allowfullscreen loading="lazy" data-align="${mapAlign}"${captionAttrs}></iframe>`;

  const handleInsert = () => {
    onInsert(`\n${mapCode}\n`);
    onClose();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(mapCode);
      setIsCopied(true);
      showToast("지도 HTML 코드가 복사되었습니다.", "success");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      showToast("코드 복사에 실패했습니다.", "error");
    }
  };

  if (!isOpen) return null;
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-8" style={{ overflowY: "auto" }}>
      {/* 선명한 투명 배경 (안개 블러 제거) */}
      <div className="absolute inset-0 bg-black/65" onClick={onClose} />
      
      {/* Modal Shell */}
      <main 
        className={`relative w-full max-w-4xl max-h-[90vh] shadow-2xl rounded-xl overflow-hidden flex flex-col border animate-in zoom-in-95 duration-300 ${
          isDarkMode 
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100' 
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Top App Bar (Header) */}
        <header className={`flex justify-between items-center h-16 px-6 w-full border-b shrink-0 ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-[#EFEFEF] bg-slate-50/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <Map size={18} />
            </div>
            <h1 className="text-base font-bold tracking-tight text-[#1d4ed8]">지도 삽입</h1>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1.5 transition-colors rounded-md active:scale-95"
          >
            <X size={18} />
          </button>
        </header>

        {/* Main Working Canvas */}
        <section className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 bg-white dark:bg-zinc-950">
            {/* Search Module */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 tracking-wider uppercase">
                  주소·장소 검색 또는 지도 주소(Google Maps / 내 지도 공유 URL / iframe) 입력
                </label>
                {customEmbedUrl && (
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Link2 size={12} />
                    <span>공유 링크 모드 활성</span>
                  </span>
                )}
              </div>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1 group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 flex items-center">
                    <Search size={16} />
                  </span>
                  <input 
                    ref={addressInputRef}
                    type="text"
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    placeholder="예: 서울시청 또는 구글 지도/내 지도 공유 링크(https://...), iframe 태그"
                    className={`w-full border-transparent focus:border-indigo-500/20 focus:ring-0 rounded-lg pl-11 pr-4 py-2.5 text-xs font-bold transition-all shadow-sm ${
                      isDarkMode ? 'bg-zinc-900 focus:bg-zinc-900' : 'bg-slate-50 focus:bg-slate-50/30'
                    }`}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-40"
                >
                  <span>{isLoading ? '검색 중...' : '적용/검색'}</span>
                </button>
              </form>
            </div>

            {/* Map Visualization */}
            <div className={`relative rounded-xl overflow-hidden border shadow-inner h-[280px] shrink-0 ${
              isDarkMode ? 'border-zinc-800' : 'border-slate-200'
            }`}>
              <iframe
                key={googleEmbedUrl}
                title="Google Map"
                width="100%"
                height="100%"
                style={{ border: 0, filter: isDarkMode && !customEmbedUrl ? 'invert(90%) hue-rotate(180deg)' : 'none' }}
                loading="lazy"
                allowFullScreen
                src={googleEmbedUrl}
              />

              {/* Floating Coordinates / Mode Overlay */}
              <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-zinc-800 px-3.5 py-1.5 rounded-lg flex items-center space-x-3 z-20 shadow-sm text-[10px] font-bold">
                {customEmbedUrl ? (
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                    <MapPin size={12} />
                    <span>구글 내 지도 (My Maps) 연동</span>
                  </div>
                ) : (
                  <div className="flex flex-col text-slate-700 dark:text-zinc-200 leading-tight">
                    {placeName && (
                      <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-0.5">
                        <MapPin size={11} />
                        <span>{placeName}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600 dark:text-zinc-400">LAT: {latVal} · LNG: {lngVal}</span>
                  </div>
                )}
                <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800" />
                <span className="text-slate-400 dark:text-zinc-500">{customEmbedUrl ? 'Custom Embed Active' : 'Local Engine Active'}</span>
              </div>

              {/* Map Controls */}
              {!customEmbedUrl && (
                <div className="absolute top-4 right-4 flex flex-col space-y-1.5 z-20">
                  <button 
                    onClick={() => setZoom(z => Math.min(z + 1, 20))}
                    className="w-8 h-8 bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-center hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 transition-colors active:scale-95"
                    title="확대"
                  >
                    <Plus size={16} />
                  </button>
                  <button 
                    onClick={() => setZoom(z => Math.max(z - 1, 1))}
                    className="w-8 h-8 bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-center hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 transition-colors active:scale-95"
                    title="축소"
                  >
                    <Minus size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Editorial Control Panel: Grid of Settings */}
            <MediaCaptionControl
              kind="지도"
              title={captionTitle}
              onTitleChange={setCaptionTitle}
              number={captionNumber}
              onNumberChange={setCaptionNumber}
              position={captionPosition}
              onPositionChange={setCaptionPosition}
              format={captionFormat}
              onFormatChange={setCaptionFormat}
              customTemplate={customTemplate}
              onCustomTemplateChange={setCustomTemplate}
              isDarkMode={isDarkMode}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 shrink-0">
              {/* Dimensions and Alignment */}
              <div className="space-y-4">
                <MediaSizeInputs width={mapWidth} height={mapHeight} onWidthChange={setMapWidth} onHeightChange={setMapHeight} isDarkMode={isDarkMode} />
                <MediaAlignmentControl align={mapAlign} onChange={setMapAlign} isDarkMode={isDarkMode} />
              </div>

              {/* Code Block Area */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-[9px] font-black text-slate-500 dark:text-zinc-400 tracking-wider uppercase">삽입될 HTML (IFRAME)</label>
                  <span className="text-[9px] font-black text-indigo-600/60 dark:text-indigo-400/60">API 키 불필요</span>
                </div>
                <div className={`rounded-lg overflow-hidden border shadow-sm ${
                  isDarkMode ? 'border-zinc-800/80' : 'border-slate-200/60'
                }`}>
                  <div className={`px-3 py-1.5 flex justify-between items-center border-b ${
                    isDarkMode ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-slate-100/80 border-slate-200/60'
                  }`}>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 font-mono">EMBED_SNIPPET.HTML</span>
                    <button 
                      onClick={handleCopyCode}
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center"
                    >
                      {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <pre className={`p-3 font-mono text-[9px] leading-relaxed overflow-x-auto whitespace-nowrap scrollbar-none select-text ${
                    isDarkMode ? 'bg-zinc-900/30 text-zinc-400' : 'bg-slate-50/50 text-slate-600'
                  }`}>
                    <code>{mapCode}</code>
                  </pre>
                </div>
              </div>
            </div>
          </section>

        {/* Sticky Footer Action Zone */}
        <footer className={`h-20 px-8 border-t flex items-center justify-between z-50 shrink-0 ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-150 bg-slate-50/50'
        }`}>
          <div className="flex items-center space-x-2 text-slate-400 dark:text-zinc-650">
            <span className="text-[10px] font-black tracking-tight font-mono">Onrivi Local-First Engine v1.0.4</span>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-[4px] font-bold text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-all active:scale-95"
            >
              취소
            </button>
            <button 
              onClick={handleInsert}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-[4px] font-bold text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center space-x-2"
            >
              <MapPin size={14} />
              <span>지도 삽입하기</span>
            </button>
          </div>
        </footer>
      </main>
    </div>,
    document.body
  );
}
