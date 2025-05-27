// Drag and drop handlers for format editor elements

/**
 * 創建標題格式的拖放處理函式
 * @param {Array} elements - 當前的元素陣列
 * @param {Function} setElements - 更新元素陣列的函式
 * @returns {Object} 包含所有拖放處理函式的物件
 */
export const createHeaderLabHandlers = (elements, setElements) => {
  let dragItem = null;
  let dragOverItem = null;

  // 開始拖曳
  const handleHeaderDragStart = (e, index) => {
    dragItem = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.classList.add('dragging');
  };

  // 拖曳進入
  const handleHeaderDragEnter = (e, index) => {
    dragOverItem = index;
    e.target.classList.add('drag-over');
  };

  // 拖曳經過
  const handleHeaderDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 拖曳離開
  const handleHeaderDragLeave = (e, index) => {
    dragOverItem = null;
    e.target.classList.remove('drag-over');
  };

  // 放下
  const handleHeaderDrop = (e) => {
    e.preventDefault();
    
    if (dragItem !== null && dragOverItem !== null && dragItem !== dragOverItem) {
      const itemsCopy = [...elements];
      const dragItemContent = itemsCopy[dragItem];
      
      // 從原位置移除並插入到目標位置
      itemsCopy.splice(dragItem, 1);
      itemsCopy.splice(dragOverItem, 0, dragItemContent);
      
      // 更新狀態
      setElements(itemsCopy);
    }
    
    // 重設
    e.target.classList.remove('drag-over');
    dragItem = null;
    dragOverItem = null;
  };

  // 拖曳結束
  const handleHeaderDragEnd = (e) => {
    e.target.classList.remove('dragging');
    dragItem = null;
    dragOverItem = null;
  };

  return {
    handleHeaderDragStart,
    handleHeaderDragEnter,
    handleHeaderDragOver,
    handleHeaderDragLeave,
    handleHeaderDrop,
    handleHeaderDragEnd
  };
};

/**
 * 創建檢驗項目格式的拖放處理函式
 * @param {Array} elements - 當前的元素陣列
 * @param {Function} setElements - 更新元素陣列的函式
 * @returns {Object} 包含所有拖放處理函式的物件
 */
export const createItemLabHandlers = (elements, setElements) => {
  let dragItem = null;
  let dragOverItem = null;

  // 開始拖曳
  const handleItemDragStart = (e, index) => {
    dragItem = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.classList.add('dragging');
  };

  // 拖曳進入
  const handleItemDragEnter = (e, index) => {
    dragOverItem = index;
    e.target.classList.add('drag-over');
  };

  // 拖曳經過
  const handleItemDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 拖曳離開
  const handleItemDragLeave = (e, index) => {
    dragOverItem = null;
    e.target.classList.remove('drag-over');
  };

  // 放下
  const handleItemDrop = (e) => {
    e.preventDefault();
    
    if (dragItem !== null && dragOverItem !== null && dragItem !== dragOverItem) {
      const itemsCopy = [...elements];
      const dragItemContent = itemsCopy[dragItem];
      
      // 從原位置移除並插入到目標位置
      itemsCopy.splice(dragItem, 1);
      itemsCopy.splice(dragOverItem, 0, dragItemContent);
      
      // 更新狀態
      setElements(itemsCopy);
    }
    
    // 重設
    e.target.classList.remove('drag-over');
    dragItem = null;
    dragOverItem = null;
  };

  // 拖曳結束
  const handleItemDragEnd = (e) => {
    e.target.classList.remove('dragging');
    dragItem = null;
    dragOverItem = null;
  };

  return {
    handleItemDragStart,
    handleItemDragEnter,
    handleItemDragOver,
    handleItemDragLeave,
    handleItemDrop,
    handleItemDragEnd
  };
}; 