const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
require("dotenv").config();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(expressLayouts);
app.set("layout", path.join(__dirname, "layouts", "main"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || "lit-local-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 8 }
}));

app.use(express.static(path.join(__dirname, "public")));

// Bootstrap
app.use(
    "/bootstrap",
    express.static(
        path.join(__dirname, "node_modules/bootstrap/dist")
    )
);

app.use(
    "/icons",
    express.static(
        path.join(__dirname, "node_modules/bootstrap-icons/font")
    )
);

const indexRoutes = require("./routes/index");
app.use("/", indexRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 LIT Technologies Africa running on port ${PORT}`);
});