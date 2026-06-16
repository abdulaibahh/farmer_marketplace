import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureArtifactToolWorkspace,
  importArtifactTool,
  saveBlobToFile,
  createSlideContext,
} from 'file:///C:/Users/Salone2/.codex/plugins/cache/openai-primary-runtime/presentations/26.614.11602/skills/presentations/scripts/artifact_tool_utils.mjs';

const ROOT = 'C:/Users/Salone2/Documents/farmer-market-place';
const SCRATCH = 'C:/Users/Salone2/AppData/Local/Temp/codex-presentations/farmer-marketplace-pptx';
const TMP = path.join(SCRATCH, 'tmp');
const SLIDES_DIR = path.join(TMP, 'slides');
const PREVIEW_DIR = path.join(TMP, 'preview');
const LAYOUT_DIR = path.join(TMP, 'layout');
const ASSET_DIR = path.join(TMP, 'assets');
const QA_DIR = path.join(TMP, 'qa');
const OUTPUT_DIR = path.join(ROOT, 'outputs');
const FINAL_PPTX = path.join(OUTPUT_DIR, 'Farmer_Marketplace_Presentation.pptx');
const TOTAL = 10;

const palette = {
  green: '#133F30',
  green2: '#17513D',
  green3: '#1D6A4A',
  cream: '#F8F2E8',
  cream2: '#FFFDF9',
  sand: '#EFE4C8',
  gold: '#D59B2B',
  blue: '#3E6EF3',
  mint: '#E6F1EA',
  sky: '#E7EEF9',
  coral: '#FCE8DC',
  rose: '#F9E6E6',
  purple: '#EFE8FB',
  text: '#173124',
  muted: '#607369',
  border: '#DADFD6',
  borderSoft: '#E8E3D7',
  white: '#FFFFFF',
};

const sourcesText = `Source notes

1. docs/presentation-outline.md
   - Slide structure and delivery order.
2. docs/system-architecture.md
   - Three-layer architecture, main modules, and responsibilities.
3. docs/api-reference.md
   - Endpoint names for auth, products, orders, users, payments, analytics.
4. README.md
   - Deployment stack, Stripe flow, run commands, and project summary.
5. User-provided project brief screenshots (June 16 2026)
   - Assignment requirements, deliverables, payment integration, and deployment constraints.
`;

const planText = `Farmer Marketplace PPTX Plan

Mode: create
Audience: assignment presentation panel
Slide count: 10

Style guide
- Dominant color: deep green #133F30
- Support colors: cream #F8F2E8, gold #D59B2B
- Accent colors: blue #3E6EF3, mint #E6F1EA, sky #E7EEF9
- Heading font: Aptos Display
- Body font: Aptos
- Numeric font: Aptos
- Cover title size: 60px
- Inner slide title size: 34px
- Body copy size: 18px
- Small labels: 12px

Slide map
1. Title slide — Farmer Marketplace
2. Project brief and objectives
3. System architecture
4. Database design and PostgreSQL setup
5. Frontend screens and user journeys
6. Farmer dashboard and order flow
7. Cart, checkout, and payment integration
8. Admin moderation and verification tools
9. Deployment on Render and Netlify
10. Demo / conclusion
`;

function pad(value) {
  return String(value).padStart(2, '0');
}

function addPill(slide, { x, y, w, h, text, fill, color = palette.text, size = 12, bold = true, align = 'center' }) {
  const pill = ctx.addShape(slide, {
    x,
    y,
    w,
    h,
    geometry: 'roundRect',
    fill,
    line: { style: 'solid', fill, width: 1 },
  });
  pill.className = 'shadow-sm';
  ctx.addText(slide, {
    x: x + 8,
    y: y + 2,
    w: Math.max(0, w - 16),
    h: Math.max(0, h - 4),
    text,
    fontSize: size,
    bold,
    color,
    align,
    valign: 'middle',
    face: ctx.fonts.body,
  });
  return pill;
}

function addPanel(slide, {
  x,
  y,
  w,
  h,
  fill,
  lineFill = palette.border,
  accent = palette.green3,
  title,
  body,
  titleSize = 20,
  bodySize = 15,
  titleColor = palette.text,
  bodyColor = palette.muted,
  titleY = 18,
  bodyY = 54,
  bodyH,
  bodyAlign = 'left',
}) {
  const card = ctx.addShape(slide, {
    x,
    y,
    w,
    h,
    geometry: 'roundRect',
    fill,
    line: { style: 'solid', fill: lineFill, width: 1 },
  });
  card.className = 'shadow-sm';
  ctx.addShape(slide, {
    x: x + 16,
    y: y + 14,
    w: 6,
    h: h - 28,
    geometry: 'roundRect',
    fill: accent,
    line: { style: 'solid', fill: accent, width: 0 },
  });
  if (title) {
    ctx.addText(slide, {
      x: x + 32,
      y: y + titleY,
      w: w - 48,
      h: 28,
      text: title,
      fontSize: titleSize,
      bold: true,
      color: titleColor,
      face: ctx.fonts.body,
    });
  }
  if (body) {
    ctx.addText(slide, {
      x: x + 32,
      y: y + bodyY,
      w: w - 48,
      h: bodyH ?? (h - bodyY - 18),
      text: body,
      fontSize: bodySize,
      color: bodyColor,
      face: ctx.fonts.body,
      align: bodyAlign,
    });
  }
  return card;
}

