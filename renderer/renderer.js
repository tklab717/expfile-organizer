// UI要素の参照
const equipmentInput = document.getElementById('equipmentInput');
const sequenceInput = document.getElementById('sequenceInput');
const taskInput = document.getElementById('taskInput');
const dateInput = document.getElementById('dateInput');
const selectFilesBtn = document.getElementById('selectFilesBtn');
const selectedFilesDisplay = document.getElementById('selectedFiles');
const moveBtn = document.getElementById('moveBtn');
const resultMsg = document.getElementById('resultMsg');
const srcFiles =document.getElementById('srcFiles')

// ファイル選択
let selectedFilePaths = [];

selectFilesBtn.addEventListener('click', async () => {
  selectedFilePaths = await window.electronAPI.selectFiles();
  srcFiles.textContent = selectedFilePaths.join('\n');
});

// ファイル移動リクエスト送信
moveBtn.addEventListener('click', async () => {
  const equipment = equipmentInput.value.trim();
  const sequence = sequenceInput.value.trim();
  const task = taskInput.value.trim();
  const selectedDate = dateInput.value;

  if (!equipment || !sequence || !task || selectedFilePaths.length === 0) {
    resultMsg.textContent = 'すべての項目を入力し、ファイルを選択してください。';
    return;
  }

  const response = await window.electronAPI.moveFiles({
    equipment,
    sequence,
    task,
    selectedDate,
    files: selectedFilePaths,
  });

  if (response.success) {
    resultMsg.textContent =`✅ ${response.movedCount} 件のファイルを移動しました`;

    // ✅ 入力状態をクリア
    srcFiles.textContent =''; 
    selectedFilePaths = []; 
  } else {
    resultMsg.textContent =`❌ 移動に失敗しました: ${response.error}`;
  }
});

// datalist に候補を反映
function populateDatalist(id, options) {
  const datalist = document.getElementById(id);
  datalist.innerHTML = '';
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    datalist.appendChild(option);
  });
}

// アプリ起動時に設備候補を取得
window.addEventListener('DOMContentLoaded', async () => {
  const basePath = await window.electronAPI.getBaseFolder();
  console.log('ベースフォルダ:', basePath);
  const equipmentList = await window.electronAPI.getEquipments();
  const taskList = await window.electronAPI.getTasks();
  populateDatalist('equipmentList', equipmentList);
  populateDatalist('taskList', taskList);
  
});

// 設備選択後に対応シーケンスを取得
equipmentInput.addEventListener('change', async () => {
  const name = equipmentInput.value;
  if (name) {
    const sequences = await window.electronAPI.getSequences(name);
    populateDatalist('sequenceList', sequences);
  }
});

// タスク選択後に日付候補を取得
taskInput.addEventListener('change', () => {
  const equipment = document.getElementById('equipmentInput').value;
  const sequence = document.getElementById('sequenceInput').value;
  const task = document.getElementById('taskInput').value;

  if (equipment && sequence && task) {
    setupDateAutocomplete(equipment, sequence, task);
  }
});

dateInput.addEventListener('change', () => {
  const equipment = document.getElementById('equipmentInput').value;
  const sequence = document.getElementById('sequenceInput').value;
  const task = document.getElementById('taskInput').value;

  if (equipment && sequence && task) {
    setupDateAutocomplete(equipment, sequence, task);
  }
});



// window.electronAPI.getExistingDates({ equipment, sequence, task }) を呼び出して候補を取得
async function setupDateAutocomplete(equipment, sequence, task) {
  try {
    const markedDates = await window.electronAPI.getExistingDates({ equipment, sequence, task });
    const datalist = document.getElementById('dateList');
    datalist.innerHTML = ''; // 既存の候補をクリア

    markedDates.forEach(date => {
      const option = document.createElement('option');
      option.value = date;
      datalist.appendChild(option);
    });
  } catch (err) {
    console.error('日付候補の取得に失敗しました:', err);
  }
}