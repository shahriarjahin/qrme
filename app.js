// ============================================================
//  QR Studio — app.js  (full-featured)
// ============================================================

// ── State ──────────────────────────────────────────────────
let currentType  = 'url';
let logoDataUrl  = null;
const HISTORY_KEY = 'qrstudio_history';

// ── QRCodeStyling instance ─────────────────────────────────
const qrCode = new QRCodeStyling({
    width: 300, height: 300,
    type: 'canvas',
    data: 'https://example.com',
    image: '',
    dotsOptions:         { color: '#000000', type: 'rounded' },
    cornersSquareOptions:{ color: '#000000', type: 'extra-rounded' },
    cornersDotOptions:   { color: '#000000', type: 'dot' },
    backgroundOptions:   { color: '#ffffff' },
    imageOptions: { crossOrigin: 'anonymous', margin: 6, hideBackgroundDots: true },
    qrOptions: { errorCorrectionLevel: 'Q' }
});
qrCode.append(document.getElementById('qr-canvas'));

// ── Data builders ──────────────────────────────────────────
const dataBuilders = {
    url()       { return v('urlInput') || 'https://example.com'; },
    text()      { return v('textInput') || 'Hello World'; },

    wifi() {
        const ssid   = v('wifiSsid');
        const pass   = v('wifiPass');
        const type   = v('wifiType');
        const hidden = document.getElementById('wifiHidden').checked ? 'true' : 'false';
        const esc    = s => s.replace(/[\\;,"]/g, c => '\\' + c);
        return `WIFI:T:${type};S:${esc(ssid)};P:${esc(pass)};H:${hidden};;`;
    },

    vcard() {
        const first   = v('vcardFirst');
        const last    = v('vcardLast');
        const company = v('vcardCompany');
        const lines   = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `N:${last};${first};;;`,
            `FN:${[first, last].filter(Boolean).join(' ')}`,
            company && `ORG:${company}`
        ].filter(Boolean);

        vcardFields.forEach(f => {
            const val = f.input ? f.input.value.trim() : '';
            if (!val) return;
            const sub = f.sublabel || f.defaultSub || '';
            switch (f.type) {
                case 'phone':   lines.push(`TEL;TYPE=${sub.toUpperCase()}:${val}`); break;
                case 'email':   lines.push(`EMAIL;TYPE=${sub.toUpperCase()}:${val}`); break;
                case 'url':     lines.push(`URL;TYPE=${sub.toUpperCase()}:${val}`); break;
                case 'address': lines.push(`ADR;TYPE=${sub.toUpperCase()}:;;${val};;;`); break;
                case 'birthday':lines.push(`BDAY:${val.replace(/-/g,'')}`); break;
                case 'title':   lines.push(`TITLE:${val}`); break;
                case 'note':    lines.push(`NOTE:${val}`); break;
                case 'nickname':lines.push(`NICKNAME:${val}`); break;
                case 'social': {
                    const network = (sub || 'x').toLowerCase();
                    lines.push(`X-SOCIALPROFILE;type=${network}:${val}`);
                    break;
                }
            }
        });

        lines.push('END:VCARD');
        return lines.join('\n');
    },

    whatsapp() {
        const phone = v('waPhone').replace(/\D/g, '');
        const msg   = encodeURIComponent(v('waMessage'));
        return msg ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/${phone}`;
    },

    sms() {
        const phone = v('smsPhone');
        const msg   = v('smsMessage');
        return msg ? `sms:${phone}?body=${encodeURIComponent(msg)}` : `sms:${phone}`;
    },

    email() {
        const to      = v('emailAddress');
        const subject = encodeURIComponent(v('emailSubject'));
        const body    = encodeURIComponent(v('emailBody'));
        const params  = [];
        if (subject) params.push(`subject=${subject}`);
        if (body)    params.push(`body=${body}`);
        return `mailto:${to}${params.length ? '?' + params.join('&') : ''}`;
    },

    phone() {
        return `tel:${v('phoneNumber') || '+1234567890'}`;
    },

    crypto() {
        const coin    = v('cryptoCoin');
        const address = v('cryptoAddress');
        const amount  = v('cryptoAmount');
        const label   = encodeURIComponent(v('cryptoLabel'));
        if (!address) return `${coin}:address_here`;
        let uri = `${coin}:${address}`;
        const params = [];
        if (amount) params.push(`amount=${amount}`);
        if (label)  params.push(`label=${label}`);
        return uri + (params.length ? '?' + params.join('&') : '');
    },

    event() {
        const fmt = dt => dt ? dt.replace(/[-:T]/g, '').slice(0, 15) + 'Z' : '';
        const title    = v('eventTitle');
        const start    = fmt(v('eventStart'));
        const end      = fmt(v('eventEnd'));
        const location = v('eventLocation');
        const desc     = v('eventDesc');
        return [
            'BEGIN:VEVENT',
            `SUMMARY:${title}`,
            start    && `DTSTART:${start}`,
            end      && `DTEND:${end}`,
            location && `LOCATION:${location}`,
            desc     && `DESCRIPTION:${desc}`,
            'END:VEVENT'
        ].filter(Boolean).join('\n');
    },

    location() {
        const lat   = v('locLat');
        const lng   = v('locLng');
        const query = v('locQuery');
        if (lat && lng) return `geo:${lat},${lng}`;
        if (query)      return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        return 'geo:0,0';
    },

    applink() {
        const platform = v('appPlatform');
        const id       = v('appId').trim();
        if (platform === 'ios')     return `https://apps.apple.com/app/id${id}`;
        if (platform === 'android') return `https://play.google.com/store/apps/details?id=${id}`;
        // smart link — simple redirect-style universal link
        return `https://play.google.com/store/apps/details?id=${id}`;
    },

    esim() {
        return `LPA:1$${v('esimSmdp')}$${v('esimCode')}`;
    }
};

// ── Helpers ────────────────────────────────────────────────
function v(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

// ── Build QR options ───────────────────────────────────────
function buildOptions() {
    const size      = parseInt(document.getElementById('qrSize').value);
    const margin    = parseInt(document.getElementById('qrMargin').value);
    const transparent = document.getElementById('transparentBg').checked;
    const logoSizePct = parseInt(document.getElementById('logoSize').value) / 100;
    const logoMargin  = parseInt(document.getElementById('logoMargin').value);

    return {
        width:  size,
        height: size,
        data:   dataBuilders[currentType](),
        dotsOptions: {
            color: document.getElementById('dotColor').value,
            type:  document.getElementById('dotStyle').value
        },
        cornersSquareOptions: {
            color: document.getElementById('cornerSquareColor').value,
            type:  document.getElementById('cornerSquareStyle').value
        },
        cornersDotOptions: {
            color: document.getElementById('cornerDotColor').value,
            type:  document.getElementById('cornerDotStyle').value
        },
        backgroundOptions: transparent
            ? { color: 'transparent' }
            : { color: document.getElementById('bgColor').value },
        image: logoDataUrl || '',
        imageOptions: {
            crossOrigin: 'anonymous',
            margin:      logoMargin,
            imageSize:   logoSizePct,
            hideBackgroundDots: document.getElementById('hideDots').checked
        },
        qrOptions: { errorCorrectionLevel: document.getElementById('correctionLevel').value },
        margin: margin
    };
}

// ── Render ─────────────────────────────────────────────────
let renderTimer = null;
function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 120);
}

