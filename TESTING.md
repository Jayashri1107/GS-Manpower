# GS Manpower website – test guide

Work through each section in order. Tick a box when the result matches **Expected**.
If something does not match, note the page, the step number and what you saw.

**Use only made-up sample data** in every form (for example "Test Hospital", "Test Person", 98765 43210).
Do not type real names, real phone numbers or real patient or worker details.

---

## 0. Start the website

1. Open PowerShell.
2. Type `cd C:\GS-Manpower` and press Enter.
3. **First time only:** type `npm run setup` and press Enter. Write down the admin password it prints.
   (If it says `.env` already has a key, run `npm run setup -- --password` to get a new password instead.)
4. Type `npm run dev` and press Enter.
5. Wait for the line `Website ready: http://localhost:4173` (the number may be 4174 or higher if 4173 is busy).
6. Open Chrome or Edge and go to the address shown.

- [ ] **Expected:** the Home page opens with a dark navy top section and the headline "Right people. Right shift."
- [ ] **Expected:** the PowerShell window shows no red error text.

Keep this PowerShell window open while testing. To stop the website later, click in it and press `Ctrl + C`.

### How to see the phone and tablet layouts on your computer

1. On any page press `F12` (opens Developer Tools).
2. Press `Ctrl + Shift + M` (device toolbar).
3. At the top, choose a device: **iPhone SE** or **iPhone 12 Pro** (phone), **iPad Air** (tablet), or
   **Responsive** and type a width.
4. Press `F5` to reload after changing device.
5. Press `F12` again to close when done.

You will repeat several checks at **phone (375 wide)**, **tablet (768 wide)** and **desktop (full window)**.

---

## 1. Header and main menu

### Desktop (full window)
1. Look at the top bar.
   - [ ] Logo on the left: navy "G" with a saffron figure inside, then **GS MANPOWER** and the small line
         **STAFFING · HEALTHCARE · INDUSTRY**.
   - [ ] Menu shows: Home, About Us, Our Services, Industries, For Job Seekers, Contact Us.
   - [ ] A navy **Hire Manpower** button on the right.
2. Click each menu item one by one.
   - [ ] Each opens the right page.
   - [ ] The current page name is darker and has a saffron line under it.
3. Click the logo on any page.
   - [ ] It returns to the Home page.
4. Scroll down any page.
   - [ ] The top bar stays visible and gets a thin line and shadow under it.
5. Look at the browser tab.
   - [ ] It shows the small G logo icon and a page title.

### Phone (375 wide)
1. Reload a page.
   - [ ] The menu items are hidden; a square button with three lines is on the right.
   - [ ] The logo and the small STAFFING line still fit on one row without overlapping.
2. Tap the three-line button.
   - [ ] A full-screen menu opens with all six pages plus **Find a Job** and **Hire Manpower** buttons.
   - [ ] The three lines turn into an ✕.
   - [ ] The page behind does not scroll.
   - [ ] The WhatsApp button is hidden while the menu is open.
3. Tap ✕.
   - [ ] The menu closes.
4. Open the menu again and tap **Industries**.
   - [ ] The Industries page opens and the menu is closed.
5. Open the menu and press the `Esc` key (on a computer).
   - [ ] The menu closes.

### Keyboard (desktop)
1. Reload the Home page and press `Tab` once.
   - [ ] A dark **Skip to content** box appears at the top left.
2. Press `Enter`.
   - [ ] The page jumps past the menu to the main content.
3. Keep pressing `Tab`.
   - [ ] Every link and button gets a visible outline when it is reached.

---

## 2. Home page

Check the sections appear in this order from top to bottom:

1. **Hero** (navy)
   - [ ] Small label "STAFFING · HEALTHCARE · INDUSTRY".
   - [ ] Big headline "Right people. Right shift."
   - [ ] Marathi line under it: योग्य माणूस, योग्य जागी. (letters joined normally, not spaced apart)
   - [ ] Saffron **Hire Manpower** button → click it → opens Contact page at the enquiry form.
   - [ ] Go back. Outlined **Find a Job** button → click → opens For Job Seekers at the application form.
   - [ ] Three ticks: Police-verified staff, PF and ESIC compliant, Replacement within 24 hours.
   - [ ] Desktop only: a photo area on the right with a "Photo to commission" note and a white badge
         "Every worker police-verified before deployment".