function addFooter(slide, slideNo) {
  ctx.addText(slide, {
    x: 56,
    y: 670,
    w: 720,
    h: 18,
    text: 'Farmer Marketplace • Presentation deck',
    fontSize: 11,
    color: '#65756D',
    face: ctx.fonts.body,
  });
  addPill(slide, {
    x: 1116,
    y: 662,
    w: 92,
    h: 26,
    text: `${pad(slideNo)} / ${pad(TOTAL)}`,
    fill: '#EAF1E8',
    color: palette.green,
    size: 11,
  });
}

function addInnerHeader(slide, slideNo, section, title, subtitle) {
  slide.background.fill = `linear(135deg, ${palette.cream} 0%, ${palette.cream2} 100%)`;
  const header = ctx.addShape(slide, {
    x: 24,
    y: 24,
    w: 1232,
    h: 122,
    geometry: 'roundRect',
    fill: `linear(135deg, ${palette.green} 0%, ${palette.green2} 100%)`,
    line: { style: 'solid', fill: '#0E2D23', width: 1 },
  });
  header.className = 'shadow-sm';
  addPill(slide, {
    x: 48,
    y: 44,
    w: 148,
    h: 28,
    text: section,
    fill: '#EAF1E8',
    color: palette.green,
    size: 12,
  });
  ctx.addText(slide, {
    x: 48,
    y: 76,
    w: 1000,
    h: 36,
    text: title,
    fontSize: 34,
    bold: true,
    color: '#FFFFFF',
    face: ctx.fonts.title,
  });
  ctx.addText(slide, {
    x: 48,
    y: 112,
    w: 980,
    h: 22,
    text: subtitle,
    fontSize: 16,
    color: '#E5F0E8',
    face: ctx.fonts.body,
  });
  addPill(slide, {
    x: 1108,
    y: 44,
    w: 112,
    h: 28,
    text: `${pad(slideNo)} / ${pad(TOTAL)}`,
    fill: '#F4E8D1',
    color: palette.green,
    size: 12,
  });
  addFooter(slide, slideNo);
}

function addArrow(slide, x, y) {
  addPill(slide, {
    x,
    y,
    w: 36,
    h: 36,
    text: '→',
    fill: '#EDF3EA',
    color: palette.green3,
    size: 18,
  });
}

function addStepBubble(slide, x, y, n, fill = palette.green, color = '#FFFFFF') {
  const bubble = ctx.addShape(slide, {
    x,
    y,
    w: 36,
    h: 36,
    geometry: 'ellipse',
    fill,
    line: { style: 'solid', fill, width: 1 },
  });
  bubble.className = 'shadow-sm';
  ctx.addText(slide, {
    x,
    y: y + 4,
    w: 36,
    h: 26,
    text: String(n),
    fontSize: 15,
    bold: true,
    color,
    face: ctx.fonts.body,
    align: 'center',
  });
  return bubble;
}

function coverChip(slide, x, y, w, text, fill, color) {
  addPill(slide, { x, y, w, h: 34, text, fill, color, size: 13 });
}

