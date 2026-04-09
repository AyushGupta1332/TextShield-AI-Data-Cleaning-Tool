let dataset = [];
let columns = [];
let chartInstance = null;
let currentFileName = "dataset";

// DOM Elements
const fileUpload = document.getElementById('file-upload');
const loadingIndicator = document.getElementById('loading-indicator');
const dashboard = document.getElementById('dashboard');
const alertContainer = document.getElementById('alert-container');

// General Info Elements
const rowsCountEl = document.getElementById('rows-count');
const colsCountEl = document.getElementById('cols-count');
const dupInfoEl = document.getElementById('duplicates-info');

// Tables
const previewThead = document.getElementById('preview-thead');
const previewTbody = document.getElementById('preview-tbody');
const summaryTbody = document.getElementById('summary-tbody');
const missingTbody = document.getElementById('missing-tbody');

// Selects
const imputeColSelect = document.getElementById('impute-col-select');
const opColSelect = document.getElementById('op-col-select');
const vizColSelect = document.getElementById('viz-col-select');
const imputeStrategy = document.getElementById('impute-strategy');
const imputeCustomDiv = document.getElementById('impute-custom-div');

// Set up UI Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fileUpload.addEventListener('change', handleFileUpload);
    
    document.getElementById('btn-remove-duplicates').addEventListener('click', removeDuplicates);
    document.getElementById('btn-remove-missing-rows').addEventListener('click', removeRowsWithMissing);
    
    imputeStrategy.addEventListener('change', (e) => {
        if (e.target.value === 'custom') imputeCustomDiv.classList.remove('hidden');
        else imputeCustomDiv.classList.add('hidden');
    });
    
    document.getElementById('btn-impute').addEventListener('click', imputeMissingValues);
    
    document.getElementById('btn-drop-col').addEventListener('click', dropColumn);
    document.getElementById('btn-rename-col').addEventListener('click', renameColumn);
    document.getElementById('btn-type-col').addEventListener('click', castColumn);
    document.getElementById('btn-norm-col').addEventListener('click', () => scaleColumn('normalize'));
    document.getElementById('btn-std-col').addEventListener('click', () => scaleColumn('standardize'));
    
    document.getElementById('btn-draw-chart').addEventListener('click', drawChart);
    
    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-export-excel').addEventListener('click', exportExcel);
    document.getElementById('btn-export-json').addEventListener('click', exportJSON);
    document.getElementById('btn-replace-text').addEventListener('click', replaceText);
    document.getElementById('search-input').addEventListener('input', (e) => renderPreview(e.target.value));
    
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) undoBtn.addEventListener('click', undoAction);
});

function showAlert(msg, type='info') {
    alertContainer.innerText = msg;
    alertContainer.className = `mb-6 p-4 rounded-xl text-sm font-medium border animate-fade-in ${type === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'}`;
    alertContainer.classList.remove('hidden');
    setTimeout(() => { alertContainer.classList.add('hidden'); }, 5000);
}

function showLoading(show) {
    if (show) loadingIndicator.classList.remove('hidden');
    else loadingIndicator.classList.add('hidden');
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    currentFileName = file.name.split('.')[0];
    historyStack = [];
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        undoBtn.disabled = true;
        undoBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    showLoading(true);
    dashboard.classList.add('hidden');
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'csv') {
        let chunkedData = [];
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            worker: true,
            chunk: function(results) {
                if (results.data && results.data.length > 0) {
                    // Use a simple loop or chunked push to avoid call stack limits on huge arrays
                    for (let i = 0; i < results.data.length; i++) {
                        chunkedData.push(results.data[i]);
                    }
                }
            },
            complete: function() {
                dataset = chunkedData;
                columns = dataset.length > 0 ? Object.keys(dataset[0] || {}) : [];
                showLoading(false);
                if (dataset.length > 0) renderAll();
                else showAlert('CSV file is empty or invalid', 'error');
            },
            error: function(err) {
                showLoading(false);
                showAlert('Error parsing CSV: ' + err.message, 'error');
            }
        });
    } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                dataset = XLSX.utils.sheet_to_json(worksheet, {defval: null});
                if (dataset.length > 0) {
                    columns = Object.keys(dataset[0] || {});
                    showLoading(false);
                    renderAll();
                } else {
                    showLoading(false);
                    showAlert('Excel file is empty or invalid', 'error');
                }
            } catch (err) {
                showLoading(false);
                showAlert('Error reading Excel: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        showLoading(false);
        showAlert('Unsupported file format', 'error');
    }
}