function render() {
    const opts = buildOptions();
    document.getElementById('rawStringDisplay').textContent = opts.data;
    qrCode.update(opts);
    // draw frame after QR renders (small delay)
    setTimeout(drawFrame, 300);
}

// ── Tab Switching ──────────────────────────────────────────
document.getElementById('tabContainer').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.qr-form').forEach(f => f.classList.remove('active'));
    document.getElementById('form-' + btn.dataset.type).classList.add('active');
    currentType = btn.dataset.type;
    render();
});

// ── Listen to all inputs ───────────────────────────────────
const watchIds = [
    'urlInput','textInput',
    'wifiSsid','wifiPass','wifiType','wifiHidden',
    'vcardFirst','vcardLast','vcardPhone','vcardEmail','vcardCompany','vcardTitle','vcardUrl','vcardAddress',
    'waPhone','waMessage',
    'smsPhone','smsMessage',
    'emailAddress','emailSubject','emailBody',
    'phoneNumber',
    'cryptoCoin','cryptoAddress','cryptoAmount','cryptoLabel',
    'eventTitle','eventStart','eventEnd','eventLocation','eventDesc',
    'locLat','locLng','locQuery',
    'appPlatform','appId',
    'esimSmdp','esimCode',
    'dotStyle','cornerSquareStyle','cornerDotStyle','correctionLevel',
    'bgColor','dotColor','cornerSquareColor','cornerDotColor',
    'transparentBg','hideDots',
    'qrSize','qrMargin',
    'logoSize','logoMargin',
    'frameColor','frameLabel','frameLabelColor','frameStyle','enableFrame'
];

watchIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = (el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'color' || el.type === 'range') ? 'change' : 'input';
    el.addEventListener(evt, scheduleRender);
});

// Slider live labels
document.getElementById('qrSize').addEventListener('input', e => {
    document.getElementById('sizeLabel').textContent = e.target.value;
});
document.getElementById('qrMargin').addEventListener('input', e => {
    document.getElementById('marginLabel').textContent = e.target.value;
});
document.getElementById('logoSize').addEventListener('input', e => {
    document.getElementById('logoSizeLabel').textContent = e.target.value;
});
document.getElementById('logoMargin').addEventListener('input', e => {
    document.getElementById('logoMarginLabel').textContent = e.target.value;
});

// ── Logo Upload ────────────────────────────────────────────
document.getElementById('logoUpload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) { logoDataUrl = null; render(); return; }
    const reader = new FileReader();
    reader.onload = ev => { logoDataUrl = ev.target.result; render(); };
    reader.readAsDataURL(file);
});
document.getElementById('clearLogoBtn').addEventListener('click', () => {
    logoDataUrl = null;
    document.getElementById('logoUpload').value = '';
    render();
});

// ── Transparent BG toggle ──────────────────────────────────
document.getElementById('transparentBg').addEventListener('change', function() {
    document.getElementById('bgColor').disabled = this.checked;
});

// ── Frame toggle ───────────────────────────────────────────
document.getElementById('enableFrame').addEventListener('change', function() {
    document.getElementById('frameOptions').classList.toggle('hidden', !this.checked);
    scheduleRender();
});