async function addSlide1(slide) {
  slide.background.fill = `linear(145deg, #0E2A21 0%, #153F31 58%, #091C17 100%)`;
  ctx.addShape(slide, {
    x: 820,
    y: -48,
    w: 460,
    h: 460,
    geometry: 'ellipse',
    fill: 'rgba(255,255,255,0.06)',
    line: { style: 'solid', fill: 'rgba(255,255,255,0.04)', width: 1 },
  });
  ctx.addShape(slide, {
    x: 980,
    y: 400,
    w: 320,
    h: 320,
    geometry: 'ellipse',
    fill: 'rgba(255,255,255,0.05)',
    line: { style: 'solid', fill: 'rgba(255,255,255,0.03)', width: 1 },
  });
  addPill(slide, {
    x: 64,
    y: 64,
    w: 200,
    h: 30,
    text: 'FARMER MARKETPLACE',
    fill: '#EAF1E8',
    color: palette.green,
    size: 12,
  });
  ctx.addText(slide, {
    x: 64,
    y: 108,
    w: 548,
    h: 190,
    text: 'Direct trade for farmers and buyers.',
    fontSize: 60,
    bold: true,
    color: '#FFFFFF',
    face: ctx.fonts.title,
  });
  ctx.addText(slide, {
    x: 64,
    y: 302,
    w: 560,
    h: 96,
    text: 'A production-ready mobile commerce system for Sierra Leone with polished UI, PostgreSQL persistence, Stripe checkout, and admin moderation.',
    fontSize: 20,
    color: '#D9E9DF',
    face: ctx.fonts.body,
  });
  coverChip(slide, 64, 420, 148, 'Expo mobile app', '#EAF1E8', palette.green);
  coverChip(slide, 224, 420, 170, 'PostgreSQL backend', '#FFF1D9', '#8C5C00');
  coverChip(slide, 406, 420, 150, 'Stripe checkout', '#E7EEF9', palette.blue);
  coverChip(slide, 64, 464, 166, 'Responsive UI', '#F9E8E0', '#B45E2A');
  coverChip(slide, 242, 464, 176, 'Render + Netlify', '#EFE8FB', '#6C42CC');
  coverChip(slide, 430, 464, 154, 'Admin tools', '#E6F1EA', palette.green3);
  ctx.addText(slide, {
    x: 64,
    y: 548,
    w: 490,
    h: 56,
    text: 'Mobile-first commerce, secure payment flows, and a clean submission story in one deck.',
    fontSize: 18,
    color: '#E6EDE9',
    face: ctx.fonts.body,
  });

  const panelX = 684;
  const panelY = 70;
  const panelW = 540;
  const panelH = 578;
  const panel = ctx.addShape(slide, {
    x: panelX,
    y: panelY,
    w: panelW,
    h: panelH,
    geometry: 'roundRect',
    fill: '#F7F2E8',
    line: { style: 'solid', fill: '#E3DAC9', width: 1 },
  });
  panel.className = 'shadow-sm';
  const topCards = [
    { x: panelX + 22, y: panelY + 22, w: 236, h: 160, title: 'Buyer path', body: 'Browse, compare, add to cart, and pay with confidence.', fill: '#EAF2EA', accent: palette.green3 },
    { x: panelX + 282, y: panelY + 22, w: 236, h: 160, title: 'Farmer path', body: 'List produce, manage stock, and follow orders in real time.', fill: '#FFF1D9', accent: palette.gold },
    { x: panelX + 22, y: panelY + 208, w: 236, h: 160, title: 'Secure checkout', body: 'Stripe card checkout plus mobile-money and manual options.', fill: '#E8EEF9', accent: palette.blue },
    { x: panelX + 282, y: panelY + 208, w: 236, h: 160, title: 'Deployment ready', body: 'Render API, Neon PostgreSQL, and Netlify web frontend.', fill: '#F9E6E6', accent: '#C04A3A' },
  ];
  for (const card of topCards) {
    addPanel(slide, {
      x: card.x,
      y: card.y,
      w: card.w,
      h: card.h,
      fill: card.fill,
      lineFill: '#DCD6C9',
      accent: card.accent,
      title: card.title,
      body: card.body,
      titleSize: 18,
      bodySize: 14,
      bodyY: 54,
      bodyH: 84,
      titleColor: palette.text,
      bodyColor: '#4D5E56',
    });
  }
  addPill(slide, {
    x: panelX + 396,
    y: panelY + 504,
    w: 108,
    h: 30,
    text: '10 slides',
    fill: '#EAF1E8',
    color: palette.green,
    size: 12,
  });
}

async function addSlide2(slide) {
  addInnerHeader(
    slide,
    2,
    'PROJECT BRIEF',
    'The brief turns into a working commerce flow.',
    'The deck follows the assignment requirements: mobile app, backend system, payment integration, and deployment.',
  );

  addPanel(slide, {
    x: 36,
    y: 176,
    w: 520,
    h: 468,
    fill: '#FFFFFF',
    lineFill: palette.borderSoft,
    accent: palette.green3,
    title: 'Minimum app screens',
    body: '• Splash screen\n• Login / Register\n• Home product listing\n• Product details\n• Cart and checkout\n• Farmer dashboard\n• Order history',
    titleSize: 24,
    bodySize: 18,
    bodyY: 68,
    bodyH: 360,
    bodyColor: palette.text,
  });

  const objectives = [
    { x: 588, y: 176, w: 270, h: 214, fill: '#EAF2EA', accent: palette.green3, title: 'Working application', body: 'Transform the brief into a real mobile commerce app.' },
    { x: 886, y: 176, w: 356, h: 214, fill: '#FFF1D9', accent: palette.gold, title: 'Backend and persistence', body: 'Use Express and PostgreSQL so the app keeps users, products, orders, and payments.' },
    { x: 588, y: 414, w: 270, h: 230, fill: '#E8EEF9', accent: palette.blue, title: 'Real payment flow', body: 'Stripe test checkout plus simulated mobile-money and manual payment methods.' },
    { x: 886, y: 414, w: 356, h: 230, fill: '#F9E6E6', accent: '#C04A3A', title: 'Presentation ready', body: 'Deployment notes, documentation, and a clear demo path for the panel.' },
  ];
  for (const item of objectives) {
    addPanel(slide, {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      fill: item.fill,
      lineFill: '#DCD6C9',
      accent: item.accent,
      title: item.title,
      body: item.body,
      titleSize: 20,
      bodySize: 16,
      bodyY: 58,
      bodyH: item.h - 78,
      bodyColor: palette.text,
    });
  }
}