2. **Verified credentials** strip (white)
   - [ ] Four items: Police-verified staff, PF and ESIC compliant, Replacement within 24 hours, Registered business.
   - [ ] Registered business shows "[to be added]" (placeholder until real number is supplied).
3. **Our services – One company, two divisions**
   - [ ] **GS Care** card with a teal top line and teal G logo; lists GNM and ANM nurses, GDA and ward attendants,
         OT and lab technicians, Housekeeping for clinical areas, Front office and billing.
   - [ ] **GS Industrial** card with a navy top line; lists Machine operators, Helpers and loaders, Plant housekeeping,
         Store and packing staff, Contract labour.
   - [ ] Security guards are **not** listed (switched off until licensed – see section 12).
   - [ ] Click "GS Care services" → Services page at the GS Care part. Go back.
   - [ ] Click "GS Industrial services" → Services page at the GS Industrial part. Go back.
   - [ ] Two tiles below: Office administration and Recruitment → each opens the matching part of the Services page.
4. **Why GS Manpower** (navy) – heading "No worker sent out alone" and four points.
   - [ ] Present and readable.
5. **How it works** – four numbered steps 01–04 with a saffron line above each number.
   - [ ] Desktop: 4 in a row. Tablet: 2 by 2. Phone: one under another.
6. **Industries** – six tiles, then "How we work with each industry" link → opens Industries page.
   - [ ] Works.
7. **Training and quality** – photo area plus a list of four points.
   - [ ] Present.
8. **Tell us what you need** – contact details on the left (phone, WhatsApp, email) and the enquiry form.
   - [ ] Present. (Form is tested in section 9.)
9. **Footer** (navy) – tested in section 8.

---

## 3. About Us page

1. Open **About Us**.
   - [ ] Navy top area with breadcrumb "Home / About Us"; clicking **Home** in it goes to Home.
   - [ ] Headline "No worker sent out alone" and text explaining the G and saffron worker.
   - [ ] "Who we are" text mentions GS Care and GS Industrial.
   - [ ] Mission and How we work cards.
   - [ ] Four values: Integrity, Respect, Competence, Punctuality.
   - [ ] Compliance section (navy) lists registrations with "[to be added]" placeholders and
         "Police verification of every worker before deployment".
   - [ ] Navy band at the bottom with a saffron **Hire Manpower** button → opens the enquiry form.

---

## 4. Our Services page

1. Open **Our Services**.
   - [ ] Headline "Two divisions. One standard."
2. The row of rounded quick links under the header: click each one.
   - [ ] GS Care, Nurses and technicians, GDA and ward attendants, Hospital housekeeping, GS Industrial,
         Office administration, Recruitment – each scrolls to its section, and the heading is not hidden
         behind the top bar.
3. Check the three groups and their sections:
   - [ ] **GS Care** group (teal line and teal G): Housekeeping for clinical areas, GDA and ward attendants,
         Nurses and technicians.
   - [ ] GDA section has the box "What our attendants do not do".
   - [ ] Nurses section has the box "Registration checked before deployment".
   - [ ] **GS Industrial** group (navy line): Industrial workforce. No Security section (switched off).
   - [ ] **Across both divisions**: Office administration, Recruitment ("Candidates are never charged").
4. Bottom band button **Hire Manpower** → enquiry form.
   - [ ] Works.

---

## 5. Industries page

1. Open **Industries**.
   - [ ] Six cards: Hospitals (label **GS Care** in teal), Manufacturing (**GS Industrial**), Corporate, Education,
         Logistics (**GS Industrial**), Facilities.
   - [ ] Each card has an icon, text and two ticked points.
   - [ ] Desktop 2 columns; phone 1 column.
   - [ ] Bottom band button opens the enquiry form.

