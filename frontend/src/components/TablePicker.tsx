import React, { useState } from 'react';

interface TablePickerProps {
  onSelect: (rows: number, cols: number) => void;
  isDarkMode: boolean;
  onClose: () => void;
}

// ====================================================================
// 📊 [OMD-EDIT-TablePicker-0002] TablePicker ➔ TablePicker
// 🎯 @KICK  : 표 크기 선택 드롭다운 컴포넌트 - 10x10 그리드 렌더링 및 사용자 인터랙션 처리
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : handleSelect
// ====================================================================
export default function TablePicker({ onSelect, isDarkMode, onClose }: TablePickerProps) {
  const [hoveredRow, setHoveredRow] = useState(-1);
  const [hoveredCol, setHoveredCol] = useState(-1);

  const maxRows = 10;
  const maxCols = 10;

// ====================================================================
// 📊 [OMD-EDIT-TablePicker-0001] TablePicker ➔ handleSelect
// 🎯 @KICK  : hovered 행/열을 1-indexed로 변환하여 onSelect 콜백 호출 후 드롭다운 닫기
// 🛡️ @GUARD : hoveredRow >= 0 && hoveredCol >= 0 조건 검증
// 🚨 @PATCH : 없음
// 🔗 @CALLS : onSelect, onClose
// ====================================================================
  const handleSelect = () => {
    if (hoveredRow >= 0 && hoveredCol >= 0) {
      onSelect(hoveredRow + 1, hoveredCol + 1);
      onClose();
    }
  };

  return (
    <div 
      className={`absolute z-50 mt-2 p-3 rounded-xl border shadow-xl animate-in fade-in zoom-in-95 duration-200 ${
        isDarkMode ? 'bg-[#252526] border-[#333]' : 'bg-white border-gray-200'
      }`}
      onMouseLeave={() => { setHoveredRow(-1); setHoveredCol(-1); }}
    >
      <div className="flex flex-col gap-1">
        {Array.from({ length: maxRows }).map((_, rIndex) => (
          <div key={rIndex} className="flex gap-1">
            {Array.from({ length: maxCols }).map((_, cIndex) => {
              const isHighlighted = rIndex <= hoveredRow && cIndex <= hoveredCol;
              return (
                <button
                  key={`${rIndex}-${cIndex}`}
                  className={`w-5 h-5 rounded-sm border ${
                    isHighlighted 
                      ? (isDarkMode ? 'bg-blue-500/50 border-blue-400' : 'bg-blue-200 border-blue-400') 
                      : (isDarkMode ? 'bg-[#1e1e1e] border-[#444]' : 'bg-gray-50 border-gray-200')
                  }`}
                  onMouseEnter={() => { setHoveredRow(rIndex); setHoveredCol(cIndex); }}
                  onClick={handleSelect}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className={`mt-2 text-center text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {hoveredRow >= 0 && hoveredCol >= 0 ? `${hoveredRow + 1} x ${hoveredCol + 1}` : '표 삽입'}
      </div>
    </div>
  );
}