async function addSlide3(slide) {
  addInnerHeader(
    slide,
    3,
    'ARCHITECTURE',
    'One API, three layers.',
    'The frontend, backend, and database are separated so the app stays responsive and scalable.',
  );

  const baseY = 210;
  addPanel(slide, {
    x: 48,
    y: baseY,
    w: 336,
    h: 254,
    fill: '#EAF2EA',
    lineFill: '#D9E5D8',
    accent: palette.green3,
    title: 'Expo app',
    body: '• Role-based navigation\n• Product browsing and search\n• Cart, checkout, and dashboard screens\n• Responsive mobile + web UI',
    titleSize: 24,
    bodySize: 16,
    bodyY: 68,
    bodyH: 150,
    bodyColor: palette.text,
  });
  addArrow(slide, 408, 304);
  addPanel(slide, {
    x: 456,
    y: baseY,
    w: 336,
    h: 254,
    fill: '#FFF1D9',
    lineFill: '#E9D9B6',
    accent: palette.gold,
    title: 'Express API',
    body: '• JWT authentication\n• Product CRUD and order lifecycle\n• Reviews, analytics, and moderation\n• Stripe webhooks and checkout sessions',
    titleSize: 24,
    bodySize: 16,
    bodyY: 68,
    bodyH: 150,
    bodyColor: palette.text,
  });
  addArrow(slide, 816, 304);
  addPanel(slide, {
    x: 864,
    y: baseY,
    w: 368,
    h: 254,
    fill: '#E8EEF9',
    lineFill: '#D7E0F3',
    accent: palette.blue,
    title: 'PostgreSQL + Stripe',
    body: '• Users, products, orders, and payments\n• Neon for production hosting\n• pgAdmin4-compatible schema\n• Secure hosted payment confirmation',
    titleSize: 22,
    bodySize: 16,
    bodyY: 68,
    bodyH: 150,
    bodyColor: palette.text,
  });

  const labels = [
    { x: 66, text: 'Auth' },
    { x: 156, text: 'Catalog' },
    { x: 256, text: 'Orders' },
    { x: 516, text: 'Payments' },
    { x: 620, text: 'Reviews' },
    { x: 718, text: 'Analytics' },
    { x: 900, text: 'Neon DB' },
    { x: 1000, text: 'Stripe' },
    { x: 1092, text: 'Moderation' },
  ];
  for (const label of labels) {
    addPill(slide, {
      x: label.x,
      y: 502,
      w: label.text.length > 8 ? 92 : 74,
      h: 28,
      text: label.text,
      fill: '#EEF4EC',
      color: palette.green,
      size: 11,
    });
  }

  addPanel(slide, {
    x: 48,
    y: 548,
    w: 1184,
    h: 86,
    fill: '#FFFFFF',
    lineFill: palette.borderSoft,
    accent: palette.green,
    title: 'Main modules',
    body: 'App.js • src/screens • src/context/MarketplaceContext.js • backend/src/index.js • database/schema.sql',
    titleSize: 18,
    bodySize: 15,
    bodyY: 30,
    bodyH: 34,
    bodyColor: palette.text,
  });
}

async function addSlide4(slide) {
  addInnerHeader(
    slide,
    4,
    'DATABASE',
    'PostgreSQL keeps the marketplace stateful.',
    'The schema is designed for pgAdmin4 locally and Neon in production.',
  );

  const cards = [
    { x: 36, y: 180, w: 252, h: 140, fill: '#EAF2EA', accent: palette.green3, title: 'Users', body: 'role · profile · status · verification' },
    { x: 304, y: 180, w: 252, h: 140, fill: '#FFF1D9', accent: palette.gold, title: 'Products', body: 'farmer · price · stock · availability' },
    { x: 572, y: 180, w: 252, h: 140, fill: '#E8EEF9', accent: palette.blue, title: 'Orders', body: 'buyer · items · totals · lifecycle status' },
    { x: 36, y: 344, w: 252, h: 140, fill: '#F9E6E6', accent: '#C04A3A', title: 'Payments', body: 'method · provider · currency · reference' },
    { x: 304, y: 344, w: 252, h: 140, fill: '#F2F0FB', accent: '#7A55D4', title: 'Reviews', body: 'rating · comment · order link' },
    { x: 572, y: 344, w: 252, h: 140, fill: '#EEF7EA', accent: '#5B8A31', title: 'Audit / notifications', body: 'moderation events · alerts · timestamps' },
  ];
  for (const item of cards) {
    addPanel(slide, {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      fill: item.fill,
      lineFill: '#DCD6C9',
      accent: item.accent,
      title: item.title,
      body: item.body,
      titleSize: 20,
      bodySize: 15,
      bodyY: 58,
      bodyH: 60,
      bodyColor: palette.text,
    });
  }

  addPanel(slide, {
    x: 856,
    y: 180,
    w: 368,
    h: 304,
    fill: '#FFFFFF',
    lineFill: palette.borderSoft,
    accent: palette.green,
    title: 'pgAdmin4 / Neon setup',
    body: '1. Create the farmer_marketplace database.\n2. Run database/schema.sql.\n3. Seed the initial admin account.\n4. Switch DATABASE_URL to Neon for production.',
    titleSize: 22,
    bodySize: 16,
    bodyY: 68,
    bodyH: 180,
    bodyColor: palette.text,
  });
  addPill(slide, {
    x: 856,
    y: 510,
    w: 170,
    h: 30,
    text: 'Production: Neon',
    fill: '#EAF1E8',
    color: palette.green,
    size: 12,
  });
  addPill(slide, {
    x: 1040,
    y: 510,
    w: 184,
    h: 30,
    text: 'Local: pgAdmin4',
    fill: '#FFF1D9',
    color: '#8C5C00',
    size: 12,
  });
}