---

## 6. For Job Seekers page (Marathi first)

1. Open **For Job Seekers**.
   - [ ] Browser tab title starts with "भरती सुरू आहे".
   - [ ] Label "भरती सुरू आहे · RECRUITMENT OPEN" with Marathi letters joined normally.
   - [ ] Marathi headline, a Marathi paragraph, a Hindi paragraph, then the English line.
   - [ ] Saffron button "अर्ज करा · Apply now" → scrolls to the application form.
   - [ ] Outlined button "WhatsApp +91 …" → opens WhatsApp (see section 10).
2. Yellow warning box.
   - [ ] Starts with "नोकरीसाठी कोणालाही पैसे देऊ नका." and says no fee is ever charged.
3. "Jobs we hire for" tiles, "How to apply" four steps (navy), "Working with GS Manpower" list and
   "Keep these ready for the interview".
   - [ ] Step 04 mentions "Monday, 7 AM, Gate 3".
   - [ ] Interview text says not to send identity documents online.
4. Application form – tested in section 9B.

---

## 7. Contact Us page

1. Open **Contact Us**.
   - [ ] Five contact items: Phone, WhatsApp, Email, Office, Office hours.
2. Click the **phone number**.
   - [ ] Computer: asks which app to use for calls (or does nothing if none). Phone: opens the dialler with the number.
3. Click the **email**.
   - [ ] Your email program opens a new message to info@gsmanpower.in.
4. Click **Open directions in Google Maps**.
   - [ ] Google Maps opens in a new tab (currently shows the city, not the exact office – placeholder).
5. The enquiry form on the right (desktop) or below (phone).
   - [ ] Present; tested in section 9A.
6. In the header text, click **job application form**.
   - [ ] Opens the For Job Seekers form.

---

## 8. Footer (check on any page)

- [ ] White G logo with saffron figure and GS MANPOWER wordmark.
- [ ] "Right people. Right shift." and the Marathi tagline.
- [ ] Services links: GS Care, GS Industrial, Office administration, Recruitment – each opens the right section.
- [ ] Company links: About Us, Industries, For Job Seekers, Contact Us, Privacy Notice – each opens.
- [ ] Contact list: phone, email, address, hours.
- [ ] Bottom line: © 2026, Privacy link, "English · मराठी". Click **मराठी** → the same page opens in Marathi (section 22).
- [ ] "Cookie preferences" is **not** shown (analytics is off – see section 11).

---

## 9. Forms

Wait at least **5 seconds** after the page loads before pressing submit. Faster submissions are treated as spam
robots and silently ignored (this is on purpose).

Forms are now saved by the server. A correct form shows a green thank-you message, and the record appears in the
admin panel (section 21). Use only made-up data.

### 9A. Manpower enquiry form (Home page bottom and Contact page)

**Test 1 – empty form**
1. Without typing anything, click **Send enquiry**.
   - [ ] A red message under the form: "Please check the 9 highlighted fields."
   - [ ] Each required field has a red border and a red message under it.
   - [ ] The cursor jumps to "Organisation name".

**Test 2 – error messages clear**
1. Type `Test Hospital` in Organisation name and click **Send enquiry** again.
   - [ ] Organisation name is no longer red; the count drops to 8.

**Test 3 – phone number rules** (type each in Mobile number, then click Send)
| Type this | Expected |
|---|---|
| `12345` | [ ] Red: "Please enter a 10-digit Indian mobile number." |
| `5876543210` (starts with 5) | [ ] Red message |
| `98765abcde` | [ ] Red message |
| `9876543210` | [ ] Accepted (no red under phone) |
| `98765 43210` | [ ] Accepted |
| `+91 9876543210` | [ ] Accepted |

**Test 4 – email (optional)**
| Type this | Expected |
|---|---|
| leave empty | [ ] Accepted |
| `test@` | [ ] Red: "Please check the format." |
| `test@example.com` | [ ] Accepted |