// ── Frame drawing ──────────────────────────────────────────
function drawFrame() {
    // Remove old frame canvas
    const old = document.getElementById('frame-canvas');
    if (old) old.remove();

    if (!document.getElementById('enableFrame').checked) {
        // reset wrapper padding
        document.getElementById('qr-wrapper').style.padding = '0';
        return;
    }

    const qrCanvas = document.querySelector('#qr-canvas canvas');
    if (!qrCanvas) return;

    const frameColor      = document.getElementById('frameColor').value;
    const labelText       = document.getElementById('frameLabel').value || 'SCAN ME';
    const labelColor      = document.getElementById('frameLabelColor').value;
    const frameStyleVal   = document.getElementById('frameStyle').value;
    const qrSize          = qrCanvas.width;

    const PADDING   = 16;
    const LABEL_H   = frameStyleVal === 'simple' ? 0 : 40;
    const totalW    = qrSize + PADDING * 2;
    const totalH    = qrSize + PADDING * 2 + LABEL_H;

    const fc = document.createElement('canvas');
    fc.id     = 'frame-canvas';
    fc.width  = totalW;
    fc.height = totalH;
    fc.style.cssText = 'display:block;';

    const ctx = fc.getContext('2d');

    if (frameStyleVal === 'simple') {
        ctx.strokeStyle = frameColor;
        ctx.lineWidth   = 6;
        ctx.strokeRect(3, 3, totalW - 6, totalH - 6);
    } else if (frameStyleVal === 'banner') {
        ctx.fillStyle = frameColor;
        ctx.fillRect(0, totalH - LABEL_H, totalW, LABEL_H);
        ctx.fillStyle   = labelColor;
        ctx.font        = 'bold 16px Segoe UI, system-ui, sans-serif';
        ctx.textAlign   = 'center';
        ctx.textBaseline= 'middle';
        ctx.fillText(labelText, totalW / 2, totalH - LABEL_H / 2);
    } else {
        // rounded card
        ctx.fillStyle = frameColor;
        roundRect(ctx, 0, 0, totalW, totalH, 14);
        ctx.fill();
        ctx.fillStyle   = labelColor;
        ctx.font        = 'bold 15px Segoe UI, system-ui, sans-serif';
        ctx.textAlign   = 'center';
        ctx.textBaseline= 'middle';
        ctx.fillText(labelText, totalW / 2, totalH - LABEL_H / 2);
    }

    // Draw existing QR onto frame canvas
    ctx.drawImage(qrCanvas, PADDING, PADDING, qrSize, qrSize);

    // Swap: replace qr-canvas with the composite frame canvas
    const wrapper = document.getElementById('qr-wrapper');
    wrapper.style.padding = '0';
    const qrDiv = document.getElementById('qr-canvas');
    qrDiv.style.display = 'none';
    wrapper.appendChild(fc);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ── Color Presets ──────────────────────────────────────────
const PRESETS = {
    classic:  { bg: '#ffffff', dot: '#000000', cs: '#000000', cd: '#000000' },
    ocean:    { bg: '#e8f4fd', dot: '#0369a1', cs: '#0c4a6e', cd: '#0369a1' },
    forest:   { bg: '#f0fdf4', dot: '#166534', cs: '#14532d', cd: '#166534' },
    rose:     { bg: '#fff1f2', dot: '#be123c', cs: '#881337', cd: '#be123c' },
    neon:     { bg: '#0a0a0a', dot: '#39ff14', cs: '#00ffff', cd: '#ff00ff' },
    gold:     { bg: '#1c1204', dot: '#f59e0b', cs: '#d97706', cd: '#fbbf24' },
    midnight: { bg: '#0f172a', dot: '#818cf8', cs: '#6366f1', cd: '#a5b4fc' }
};

document.getElementById('themePresets').addEventListener('click', e => {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;
    const p = PRESETS[btn.dataset.preset];
    if (!p) return;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active-preset'));
    btn.classList.add('active-preset');
    setColor('bgColor',           p.bg);
    setColor('dotColor',          p.dot);
    setColor('cornerSquareColor', p.cs);
    setColor('cornerDotColor',    p.cd);
    scheduleRender();
});

function setColor(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

// ── Downloads ──────────────────────────────────────────────
function getFilename(ext) {
    const names = { url:'qr-url', text:'qr-text', wifi:'qr-wifi', vcard:'qr-contact',
                    whatsapp:'qr-whatsapp', sms:'qr-sms', email:'qr-email',
                    phone:'qr-phone', crypto:'qr-crypto', event:'qr-event',
                    location:'qr-location', applink:'qr-applink', esim:'qr-esim' };
    return (names[currentType] || 'qr-code') + '.' + ext;
}

document.getElementById('downloadPng').addEventListener('click', () => {
    saveToHistory();
    const frameCanvas = document.getElementById('frame-canvas');
    if (frameCanvas) {
        // download the framed version
        const a = document.createElement('a');
        a.download = getFilename('png');
        a.href = frameCanvas.toDataURL('image/png');
        a.click();
    } else {
        qrCode.download({ name: getFilename('png').replace('.png',''), extension: 'png' });
    }
});

document.getElementById('downloadSvg').addEventListener('click', () => {
    saveToHistory();
    qrCode.download({ name: getFilename('svg').replace('.svg',''), extension: 'svg' });
});

document.getElementById('downloadJpeg').addEventListener('click', () => {
    saveToHistory();
    qrCode.download({ name: getFilename('jpeg').replace('.jpeg',''), extension: 'jpeg' });
});

document.getElementById('copyClipboard').addEventListener('click', async () => {
    try {
        const canvas = document.querySelector('#qr-canvas canvas');
        if (!canvas) return;
        canvas.toBlob(async blob => {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                showToast('✓ Copied to clipboard!');
            } catch {
                // fallback: copy raw data string
                await navigator.clipboard.writeText(buildOptions().data);
                showToast('✓ QR data copied!');
            }
        });
    } catch(e) {
        showToast('⚠ Copy not supported in this browser');
    }
});

// ── Toast ──────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.classList.add('hidden'), 300);
    }, 2200);
}

