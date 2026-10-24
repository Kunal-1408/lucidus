# Research: Watchlist sources for Students who live outside India

Status: needs-triage

Researched 2026-10-24 against ADR 0002 (Official sources only), ADR 0003 and its amendment "Students living outside India", and the shape of `backend/data/watchlist.json`. Every quoted criterion below was read on the official page or PDF named next to it. Where a page could not be fetched, the entry says so and is not recommended.

## Findings that affect the app, not just the Watchlist

1. **Citizenship and residence criteria abroad don't map onto the Profile.** The Profile records citizenship as Indian / OCI / other nationality. Most criteria abroad name a specific status: "U.S. lawful permanent resident", "Canadian citizenship or permanent resident status", "Australian citizen, Australian Permanent Resident", "Home rate of tuition" (UK), "Singapore Citizens". With "other nationality" alone, these criteria can only come out as unknown or as an Extra requirement. If the abroad entries below are added, expect many "Tell us more" results until the Profile can record which country's citizenship or residence the Student holds.
2. **Income criteria use a different currency and often a different period.** SPDC's limit is *monthly* household income in US$, CBSE SGC's is *annual* in Rs, and the UK and US limits are annual in £ and $. Per the ADR 0003 amendment, a mismatch in currency comes out as unknown. Check whether the matcher also treats a mismatch in period (monthly vs annual) as unknown; it should.
3. **Several result scales are not among the five in the glossary's Result scale.** These are ATAR (an Australian rank, not marks), Quebec's R score, US GPA split into weighted and unweighted, SAT scores and AP grades. These criteria should come out as Extra requirements or unknown, never be fitted to the nearest scale.
4. **`scholarshipType` only allows government / corporate / university.** Foundations (Loran, Jack Kent Cooke, Gates, Coca-Cola Scholars, Schulich, NMSC) have no exact fit. In the drafts below they are given `corporate`. A `foundation` (or `private`) value may be worth adding.
5. **`region` (india | abroad) means where the study happens, not where the Student lives.** SPDC and CBSE SGC are `india`, even though they serve Students abroad. "Must live in Qatar" or "must be at a school in Australia" has to come from extracted Criteria. Nothing on the Watchlist entry carries it.

## 1. Indian schemes and DASA-route awards for NRI/PIO/OCI students

### 1.1 Scholarship Programme for Diaspora Children (SPDC): fits scope (top priority)

