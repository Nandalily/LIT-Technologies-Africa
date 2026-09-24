const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const router = express.Router();

const dataPath = path.join(__dirname, "..", "data", "albums.json");
const uploadRoot = path.join(__dirname, "..", "public", "uploads", "albums");
const announcementsPath = path.join(__dirname, "..", "data", "announcements.json");
const announcementRoot = path.join(__dirname, "..", "public", "uploads", "announcements");
fs.mkdirSync(uploadRoot, { recursive: true });
fs.mkdirSync(announcementRoot, { recursive: true });

const readAlbums = () => JSON.parse(fs.readFileSync(dataPath, "utf8"));
const writeAlbums = (albums) => fs.writeFileSync(dataPath, JSON.stringify(albums, null, 2));
const readAnnouncements = () => JSON.parse(fs.readFileSync(announcementsPath, "utf8"));
const writeAnnouncements = (items) => fs.writeFileSync(announcementsPath, JSON.stringify(items, null, 2));
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
        features: ["Software engineering and web development", "AI productivity and data literacy", "Cybersecurity and cloud fundamentals", "Career coaching and industry mentorship"]
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

router.get("/", (req, res) => {
    res.render("home/index", {
        title: "LIT Technologies Africa | Build what matters",
        activePage: "home",
        announcements: readAnnouncements().filter((item) => item.published !== false)
    });
});

router.get("/services", (req, res) => res.render("service", { title: "Technology Services | LIT Technologies Africa", activePage: "services", service: services.services }));
router.get("/hosting", (req, res) => res.render("service", { title: "Managed Hosting | LIT Technologies Africa", activePage: "hosting", service: services.hosting }));
router.get("/school", (req, res) => res.render("service", { title: "LIT School | LIT Technologies Africa", activePage: "school", service: services.school }));
router.get("/hotspot", (req, res) => res.render("service", { title: "Hotspot Billing | LIT Technologies Africa", activePage: "hotspot", service: services.hotspot }));
router.get("/contact", (req, res) => res.render("contact", { title: "Contact LIT Technologies Africa", activePage: "contact" }));

router.get("/album", (req, res) => {
    const albums = readAlbums().filter((album) => album.published !== false);
    res.render("album", { title: "Digital Albums | LIT Technologies Africa", activePage: "album", albums });
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
    res.render("admin-albums", { title: "Manage albums | LIT Technologies Africa", albums: readAlbums(), announcements: readAnnouncements(), query: req.query });
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

module.exports = router;