// ── History ────────────────────────────────────────────────
function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
}
function saveHistory(items) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch {}
}

function saveToHistory() {
    const data  = buildOptions().data;
    const items = loadHistory();
    // dedup by data string
    const filtered = items.filter(i => i.data !== data);
    filtered.unshift({ type: currentType, data, ts: Date.now() });
    saveHistory(filtered.slice(0, 8));
    renderHistory();
}

function renderHistory() {
    const list  = document.getElementById('historyList');
    const items = loadHistory();
    if (!items.length) {
        list.innerHTML = '<p class="history-empty">No recent QRs yet</p>';
        return;
    }
    list.innerHTML = items.map((item, i) => `
        <div class="history-item" data-index="${i}">
            <span class="hist-type">${item.type}</span>
            <span class="hist-data">${item.data}</span>
        </div>
    `).join('');
    list.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
            const item = items[parseInt(el.dataset.index)];
            // Switch to matching tab
            const btn = document.querySelector(`.tab-btn[data-type="${item.type}"]`);
            if (btn) btn.click();
            // For URL type restore value
            if (item.type === 'url') {
                document.getElementById('urlInput').value = item.data;
                render();
            }
            showToast('↩ QR restored');
        });
    });
}

document.getElementById('clearHistory').addEventListener('click', () => {
    saveHistory([]);
    renderHistory();
});

// ── Light/Dark toggle ──────────────────────────────────────
document.getElementById('themeToggle').addEventListener('click', function() {
    const isLight = document.body.classList.toggle('light-mode');
    this.textContent = isLight ? '🌙' : '☀️';
});

// ── Init ───────────────────────────────────────────────────
renderHistory();
render();

// ============================================================
//  vCard — iPhone-style dynamic field system
// ============================================================

