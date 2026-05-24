# QRme

A fully offline, browser-based QR code generator with live preview, rich customization, and 13 QR types — no server, no tracking, no dependencies beyond a single JS library.

---

## Features

### 13 QR Types
| Type | Format | Use Case |
|---|---|---|
| URL | `https://…` | Website, landing page, social link |
| Text | Plain string | Any free-form text |
| WiFi | `WIFI:T:WPA;S:…` | Instant network join on scan |
| vCard | vCard 3.0 | Full contact card with dynamic fields |
| WhatsApp | `https://wa.me/…` | Pre-filled message to a number |
| SMS | RFC 5724 `sms:` | Text message with body |
| Email | `mailto:` | Pre-addressed email with subject & body |
| Phone | `tel:` | Tap-to-call |
| Crypto | BIP-21 URI | Bitcoin, Ethereum, Litecoin payments |
| Event | iCal VEVENT | Add to calendar on scan |
| Location | `geo:` / Google Maps | Coordinates or place name |
| App Link | App Store / Play Store URL | Deep-link to iOS or Android app |
| eSIM | GSMA SGP.22 `LPA:1$…` | eSIM profile activation |

### Design & Customization
- 6 dot patterns: Square, Dots, Rounded, Extra Rounded, Classy, Classy Rounded
- 3 outer corner shapes and 2 inner corner shapes
- 4 error correction levels (L / M / Q / H)
- QR size slider — 150 px to 600 px
- Quiet zone (margin) slider — 0 to 60 px
- 7 one-click color presets: Classic, Ocean, Forest, Rose, Neon, Gold, Midnight
- Full manual color control for background, pattern, outer corners, and inner corners
- Transparent background option

### Logo
- Upload any image (PNG, JPG, SVG, WebP)
- Logo size slider (10 – 60 % of QR area)
- Logo margin slider
- Toggle to hide QR dots behind the logo

### Frame & Label
- Optional decorative frame with 3 styles: Simple Border, Bottom Banner, Rounded Card
- Custom frame color, label text, and label text color
- Framed version exports as a composite PNG

### vCard — iPhone-style Dynamic Fields
- Fixed name block (first, last, company) always visible
- Starts with Phone + Email pre-seeded, just like iOS Contacts
- "add field" button opens a grouped picker sheet (Contact, Personal, Work, Social)
- Each field row has a clickable label pill to change its type at any time
- Sub-label dropdowns (mobile / home / work / iCloud / other…) inside each row
- Supported field types: Phone, Email, Website, Birthday, Nickname, Note, Job Title, Address, and 6 social networks (X, LinkedIn, Instagram, YouTube, Facebook, TikTok)
- Remove any field with the × button (animated slide-out)
- Generates valid vCard 3.0 output on every keystroke

### Export
| Button | Output |
|---|---|
| ⬇ PNG | Full-resolution raster, includes frame if enabled |
| ⬇ SVG | Infinitely scalable vector — ideal for print |
| ⬇ JPEG | Compressed raster |
| ⧉ Copy | Copies QR image to clipboard (falls back to raw data string) |

### Usability
- Live preview updates as you type (120 ms debounce)
- Raw QR data display shows the exact string being encoded
- QR history — last 8 generated QRs saved in `localStorage`, click any to restore
- Toast notification on copy / restore
- Light / dark mode toggle (persists via CSS class)

---

## File Structure

```
project/
├── index.html          # UI structure — tabs, forms, controls, preview panel
├── styles.css          # Complete stylesheet — dark/light theme, all components
├── app.js              # All logic — QR rendering, data builders, export, history
└── qr-code-styling.js  # Third-party library (QRCodeStyling)
```

---

## Setup

No build step, no npm, no server required.

1. Download or clone all four files into the same folder.
2. Open `index.html` in any modern browser.
3. That's it — works fully offline.

```
project/
  index.html
  styles.css
  app.js
  qr-code-styling.js   ← must be in the same folder
```

> The only external dependency is `qr-code-styling.js`. You can download it from the [qr-code-styling GitHub releases](https://github.com/kozakdenys/qr-code-styling) or use the version you already have.

---

## Browser Compatibility

| Browser | Support |
|---|---|
| Chrome 90+ | ✅ Full (including clipboard image copy) |
| Firefox 90+ | ✅ Full |
| Safari 15+ | ✅ Full |
| Edge 90+ | ✅ Full |
| Mobile Chrome / Safari | ✅ Full |

Clipboard image copy (`⧉ Copy`) requires a secure context (HTTPS or `localhost`) in Chrome and Edge. On unsupported browsers it falls back to copying the raw QR data string.

---

## QR Format Reference

### WiFi
```
WIFI:T:WPA;S:MyNetwork;P:MyPassword;H:false;;
```
Special characters in SSID or password (`\ ; , "`) are automatically escaped.

### vCard 3.0
```
BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
ORG:Acme Corp
TITLE:Developer
TEL;TYPE=MOBILE:+1234567890
EMAIL;TYPE=HOME:john@example.com
URL;TYPE=HOMEPAGE:https://example.com
ADR;TYPE=HOME:;;123 Main St, City;;;
X-SOCIALPROFILE;type=linkedin:https://linkedin.com/in/johndoe
END:VCARD
```

### Crypto (BIP-21)
```
bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7Divfna?amount=0.001&label=Invoice+42
```

### Calendar Event (iCal VEVENT)
```
BEGIN:VEVENT
SUMMARY:Team Meeting
DTSTART:20251201T090000Z
DTEND:20251201T100000Z
LOCATION:Conference Room B
DESCRIPTION:Weekly sync
END:VEVENT
```

### eSIM (GSMA SGP.22)
```
LPA:1$rsp.truphone.com$ACT-12345
```

---

## Architecture Notes

**`app.js` is split into clear sections:**

- **State** — `currentType`, `logoDataUrl`, history key
- **QRCodeStyling instance** — created once, updated via `.update()` on every render (no re-mount)
- **`dataBuilders` object** — one function per QR type, each reads the DOM and returns the encoded string
- **`buildOptions()`** — collects all design controls into a single options object passed to `.update()`
- **`scheduleRender()`** — 120 ms debounce wrapping `render()` so live typing doesn't thrash the canvas
- **vCard field system** — fully self-contained at the bottom of the file; `vcardFields` array tracks all dynamic rows, `VCARD_FIELD_DEFS` defines available types and their sublabels

**`styles.css` uses CSS custom properties** (`--bg-panel`, `--accent`, etc.) defined on `:root` for dark mode and overridden on `.light-mode` for light mode. No external CSS framework.

---

## Customization Tips

**Add a new QR type:**
1. Add a `<button class="tab-btn" data-type="mytype">` in the `#tabContainer` in `index.html`
2. Add a `<div id="form-mytype" class="qr-form">` with your inputs
3. Add a `mytype()` function to the `dataBuilders` object in `app.js`
4. Add the input IDs to the `watchIds` array so they trigger re-renders

**Change default colors:**
Edit the initial `QRCodeStyling` options object at the top of `app.js` and the matching `value` attributes on the color `<input>` elements in `index.html`.

**Add a new color preset:**
Add an entry to the `PRESETS` object in `app.js` and a matching `<button class="preset-btn" data-preset="mypreset">` in `index.html`.

---

## License

MIT — free to use, modify, and distribute.
