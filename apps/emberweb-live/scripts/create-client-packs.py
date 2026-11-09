"""Build the public client PDFs. Supply JSON exported from company.mjs/portfolio.mjs.

Requires ReportLab and Pillow; authoring dependencies are not website dependencies.
Usage: python scripts/create-client-packs.py SOURCE_JSON
"""
import json
import sys
from pathlib import Path
from html import escape
from io import BytesIO

from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
COMPANY, PROJECTS = DATA["company"], DATA["projects"]
OUT = ROOT / "assets" / "downloads"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 595.28, 841.89
M, CW = 48, W - 96
INK, BLUE, LIME = "#081426", "#205DE8", "#D4FF24"
MUTED, PALE = "#475B74", "#EDF2F8"
FONT = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Body", str(FONT / "arial.ttf")))
pdfmetrics.registerFont(TTFont("Bold", str(FONT / "arialbd.ttf")))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Bold", italic="Body", boldItalic="Bold")


def image(name):
    im = Image.open(ROOT / "assets" / name).convert("RGB")
    # Crop to the cover frame without stretching the original artwork.
    im = ImageOps.fit(im, (1536, round(1536 * 248 / CW)), method=Image.Resampling.LANCZOS)
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=94)
    buf.seek(0)
    return ImageReader(buf)


class Pack:
    def __init__(self, name, title, pages):
        self.path = OUT / name
        self.c = canvas.Canvas(str(self.path), pagesize=(W, H), pageCompression=1)
        self.c.setTitle(title)
        self.c.setAuthor(COMPANY["brand"])
        self.c.setSubject("Public client information | November 2026")
        self.page = 0
        self.pages = pages
        self.title = title

    def rect(self, x, y, w, h, colour, radius=0):
        self.c.setFillColor(HexColor(colour))
        if radius:
            self.c.roundRect(x, H-y-h, w, h, radius, fill=1, stroke=0)
        else:
            self.c.rect(x, H-y-h, w, h, fill=1, stroke=0)

    def text(self, text, x, y, width=CW, size=11, colour=INK, bold=False, leading=None):
        style = ParagraphStyle("copy", fontName="Bold" if bold else "Body", fontSize=size,
                               leading=leading or size*1.48, textColor=HexColor(colour))
        p = Paragraph(text, style)
        _, height = p.wrap(width, H)
        if y+height > H-60:
            raise ValueError(f"Overflow on {self.title} page {self.page}: {text[:70]}")
        p.drawOn(self.c, x, H-y-height)
        return y+height

    def rule(self, y):
        self.rect(M, y, CW, 1, "#D4DFEC")

    def new(self, section, dark=False):
        if self.page:
            self.c.showPage()
        self.page += 1
        self.dark = dark
        self.rect(0, 0, W, H, INK if dark else "#FAFBFE")
        self.c.drawImage(str(ROOT / "assets/brand/ember-mark.png"), M, H-70, 28, 28, mask="auto", preserveAspectRatio=True)
        self.text("EMBERWEB", M+38, 45, width=160, size=13, bold=True, colour="#FFFFFF" if dark else INK)
        self.text(section.upper(), W-246, 49, width=198, size=8, colour="#B6CBE5" if dark else MUTED)
        self.rect(M, H-48, CW, .6, "#314461" if dark else "#CFDAE8")
        name = COMPANY.get("legalName") or COMPANY["brand"]
        reg = COMPANY.get("registrationNumber")
        legal = name + (" | Reg. " + reg if reg else " | South Africa")
        self.c.setFont("Body", 7)
        self.c.setFillColor(HexColor("#B6CBE5" if dark else MUTED))
        self.c.drawString(M, 29, legal)
        self.c.drawRightString(W-M, 29, f"NOV 2026   /   {self.page:02d}")

    def heading(self, label, title, subtitle):
        self.text(label.upper(), M, 104, size=9, colour=BLUE, bold=True)
        y = self.text(title, M, 129, size=31, bold=True, leading=35)
        return self.text(subtitle, M, y+15, size=11, colour=MUTED)+28

    def button(self, label, url, x, y, width=230):
        self.rect(x, y, width, 40, LIME, 6)
        self.text(label, x+14, y+12, width=width-28, size=10, bold=True)
        self.c.linkURL(url, (x, H-y-40, x+width, H-y), relative=0, thickness=0)

    def cover(self, title, deck, art, contents):
        self.new("Client welcome" if "welcome" in self.path.name else "Capabilities & projects", dark=True)
        self.rect(M, 113, 42, 4, LIME)
        self.text(title, M, 142, size=43, colour="#FFFFFF", bold=True, leading=47)
        self.text(deck, M, 259, width=455, size=14, colour="#C4D5EC", leading=21)
        self.c.drawImage(image(art), M, H-590, CW, 248, preserveAspectRatio=False)
        self.text("INSIDE THIS GUIDE", M, 619, size=8, colour="#D4FF24", bold=True)
        y = 641
        for number, line in contents:
            self.text(number, M, y, width=30, size=10, colour="#D4FF24")
            self.text(line, M+38, y, width=CW-38, size=11, colour="#DEE8F5")
            y += 29
        self.c.linkURL(COMPANY["website"], (M, 78, W-M, 110), relative=0, thickness=0)
        self.text("emberweb.co.za", M, 743, size=10, colour="#B6CBE5")

    def finish(self):
        assert self.page == self.pages, (self.page, self.pages)
        self.c.save()
        print(f"{self.path}: {self.page} pages")