function renderAll() {
    try {
        if (!dataset || dataset.length === 0) return;
        
        dashboard.classList.remove('hidden');
        
        rowsCountEl.innerText = dataset.length;
        colsCountEl.innerText = columns.length;
        
        // Calculate health score
        let totalCells = dataset.length * columns.length;
        let emptyCells = 0;
        dataset.forEach(row => {
            columns.forEach(col => { if(row[col] === null || row[col] === undefined || row[col] === '') emptyCells++; });
        });
        const missingPct = totalCells === 0 ? 0 : ((emptyCells / totalCells) * 100);
        const health = (100 - missingPct).toFixed(1);
        
        const healthEl = document.getElementById('health-score');
        healthEl.innerHTML = `<span class="w-2 h-2 rounded-full ${health > 90 ? 'bg-emerald-500' : (health > 70 ? 'bg-orange-500' : 'bg-red-500')} animate-pulse-slow"></span> Data Health: ${health}%`;
        healthEl.classList.remove('hidden');
        
        const undoBtn = document.getElementById('btn-undo');
        if (undoBtn) undoBtn.classList.remove('hidden');
        
        updateDuplicatesInfo();
        renderPreview();
        renderSummaryAndMissing();
        updateSelectOptions();
        
        showAlert('Dataset updated successfully!', 'info');
    } catch (e) {
        console.error(e);
        showAlert('Error during rendering: ' + e.message, 'error');
    }
}

function updateSelectOptions() {
    const opts = columns.map(c => `<option value="${c}">${c}</option>`).join('');
    imputeColSelect.innerHTML = opts;
    opColSelect.innerHTML = opts;
    vizColSelect.innerHTML = opts;
}

function updateDuplicatesInfo() {
    const stringified = dataset.map(row => JSON.stringify(row));
    const unique = new Set(stringified);
    const duplicates = dataset.length - unique.size;
    dupInfoEl.innerHTML = `Found <span class="font-bold text-gray-800">${duplicates}</span> duplicate rows`;
}

function removeDuplicates() {
    saveState();
    const stringified = dataset.map(row => JSON.stringify(row));
    const unique = new Set();
    const newDataset = [];
    
    for (let i = 0; i < dataset.length; i++) {
        if (!unique.has(stringified[i])) {
            unique.add(stringified[i]);
            newDataset.push(dataset[i]);
        }
    }
    
    const removedCount = dataset.length - newDataset.length;
    dataset = newDataset;
    renderAll();
    showAlert(`Removed ${removedCount} duplicate rows.`);
}

function renderPreview(query = '') {
    // Render Header
    previewThead.innerHTML = `<tr>${columns.map(c => `<th class="table-th">${c}</th>`).join('')}</tr>`;
    
    // Render Body (Top 100)
    let filtered = dataset;
    if (query) {
        const q = query.toLowerCase();
        filtered = dataset.filter(row => columns.some(c => String(row[c] || '').toLowerCase().includes(q)));
    }
    const limit = Math.min(filtered.length, 100);
    let html = '';
    for (let i = 0; i < limit; i++) {
        const row = filtered[i];
        html += `<tr class="table-tr">`;
        columns.forEach(col => {
            let val = row[col];
            if (val === null || val === undefined || val === '') val = '<span class="text-slate-500 italic">null</span>';
            html += `<td class="table-td">${val}</td>`;
        });
        html += `</tr>`;
    }
    previewTbody.innerHTML = html;
}

function getColumnType(col) {
    let nonNullVals = [];
    for (let r of dataset) {
        let v = r[col];
        if (v !== null && v !== undefined && v !== '') nonNullVals.push(v);
    }
    
    if (nonNullVals.length === 0) return 'empty';
    
    const isNumeric = nonNullVals.every(v => !isNaN(Number(v)) && typeof v !== 'boolean');
    if (isNumeric) return 'numeric';
    
    const isDate = nonNullVals.every(v => !isNaN(Date.parse(v)) && isNaN(Number(v)) ); // basic check
    if (isDate) return 'datetime';
    
    const unique = new Set(nonNullVals).size;
    if (unique < nonNullVals.length * 0.2 && unique < 50) return 'categorical';
    
    return 'text';
}

