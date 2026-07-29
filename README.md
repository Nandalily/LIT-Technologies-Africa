# LIT-Technologies-Africa
Intrnational company Website built with Express.js

Here's a build plan for LIT Technologies Africa, structured so you can work through it in phases. Since your **LIT Hotspot billing system / LIT Hotspot Connection** services overlap heavily with the MikroTik + MTN/Airtel Money billing system you're already building, I'll flag where you can plug that project in directly rather than rebuild it.

## 1. Tech stack

- **Backend**: Node.js + Express.js, REST API (or add GraphQL later if needed)
- **Frontend**: Since you want "both frontend and backend in Express/Node," go with **Express + EJS/Handlebars + HTMX or Alpine.js** for server-rendered pages (fast to build, great SEO for a marketing site), OR **Express API + a separate React/Next.js frontend** if you want a richer admin dashboard and app-like feel. For a company site with events, payments, and an admin panel, I'd lean **server-rendered Express (EJS) for public pages + a small React SPA mounted just for the admin dashboard** — best of both without overengineering.
- **Database**: PostgreSQL with Prisma ORM (you already use Prisma — reuse that familiarity)
- **Auth**: JWT + refresh tokens, or session-based with `express-session` + `connect-pg-simple` if server-rendered
- **Payments**: Mobile Money (MTN MoMo, Airtel Money) since you're Uganda-based and international — plus Flutterwave or Paystack for card payments from other African/international users
- **File storage**: Cloudinary or S3-compatible (event images, certificates, achiever photos)
- **Email**: Nodemailer + a provider (SendGrid, Mailgun, or Brevo) for the mailing list and transactional emails
- **Hosting**: Render, Railway, or a VPS (DigitalOcean/Hetzner) — since "website hosting" is literally one of your services, this is also a chance to dogfood your own hosting stack

## 2. Database schema (core entities)

```
User (id, name, email, password_hash, role[user|mentor|admin], created_at)
Service (id, title, slug, description, icon/image, category, active)
Event (id, title, description, image, start_date, end_date, status[upcoming|ongoing|past], location)
Program (id, name, type[ai_training|tech_training|mentoring|hotspot], cohort_number, fee, capacity, start_date)
Enrollment (id, user_id, program_id, status[pending_payment|submitted|approved|rejected], applied_at)
Payment (id, user_id, enrollment_id|mentor_upgrade_id, amount, provider, tx_ref, status, paid_at)
MentorUpgrade (id, user_id, payment_id, status, approved_at)
Certification (id, user_id, program_id, cert_number, issued_at, file_url)
CohortAchiever (id, cohort_name, year, user_name, photo, achievement_note)
MailingListSubscriber (id, email, subscribed_at, active)
```

## 3. Feature-to-requirement mapping

- **Ongoing/upcoming events** → `Event.status` computed from dates, public `/events` page filtering by date
- **Services listing** → public `/services` page pulling from `Service` table
- **Account creation + enrollment + pay-before-submit** → registration flow → browse `Program` → click "Enroll" → payment gateway checkout → on payment webhook success, `Enrollment.status = submitted`
- **Mailing list** → simple email capture form, stored in `MailingListSubscriber`, admin can trigger a bulk send later
- **Admin panel** → CRUD for Service, Event (with image upload), Program, and a view of all Enrollments with approve/reject actions
- **Mentor upgrade** → authenticated user hits `/become-a-mentor`, pays fee, on success `User.role` flips to `mentor` (or gains a `MentorUpgrade` record pending admin approval — recommend admin approval step so it's not purely automatic)
- **Certification** → generated (PDF) when admin marks an enrollment "completed", tied to `Certification` table with a verifiable cert number
- **History / Best Cohort Achievers** → public `/history` page grouped by year, populated only by admin

## 4. Build order (phases)

1. **Foundation** — Express app scaffold, Prisma + Postgres setup, folder structure (`/routes`, `/controllers`, `/models`, `/views` or `/client`), environment config
2. **Auth** — registration, login, JWT/session, role middleware (`user`, `mentor`, `admin`)
3. **Public content** — Services, Events (with status logic), History/Achievers pages — get these live first since they need no auth
4. **Enrollment + Payments** — Program listing → enrollment intent → payment integration → webhook handling → enrollment confirmation email
5. **Mailing list** — subscribe endpoint + confirmation email + admin export/send tool
6. **Mentor upgrade flow** — payment + role change + admin approval screen
7. **Certification generation** — PDF templating (e.g., `pdf-lib` or `puppeteer`) triggered by admin marking completion
8. **Admin dashboard** — CRUD UI for everything above, image uploads, enrollment management
9. **Polish & deploy** — responsive design pass, SEO meta tags, deploy to your chosen host, set up backups

## 5. Where your existing work plugs in

Your current WiFi billing system (Node/Express, Prisma, MikroTik RouterOS, MTN/Airtel Money) is essentially the engine for **LIT Hotspot Billing** and **LIT Hotspot Connection** — you'd wrap it behind an internal API and surface a subset (plan selection, top-up, connection status) on the LIT Technologies site rather than building hotspot billing from scratch again.

Want me to scaffold the actual Express project structure and starter code (folders, Prisma schema file, auth boilerplate) next, or dig into one phase in more depth first — like the payment/enrollment flow or the admin dashboard?