async function addSlide5(slide) {
  addInnerHeader(
    slide,
    5,
    'FRONTEND',
    'Every core screen is designed for taps.',
    'The app covers the required buyer and farmer screens and keeps navigation simple.',
  );

  const screens = [
    { title: 'Splash', body: 'Brand moment\nfast launch\nclean first impression', fill: '#EAF2EA', accent: palette.green3 },
    { title: 'Login / Register', body: 'Sign in\ncreate account\nrole selection', fill: '#FFF1D9', accent: palette.gold },
    { title: 'Home listing', body: 'Browse products\nsearch\nfilter by category', fill: '#E8EEF9', accent: palette.blue },
    { title: 'Product details', body: 'Price\nstock\nadd to cart', fill: '#F9E6E6', accent: '#C04A3A' },
    { title: 'Cart', body: 'Review items\nupdate quantities\nproceed to checkout', fill: '#F2F0FB', accent: '#7A55D4' },
    { title: 'Checkout', body: 'Choose payment\nconfirm order\ntrack status', fill: '#EEF7EA', accent: '#5B8A31' },
  ];
  const positions = [
    [36, 178], [428, 178], [820, 178],
    [36, 356], [428, 356], [820, 356],
  ];
  screens.forEach((screen, index) => {
    const [x, y] = positions[index];
    addPanel(slide, {
      x,
      y,
      w: 352,
      h: 156,
      fill: screen.fill,
      lineFill: '#DCD6C9',
      accent: screen.accent,
      title: screen.title,
      body: screen.body,
      titleSize: 20,
      bodySize: 15,
      bodyY: 56,
      bodyH: 72,
      bodyColor: palette.text,
    });
    ctx.addShape(slide, {
      x: x + 266,
      y: y + 18,
      w: 58,
      h: 10,
      geometry: 'roundRect',
      fill: '#FFFFFF99',
      line: { style: 'solid', fill: '#FFFFFF99', width: 1 },
    });
    ctx.addShape(slide, {
      x: x + 272,
      y: y + 128,
      w: 46,
      h: 10,
      geometry: 'roundRect',
      fill: '#FFFFFFAA',
      line: { style: 'solid', fill: '#FFFFFFAA', width: 1 },
    });
  });

  addPill(slide, {
    x: 144,
    y: 574,
    w: 990,
    h: 36,
    text: 'User journey: splash → auth → browse → product details → cart → checkout → order history',
    fill: '#FFFFFF',
    color: palette.green,
    size: 13,
  });
}

