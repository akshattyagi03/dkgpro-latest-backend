const nodemailer = require('nodemailer')
const PDFDocument = require('pdfkit')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

const sendOTP = async (email, otp, userType) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `${userType} Registration - OTP Verification`,
    html: `
      <h2>OTP Verification</h2>
      <p>Your OTP for ${userType} registration is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 5 minutes.</p>
    `
  }
  await transporter.sendMail(mailOptions)
}

// ─── PDFKit helpers ───────────────────────────────────────────────────────────

/** Draw a filled rounded rectangle (PDFKit lacks a native roundedRect shortcut) */
const roundedRect = (doc, x, y, w, h, r, fillColor) => {
  doc.save()
    .roundedRect(x, y, w, h, r)
    .fill(fillColor)
    .restore()
}

/**
 * Simulate a horizontal linear gradient by drawing thin vertical slices.
 * colors: array of hex strings evenly distributed left→right.
 */
const gradientRect = (doc, x, y, w, h, colors) => {
  const steps = 120
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const seg = t * (colors.length - 1)
    const idx = Math.min(Math.floor(seg), colors.length - 2)
    const local = seg - idx
    const c1 = hexToRgb(colors[idx])
    const c2 = hexToRgb(colors[idx + 1])
    const r = Math.round(c1.r + (c2.r - c1.r) * local)
    const g = Math.round(c1.g + (c2.g - c1.g) * local)
    const b = Math.round(c1.b + (c2.b - c1.b) * local)
    doc.rect(x + (i / steps) * w, y, w / steps + 1, h).fill(`rgb(${r},${g},${b})`)
  }
}

const hexToRgb = (hex) => {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  }
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

const generateInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const buffers = []

    doc.on('data', chunk => buffers.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)

    // ── Constants ──────────────────────────────────────────────────────────────
    const PW = 595.28   // A4 width  (pts)
    const L  = 40       // left margin
    const R  = PW - 40  // right margin
    const CW = R - L    // content width = 515

    const orderNumber = `ORD-${order._id.toString().slice(-6).toUpperCase()}`
    const invoiceDate = new Date(order.updatedAt || Date.now()).toLocaleDateString('en-IN')
    const { street, city, state, zipCode, country } = order.shippingAddress || {}
    const subtotal    = order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)
    const taxAmount   = order.taxAmount || 0
    const totalAmount = order.totalAmount || subtotal + taxAmount

    // ── 1. HERO HEADER — deep purple gradient ──────────────────────────────────
    const heroH = 110
    gradientRect(doc, 0, 0, PW, heroH, ['#1a0533', '#2d1060', '#4a1a8c', '#6d28d9'])

    // Brand name
    doc.fontSize(28).fillColor('#ffffff').font('Helvetica-Bold')
      .text('DKGPro', L, 28, { lineBreak: false })

    // Tagline
    doc.fontSize(9.5).fillColor('rgba(255,255,255,0.55)').font('Helvetica')
      .text('Event & Wedding Services Partner', L, 63, { lineBreak: false })

    // "Invoice / Confirmed" block — right side
    doc.fontSize(9).fillColor('rgba(255,255,255,0.5)').font('Helvetica')
      .text('INVOICE', 0, 30, { align: 'right', width: R, lineBreak: false })
    doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold')
      .text('Confirmed', 0, 46, { align: 'right', width: R, lineBreak: false })
    doc.fontSize(9).fillColor('rgba(255,255,255,0.6)').font('Helvetica')
      .text(invoiceDate, 0, 74, { align: 'right', width: R, lineBreak: false })

    // ── 2. ACCENT STRIPE ───────────────────────────────────────────────────────
    gradientRect(doc, 0, heroH, PW, 4, ['#B15CDE', '#EC4899', '#f97316'])

    let y = heroH + 4 + 20   // cursor below stripe

    // ── 3. ORDER BADGE ─────────────────────────────────────────────────────────
    roundedRect(doc, L, y, CW, 52, 6, '#f8f4ff')
    // purple left accent bar
    doc.rect(L, y, 4, 52).fill('#B15CDE')

    doc.fontSize(8).fillColor('#9333ea').font('Helvetica-Bold')
      .text('ORDER NUMBER', L + 16, y + 10, { lineBreak: false })
    doc.fontSize(18).fillColor('#1a1a2e').font('Helvetica-Bold')
      .text(orderNumber, L + 16, y + 22, { lineBreak: false })

    // "✓ CONFIRMED" pill (simulated with rounded rect + text)
    const pillW = 110, pillH = 22, pillX = R - pillW, pillY = y + 15
    gradientRect(doc, pillX, pillY, pillW, pillH, ['#B15CDE', '#EC4899'])
    doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
      .text('✓  CONFIRMED', pillX, pillY + 6, { width: pillW, align: 'center', lineBreak: false })

    y += 52 + 18

    // ── 4 (fixed). META ROW  (Date / Invoice No) ─────────────────────────────
    // Draw left side (Date) normally
    doc.fontSize(9.5).fillColor('#6b7280').font('Helvetica')
      .text('Date: ', L, y, { lineBreak: false })
    doc.fontSize(9.5).fillColor('#1a1a2e').font('Helvetica-Bold')
      .text(invoiceDate, L + 32, y, { lineBreak: false })

    // Draw right side (Invoice No) independently at a fixed x position
    const invoiceNoLabel = 'Invoice No: '
    const invoiceNoValue = orderNumber
    const labelW = doc.widthOfString(invoiceNoLabel)
    const valueW = doc.widthOfString(invoiceNoValue)
    const rightBlockX = R - labelW - valueW - 2
    doc.fontSize(9.5).fillColor('#6b7280').font('Helvetica')
      .text(invoiceNoLabel, rightBlockX, y, { lineBreak: false })
    doc.fontSize(9.5).fillColor('#1a1a2e').font('Helvetica-Bold')
      .text(invoiceNoValue, rightBlockX + labelW, y, { lineBreak: false })

    y += 24
    doc.moveTo(L, y).lineTo(R, y).strokeColor('#ede9fe').lineWidth(1).stroke()
    y += 16

    // ── 7. TABLE ──────────────────────────────────────────────────────────────
    const colX  = { svc: L,       desc: L+130, rate: L+320, qty: L+400, amt: L+455 }
    const colW  = { svc: 124,     desc: 184,   rate: 74,    qty: 50,    amt: 60   }
    const rowH  = 28
    const hdrH  = 26

    // Table header — purple gradient (NO .clip() — that was breaking row rendering)
    gradientRect(doc, L, y, CW, hdrH, ['#4a1a8c', '#7c3aed'])

    doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold')
    doc.text('SERVICE',     colX.svc  + 6, y + 9, { width: colW.svc,  lineBreak: false })
    doc.text('DESCRIPTION', colX.desc + 6, y + 9, { width: colW.desc, lineBreak: false })
    doc.text('RATE',        colX.rate,     y + 9, { width: colW.rate, align: 'right', lineBreak: false })
    doc.text('QTY',         colX.qty,      y + 9, { width: colW.qty,  align: 'right', lineBreak: false })
    doc.text('AMOUNT',      colX.amt,      y + 9, { width: colW.amt,  align: 'right', lineBreak: false })

    y += hdrH

    // Table rows
    order.items.forEach((item, index) => {
      const service     = item.product?.name || 'Product'
      const description = item.product?.description || ''
      const qty         = item.quantity || 0
      const rate        = item.price || 0
      const amount      = rate * qty
      const rowBg       = index % 2 === 0 ? '#ffffff' : '#fafbff'

      // Background
      doc.rect(L, y, CW, rowH).fill(rowBg)
      // Bottom border
      doc.moveTo(L, y + rowH).lineTo(R, y + rowH).strokeColor('#ede9fe').lineWidth(0.5).stroke()

      // Service name (bold, dark)
      doc.fontSize(9).fillColor('#1a1a2e').font('Helvetica-Bold')
        .text(service, colX.svc + 6, y + 9, { width: colW.svc - 6, lineBreak: false })
      // Description (grey)
      doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
        .text(description, colX.desc + 6, y + 9, { width: colW.desc - 6, lineBreak: false })
      // Rate
      doc.fontSize(9).fillColor('#374151').font('Helvetica')
        .text(`Rs.${rate.toLocaleString('en-IN')}`, colX.rate, y + 9, { width: colW.rate, align: 'right', lineBreak: false })
      // Qty
      doc.fontSize(9).fillColor('#374151').font('Helvetica')
        .text(String(qty), colX.qty, y + 9, { width: colW.qty, align: 'right', lineBreak: false })
      // Amount (bold)
      doc.fontSize(9).fillColor('#1a1a2e').font('Helvetica-Bold')
        .text(`Rs.${amount.toLocaleString('en-IN')}`, colX.amt, y + 9, { width: colW.amt, align: 'right', lineBreak: false })

      y += rowH
    })

    y += 16

    // ── 8. TOTALS BLOCK ───────────────────────────────────────────────────────
    const totW = 210, totX = R - totW
    const totRowH = 26

    // Sub Total row
    doc.rect(totX, y, totW, totRowH).fill('#f8f4ff')
    doc.fontSize(9.5).fillColor('#6b7280').font('Helvetica')
      .text('Sub Total', totX + 12, y + 8, { width: 90, lineBreak: false })
    doc.fontSize(9.5).fillColor('#374151').font('Helvetica-Bold')
      .text(`Rs.${subtotal.toLocaleString('en-IN')}`, totX + 12, y + 8, { width: totW - 24, align: 'right', lineBreak: false })
    y += totRowH

    // Divider
    doc.moveTo(totX, y).lineTo(R, y).strokeColor('#ede9fe').lineWidth(0.5).stroke()

    // Tax row
    doc.rect(totX, y, totW, totRowH).fill('#f8f4ff')
    doc.fontSize(9.5).fillColor('#6b7280').font('Helvetica')
      .text(`Tax (${taxAmount ? 'incl.' : '0%'})`, totX + 12, y + 8, { width: 90, lineBreak: false })
    doc.fontSize(9.5).fillColor('#374151').font('Helvetica-Bold')
      .text(`Rs.${taxAmount.toLocaleString('en-IN')}`, totX + 12, y + 8, { width: totW - 24, align: 'right', lineBreak: false })
    y += totRowH

    // Total row — gradient
    gradientRect(doc, totX, y, totW, totRowH + 4, ['#B15CDE', '#EC4899'])
    doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold')
      .text('Total', totX + 12, y + 9, { width: 80, lineBreak: false })
    doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold')
      .text(`Rs.${totalAmount.toLocaleString('en-IN')}`, totX + 12, y + 9, { width: totW - 24, align: 'right', lineBreak: false })
    y += totRowH + 4 + 30

    // ── 9. FOOTER — pinned near bottom if content is short, otherwise inline ──
    const PH = 841.89  // A4 height (pts)
    const footerH = 60
    // Push footer down to at least 40pt from page bottom, but never overlap content
    const footerY = Math.max(y, PH - footerH - 40)
    y = footerY

    doc.moveTo(L, y).lineTo(R, y).strokeColor('#ede9fe').lineWidth(1).stroke()
    y += 14

    // "Questions?" line — draw label and email separately to avoid continued-mode quirks
    doc.fontSize(9).fillColor('#374151').font('Helvetica')
      .text('Questions? Reach us at', L, y, { lineBreak: false })
    const reachW = doc.widthOfString('Questions? Reach us at ')
    doc.fontSize(9).fillColor('#9333ea').font('Helvetica-Bold')
      .text('dkgpro311@gmail.com', L + reachW, y, { lineBreak: false })

    y += 16
    doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
      .text(
        `Thank you for choosing DKGPro  ·  Payment due within 30 days  ·  \u00A9 ${new Date().getFullYear()} DKGPro. All rights reserved.`,
        L, y, { width: CW, align: 'center', lineBreak: false }
      )

    y += 16
    // Bottom gradient bar
    gradientRect(doc, L, y, CW, 3, ['#B15CDE', '#EC4899', '#f97316'])

    doc.end()
  })
}