def welcome():
    p = Pack("emberweb-welcome-pack.pdf", "Welcome to EmberWeb", 3)
    p.cover("Your next idea. <br/>A clear way forward.",
            "A practical guide to starting a website, app or AI project with EmberWeb.",
            "visuals/library/hero-start.webp",
            [("02", "How a project moves from conversation to launch"),
             ("03", "What to prepare and how to get in touch")])
    p.new("How we work")
    y = p.heading("The project journey", "Know what happens next.",
                  "Start with the job you need done. We help turn it into a focused first build, with scope, timing and price agreed before work begins.")
    steps = [
        ("01", "Tell us the goal", "Send a short brief about your business or idea, the people who will use it and the problem you want to solve. You do not need a technical specification."),
        ("02", "Agree the first build", "We discuss the workflow, priorities and constraints, then confirm the proposed scope, timing, price and any third-party costs in writing."),
        ("03", "Review and approve", "Once the proposal is accepted, the agreed build starts. You review the work against the agreed scope and give feedback at the planned checkpoints."),
        ("04", "Launch and hand over", "We check the agreed flows and prepare the launch. Domain ownership, access, handover and any ongoing EmberCare support are agreed in writing."),
    ]
    for num, title, copy in steps:
        p.rect(M, y, 34, 29, PALE, 5)
        p.text(num, M+9, y+7, width=20, size=10, colour=BLUE, bold=True)
        p.text(title, M+50, y, width=CW-50, size=15, bold=True)
        bottom = p.text(copy, M+50, y+29, width=CW-50, size=11, colour=MUTED)
        y = bottom+28
    p.rect(M, y, CW, 67, PALE, 7)
    p.text("A clear agreement first", M+16, y+12, width=CW-32, size=11, bold=True)
    p.text("A private invoice follows an accepted proposal if payment is due. There is no public checkout or automatic project commitment.", M+16, y+31, width=CW-32, size=10, colour=MUTED)
    p.new("Your first conversation")
    y = p.heading("A useful starting point", "Bring the problem.<br/>We will work on the plan.",
                  "A few real examples help us understand your business faster. Share what you have; we can identify the gaps together.")
    items = [
        ("The outcome", "What should become easier, faster or clearer? Who will use the website or tool?"),
        ("The current way of working", "Describe the steps, tools and handovers involved. An anonymised example is enough."),
        ("Your starting materials", "Bring existing branding, approved copy, a website link or screen references if you have them."),
        ("Budget, timing and priorities", "Tell us your target date, budget range and what the first version must do."),
    ]
    for title, copy in items:
        p.text(title, M, y, size=12, bold=True)
        y = p.text(copy, M, y+23, size=11, colour=MUTED)+23
    p.rule(y)
    y += 22
    p.text("Choose your next step", M, y, size=17, bold=True)
    p.button("Send a project brief", COMPANY["website"]+"/start", M, y+34, 235)
    p.button("Chat on WhatsApp", COMPANY["whatsapp"], M+250, y+34, 249)
    p.text("Book a discovery call: <link href='https://emberweb.co.za/book' color='#205DE8'>emberweb.co.za/book</link><br/>WhatsApp: +27 72 339 8781", M, y+88, size=11, colour=MUTED)
    p.text("Please keep passwords, bank details and sensitive customer records out of an initial enquiry. Project terms and privacy information: <link href='https://emberweb.co.za/policies' color='#205DE8'>emberweb.co.za/policies</link>.", M, y+143, size=9, colour=MUTED)
    p.finish()