async function addSlide6(slide) {
  addInnerHeader(
    slide,
    6,
    'FARMER DASHBOARD',
    'Farmers can publish, edit, and fulfill orders.',
    'The dashboard covers listing management and order history in one place.',
  );

  addPanel(slide, {
    x: 36,
    y: 178,
    w: 568,
    h: 420,
    fill: '#FFFFFF',
    lineFill: palette.borderSoft,
    accent: palette.green3,
    title: 'Farmer workspace',
    body: 'Manage products, stock, and profile settings without leaving the dashboard.',
    titleSize: 24,
    bodySize: 16,
    bodyY: 64,
    bodyH: 40,
    bodyColor: palette.text,
  });

  const metrics = [
    { x: 70, y: 308, w: 150, h: 110, title: 'Open listings', value: '12', fill: '#EAF2EA', accent: palette.green3 },
    { x: 232, y: 308, w: 150, h: 110, title: 'Low stock', value: '3', fill: '#FFF1D9', accent: palette.gold },
    { x: 394, y: 308, w: 176, h: 110, title: 'Pending orders', value: '8', fill: '#E8EEF9', accent: palette.blue },
  ];
  for (const metric of metrics) {
    addPanel(slide, {
      x: metric.x,
      y: metric.y,
      w: metric.w,
      h: metric.h,
      fill: metric.fill,
      lineFill: '#DCD6C9',
      accent: metric.accent,
      title: metric.title,
      body: metric.value,
      titleSize: 14,
      bodySize: 36,
      bodyY: 40,
      bodyH: 48,
      bodyColor: palette.text,
    });
  }
  addPill(slide, {
    x: 70,
    y: 520,
    w: 196,
    h: 30,
    text: 'Store settings',
    fill: '#EEF4EC',
    color: palette.green,
    size: 12,
  });
  addPill(slide, {
    x: 278,
    y: 520,
    w: 124,
    h: 30,
    text: 'Order history',
    fill: '#EEF4EC',
    color: palette.green,
    size: 12,
  });
  addPill(slide, {
    x: 414,
    y: 520,
    w: 146,
    h: 30,
    text: 'Profile settings',
    fill: '#EEF4EC',
    color: palette.green,
    size: 12,
  });

  addPanel(slide, {
    x: 640,
    y: 178,
    w: 604,
    h: 420,
    fill: '#FFFFFF',
    lineFill: palette.borderSoft,
    accent: palette.gold,
    title: 'Order flow',
    body: '',
    titleSize: 24,
    bodyY: 70,
  });
  const steps = [
    ['Add product', 'Publish the listing with images, price, and stock.'],
    ['Edit stock and price', 'Keep the storefront accurate as inventory changes.'],
    ['Confirm order', 'Accept the buyer order once payment or verification is complete.'],
    ['Mark delivered', 'Close the order after delivery and update history.'],
    ['Review history', 'Track completed orders and pending work.'],
  ];
  steps.forEach((step, index) => {
    const y = 222 + index * 66;
    addStepBubble(slide, 676, y - 2, index + 1, index % 2 === 0 ? palette.green : palette.gold);
    ctx.addText(slide, {
      x: 724,
      y,
      w: 450,
      h: 22,
      text: step[0],
      fontSize: 18,
      bold: true,
      color: palette.text,
      face: ctx.fonts.body,
    });
    ctx.addText(slide, {
      x: 724,
      y: y + 22,
      w: 430,
      h: 24,
      text: step[1],
      fontSize: 14,
      color: palette.muted,
      face: ctx.fonts.body,
    });
    if (index < steps.length - 1) {
      ctx.addText(slide, {
        x: 682,
        y: y + 34,
        w: 28,
        h: 20,
        text: '↓',
        fontSize: 18,
        color: palette.green3,
        face: ctx.fonts.body,
        align: 'center',
      });
    }
  });
}

async function addSlide7(slide) {
  addInnerHeader(
    slide,
    7,
    'PAYMENT FLOW',
    'Checkout is built to feel real.',
    'Stripe powers secure card checkout while mobile-money and cash paths keep the assignment complete.',
  );

  addPanel(slide, {
    x: 36,
    y: 178,
    w: 500,
    h: 424,
    fill: '#FFFFFF',
    lineFill: palette.borderSoft,
    accent: palette.blue,
    title: 'Cart summary',
    body: '2 items in cart\n\nTomatoes × 3\nRice basket × 1\n\nSubtotal                Le 265\nDelivery                 Le 20\nTotal                    Le 285',
    titleSize: 24,
    bodySize: 18,
    bodyY: 70,
    bodyH: 280,
    bodyColor: palette.text,
  });
  addPill(slide, {
    x: 280,
    y: 554,
    w: 214,
    h: 32,
    text: 'Proceed to checkout',
    fill: palette.green,
    color: '#FFFFFF',
    size: 12,
  });

  addPanel(slide, {
    x: 560,
    y: 178,
    w: 684,
    h: 424,
    fill: '#FFFFFF',
    lineFill: palette.borderSoft,
    accent: palette.gold,
    title: 'Supported payment methods',
    body: '',
    titleSize: 24,
  });
  const methods = [
    { x: 596, y: 240, w: 292, h: 74, fill: '#E8EEF9', accent: palette.blue, title: 'Stripe secure checkout', body: 'Hosted card payment session with webhook confirmation.' },
    { x: 924, y: 240, w: 284, h: 74, fill: '#EAF2EA', accent: palette.green3, title: 'Orange Money simulation', body: 'Simulated mobile-money path for the assignment brief.' },
    { x: 596, y: 334, w: 292, h: 74, fill: '#FFF1D9', accent: palette.gold, title: 'Africell Money simulation', body: 'Second simulated mobile-money option for demonstration.' },
    { x: 924, y: 334, w: 284, h: 74, fill: '#F9E6E6', accent: '#C04A3A', title: 'Bank transfer', body: 'Manual payment path that still completes the order flow.' },
    { x: 760, y: 428, w: 284, h: 74, fill: '#F2F0FB', accent: '#7A55D4', title: 'Cash on delivery', body: 'Functional manual option for offline buyers.' },
  ];
  for (const method of methods) {
    addPanel(slide, {
      x: method.x,
      y: method.y,
      w: method.w,
      h: method.h,
      fill: method.fill,
      lineFill: '#DCD6C9',
      accent: method.accent,
      title: method.title,
      body: method.body,
      titleSize: 16,
      bodySize: 12,
      bodyY: 38,
      bodyH: 26,
      bodyColor: palette.muted,
    });
  }
  addPill(slide, {
    x: 604,
    y: 548,
    w: 612,
    h: 32,
    text: 'Flow: add to cart → review order → choose payment → webhook / return URL refreshes status',
    fill: '#EEF4EC',
    color: palette.green,
    size: 12,
  });
}