function renderSummaryAndMissing() {
    let summaryHtml = '';
    let missingHtml = '';
    
    columns.forEach(col => {
        // Missing Calculation
        let missingCount = 0;
        dataset.forEach(row => {
            let v = row[col];
            if (v === null || v === undefined || v === '') missingCount++;
        });
        let missingPct = ((missingCount / dataset.length) * 100).toFixed(2);
        
        missingHtml += `
            <tr class="table-tr">
                <td class="table-td-strong">${col}</td>
                <td class="table-td ${missingCount > 0 ? 'text-rose-400 font-bold' : ''}">${missingCount}</td>
                <td class="table-td ${missingCount > 0 ? 'text-rose-400 font-bold' : ''}">${missingPct}%</td>
            </tr>
        `;
        
        // Summary Calc
        let type = getColumnType(col);
        let min='N/A', max='N/A', mean='N/A';
        
        if (type === 'numeric') {
            let vals = [];
            dataset.forEach(row => {
                let v = row[col];
                if (v !== null && v !== undefined && v !== '') vals.push(Number(v));
            });
            if (vals.length > 0) {
                min = ss.min(vals);
                min = min % 1 === 0 ? min : min.toFixed(2);
                let tmpMax = ss.max(vals); max = tmpMax % 1 === 0 ? tmpMax : tmpMax.toFixed(2);
                let tmpMean = ss.mean(vals); mean = tmpMean % 1 === 0 ? tmpMean : tmpMean.toFixed(2);
            }
        }
        
        summaryHtml += `
            <tr class="table-tr">
                <td class="table-td-strong">${col}</td>
                <td class="table-td"><span class="badge-code">${type}</span></td>
                <td class="table-td font-mono text-xs">${min}</td>
                <td class="table-td font-mono text-xs">${max}</td>
                <td class="table-td font-mono text-xs">${mean}</td>
            </tr>
        `;
    });
    
    summaryTbody.innerHTML = summaryHtml;
    missingTbody.innerHTML = missingHtml;
}

let historyStack = [];
const MAX_HISTORY = 5;