// ── Field definitions ───────────────────────────────────────
const VCARD_FIELD_DEFS = [
    {
        group: 'Contact',
        fields: [
            { type: 'phone',    icon: '📞', name: 'Phone',    desc: 'mobile, home, work…',    placeholder: '+1 (555) 000-0000', sublabels: ['mobile','home','work','main','iPhone','other'], defaultSub: 'mobile' },
            { type: 'email',    icon: '✉️',  name: 'Email',    desc: 'personal or work',       placeholder: 'name@example.com',  sublabels: ['home','work','iCloud','other'],               defaultSub: 'home'   },
            { type: 'url',      icon: '🌐', name: 'Website',  desc: 'homepage, social…',      placeholder: 'https://',          sublabels: ['homepage','work','blog','other'],             defaultSub: 'homepage'},
        ]
    },
    {
        group: 'Personal',
        fields: [
            { type: 'birthday', icon: '🎂', name: 'Birthday', desc: 'date of birth',          placeholder: '1990-06-15',        sublabels: null,                                          defaultSub: ''   },
            { type: 'nickname', icon: '😊', name: 'Nickname', desc: 'preferred name',         placeholder: 'Johnny',            sublabels: null,                                          defaultSub: ''   },
            { type: 'note',     icon: '📝', name: 'Note',     desc: 'free-text note',         placeholder: 'Any extra info…',   sublabels: null,                                          defaultSub: ''   },
        ]
    },
    {
        group: 'Work',
        fields: [
            { type: 'title',    icon: '💼', name: 'Job Title',  desc: 'role / position',       placeholder: 'Software Engineer', sublabels: null,                                        defaultSub: ''   },
            { type: 'address',  icon: '🏠', name: 'Address',    desc: 'home, work…',           placeholder: '123 Main St, City', sublabels: ['home','work','other'],                     defaultSub: 'home'},
        ]
    },
    {
        group: 'Social',
        fields: [
            { type: 'social', icon: '𝕏',  name: 'X / Twitter', desc: 'username or URL', placeholder: '@username', sublabels: ['x','twitter'],          defaultSub: 'x'        },
            { type: 'social', icon: '💼', name: 'LinkedIn',     desc: 'profile URL',     placeholder: 'https://linkedin.com/in/…', sublabels: ['linkedin'], defaultSub: 'linkedin' },
            { type: 'social', icon: '📸', name: 'Instagram',    desc: 'username or URL', placeholder: '@username', sublabels: ['instagram'],             defaultSub: 'instagram'},
            { type: 'social', icon: '▶️', name: 'YouTube',      desc: 'channel URL',     placeholder: 'https://youtube.com/@…', sublabels: ['youtube'],   defaultSub: 'youtube'  },
            { type: 'social', icon: '💬', name: 'Facebook',     desc: 'profile URL',     placeholder: 'https://facebook.com/…', sublabels: ['facebook'],  defaultSub: 'facebook' },
            { type: 'social', icon: '🎵', name: 'TikTok',       desc: 'username',        placeholder: '@username', sublabels: ['tiktok'],                defaultSub: 'tiktok'   },
        ]
    }
];

// ── Runtime field state ─────────────────────────────────────
let vcardFields   = [];  // [{ id, type, defaultSub, sublabel, input, el }]
let pickerTarget  = null; // 'add' | field-id (for relabelling)
let fieldIdSeq    = 0;

// ── DOM refs ────────────────────────────────────────────────
const fieldList    = document.getElementById('vcardFieldList');
const addBtn       = document.getElementById('vcardAddBtn');
const pickerSheet  = document.getElementById('vcardPickerSheet');
const pickerClose  = document.getElementById('vcardPickerClose');
const pickerListEl = document.getElementById('vcardPickerList');

// ── Build the picker list HTML ──────────────────────────────
function buildPickerList(mode) {
    // mode = 'add' | 'relabel'
    pickerListEl.innerHTML = '';
    VCARD_FIELD_DEFS.forEach(group => {
        const gLabel = document.createElement('div');
        gLabel.className = 'vcard-picker-group-label';
        gLabel.textContent = group.group;
        pickerListEl.appendChild(gLabel);

        group.fields.forEach(def => {
            const item = document.createElement('div');
            item.className = 'vcard-picker-item';
            item.innerHTML = `
                <div class="vcard-picker-item-icon" style="background:var(--bg-input)">${def.icon}</div>
                <div class="vcard-picker-item-text">
                    <span class="vcard-picker-item-name">${def.name}</span>
                    <span class="vcard-picker-item-desc">${def.desc}</span>
                </div>`;
            item.addEventListener('click', () => {
                closePicker();
                if (mode === 'add') {
                    addField(def);
                } else {
                    relabelField(pickerTarget, def);
                }
            });
            pickerListEl.appendChild(item);
        });
    });
}