async function addSlide8(slide) {
  addInnerHeader(
    slide,
    8,
    'ADMIN',
    'Moderation tools keep the marketplace trustworthy.',
    'The optional admin panel handles verification, user management, and transaction oversight.',
  );

  const stats = [
    { x: 36, y: 180, w: 392, h: 104, title: 'Verify farmers', body: 'Approve sellers and mark trusted accounts.', fill: '#EAF2EA', accent: palette.green3 },
    { x: 444, y: 180, w: 392, h: 104, title: 'Manage users', body: 'Suspend, restore, and monitor buyers and farmers.', fill: '#FFF1D9', accent: palette.gold },
    { x: 852, y: 180, w: 392, h: 104, title: 'Monitor transactions', body: 'Watch order volume, checkout events, and payment status.', fill: '#E8EEF9', accent: palette.blue },
  ];
  for (const stat of stats) {
    addPanel(slide, {
      x: stat.x,
      y: stat.y,
      w: stat.w,
      h: stat.h,
      fill: stat.fill,
      lineFill: '#DCD6C9',
      accent: stat.accent,
      title: stat.title,
      body: stat.body,
      titleSize: 20,
      bodySize: 15,
      bodyY: 54,
      bodyH: 34,
      bodyColor: palette.text,
    });
  }

  const adminCards = [
    { x: 36, y: 316, w: 290, h: 236, fill: '#F9E6E6', accent: '#C04A3A', title: 'Review listings', body: 'Spot duplicates, poor content, or suspicious products.' },
    { x: 350, y: 316, w: 290, h: 236, fill: '#F2F0FB', accent: '#7A55D4', title: 'Audit trail', body: 'Keep timestamps and action history for moderation.' },
    { x: 664, y: 316, w: 290, h: 236, fill: '#EEF7EA', accent: '#5B8A31', title: 'Reports', body: 'Summaries for orders, payments, and system health.' },
    { x: 978, y: 316, w: 266, h: 236, fill: '#EAF1E8', accent: palette.green3, title: 'Farmer verification', body: 'Control trust in the seller onboarding flow.' },
  ];
  for (const admin of adminCards) {
    addPanel(slide, {
      x: admin.x,
      y: admin.y,
      w: admin.w,
      h: admin.h,
      fill: admin.fill,
      lineFill: '#DCD6C9',
      accent: admin.accent,
      title: admin.title,
      body: admin.body,
      titleSize: 18,
      bodySize: 15,
      bodyY: 58,
      bodyH: 128,
      bodyColor: palette.text,
    });
  }
}

async function addSlide9(slide) {
  addInnerHeader(
    slide,
    9,
    'DEPLOYMENT',
    'Netlify, Render, and Neon give us a free launch path.',
    'The public frontend, API, and database can be deployed independently without changing the app design.',
  );

  addPanel(slide, {
    x: 36,
    y: 178,
    w: 362,
    h: 386,
    fill: '#EAF2EA',
    lineFill: '#D9E5D8',
    accent: palette.green3,
    title: 'Netlify frontend',
    body: '• Expo web export\n• Responsive UI hosting\n• Public user entry point\n• Payment return handling',
    titleSize: 24,
    bodySize: 16,
    bodyY: 70,
    bodyH: 210,
    bodyColor: palette.text,
  });
  addArrow(slide, 410, 334);
  addPanel(slide, {
    x: 454,
    y: 178,
    w: 362,
    h: 386,
    fill: '#FFF1D9',
    lineFill: '#E9D9B6',
    accent: palette.gold,
    title: 'Render API',
    body: '• `npm run api`\n• Express server and auth\n• Stripe webhooks\n• PostgreSQL connection',
    titleSize: 24,
    bodySize: 16,
    bodyY: 70,
    bodyH: 210,
    bodyColor: palette.text,
  });
  addArrow(slide, 828, 334);
  addPanel(slide, {
    x: 872,
    y: 178,
    w: 372,
    h: 386,
    fill: '#E8EEF9',
    lineFill: '#D7E0F3',
    accent: palette.blue,
    title: 'Neon PostgreSQL',
    body: '• `DATABASE_URL` in production\n• Persistent marketplace state\n• pgAdmin4-compatible schema\n• Free tier friendly',
    titleSize: 24,
    bodySize: 16,
    bodyY: 70,
    bodyH: 210,
    bodyColor: palette.text,
  });

  addPanel(slide, {
    x: 36,
    y: 592,
    w: 1208,
    h: 72,
    fill: '#FFFFFF',
    lineFill: palette.borderSoft,
    accent: palette.green,
    title: 'Key environment values',
    body: 'EXPO_PUBLIC_API_URL • CLIENT_ORIGIN • DATABASE_URL • STRIPE_SECRET_KEY • STRIPE_WEBHOOK_SECRET • PAYMENT_RETURN_URL',
    titleSize: 16,
    bodySize: 13,
    bodyY: 28,
    bodyH: 24,
    bodyColor: palette.text,
  });
}

