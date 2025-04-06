// Drag and drop handlers for format editor elements

// Header format drag and drop handlers
export const createHeaderDragHandlers = (headerFormat, setHeaderFormat) => {
  const headerDragItem = { current: null };
  const headerDragOverItem = { current: null };

  const handleHeaderDragStart = (e, index) => {
    headerDragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.6';
  };
  
  const handleHeaderDragEnter = (e, index) => {
    headerDragOverItem.current = index;
    e.preventDefault();
    const currentItems = document.querySelectorAll('.header-format-item');
    if (currentItems[index]) {
      currentItems[index].style.borderTop = '2px solid #1976d2';
    }
  };
  
  const handleHeaderDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleHeaderDragLeave = (e, index) => {
    e.preventDefault();
    const currentItems = document.querySelectorAll('.header-format-item');
    if (currentItems[index]) {
      currentItems[index].style.borderTop = '';
    }
  };
  
  const handleHeaderDrop = (e) => {
    e.preventDefault();
    const copyItems = [...headerFormat];
    const dragItemValue = copyItems[headerDragItem.current];
    copyItems.splice(headerDragItem.current, 1);
    copyItems.splice(headerDragOverItem.current, 0, dragItemValue);
    headerDragItem.current = null;
    headerDragOverItem.current = null;
    setHeaderFormat(copyItems);
    
    // Reset all item styles
    const currentItems = document.querySelectorAll('.header-format-item');
    currentItems.forEach(item => {
      item.style.borderTop = '';
      item.style.opacity = '1';
    });
  };
  
  const handleHeaderDragEnd = (e) => {
    e.target.style.opacity = '1';
    // Reset all item styles
    const currentItems = document.querySelectorAll('.header-format-item');
    currentItems.forEach(item => {
      item.style.borderTop = '';
    });
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

// Drug format drag and drop handlers
export const createDrugDragHandlers = (drugFormat, setDrugFormat) => {
  const drugDragItem = { current: null };
  const drugDragOverItem = { current: null };

  const handleDrugDragStart = (e, index) => {
    drugDragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.6';
  };
  
  const handleDrugDragEnter = (e, index) => {
    drugDragOverItem.current = index;
    e.preventDefault();
    const currentItems = document.querySelectorAll('.drug-format-item');
    if (currentItems[index]) {
      currentItems[index].style.borderTop = '2px solid #1976d2';
    }
  };
  
  const handleDrugDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrugDragLeave = (e, index) => {
    e.preventDefault();
    const currentItems = document.querySelectorAll('.drug-format-item');
    if (currentItems[index]) {
      currentItems[index].style.borderTop = '';
    }
  };
  
  const handleDrugDrop = (e) => {
    e.preventDefault();
    const copyItems = [...drugFormat];
    const dragItemValue = copyItems[drugDragItem.current];
    copyItems.splice(drugDragItem.current, 1);
    copyItems.splice(drugDragOverItem.current, 0, dragItemValue);
    drugDragItem.current = null;
    drugDragOverItem.current = null;
    setDrugFormat(copyItems);
    
    // Reset all item styles
    const currentItems = document.querySelectorAll('.drug-format-item');
    currentItems.forEach(item => {
      item.style.borderTop = '';
      item.style.opacity = '1';
    });
  };
  
  const handleDrugDragEnd = (e) => {
    e.target.style.opacity = '1';
    // Reset all item styles
    const currentItems = document.querySelectorAll('.drug-format-item');
    currentItems.forEach(item => {
      item.style.borderTop = '';
    });
  };

  return {
    handleDrugDragStart,
    handleDrugDragEnter,
    handleDrugDragOver,
    handleDrugDragLeave,
    handleDrugDrop,
    handleDrugDragEnd
  };
}; 