// ── Open / close picker ─────────────────────────────────────
function openPicker(mode, targetId) {
    pickerTarget = targetId || null;
    buildPickerList(mode);
    pickerSheet.classList.remove('hidden');
    pickerSheet.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function closePicker() { pickerSheet.classList.add('hidden'); }

addBtn.addEventListener('click', () => openPicker('add'));
pickerClose.addEventListener('click', closePicker);

// ── Add a new field row ─────────────────────────────────────
function addField(def, prefillValue) {
    const id  = ++fieldIdSeq;
    const row = document.createElement('div');
    row.className  = 'vcard-field-row';
    row.dataset.id = id;

    // Sub-label selector or static label
    let labelInner = '';
    if (def.sublabels && def.sublabels.length > 1) {
        const opts = def.sublabels.map(s =>
            `<option value="${s}">${s}</option>`
        ).join('');
        labelInner = `<select class="vcard-sublabel-select" data-id="${id}">${opts}</select>`;
    } else {
        labelInner = `<span>${def.name}</span>`;
    }

    row.innerHTML = `
        <div class="vcard-field-label" data-id="${id}" title="Change field type">
            ${labelInner}
            <span class="label-chevron">▾</span>
        </div>
        <input class="vcard-field-input" type="text"
               placeholder="${def.placeholder}"
               value="${prefillValue || ''}"
               data-id="${id}">
        <button class="vcard-field-remove" data-id="${id}" title="Remove">×</button>`;

    fieldList.appendChild(row);

    // State entry
    const inputEl  = row.querySelector('.vcard-field-input');
    const selectEl = row.querySelector('.vcard-sublabel-select');
    const state    = { id, type: def.type, defaultSub: def.defaultSub,
                       sublabel: def.defaultSub, input: inputEl, el: row };
    vcardFields.push(state);

    // Sublabel change
    if (selectEl) {
        selectEl.addEventListener('change', () => {
            state.sublabel = selectEl.value;
            scheduleRender();
        });
    }

    // Input change
    inputEl.addEventListener('input', scheduleRender);

    // Label click → open relabel picker
    row.querySelector('.vcard-field-label').addEventListener('click', () => {
        openPicker('relabel', id);
    });

    // Remove
    row.querySelector('.vcard-field-remove').addEventListener('click', () => {
        removeField(id);
    });

    inputEl.focus();
    scheduleRender();
}

// ── Relabel an existing field ───────────────────────────────
function relabelField(id, newDef) {
    const state = vcardFields.find(f => f.id === id);
    if (!state) return;

    state.type       = newDef.type;
    state.defaultSub = newDef.defaultSub;
    state.sublabel   = newDef.defaultSub;

    const labelDiv = state.el.querySelector('.vcard-field-label');
    let labelInner = '';
    if (newDef.sublabels && newDef.sublabels.length > 1) {
        const opts = newDef.sublabels.map(s =>
            `<option value="${s}">${s}</option>`
        ).join('');
        labelInner = `<select class="vcard-sublabel-select" data-id="${id}">${opts}</select>`;
    } else {
        labelInner = `<span>${newDef.name}</span>`;
    }
    labelInner += `<span class="label-chevron">▾</span>`;
    labelDiv.innerHTML = labelInner;

    const newSelect = labelDiv.querySelector('.vcard-sublabel-select');
    if (newSelect) {
        newSelect.addEventListener('change', () => {
            state.sublabel = newSelect.value;
            scheduleRender();
        });
    }

    state.input.placeholder = newDef.placeholder;
    scheduleRender();
}

// ── Remove a field ──────────────────────────────────────────
function removeField(id) {
    const state = vcardFields.find(f => f.id === id);
    if (!state) return;

    // Slide-out animation
    state.el.style.transition = 'opacity .15s, transform .15s';
    state.el.style.opacity    = '0';
    state.el.style.transform  = 'translateX(8px)';
    setTimeout(() => {
        state.el.remove();
        vcardFields = vcardFields.filter(f => f.id !== id);
        scheduleRender();
    }, 160);
}

// ── Listen to fixed name/company inputs ─────────────────────
['vcardFirst','vcardLast','vcardCompany'].forEach(id => {
    document.getElementById(id).addEventListener('input', scheduleRender);
});

// ── Seed default fields (like a new iPhone contact) ─────────
function seedDefaultVcardFields() {
    const phoneDef = VCARD_FIELD_DEFS[0].fields[0];  // Phone
    const emailDef = VCARD_FIELD_DEFS[0].fields[1];  // Email
    addField(phoneDef);
    addField(emailDef);
}
seedDefaultVcardFields();