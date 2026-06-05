// ─── THEME ───────────────────────────────────────────────────────────────────
let currentTheme = 'normal';

const themes = {
    normal:   { bg: '#ffffff', color: '#2c2c2c', pageBg: '#f5f0e8' },
    dark:     { bg: '#1e1e2e', color: '#e0e0e0', pageBg: '#12121a' },
    soft:     { bg: '#fdf6e3', color: '#3a3000', pageBg: '#f5edd6' },
    dyslexia: { bg: '#fff3b0', color: '#2c2000', pageBg: '#fdf0c0' },
    blue:     { bg: '#ddeeff', color: '#002244', pageBg: '#cce4ff' },
};

// FIX: receive event as parameter instead of relying on implicit global event
function setTheme(name, btn) {

    currentTheme = name;

    localStorage.removeItem('customBg');

    document.querySelectorAll('.theme-btn')
        .forEach(b => b.classList.remove('active'));

    btn.classList.add('active');

    const theme = themes[name];

    document.getElementById('bgPicker').value = theme.bg;
    document.getElementById('bgColorVal').textContent = theme.bg;

    run();
}

// ─── PAGE NAVIGATION STATE ────────────────────────────────────────────────────
let pdfPages     = [];
let wordAllPages = [];
let currentPage  = 0;

// ─── MAIN RUN ─────────────────────────────────────────────────────────────────
function run() {
    if (pdfPages.length > 0) {
        renderPage();
        return;
    }
    savePreferences();

 /*   let text = document.getElementById('inputText').value;
    text = text.replace(/\r\n/g, '\n')
               .replace(/\n{3,}/g, '\n\n')
               .replace(/[ \t]+/g, ' ')
               .replace(/([.,!?])([^\s])/g, '$1 $2')
               .trim();

    const output  = document.getElementById('output');
    const section = document.getElementById('output-section');

    section.style.display = text ? 'block' : 'none';
    document.getElementById('pageNav').style.display = 'none';
    output.innerText = text;
    applyOutputStyles(output);
    savePreferences();*/
}

// ─── APPLY STYLES TO OUTPUT ───────────────────────────────────────────────────
function applyOutputStyles(output) {
    const size    = document.getElementById('fontSize').value;
    const spacing = document.getElementById('spacing').value;
    const theme   = themes[currentTheme];
    const color   = document.getElementById('fontColor').value;
    const font    = document.getElementById('fontStyle').value;

    output.style.fontSize   = size + 'px';
    output.style.lineHeight = spacing;
    const customBg = localStorage.getItem('customBg');
    output.style.background = customBg || theme.bg;
    output.style.color      = color;
    output.style.fontFamily = `'${font}', sans-serif`;

    document.body.style.background = customBg || theme.pageBg;

    document.getElementById('fontColorVal').textContent = color;
}

// ─── PAGE NAVIGATION ──────────────────────────────────────────────────────────
function renderPage() {
    if (pdfPages.length === 0) return;

    const output  = document.getElementById('output');
    const section = document.getElementById('output-section');
    const pageNav = document.getElementById('pageNav');
    const status  = document.getElementById('pageStatus');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    section.style.display = 'block';

    const total = pdfPages.length;
    pageNav.style.display = total > 1 ? 'flex' : 'none';

    const text   = pdfPages[currentPage];
    const isHtml = /^\s*<[a-zA-Z]/.test(text);

    if (isHtml) {
        output.innerHTML = text;
    } else {
        // Split on double newlines to preserve paragraph breaks; single newlines stay within paragraph
        output.innerHTML = text.split(/\n\n+/)
            .filter(p => p.trim())
            .map(p => `<p>${p.replace(/\n/g, ' ').trim()}</p>`)
            .join('');
    }

    applyOutputStyles(output);

    const originalNum = text.match(/^Page (\d+):/)?.[1] ?? (currentPage + 1);
    status.textContent = `Page ${originalNum}  (${currentPage + 1} of ${total})`;
    prevBtn.disabled   = currentPage === 0;
    nextBtn.disabled   = currentPage === total - 1;
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage < 0 || newPage >= pdfPages.length) return;
    currentPage = newPage;
    renderPage();
}