function saveState() {
    // Prevent browser crash for excessively large datasets
    if (dataset.length > 150000) {
        return;
    }
    if (historyStack.length >= MAX_HISTORY) historyStack.shift();
    historyStack.push({
        dataset: JSON.parse(JSON.stringify(dataset)),
        columns: JSON.parse(JSON.stringify(columns))
    });
    
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        undoBtn.disabled = false;
        undoBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function undoAction() {
    if (historyStack.length === 0) return;
    const prevState = historyStack.pop();
    dataset = prevState.dataset;
    columns = prevState.columns;
    renderAll();
    showAlert('Reverted last action.', 'info');
    
    const undoBtn = document.getElementById('btn-undo');
    if (historyStack.length === 0 && undoBtn) {
        undoBtn.disabled = true;
        undoBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// Data Manipulations
function removeRowsWithMissing() {
    saveState();
    const beforeStats = dataset.length;
    dataset = dataset.filter(row => {
        return columns.every(col => {
            const v = row[col];
            return v !== null && v !== undefined && v !== '';
        });
    });
    renderAll();
    showAlert(`Removed ${beforeStats - dataset.length} rows with missing values.`);
}

function imputeMissingValues() {
    saveState();
    const col = imputeColSelect.value;
    const strategy = imputeStrategy.value;
    let fillValue;
    
    let vals = [];
    dataset.forEach(row => {
        let v = row[col];
        if (v !== null && v !== undefined && v !== '') vals.push(v);
    });
    
    if (strategy === 'mode') {
        const counts = {};
        let maxCount = 0;
        let mode = vals[0];
        vals.forEach(v => {
            counts[v] = (counts[v] || 0) + 1;
            if (counts[v] > maxCount) { maxCount = counts[v]; mode = v; }
        });
        fillValue = mode;
    } else if (strategy === 'custom') {
        fillValue = document.getElementById('impute-custom-val').value;
    } else {
        // numeric strategies
        let numVals = vals.map(v => Number(v)).filter(v => !isNaN(v));
        if (numVals.length === 0) return showAlert(`Cannot calculate ${strategy} on non-numeric column.`, 'error');
        if (strategy === 'mean') fillValue = ss.mean(numVals);
        if (strategy === 'median') fillValue = ss.median(numVals);
    }
    
    let imputedCount = 0;
    dataset.forEach(row => {
        let v = row[col];
        if (v === null || v === undefined || v === '') {
            row[col] = fillValue;
            imputedCount++;
        }
    });
    
    renderAll();
    showAlert(`Filled ${imputedCount} missing values in ${col} using ${strategy} strategy (Value used: ${fillValue}).`);
}

function dropColumn() {
    saveState();
    const col = opColSelect.value;
    columns = columns.filter(c => c !== col);
    dataset.forEach(row => { delete row[col]; });
    renderAll();
    showAlert(`Dropped column ${col}.`);
}

function renameColumn() {
    const oldCol = opColSelect.value;
    const newCol = document.getElementById('op-rename-val').value.trim();
    if (!newCol) return showAlert('Provide a valid new column name', 'error');
    if (columns.includes(newCol)) return showAlert('Target column already exists', 'error');
    
    saveState();
    
    const idx = columns.indexOf(oldCol);
    columns[idx] = newCol;
    
    dataset.forEach(row => {
        row[newCol] = row[oldCol];
        delete row[oldCol];
    });
    
    document.getElementById('op-rename-val').value = '';
    renderAll();
    showAlert(`Renamed column ${oldCol} to ${newCol}.`);
}

function castColumn() {
    saveState();
    const col = opColSelect.value;
    const type = document.getElementById('op-type-select').value;
    
    dataset.forEach(row => {
        let v = row[col];
        if (v !== null && v !== undefined && v !== '') {
            if (type === 'numeric') row[col] = Number(v);
            else if (type === 'categorical') row[col] = String(v);
        }
    });
    
    renderAll();
    showAlert(`Converted column ${col} to ${type}.`);
}

function scaleColumn(method) {
    const col = opColSelect.value;
    let type = getColumnType(col);
    if (type !== 'numeric') return showAlert('Normalization/Standardization can only be applied to numeric columns.', 'error');
    
    saveState();
    
    let vals = dataset.map(row => Number(row[col])).filter(v => !isNaN(v));
    const min = ss.min(vals);
    const max = ss.max(vals);
    const mean = ss.mean(vals);
    const std = ss.standardDeviation(vals);
    
    dataset.forEach(row => {
        let v = Number(row[col]);
        if (!isNaN(v) && v !== null && row[col] !== '') {
            if (method === 'normalize') {
                row[col] = max === min ? 0 : (v - min) / (max - min);
            } else if (method === 'standardize') {
                row[col] = std === 0 ? 0 : (v - mean) / std;
            }
        }
    });
    
    renderAll();
    showAlert(`Applied ${method} to column ${col}.`);
}

function replaceText() {
    const col = opColSelect.value;
    const findVal = document.getElementById('op-replace-find').value;
    const replaceVal = document.getElementById('op-replace-with').value;
    
    if (!findVal) return showAlert('Provide a value to find', 'error');
    
    saveState();
    
    let regex;
    try {
        regex = new RegExp(findVal, 'g');
    } catch(e) {
        regex = findVal;
    }
    
    let count = 0;
    dataset.forEach(row => {
        let v = row[col];
        if (v !== null && v !== undefined) {
            let strV = String(v);
            if (strV.includes(findVal) || (typeof regex !== 'string' && regex.test(strV))) {
                row[col] = strV.replace(regex, replaceVal);
                count++;
            }
        }
    });
    
    renderAll();
    showAlert(`Replaced text in ${count} rows of column ${col}.`);
}

// Visualization
function drawChart() {
    const col = vizColSelect.value;
    const type = document.getElementById('viz-type-select').value;
    
    const canvas = document.getElementById('chart-canvas');
    const ctx = canvas.getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    let vals = dataset.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
    
    if (type === 'hostname') { /* ignore */ }
    
    if (type === 'histogram') {
        let numVals = vals.map(v => Number(v)).filter(v => !isNaN(v));
        if (numVals.length === 0) return showAlert('Cannot draw histogram for non-numeric data', 'error');
        
        const min = ss.min(numVals);
        const max = ss.max(numVals);
        const binCount = Math.ceil(Math.sqrt(numVals.length));
        const binWidth = (max - min) / binCount;
        
        let bins = Array(binCount).fill(0);
        let binLabels = Array(binCount).fill('');
        
        for (let i = 0; i < binCount; i++) {
            binLabels[i] = `${(min + i * binWidth).toFixed(2)} - ${(min + (i + 1) * binWidth).toFixed(2)}`;
        }
        
        numVals.forEach(v => {
            let binIdx = Math.floor((v - min) / binWidth);
            if (binIdx >= binCount) binIdx = binCount - 1;
            bins[binIdx]++;
        });
        
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: `Histogram of ${col}`,
                    data: bins,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0
                }]
            },
            options: { scales: { x: { display: false } } } // seamless histogram
        });
        
    } else if (type === 'bar') {
        const counts = {};
        vals.forEach(v => counts[v] = (counts[v] || 0) + 1);
        
        const labels = Object.keys(counts);
        const data = Object.values(counts);
        
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Value Counts of ${col}`,
                    data: data,
                    backgroundColor: 'rgba(16, 185, 129, 0.5)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }]
            }
        });
        
    } else if (type === 'boxplot') {
        let numVals = vals.map(v => Number(v)).filter(v => !isNaN(v));
        if (numVals.length === 0) return showAlert('Cannot draw boxplot for non-numeric data', 'error');
        
        chartInstance = new Chart(ctx, {
            type: 'boxplot',
            data: {
                labels: [col],
                datasets: [{
                    label: col,
                    data: [numVals],
                    backgroundColor: 'rgba(245, 158, 11, 0.5)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 1,
                    itemRadius: 2
                }]
            }
        });
        
    } else if (type === 'heatmap') {
        const numCols = columns.filter(c => getColumnType(c) === 'numeric');
        if (numCols.length < 2) return showAlert('Need at least 2 numeric columns for correlation heatmap', 'error');
        
        // Calculate correlation matrix
        let data = [];
        for (let i = 0; i < numCols.length; i++) {
            for (let j = 0; j < numCols.length; j++) {
                let c1 = numCols[i], c2 = numCols[j];
                let xy = [];
                dataset.forEach(row => {
                    let v1 = Number(row[c1]), v2 = Number(row[c2]);
                    if (!isNaN(v1) && !isNaN(v2)) xy.push([v1, v2]);
                });
                let corr = 0;
                if (xy.length > 1) {
                    let corrVal = ss.sampleCorrelation(xy.map(p => p[0]), xy.map(p => p[1]));
                    corr = isNaN(corrVal) ? 0 : corrVal;
                }
                data.push({
                    x: c1,
                    y: c2,
                    v: corr
                });
            }
        }
        
        chartInstance = new Chart(ctx, {
            type: 'matrix',
            data: {
                datasets: [{
                    label: 'Correlation Heatmap',
                    data: data,
                    backgroundColor(context) {
                        const value = context.dataset.data[context.dataIndex].v;
                        const alpha = Math.abs(value); // transparency
                        return value < 0 ? `rgba(239, 68, 68, ${alpha})` : `rgba(16, 185, 129, ${alpha})`;
                    },
                    width: ({chart}) => (chart.chartArea || {}).width / numCols.length - 1,
                    height: ({chart}) => (chart.chartArea || {}).height / numCols.length - 1
                }]
            },
            options: {
                scales: {
                    x: { type: 'category', labels: numCols, ticks: { display: true } },
                    y: { type: 'category', labels: numCols, offset: true, ticks: { display: true } }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title() { return ''; },
                            label(context) {
                                const v = context.dataset.data[context.dataIndex];
                                return [`${v.x} & ${v.y}`, `Corr: ${v.v.toFixed(3)}`];
                            }
                        }
                    }
                }
            }
        });
    }
}

// Exports
function exportCSV() {
    if (dataset.length === 0) return;
    const csv = Papa.unparse(dataset);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentFileName}_cleaned.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportExcel() {
    if (dataset.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(dataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CleanedData");
    XLSX.writeFile(workbook, `${currentFileName}_cleaned.xlsx`);
}

function exportJSON() {
    if (dataset.length === 0) return;
    const jsonStr = JSON.stringify(dataset, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentFileName}_cleaned.json`;
    link.click();
}
