const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const archiver = require("archiver");
const router = express.Router();

const dataPath = path.join(__dirname, "..", "data", "albums.json");
const uploadRoot = path.join(__dirname, "..", "public", "uploads", "albums");
const announcementsPath = path.join(__dirname, "..", "data", "announcements.json");
const announcementRoot = path.join(__dirname, "..", "public", "uploads", "announcements");
const ribbonAnnouncementsPath = path.join(__dirname, "..", "data", "ribbon-announcements.json");
const ribbonAnnouncementRoot = path.join(__dirname, "..", "public", "uploads", "ribbon-announcements");
const creatorUploadRoot = path.join(uploadRoot, "created");
fs.mkdirSync(uploadRoot, { recursive: true });
fs.mkdirSync(announcementRoot, { recursive: true });
fs.mkdirSync(ribbonAnnouncementRoot, { recursive: true });
fs.mkdirSync(creatorUploadRoot, { recursive: true });

const readAlbums = () => JSON.parse(fs.readFileSync(dataPath, "utf8"));
const writeAlbums = (albums) => fs.writeFileSync(dataPath, JSON.stringify(albums, null, 2));
const readAnnouncements = () => JSON.parse(fs.readFileSync(announcementsPath, "utf8"));
const writeAnnouncements = (items) => fs.writeFileSync(announcementsPath, JSON.stringify(items, null, 2));
const readRibbonAnnouncements = () => JSON.parse(fs.readFileSync(ribbonAnnouncementsPath, "utf8"));
const writeRibbonAnnouncements = (items) => fs.writeFileSync(ribbonAnnouncementsPath, JSON.stringify(items, null, 2));
const isAdmin = (req) => req.session && req.session.isAdmin;
const requireAdmin = (req, res, next) => isAdmin(req) ? next() : res.redirect("/admin/login");

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        const albumId = req.albumId || req.body.albumId || `album-${Date.now()}`;
        req.albumId = albumId;
        const destination = path.join(uploadRoot, albumId);
        fs.mkdirSync(destination, { recursive: true });
        callback(null, destination);
    },
    filename: (req, file, callback) => {
        const cleanName = file.originalname.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        callback(null, `${Date.now()}-${cleanName}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024, files: 30 },
    fileFilter: (req, file, callback) => {
        const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
        callback(null, allowed.includes(file.mimetype));
    }
});

const creatorUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => {
            const albumId = req.albumId || `created-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            req.albumId = albumId;
            const destination = path.join(creatorUploadRoot, albumId);
            fs.mkdirSync(destination, { recursive: true });
            callback(null, destination);
        },
        filename: (req, file, callback) => {
            const cleanName = file.originalname.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
            callback(null, `${Date.now()}-${cleanName}`);
        }
    }),
    limits: { fileSize: 30 * 1024 * 1024, files: 30 },
    fileFilter: (req, file, callback) => {
        callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
    }
});