def capabilities():
    p = Pack("emberweb-capabilities.pdf", "EmberWeb | Capabilities and projects", 6)
    p.cover("Useful software.<br/>Built around you.",
            "Websites, custom apps and practical AI for businesses and people. A public overview of our capabilities and 12 projects.",
            "visuals/library/hero-solutions.webp",
            [("02", "What we can build for you"), ("03-05", "Twelve projects, explained simply"),
             ("06", "From your first idea to a supported launch")])
    p.new("Our capabilities")
    y = p.heading("What we build", "Start with something useful.",
                  "Choose a problem worth solving. We combine the right interface, workflow and integrations around that goal.")
    services = [
        ("Websites & online stores", "Clear service pages, product journeys, enquiry forms and booking paths that work on phones and desktops."),
        ("Custom apps & portals", "Dashboards, client workspaces and mobile-friendly tools for capture, reporting, approvals and daily operations."),
        ("AI knowledge tools", "Help people find answers in approved documents, with source references and a defined review process."),
        ("Workflow automation", "Connect forms, spreadsheets and business tools. Route tasks, prepare drafts and keep the right person in the loop."),
        ("Planning & AI assistance", "Help shape a business idea, organise research or simplify a recurring personal task. AI outputs need checking before use."),
        ("EmberCare & ongoing support", "Agree the support, maintenance and improvement work your website or system needs after launch."),
    ]
    colw = (CW-24)/2
    for i, (title, copy) in enumerate(services):
        x = M+(i % 2)*(colw+24)
        top = y+(i//2)*143
        p.rect(x, top, 28, 3, BLUE)
        ty = p.text(title, x, top+16, width=colw, size=14, bold=True, leading=18)
        p.text(copy, x, ty+11, width=colw, size=10.5, colour=MUTED)
    p.rect(M, 715, CW, 42, PALE, 6)
    p.text("Examples are starting points. Features, data access and integrations are agreed for each project.", M+14, 727, width=CW-28, size=9, colour=MUTED)
    groups = [
        (PROJECTS[:4], "Operations & control", "Tools that give everyday work a clear place to happen."),
        (PROJECTS[4:8], "Capture & connection", "From a stock report to a shared product reference."),
        (PROJECTS[8:], "Clients, teams & learning", "Experiences that fit the people using them."),
    ]
    for projects, title, sub in groups:
        p.new("Project overview")
        y = p.heading("Our project collection", title, sub)
        for project in projects:
            p.text(escape(project["type"]).upper(), M, y, size=8, colour=BLUE, bold=True)
            p.text(escape(project["name"]), M, y+20, size=17, bold=True)
            bottom = p.text(escape(project["summary"]), M, y+49, size=10.5, colour=MUTED)
            if project.get("url"):
                label = project["url"].replace("https://", "").rstrip("/")
                p.text(f"<link href='{escape(project['url'])}' color='#205DE8'>{escape(label)}</link>", M, bottom+9, size=9)
            else:
                p.text("Private project | demonstration by arrangement", M, bottom+9, size=9, colour=MUTED)
            y += 128
            p.rule(y-12)
        p.text("Public summaries only. Private systems are described without client data, internal architecture or access details. This collection is a snapshot; ask about current availability.", M, 737, size=8.5, colour=MUTED)
    p.new("Your project")
    y = p.heading("From idea to launch", "Choose a focused first build.",
                  "We can help plan an idea, improve an existing website or build software around the way your business works.")
    rows = [
        ("Define the need", "We map the people, the current process and the result you want."),
        ("Agree the scope", "We confirm deliverables, timing, price, responsibilities and any third-party services in a proposal."),
        ("Build and review", "You review the agreed experience and give feedback before launch."),
        ("Launch and support", "We agree the handover, access and ongoing support. Future phases can follow as priorities become clearer."),
    ]
    for title, copy in rows:
        p.text(title, M, y, size=13, bold=True)
        y = p.text(copy, M, y+25, size=11, colour=MUTED)+26
    p.rule(y)
    y += 23
    p.text("Tell us what would make your work easier.", M, y, size=17, bold=True)
    p.button("Start a project", COMPANY["website"]+"/start", M, y+37, 235)
    p.button("Talk on WhatsApp", COMPANY["whatsapp"], M+250, y+37, 249)
    p.text("WhatsApp: +27 72 339 8781<br/><link href='https://emberweb.co.za/packages' color='#205DE8'>Current website packages</link>  /  <link href='https://emberweb.co.za/portfolio' color='#205DE8'>Explore the portfolio</link>  /  <link href='https://emberweb.co.za/book' color='#205DE8'>Book a call</link>", M, y+92, size=11, colour=MUTED)
    p.text("Public information as at 9 November 2026. Scope and pricing are confirmed in a proposal. This brochure does not grant access to private projects or disclose their implementation.", M, y+152, size=9, colour=MUTED)
    p.finish()


welcome()
capabilities()