**Test 5 – number of workers**
| Type this | Expected |
|---|---|
| `0` | [ ] Red: "Please enter a larger number." |
| `6000` | [ ] Red: "Please enter a smaller number." |
| `12` | [ ] Accepted |

**Test 6 – drop-downs**
1. Open **Role needed**.
   - [ ] Grouped under "GS Care – hospitals", "GS Industrial – plants and warehouses" and "Other".
   - [ ] No "Security guards" option (switched off).
2. Open **When do you need them?**
   - [ ] Immediately, Within 2 weeks, Within a month, In 1 to 3 months, Planning ahead.

**Test 7 – shifts**
1. Leave all shift buttons unselected and submit.
   - [ ] Red: "Please choose at least one shift."
2. Click **Day** and **Night**.
   - [ ] Both turn highlighted; click Day again → it turns off.

**Test 8 – consent**
1. Fill everything correctly but leave the "I agree…" box unticked. Submit.
   - [ ] Red: "Please tick this box to continue." Nothing is sent.
2. Click the **Read the full privacy notice** link in the grey box.
   - [ ] Privacy Notice page opens.

**Test 9 – successful submit**
1. Fill in: Test Hospital · Test Person · 98765 43210 · (email empty) · GDA and ward attendants · 12 ·
   Waluj MIDC · Within 2 weeks · Day · tick the consent box. Wait 5 seconds. Click **Send enquiry**.
   - [ ] Green box: "Thank you. Your enquiry has been received. Our team will call you within one working day."
   - [ ] All fields are cleared.
   - [ ] In the admin panel → Manpower enquiries, "Test Hospital" appears with status **New**.

**Test 10 – same form on the other page**
- [ ] Repeat Test 1 and Test 9 on the other page (Contact if you started on Home, or the other way round).

### 9B. Job application form (For Job Seekers page)

**Test 1 – empty form** → click **Submit application**.
- [ ] "Please check the 7 highlighted fields." Cursor jumps to Full name.

**Test 2 – drop-downs**
- [ ] **Job you want** includes GNM / ANM nurse, GDA / ward attendant, OT / lab technician, Housekeeping staff,
      Office assistant or receptionist, Data entry or back office, Machine operator, Helper or loader,
      Store or packing staff, Supervisor, Other. No Security guard.
- [ ] **Experience**: No experience (fresher) … More than 5 years.
- [ ] **When can you join?**: Immediately, Within 15 days, Within 1 month, After 1 month.

**Test 3 – phone** – repeat the phone table from 9A Test 3.

**Test 4 – resume upload** (use any harmless file from your computer, not a real CV)
| Do this | Expected |
|---|---|
| Leave empty | [ ] Accepted (resume is optional) |
| Choose a `.jpg` or `.png` image | [ ] Red: "Please upload a PDF or Word file." |
| Choose a PDF larger than 5 MB | [ ] Red: "This file is larger than 5 MB." |
| Choose a small `.pdf` or `.docx` | [ ] Accepted |

**Test 5 – consent** – leave the box unticked → [ ] red message, nothing sent.

**Test 6 – successful submit**
1. Fill in: Test Applicant · 98765 43210 · Housekeeping staff · 1 to 3 years · CIDCO · Immediately ·
   (no resume) · tick consent. Wait 5 seconds. Submit.
   - [ ] Green thank-you message; fields cleared; the application appears in admin → Job applications.