// ─── FONT STYLE ───────────────────────────────────────────────────────────────
function applyFont() {
    const font = document.getElementById('fontStyle').value;

    document.getElementById('output').style.fontFamily =
        `'${font}', sans-serif`;

    localStorage.setItem('fontStyle', font);

    run();
}

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
function togglePageRange() {
    const docType = document.getElementById('docType').value;
    const isPdf   = docType === 'pdf';
    const isDocx  = docType === 'docx';

    // Reset state when document type changes
    pdfPages    = [];
    wordAllPages = [];
    currentPage = 0;
    window.pendingPDF = null;

    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';

    document.getElementById('output').innerHTML            = '';
    document.getElementById('output-section').style.display = 'none';
    document.getElementById('pageNav').style.display        = 'none';
    document.getElementById('pageStatus').textContent       = '';
    document.getElementById('pageIndicator').textContent    = '';

    document.getElementById('pageRangeSection').style.display = (isPdf || isDocx) ? 'block' : 'none';
    document.getElementById('forceOCRSection').style.display  = 'none'; // always hidden (auto pipeline)
   document.getElementById('fileInput').style.display = 'block';
    document.getElementById('applyWordRange').style.display   = isDocx ? 'block' : 'none';
    // FIX: Process PDF button only visible for PDF type
    document.getElementById('processBtn').style.display       = isPdf ? 'block' : 'none';

    if (!isDocx) wordAllPages = [];

    const acceptMap = { pdf: '.pdf', docx: '.docx' };
    document.getElementById('fileInput').accept =
    acceptMap[docType];

    togglePageInputs();
}

function togglePageInputs() {
    const allPages = document.getElementById('allPages').checked;
    document.getElementById('startPage').disabled = allPages;
    document.getElementById('endPage').disabled   = allPages;
}

function loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const selectedType = document.getElementById('docType').value;

    /*if (selectedType === 'txt' && file.type === 'text/plain') {
        pdfPages    = [];
        currentPage = 0;
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('inputText').value = e.target.result;
            run();
        };
        reader.readAsText(file);
        return;
    }*/

    if (selectedType === 'pdf') {
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }
        const reader   = new FileReader();
        const pdfFile  = file;
        reader.onload  = function () {
            // FIX: store pending PDF, do NOT auto-process
            window.pendingPDF = {
                typedarray: new Uint8Array(this.result),
                file: pdfFile
            };
            // Show page range UI and set max pages after reading PDF metadata
            pdfjsLib.getDocument(new Uint8Array(this.result)).promise.then(pdf => {
                const total = pdf.numPages;
                document.getElementById('pageRangeSection').style.display = 'block';
                document.getElementById('processBtn').style.display       = 'block';
                document.getElementById('startPage').min   = 1;
                document.getElementById('startPage').max   = total;
                document.getElementById('startPage').value = 1;
                document.getElementById('endPage').min     = 1;
                document.getElementById('endPage').max     = total;
                document.getElementById('endPage').value   = total;
            });
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    if (selectedType === 'docx') {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.docx')) {
            alert('Please upload a Word (.docx) file.');
            return;
        }
        pdfPages     = [];
        wordAllPages = [];
        currentPage  = 0;
        const reader = new FileReader();
        reader.onload = function () {
            mammoth.convertToHtml({ arrayBuffer: this.result })
                .then(function (result) {
                    const container = document.createElement('div');
                    container.innerHTML = result.value;
                    const elements = Array.from(container.children);
                    const pages = [];
                    let chunk = '';

                    elements.forEach(el => {
                        if ((el.tagName === 'H1' || el.tagName === 'H2') && chunk !== '') {
                            pages.push(chunk);
                            chunk = '';
                        }
                        chunk += el.outerHTML;
                        if (chunk.length > 1000) {
                            pages.push(chunk);
                            chunk = '';
                        }
                    });
                    if (chunk !== '') pages.push(chunk);

                    wordAllPages = pages.length > 0 ? pages : ['<p>(No content found in document)</p>'];
                    const total  = wordAllPages.length;

                    document.getElementById('pageRangeSection').style.display = 'block';
                    document.getElementById('startPage').min   = 1;
                    document.getElementById('startPage').max   = total;
                    document.getElementById('startPage').value = 1;
                    document.getElementById('endPage').min     = 1;
                    document.getElementById('endPage').max     = total;
                    document.getElementById('endPage').value   = total;
                    document.getElementById('applyWordRange').style.display = 'block';

                    pdfPages    = wordAllPages.slice();
                    currentPage = 0;
                    renderPage();
                })
                .catch(() => alert('Failed to read Word file. Please ensure it is a valid .docx file.'));
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    alert('File type does not match selected document type!');
}

// ─── PROCESS PDF BUTTON ───────────────────────────────────────────────────────
function startPDFProcessing() {
    if (!window.pendingPDF) {
        alert('Please upload a PDF file first.');
        return;
    }

    const allPages = document.getElementById('allPages').checked;
    const start    = parseInt(document.getElementById('startPage').value);
    const end      = parseInt(document.getElementById('endPage').value);

    // FIX: validate that range is selected or All Pages is ticked
    if (!allPages && (!start || !end)) {
        alert('Please enter a page range or tick "All Pages".');
        return;
    }

    processPDF(window.pendingPDF.typedarray, window.pendingPDF.file);
}

// ─── WORD PAGE RANGE APPLY ────────────────────────────────────────────────────
function applyWordPageRange() {
    if (wordAllPages.length === 0) return;

    const total    = wordAllPages.length;
    const allPages = document.getElementById('allPages').checked;
    let start = parseInt(document.getElementById('startPage').value) || 1;
    let end   = parseInt(document.getElementById('endPage').value)   || total;

    if (allPages) {
        pdfPages = wordAllPages.slice();
    } else {
        if (start < 1) start = 1;
        if (end > total) end = total;
        if (start > end) {
            alert(`Invalid range: Start (${start}) cannot be greater than End (${end}).`);
            return;
        }
        pdfPages = wordAllPages.slice(start - 1, end);
    }

    currentPage = 0;
    renderPage();
}

// ─── OCR HELPERS & PDF PIPELINE ──────────────────────────────────────────────
function setOCRStatus(text, percent) {
    document.getElementById('output-section').style.display = 'block';
    document.getElementById('ocrStatus').style.display      = 'block';
    document.getElementById('ocrStatusText').textContent    = text;
    document.getElementById('ocrProgressBar').style.width   = percent + '%';
}

function hideOCRStatus() {
    document.getElementById('ocrStatus').style.display    = 'none';
    document.getElementById('ocrProgressBar').style.width = '0%';
}

/*
async function runOCR(page) {
    const viewport = page.getViewport({ scale: 3 });
    const canvas   = document.createElement('canvas');
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const result = await Tesseract.recognize(canvas.toDataURL('image/png'), 'eng', {
        tessedit_pageseg_mode: 6,
        preserve_interword_spaces: 1
    });
    return result.data.text;
}*/

/*
async function processWithML(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('http://127.0.0.1:5000/process', {
        method: 'POST',
        body: formData
    });
    const data = await response.json();
    return data.text;
}*/

// ─── TEXT STANDARDISATION ────────────────────────────────────────────────────
function standardiseText(raw) {
    // Step 1: normalise line endings, preserve double-newline paragraph breaks
    let t = raw
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n');

    // Step 2: process each paragraph independently to avoid cross-paragraph merges
    const paras = t.split('\n\n').map(para => {
        let p = para;

        // Fix word-split artefacts: "younge r" → "younger", "rainfores t" → "rainforest"
        // Pattern: word chars, then a space before a single char that continues the word,
        // followed by another space or end — only collapse when the isolated char is lowercase
        p = p.replace(/([a-zA-Z]+) ([a-z])(?=\s|[.,!?]|$)/g, (match, word, lone) => {
            // Only merge if lone char looks like a split-off suffix (not a real word)
            if (lone.length === 1) return word + lone;
            return match;
        });

        // Collapse excessive spaces within a line
        p = p.replace(/[ \t]+/g, ' ');

        // Fix missing space after punctuation
        p = p.replace(/([.,!?])([^\s\d'"\)])/g, '$1 $2');

        // Fix camelCase splits from PDF.js (e.g. "helloWorld" → "hello World")
        p = p.replace(/([a-z])([A-Z])/g, '$1 $2');

        // Fix spaced-out capital letters (e.g. "H E L L O" → "HELLO")
        p = p.replace(/\b(?:[A-Z] ){2,}[A-Z]\b/g, m => m.replace(/ /g, ''));

        return p.trim();
    });

    return paras.filter(p => p.length > 0).join('\n\n');
}

// ─── EXTRACTION QUALITY HEURISTICS ──────────────────────────────────────────
function isExtractionPoor(text) {
    const t = text.trim();
    if (t.length < 50) return true;
    const words = t.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 8) return true;
    const spaceRatio  = (t.match(/ /g) || []).length / t.length;
    if (spaceRatio > 0.4) return true;
    const symbolRatio = (t.match(/[^a-zA-Z0-9\s.,!?;:'"()-]/g) || []).length / t.length;
    if (symbolRatio > 0.3) return true;
    const readableWords = words.filter(w => /^[a-zA-Z]{3,}$/.test(w)).length;
    if (readableWords / words.length < 0.3) return true;
    return false;
}

function isOCRPoor(text) {
    if (!text || text.trim().length < 80) return true;

    const lines      = text.split('\n').filter(l => l.trim().length > 0);
    const shortLines = lines.filter(l => l.trim().split(/\s+/).length <= 2);
    // FIX: more than 50% single/double-word lines = broken OCR
    if (lines.length > 0 && shortLines.length / lines.length > 0.5) return true;

    const weirdChars = (text.match(/[^a-zA-Z0-9\s.,!?()\-:;'"]/g) || []).length;
    if (weirdChars / text.length > 0.12) return true;

    const words        = text.split(/\s+/).filter(w => w.length > 0);
    const readableWords = words.filter(w => /^[a-zA-Z]{3,}$/.test(w)).length;
    if (words.length > 0 && readableWords / words.length < 0.3) return true;

    return false;
}

// ─── PER-PAGE EXTRACTION PIPELINE ────────────────────────────────────────────
async function extractPageText(page, pageNum, endPage, progress, file) {
    const content  = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const pageH    = viewport.height;

    // Group items into lines by their Y position (rounded to nearest 5px)
    const lineMap = new Map();
    for (const item of content.items) {
        const y   = Math.round((pageH - item.transform[5]) / 5) * 5;
        const key = y;
        if (!lineMap.has(key)) lineMap.set(key, []);
        lineMap.get(key).push(item.str);
    }

    // Sort lines top-to-bottom and join each line's words
    const sortedKeys = [...lineMap.keys()].sort((a, b) => a - b);
    const lines = sortedKeys.map(k => lineMap.get(k).join(' ').trim()).filter(l => l.length > 0);

    // Detect paragraph breaks: gap between consecutive Y positions > 1.5× normal line gap
    const yKeys   = sortedKeys;
    const gaps    = [];
    for (let i = 1; i < yKeys.length; i++) gaps.push(yKeys[i] - yKeys[i - 1]);
    const medianGap = gaps.length ? [...gaps].sort((a,b)=>a-b)[Math.floor(gaps.length/2)] : 10;

    const paragraphs = [];
    let current = lines[0] || '';
    for (let i = 1; i < lines.length; i++) {
        const gap = yKeys[i] - yKeys[i - 1];
        if (gap > medianGap * 1.5) {
            paragraphs.push(current.trim());
            current = lines[i];
        } else {
            current += ' ' + lines[i];
        }
    }
    if (current.trim()) paragraphs.push(current.trim());

    console.log(`[PDF.js] Direct extraction — page ${pageNum}`);
    return paragraphs.join('\n\n');
}

// ─── PDF PROCESSING ───────────────────────────────────────────────────────────
async function processPDF(typedarray, file) {
    const pdf        = await pdfjsLib.getDocument(typedarray).promise;
    const totalPages = pdf.numPages;

    const allPages = document.getElementById('allPages').checked;
    let start = 1;
    let end   = totalPages;

    if (!allPages) {
        start = parseInt(document.getElementById('startPage').value) || 1;
        end   = parseInt(document.getElementById('endPage').value)   || totalPages;
        if (start < 1) start = 1;
        if (end > totalPages) end = totalPages;
        if (start > end) {
            alert(`Invalid range: Start (${start}) cannot be greater than End (${end}).`);
            return;
        }
    }

    pdfPages    = [];
    currentPage = 0;

    const total = end - start + 1;

    for (let i = start; i <= end; i++) {
        const progress = Math.round(((i - start) / total) * 100);
        setOCRStatus(`Processing page ${i} of ${end}…`, progress);
        console.log(`[PDF] Page ${i} / ${end}`);

        const page = await pdf.getPage(i);
        const text = await extractPageText(page, i, end, progress, file);
        pdfPages.push(`Page ${i}:\n\n${standardiseText(text) || '(No text found on this page)'}`);
    }

    setOCRStatus('Done!', 100);
    setTimeout(hideOCRStatus, 1200);
    renderPage();
}

// ─── WEBSITE READER ──────────────────────────────────────────────────────────
/*async function fetchWebsite(url) {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch('http://localhost:5000/fetch-website', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ url }),
            signal:  controller.signal
        });
        clearTimeout(timer);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        console.log('[Web] Flask response:', data);
        if (data.error) throw new Error(data.error);
        return data.text;
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') throw new Error('Request timed out.');
        throw err;
    }
}*/

function calculateReadability(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
    const words     = text.split(/\s+/).filter(w => w.length > 0).length;
    const avg       = words / sentences;
    if (avg < 12) return 'Easy 🟢';
    if (avg < 18) return 'Medium 🟡';
    return 'Hard 🔴';
}

/*
async function loadWebsite() {
    const url = document.getElementById('websiteURL').value.trim();
    if (!url) { alert('Please enter a valid URL.'); return; }

    const btn       = document.querySelector('#webSection .extract-btn');
    const indicator = document.getElementById('pageIndicator');

    btn.disabled          = true;
    btn.textContent       = 'Fetching…';
    indicator.textContent = '';
    pdfPages    = [];
    currentPage = 0;

    try {
        const rawText = await fetchWebsite(url);

        const cleanedText = rawText
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (!cleanedText) {
            alert('Could not extract readable content. Try a different URL.');
            indicator.textContent = '';
            return;
        }

        const paragraphs = cleanedText.split(/\n\n+/);
        const pages      = [];
        let   chunk      = '';

        paragraphs.forEach(para => {
            if (!para.trim()) return;
            if (chunk.length + para.length > 1500 && chunk !== '') {
                pages.push(chunk.trim());
                chunk = '';
            }
            chunk += para + '\n\n';
        });
        if (chunk.trim()) pages.push(chunk.trim());

        if (pages.length === 0) {
            alert('Could not extract readable content. Try a different URL.');
            indicator.textContent = '';
            return;
        }

        pdfPages              = pages;
        currentPage           = 0;
        indicator.textContent = 'Readability: ' + calculateReadability(cleanedText);

        document.getElementById('output-section').style.display = 'block';
        renderPage();

    } catch (err) {
        console.error('[Web] Error:', err);
        alert('Could not fetch website:\n\n' + err.message);
        indicator.textContent = '';
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Extract Content';
    }
}*/

// ─── SAVE PREFERENCES ────────────────────────────────────────────────────────
function savePreferences() {
    localStorage.setItem('fontSize',  document.getElementById('fontSize').value);
    localStorage.setItem('spacing',   document.getElementById('spacing').value);
    localStorage.setItem('theme',     currentTheme);
    // FIX: always save fontColor here
    localStorage.setItem('fontColor', document.getElementById('fontColor').value);
    localStorage.setItem('fontStyle', document.getElementById('fontStyle').value);

    localStorage.setItem(
    'customBg',
    document.getElementById('bgPicker').value
);
}

// ─── LOAD PREFERENCES ────────────────────────────────────────────────────────
window.onload = function () {
    const savedSize    = localStorage.getItem('fontSize');
    const savedSpacing = localStorage.getItem('spacing');
    const savedTheme   = localStorage.getItem('theme');
    const savedFont    = localStorage.getItem('fontStyle');
    const savedColor   = localStorage.getItem('fontColor');
    const savedBg      = localStorage.getItem('customBg');

    if (savedSize) {
        document.getElementById('fontSize').value          = savedSize;
        document.getElementById('fontSizeVal').textContent = savedSize;
    }
    if (savedSpacing) {
        document.getElementById('spacing').value           = savedSpacing;
        document.getElementById('spacingVal').textContent  = parseFloat(savedSpacing).toFixed(1);
    }
    if (savedTheme) {
        currentTheme = savedTheme;
        const btn = document.querySelector(`.btn-${savedTheme}`);
        if (btn) {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    }
    if (savedFont) {
        document.getElementById('fontStyle').value = savedFont;
        document.getElementById('output').style.fontFamily = `'${savedFont}', sans-serif`;
    }
    // FIX: restore font color properly
    if (savedColor) {
        document.getElementById('fontColor').value          = savedColor;
        document.getElementById('fontColorVal').textContent = savedColor;
    }
    // restore custom background
    if (savedBg) {
        document.body.style.background                    = savedBg;
        document.getElementById('output').style.background = savedBg;
        document.getElementById('bgPicker').value          = savedBg;
        document.getElementById('bgColorVal').textContent  = savedBg;
    }

    // bgPicker listener — updates both body and #output immediately
    document.getElementById('bgPicker').addEventListener('input', function () {
        document.body.style.background                    = this.value;
        document.getElementById('output').style.background = this.value;
        document.getElementById('bgColorVal').textContent  = this.value;
        localStorage.setItem('customBg', this.value);
        run();
    });

    // FIX: fontColor live save on every change
    document.getElementById('fontColor').addEventListener('input', function () {
        document.getElementById('fontColorVal').textContent = this.value;
        localStorage.setItem('fontColor', this.value);
        // re-apply to output if content is showing
        if (pdfPages.length > 0) {
            document.getElementById('output').style.color = this.value;
        }
    });

    // Process PDF button
    document.getElementById('processBtn').addEventListener('click', startPDFProcessing);

    run();
};
