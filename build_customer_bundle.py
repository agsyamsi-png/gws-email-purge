import os
import shutil
import zipfile
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def build_deployment_guide_docx(output_path):
    doc = Document()

    # 1. Page Margins (1 inch)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # 2. Brand Colors
    COLOR_RED_POPPY = RGBColor(248, 72, 94)      # #f8485e
    COLOR_DARK_GREY = RGBColor(60, 60, 58)       # #3c3c3a
    COLOR_WHITE = RGBColor(255, 255, 255)
    COLOR_AQUA = RGBColor(215, 235, 231)         # #d7ebe7
    COLOR_LIGHT_GREY = RGBColor(239, 238, 238)   # #efeeee
    COLOR_MUTED_GREY = RGBColor(120, 120, 118)

    HEX_DARK_GREY = "3c3c3a"
    HEX_LIGHT_GREY = "efeeee"
    HEX_AQUA = "d7ebe7"
    HEX_RED_POPPY = "f8485e"

    # 3. Typography Styles
    styles = doc.styles
    normal_style = styles['Normal']
    normal_font = normal_style.font
    normal_font.name = 'Montserrat'
    normal_font.size = Pt(10)
    normal_font.color.rgb = COLOR_DARK_GREY

    def set_cell_background(cell, hex_color):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def add_callout(text, title="CUSTOMER NOTICE", hex_bg=HEX_LIGHT_GREY, hex_border=HEX_RED_POPPY):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_background(cell, hex_bg)
        set_cell_margins(cell, top=160, bottom=160, left=200, right=200)

        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="24" w:space="0" w:color="{hex_border}"/>
                <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        run_title = p.add_run(f"{title}: ")
        run_title.font.name = 'Montserrat'
        run_title.font.size = Pt(9.5)
        run_title.font.bold = True
        run_title.font.color.rgb = COLOR_RED_POPPY

        run_text = p.add_run(text)
        run_text.font.name = 'Montserrat'
        run_text.font.size = Pt(9.5)
        run_text.font.color.rgb = COLOR_DARK_GREY

        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Header: Logo & Eyebrow
    logo_path = "/Users/agungfadlan/.gemini/config/skills/devoteam-brand/assets/logos/devoteam-primary.png"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_logo.paragraph_format.space_after = Pt(18)
        p_logo.add_run().add_picture(logo_path, width=Inches(1.8))

    p_eye = doc.add_paragraph()
    p_eye.paragraph_format.space_before = Pt(0)
    p_eye.paragraph_format.space_after = Pt(4)
    r_eye = p_eye.add_run("DEVOTEAM G CLOUD • ENTERPRISE CUSTOMER HANDOVER BUNDLE")
    r_eye.font.name = 'Montserrat'
    r_eye.font.size = Pt(9)
    r_eye.font.bold = True
    r_eye.font.color.rgb = COLOR_RED_POPPY

    # Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(6)
    r_title = p_title.add_run("Customer Handover & Deployment Guide")
    r_title.font.name = 'Montserrat'
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_DARK_GREY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(16)
    r_sub = p_sub.add_run("Google Workspace Threat Containment & 1-Click Email Purge Solution")
    r_sub.font.name = 'Montserrat'
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = COLOR_MUTED_GREY

    # Metadata Table
    meta_tbl = doc.add_table(rows=4, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_info = [
        ("Delivered For:", "Enterprise Customer IT & Security Operations Team"),
        ("Delivered By:", "Devoteam G Cloud (Google Cloud Premier Partner)"),
        ("Date of Release:", "October 2026 (Version 2.0.0 Enterprise Edition)"),
        ("Classification:", "Customer Confidential / Restricted Delivery"),
    ]
    for i, (k, v) in enumerate(meta_info):
        c1, c2 = meta_tbl.cell(i, 0), meta_tbl.cell(i, 1)
        c1.width, c2.width = Inches(2.2), Inches(4.3)
        set_cell_background(c1, HEX_LIGHT_GREY)
        set_cell_background(c2, "ffffff")
        set_cell_margins(c1, 80, 80, 120, 120)
        set_cell_margins(c2, 80, 80, 120, 120)
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(k)
        r1.font.bold = True
        r1.font.size = Pt(9)
        r1.font.name = 'Montserrat'
        p2 = c2.paragraphs[0]
        r2 = p2.add_run(v)
        r2.font.size = Pt(9)
        r2.font.name = 'Montserrat'

    doc.add_paragraph().paragraph_format.space_after = Pt(16)

    # Section 1: Executive Overview
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(18)
    h1.paragraph_format.space_after = Pt(6)
    r_h1 = h1.add_run("1. Executive Overview & Value Proposition")
    r_h1.font.name = 'Montserrat'
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = COLOR_DARK_GREY

    p_exec = doc.add_paragraph()
    p_exec.paragraph_format.space_after = Pt(8)
    p_exec.add_run(
        "During phishing outbreaks, ransomware lures, or accidental data spillages, SecOps and IT Helpdesk teams "
        "must act within minutes to contain the blast radius. Standard command-line administration tools (such as GAM CLI) "
        "often require specialized terminal access, Python runtimes, and local private key custody, introducing operational friction "
        "and security risks for non-technical duty managers.\n\n"
        "Devoteam G Cloud has engineered this enterprise-grade, 100% web-based containment solution. It empowers Workspace "
        "Administrators to sign in with their Google accounts, configure threat email parameters (Sender, Subject, Message-ID, Date), "
        "execute surgical purges with 1 click, and export immutable incident compliance reports instantly."
    )

    add_callout(
        "Zero Terminal Friction: Duty administrators do not need terminal access, Python, or command-line familiarity. "
        "The web portal is protected by Google SSO and can be launched directly within Google Sheets or via a secure standalone web link.",
        title="EXECUTIVE BENEFIT"
    )

    # Section 2: Bundle Contents
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(16)
    h2.paragraph_format.space_after = Pt(6)
    r_h2 = h2.add_run("2. Contents of This Delivery Bundle")
    r_h2.font.name = 'Montserrat'
    r_h2.font.size = Pt(14)
    r_h2.font.bold = True
    r_h2.font.color.rgb = COLOR_DARK_GREY

    bundle_tbl = doc.add_table(rows=6, cols=3)
    bundle_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    b_headers = ["Folder / File", "Format", "Operational Purpose"]
    for j, h in enumerate(b_headers):
        cell = bundle_tbl.cell(0, j)
        set_cell_background(cell, HEX_DARK_GREY)
        set_cell_margins(cell, 100, 100, 120, 120)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = COLOR_WHITE
        r.font.name = 'Montserrat'

    b_rows = [
        ("01-Customer-Deployment-Guide", "DOCX / MD", "Executive summary, architecture, and step-by-step setup checklist."),
        ("02-Operational-SOP-Playbook", "DOCX / MD", "Official Devoteam SecOps Incident Response Playbook (RACI, queries, recovery)."),
        ("03-Apps-Script-Web-Solution", "Code.gs + HTML", "Production 1-click web portal (Dashboard.html) & backend controller (Code.gs)."),
        ("04-CLI-Automation", "SH + CSV", "Optional advanced CLI automation script (gam-purge-runner.sh) for engineers."),
        ("05-Architecture-and-Security", "Docs / ADRs", "Full STRIDE threat model, security review, and architecture decision records."),
    ]
    for i, (f, fmt, purp) in enumerate(b_rows):
        row_idx = i + 1
        bg = HEX_LIGHT_GREY if i % 2 == 1 else "ffffff"
        for col_idx, text in enumerate([f, fmt, purp]):
            cell = bundle_tbl.cell(row_idx, col_idx)
            set_cell_background(cell, bg)
            set_cell_margins(cell, 80, 80, 120, 120)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.size = Pt(8.5)
            r.font.name = 'Montserrat'
            if col_idx == 0:
                r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # Section 3: Architecture
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(16)
    h3.paragraph_format.space_after = Pt(6)
    r_h3 = h3.add_run("3. System Architecture & Dual Execution Model")
    r_h3.font.name = 'Montserrat'
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = COLOR_DARK_GREY

    p_arch = doc.add_paragraph()
    p_arch.paragraph_format.space_after = Pt(8)
    p_arch.add_run(
        "The architecture decouples the presentation interface from the Google Cloud execution plane to maintain least privilege:\n\n"
        "• Presentation Layer (Control Plane): Built with Google Apps Script (HTML5/CSS3). Accessible directly within Google Sheets "
        "as a modal dialog or deployed as an independent Web App URL bound to corporate Google SSO.\n"
        "• Execution Layer (Data Plane): The backend Controller utilizes Domain-Wide Delegation (DWD). It dynamically mints short-lived "
        "OAuth 2.0 access tokens signed with RS256 using a Google Cloud Service Account private key stored in Google's encrypted ScriptProperties. "
        "It then calls the Gmail REST API (v1) to surgically trash or expunge target messages.\n"
        "• Security & Audit Plane: All incident queries, operator emails, target mailboxes, and cryptographic SHA-256 hashes are immutably logged "
        "to the 'Audit_Log' tab. Zero email body text or attachment payloads are ever logged, strictly adhering to GDPR and PII compliance."
    )

    # Section 4: 5-Minute Quick Setup
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(16)
    h4.paragraph_format.space_after = Pt(6)
    r_h4 = h4.add_run("4. 5-Minute Setup & Deployment Checklist")
    r_h4.font.name = 'Montserrat'
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True
    r_h4.font.color.rgb = COLOR_DARK_GREY

    steps = [
        ("Step 1: Create Google Sheet", "Open https://sheets.new and name your spreadsheet '[SecOps] Workspace Threat Containment Center'."),
        ("Step 2: Open Apps Script Editor", "In Google Sheets, navigate to Extensions > Apps Script in the top menu."),
        ("Step 3: Paste Code.gs", "Replace the default code in Code.gs with the file provided in 03-Apps-Script-Web-Solution/Code.gs."),
        ("Step 4: Add Dashboard.html", "In Apps Script, click '+' next to Files > HTML, name it 'Dashboard', and paste the contents of Dashboard.html."),
        ("Step 5: (Optional) Add Sidebar.html", "Click '+' > HTML, name it 'Sidebar', and paste the contents of Sidebar.html. Save the project (Cmd+S / Ctrl+S)."),
        ("Step 6: Initialize Sheet & Launch", "Refresh your Google Sheet. Click '⚡ GAM Email Purge' in the menu > '⚙️ Initialize / Format Sheet Tabs'. Then click '🚀 Open Purge Web Portal' to begin!"),
    ]

    for title, desc in steps:
        p_step = doc.add_paragraph()
        p_step.paragraph_format.space_before = Pt(4)
        p_step.paragraph_format.space_after = Pt(4)
        r_st = p_step.add_run(f"✔  {title}: ")
        r_st.font.bold = True
        r_st.font.size = Pt(9.5)
        r_st.font.color.rgb = COLOR_RED_POPPY
        r_sd = p_step.add_run(desc)
        r_sd.font.size = Pt(9.5)

    add_callout(
        "One-Time Service Account Setup for In-Browser Purging: To enable direct in-browser purging without terminal interaction, "
        "open the portal, click '⚙️ Settings & DWD Key', and paste your Service Account JSON key (delegated to https://mail.google.com/). "
        "The key is stored encrypted in Google's cloud properties.",
        title="DWD ACTIVATION"
    )

    # Section 5: Support & Contact
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(16)
    h5.paragraph_format.space_after = Pt(6)
    r_h5 = h5.add_run("5. Support & Enterprise Assistance")
    r_h5.font.name = 'Montserrat'
    r_h5.font.size = Pt(14)
    r_h5.font.bold = True
    r_h5.font.color.rgb = COLOR_DARK_GREY

    p_sup = doc.add_paragraph()
    p_sup.paragraph_format.space_after = Pt(8)
    p_sup.add_run(
        "This solution was engineered by Devoteam G Cloud. For implementation assistance, custom IAM domain delegation configuration, "
        "or Google Workspace security advisory, please contact your Devoteam G Cloud Account Representative or Cloud Architect."
    )

    doc.save(output_path)
    print(f"Generated Deployment Guide: {output_path}")

def build_customer_bundle():
    base_dir = "/Users/agungfadlan/.gemini/antigravity/scratch/gws-email-purge"
    dist_dir = os.path.join(base_dir, "dist")
    bundle_name = "Devoteam-GWS-Email-Purge-Customer-Bundle"
    bundle_dir = os.path.join(dist_dir, bundle_name)

    if os.path.exists(bundle_dir):
        shutil.rmtree(bundle_dir)
    os.makedirs(bundle_dir, exist_ok=True)

    # Subdirectories
    subdirs = [
        "02-Operational-SOP-Playbook",
        "03-Apps-Script-Web-Solution",
        "04-CLI-Automation",
        "05-Architecture-and-Security-Assurance",
        "05-Architecture-and-Security-Assurance/adr"
    ]
    for s in subdirs:
        os.makedirs(os.path.join(bundle_dir, s), exist_ok=True)

    # 1. Generate Deployment Guide DOCX
    guide_docx_path = os.path.join(bundle_dir, "01-Customer-Deployment-Guide.docx")
    build_deployment_guide_docx(guide_docx_path)

    # 2. Write 01-Customer-Deployment-Guide.md
    guide_md_path = os.path.join(bundle_dir, "01-Customer-Deployment-Guide.md")
    with open(guide_md_path, "w", encoding="utf-8") as f:
        f.write("""# Google Workspace Threat Containment & Email Purge Solution
## Customer Handover & Deployment Guide

**Devoteam G Cloud — Google Cloud Premier Partner**
**Document Version:** 2.0.0 (Enterprise Edition)  
**Classification:** Customer Confidential  

---

## 1. Executive Summary
During active phishing campaigns, ransomware lures, or accidental data leaks, SecOps and IT Helpdesk teams must act within minutes to contain the blast radius.

Devoteam G Cloud has engineered this 100% web-based containment solution for your Google Workspace tenant. It empowers administrators to:
1. **Sign in with Google Admin SSO** (no terminal, no CLI commands).
2. **Input threat email details** via an intuitive visual form (Sender, Subject, Message-ID, Date).
3. **Execute 1-click purges** (Dry Run simulation, Soft Trash, or Permanent Delete).
4. **Generate instant incident compliance reports** with live metrics and 1-click CSV download.

---

## 2. Directory Structure of This Customer Bundle

```
Devoteam-GWS-Email-Purge-Customer-Bundle/
├── README.txt                                     # Quick start reading guide
├── 01-Customer-Deployment-Guide.docx             # Branded executive handover guide (.docx)
├── 01-Customer-Deployment-Guide.md               # Markdown companion
├── 02-Operational-SOP-Playbook/
│   ├── DEV-SOP-GWS-Email-Purge-Playbook.docx     # Enterprise Incident Response SOP (.docx)
│   └── DEV-SOP-GWS-Email-Purge-Playbook.md       # Full SOP Markdown reference
├── 03-Apps-Script-Web-Solution/
│   ├── Code.gs                                   # Apps Script backend + DWD token engine
│   ├── Dashboard.html                            # 1-Click web containment portal UI
│   ├── Sidebar.html                              # Quick sidebar UI for Google Sheets
│   └── STEP-BY-STEP-INSTALLATION.md              # 3-minute visual installation guide
├── 04-CLI-Automation/
│   ├── gam-purge-runner.sh                       # Production bash CLI runner
│   └── sample-targets.csv                        # Sample CSV for targeted mailboxes
└── 05-Architecture-and-Security-Assurance/
    ├── product-spec.md                           # Product requirements & PRD
    ├── security-review.md                        # STRIDE threat model & IAM review
    └── adr/                                      # Architecture Decision Records
```

---

## 3. 5-Minute Installation Checklist

1. **Create Sheet:** Open [sheets.new](https://sheets.new) and name it `[SecOps] Threat Containment Center`.
2. **Open Apps Script:** Navigate to **Extensions** > **Apps Script**.
3. **Copy Code.gs:** Copy [`03-Apps-Script-Web-Solution/Code.gs`](./03-Apps-Script-Web-Solution/Code.gs) into `Code.gs`.
4. **Add Dashboard.html:** Click **+** (Add a file) > **HTML**, name it `Dashboard`, and paste [`03-Apps-Script-Web-Solution/Dashboard.html`](./03-Apps-Script-Web-Solution/Dashboard.html).
5. **Add Sidebar.html:** Click **+** > **HTML**, name it `Sidebar`, and paste [`03-Apps-Script-Web-Solution/Sidebar.html`](./03-Apps-Script-Web-Solution/Sidebar.html). Save the project (`Cmd+S` / `Ctrl+S`).
6. **Initialize Sheet:** Return to your Google Sheet, refresh the browser, click **`⚡ GAM Email Purge`** in the top menu, and select **`⚙️ Initialize / Format Sheet Tabs`**.
7. **Launch the Portal:**
   - **In Google Sheets:** Click **`⚡ GAM Email Purge`** > **`🚀 Open Purge Web Portal (Full Dashboard)`**.
   - **As Standalone Web App:** In Apps Script, click **Deploy** > **New deployment** > **Web app** (`Execute as: User accessing the web app`, `Who has access: Anyone within your domain`).

---

## 4. Enabling Direct In-Browser Purging (Service Account Setup)
To execute purges directly inside the browser without using a terminal:
1. Open the Web Portal and click **⚙️ Settings & DWD Key**.
2. Paste your Google Cloud Service Account JSON Key (authorized for Domain-Wide Delegation with scope `https://mail.google.com/`).
3. Click **Save Key**. The key is stored securely in encrypted Google `ScriptProperties`.
4. Direct 1-click in-browser purges are now active.

---

## 5. Support & Assistance
Engineered by **Devoteam G Cloud**. For questions or custom security architecture, please contact your Devoteam Account Executive or Cloud Architect.
""")

    # 3. Write README.txt
    readme_txt_path = os.path.join(bundle_dir, "README.txt")
    with open(readme_txt_path, "w", encoding="utf-8") as f:
        f.write("""================================================================================
DEVOTEAM G CLOUD - ENTERPRISE CUSTOMER HANDOVER BUNDLE
Google Workspace Threat Containment & 1-Click Email Purge Solution
Version 2.0.0 (Enterprise Release)
================================================================================

Welcome to your Google Workspace Threat Containment Customer Delivery Package.

This package provides everything your IT and Security Operations teams need to
instantly contain phishing outbreaks, malware lures, or data spills across your
Google Workspace organization without requiring terminal or CLI tools.

--------------------------------------------------------------------------------
HOW TO GET STARTED IN 3 STEPS:
--------------------------------------------------------------------------------

1. READ THE DEPLOYMENT GUIDE:
   Open "01-Customer-Deployment-Guide.docx" (or .md) for an executive summary
   and technical architecture overview.

2. INSTALL THE WEB PORTAL (TAKES 3 MINUTES):
   Follow "03-Apps-Script-Web-Solution/STEP-BY-STEP-INSTALLATION.md" to paste
   Code.gs and Dashboard.html into a Google Sheet.

3. TRAIN YOUR DUTY ADMINISTRATORS:
   Share "02-Operational-SOP-Playbook/DEV-SOP-GWS-Email-Purge-Playbook.docx"
   with your SecOps / Helpdesk duty managers as the official standard
   operating procedure.

--------------------------------------------------------------------------------
PACKAGE STRUCTURE:
--------------------------------------------------------------------------------
├── 01-Customer-Deployment-Guide.docx        : Executive handover & architecture guide
├── 01-Customer-Deployment-Guide.md          : Markdown companion
├── 02-Operational-SOP-Playbook/             : Official Devoteam Incident Response SOP
│   ├── DEV-SOP-GWS-Email-Purge-Playbook.docx
│   └── DEV-SOP-GWS-Email-Purge-Playbook.md
├── 03-Apps-Script-Web-Solution/             : 1-Click Web Portal & Apps Script Engine
│   ├── Code.gs
│   ├── Dashboard.html
│   ├── Sidebar.html
│   └── STEP-BY-STEP-INSTALLATION.md
├── 04-CLI-Automation/                       : Advanced Terminal Scripts (GAM / Bash)
│   ├── gam-purge-runner.sh
│   └── sample-targets.csv
└── 05-Architecture-and-Security-Assurance/  : STRIDE threat model & PRD docs
    ├── product-spec.md
    ├── security-review.md
    └── adr/

--------------------------------------------------------------------------------
TECHNICAL SUPPORT:
--------------------------------------------------------------------------------
For implementation questions or Google Workspace security advisory, please
contact your Devoteam G Cloud Account Executive or Lead Cloud Architect.

Devoteam G Cloud — Google Cloud Premier Partner.
================================================================================
""")

    # 4. Copy 02-Operational-SOP-Playbook
    shutil.copy(
        os.path.join(base_dir, "docs", "DEV-SOP-GWS-Email-Purge-Playbook.docx"),
        os.path.join(bundle_dir, "02-Operational-SOP-Playbook", "DEV-SOP-GWS-Email-Purge-Playbook.docx")
    )
    shutil.copy(
        os.path.join(base_dir, "docs", "DEV-SOP-GWS-Email-Purge-Playbook.md"),
        os.path.join(bundle_dir, "02-Operational-SOP-Playbook", "DEV-SOP-GWS-Email-Purge-Playbook.md")
    )

    # 5. Copy 03-Apps-Script-Web-Solution
    shutil.copy(
        os.path.join(base_dir, "gam-sheet-ui", "Code.gs"),
        os.path.join(bundle_dir, "03-Apps-Script-Web-Solution", "Code.gs")
    )
    shutil.copy(
        os.path.join(base_dir, "gam-sheet-ui", "Dashboard.html"),
        os.path.join(bundle_dir, "03-Apps-Script-Web-Solution", "Dashboard.html")
    )
    shutil.copy(
        os.path.join(base_dir, "gam-sheet-ui", "Sidebar.html"),
        os.path.join(bundle_dir, "03-Apps-Script-Web-Solution", "Sidebar.html")
    )

    # Write STEP-BY-STEP-INSTALLATION.md
    install_md_path = os.path.join(bundle_dir, "03-Apps-Script-Web-Solution", "STEP-BY-STEP-INSTALLATION.md")
    with open(install_md_path, "w", encoding="utf-8") as f:
        f.write("""# 3-Minute Quick Installation Guide: Web Containment Portal

This guide walks you through deploying the **1-Click Web Containment Portal** into your Google Workspace domain.

---

### Step 1: Create a Dedicated Google Sheet
1. Open [sheets.new](https://sheets.new) in your browser.
2. Title the sheet: `[SecOps] Threat Containment Center`.

---

### Step 2: Open the Apps Script Editor
1. In the Google Sheets top menu, click **Extensions** > **Apps Script**.
2. A new browser tab will open showing the script editor.

---

### Step 3: Install `Code.gs`
1. Select all default text in the existing `Code.gs` file and delete it.
2. Copy the entire contents of [`Code.gs`](./Code.gs) and paste it into the editor.

---

### Step 4: Add `Dashboard.html`
1. In the left panel of Apps Script, click the **`+`** icon next to **Files** and select **HTML**.
2. Name the file: `Dashboard` (do NOT type `.html`, Apps Script adds it automatically).
3. Select all default text and delete it.
4. Copy the entire contents of [`Dashboard.html`](./Dashboard.html) and paste it into the file.

---

### Step 5: (Optional) Add `Sidebar.html`
1. Click the **`+`** icon next to **Files** and select **HTML**.
2. Name the file: `Sidebar`.
3. Copy the entire contents of [`Sidebar.html`](./Sidebar.html) and paste it into the file.
4. Click the **Save project** floppy disk icon (`Cmd+S` on Mac or `Ctrl+S` on Windows).

---

### Step 6: Initialize Sheet Tabs
1. Go back to your Google Sheet tab and refresh the page (`Cmd+R` / `F5`).
2. Wait a few seconds: a new menu item **`⚡ GAM Email Purge`** will appear in the top toolbar.
3. Click **`⚡ GAM Email Purge`** > **`⚙️ Initialize / Format Sheet Tabs`**.
4. A Google authorization popup will appear: click **Continue**, select your Admin account, click **Advanced**, and click **Go to Untitled project (unsafe)** to grant the standard spreadsheet permissions.
5. Three formatted tabs will be automatically generated:
   - `Purge_Control_Center`
   - `Target_Mailboxes`
   - `Audit_Log`

---

### Step 7: Launch the Web Portal!
You have two ways to open the portal:

* **Inside Google Sheets:** Click **`⚡ GAM Email Purge`** > **`🚀 Open Purge Web Portal (Full Dashboard)`**.
* **As a Standalone Web URL:** In Apps Script, click **Deploy** > **New deployment** > **Web app**.
  - **Execute as:** `User accessing the web app` (or `Me`)
  - **Who has access:** `Anyone within your organization`
  - Click **Deploy** and bookmark the resulting URL!

---

### Enabling Direct In-Browser Purging (Service Account Setup)
1. In the Web Portal, click **⚙️ Settings & DWD Key** in the top-right corner.
2. Paste your Google Cloud Service Account JSON Key (delegated for `https://mail.google.com/`).
3. Click **Save Key**. The key is stored securely in encrypted Google `ScriptProperties`.
4. Now, any purge executed in the portal immediately contacts the Gmail API to trash or expunge matching emails with 1 click!
""")

    # 6. Copy 04-CLI-Automation
    shutil.copy(
        os.path.join(base_dir, "gam-sheet-ui", "gam-purge-runner.sh"),
        os.path.join(bundle_dir, "04-CLI-Automation", "gam-purge-runner.sh")
    )
    # Write sample-targets.csv
    csv_sample_path = os.path.join(bundle_dir, "04-CLI-Automation", "sample-targets.csv")
    with open(csv_sample_path, "w", encoding="utf-8") as f:
        f.write("Email,Department,IncidentRole\nuser1@customer.com,Finance,Reported Phishing\nuser2@customer.com,Sales,Clicked Link\nuser3@customer.com,Legal,Received Lure\n")

    # 7. Copy 05-Architecture-and-Security-Assurance
    shutil.copy(
        os.path.join(base_dir, "docs", "product-spec.md"),
        os.path.join(bundle_dir, "05-Architecture-and-Security-Assurance", "product-spec.md")
    )
    shutil.copy(
        os.path.join(base_dir, "docs", "security-review.md"),
        os.path.join(bundle_dir, "05-Architecture-and-Security-Assurance", "security-review.md")
    )

    adr_src = os.path.join(base_dir, "docs", "adr")
    if os.path.exists(adr_src):
        for adr_file in os.listdir(adr_src):
            if adr_file.endswith(".md"):
                shutil.copy(
                    os.path.join(adr_src, adr_file),
                    os.path.join(bundle_dir, "05-Architecture-and-Security-Assurance", "adr", adr_file)
                )

    # 8. Create ZIP archive
    zip_output_path = os.path.join(dist_dir, f"{bundle_name}.zip")
    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(bundle_dir):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, dist_dir)
                zipf.write(file_path, rel_path)

    print(f"\n✅ Customer Bundle successfully built at:\n   {bundle_dir}")
    print(f"📦 Customer ZIP Archive created at:\n   {zip_output_path}")
    print(f"   Size: {os.path.getsize(zip_output_path) / 1024:.1f} KB")

if __name__ == "__main__":
    build_customer_bundle()
