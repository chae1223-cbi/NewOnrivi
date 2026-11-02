// ====================================================================
// 📊 [OMD-CORE-Icons-0001] icons/index.ts ➔ Icons Registry
// 🎯 @KICK  : Onrivi Author 전체 애플리케이션의 아이콘을 중앙 집중식으로 관리하는 통합 레지스트리
// 🛡️ @GUARD : Lucide React 기반의 벡터 일관성, strokeWidth 일원화, 트리 셰이킹 지원
// 🚨 @PATCH : **2026-10-02** — [이모지 보관함 아이콘 추가] Smile 벡터 아이콘을 Smile/Emoji 레지스트리에 등록
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 아이콘 추가] FileSignature 벡터 아이콘을 Signature 레지스트리에 등록
// 🚨 @PATCH : **2026-09-23** — [아이콘 레지스트리 정리] 미사용 CubeFocus 임시 정의 제거 (PNG 이미지 직참조로 전환)
// 🚨 @PATCH : **2026-09-20** — [툴바 CubeFocus 아이콘 추가] FloatingToolbar 켜기/끄기 버튼을 CubeFocus(BoxSelect) 아이콘으로 교체, 레지스트리 등록
// 🚨 @PATCH : **2026-09-20** — [툴바 아이콘 3종 교체] TerminalWindow(TerminalSquare), NewspaperClipping(Newspaper), HeadCircuit(BrainCircuit) 레지스트리 추가
// 🚨 @PATCH : **2026-09-20** — [에디터/지식문서 전체 컴포넌트 아이콘 통합] lucide-react 직접 import를 제거하고 33개 누락 아이콘을 레지스트리에 일괄 추가 (Loading/CheckCircle/Lock/HardDrive/Bot/UploadCloud/GridView/SortUpDown/Hash/Cut/FolderTree/ClipboardPaste/RotateCw/FolderInput/Undo2/Pencil/FolderSync/Command/KeyRound/TypeIcon/Braces/RotateCcw/User/Mail/Shield/Paperclip/Plus/SidebarToggle/FileJson/FileType/FileGeneric/CheckSuccess)
// 🚨 @PATCH : 2026-09-12 — [3D 입체 컬러 아이콘 시스템 구축] 툴바 및 플로팅 툴바 전용 입체감(Depth)과 테마 컬러 매핑(ICON_THEMES) 및 Footnote(Superscript) 탑재
// 🚨 @PATCH : 2026-09-12 — [통합 아이콘 시스템 구축] 이모지 및 개별 icon 분산을 해소하고 의미론적(Semantic) 아이콘 레지스트리 신규 탑재
// 🔗 @CALLS : lucide-react
// ====================================================================
import {
  // 1. 네비게이션 & 사이드바
  Folder,
  FolderOpen,
  FolderPlus,
  Search,
  FileText,
  FileCode,
  FileSpreadsheet,
  FilePlus,
  ListTree,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  BookOpen,
  Bookmark,

  // 2. 에디터 서식 & 텍스트 도구
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Code2,
  Heading,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  CheckSquare,
  Square,
  Minus,
  Eraser,
  Sparkles,
  Wand2,
  Brush,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Superscript,
  FileSignature,
  Smile,

  // 3. 미디어 & 확장 객체
  Link,
  Link2,
  Image,
  Video,
  Film,
  Calendar,
  Clock,
  MapPin,
  Map,
  Table,
  Sigma,
  PieChart,
  BarChart,

  // 4. 지식 베이스 & AI 엔진
  Brain,
  Cpu,
  GraduationCap,
  Layers,
  Database,
  Tag,
  ShieldCheck,
  Zap,
  Library,

  // 5. 공통 액션 & 윈도우 UI
  Settings,
  HelpCircle,
  Download,
  Upload,
  Share2,
  Copy,
  Clipboard,
  Trash2,
  Edit2,
  Edit3,
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Megaphone,
  AlertOctagon,
  Sliders,
  Palette,
  LayoutDashboard,
  LogOut,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Save,
  Undo,
  Redo,
  Home,
  Printer,
  Key,
  ZoomIn,
  ZoomOut,

  // 6. 신규 추가 — 2026-09-20 (에디터/지식문서 전체 통합)
  PanelLeft,
  Plus,
  FileJson,
  FileType,
  File as FileGenericIcon,
  Loader2,
  Lock,
  HardDrive,
  Bot,
  UploadCloud,
  CheckCircle2,
  LayoutGrid,
  ArrowUpDown,
  Hash,
  Scissors,
  FolderTree,
  ClipboardPaste,
  RotateCw,
  FolderInput,
  Undo2,
  Pencil,
  FolderSync,
  Command,
  CheckCircle,
  KeyRound,
  Type,
  Braces,
  RotateCcw,
  User,
  Mail,
  Shield,
  Paperclip,
  // 7. 신규 추가 — 2026-09-20 (툴바 아이콘 3종)
  TerminalSquare,
  Newspaper,
  BrainCircuit,
} from 'lucide-react';


