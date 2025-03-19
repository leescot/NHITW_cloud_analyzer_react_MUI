// 從 URL 獲取藥品代碼
const urlParams = new URLSearchParams(window.location.search);
const drugCode = urlParams.get('code');

// 獲取 DOM 元素
const drugInfoElement = document.getElementById('drug-info');
const galleryElement = document.getElementById('gallery');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const noImagesElement = document.getElementById('no-images');
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');

// 如果沒有藥品代碼，顯示錯誤
if (!drugCode) {
  loadingElement.style.display = 'none';
  errorElement.textContent = '未提供藥品代碼';
  errorElement.style.display = 'block';
} else {
  // 獲取藥品數據
  fetchDrugData(drugCode);
}

// 獲取藥品數據的函數
async function fetchDrugData(code) {
  try {
    const response = await fetch(`https://drugtw.com/api/drugs?q=${code}`);
    if (!response.ok) {
      throw new Error('無法獲取藥品數據');
    }
    
    const data = await response.json();
    
    // 隱藏載入提示
    loadingElement.style.display = 'none';
    
    // 處理數據
    if (data && data.drug_table && data.drug_table.length > 0) {
      const drug = data.drug_table[0];
      
      // 顯示藥品信息
      drugInfoElement.innerHTML = `
        <p class="drug-name">${drug.chi_name || ''}</p>
        <p>${drug.drug_name || ''}</p>
        <p>成分: ${drug.ingredient || ''}</p>
        <p>適應症: ${drug.indication || ''}</p>
        <p>許可證字號: ${drug.url_license ? `<a href="${drug.url_license}" target="_blank">${drug.license_code || ''}</a>` : drug.license_code || ''}</p>
      `;
      
      // 顯示藥品圖片
      if (drug.fig && drug.fig.length > 0) {
        drug.fig.forEach((imgUrl, index) => {
          const sourceName = drug.src_name && drug.src_name[index] ? drug.src_name[index] : '';
          const sourceUrl = drug.url_drug && drug.url_drug[index] ? drug.url_drug[index] : '';
          
          const galleryItem = document.createElement('div');
          galleryItem.className = 'gallery-item';
          
          const img = document.createElement('img');
          img.src = imgUrl;
          img.alt = drug.chi_name || '藥品圖片';
          img.onclick = function() {
            openModal(imgUrl);
          };
          
          galleryItem.appendChild(img);
          
          if (sourceName) {
            const sourceElement = document.createElement('div');
            sourceElement.className = 'source-name';
            
            if (sourceUrl) {
              const sourceLink = document.createElement('a');
              sourceLink.href = sourceUrl;
              sourceLink.target = '_blank';
              sourceLink.textContent = sourceName;
              sourceElement.appendChild(sourceLink);
            } else {
              sourceElement.textContent = sourceName;
            }
            
            galleryItem.appendChild(sourceElement);
          }
          
          galleryElement.appendChild(galleryItem);
        });
      } else {
        noImagesElement.style.display = 'block';
      }
    } else {
      noImagesElement.style.display = 'block';
    }
  } catch (error) {
    loadingElement.style.display = 'none';
    errorElement.textContent = `錯誤: ${error.message}`;
    errorElement.style.display = 'block';
  }
}

// 打開模態框
function openModal(imgUrl) {
  modal.style.display = 'block';
  modalImg.src = imgUrl;
}

// 關閉模態框
function closeModal() {
  modal.style.display = 'none';
}

// 為關閉按鈕添加事件監聽器
document.getElementById('closeModalBtn').addEventListener('click', closeModal);

// 點擊模態框外部關閉
window.onclick = function(event) {
  if (event.target === modal) {
    closeModal();
  }
};
