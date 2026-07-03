// 通用拖放處理器(階段5 Task 5) —— header 與 item 兩個區塊共用同一套實作。
//
// 行為取捨：medicationCopyFormat/dragDropHandlers.js 用 `{ current: null }` 物件 + 直接操作
// inline style(e.target.style.opacity / borderTop)、並以 `document.querySelectorAll('.header-format-item')`
// 這類寫死的 CSS class selector 找出所有同類元素來重設樣式；
// labCopyFormat/dragDropHandlers.js 改用一般變數(閉包)+ CSS class(`dragging` / `drag-over`)切換，
// 且額外呼叫了 `e.dataTransfer.setData('text/html', ...)`。
// 兩者對「拖曳排序」這個核心行為完全等價(都是 splice 移除來源、插入目的地、setElements)，
// 差異只在視覺回饋的實作方式。選擇 lab 版本作為通用實作，理由：
//   1. 不依賴呼叫端傳入的 formatClass 字串跟這裡寫死的 selector 對應(醫療/檢驗兩種呼叫端
//      的 formatClass 命名不同，繼續用 querySelectorAll('.header-format-item') 這種寫法
//      無法泛化成同一份共用程式碼)。
//   2. 只操作 e.target 本身，不需要知道其他元素的 DOM 結構，更適合抽成通用工具。
// 二選一之後，兩個呼叫端(header / item)不再需要各自的 handleHeaderXxx / handleDrugXxx 或
// handleItemXxx 命名 —— 直接共用同一個 handler 名稱集合(handleDragStart 等)，
// 消費端（Task 6）呼叫兩次 createDragHandlers 即可，不需要再做一層改名包裝。

/**
 * 建立一組拖放處理函數，可套用在 header 或 item(drug/lab)格式清單上。
 * @param {Array} elements - 目前的元素陣列
 * @param {Function} setElements - 更新元素陣列的函數
 * @returns {{
 *   handleDragStart: Function,
 *   handleDragEnter: Function,
 *   handleDragOver: Function,
 *   handleDragLeave: Function,
 *   handleDrop: Function,
 *   handleDragEnd: Function
 * }}
 */
export const createDragHandlers = (elements, setElements) => {
  let dragItem = null;
  let dragOverItem = null;

  // 開始拖曳
  const handleDragStart = (e, index) => {
    dragItem = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.classList.add('dragging');
  };

  // 拖曳進入
  const handleDragEnter = (e, index) => {
    dragOverItem = index;
    e.target.classList.add('drag-over');
  };

  // 拖曳經過
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 拖曳離開
  const handleDragLeave = (e) => {
    dragOverItem = null;
    e.target.classList.remove('drag-over');
  };

  // 放下
  const handleDrop = (e) => {
    e.preventDefault();

    if (dragItem !== null && dragOverItem !== null && dragItem !== dragOverItem) {
      const itemsCopy = [...elements];
      const dragItemContent = itemsCopy[dragItem];

      // 從原位置移除並插入到目標位置
      itemsCopy.splice(dragItem, 1);
      itemsCopy.splice(dragOverItem, 0, dragItemContent);

      setElements(itemsCopy);
    }

    e.target.classList.remove('drag-over');
    dragItem = null;
    dragOverItem = null;
  };

  // 拖曳結束
  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    dragItem = null;
    dragOverItem = null;
  };

  return {
    handleDragStart,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
};