export const Icons = {
  // [1. 네비게이션 & 사이드바]
  Explorer: FolderOpen,
  Folder: Folder,
  FolderOpen: FolderOpen,
  FolderAdd: FolderPlus,
  Search: Search,
  Toc: ListTree,
  Document: FileText,
  FileMarkdown: FileText,
  FileCode: FileCode,
  FileTable: FileSpreadsheet,
  FileAdd: FilePlus,
  ArrowRight: ChevronRight,
  ArrowDown: ChevronDown,
  ArrowLeft: ChevronLeft,
  ArrowUp: ChevronUp,
  Book: BookOpen,
  Bookmark: Bookmark,

  // [2. 에디터 서식 & 텍스트 도구]
  Bold: Bold,
  Italic: Italic,
  Underline: Underline,
  Strikethrough: Strikethrough,
  InlineCode: Code,
  CodeBlock: Code2,
  Heading: Heading,
  Heading1: Heading1,
  Heading2: Heading2,
  Heading3: Heading3,
  Quote: Quote,
  BulletList: List,
  OrderedList: ListOrdered,
  Checklist: CheckSquare,
  Unchecked: Square,
  HorizontalRule: Minus,
  Eraser: Eraser,
  AiAssistant: Sparkles,
  AiMagic: Wand2,
  CleanDoc: Brush,
  AlignLeft: AlignLeft,
  AlignCenter: AlignCenter,
  AlignRight: AlignRight,

  // [3. 미디어 & 확장 객체]
  Link: Link,
  DocLink: Link2,
  Footnote: Superscript,
  Image: Image,
  Video: Video,
  Film: Film,
  DateNow: Calendar,
  Clock: Clock,
  Signature: FileSignature,
  FileSignature: FileSignature,
  Map: MapPin,
  MapArea: Map,
  Table: Table,
  Math: Sigma,
  Chart: BarChart,
  PieChart: PieChart,
  Smile: Smile,
  Emoji: Smile,

  // [4. 지식 베이스 & AI 엔진]
  Brain: Brain,
  KnowledgeDoc: GraduationCap,
  KnowledgeHub: Database,
  Library: Library,
  AiModel: Cpu,
  Layers: Layers,
  Tag: Tag,
  Verified: ShieldCheck,
  FastSpeed: Zap,
  SlashCommand: Zap,

  // [5. 공통 액션 & 윈도우 UI]
  Settings: Settings,
  Help: HelpCircle,
  Export: Download,
  Import: Upload,
  Share: Share2,
  Copy: Copy,
  Paste: Clipboard,
  Delete: Trash2,
  Rename: Edit2,
  Edit: Edit3,
  Refresh: RefreshCw,
  External: ExternalLink,
  Maximize: Maximize2,
  Minimize: Minimize2,
  CloseSidebar: PanelLeftClose,
  OpenSidebar: PanelLeftOpen,
  ClosePanel: PanelRightClose,
  OpenPanel: PanelRightOpen,
  Close: X,
  Checkmark: Check,
  AlertError: AlertCircle,
  AlertWarning: AlertTriangle,
  AlertInfo: Info,
  AlertTip: Lightbulb,
  AlertImportant: Megaphone,
  AlertCaution: AlertOctagon,
  Filter: Sliders,
  Sliders: Sliders,
  Toolbar: Sliders,
  Palette: Palette,
  Dashboard: LayoutDashboard,
  LogOut: LogOut,
  FloatingToolbar: Sliders,
  Preview: Eye,
  EditOnly: EyeOff,
  ThemeLight: Sun,
  ThemeDark: Moon,
  Save: Save,
  Undo: Undo,
  Redo: Redo,
  Home: Home,
  Print: Printer,
  Key: Key,
  ZoomIn: ZoomIn,
  ZoomOut: ZoomOut,

  // [6. 신규 등록 — 2026-09-20 에디터/지식문서 전체 통합]
  SidebarToggle: PanelLeft,    // 에디터 사이드바 토글 (MainEditorApp)
  Plus: Plus,                  // 추가/생성 (+)
  FileJson: FileJson,          // JSON 파일
  FileType: FileType,          // 파일 유형 아이콘
  FileGeneric: FileGenericIcon, // 일반 파일
  Loading: Loader2,            // 로딩 스피너 (animate-spin)
  Lock: Lock,                  // 잠금/비활성화 상태
  HardDrive: HardDrive,        // 드라이브 루트 표시
  Bot: Bot,                    // AI 봇 아이콘
  UploadCloud: UploadCloud,    // 클라우드 업로드 (지식베이스)
  CheckCircle: CheckCircle2,   // 성공 체크 서클 (초록)
  GridView: LayoutGrid,        // 그리드 카드 뷰 토글
  SortUpDown: ArrowUpDown,     // 정렬 방향
  Hash: Hash,                  // 해시/챕터 번호
  Cut: Scissors,               // 잘라내기 (컨텍스트 메뉴)
  FolderTree: FolderTree,      // 폴더 트리 탐색
  ClipboardPaste: ClipboardPaste, // 붙여넣기
  RotateCw: RotateCw,          // 시계방향 새로고침
  FolderInput: FolderInput,    // 폴더 이동/이동 대상
  Undo2: Undo2,                // 화살표형 실행취소
  Pencil: Pencil,              // 수정 (연필, 컨텍스트 메뉴)
  FolderSync: FolderSync,      // 폴더 동기화 (리소스 폴더)
  Command: Command,            // 단축키/커맨드 탭
  CheckSuccess: CheckCircle,   // 성공 체크 원형 (SettingsModal)
  KeyRound: KeyRound,          // 둥근 키 (API Key 섹션)
  TypeIcon: Type,              // 텍스트 타입/글꼴 아이콘
  Braces: Braces,              // 중괄호 (괄호 자동완성)
  RotateCcw: RotateCcw,        // 반시계방향 초기화/되돌리기
  User: User,                  // 사용자 프로필
  Mail: Mail,                  // 이메일
  Shield: Shield,              // 보안/방패
  Paperclip: Paperclip,        // 파일 첨부 (AI 초안 모달)

  // [7. 신규 등록 — 2026-09-20 툴바 아이콘 3종]
  TerminalWindow: TerminalSquare, // 슬래시(/) 빠른 명령어 (터미널 창 모양)
  NewspaperClipping: Newspaper,   // 참조 파일 관리 (신문 클리핑)
  HeadCircuit: BrainCircuit,      // 지식 베이스 화면 전환 (뇌 회로)
} as const;