### 9C. Spam trap (optional)
1. Fill the enquiry form correctly very fast and submit within 3 seconds of the page loading
   (easiest: reload, then use the browser's autofill and press Enter immediately).
   - [ ] Shows the thank-you message, but **no** new record appears in the admin panel (robots are told "thanks" and ignored).

---

## 10. WhatsApp

1. On any page, find the round navy **WhatsApp +91 …** button at the bottom right.
   - [ ] It stays in the same place while you scroll.
   - [ ] It does not cover the footer's last line on a phone.
2. Click it.
   - [ ] A new tab opens WhatsApp (web or app) with the message "Hello GS Manpower" ready.
   - [ ] Expected for now: WhatsApp says the number is invalid, because it is the placeholder `+91 00000 00000`.
3. Also click the WhatsApp links on Home (enquiry section), Contact, and For Job Seekers.
   - [ ] Each opens WhatsApp the same way.

---

## 11. Cookie banner and analytics

Analytics is **off** until a Google Analytics ID is added, so there is no banner and no cookies today.

- [ ] Normal site: no cookie banner appears; footer has no "Cookie preferences".

To test the banner itself (optional, a quick switch-on and switch-off):
1. Admin panel → **Website settings** → Google Analytics ID: type `G-TEST000` → **Save and publish**.
2. In the browser press `Ctrl + Shift + N` (private window) and open the site address.
   - [ ] A white box at the bottom: "Your privacy choices" with **Decline** and **Allow analytics**, the same size.
3. Click **Decline**.
   - [ ] Box disappears. Reload: it does not come back.
   - [ ] Footer now shows **Cookie preferences**. Click it → the box opens again.
4. Click **Allow analytics**.
   - [ ] Box disappears. Reload: it does not come back.
5. **Put it back:** clear the Google Analytics ID field and save.
   - [ ] After a reload in a new private window, no banner appears.

---

## 12. Security service switch (licence gate)

Security services must stay hidden until the licence is granted.

- [ ] Normal site: no security guard anywhere (Home, Services, both form drop-downs).

To check the switch (optional):
1. Admin panel → **Website settings** → tick **Show security services** → **Save and publish**.
2. Reload the browser.
   - [ ] Home → GS Industrial list now includes "Security guards".
   - [ ] Services → a **Security services** section appears under GS Industrial with "[licence no. and validity]".
   - [ ] Both forms have a Security option.
3. **Put it back:** untick it, save, reload → everything security-related is gone again.

---

## 13. Privacy Notice page

1. Open from the footer.
   - [ ] Marked "DRAFT – to be reviewed by a legal adviser".
   - [ ] Sections: What we collect, Why we use it, Who can see it, How long we keep it, How we protect it,
         Cookies and analytics, Your rights.
   - [ ] Clicking "Read the privacy notice" in the cookie box (section 11) jumps to **Cookies and analytics**.

---

## 14. Component library (for designers and developers)

1. Go to `/components.html` (add it to the end of the address).
   - [ ] Six logo versions: primary, stacked, mark only, reversed (navy box), mono black, mono white.
   - [ ] Two division cards: GS Care (teal) and GS Industrial (navy).
   - [ ] Colour swatches: Command Navy, Shift Saffron, Site Paper, Steel, Care Teal, White, Navy tint, Line.
   - [ ] Typography samples incl. Marathi and Hindi; Voice "Say / Don't say"; buttons; badges; cards; form fields;
         photo placeholder; consent banner; steps.
2. This page is hidden from Google.
   - [ ] Open `/robots.txt` → it contains `Disallow: /components.html`.

---

## 15. Brand guideline check (look and feel)

On every page:
- [ ] Only navy, saffron, paper (warm off-white), white, steel grey – and teal only for GS Care.
- [ ] Saffron is never used for text on a light background.
- [ ] No more than one saffron button visible on the screen at a time.
- [ ] Headlines in a heavy, sturdy font (Archivo); body text in a clean round font (Manrope).
- [ ] Marathi and Hindi text looks natural (Mukta font), not stretched or spaced out.
- [ ] No "best", "No. 1", "world-class", no exclamation marks, no emoji.
- [ ] The logo is never stretched, rotated, shadowed or recoloured.

---

## 16. Responsive layout (every page at three sizes)

For each of the 7 pages (Home, About, Services, Industries, For Job Seekers, Contact, Privacy), at
**phone 375**, **tablet 768** and **desktop**:

- [ ] Nothing runs off the right edge; there is no sideways scrolling.
- [ ] Text is readable without zooming; buttons are big enough to tap.
- [ ] Cards stack into one column on phone.
- [ ] Forms are one column on phone, two columns on tablet and desktop.
- [ ] Also try a very small phone (Responsive, width 320): the STAFFING line under the logo disappears, the rest fits.

---

## 17. Search engine setup (SEO)

1. On any page right-click → **View page source** (`Ctrl + U`).
   - [ ] Near the top: `<title>`, `<meta name="description"`, `<link rel="canonical"` with gsmanpower.in.
   - [ ] A block starting `<script type="application/ld+json">` containing "EmploymentAgency".
2. Each page has its own different title (look at the browser tab on each page).
   - [ ] All different.
3. Open `/sitemap.xml`.
   - [ ] Lists 14 pages: the 7 English pages and the 7 Marathi pages under /mr/ (not components.html or 404).
4. Open `/robots.txt`.
   - [ ] Shows Allow, Disallow components.html, and the Sitemap line.

---

## 18. Speed and accessibility score (Chrome)

1. Open the Home page in Chrome. Press `F12`.
2. Click the `>>` arrows at the top if needed and choose **Lighthouse**.
3. Tick **Performance, Accessibility, Best practices, SEO**; choose **Mobile**; click **Analyze page load**.
4. Note the four scores.
   - [ ] Accessibility 90 or more.
   - [ ] SEO 90 or more (a lower score here is expected from "localhost" and placeholder links).
   - [ ] Performance: write down the number. It will be lower on your own computer than on real hosting.
5. Repeat for For Job Seekers and Contact Us.

---

## 19. Auto-rebuild while editing

1. With `npm run dev` running, open `src\pages\contact.html` in Notepad, change "Talk to our team" to
   "Talk to our team today" and save.
   - [ ] PowerShell prints `Built 14 indexed pages into /site`.
2. Reload the Contact page.
   - [ ] The heading shows the new text.
3. Change it back and save.

**Port check:** open a second PowerShell, `cd C:\GS-Manpower`, run `npm start`.
- [ ] It says "Port 4173 is busy, trying 4174..." and starts on 4174. Close it with `Ctrl + C`.

---

## 20. Different browsers and a real phone

- [ ] Repeat sections 1, 2 and 9 in **Microsoft Edge** and **Firefox**.
- [ ] Real phone (same Wi-Fi): this needs the site to be hosted, or a developer to open the preview to your network.
      Check it after the site is put online.

---

## 21. Admin panel (leads and website settings)

1. Go to the site address + `/admin` (for example http://localhost:4173/admin).
   - [ ] A login box "Admin login" appears. The page is not linked from the website.
2. Type username `admin` and a **wrong** password → **Log in**.
   - [ ] Red "Wrong username or password." After 5 wrong tries: "Too many attempts. Try again in 15 minutes."
3. Log in with the password from `npm run setup`.
   - [ ] Top bar shows "Logged in as admin"; four tabs: Manpower enquiries, Job applications, Website settings, Activity log.
4. **Manpower enquiries:** click "Test Hospital".
   - [ ] All details shown: contact, mobile (clickable), role, workers, location, timeline, shifts, form language, received, consent given.
   - [ ] Change Status to **Contacted**, type a note, **Save** → "Saved."; the list shows the new status.
   - [ ] "Show" filter → **New** hides it; **All** shows it again.
5. **Job applications:** open the test application you sent with a small PDF.
   - [ ] **Download resume** downloads the same file you uploaded.
6. **Delete:** on a test record click **Delete permanently** → confirm.
   - [ ] "Record deleted."; it disappears from the list.
7. **Website settings:**
   - [ ] Fields still holding placeholders have a yellow border.
   - [ ] Type `call me` in "Phone number for the call button" → **Save and publish** → red "Format example: +919876543210".
   - [ ] Enter a valid test value in "Office hours (English)" → save → "Saved. The website has been updated." →
         the Contact page shows the new hours after a reload. Change it back.
8. **Activity log:**
   - [ ] Lists logins, views, updates, deletes and setting changes with time and user – but no names or phone numbers.
9. **Log out**, then press the browser Back button and reload.
   - [ ] The login box appears again.
10. Leave the admin panel open without touching it for 31 minutes, then click a tab.
   - [ ] You are asked to log in again.

### 21b. Admin dashboard, search, quick actions and export

1. After logging in you land on **Dashboard**.
   - [ ] Four boxes: New enquiries, New applications, Workers requested (open enquiries), Received in the last 7 days.
         Clicking a box opens the matching list.
   - [ ] "Latest enquiries" and "Latest applications" show the newest 5; clicking one opens that record.
   - [ ] A yellow box lists website settings that still show a placeholder, with a link to Website settings.
2. Left menu (on a phone: the row at the top).
   - [ ] Enquiries and Applications show a saffron number = how many are still **New**; Website settings shows how many placeholders are left.
3. **Enquiries** list:
   - [ ] Type part of a name, phone number, role or location in the search box → the list narrows as you type.
   - [ ] Click the filter buttons All / New / Contacted / In progress / Closed → the list changes; an empty filter says so.
4. Open a record:
   - [ ] **Call** button opens the phone dialler; **WhatsApp** opens a chat with that number; **Email** appears only when an email was given.
   - [ ] For applications with a resume, the **Resume** button downloads the file.
   - [ ] Change Status and the note → **Save changes** → a dark "Saved." message appears at the bottom and the badge updates.
5. **Export CSV** (top right of each list):
   - [ ] Downloads `gs-manpower-enquiry-<date>.csv` (or `…application…`), which opens in Excel or Google Sheets with one row per record.
   - [ ] The Activity log shows "Exported CSV".
   - Keep exported files private and delete them when no longer needed: they contain personal details.
6. On a phone (F12 → Ctrl + Shift + M → iPhone):
   - [ ] Nothing is cut off at the right; opening a record shows **Back to list**.

## 22. Marathi website

1. On any English page click **मराठी** in the footer.
   - [ ] The same page opens in Marathi at an address with `/mr/`; the browser tab title is in Marathi.
2. Check every page: मुख्यपृष्ठ, आमच्याविषयी, आमच्या सेवा, उद्योगक्षेत्रे, नोकरी शोधणाऱ्यांसाठी, संपर्क, गोपनीयता सूचना.
   - [ ] Menu, buttons, headings, text and footer are in Marathi; GS MANPOWER logo text stays in English.
   - [ ] Marathi letters are joined normally (no gaps) and the tops/bottoms of letters are not cut off.
3. Marathi enquiry form (संपर्क page): submit empty.
   - [ ] Messages in Marathi, e.g. "कृपया लाल रंगातील 9 माहिती तपासा."
4. Submit a correct form with sample data.
   - [ ] Marathi thank-you message; in the admin panel the record shows **Form language: Marathi** with English values.
5. Footer **English** link → back to the English version of the same page.
6. Visit an address that does not exist, e.g. `/mr/abc` → Marathi "हे पान सापडले नाही" page; `/abc` → English 404.

## 23. Lead notifications (after setting them up – see docs/DEPLOY.md step 4)

1. Submit a test enquiry.
   - [ ] Within a minute an email / chat message arrives: "New manpower enquiry: 12 × GDA and ward attendants…" with a link to `/admin`.
   - [ ] The message contains **no** name, phone number or organisation.

## 24. Automated tests (developer)

1. In PowerShell: `npm test`
   - [ ] "pass 15", "fail 0".

---

## Only testable after going online

| Item | Why | How |
|---|---|---|
| HTTPS padlock and security headers | Only on real hosting with a domain | Open the site; check the padlock; https://securityheaders.com should show A |
| Real WhatsApp chat, phone call, email | Placeholder contact details until set in the admin panel | Sections 7 and 10 on the live site |
| Notifications | Need Resend / webhook / WhatsApp accounts | Section 23 |
| Google Analytics reports | Need a GA4 ID | Section 11, then GA4 Realtime report |
| Real phone over mobile data | Needs the live address | Repeat sections 1, 2, 9 and 22 on a phone |