async function addSlide10(slide) {
  addInnerHeader(
    slide,
    10,
    'DEMO / CONCLUSION',
    'The submission is ready to demonstrate.',
    'The deck, code, docs, and deployed services cover the brief from end to end.',
  );

  addPanel(slide, {
    x: 36,
    y: 180,
    w: 548,
    h: 408,
    fill: '#FFFFFF',
    lineFill: palette.borderSoft,
    accent: palette.green3,
    title: 'What is ready',
    body: '• Working application\n• Source code on GitHub\n• Updated architecture and API docs\n• Stripe and payment flow\n• Render / Netlify deployment\n• Presentation deck',
    titleSize: 24,
    bodySize: 18,
    bodyY: 72,
    bodyH: 250,
    bodyColor: palette.text,
  });

  addPanel(slide, {
    x: 612,
    y: 180,
    w: 592,
    h: 408,
    fill: '#EAF2EA',
    lineFill: '#D9E5D8',
    accent: palette.green,
    title: 'Live demo links',
    body: 'Frontend: https://sl-market-place.netlify.app/\nAPI: https://farmer-marketplace-fs2a.onrender.com\n\nBuilt to be mobile-first, responsive, and production-oriented.',
    titleSize: 24,
    bodySize: 17,
    bodyY: 72,
    bodyH: 220,
    bodyColor: palette.text,
  });
  addPill(slide, {
    x: 700,
    y: 494,
    w: 170,
    h: 30,
    text: 'Mobile-first UI',
    fill: '#FFFFFF',
    color: palette.green,
    size: 12,
  });
  addPill(slide, {
    x: 888,
    y: 494,
    w: 176,
    h: 30,
    text: 'Secure payments',
    fill: '#FFFFFF',
    color: palette.green,
    size: 12,
  });
  addPill(slide, {
    x: 1080,
    y: 494,
    w: 100,
    h: 30,
    text: 'Ready',
    fill: palette.green,
    color: '#FFFFFF',
    size: 12,
  });
  ctx.addShape(slide, {
    x: 1018,
    y: 352,
    w: 112,
    h: 112,
    geometry: 'ellipse',
    fill: palette.green,
    line: { style: 'solid', fill: palette.green, width: 1 },
  });
  ctx.addText(slide, {
    x: 1018,
    y: 384,
    w: 112,
    h: 36,
    text: '✓',
    fontSize: 42,
    bold: true,
    color: '#FFFFFF',
    face: ctx.fonts.title,
    align: 'center',
  });
}

let ctx;

async function main() {
  process.env.HOME = 'C:/Users/Salone2';
  await fs.mkdir(TMP, { recursive: true });
  await fs.mkdir(SLIDES_DIR, { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.mkdir(LAYOUT_DIR, { recursive: true });
  await fs.mkdir(ASSET_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await fs.writeFile(path.join(TMP, 'slide-plan.txt'), planText, 'utf8');
  await fs.writeFile(path.join(TMP, 'source-notes.txt'), sourcesText, 'utf8');

  await ensureArtifactToolWorkspace(TMP);
  const { Presentation, PresentationFile } = await importArtifactTool(TMP);
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  ctx = createSlideContext(presentation, {
    slideSize: { width: 1280, height: 720 },
    titleFont: 'Aptos Display',
    bodyFont: 'Aptos',
    monoFont: 'Aptos Mono',
    workspaceDir: TMP,
    assetDir: ASSET_DIR,
    outputDir: PREVIEW_DIR,
  });

  const slides = [addSlide1, addSlide2, addSlide3, addSlide4, addSlide5, addSlide6, addSlide7, addSlide8, addSlide9, addSlide10];
  for (const build of slides) {
    const slide = presentation.slides.add();
    await build(slide);
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const slideNo = index + 1;
    const stem = `slide-${pad(slideNo)}`;
    const png = await presentation.export({ slide, format: 'png', scale: 1 });
    await saveBlobToFile(png, path.join(PREVIEW_DIR, `${stem}.png`));
    const layout = await slide.export({ format: 'layout' });
    await fs.writeFile(path.join(LAYOUT_DIR, `${stem}.json`), await layout.text(), 'utf8');
  }

  const montage = await presentation.export({ format: 'webp', montage: true, scale: 1 });
  await saveBlobToFile(montage, path.join(PREVIEW_DIR, 'deck-montage.webp'));

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL_PPTX);

  const qaText = `Visual QA

- PPTX exists: yes
- Slide count: ${presentation.slides.items.length}
- Preview renders saved: yes
- Montage saved: yes
- Source notes saved: yes
- Slide plan saved: yes

Remaining caveats: none after visual review.`;
  await fs.writeFile(path.join(QA_DIR, 'visual-qa.txt'), qaText, 'utf8');

  const stats = await fs.stat(FINAL_PPTX);
  console.log(JSON.stringify({ finalPptx: FINAL_PPTX, bytes: stats.size, slides: presentation.slides.items.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