const sendOrderConfirmationEmail = async (email, order) => {
  // ── Inline SVG logo (encoded for safe embedding in HTML attributes/img src) ──
  const logoSvg = `<svg width="160" height="45" viewBox="0 0 2000 558" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M321.184 470.788C285.583 436.909 275.577 430.457 242.124 395.483C191.112 345.55 110.364 265.547 118.368 184.736C127.469 92.8948 231.741 53.5752 297.116 120.747C305.797 129.667 312.897 139.41 319.692 149.822C338.96 120.942 365.063 93.4617 401.227 88.1856C499.82 73.8019 551.686 183.37 504.369 261.558L498.498 270.396C509.15 211.898 486.126 139.259 422.356 124.042C379.788 113.883 344.587 138.122 320.218 170.578C319.498 170.731 319.238 170.12 318.828 169.731C315.775 166.849 312.402 161.306 309.304 157.898C277.036 122.424 234.951 109.802 191.345 134.731C160.147 152.567 147.286 184.019 151.367 219.271C153.733 239.72 173.424 290.779 193.073 314.428C318.493 465.386 278.997 422.208 321.184 470.788Z" fill="url(#g0)"/><path d="M446.646 456.108C443.699 452.027 441.184 448.433 437.684 445.008C432.408 439.843 424.993 434.602 425.821 426.243C426.763 416.743 437.548 412.676 444.311 419.624C445.209 420.547 445.943 421.555 446.646 422.632C448.639 419.644 451.339 416.802 455.08 416.256C465.278 414.768 470.643 426.102 465.749 434.19L465.141 435.104C466.243 429.053 463.862 421.539 457.265 419.965C452.862 418.914 449.221 421.422 446.7 424.779C446.626 424.795 446.599 424.731 446.557 424.691C446.241 424.393 445.892 423.82 445.571 423.467C442.234 419.798 437.88 418.492 433.37 421.071C430.143 422.916 428.812 426.169 429.235 429.815C429.479 431.931 430.158 433.319 431.449 434.944C444.151 450.932 442.87 450.624 446.646 456.108Z" fill="url(#g1)"/><path d="M468.54 420.697C463.786 419.042 459.664 417.539 454.834 416.739C447.549 415.531 438.47 415.487 434.357 408.163C429.682 399.84 436.189 390.324 445.712 392.141C446.977 392.382 448.157 392.787 449.35 393.267C449.27 389.677 449.854 385.8 452.606 383.208C460.109 376.143 471.002 382.354 471.628 391.787L471.654 392.884C469.088 387.294 462.83 382.503 456.523 384.994C452.312 386.657 450.766 390.799 450.625 394.995C450.573 395.051 450.515 395.014 450.457 395.005C450.027 394.942 449.413 394.672 448.948 394.567C444.11 393.474 439.795 394.9 437.577 399.598C435.99 402.96 436.765 406.388 439.201 409.134C440.614 410.727 441.966 411.475 443.955 412.067C463.528 417.886 462.301 418.368 468.54 420.697Z" fill="url(#g2)"/><path d="M462.309 380.384C459.483 381.046 457.013 381.586 454.414 382.687C450.495 384.348 446.06 387.128 441.797 384.832C436.952 382.221 437.184 375.581 442.381 373.526C443.072 373.253 443.771 373.086 444.5 372.951C443.353 371.228 442.441 369.16 442.981 367.049C444.454 361.293 451.674 360.956 454.89 365.355L455.242 365.881C452.267 363.952 447.741 363.55 445.439 366.71C443.903 368.819 444.428 371.313 445.654 373.399C445.646 373.442 445.606 373.443 445.576 373.456C445.347 373.558 444.964 373.616 444.706 373.709C442.013 374.669 440.351 376.695 440.722 379.667C440.987 381.794 442.422 383.224 444.456 383.809C445.635 384.148 446.524 384.096 447.675 383.77C459.001 380.563 458.553 381.176 462.309 380.384Z" fill="url(#g3)"/><path d="M474.063 329.41C473.715 329.41 473.37 329.42 473.025 329.44H415.514C415.514 329.44 460.004 328.641 484.325 301.971C508.646 275.303 484.851 238.487 449.295 249.767C413.735 261.049 394.29 319.284 394.29 319.284C371.379 277.014 354.629 275.433 354.629 275.433C337.978 271.27 317.683 289.093 332.896 308.391C348.113 327.689 377.332 329.44 377.332 329.44H314.75C314.408 329.42 314.06 329.41 313.711 329.41C303.654 329.41 295.503 337.561 295.503 347.618C295.503 357.675 303.644 365.813 313.694 365.823V432.899C313.694 447.744 325.729 459.778 340.573 459.778H447.454C462.152 459.778 474.063 447.864 474.063 433.169V365.823C484.117 365.823 492.268 357.672 492.268 347.618C492.268 337.565 484.117 329.41 474.063 329.41ZM384.12 449.595H340.42C331.281 449.595 323.874 442.188 323.874 433.05V365.854H384.12V449.595ZM384.12 355.671H313.694C309.269 355.653 305.686 352.061 305.686 347.632C305.686 343.203 309.269 339.61 313.694 339.593H313.725C313.957 339.593 314.186 339.603 314.411 339.624H384.12V355.671ZM345.815 293.976C359.475 277.974 387.768 317.338 390.909 325.202C390.909 325.202 335.082 316.027 345.815 293.976ZM401.096 322.669C401.096 322.669 450.452 246.946 469.251 274.982C483.871 302.462 408.923 323.198 401.096 322.669ZM463.88 433.067C463.88 442.195 456.48 449.595 447.351 449.595H403.637V365.854H463.88V433.067ZM474.172 355.671H403.637V339.624H473.39C473.612 339.603 473.838 339.593 474.063 339.593H474.077C479.356 339.593 483.451 344.685 481.709 350.227C480.763 353.236 477.324 355.671 474.172 355.671Z" fill="url(#g4)"/><path d="M1718.09 313.243C1718.09 262.478 1747.63 219.752 1800.14 219.752C1852.64 219.752 1882.19 262.514 1882.19 313.243C1882.19 363.972 1852.64 406.735 1800.14 406.735C1747.63 406.735 1718.09 363.972 1718.09 313.243ZM1731.3 313.243C1731.3 356.006 1755.27 395.293 1800.14 395.293C1845 395.293 1868.97 356.006 1868.97 313.243C1868.97 270.48 1845 231.194 1800.14 231.194C1755.27 231.194 1731.3 270.48 1731.3 313.243Z" fill="#EA499B"/><path d="M1642.92 223.916V263.528H1643.97C1650.92 240.246 1680.1 221.453 1712.44 222.866V236.082C1698.53 234.344 1679.05 237.82 1663.08 253.462C1649.87 267.004 1644.33 278.157 1642.92 304.915V402.607H1629.7V223.952H1642.92V223.916Z" fill="#EA499B"/><path d="M1442.03 167.611V278.845H1529.29C1574.12 278.845 1589.43 249.298 1589.43 223.59C1589.43 205.159 1581.11 167.611 1531.39 167.611H1442.06H1442.03ZM1426.75 402.571V154.394H1532.4C1560.57 154.394 1604.71 164.46 1604.71 223.916C1604.71 267.366 1576.22 292.061 1526.86 292.061H1442.06V402.607H1426.78L1426.75 402.571Z" fill="#EA499B"/><path d="M1385.98 267.729V402.933H1344.63L1340.79 376.175C1329.67 388.341 1318.19 396.669 1307.08 401.195C1295.96 406.047 1281.69 408.147 1264.31 408.147C1229.19 408.147 1201.06 396.669 1179.84 373.387C1158.29 350.43 1147.87 319.87 1147.87 281.633C1147.87 243.396 1159.34 210.374 1182.26 186.041C1205.22 161.709 1235.45 149.542 1273.33 149.542C1303.56 149.542 1328.58 157.545 1348.07 172.825C1367.55 188.467 1378.99 210.699 1382.46 239.558H1319.89C1312.94 215.914 1297.3 204.435 1272.28 204.435C1258.38 204.435 1246.57 207.911 1237.52 215.551C1228.47 223.191 1222.24 232.244 1218.76 243.36C1215.29 254.15 1213.55 266.316 1213.55 279.859C1213.55 302.815 1218.4 321.571 1228.14 335.476C1237.88 349.742 1253.85 356.694 1275.76 356.694C1290.71 356.694 1302.19 353.58 1309.83 346.628C1317.47 339.676 1323.37 328.886 1326.85 314.293H1282.02V267.729H1385.94H1385.98Z" fill="#B25CDD"/><path d="M1125.52 155.082L1033.77 252.05L1137 402.571H1056.69L989.956 298.651L963.523 326.098V402.571H899.578V155.082H962.835V249.624L1045.57 155.082H1125.52Z" fill="#B25CDD"/><path d="M635.832 402.571V155.408H741.852C780.089 155.408 809.635 165.836 831.18 187.381C852.724 208.925 863.514 238.834 863.514 277.758C863.514 319.109 852.724 350.394 831.868 371.25C810.649 392.106 779.365 402.535 738.376 402.535H635.832V402.571ZM700.139 349.054H735.588C777.301 349.054 798.519 325.772 798.519 279.533C798.519 256.938 792.617 239.558 781.139 227.392C769.66 214.863 752.968 208.961 731.098 208.961H700.175V349.054H700.139Z" fill="#B25CDD"/><defs><linearGradient id="g0" x1="522.088" y1="277.829" x2="117.815" y2="277.829" gradientUnits="userSpaceOnUse"><stop stop-color="#B15CDE"/><stop offset="1" stop-color="#EC4899"/></linearGradient><linearGradient id="g1" x1="494.237" y1="353.166" x2="295.503" y2="353.166" gradientUnits="userSpaceOnUse"><stop stop-color="#B15CDE"/><stop offset="1" stop-color="#EC4899"/></linearGradient><linearGradient id="g2" x1="494.237" y1="353.166" x2="295.503" y2="353.166" gradientUnits="userSpaceOnUse"><stop stop-color="#B15CDE"/><stop offset="1" stop-color="#EC4899"/></linearGradient><linearGradient id="g3" x1="494.237" y1="353.166" x2="295.503" y2="353.166" gradientUnits="userSpaceOnUse"><stop stop-color="#B15CDE"/><stop offset="1" stop-color="#EC4899"/></linearGradient><linearGradient id="g4" x1="494.237" y1="353.166" x2="295.503" y2="353.166" gradientUnits="userSpaceOnUse"><stop stop-color="#B15CDE"/><stop offset="1" stop-color="#EC4899"/></linearGradient></defs></svg>`

  // Encode SVG as base64 data URI for <img> tag (works in all email clients)
  const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`

  const itemRows = order.items.map((item, index) => {
    const description = item.product?.description || ''
    const rate = item.price || 0
    const amount = rate * (item.quantity || 0)
    const rowBg = index % 2 === 0 ? '#ffffff' : '#fafbff'

    return `
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #f0f0f7;font-weight:600;color:#1a1a2e;font-size:13px;background:${rowBg};">${item.product?.name || 'Product'}</td>
        <td style="padding:14px 18px;border-bottom:1px solid #f0f0f7;color:#6b7280;font-size:13px;background:${rowBg};">${description}</td>
        <td style="padding:14px 18px;border-bottom:1px solid #f0f0f7;text-align:right;color:#374151;font-size:13px;background:${rowBg};">Rs.${rate.toLocaleString('en-IN')}</td>
        <td style="padding:14px 18px;border-bottom:1px solid #f0f0f7;text-align:right;color:#374151;font-size:13px;background:${rowBg};">${item.quantity || 0}</td>
        <td style="padding:14px 18px;border-bottom:1px solid #f0f0f7;text-align:right;font-weight:600;color:#1a1a2e;font-size:13px;background:${rowBg};">Rs.${amount.toLocaleString('en-IN')}</td>
      </tr>
    `
  }).join('')

  const { street, city, state, zipCode, country } = order.shippingAddress || {}
  const addressLine = [street, city, state, zipCode, country].filter(Boolean).join('<br/>')
  const orderNumber = `ORD-${order._id.toString().slice(-6).toUpperCase()}`
  const invoiceDate = new Date(order.updatedAt || Date.now()).toLocaleDateString('en-IN')
  const taxAmount = order.taxAmount || 0
  const subtotal = order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)

  const pdfBuffer = await generateInvoicePDF(order)

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Order Confirmed – ${orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <!-- Email wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">

          <!-- ═══════════════════════════════════════ -->
          <!-- HERO HEADER — gradient band with logo  -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a0533 0%,#2d1060 40%,#4a1a8c 70%,#6d28d9 100%);padding:36px 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    <!-- Logo image via base64 data URI -->
                    <img src="${logoDataUri}" alt="DKGPro" width="160" height="45"
                         style="display:block;border:0;outline:none;text-decoration:none;" />
                    <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.55);letter-spacing:0.8px;text-transform:uppercase;">Event &amp; Wedding Services Partner</p>
                  </td>
                  <td valign="middle" align="right">
                    <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.5);">Invoice</p>
                    <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Confirmed</p>
                    <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.6);">${invoiceDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- ACCENT STRIPE                           -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#B15CDE,#EC4899,#f97316);"></td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- ORDER BADGE                             -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:28px 40px 0;background:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#f8f4ff;border-radius:10px;padding:16px 20px;border-left:4px solid #B15CDE;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#9333ea;">Order Number</p>
                          <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#1a1a2e;letter-spacing:-0.3px;">${orderNumber}</p>
                        </td>
                        <td align="right">
                          <span style="display:inline-block;background:linear-gradient(135deg,#B15CDE,#EC4899);color:#fff;font-size:12px;font-weight:700;letter-spacing:0.6px;padding:6px 16px;border-radius:20px;">✓ &nbsp;CONFIRMED</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- PARTIES: BILLED TO / PAY TO            -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:24px 40px;background:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- Billed To -->
                  <td width="48%" valign="top" style="background:#fafbff;border:1px solid #ede9fe;border-radius:10px;padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9333ea;">Billed To</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a2e;">${order.user?.fullName || 'Customer'}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">${order.user?.email || ''}${addressLine ? `<br/>${addressLine}` : ''}</p>
                  </td>
                  <td width="4%"></td>
                  <!-- Pay To -->
                  <td width="48%" valign="top" style="background:#fafbff;border:1px solid #ede9fe;border-radius:10px;padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9333ea;">Pay To</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a2e;">DKGPro</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">Event &amp; Wedding Services Partner<br/><a href="mailto:dkgpro311@gmail.com" style="color:#9333ea;text-decoration:none;">dkgpro311@gmail.com</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- SECTION TITLE: Services                 -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:0 40px 12px;background:#ffffff;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9333ea;border-bottom:2px solid #f3e8ff;padding-bottom:10px;">Services &amp; Items</p>
            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- ITEMS TABLE                             -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:0 40px;background:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:10px;overflow:hidden;border:1px solid #ede9fe;">
                <!-- Table header -->
                <thead>
                  <tr style="background:linear-gradient(135deg,#4a1a8c,#7c3aed);">
                    <th style="padding:12px 18px;text-align:left;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);">Service</th>
                    <th style="padding:12px 18px;text-align:left;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);">Description</th>
                    <th style="padding:12px 18px;text-align:right;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);">Rate</th>
                    <th style="padding:12px 18px;text-align:right;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);">QTY</th>
                    <th style="padding:12px 18px;text-align:right;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- TOTALS                                  -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:16px 40px 0;background:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="55%"></td>
                  <td width="45%">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:10px;overflow:hidden;border:1px solid #ede9fe;">
                      <tr style="background:#f8f4ff;">
                        <td style="padding:10px 16px;font-size:13px;color:#6b7280;">Sub Total</td>
                        <td style="padding:10px 16px;font-size:13px;color:#374151;text-align:right;font-weight:600;">Rs.${subtotal.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr style="background:#f8f4ff;border-top:1px solid #ede9fe;">
                        <td style="padding:10px 16px;font-size:13px;color:#6b7280;">Tax (${taxAmount ? 'incl.' : '0%'})</td>
                        <td style="padding:10px 16px;font-size:13px;color:#374151;text-align:right;font-weight:600;">Rs.${taxAmount.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr style="background:linear-gradient(135deg,#B15CDE,#EC4899);">
                        <td style="padding:14px 16px;font-size:15px;font-weight:800;color:#ffffff;">Total</td>
                        <td style="padding:14px 16px;font-size:15px;font-weight:800;color:#ffffff;text-align:right;">Rs.${order.totalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- PDF ATTACHMENT NOTE                     -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:24px 40px 0;background:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#92400e;">
                      📎 &nbsp;<strong>Invoice PDF attached</strong> — A detailed invoice has been attached to this email for your records.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- FOOTER                                  -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:32px 40px 36px;background:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #f0ebff;padding-top:24px;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#374151;">Questions? Reach us at <a href="mailto:dkgpro311@gmail.com" style="color:#9333ea;text-decoration:none;font-weight:600;">dkgpro311@gmail.com</a></p>
                    <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;line-height:1.6;">
                      Thank you for choosing DKGPro · Payment due within 30 days<br/>
                      © ${new Date().getFullYear()} DKGPro. All rights reserved.
                    </p>
                    <!-- Bottom gradient bar -->
                    <div style="margin-top:20px;height:3px;background:linear-gradient(90deg,#B15CDE,#EC4899,#f97316);border-radius:2px;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `

  const mailOptions = {
    from: `DKGPro <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Order Confirmed – ${orderNumber} | DKGPro`,
    html: emailHtml,
    attachments: [
      {
        filename: `Invoice-${orderNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  }

  await transporter.sendMail(mailOptions)
}

const sendOrderNotificationToSuperAdmin = async (superAdminEmail, order) => {
  const orderNumber = `ORD-${order._id.toString().slice(-6).toUpperCase()}`
  const { street, city, state, zipCode, country } = order.shippingAddress || {}
  const addressLine = [street, city, state, zipCode, country].filter(Boolean).join(', ')

  const itemRows = order.items.map(item => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${item.product?.name || 'Product'}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.quantity}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">Rs.${item.price.toLocaleString('en-IN')}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">Rs.${(item.price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>
  `).join('')

  const pdfBuffer = await generateInvoicePDF(order)

  const mailOptions = {
    from: `DKGPro <${process.env.EMAIL_USER}>`,
    to: superAdminEmail,
    subject: `New Confirmed Order - ${orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#667eea">📦 New Order Confirmed</h2>
        <p>A new order has been confirmed. Please find the invoice attached.</p>

        <table style="width:100%;border-collapse:collapse;margin:10px 0">
          <tr><td style="padding:6px;color:#666"><strong>Order ID:</strong></td><td style="padding:6px">${orderNumber}</td></tr>
          <tr><td style="padding:6px;color:#666"><strong>Customer:</strong></td><td style="padding:6px">${order.user?.fullName || 'N/A'}</td></tr>
          <tr><td style="padding:6px;color:#666"><strong>Email:</strong></td><td style="padding:6px">${order.user?.email || 'N/A'}</td></tr>
          <tr><td style="padding:6px;color:#666"><strong>Payment ID:</strong></td><td style="padding:6px">${order.razorpayPaymentId || 'N/A'}</td></tr>
          ${addressLine ? `<tr><td style="padding:6px;color:#666"><strong>Address:</strong></td><td style="padding:6px">${addressLine}</td></tr>` : ''}
        </table>

        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <thead>
            <tr style="background:#667eea;color:white">
              <th style="padding:8px;text-align:left">Product</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:right">Price</th>
              <th style="padding:8px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:8px;text-align:right;font-weight:bold">Order Total</td>
              <td style="padding:8px;text-align:right;font-weight:bold">Rs.${order.totalAmount.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `,
    attachments: [
      {
        filename: `Invoice-${orderNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  }

  await transporter.sendMail(mailOptions)
}

module.exports = { sendOTP, sendOrderConfirmationEmail, sendOrderNotificationToSuperAdmin, generateInvoicePDF }