const announcementUpload = multer({
    storage: multer.diskStorage({
        destination: announcementRoot,
        filename: (req, file, callback) => {
            const cleanName = file.originalname.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
            callback(null, `${Date.now()}-${cleanName}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 12 },
    fileFilter: (req, file, callback) => {
        callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
    }
});

const ribbonAnnouncementUpload = multer({
    storage: multer.diskStorage({
        destination: ribbonAnnouncementRoot,
        filename: (req, file, callback) => {
            const cleanName = file.originalname.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
            callback(null, `${Date.now()}-${cleanName}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 12 },
    fileFilter: (req, file, callback) => {
        callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
    }
});

const services = {
    services: {
        eyebrow: "Technology that moves business forward",
        title: "Build the systems your next chapter needs.",
        description: "From reliable infrastructure to intelligent digital products, LIT brings strategy, engineering, and enablement together under one roof.",
        icon: "bi-grid-1x2-fill",
        accent: "mint",
        features: ["Digital strategy and product discovery", "Web and mobile application development", "Managed support for growing teams", "Data, automation, and AI enablement"]
    },
    hosting: {
        eyebrow: "LIT Cloud",
        title: "Hosting with a human on standby.",
        description: "Fast, secure, managed hosting for websites, business apps, and APIs. We handle the infrastructure so your team can focus on the work.",
        icon: "bi-cloud-arrow-up-fill",
        accent: "blue",
        features: ["Managed VPS and business hosting", "SSL, backups, monitoring, and updates", "Domain registration and email setup", "Migration support with zero drama"]
    },
    school: {
        eyebrow: "LIT School",
        title: "Learn the skills the market is asking for.",
        description: "Practical, mentor-led programs for students, teams, and career switchers. Learn by building, ship a portfolio, and leave with a clearer next move.",
        icon: "bi-mortarboard-fill",
        accent: "school",
        features: ["Software engineering and web development", "AI productivity and data literacy", "Cybersecurity and cloud fundamentals", "Career coaching and industry mentorship"],
        courses: [
            { title: "Web Development", icon: "bi-code-slash", description: "Build responsive websites and modern web apps." },
            { title: "Data & AI", icon: "bi-bar-chart-line", description: "Turn data into useful decisions and products." },
            { title: "Cybersecurity", icon: "bi-shield-lock", description: "Learn the foundations of safer digital systems." },
            { title: "Cloud Computing", icon: "bi-cloud-check", description: "Understand and deploy the cloud with confidence." },
            { title: "Digital Design", icon: "bi-bezier2", description: "Design clear, useful experiences people enjoy." }
        ]
    },
    hotspot: {
        eyebrow: "LIT Connect",
        title: "Turn connectivity into a better business.",
        description: "A complete hotspot billing and access platform for cafes, campuses, hotels, estates, and community networks across Africa.",
        icon: "bi-router-fill",
        accent: "violet",
        features: ["Voucher, subscription, and pay-as-you-go plans", "MTN MoMo and Airtel Money ready", "Live usage, revenue, and customer insights", "MikroTik setup, support, and maintenance"]
    }
};

const hostingPage = {
    services: [
        { icon: "bi-globe2", title: "Domain Registration & DNS", description: "Secure your brand with the perfect domain name. We handle registration, DNS setup and management." },
        { icon: "bi-cpu", title: "cPanel Web Hosting", description: "Powerful, easy-to-use cPanel hosting with full control of your website, emails and databases." },
        { icon: "bi-cloud-arrow-up", title: "Production Deployment", description: "Deploy your applications with confidence. We support modern stacks and CI/CD workflows." },
        { icon: "bi-envelope", title: "Business Email", description: "Get professional email addresses with your domain. Stay credible, build trust, and communicate better." }
    ],
    plans: [
        { name: "Starter", description: "Perfect for personal websites and small projects.", price: "50,000", features: ["10 GB NVMe SSD storage", "1 website", "10 email accounts", "1 database", "Free SSL certificate", "Daily backups (7 days)", "cPanel access", "Free migration (1 site)", "24/7 support"] },
        { name: "Business", description: "Ideal for growing businesses and blogs.", price: "120,000", popular: true, features: ["50 GB NVMe SSD storage", "Unlimited websites", "Unlimited email accounts", "5 databases", "Free SSL certificate", "Daily backups (14 days)", "cPanel access", "Free migration (up to 5 sites)", "Priority 24/7 support"] },
        { name: "Pro", description: "For high-traffic sites and larger businesses.", price: "250,000", features: ["100 GB NVMe SSD storage", "Unlimited websites", "Unlimited email accounts", "Unlimited databases", "Free SSL certificate", "Daily backups (30 days)", "cPanel access", "Free migration (unlimited)", "Priority 24/7 support"] }
    ],
    deployment: [
        { icon: "bi-globe2", title: "Domain", description: "Register or transfer your domain name." },
        { icon: "bi-database", title: "DNS", description: "Configure DNS and point to your server." },
        { icon: "bi-server", title: "Hosting / Server", description: "Set up your hosting environment." },
        { icon: "bi-shield-check", title: "SSL & Security", description: "Enable SSL, firewall and protection." },
        { icon: "bi-code-slash", title: "Deploy", description: "Push your code via Git or one-click deploy." },
        { icon: "bi-check-circle", title: "Live", description: "Your website or app is now online." }
    ],
    technologies: [
        { icon: "bi-git", name: "Git" },
        { icon: "bi-node-plus", name: "Node.js" },
        { icon: "bi-filetype-php", name: "PHP" },
        { icon: "bi-laravel", name: "Laravel" },
        { icon: "bi-wordpress", name: "WordPress" },
        { icon: "bi-filetype-jsx", name: "React" }
    ],
    extras: [
        { icon: "bi-git", title: "Git-based deployment", description: "Deploy directly from your Git repository." },
        { icon: "bi-shield-lock", title: "Malware protection", description: "Advanced scanning and threat removal." },
        { icon: "bi-arrow-repeat", title: "Website migration", description: "Move your site with zero downtime." },
        { icon: "bi-hdd-network", title: "VPS / Cloud deployment", description: "Dedicated resources and flexible infrastructure." },
        { icon: "bi-activity", title: "Monitoring & uptime alerts", description: "24/7 monitoring with instant alerts." },
        { icon: "bi-lock", title: "SSL setup & renewal", description: "Keep your site secure and trusted." },
        { icon: "bi-envelope", title: "CDN & performance optimization", description: "Faster load times, better user experience." },
        { icon: "bi-database-check", title: "Automated backups", description: "Scheduled and on-demand backups." },
        { icon: "bi-globe2", title: "DNS management", description: "Full control of your domain DNS records." },
        { icon: "bi-envelope-check", title: "Business email setup", description: "Professional email on your domain." },
        { icon: "bi-kanban", title: "Staging environments", description: "Test before you go live." }
    ]
};

router.get("/", (req, res) => {
    res.render("home/index", {
        title: "LIT Technologies Africa | Build what matters",
        activePage: "home",
        announcements: readAnnouncements().filter((item) => item.published !== false),
        ribbonAnnouncements: readRibbonAnnouncements().filter((item) => item.published !== false)
    });
});

router.get("/about", (req, res) => res.render("about", { title: "About LIT Technologies Africa", activePage: "about" }));

router.get("/services", (req, res) => res.render("service", { title: "Technology Services | LIT Technologies Africa", activePage: "services", service: services.services }));
router.get("/hosting", (req, res) => res.render("hosting", { title: "Web Hosting & Deployment | LIT Technologies Africa", activePage: "hosting", hosting: hostingPage }));
router.get("/school", (req, res) => res.render("service", { title: "LIT School | LIT Technologies Africa", activePage: "school", service: services.school }));
router.get("/hotspot", (req, res) => res.render("service", { title: "Hotspot Billing | LIT Technologies Africa", activePage: "hotspot", service: services.hotspot }));
router.get("/contact", (req, res) => res.render("contact", { title: "Contact LIT Technologies Africa", activePage: "contact" }));

router.get("/album", (req, res) => {
    const albums = readAlbums().filter((album) => album.published !== false);
    const freeLimit = 5;
    const paidLimit = 30;
    const isSubscribed = Boolean(req.session.subscribed);
    const files = albums.flatMap((album) => album.files.map((file, index) => ({
        ...file,
        albumId: album.id,
        albumTitle: album.title,
        pageNumber: index + 1,
        fileIndex: index
    })));

    res.render("digital_album", {
        title: "Digital Album | LIT Technologies Africa",
        activePage: "album",
        albums,
        files,
        heroFiles: files.slice(0, 2),
        freeLimit,
        paidLimit,
        isSubscribed,
        query: req.query
    });
});

router.post("/subscribe/checkout", (req, res) => {
    const paymentUrl = process.env.PAYMENT_URL;
    if (!paymentUrl) {
        return res.status(503).json({ error: "Subscription checkout is not configured yet." });
    }

    res.json({ url: paymentUrl });
});

router.get("/subscribe/verify", (req, res) => {
    const expectedToken = process.env.SUBSCRIPTION_VERIFY_TOKEN;
    const receivedToken = typeof req.query.token === "string" ? req.query.token : "";
    if (!expectedToken || receivedToken !== expectedToken) {
        return res.redirect("/album?subscription=failed");
    }

    req.session.subscribed = true;
    res.redirect("/album?subscription=success");
});

router.get("/api/can-download", (req, res) => {
    if (req.session.subscribed) return res.sendStatus(200);
    res.sendStatus(402);
});

router.post("/albums/create", creatorUpload.array("images", 30), (req, res) => {
    const files = req.files || [];
    const maximumImages = req.session.subscribed ? 30 : 5;
    if (!files.length) return res.status(400).json({ success: false, message: "Please select at least one image." });
    if (files.length > maximumImages) {
        files.forEach((file) => fs.rmSync(file.path, { force: true }));
        return res.status(403).json({
            success: false,
            message: `Your current plan allows ${maximumImages} images.`,
            upgradeRequired: !req.session.subscribed
        });
    }

    const albumId = req.albumId;
    const album = {
        id: albumId,
        title: (req.body.title || "My LIT digital album").trim().slice(0, 120),
        description: "Created with LIT Digital Albums.",
        createdAt: new Date().toISOString(),
        published: true,
        creator: true,
        ownerSession: req.sessionID,
        files: files.map((file) => ({
            name: file.originalname,
            url: `/uploads/albums/created/${albumId}/${file.filename}`,
            path: file.path,
            type: file.mimetype
        }))
    };
    const albums = readAlbums();
    albums.unshift(album);
    writeAlbums(albums);
    res.status(201).json({ success: true, albumId, albumUrl: `/album/${albumId}` });
});

router.get("/albums/:id/download", (req, res) => {
    if (!req.session.subscribed) return res.status(402).send("A subscription is required to download this album.");
    const album = readAlbums().find((item) => item.id === req.params.id && item.creator);
    if (!album) return res.status(404).send("Album not found");

    const archive = archiver("zip", { zlib: { level: 9 } });
    res.attachment(`${album.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "lit-album"}.zip`);
    archive.on("error", (error) => {
        console.error("Album export error:", error);
        if (!res.headersSent) res.status(500).send("Unable to export album.");
    });
    archive.pipe(res);
    const images = album.files.map((file, index) => ({ ...file, archiveName: `assets/image-${String(index + 1).padStart(2, "0")}${path.extname(file.name).toLowerCase() || ".jpg"}` }));
    const pageMarkup = images.map((file) => `<img src="${file.archiveName}" alt="${file.name.replace(/"/g, "&quot;")}">`).join("");
    archive.append(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${album.title}</title><link rel="stylesheet" href="album.css"></head><body><main><p class="eyebrow">LIT Digital Albums</p><h1>${album.title.replace(/[<>&"]/g, "")}</h1><div class="book">${pageMarkup}</div><p class="hint">Use the buttons or arrow keys to turn pages.</p><button id="prev">Previous</button><button id="next">Next</button></main><script src="album.js"></script><script src="sound.js"></script></body></html>`, { name: "index.html" });
    archive.append(`:root{font-family:Arial,sans-serif;color:#173027;background:#f5f8f2}body{margin:0;padding:40px}main{max-width:1000px;margin:auto}.eyebrow{color:#579a50;font-weight:700;letter-spacing:.15em;text-transform:uppercase}.book{display:grid;grid-template-columns:1fr 1fr;min-height:520px;background:#fff;box-shadow:0 18px 45px #17302733}.book img{width:100%;height:520px;object-fit:cover}.hint{color:#617975}button{padding:10px 18px;margin-right:8px;background:#9be86c;border:0;border-radius:4px;font-weight:700}`, { name: "album.css" });
    archive.append(`const pages=[...document.querySelectorAll(".book img")];let index=0;const render=()=>pages.forEach((page,i)=>page.style.display=i===index||i===index+1?"block":"none");document.querySelector("#next").onclick=()=>{if(index<pages.length-2){index+=2;render()}};document.querySelector("#prev").onclick=()=>{if(index>0){index-=2;render()}};document.onkeydown=e=>{if(e.key==="ArrowRight")document.querySelector("#next").click();if(e.key==="ArrowLeft")document.querySelector("#prev").click()};render();`, { name: "album.js" });
    archive.append(`const AudioContext=window.AudioContext||window.webkitAudioContext;let ctx;document.addEventListener("click",()=>{if(!ctx)ctx=new AudioContext()},{once:true});document.addEventListener("keydown",()=>{if(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=140;g.gain.value=.03;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.08)}});`, { name: "sound.js" });
    images.forEach((file) => archive.file(file.path, { name: file.archiveName }));
    archive.finalize();
});

router.get("/albums/:id/files/:index", (req, res) => {
    if (!req.session.subscribed) return res.status(402).send("A subscription is required to download album pages.");
    const album = readAlbums().find((item) => item.id === req.params.id && item.creator);
    const index = Number(req.params.index);
    if (!album || !Number.isInteger(index) || !album.files[index]) return res.status(404).send("Album page not found");
    const file = album.files[index];
    const filePath = file.path || path.join(__dirname, "..", "public", file.url);
    res.download(filePath, file.name);
});

router.get("/album/:id", (req, res) => {
    const album = readAlbums().find((item) => item.id === req.params.id && item.published !== false);
    if (!album) return res.status(404).send("Album not found");
    res.render("album-reader", { title: `${album.title} | LIT Technologies Africa`, activePage: "album", album });
});

router.get("/admin/login", (req, res) => {
    if (isAdmin(req)) return res.redirect("/admin/albums");
    res.render("admin-login", { title: "Admin login | LIT Technologies Africa", error: null });
});

router.post("/admin/login", (req, res) => {
    const password = process.env.ADMIN_PASSWORD || "lit-admin";
    if (req.body.password !== password) {
        return res.status(401).render("admin-login", { title: "Admin login | LIT Technologies Africa", error: "That password did not match." });
    }
    req.session.isAdmin = true;
    res.redirect("/admin/albums");
});

router.post("/admin/logout", requireAdmin, (req, res) => {
    req.session.destroy(() => res.redirect("/admin/login"));
});

router.get("/admin/albums", requireAdmin, (req, res) => {
    res.render("admin-albums", { title: "Manage albums | LIT Technologies Africa", albums: readAlbums(), announcements: readAnnouncements(), ribbonAnnouncements: readRibbonAnnouncements(), query: req.query });
});

router.post("/admin/albums", requireAdmin, upload.array("files", 30), (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).send("Please choose a PDF or at least one image.");
    const albumId = req.albumId || `album-${Date.now()}`;
    const album = {
        id: albumId,
        title: (req.body.title || "LIT album").trim(),
        description: (req.body.description || "").trim(),
        createdAt: new Date().toISOString(),
        published: true,
        files: req.files.map((file) => ({ name: file.originalname, url: `/uploads/albums/${albumId}/${file.filename}`, type: file.mimetype }))
    };
    const albums = readAlbums();
    albums.unshift(album);
    writeAlbums(albums);
    res.redirect(`/admin/albums?saved=${encodeURIComponent(album.title)}`);
});

router.post("/admin/albums/:id/delete", requireAdmin, (req, res) => {
    const albums = readAlbums();
    const album = albums.find((item) => item.id === req.params.id);
    if (album) fs.rmSync(path.join(uploadRoot, album.id), { recursive: true, force: true });
    writeAlbums(albums.filter((item) => item.id !== req.params.id));
    res.redirect("/admin/albums");
});

router.post("/admin/announcements", requireAdmin, announcementUpload.array("announcementFiles", 12), (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).send("Please choose at least one announcement image.");
    const items = readAnnouncements();
    req.files.reverse().forEach((file) => {
        items.unshift({
            id: `announcement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: (req.body.announcementTitle || "LIT announcement").trim(),
            image: `/uploads/announcements/${file.filename}`,
            createdAt: new Date().toISOString(),
            published: true
        });
    });
    writeAnnouncements(items);
    res.redirect(`/admin/albums?saved=${encodeURIComponent("Announcement images")}`);
});

router.post("/admin/announcements/:id/delete", requireAdmin, (req, res) => {
    const items = readAnnouncements();
    const item = items.find((announcement) => announcement.id === req.params.id);
    if (item) fs.rmSync(path.join(__dirname, "..", "public", item.image), { force: true });
    writeAnnouncements(items.filter((announcement) => announcement.id !== req.params.id));
    res.redirect("/admin/albums");
});

router.post("/admin/ribbon-announcements", requireAdmin, ribbonAnnouncementUpload.array("ribbonAnnouncementFiles", 12), (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).send("Please choose at least one ribbon announcement image.");
    const items = readRibbonAnnouncements();
    req.files.reverse().forEach((file) => {
        items.unshift({
            id: `ribbon-announcement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: (req.body.ribbonAnnouncementTitle || "LIT ribbon announcement").trim(),
            image: `/uploads/ribbon-announcements/${file.filename}`,
            createdAt: new Date().toISOString(),
            published: true
        });
    });
    writeRibbonAnnouncements(items);
    res.redirect(`/admin/albums?saved=${encodeURIComponent("Ribbon announcements")}`);
});

router.post("/admin/ribbon-announcements/:id/delete", requireAdmin, (req, res) => {
    const items = readRibbonAnnouncements();
    const item = items.find((announcement) => announcement.id === req.params.id);
    if (item && item.image.startsWith("/uploads/ribbon-announcements/")) fs.rmSync(path.join(__dirname, "..", "public", item.image), { force: true });
    writeRibbonAnnouncements(items.filter((item) => item.id !== req.params.id));
    res.redirect("/admin/albums");
});

module.exports = router;