- **Provider:** Ministry of External Affairs, Government of India.
- **Source used:** *SPDC Guidelines for the Academic Year 2025-26*, a PDF with a text layer, hosted by the Embassy of India, Algiers: https://www.indianembassyalgiers.gov.in/content/Final-SPDC-Guidelines-2025-26.pdf. The scheme page linking to it is https://www.indianembassyalgiers.gov.in/section/news/scholarship-programme-for-diaspora-children-spdc-2025-26/.
- **Couldn't fetch the portal:** spdcindia.gov.in refused connections on ports 443 and 80, from WebFetch and from curl. The Embassy in Abu Dhabi's copy of the same guidelines (https://www.indembassyuae.gov.in/content/SPDC-Guidelines.pdf, linked from https://www.indembassyuae.gov.in/page/scholarship-programme-for-diaspora-children-spdc/) is a **scanned PDF with no text layer** (pdftotext returns only the cover), so it is unusable for extraction. Use the Algiers copy.
- **Type:** PDF.
- **Criteria, as written (all from the Algiers PDF):**
  - Category: "(a) Children of NRIs/PIOs/OCIs who have studied outside India. (b) Children of Indian Workers in ECR countries those who have studied outside India and those who have studied in India."
  - ECR countries: "(Afghanistan, Bahrain, Indonesia, Iraq, Jordan, Kuwait, Lebanon, Libya, Malaysia, Oman, Qatar, Saudi Arabia, Sudan, Syria, Thailand, United Arab Emirates and Yemen)"
  - Age: "open to the applicants in the age group of 17 to 21 years as on 31.07.2025"
  - Schooling abroad: "Applicants from all the categories must have passed grade 11th and 12th from abroad."
  - Board result: "a minimum of 60% aggregate marks or equivalent grades in aggregate of all the subjects in the Senior Secondary (10+2) or equivalent examination". The scale is percentage; "or equivalent grades" means IB and A-level Students come out as unknown.
  - Income for NRIs/PIOs/OCIs: "The total household monthly income of the parent(s) of the applicant should NOT exceed an amount equivalent to US Dollar Five Thousand (US$ 5000)."
  - Income for the ECR category: "should NOT exceed an amount equivalent to US Dollar Three Thousand (US$ 3000)". This is a monthly figure in USD.
  - Institutions: "(a) Central Universities of India ... (b) 'A' Grade Institutions accredited by NAAC and recognized by UGC. (c) NITs, Schools of Planning and Architecture and IIITs through DASA Scheme."
  - Field of study: Appendix A lists Engineering/Architecture, Humanities, Commerce, Management, Computers, Journalism, Hotel Management, Agriculture, Sciences, Law, Ayurveda, Nursing, Physiotherapy, Pharmacy, and Medicine & Related Courses.
  - Timing: "Applications for SPDC scholarship can only be submitted by students of the first year of the Undergraduate courses (except for Medical Courses ... 2nd year)"
  - Exclusion (Extra requirement): "The ward of any employee of Govt. of India ... living/working abroad will not be covered under SPDC."
  - Amount: "75% of the total Institutional Economic Cost (IEC) subject to a maximum of US $ Four Thousand (US$4,000) per annum".
  - Places: "150 scholarships ... 50 are earmarked for the Children of Indian Workers in all the ECR countries", and "50% slots in all the categories are earmarked for female students". Per the glossary, how places are shared is not a Criterion.
- **Deadline:** "Last Date for submission of Completed Application form is 30th January, 2026." That has passed. No 2026-27 notice was found.
- **Verdict: fits scope.** It is the canonical scheme for this amendment, and a Class 12 Student abroad plans for it exactly like the first-year Indian awards in ADR 0003. The PDF URL is specific to one year, so expect `not_found` once MEA issues the 2026-27 guidelines. Re-point it then. For medicine, the application is in the 2nd year; that is a known exception, and the rest of the scheme is first-year.

### 1.2 CBSE Merit Scholarship Scheme for Single Girl Child (SGC): fits scope (for CBSE schools in the Gulf)

- **Provider:** Central Board of Secondary Education.
- **URL:** https://www.cbse.gov.in/cbsenew/scholar/Guidelines_SGC_2025.pdf
- **Type:** PDF, with a text layer.
- **Criteria, as written:**
  - "All Single Girl Students, who have secured 70% or more marks in CBSE Class X Examination and are studying Class XI & XII in School (affiliated with CBSE) whose tuition fee is not more than Rs. 2,500/- p.m. ... The tuition fee in class XI & XII shall not be more than Rs. 3,000/- p.m."
  - "NOTE: NRI applicants of the Board are also eligible for the award. The tuition fee for the NRIs has been decided maximum of Rs. 6,000/- per month."
  - "The scholarship shall be awarded to Indian Nationals only." That excludes OCI.
  - "Candidate who have passed CBSE Class X Examination in 2025 will be considered."
  - "Students with gross parental/family income upto Rs. 8 lakh per annum are eligible". The figure is annual, in INR.
  - "Rupees One Thousand (Rs. 1,000/-) per month ... maximum period of two years."
- **Inconsistency on the official site:** the heading says "Academic Year 2024-25" but the text says Class X passed in 2025. An older CBSE PDF (https://www.cbse.gov.in/cbsenew/scholar/SGC%20Sship%20Scheme.pdf) says 60% marks, a Rs 1,500 tuition cap and Rs 500 per month. Third-party sites still quote the old numbers, so the newer PDF is the one to watch.
- **Deadline:** not stated in the PDF. The 2026 notice could not be found on cbse.gov.in; https://www.cbse.gov.in/cbsenew/scholarship.html returns 404.
- **Verdict: fits scope.** It serves Class 11–12 Students at CBSE schools abroad, which describes most Gulf Indian schools. The only-child condition and the NRI tuition cap are Extra requirements. A Gulf family giving its income in AED will get unknown on the Rs 8 lakh limit.

### 1.3 DASA (Direct Admission of Students Abroad): doesn't fit as a Scholarship

- **Official site:** https://dasanit.org/. At the time of checking it showed the DASA PG 2026 page; the CSAB DASA page (https://csab.nic.in/dasa/) lists only annexures.
- DASA is an admission route. The CIWG category (Children of Indian Workers in the Gulf) is a lower fee rate for an admission category, not a scholarship. The only figures for it (₹62,500 per semester / ₹1,25,000 per year) came from search snippets of aggregator and coaching sites, and **were not verified on an official page**. A "25% tuition waiver" claim (satheejee.iitk.ac.in) cites no official source.
- **Verdict: doesn't fit as a Scholarship.** DASA students are still covered, through SPDC criterion (v)(c) "NITs, SPAs and IIITs through DASA Scheme".

### 1.4 NORKA Roots Directors' Scholarship (Kerala): doesn't fit / not verified

- Found only in search snippets of norkaroots.org and news sites. The criteria cover children of *returnee* or ECR-category Keralite workers with an income under Rs 1.5 lakh, for courses at Kerala institutions. They include PG thresholds, and the last deadline seen was 15.12.2024. It is not aimed at Students living abroad, and **no current official page was read**. Not recommended.

## 2. Gulf states (UAE, Saudi Arabia, Qatar, Oman, Kuwait, Bahrain)

Officially published awards that an expatriate school-leaver can plan for are scarce. Most national schemes are for citizens only. What was found and verified:

### 2.1 American University of Sharjah (UAE): Financial Grants and Scholarships: fits scope

- **Provider:** American University of Sharjah.
- **URL:** https://www.aus.edu/node/85126 ("Financial Grants and Scholarships | American University of Sharjah").
- **Type:** HTML. The page **holds many** scholarships.
- **Criteria, as written:**
  - Merit Scholarship: "students must have achieved an average equivalent to 95 percent and above in Grades 10 and 11". "Grade 12 results are not considered in the evaluation". "automatically offered at the time of admission; no separate application is required."
  - Chancellor's Scholarship: "open to applicants who have completed their secondary education in the UAE". British: "3 A-levels (2 As and 1B) and 5 GCSEs (all A grades)". IB Diploma: "Minimum 38 points". American: "Minimum 98 percent cumulative grade point average (CGPA) of grades 10 and 11 with 2 APs at grade 5 or SAT composite score of 1200". Other systems: "Equivalent to 98 percent ... and SAT of 1200."
  - President's Scholarship: "open to applicants who have completed their secondary education outside the UAE". IELTS 7.0 or TOEFL iBT 94. British: "3 A-levels and 5 GCSEs (all A grades)". IB: "Minimum 40 points".
  - Financial Grant: "have limited financial resources". No figure is given.
- **Deadlines:** Chancellor's and President's: "Fall 2027 application deadline: April 01, 2027". Grant: "Fall Semester 2026: June 25, 2026".
- **Scale notes:** each award offers *alternatives on different scales*: a percentage OR IB points OR A-level grades, plus GCSE and SAT conditions. CBSE is not named. "Average equivalent to 95 percent" invites conversion, which the app must not do: only a Student with a percentage result can be checked. The merit average is for Grades 10 and 11, not a board result.
- **Inconsistency:** an AUS PDF from 2024 (https://www.aus.edu/sites/default/files/financial_grants_and_scholarships_may2024.pdf) says 90%. The current HTML page says 95%. Watch the HTML page.
- **Verdict: fits scope.** It is the clearest official Gulf source found, and the Chancellor's Scholarship is aimed squarely at Students resident in the UAE.

### 2.2 Qatar University scholarship types: fits scope (partly)

- **Provider:** Qatar University.
- **URL:** https://www.qu.edu.qa/students/admission/scholarships/types
- **Type:** HTML, **holds many**.
- **Criteria, as written:**
  - Student Recruitment and Excellence Scholarship: "Residents of Qatar for Bachelor degree"; "high school certificate or its equivalent". **No minimum percentage is stated.**
  - Talent Scholarship: "undergraduate non-Qatari students (including international students)"; "Students enrolled in schools outside Qatar or in private schools inside Qatar"; "A minimum high school average of 80%."
  - International Students Scholarship: "A minimum high school average of 95%." This is for applicants from outside Qatar.
  - The H.H. the Emir's Scholarship requires a "Qatari Secondary Education Certificate" (95%). The Outstanding Performance Scholarship is for students already at QU ("cumulative GPA of 3.50 out of 4.00"). **Both are out of scope** for a CBSE or IB Student in Qatar.
- **Deadline:** "announced application period" only. The timeline page is https://www.qu.edu.qa/en-us/students/admission/scholarships/Pages/scholarships-timeline.aspx (not read).
- **Verdict: fits** for the Talent and Student Recruitment and Excellence scholarships. The page lists out-of-scope types too, so extraction or Overrides must drop them.

### 2.3 RCSI Bahrain undergraduate scholarships: fits scope (medicine only)

- **Provider:** RCSI Medical University of Bahrain.
- **URL:** https://rcsi.com/bahrain/undergraduate/application-information/scholarships
- **Type:** HTML, holds many.
- **Criteria, as written:**
  - Medicine Scholarship: "must be in receipt of a full or conditional offer". CBSE: "Overall average of ≥92%". A-Levels: "A, A, A". IB Diploma: "≥39 points (inclusive of bonus points)". Tawjihiya: "Overall average ≥98%". American: "SAT score ≥ 1450". Amount: "1/3 concession on tuition fees", two awards.
  - Nursing: "open to all Bahraini and non-Bahraini applicants", with an interview letter required.
  - The Shaikh Mohammed and Rayaat scholarships are "Only Bahraini candidates", so they are out of scope.
- **Deadline:** "Scholarship applications for the 2026/27 academic year have officially closed."
- **Verdict: fits** for the Medicine and Nursing awards. This is the one Gulf page that names a **CBSE percentage** explicitly. Low volume (two awards).

### 2.4 Ajman University (UAE) score discounts: borderline

- **URL:** https://www.ajman.ac.ae/en/admissions/undergraduate/scholarships-discounts (HTML).
- **Criteria, as written:** "high school score of 90% or higher" gives a 20% discount for the **first semester only**. A score of 99% or higher gives 30%. "Top-ranking high school students across the UAE" get 100/75/50%. No nationality or residence condition is stated.
- **Verdict: borderline.** It is a fee discount, not a scholarship award, and "top-ranking" is an Extra requirement. Add it only if discounts count.

### 2.5 Not verified or no fit

- **Hamdan Bin Rashid Al Maktoum Award for Distinguished Academic Performance** (Dubai, school students, including private schools): ha.ae returned **403**, so eligibility could not be read. It is also a school prize nominated by the school. Not recommended until it can be read.
- **Saudi Arabia:** the KFUPM scholarship page (https://ses.kfupm.edu.sa/scholarships, seen only as a snippet) gives aid of "10% up to 100%" for admitted international students, with no published thresholds. The King Saud University external scholarship is for applicants living *outside* the Kingdom. No official award for expatriate school-leavers resident in Saudi Arabia was found.
- **Kuwait (AUK, GUST), Oman (SQU, GUtech, Nizwa):** only aggregator or blog claims were found (e.g. tutopiya.com, globaladmissions.com), with no official criteria page. **Nothing verified.**
- **University of Bahrain / AUBH:** AUBH's Academic Excellence Award is for Bahraini nationals only (from a snippet, not read).
- **Not checked:** Khalifa University, UAEU, NYU Abu Dhabi.

## 3. UK, USA, Canada, Singapore, Australia (undergraduate entrance awards for home/resident school-leavers)

### UK

UK entrance awards for Home students are almost all income-based **bursaries** run through the student-finance assessment. Merit entrance scholarships for Home students are rare.

#### 3.1 Cambridge Bursary Scheme: fits scope

- **Provider:** University of Cambridge.
- **URL:** https://www.cambridgestudents.cam.ac.uk/fees-and-funding/cambridge-bursary-scheme/how-apply
- **Type:** HTML.
- **Criteria, as written:** "have a household income of under £62,215 a year"; "be paying University of Cambridge tuition fees". The parent page says "only available for full-time Home undergraduate applicants" (https://www.cambridgestudents.cam.ac.uk/fees-and-funding/cambridge-bursary-scheme). Amount: "up to £3,500 a year". Deadline: "get your student loan application approved by 30th June".
- **Verdict: fits.** Income is in GBP. Home fee status is not a Profile field, so it becomes an Extra requirement.

#### 3.2 Imperial Bursary: fits scope

- **Provider:** Imperial College London.
- **URL:** https://www.imperial.ac.uk/study/fees-and-funding/undergraduate/bursaries-grants-scholarships/imperial-bursary/
- **Type:** HTML.
- **Criteria, as written:** "Qualify for the Home rate of tuition"; "Have a household income under £70,000". Bands for 2026 and 2027 entry: £0–16,000 → £5,000; £16,001–50,000 → £4,400; £50,001–55,000 → £3,300; £55,001–60,000 → £2,200; £60,001–70,000 → £1,000. Deadline: "by 31 May after the start of the academic year".
- **Verdict: fits.** Older Imperial pages say £60,000, so watch this URL only.

#### 3.3 Oxford Crankstart Scholarship: not verified

- ox.ac.uk returned **403** to WebFetch and to curl. Search snippets of https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding/crankstart/prospective-students say "UK residents ... lived in the UK for at least three years ... household income is £32,500 or less", with no separate application. The fetcher may hit the same 403, so check that before adding.

### USA

#### 3.4 National Merit Scholarship Program: fits scope (high value for Class 11)

- **Provider:** National Merit Scholarship Corporation.
- **URL:** https://www.nationalmerit.org/s/1758/images/gid2/editor_documents/guide_to_the_national_merit_scholarship_program.pdf?gid=2&pgid=61 ("Guide to the National Merit Scholarship Program, September 2026")
- **Type:** PDF. The HTML pages returned 402 to WebFetch and redirect-looped under curl; the PDF downloaded fine.
- **Criteria, as written:** "be enrolled as a high school student ... planning to enroll full-time in college no later than the fall following completion of high school"; "take the PSAT/NMSQT in the specified year of the high school program and no later than the third year in grades 9 through 12"; "attend high school in the United States ... or meet the citizenship requirements for students attending high school outside the United States". Abroad: "must be a citizen of the United States; or be a U.S. lawful permanent resident (or have applied for permanent residence ...) and intend to become a U.S. citizen". Note that the guide dated September 2026 refers to "the 2027 competition".
- **Deadline:** the PSAT is taken in October of grade 11.
- **Verdict: fits.** It is the archetypal award a Class 11 Student plans for, and it is open to US-citizen Students living in India or the Gulf. The PSAT score is an Extra requirement.

#### 3.5 Coca-Cola Scholars Program: fits scope

- **Provider:** The Coca-Cola Scholars Foundation.
- **URL:** https://www.coca-colascholarsfoundation.org/apply/
- **Type:** HTML.
- **Criteria, as written:** "currently enrolled high school/home-schooled students" who "will graduate high school during the 2026-2027 academic school year"; "U.S. Citizens, U.S. Nationals, U.S. Permanent Residents" and other listed statuses, with "Temporary residents" excluded; "minimum overall B/3.0 GPA". The GPA scale is not stated. Amount: "$20,000", 150 recipients. Deadline: "5pm Eastern on September 30, 2026", which has passed; the page says the 2027 application is closed.
- **Verdict: fits.** The GPA is on a 4.0 scale by implication only. Match it only against a GPA-out-of-4 result.

#### 3.6 Jack Kent Cooke College Scholarship: fits scope

- **Provider:** Jack Kent Cooke Foundation.
- **URL:** https://www.jkcf.org/our-scholarships/college-scholarship-program/how-to-apply/
- **Type:** HTML.
- **Criteria, as written:** "plan to graduate in spring 2027"; "Complete four years of high school in the U.S., a U.S territory, or on a U.S. military base"; "Earn a minimum, cumulative unweighted GPA of 3.75 or above"; "Submit standardized test score(s) from one of the following: SAT, ACT, AP, or IB exam" ("no minimum score"); "family annual gross income up to $95,000". Deadline: "November 11, 2026".
- **Citizenship:** not stated on this page. A search snippet of the JKCF FAQ says citizenship is not required, but the FAQ itself was not read.
- **Verdict: fits.** "Unweighted" is a nuance the GPA-out-of-4 scale doesn't capture.

#### 3.7 The Gates Scholarship: fits scope

- **URL:** https://www.thegatesscholarship.org/scholarship (HTML).
- **Criteria, as written:** "A high school senior"; "A US citizen or permanent resident"; minimum "3.3 on a 4.0 scale (or equivalent)", weighted; "Pell-eligible". Deadline: "September 15, 2026", which has passed.
- **Ethnicity:** the page as fetched did **not** mention the ethnicity requirement older cycles had. Re-check it before adding.
- **Verdict: fits.** "Pell-eligible" has no dollar figure, so it is an Extra requirement.

#### 3.8 QuestBridge National College Match: fits, weak criteria

- **URL:** https://www.questbridge.org/high-school-students/national-college-match/who-should-apply (HTML).
- **Criteria, as written:** "open to any high school senior currently attending high school in the U.S."; "U.S. Citizens and Permanent Residents living abroad" are eligible; "International students living outside the U.S. are not eligible."
- **Not Criteria:** "households earning less than $65,000 annually (for a household of four)" describes *typical Finalists*, so per the glossary it is not a Criterion.
- **Deadline:** not on this page.
- **Verdict:** lower priority, because most of what the page says is guidance rather than rules.

### Canada

#### 3.9 Loran Award: fits scope

- **Provider:** Loran Scholars Foundation.
- **URL:** https://loranscholar.ca/the-program/how-to-apply/
- **Type:** HTML.
- **Criteria, as written:** "Be entering university for the first time in September 2027"; "Present a minimum cumulative average of 88%"; "Hold Canadian citizenship or permanent resident status"; "Be born between January 1, 2005 and September 1, 2011". For CEGEP: "R score equal to or higher than 29". Also "$3,000 one-time entrance awards" (Provincial & Territorial). The page says "Applications are now closed" and gives no date. A search snippet of the FAQ says citizens or permanent residents studying outside Canada may apply.
- **Verdict: fits.** The percentage is a cumulative average, not a board result. The R score is not a supported scale.

#### 3.10 Schulich Leader Scholarships: fits scope

- **URL:** https://schulichleaders.com/apply/ (HTML).
- **Criteria, as written:** "Graduating high school or cégep in Canada in the 2026/2027 academic year"; "Canadian citizen"; "Plan to enroll in an eligible STEM program"; "Every high school in Canada can nominate one graduating student per academic year"; "Strong consideration will be given to students with financial need". Deadlines: nomination January 27, 2027; application February 17, 2027.
- **Award value:** not stated on this page.
- **Verdict: fits.** The school nomination is an Extra requirement. The field of study is limited to STEM groups.

### Singapore

#### 3.11 NTU Nanyang Scholarship: fits scope

- **Provider:** Nanyang Technological University.
- **URL:** https://www.ntu.edu.sg/admissions/undergraduate/scholarships/scholarship-opportunities/detail/nanyang-scholarship
- **Type:** HTML.
- **Criteria, as written:** "Open to all nationalities."; "outstanding academic achievements in the Singapore-Cambridge GCE 'A' level" or "IB Diploma or Year 12 equivalent qualifications". No numeric threshold is given. Benefits include "Full coverage of subsidised tuition fees (after Tuition Grant)" and "Living allowance of S$6,500 per academic year". Deadline: "The scholarship application period is the same as the admission application period."
- **Verdict: fits.** It is open to Indian or OCI Students living in Singapore, but it has almost no matchable criteria (no marks threshold).

#### 3.12 NUS Global Merit Scholarship: not verified, likely Singapore citizens only

- The NUS page (https://nus.edu.sg/oam/scholarships/scholarships-for-freshmen-singapore-citizens/nus-global-merit-scholarship) returned an empty or JavaScript-only body to WebFetch and curl.
- Per ADR 0002, the Watchlist would need the page's JSON endpoint, which was not found.
- The URL path and search snippets say "Singapore Citizens".
- Not recommended.

### Australia

#### 3.13 Melbourne Chancellor's Scholarship: fits scope

- **Provider:** The University of Melbourne.
- **URL:** https://scholarships.unimelb.edu.au/awards/melbourne-chancellors-scholarship
- **Type:** HTML. WebFetch got 403; curl with a browser user-agent got 200, so check how the fetcher sends its user-agent.
- **Criteria, as written:** "Be an Australian citizen or permanent resident, or a New Zealand citizen, and have completed an Australian Year 12 or the International Baccalaureate in Australia", or "Be an Australian citizen and have completed an Australian Year 12 or the International Baccalaureate outside [Australia]"; "Have achieved an ATAR of at least 99.90". Timing: "first offers are made a few days after the Victorian Year 12 ATAR results are released in December."
- **Verdict: fits.** ATAR is not a supported Result scale, so it becomes an Extra requirement or unknown. The page gives no IB-points equivalent.

#### 3.14 Tuckwell Scholarship (ANU): fits scope

- **Provider:** The Australian National University.
- **URL:** https://tuckwell.anu.edu.au/apply/eligibility
- **Type:** HTML.
- **Criteria, as written:** "commence and complete Year 12 full-time in 2026, at a school located in Australia"; "be 17, 18 or 19 years old on 22 February 2027"; "be an Australian citizen, Australian Permanent Resident or the holder of an Australian humanitarian visa"; "be predicted by their school to achieve an ATAR of 95 or higher"; at least one English unit and one Maths unit in Year 11 or 12. Deadline: Stage 2 closes "22 May 2026", which has passed.
- **Verdict: fits.** The predicted ATAR is an Extra requirement.

## Ranked shortlist: add these first

1. **SPDC.** This is the scheme the amendment names, and it serves every Student category abroad (NRI, PIO/OCI, ECR Gulf).
2. **CBSE Single Girl Child.** It is the only verified award for Class 11–12 Students *while still at a CBSE school abroad*, and it is explicitly open to NRIs.
3. **AUS Financial Grants and Scholarships.** It is the best-documented official Gulf source, with Chancellor's for UAE residents.
4. **National Merit (NMSC).** It is the classic grade-11 plan-ahead award, and US-citizen Students abroad qualify.
5. **Qatar University scholarship types.** The Talent Scholarship's 80% is clear and it is for non-Qataris.
6. **Loran Award.** Clear criteria: 88%, citizen or PR, birth window.
7. **Jack Kent Cooke College Scholarship.** Clear GPA and USD income limits.
8. **Cambridge Bursary** and **Imperial Bursary.** Clear GBP income limits.
9. **RCSI Bahrain.** It names CBSE ≥92% explicitly, though it has few places.
10. **Tuckwell**, **Melbourne Chancellor's**, **NTU Nanyang**, **Coca-Cola Scholars**, **Gates**, **Schulich.** These are well documented, but their criteria are mostly unknown for a Profile that can't record the specific citizenship, residence, ATAR or nomination.

### Draft Watchlist entries (watchlist.json shape)

```json
[
  {
    "url": "https://www.indianembassyalgiers.gov.in/content/Final-SPDC-Guidelines-2025-26.pdf",
    "type": "pdf",
    "region": "india",
    "name": "Scholarship Programme for Diaspora Children (SPDC)",
    "provider": "Ministry of External Affairs, Government of India",
    "scholarshipType": "government",
    "officialUrl": "https://www.indianembassyalgiers.gov.in/section/news/scholarship-programme-for-diaspora-children-spdc-2025-26/",
    "holds": "one"
  },
  {
    "url": "https://www.cbse.gov.in/cbsenew/scholar/Guidelines_SGC_2025.pdf",
    "type": "pdf",
    "region": "india",
    "name": "CBSE Merit Scholarship Scheme for Single Girl Child",
    "provider": "Central Board of Secondary Education",
    "scholarshipType": "government",
    "officialUrl": "https://www.cbse.gov.in/cbsenew/scholar/Guidelines_SGC_2025.pdf",
    "holds": "one"
  },
  {
    "url": "https://www.aus.edu/node/85126",
    "type": "html",
    "region": "abroad",
    "name": "American University of Sharjah Scholarships and Financial Grants",
    "provider": "American University of Sharjah",
    "scholarshipType": "university",
    "officialUrl": "https://www.aus.edu/node/85126",
    "holds": "many",
    "split": { "splitSelector": "h2" }
  },
  {
    "url": "https://www.nationalmerit.org/s/1758/images/gid2/editor_documents/guide_to_the_national_merit_scholarship_program.pdf?gid=2&pgid=61",
    "type": "pdf",
    "region": "abroad",
    "name": "National Merit Scholarship Program",
    "provider": "National Merit Scholarship Corporation",
    "scholarshipType": "corporate",
    "officialUrl": "https://www.nationalmerit.org/s/1758/interior.aspx?sid=1758&gid=2&pgid=1876",
    "holds": "one"
  },
  {
    "url": "https://www.qu.edu.qa/students/admission/scholarships/types",
    "type": "html",
    "region": "abroad",
    "name": "Qatar University Undergraduate Scholarships",
    "provider": "Qatar University",
    "scholarshipType": "university",
    "officialUrl": "https://www.qu.edu.qa/students/admission/scholarships/types",
    "holds": "many",
    "split": { "splitSelector": "h3" }
  },
  {
    "url": "https://loranscholar.ca/the-program/how-to-apply/",
    "type": "html",
    "region": "abroad",
    "name": "Loran Award",
    "provider": "Loran Scholars Foundation",
    "scholarshipType": "corporate",
    "officialUrl": "https://loranscholar.ca/the-program/how-to-apply/",
    "holds": "one"
  },
  {
    "url": "https://www.jkcf.org/our-scholarships/college-scholarship-program/how-to-apply/",
    "type": "html",
    "region": "abroad",
    "name": "Cooke College Scholarship Program",
    "provider": "Jack Kent Cooke Foundation",
    "scholarshipType": "corporate",
    "officialUrl": "https://www.jkcf.org/our-scholarships/college-scholarship-program/",
    "holds": "one"
  },
  {
    "url": "https://www.cambridgestudents.cam.ac.uk/fees-and-funding/cambridge-bursary-scheme/how-apply",
    "type": "html",
    "region": "abroad",
    "name": "Cambridge Bursary Scheme",
    "provider": "University of Cambridge",
    "scholarshipType": "university",
    "officialUrl": "https://www.cambridgestudents.cam.ac.uk/fees-and-funding/cambridge-bursary-scheme",
    "holds": "one"
  },
  {
    "url": "https://www.imperial.ac.uk/study/fees-and-funding/undergraduate/bursaries-grants-scholarships/imperial-bursary/",
    "type": "html",
    "region": "abroad",
    "name": "Imperial Bursary",
    "provider": "Imperial College London",
    "scholarshipType": "university",
    "officialUrl": "https://www.imperial.ac.uk/study/fees-and-funding/undergraduate/bursaries-grants-scholarships/imperial-bursary/",
    "holds": "one"
  },
  {
    "url": "https://rcsi.com/bahrain/undergraduate/application-information/scholarships",
    "type": "html",
    "region": "abroad",
    "name": "RCSI Bahrain Undergraduate Scholarships",
    "provider": "RCSI Medical University of Bahrain",
    "scholarshipType": "university",
    "officialUrl": "https://rcsi.com/bahrain/undergraduate/application-information/scholarships",
    "holds": "many",
    "split": { "splitSelector": "h2" }
  }
]
```

Before committing any of these drafts:

- **The split selectors are guesses.** The `h2` and `h3` values for the three `holds: many` pages were not checked against the pages' HTML. Check each page's markup, or start them as `holds: one` and review.
- **Three drafts use `corporate` for a foundation** (NMSC, Loran, Jack Kent Cooke). See finding 4.
- **The SPDC `url` changes every year.** It must be re-pointed when the 2026-27 guidelines appear. MEA's own page (https://www.mea.gov.in/scholarship-programme-for-diaspora-children.htm) returns 404, so the embassy copy is the most stable official host found.

## What could not be verified on an official page

- spdcindia.gov.in (connection refused).
- The Oxford Crankstart page (403).
- The Hamdan Award page on ha.ae (403).
- The NUS Global Merit page (empty body).
- The CIWG fee figures and the DASA "25% waiver" claim.
- The current-cycle NORKA scheme.
- Any official expatriate-resident award in Saudi Arabia, Kuwait or Oman.
- Jack Kent Cooke's citizenship rule. The FAQ was seen only as a snippet.
- The 2026 cycle of CBSE SGC (deadline and whether the 70% / Rs 6,000 figures still hold).
- The Gates ethnicity rule. The current page doesn't state one, and that is all that is known.