export type IconName = keyof typeof Icons;

/**
 * 🎨 아이콘별 카테고리 고유 컬러 & 3D 테마 프리셋
 * - 선명한 명도 대비 보장 (Light/Dark 고대비 통일)
 * - 듀오톤 채움 및 입체감(Depth) 연출을 위한 중앙 집중식 메타데이터
 */
export interface IconThemeDef {
  color: string;
}

export const ICON_THEMES: Partial<Record<IconName, IconThemeDef>> = {
  // [에디터 서식 도구]
  Bold: { color: 'text-blue-600 dark:text-blue-400' },
  Italic: { color: 'text-indigo-600 dark:text-indigo-400' },
  InlineCode: { color: 'text-amber-600 dark:text-amber-400' },
  CodeBlock: { color: 'text-violet-600 dark:text-violet-400' },
  Underline: { color: 'text-sky-600 dark:text-sky-400' },
  Strikethrough: { color: 'text-rose-500 dark:text-rose-400' },
  Heading: { color: 'text-emerald-600 dark:text-emerald-400' },
  Heading1: { color: 'text-emerald-600 dark:text-emerald-400' },
  Heading2: { color: 'text-emerald-600 dark:text-emerald-400' },
  Heading3: { color: 'text-emerald-600 dark:text-emerald-400' },
  HorizontalRule: { color: 'text-slate-500 dark:text-slate-400' },
  OrderedList: { color: 'text-blue-500 dark:text-blue-400' },
  BulletList: { color: 'text-teal-600 dark:text-teal-400' },
  Quote: { color: 'text-purple-600 dark:text-purple-400' },
  Checklist: { color: 'text-emerald-600 dark:text-emerald-400' },
  Eraser: { color: 'text-rose-600 dark:text-rose-400' },
  CleanDoc: { color: 'text-cyan-600 dark:text-cyan-400' },
  AiAssistant: { color: 'text-purple-600 dark:text-purple-400' },
  AiMagic: { color: 'text-violet-600 dark:text-violet-400' },
  AlignLeft: { color: 'text-blue-600 dark:text-blue-400' },
  AlignCenter: { color: 'text-blue-600 dark:text-blue-400' },
  AlignRight: { color: 'text-blue-600 dark:text-blue-400' },

  // [미디어 & 객체]
  Link: { color: 'text-blue-500 dark:text-blue-400' },
  DocLink: { color: 'text-indigo-600 dark:text-indigo-400' },
  Book: { color: 'text-amber-700 dark:text-amber-500' },
  Footnote: { color: 'text-purple-600 dark:text-purple-400' },
  Image: { color: 'text-emerald-500 dark:text-emerald-400' },
  Video: { color: 'text-rose-600 dark:text-rose-500' },
  Film: { color: 'text-rose-600 dark:text-rose-500' },
  DateNow: { color: 'text-orange-500 dark:text-orange-400' },
  Clock: { color: 'text-amber-500 dark:text-amber-400' },
  Signature: { color: 'text-zinc-700 dark:text-zinc-200' },
  Map: { color: 'text-teal-600 dark:text-teal-400' },
  MapArea: { color: 'text-teal-600 dark:text-teal-400' },
  Table: { color: 'text-blue-600 dark:text-blue-400' },
  Math: { color: 'text-fuchsia-600 dark:text-fuchsia-400' },

  // [알림 인용구 옵션]
  AlertInfo: { color: 'text-blue-500 dark:text-blue-400' },
  AlertTip: { color: 'text-emerald-600 dark:text-emerald-400' },
  AlertImportant: { color: 'text-purple-600 dark:text-purple-400' },
  AlertWarning: { color: 'text-amber-600 dark:text-amber-400' },
  AlertCaution: { color: 'text-rose-600 dark:text-rose-400' },

  // [네비게이션 & 사이드바]
  Explorer: { color: 'text-amber-500 dark:text-amber-400' },
  Folder: { color: 'text-amber-500 dark:text-amber-400' },
  FolderOpen: { color: 'text-amber-500 dark:text-amber-400' },
  FolderAdd: { color: 'text-amber-500 dark:text-amber-400' },
  Search: { color: 'text-blue-500 dark:text-blue-400' },
  Toc: { color: 'text-indigo-500 dark:text-indigo-400' },
  Document: { color: 'text-blue-500 dark:text-blue-400' },
  FileMarkdown: { color: 'text-blue-500 dark:text-blue-400' },
  FileCode: { color: 'text-purple-500 dark:text-purple-400' },
  FileTable: { color: 'text-emerald-500 dark:text-emerald-400' },
  Brain: { color: 'text-purple-600 dark:text-purple-400' },
  Library: { color: 'text-teal-600 dark:text-teal-400' },

  // [신규 — 2026-09-20 에디터/지식문서 전체 통합]
  Loading: { color: 'text-blue-500 dark:text-blue-400' },
  CheckCircle: { color: 'text-emerald-500 dark:text-emerald-400' },
  CheckSuccess: { color: 'text-emerald-600 dark:text-emerald-400' },
  Lock: { color: 'text-zinc-500 dark:text-zinc-400' },
  HardDrive: { color: 'text-slate-600 dark:text-zinc-400' },
  Bot: { color: 'text-purple-500 dark:text-purple-400' },
  UploadCloud: { color: 'text-blue-500 dark:text-blue-400' },
  GridView: { color: 'text-indigo-500 dark:text-indigo-400' },
  SortUpDown: { color: 'text-zinc-500 dark:text-zinc-400' },
  Hash: { color: 'text-violet-500 dark:text-violet-400' },
  Cut: { color: 'text-rose-500 dark:text-rose-400' },
  FolderTree: { color: 'text-amber-500 dark:text-amber-400' },
  ClipboardPaste: { color: 'text-teal-600 dark:text-teal-400' },
  RotateCw: { color: 'text-blue-500 dark:text-blue-400' },
  FolderInput: { color: 'text-indigo-500 dark:text-indigo-400' },
  Undo2: { color: 'text-teal-500 dark:text-teal-400' },
  Pencil: { color: 'text-blue-500 dark:text-blue-400' },
  FolderSync: { color: 'text-blue-500 dark:text-blue-400' },
  Command: { color: 'text-slate-600 dark:text-zinc-400' },
  KeyRound: { color: 'text-amber-600 dark:text-amber-400' },
  TypeIcon: { color: 'text-zinc-600 dark:text-zinc-400' },
  Braces: { color: 'text-violet-600 dark:text-violet-400' },
  RotateCcw: { color: 'text-zinc-500 dark:text-zinc-400' },
  User: { color: 'text-blue-600 dark:text-blue-400' },
  Mail: { color: 'text-teal-600 dark:text-teal-400' },
  Shield: { color: 'text-emerald-600 dark:text-emerald-400' },
  Paperclip: { color: 'text-zinc-500 dark:text-zinc-400' },
  Plus: { color: 'text-blue-600 dark:text-blue-400' },
  SidebarToggle: { color: 'text-zinc-600 dark:text-zinc-400' },
  FileJson: { color: 'text-amber-600 dark:text-amber-400' },
  FileType: { color: 'text-zinc-500 dark:text-zinc-400' },
  FileGeneric: { color: 'text-zinc-500 dark:text-zinc-400' },
};

