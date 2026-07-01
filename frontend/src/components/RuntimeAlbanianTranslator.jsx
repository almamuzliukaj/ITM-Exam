import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const TEXT_TRANSLATIONS = {
  "ITM Exam": "ITM Provim",
  "Faculty Operations Suite": "Paketa e operacioneve te fakultetit",
  "Signed in": "I kycur si",
  "Professor": "Profesor",
  "Assistant": "Asistent",
  "Student": "Student",
  "Admin": "Administrator",
  "Logout": "Dil",
  "Language": "Gjuha",
  "English": "Anglisht",
  "Albanian": "Shqip",
  "Dashboard": "Paneli",
  "Exams": "Provimet",
  "Create exam": "Krijo provim",
  "Question bank": "Banka e pyetjeve",
  "Question bank workspace": "Hapesira e bankes se pyetjeve",
  "Manage reusable assessment questions by course offering without leaving the academic context.": "Menaxho pyetjet e riperdorshme te vleresimit sipas ofrimit te lendes pa dale nga konteksti akademik.",
  "Select an offering, filter the bank, and add questions in place.": "Zgjedh nje ofrim, filtro banken dhe shto pyetje aty per aty.",
  "Gradebook": "Libri i notave",
  "Reports": "Raportet",
  "Overview": "Permbledhje",
  "Teaching": "Mesimdhenie",
  "Teaching support": "Mbeshtetje mesimore",
  "Student records": "Dosjet e studentit",
  "Operational note": "Shenim operativ",
  "This workspace is structured for role-based academic operations and secure exam delivery.": "Kjo hapesire eshte e strukturuar per operacione akademike sipas roleve dhe zhvillim te sigurt te provimeve.",

  "Live exam dashboard": "Paneli live i provimit",
  "Live refresh on": "Rifreskimi live aktiv",
  "Live refresh off": "Rifreskimi live joaktiv",
  "Refresh": "Rifresko",
  "Refreshing...": "Duke rifreskuar...",
  "Exam details": "Detajet e provimit",
  "Monitor enrolled students, physical admission, attempt activity, and integrity risk in one operational view.": "Monitoro studentet e regjistruar, pranimin fizik, aktivitetin e tentimit dhe rrezikun e integritetit ne nje pamje operative.",
  "Loading monitor...": "Duke ngarkuar monitorin...",
  "You must be signed in.": "Duhet te jesh i kycur.",
  "Failed to load live exam dashboard.": "Paneli live i provimit nuk u ngarkua.",
  "Loading live exam dashboard...": "Duke ngarkuar panelin live te provimit...",
  "Waiting approval": "Ne pritje te aprovimit",
  "In progress": "Ne proces",
  "Enrolled": "Te regjistruar",
  "Submitted": "Dorezuar",
  "Students flagged": "Studente te shenuar",
  "Physical admission roster": "Lista e pranimit fizik",
  "Search, filter, approve, reject, revoke, and monitor classroom access.": "Kerko, filtro, aprovo, refuzo, revoko dhe monitoro qasjen ne klase.",
  "shown": "te shfaqur",
  "Search student, email, ID, status...": "Kerko studentin, emailin, ID-ne, statusin...",
  "All students": "Te gjithe studentet",
  "Not verified": "I paverifikuar",
  "Waiting physical check": "Ne pritje te kontrollit fizik",
  "Device change": "Ndryshim pajisjeje",
  "Code verified": "Kodi u verifikua",
  "Approved": "Aprovuar",
  "Active": "Aktiv",
  "Rejected": "Refuzuar",
  "Revoked": "Revokuar",
  "With violations": "Me shkelje",
  "No students match the current filters": "Asnje student nuk perputhet me filtrat aktuale",
  "Clear search or choose a broader status filter.": "Pastro kerkimin ose zgjedh nje filter me te gjere.",
  "Student": "Student",
  "Admission": "Pranimi",
  "Attempt": "Tentimi",
  "Violations": "Shkeljet",
  "Last activity": "Aktiviteti i fundit",
  "Started / submitted": "Filluar / dorezuar",
  "Actions": "Veprimet",
  "No events": "Pa ngjarje",
  "No security event": "Pa ngjarje sigurie",
  "Not started": "Nuk ka filluar",
  "Not joined": "Nuk eshte bashkuar",
  "Approve": "Aprovo",
  "Approve device": "Aprovo pajisjen",
  "Reject": "Refuzo",
  "Revoke": "Revoko",
  "Physical approval": "Aprovim fizik",
  "Approve exam admission": "Aprovo pranimin ne provim",
  "Approve access": "Aprovo qasjen",
  "Reject admission": "Refuzo pranimin",
  "Reject physical admission": "Refuzo pranimin fizik",
  "Reject access": "Refuzo qasjen",
  "Revoke admission": "Revoko pranimin",
  "Revoke exam admission": "Revoko pranimin ne provim",
  "Revoke access": "Revoko qasjen",
  "This action changes exam admission for": "Ky veprim ndryshon pranimin ne provim per",
  "and is recorded for audit review.": "dhe regjistrohet per auditim.",
  "Reason": "Arsyeja",
  "Reason for audit log and student status...": "Arsyeja per audit log dhe statusin e studentit...",
  "Cancel": "Anulo",
  "Saving...": "Duke ruajtur...",
  "Close": "Mbyll",

  "Assessment gradebooks": "Librat e notave te vleresimeve",
  "Select the course assessment you want to review, grade, or publish.": "Zgjedh vleresimin e lendes qe do ta rishikosh, notosh ose publikosh.",
  "Back to assessments": "Kthehu te vleresimet",
  "Gradebook selector": "Zgjedhesi i librit te notave",
  "Filter by course, assessment type, status, semester, or cohort before opening student results.": "Filtro sipas lendes, tipit te vleresimit, statusit, semestrit ose gjenerates para hapjes se rezultateve.",
  "Search": "Kerko",
  "Assessment category": "Kategoria e vleresimit",
  "Official exam period": "Afati zyrtar i provimit",
  "Academic year": "Viti akademik",
  "Status": "Statusi",
  "Published": "Publikuar",
  "Draft": "Draft",
  "All": "Te gjitha",
  "Loading assessments...": "Duke ngarkuar vleresimet...",
  "No gradebooks found": "Nuk u gjet asnje liber notash",
  "Adjust filters or publish an assessment before opening its gradebook.": "Ndrysho filtrat ose publiko nje vleresim para hapjes se librit te notave.",
  "Assessment": "Vleresimi",
  "Course offering": "Ofrimi i lendes",
  "Schedule": "Orari",
  "Action": "Veprimi",
  "Open gradebook": "Hap librin e notave",

  "Add question": "Shto pyetje",
  "Question saved in the selected offering.": "Pyetja u ruajt ne ofrimin e zgjedhur.",
  "Question could not be saved.": "Pyetja nuk mund te ruhej.",
  "Topic": "Tema",
  "Rows": "Rreshtat",
  "All types": "Te gjitha tipet",
  "Module, chapter, topic": "Moduli, kapitulli, tema",
  "Search by prompt or answer": "Kerko sipas pyetjes ose pergjigjes",
  "10 rows": "10 rreshta",
  "25 rows": "25 rreshta",
  "50 rows": "50 rreshta",
  "Showing": "Duke shfaqur",
  "of": "nga",
  "Question bank summary": "Permbledhje e bankes se pyetjeve",
  "Text": "Tekst",
  "Code / SQL": "Kod / SQL",
  "Total points": "Piket totale",
  "Loading assigned course offerings...": "Duke ngarkuar ofrimet e caktuara te lendeve...",
  "Loading questions...": "Duke ngarkuar pyetjet...",
  "No questions are available yet.": "Ende nuk ka pyetje te disponueshme.",
  "Add the first reusable question for this course offering.": "Shto pyetjen e pare te riperdorshme per kete ofrim lende.",
  "Add first question": "Shto pyetjen e pare",
  "Question": "Pyetja",
  "Type": "Tipi",
  "Level": "Niveli",
  "Points": "Piket",
  "Answer readiness": "Gatishmeria e pergjigjes",
  "Previous": "Prapa",
  "Next": "Para",
  "Page": "Faqja",
  "Add question": "Shto pyetje",
  "Selected offering": "Ofrimi i zgjedhur",
  "stay in context and add multiple entries.": "qendro ne kontekst dhe shto disa hyrje.",
  "Complete the required fields before saving.": "Ploteso fushat e detyrueshme para ruajtjes.",
  "need attention.": "kerkojne vemendje.",
  "Question type": "Tipi i pyetjes",
  "MCQ": "Me zgjedhje",
  "Single correct option": "Nje opsion i sakte",
  "Text answer": "Pergjigje me tekst",
  "Model answer required": "Kerkohet pergjigje model",
  "Prompt and starter code": "Prompt dhe kod fillestar",
  "Schema and expected query result": "Skema dhe rezultati i pritur i query-t",
  "Question prompt": "Teksti i pyetjes",
  "Write the exact question students will see.": "Shkruaj pyetjen e sakte qe do ta shohin studentet.",
  "Topic / module": "Tema / moduli",
  "Example: Normalization, arrays, joins": "Shembull: Normalizimi, vargjet, joins",
  "Difficulty": "Veshtiresia",
  "Easy": "Lehte",
  "Medium": "Mesatare",
  "Hard": "Veshtire",
  "Answer options": "Opsionet e pergjigjes",
  "At least two options and one correct answer are required.": "Kerkohet se paku dy opsione dhe nje pergjigje e sakte.",
  "Add option": "Shto opsion",
  "Option 1": "Opsioni 1",
  "Option 2": "Opsioni 2",
  "Option 3": "Opsioni 3",
  "Option 4": "Opsioni 4",
  "Remove": "Largo",
  "Correct answer(s)": "Pergjigja/et e sakta",
  "Select one or more correct options.": "Zgjedh nje ose me shume opsione te sakta.",
  "Model answer": "Pergjigje model",
  "Write the reference answer AI and staff should use for evaluation.": "Shkruaj pergjigjen referente qe AI dhe stafi duhet ta perdorin per vleresim.",
  "Expected answer / grading note": "Pergjigja e pritur / shenim notimi",
  "Schema / table context": "Skema / konteksti i tabeles",
  "Example: Students(Id, FullName), Exams(Id, Title)": "Shembull: Students(Id, FullName), Exams(Id, Title)",
  "Starter SQL": "SQL fillestar",
  "Starter C# code": "Kod fillestar C#",
  "Describe expected output, query result, or grading criteria.": "Pershkruaj output-in e pritur, rezultatin e query-t ose kriteret e notimit.",
  "Save and add another": "Ruaj dhe shto tjeter",
  "Save and close": "Ruaj dhe mbyll",
  "Saved questions stay attached to the selected offering.": "Pyetjet e ruajtura mbeten te lidhura me ofrimin e zgjedhur.",
  "Hide details": "Fshih detajet",
  "View details": "Shiko detajet",
  "Edit": "Ndrysho",
  "Delete": "Fshij",
  "Prompt": "Prompt",
  "Options": "Opsionet",
  "Schema": "Skema",
  "Model / expected answer": "Pergjigje model / e pritur",
  "Needs answer": "Kerkohet pergjigje",
  "Needs model": "Kerkohet model",
  "correct": "te sakta",
  "Question prompt is required.": "Teksti i pyetjes eshte i detyrueshem.",
  "Points must be greater than zero.": "Piket duhet te jene me te medha se zero.",
  "Add at least two answer options.": "Shto se paku dy opsione pergjigjeje.",
  "Select at least one correct answer.": "Zgjedh se paku nje pergjigje te sakte.",
  "Every correct answer must match one of the options.": "Cdo pergjigje e sakte duhet te perputhet me nje nga opsionet.",
  "A model answer is required for text evaluation.": "Pergjigja model kerkohet per vleresim me tekst.",
  "Expected answer or grading criteria are required.": "Pergjigja e pritur ose kriteret e notimit jane te detyrueshme.",

  "Back to exams": "Kthehu te provimet",
  "Add question": "Shto pyetje",
  "Edit exam": "Ndrysho provimin",
  "Unpublish": "Cpubliko",
  "Publish": "Publiko",
  "Duration": "Kohezgjatja",
  "Questions": "Pyetjet",
  "Maximum points": "Piket maksimale",
  "Lockdown": "Bllokimi",
  "Optional": "Opsionale",
  "Required": "E detyrueshme",
  "Exam access and live monitoring": "Qasja ne provim dhe monitorimi live",
  "Control classroom entry with a short code and monitor student activity during the exam.": "Kontrollo hyrjen ne klase me nje kod te shkurter dhe monitoro aktivitetin e studenteve gjate provimit.",
  "Generate entry code": "Gjenero kod hyrjeje",
  "Regenerate entry code": "Rigjenero kod hyrjeje",
  "Refresh status": "Rifresko statusin",
  "Active code generated": "Kodi aktiv u gjenerua",
  "No active code": "Nuk ka kod aktiv",
  "Active code": "Kodi aktiv",
  "Code status": "Statusi i kodit",
  "Verified": "Te verifikuar",
  "Not joined": "Nuk jane bashkuar",
  "With violations": "Me shkelje",
  "Copy code": "Kopjo kodin",
  "Code visible only after generation": "Kodi shihet vetem pas gjenerimit",

  "Course offering roster": "Lista e ofrimit te lendes",
  "Assistant roster": "Lista e asistentit",
  "Shared course-offering roster scoped to your active teaching assignment.": "Lista e perbashket e ofrimit te lendes sipas caktimit tend aktiv.",
  "Back to dashboard": "Kthehu te paneli",
  "Student roster": "Lista e studenteve",
  "Students remain enrolled on the course offering; assistant access is assignment-based.": "Studentet mbeten te regjistruar ne ofrimin e lendes; qasja e asistentit bazohet ne caktim.",
  "Search roster": "Kerko ne liste",
  "Name, email, student number, enrollment status...": "Emri, emaili, numri i studentit, statusi i regjistrimit...",
  "No students found": "Nuk u gjet asnje student",
  "Adjust the roster search.": "Ndrysho kerkimin ne liste.",
  "No enrollments are attached to this offering yet.": "Ende nuk ka regjistrime te lidhura me kete ofrim.",
  "Student number": "Numri i studentit",
  "Enrollment": "Regjistrimi",
  "Exam eligibility": "E drejta per provim",
  "Added": "Shtuar",
  "Eligible": "I lejuar",
  "Not eligible": "Jo i lejuar",

  "Skip to main content": "Kalo te permbajtja kryesore",
  "Administration Portal": "Portali i administrimit",
  "Next actions": "Veprimet e radhes",
  "Operational focus": "Fokusi operativ",
  "Short checklist for the next admin review.": "Liste e shkurter per rishikimin e radhes nga administratori.",
  "Loading student eligibility...": "Duke ngarkuar te drejten e studentit...",
  "Current academic visibility": "Dukshmeria aktuale akademike",
  "Current semester courses": "Lendet e semestrit aktual",
  "Eligibility is based on active semester enrollment.": "E drejta bazohet ne regjistrimin aktiv te semestrit.",
  "Visible exams": "Provimet e dukshme",
  "Only published exams connected to eligible offerings are shown.": "Shfaqen vetem provimet e publikuara te lidhura me ofrime te lejuara.",
  "Carry-over courses": "Lendet e bartura",
  "Separate visibility for open or assigned carry-over work.": "Dukshmeri e ndare per pune carry-over te hapur ose te caktuar.",
  "Visibility rules": "Rregullat e dukshmerise",
  "Academic rules that control what students can access.": "Rregullat akademike qe kontrollojne qasjen e studenteve.",
  "Only eligible enrollments from the current term are shown.": "Shfaqen vetem regjistrimet e lejuara nga afati aktual.",
  "Exams must be published and linked to an eligible course offering.": "Provimet duhet te publikohen dhe te lidhen me nje ofrim te lejuar.",
  "Carry-over courses appear separately until they are closed or cancelled.": "Lendet e bartura shfaqen ndaras derisa te mbyllen ose anulohen.",
  "University demo readiness": "Gatishmeria per demo universitare",
  "Operational checkpoints for a clean faculty presentation.": "Pika kontrolli operative per nje prezantim te paster ne fakultet.",

  "Loading settings...": "Duke ngarkuar cilesimet...",
  "Password security": "Siguria e fjalekalimit",
  "Use your current password to confirm this change.": "Perdore fjalekalimin aktual per ta konfirmuar kete ndryshim.",
  "Current password": "Fjalekalimi aktual",
  "New password": "Fjalekalimi i ri",
  "Confirm new password": "Konfirmo fjalekalimin e ri",
  "Password rule": "Rregulli i fjalekalimit",
  "Minimum 8 characters with uppercase, lowercase, and number.": "Minimum 8 karaktere me shkronje te madhe, te vogel dhe numer.",
  "Official student identity": "Identiteti zyrtar i studentit",

  "Account workspace controls": "Kontrollet e hapesires se llogarive",
  "Keep the directory visible and open account tools only when needed.": "Mbaje listen te dukshme dhe hap veglat e llogarive vetem kur duhen.",
  "SMU is configured. Manual accounts are still allowed for emergency, testing, or local-only users.": "SMU eshte konfiguruar. Llogarite manuale lejohen ende per emergjenca, testim ose perdorues lokal.",
  "SMU is configured. CSV import remains available for test data, missing local accounts, or emergency onboarding.": "SMU eshte konfiguruar. Importi CSV mbetet i disponueshem per te dhena testuese, llogari lokale qe mungojne ose onboarding emergjent.",
  "Student ID": "ID e studentit",
  "Student ID number": "Numri ID i studentit",
  "Identity": "Identiteti",
  "Source": "Burimi",
  "No users match the current filters.": "Asnje perdorues nuk perputhet me filtrat aktuale.",
  "Managed by SMU": "Menaxhuar nga SMU",

  "Loading reports...": "Duke ngarkuar raportet...",
  "Report scope": "Fusha e raportit",
  "Filter reports by assigned course offering or print the current view.": "Filtro raportet sipas ofrimit te caktuar ose printo pamjen aktuale.",
  "All accessible offerings": "Te gjitha ofrimet e qasshme",
  "Current export": "Eksporti aktual",
  "Exam and results tables": "Tabelat e provimeve dhe rezultateve",
  "Switch views without changing the selected report scope.": "Ndrysho pamjen pa ndryshuar fushen e zgjedhur te raportit.",
  "Loading report data...": "Duke ngarkuar te dhenat e raportit...",
  "No report rows": "Nuk ka rreshta raporti",
  "Try another offering or wait until exams and attempts are available.": "Provo nje ofrim tjeter ose prit derisa provimet dhe tentimet te jene te disponueshme.",

  "Loading academic workspace...": "Duke ngarkuar hapesiren akademike...",
  "Back to overview": "Kthehu te permbledhja",
  "User management": "Menaxhimi i perdoruesve",
  "Administration": "Administrimi",
  "Academic structure": "Struktura akademike",
  "Active terms": "Afatet aktive",
  "Faculty staff": "Stafi i fakultetit",
  "Draft offerings": "Ofrime draft",
  "Ready offerings": "Ofrime gati",
  "Terms": "Afatet",
  "Courses": "Lendet",
  "Offerings": "Ofrimet",
  "Need review": "Kerkojne rishikim",
  "Academic workspace controls": "Kontrollet e hapesires akademike",
  "Choose one record type at a time, then open a creation form only when needed.": "Zgjedh nje tip regjistri per here, pastaj hap formen e krijimit vetem kur duhet.",
  "Create term": "Krijo afat",
  "Use SMU sync to create or update academic terms.": "Perdor sinkronizimin SMU per te krijuar ose perditesuar afatet akademike.",
  "Code": "Kodi",
  "Season": "Sezoni",
  "Winter": "Dimer",
  "Summer": "Vere",
  "Special": "Special",
  "Name": "Emri",
  "Academic year label": "Etiketa e vitit akademik",
  "Mark as current term": "Sheno si afat aktual",
  "Create course": "Krijo lende",
  "Use SMU sync to create or update course catalog records.": "Perdor sinkronizimin SMU per te krijuar ose perditesuar regjistrat e katalogut te lendeve.",
  "Credits": "Kredite",
  "Course name": "Emri i lendes",
  "Year of study": "Viti i studimit",
  "Default semester number": "Numri standard i semestrit",
  "Elective course": "Lende zgjedhore",
  "Description": "Pershkrimi",
  "Create course offering": "Krijo ofrim lende",
  "Use SMU sync to create or update course offerings. Dropdowns below use synced courses, terms, professors, and assistants.": "Perdor sinkronizimin SMU per te krijuar ose perditesuar ofrimet e lendeve. Dropdown-et perdorin lende, afate, profesore dhe asistente te sinkronizuar.",
  "Course": "Lenda",
  "Select course": "Zgjedh lenden",
  "Term": "Afati",
  "Select term": "Zgjedh afatin",
  "Delivery type": "Tipi i zhvillimit",
  "Regular": "I rregullt",
  "RetakeOnly": "Vetem riprovim",
  "Primary professor": "Profesori kryesor",
  "Select professor": "Zgjedh profesorin",
  "Assigned assistant": "Asistenti i caktuar",
  "Select assistant": "Zgjedh asistentin",
  "Section": "Grupi",
  "Capacity": "Kapaciteti",

  "Reusable question entries use the same authoring structure as exam questions.": "Pyetjet e riperdorshme perdorin te njejten strukture autoriale si pyetjet e provimit.",
  "Editing": "Duke ndryshuar",
  "New entry": "Hyrje e re",
  "Question bank basics": "Bazat e bankes se pyetjeve",
  "Assign the entry to one offering and keep scoring aligned with exam usage.": "Lidhe hyrjen me nje ofrim dhe mbaje pikimin ne perputhje me perdorimin ne provim.",
  "Database schema or table context": "Skema e databazes ose konteksti i tabeles",
  "Expected answer or grading note": "Pergjigja e pritur ose shenimi i notimit",
  "Add options first, then select one or more correct answers.": "Shto opsionet se pari, pastaj zgjedh nje ose me shume pergjigje te sakta.",

  "Author the prompt, scoring, and answer structure in one consistent flow.": "Shkruaj promptin, pikimin dhe strukturen e pergjigjes ne nje rrjedhe te qendrueshme.",
  "Question basics": "Bazat e pyetjes",
  "Choose the type first, then complete only the fields that matter for that format.": "Zgjedh tipin se pari, pastaj ploteso vetem fushat qe vlejne per ate format.",
  "MCQ options": "Opsionet MCQ",
  "Add the answer choices and select which one is correct.": "Shto zgjedhjet e pergjigjes dhe cakto cila eshte e sakte.",
  "Correct answer": "Pergjigja e sakte",
  "Select the correct option": "Zgjedh opsionin e sakte",

  "Assessment directory": "Lista e vleresimeve",
  "Search and filter assessments by academic type, period, status, and publish history.": "Kerko dhe filtro vleresimet sipas tipit akademik, afatit, statusit dhe historikut te publikimit.",
  "All categories": "Te gjitha kategorite",
  "All official periods": "Te gjitha afatet zyrtare",
  "All academic years": "Te gjitha vitet akademike",
  "Semester": "Semestri",
  "All semesters": "Te gjithe semestrat",
  "All courses": "Te gjitha lendet",
  "Professor and Assistant": "Profesor dhe Asistent",
  "Instructor": "Ligjeruesi",
  "All instructors": "Te gjithe ligjeruesit",
  "Scheduled from": "Planifikuar nga",
  "Scheduled to": "Planifikuar deri",
  "Filters": "Filtrat",
  "Continue setup": "Vazhdo konfigurimin",
  "View result status": "Shiko statusin e rezultatit",
  "Exam": "Provimi",
  "Category / official period": "Kategoria / afati zyrtar",
  "Created / published": "Krijuar / publikuar",
  "Next action": "Veprimi i radhes",
  "Setup": "Konfiguro",
  "Review": "Rishiko",

  "Organized by exam taken date": "Organizuar sipas dates se provimit",
  "Filters use the attempt/submission date, not the publication date.": "Filtrat perdorin daten e tentimit/dorezimit, jo daten e publikimit.",
  "All years": "Te gjitha vitet",
  "Instructor type": "Tipi i ligjeruesit",
  "Taken from": "Marre nga",
  "Taken to": "Marre deri",
  "All statuses": "Te gjitha statuset",
  "Publication status": "Statusi i publikimit",
  "Published at": "Publikuar me",

  "Loading session...": "Duke ngarkuar sesionin...",
  "Only students can open an exam session.": "Vetem studentet mund te hapin sesion provimi.",
  "Loading exam information...": "Duke ngarkuar informatat e provimit...",
  "Secure exam entry": "Hyrje e sigurt ne provim",
  "Hidden until start": "E fshehur deri ne fillim",
  "Monitoring": "Monitorimi",
  "Fullscreen + camera": "Ekran i plote + kamera",
  "Violation policy": "Politika e shkeljeve",
  "Exam rules": "Rregullat e provimit",
  "Read these before entering the monitored workspace.": "Lexoji keto para se te hysh ne hapesiren e monitoruar.",
  "Stay in the exam": "Qendro ne provim",
  "Do not switch tabs, minimize the browser, go back, or open another application.": "Mos nderro tab, mos minimizo shfletuesin, mos kthehu prapa dhe mos hap aplikacion tjeter.",
  "Keep camera visibility": "Mbaje kameran te dukshme",
  "Your face should remain visible. Missing or multiple faces are recorded as violations.": "Fytyra jote duhet te mbetet e dukshme. Mungesa ose disa fytyra regjistrohen si shkelje.",
  "No restricted actions": "Pa veprime te ndaluara",
  "Copy, paste, right-click, print, devtools, and source-view shortcuts are blocked.": "Kopjimi, ngjitja, klikimi i djathte, printimi, devtools dhe shortcuts per source-view jane te bllokuara.",
  "Automatic submission": "Dorezim automatik",
  "The exam submits when time expires or when the integrity policy threshold is reached.": "Provimi dorezohet kur skadon koha ose kur arrihet kufiri i politikes se integritetit.",
  "Time remaining": "Koha e mbetur",
  "No questions are attached.": "Nuk ka pyetje te bashkangjitura.",
  "This exam cannot be completed until staff attach at least one question.": "Ky provim nuk mund te perfundohet derisa stafi te bashkangjise se paku nje pyetje.",
  "Focused exam workspace": "Hapesire e fokusuar e provimit",
  "Remaining work": "Puna e mbetur",
  "Autosave": "Ruajtje automatike",
  "Exam safety": "Siguria e provimit",
  "Policy state": "Gjendja e politikes",
  "Camera integrity": "Integriteti i kameres",
  "Schema / context": "Skema / konteksti",
  "Starter code": "Kodi fillestar",
  "Your Answer": "Pergjigjja jote",
  "Select all correct answers.": "Zgjedh te gjitha pergjigjet e sakta.",
  "Run output": "Output-i i ekzekutimit",
  "Exam integrity guard": "Mbrojtja e integritetit te provimit",
  "Fullscreen": "Ekran i plote",
  "Integrity policy action": "Veprimi i politikes se integritetit",
  "Exam will be submitted automatically": "Provimi do te dorezohet automatikisht",
  "Auto-submit in": "Dorezim automatik per",
  "Latest event": "Ngjarja e fundit",
  "Access code": "Kodi i qasjes",
  "Need manual admission?": "Te duhet pranim manual?",
  "Waiting for physical identity approval": "Ne pritje te aprovimit fizik te identitetit",
  "Do not refresh or start the exam yet. The timer has not started.": "Mos e rifresko dhe mos e fillo ende provimin. Kohomatesi nuk ka filluar.",
  "Physical check": "Kontroll fizik",
  "Request sent": "Kerkesa u dergua",
  "Student identity": "Identiteti i studentit",
  "Verified student": "Student i verifikuar",
  "Manual admission rejected": "Pranimi manual u refuzua",
  "You can still enter a valid code or send another request after speaking with staff.": "Mund te futesh ende me kod valid ose te dergosh kerkese tjeter pasi te flasesh me stafin.",
  "Live session state": "Gjendja e sesionit live",
  "Final review": "Rishikimi final",
  "Ready to submit?": "Gati per dorezim?",
  "Keep working": "Vazhdo punen",
  "Exam submitted": "Provimi u dorezua",
  "Done": "Perfunduar",
  "Answered": "Te pergjigjura",
  "Auto-submitted by integrity policy": "Dorezuar automatikisht nga politika e integritetit",
  "Return to exams": "Kthehu te provimet",
  "View results queue": "Shiko radhen e rezultateve",

  "No current courses visible": "Nuk ka lende aktuale te dukshme",
  "Eligible current-semester courses will appear here after enrollment data is active.": "Lendet e lejuara te semestrit aktual do te shfaqen ketu pasi te aktivizohen te dhenat e regjistrimit.",
  "No published exams": "Nuk ka provime te publikuara",
  "When a professor publishes an eligible exam, it will appear in this workspace.": "Kur profesori publikon nje provim te lejuar, ai do te shfaqet ne kete hapesire.",
  "No carry-over items": "Nuk ka artikuj te bartur",
  "Open carry-over courses will be listed separately from current-semester exams.": "Lendet e bartura te hapura do te listohen ndaras nga provimet e semestrit aktual.",
  "Ready": "Gati",
  "Review": "Rishiko",

  "Loading gradebook...": "Duke ngarkuar librin e notave...",
  "Review submitted attempts, use AI assistance for text answers, and publish results only after human approval.": "Rishiko tentimet e dorezuara, perdor ndihmen AI per pergjigjet me tekst dhe publiko rezultatet vetem pas aprovimit njerezor.",
  "Manual score": "Piket manuale",
  "Final score": "Piket finale",
  "Human review notes": "Shenime te rishikimit njerezor",
  "Ready to publish": "Gati per publikim",
  "Needs review": "Kerkohet rishikim",
  "Question-by-question review": "Rishikim pyetje pas pyetjeje",
  "Adjust awarded points and leave notes for each answer before saving the human grade.": "Rregullo piket e dhena dhe lere shenime per cdo pergjigje para ruajtjes se notes njerezore.",
  "No submitted answers were recorded for this attempt.": "Nuk u regjistruan pergjigje te dorezuara per kete tentim.",
  "Student response": "Pergjigja e studentit",
  "Expected answer": "Pergjigja e pritur",
  "Auto points": "Piket automatike",
  "Awarded points": "Piket e dhena",
  "Question feedback": "Feedback per pyetjen",
  "Integrity review": "Rishikim i integritetit",
  "No suspicious activity was recorded for this attempt.": "Nuk u regjistrua aktivitet i dyshimte per kete tentim.",
  "AI-assisted suggestion": "Sugjerim me ndihme AI",
  "Result publication confirmation": "Konfirmim i publikimit te rezultateve",
  "Publish reviewed results?": "Te publikohen rezultatet e rishikuara?",
  "Total submitted attempts": "Tentimet totale te dorezuara",
  "Reviewed": "Te rishikuara",
  "Already published": "Tashme te publikuara",
  "Integrity flags": "Shenja integriteti",
  "Publication blocked": "Publikimi u bllokua",

  "Live monitor": "Monitor live",
  "Point balance": "Balanci i pikeve",
  "Keep the exam aligned with the professor-defined maximum score.": "Mbaje provimin ne perputhje me maksimumin e pikeve te caktuar nga profesori.",
  "Exam maximum": "Maksimumi i provimit",
  "Current question total": "Totali aktual i pyetjeve",
  "Difference": "Diferenca",
  "Publish setup": "Konfigurimi i publikimit",
  "Link this draft to a course offering before publishing.": "Lidhe kete draft me nje ofrim lende para publikimit.",
  "Select course offering": "Zgjedh ofrimin e lendes",
  "Question setup": "Konfigurimi i pyetjeve",
  "Choose how questions should be added to this draft.": "Zgjedh si duhet te shtohen pyetjet ne kete draft.",
  "Generate from question bank": "Gjenero nga banka e pyetjeve",
  "Suggest questions by type and count.": "Sugjero pyetje sipas tipit dhe numrit.",
  "Select questions manually": "Zgjedh pyetjet manualisht",
  "Choose exact bank questions.": "Zgjedh pyetje te sakta nga banka.",
  "Question count": "Numri i pyetjeve",
  "Generate 5 creates 5 questions. Changing to 3 rebuilds the draft to 3 questions.": "Generate 5 krijon 5 pyetje. Ndryshimi ne 3 e rinderton draftin me 3 pyetje.",
  "Open the selector to search, filter by type/topic/difficulty, and choose exact questions.": "Hape zgjedhesin per te kerkuar, filtruar sipas tipit/temes/veshtiresise dhe per te zgjedhur pyetje te sakta.",
  "Question required before publishing": "Kerkohet pyetje para publikimit",
  "Add at least one question to complete the manual exam builder workflow.": "Shto se paku nje pyetje per te perfunduar rrjedhen manuale te ndertimit te provimit.",
  "Exam questions": "Pyetjet e provimit",
  "No.": "Nr.",
  "Expected answer available": "Pergjigja e pritur eshte e disponueshme",
  "Search replacement question": "Kerko pyetje zevendesuese",

  "Institutional reports": "Raporte institucionale",
  "Review participation, result publication status, and integrity activity in export-friendly tables.": "Rishiko pjesemarrjen, statusin e publikimit te rezultateve dhe aktivitetin e integritetit ne tabela te pershtatshme per eksport.",
  "Report rows per page": "Rreshta raporti per faqe",
  "Rows per page": "Rreshta per faqe",
  "Exams per page": "Provime per faqe",
  "Terms, courses, offerings, and staff assignments are displayed here from the synced Online Exam tables. Manual creation stays available only while SMU is not configured.": "Afatet, lendet, ofrimet dhe caktimet e stafit shfaqen ketu nga tabelat e sinkronizuara te Online Exam. Krijimi manual mbetet i disponueshem vetem kur SMU nuk eshte konfiguruar.",
  "Maintain terms, course catalog records, and offering assignments in a layout focused on institutional control and semester planning.": "Mirembaj afatet, regjistrat e katalogut te lendeve dhe caktimet e ofrimeve ne nje pamje te fokusuar ne kontroll institucional dhe planifikim semestral.",
  "Synced student, professor, and assistant records are displayed here for review. Manual account creation and CSV import remain available for local overrides and emergency onboarding.": "Regjistrat e sinkronizuar te studenteve, profesoreve dhe asistenteve shfaqen ketu per rishikim. Krijimi manual i llogarive dhe importi CSV mbeten te disponueshem per mbishkrime lokale dhe onboarding emergjent.",
  "Directory": "Direktoria",
  "Create user": "Krijo perdorues",
  "Import CSV": "Importo CSV",
  "Staff": "Stafi",
  "Manual override while SMU is configured.": "Mbishkrim manual kur SMU eshte konfiguruar.",
  "Manual fallback for local accounts.": "Fallback manual per llogari lokale.",
  "Students": "Studentet",
  "Online Exam consumes student identity, email, and active flag as read-only sync data.": "Online Exam perdor identitetin e studentit, emailin dhe statusin aktiv si te dhena sinkronizimi vetem per lexim.",
  "Professor and assistant identities should be synchronized from SMU instead of manually maintained.": "Identitetet e profesoreve dhe asistenteve duhet te sinkronizohen nga SMU ne vend qe te mirembahen manualisht.",
  "Academic term labels, dates, and current-term state come from SMU.": "Etiketat e afateve akademike, datat dhe gjendja e afatit aktual vijne nga SMU.",
  "Course code, name, credits, and semester positioning come from SMU.": "Kodi i lendes, emri, kreditet dhe pozicionimi semestral vijne nga SMU.",
  "Course Offerings": "Ofrimet e lendeve",
  "Offering capacity, section, term, and lifecycle are synchronized from SMU.": "Kapaciteti, grupi, afati dhe cikli i ofrimit sinkronizohen nga SMU.",
  "Semester and Course Enrollments": "Regjistrimet semestrale dhe te lendeve",
  "Eligibility to sit an exam is derived from SMU enrollment data.": "E drejta per te hyre ne provim rrjedh nga te dhenat e regjistrimit ne SMU.",
  "SMU menaxhon": "SMU menaxhon",
  "Online Exam menaxhon": "Online Exam menaxhon",
  "Exam Definitions": "Definicionet e provimeve",
  "Exam authoring, question banks, timing, and publication remain local.": "Autorizimi i provimeve, bankat e pyetjeve, oraret dhe publikimi mbeten lokale.",
  "Exam Attempts and Grades": "Tentimet dhe notat e provimeve",
  "Attempts, grading workflow, and published results stay in Online Exam.": "Tentimet, rrjedha e notimit dhe rezultatet e publikuara mbeten ne Online Exam.",
  "Integrity and Lockdown Events": "Ngjarjet e integritetit dhe lockdown",
  "Proctoring signals and policy actions remain local to exam delivery.": "Sinjalet e proctoring dhe veprimet e politikes mbeten lokale per zhvillimin e provimit.",
  "Professor/Assistant Assignment Overrides": "Mbishkrime te caktimeve Profesor/Asistent",
  "Teaching-team assignment logic can stay local unless SMU exposes staff assignment feeds.": "Logjika e caktimit te ekipit mesimor mund te mbetet lokale pervec nese SMU ekspozon feed-e te caktimeve te stafit.",
  "Primary navigation": "Navigimi kryesor",
  "Close menu": "Mbyll menune",
  "Close navigation": "Mbyll navigimin",
  "Open navigation": "Hap navigimin",
  "Dashboard focus areas": "Fushat fokale te panelit",
  "Settings": "Cilesimet",
  "Manage your own account security without changing any other user account.": "Menaxho sigurine e llogarise tende pa ndryshuar asnje llogari tjeter.",
  "Temporarily offline": "Perkohesisht jashte linje",
  "Exam focus summary": "Permbledhje e fokusit te provimit",
  "Exam camera preview": "Pamje e kameres se provimit",
  "Type your answer here...": "Shkruaj pergjigjen ketu...",
  "Exam integrity status": "Statusi i integritetit te provimit",
  "Enter code": "Shkruaj kodin",
  "Verified student identity": "Identitet i verifikuar i studentit",
  "Record why the final score was accepted or adjusted.": "Regjistro pse piket finale u pranuan ose u ndryshuan.",
  "Optional feedback for this answer": "Feedback opsional per kete pergjigje",
  "Attempt timeline": "Kronologjia e tentimit",
  "Search by title, course, cohort, semester...": "Kerko sipas titullit, lendes, gjenerates, semestrit...",
  "Search question, answer, or topic": "Kerko pyetje, pergjigje ose teme",
  "Search question, answer, or topic": "Kerko pyetje, pergjigje ose teme",
  "Name, email, status...": "Emri, emaili, statusi...",
  "Question setup mode": "Menyra e konfigurimit te pyetjeve",
  "User management tool": "Vegla e menaxhimit te perdoruesve",
  "Academic directory view": "Pamja e direktorise akademike",
  "Term directory": "Direktoria e afateve",
  "Course catalog": "Katalogu i lendeve",
  "Course offerings": "Ofrimet e lendeve",
  "Academic records come from SMU": "Regjistrat akademike vijne nga SMU",
  "Students and staff come from SMU": "Studentet dhe stafi vijne nga SMU"
};

const ADDITIONAL_TEXT_TRANSLATIONS = {
  "Academic owner": "Pronari akademik",
  "Access": "Qasja",
  "Access control": "Kontrolli i qasjes",
  "Assessment category / official period": "Kategoria e vleresimit / afati zyrtar",
  "Attempts": "Tentimet",
  "Auto score": "Piket automatike",
  "Back to exam": "Kthehu te provimi",
  "Changes apply only to this exam question.": "Ndryshimet vlejne vetem per kete pyetje provimi.",
  "Choose a replacement from the same course question bank.": "Zgjedh zevendesim nga e njejta banke pyetjesh e lendes.",
  "Closed": "Mbyllur",
  "Configure terms, courses, and course offerings dynamically so the faculty can evolve without hardcoded academic rules.": "Konfiguro afatet, lendet dhe ofrimet e lendeve ne menyre dinamike qe fakulteti te zhvillohet pa rregulla akademike te hardcoduara.",
  "Correct": "Sakte",
  "Correct / model answer": "Pergjigje e sakte / model",
  "Duration used": "Koha e perdorur",
  "Edit exam question": "Ndrysho pyetjen e provimit",
  "Entry code and integrity guard": "Kodi i hyrjes dhe mbrojtja e integritetit",
  "Exam setup": "Konfigurimi i provimit",
  "Exam submitted successfully. You are back in the normal application view.": "Provimi u dorezua me sukses. Je kthyer ne pamjen normale te aplikacionit.",
  "Export CSV": "Eksporto CSV",
  "Gradebook could not be loaded.": "Libri i notave nuk mund te ngarkohej.",
  "Gradebook review becomes available after students submit this assessment. Keep this page as the academic review workspace.": "Rishikimi i librit te notave behet i disponueshem pasi studentet ta dorezojne kete vleresim. Mbaje kete faqe si hapesire akademike rishikimi.",
  "Human grade": "Nota njerezore",
  "Integrity": "Integriteti",
  "Locked": "I bllokuar",
  "Manual review": "Rishikim manual",
  "Missing setup": "Konfigurim qe mungon",
  "No action": "Pa veprim",
  "No missing setup": "Nuk mungon konfigurim",
  "No offerings available for readiness review.": "Nuk ka ofrime te disponueshme per rishikim gatishmerie.",
  "No records found for this view.": "Nuk u gjeten regjistra per kete pamje.",
  "Offering": "Ofrimi",
  "Offering readiness": "Gatishmeria e ofrimit",
  "Operational checks only. Exam content, answers, grades, and feedback stay with academic staff.": "Vetem kontrolle operative. Permbajtja e provimit, pergjigjet, notat dhe feedback-u mbeten te stafi akademik.",
  "Pending": "Ne pritje",
  "Print": "Printo",
  "Question bank selector": "Zgjedhesi i bankes se pyetjeve",
  "Readiness": "Gatishmeria",
  "Replacement question": "Pyetje zevendesuese",
  "Result": "Rezultati",
  "Result publication": "Publikimi i rezultatit",
  "Retake only": "Vetem riprovim",
  "Run": "Ekzekuto",
  "Save": "Ruaj",
  "Save grade": "Ruaj noten",
  "Scheduled": "Planifikuar",
  "Section": "Grupi",
  "Select best option.": "Zgjedh opsionin me te mire.",
  "Select the best option.": "Zgjedh opsionin me te mire.",
  "Student answer": "Pergjigja e studentit",
  "Submitted attempts": "Tentime te dorezuara",
  "Technical workspace": "Hapesire teknike",
  "Try another filter or add more data.": "Provo filter tjeter ose shto me shume te dhena.",
  "Unlock": "Zhblloko",
  "Write a clear response.": "Shkruaj nje pergjigje te qarte.",
  "Yes": "Po",
  "No": "Jo",
  "Fallback mode": "Modalitet fallback",
  "Check SMU contract": "Kontrollo kontraten SMU",
  "Review SMU contract": "Rishiko kontraten SMU",
  "Checking SMU": "Duke kontrolluar SMU",
  "Academic source": "Burimi akademik",
  "SMU sync and fallback admin screens are clearly separated.": "Sinkronizimi SMU dhe ekranet fallback te adminit jane te ndara qarte.",
  "Enrollment visibility": "Dukshmeria e regjistrimeve",
  "Current semester, eligibility, and carry-over controls are visible.": "Semestri aktual, e drejta dhe kontrollet carry-over jane te dukshme.",
  "Demo data": "Te dhenat demo",
  "Confirm at least one eligible student and one published exam before presentation.": "Konfirmo se paku nje student te lejuar dhe nje provim te publikuar para prezantimit.",
  "Assigned offerings": "Ofrimet e caktuara",
  "Professor sees only assigned course offerings.": "Profesori sheh vetem ofrimet e caktuara te lendeve.",
  "Exam readiness": "Gatishmeria e provimit",
  "Draft, question attachment, publish readiness, and access-code setup are available.": "Drafti, bashkangjitja e pyetjeve, gatishmeria per publikim dhe konfigurimi i kodit te qasjes jane te disponueshme.",
  "Gradebook can save scores and publish student-visible results.": "Libri i notave mund te ruaje pike dhe te publikoje rezultate te dukshme per studentet.",
  "Change password": "Ndrysho fjalekalimin",
  "Changing...": "Duke ndryshuar...",
  "Password changed successfully.": "Fjalekalimi u ndryshua me sukses.",
  "Password could not be changed.": "Fjalekalimi nuk mund te ndryshohej.",
  "Current password is required.": "Fjalekalimi aktual eshte i detyrueshem.",
  "New password is required.": "Fjalekalimi i ri eshte i detyrueshem.",
  "Passwords do not match.": "Fjalekalimet nuk perputhen.",
  "Synced data": "Te dhena te sinkronizuara",
  "Manual creation stays available only while SMU is not configured.": "Krijimi manual mbetet i disponueshem vetem kur SMU nuk eshte konfiguruar.",
  "Create offering": "Krijo ofrim",
  "Delete draft": "Fshij draftin",
  "Not published": "I papublikuar",
  "June Exam Period": "Afati i qershorit",
  "January Exam Period": "Afati i janarit",
  "April Exam Period": "Afati i prillit",
  "September Exam Period": "Afati i shtatorit",
  "October Exam Period": "Afati i tetorit",
  "Participation": "Pjesemarrja",
  "Publish status": "Statusi i publikimit",
  "Published exams": "Provime te publikuara",
  "Pending results": "Rezultate ne pritje",
  "Average score": "Piket mesatare",
  "Integrity violations": "Shkelje te integritetit",
  "0 rows included in this table.": "0 rreshta te perfshire ne kete tabele.",
  "rows included in this table.": "rreshta te perfshire ne kete tabele.",
};

Object.assign(ADDITIONAL_TEXT_TRANSLATIONS, {
  "Eligibility": "E drejta",
  "Student sees only current eligible courses and published exams.": "Studenti sheh vetem lendet aktuale te lejuara dhe provimet e publikuara.",
  "Attempt safety": "Siguria e tentimit",
  "Timer, autosave, integrity guard, and submit review are visible.": "Kohomatesi, ruajtja automatike, mbrojtja e integritetit dhe rishikimi para dorezimit jane te dukshme.",
  "Results": "Rezultatet",
  "Pending scores stay hidden and published results are separated.": "Piket ne pritje mbeten te fshehura dhe rezultatet e publikuara jane te ndara.",
  "Open": "Hap",
  "Start": "Fillo",
  "Available": "I disponueshem",
  "Dorezuar": "Dorezuar",
  "Hap provimin per te menaxhuar pyetjet, detajet dhe per te vazhduar rrjedhen e punes.": "Hap provimin per te menaxhuar pyetjet, detajet dhe per te vazhduar rrjedhen e punes.",
  "Open the exam to manage questions, review details, and continue the workflow.": "Hap provimin per te menaxhuar pyetjet, per te rishikuar detajet dhe per te vazhduar rrjedhen e punes.",
  "View result status": "Shiko statusin e rezultatit",
  "Shiko statusin e rezultatit": "Shiko statusin e rezultatit",
  "Professor": "Profesor",
  "Assistant": "Asistent",
  "Planned": "Planifikuar",
  "Planifikuar": "Planifikuar",
  "Scoped access": "Qasje e kufizuar",
  "Assistant sees support offerings without admin-only controls.": "Asistenti sheh ofrimet mbeshtetese pa kontrolle vetem per admin.",
  "Question support": "Mbeshtetje per pyetje",
  "Question bank and assigned exam support remain tied to offerings.": "Banka e pyetjeve dhe mbeshtetja per provimet e caktuara mbeten te lidhura me ofrimet.",
  "Review handoff": "Dorezim per rishikim",
  "Professor still owns final grading and publication decisions.": "Profesori ende mban vendimet finale per notim dhe publikim.",
  "Support offerings": "Ofrimet mbeshtetese",
  "Review tasks": "Detyrat e rishikimit",
  "Session readiness": "Gatishmeria e sesionit",
  "Open assigned exams": "Hap provimet e caktuara",
  "Support course delivery, exam execution, and grading coordination.": "Mbeshtet zhvillimin e lendes, ekzekutimin e provimit dhe koordinimin e notimit.",
  "Use this zone to track assigned offerings, exam support tasks, and grading responsibilities under professor-owned courses.": "Perdor kete zone per te ndjekur ofrimet e caktuara, detyrat mbeshtetese te provimeve dhe pergjegjesite e notimit nen lendet e profesoriteve.",
  "Assigned offerings": "Ofrime te caktuara",
  "Support exams": "Provime mbeshtetese",
  "Review tasks": "Detyra rishikimi",
  "Active sessions": "Sesione aktive",
  "Current semester": "Semestri aktual",
  "Include live sessions": "Perfshi sesionet live",
  "Short-answer grading": "Notim i pergjigjeve te shkurtra",
  "Monitoring coming soon": "Monitorimi vjen se shpejti",
  "Assistant Create Exam": "Krijo provim si asistent",
  "Assistant Gradebook": "Libri i notave i asistentit",
  "Current term": "Afati aktual",
  "Eligible courses": "Lende te lejuara",
  "Provime te publikuara": "Provime te publikuara",
  "Dukshmeria aktuale akademike": "Dukshmeria aktuale akademike",
  "Year 1, semester 1 - Approved": "Viti 1, semestri 1 - Aprovuar",
  "Approved": "Aprovuar",
  "View eligible exams": "Shiko provimet e lejuara",
  "View results": "Shiko rezultatet",
  "Published and eligible only": "Vetem te publikuara dhe te lejuara",
  "Upcoming exams": "Provime te ardhshme",
  "Next 7 days": "7 ditet e ardhshme",
  "Carry-over items": "Artikuj carry-over",
  "Open or assigned": "Te hapura ose te caktuara",
  "Starts": "Fillon",
  "STARTS": "FILLON",
  "Start": "Fillo",
  "Colloquium": "Kollokfium",
  "Colloquum": "Kollokfium",
  "Colloquium exam": "Provimi i kollokfiumit",
  "Midterm": "Kollokfium",
  "Seeded Demo Midterm": "Demo kollokfium i pergatitur",
  "Export still includes all rows.": "Eksporti ende perfshin te gjithe rreshtat.",
  "Showing0-0nga0. Export still includes all rows.": "Duke shfaqur 0-0 nga 0. Eksporti ende perfshin te gjithe rreshtat.",
  "Page1nga1": "Faqja 1 nga 1"
});

Object.assign(TEXT_TRANSLATIONS, ADDITIONAL_TEXT_TRANSLATIONS);

const LOWER_TEXT_TRANSLATIONS = Object.fromEntries(
  Object.entries(TEXT_TRANSLATIONS).map(([key, value]) => [key.toLowerCase(), value]),
);

const ATTRIBUTE_TRANSLATIONS = {
  "Search student, email, ID, status...": "Kerko studentin, emailin, ID-ne, statusin...",
  "Reason for audit log and student status...": "Arsyeja per audit log dhe statusin e studentit...",
  "Name, email, student number, enrollment status...": "Emri, emaili, numri i studentit, statusi i regjistrimit...",
  "Course, title, semester, cohort...": "Lenda, titulli, semestri, gjenerata...",
  "Module, chapter, topic": "Moduli, kapitulli, tema",
  "Search by prompt or answer": "Kerko sipas pyetjes ose pergjigjes",
  "Write the exact question students will see.": "Shkruaj pyetjen e sakte qe do ta shohin studentet.",
  "Example: Normalization, arrays, joins": "Shembull: Normalizimi, vargjet, joins",
  "Example: Students(Id, FullName), Exams(Id, Title)": "Shembull: Students(Id, FullName), Exams(Id, Title)",
  "Describe expected output, query result, or grading criteria.": "Pershkruaj output-in e pritur, rezultatin e query-t ose kriteret e notimit.",
  "Write the reference answer AI and staff should use for evaluation.": "Shkruaj pergjigjen referente qe AI dhe stafi duhet ta perdorin per vleresim.",
  "Example: Normalization, joins, arrays": "Shembull: Normalizimi, joins, vargjet",
  "Example: Students(Id, FullName, YearOfStudy), Exams(Id, Title, StartsAt)": "Shembull: Students(Id, FullName, YearOfStudy), Exams(Id, Title, StartsAt)",
  "Describe the expected output, query result, or grading criteria.": "Pershkruaj output-in e pritur, rezultatin e query-t ose kriteret e notimit.",
  "Write the reference answer or grading criteria for this text question.": "Shkruaj pergjigjen referente ose kriteret e notimit per kete pyetje me tekst.",
  "Search replacement question": "Kerko pyetje zevendesuese",
  "Name, email, status...": "Emri, emaili, statusi...",
  "Record why the final score was accepted or adjusted.": "Regjistro pse piket finale u pranuan ose u ndryshuan.",
  "Optional feedback for this answer": "Feedback opsional per kete pergjigje",
  "Search by title, course, cohort, semester...": "Kerko sipas titullit, lendes, gjenerates, semestrit...",
  "Type your answer here...": "Shkruaj pergjigjen ketu...",
  "Enter code": "Shkruaj kodin"
};

const textOriginals = new WeakMap();
const textTranslations = new WeakMap();
const attributeNames = ["placeholder", "aria-label", "title"];

export default function RuntimeAlbanianTranslator() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;

    function translateText(value) {
      const compact = String(value || "").replace(/\s+/g, " ").trim();
      if (!compact) return value;
      const exactTranslation = TEXT_TRANSLATIONS[compact] || LOWER_TEXT_TRANSLATIONS[compact.toLowerCase()];
      if (exactTranslation) return exactTranslation;
      const showingMatch = compact.match(/^Showing\s+(\d+)-(\d+)\s+of\s+(\d+)$/i);
      if (showingMatch) {
        return `Duke shfaqur ${showingMatch[1]}-${showingMatch[2]} nga ${showingMatch[3]}`;
      }
      const pageMatch = compact.match(/^Page\s+(\d+)\s+of\s+(\d+)$/i);
      if (pageMatch) {
        return `Faqja ${pageMatch[1]} nga ${pageMatch[2]}`;
      }
      const attentionMatch = compact.match(/^(\d+)\s+items?\s+need attention\.$/i);
      if (attentionMatch) {
        return `${attentionMatch[1]} fusha kerkojne vemendje.`;
      }
      const correctMatch = compact.match(/^(\d+)\s+correct$/i);
      if (correctMatch) {
        return `${correctMatch[1]} te sakta`;
      }
      const rowMatch = compact.match(/^(\d+)\s+rows$/i);
      if (rowMatch) {
        return `${rowMatch[1]} rreshta`;
      }
      const optionMatch = compact.match(/^Option\s+(\d+)$/i);
      if (optionMatch) {
        return `Opsioni ${optionMatch[1]}`;
      }
      const countVisibleMatch = compact.match(/^(\d+)\s+visible$/i);
      if (countVisibleMatch) {
        return `${countVisibleMatch[1]} te dukshme`;
      }
      const countReadyMatch = compact.match(/^(\d+)\s+ready$/i);
      if (countReadyMatch) {
        return `${countReadyMatch[1]} gati`;
      }
      const countOpenMatch = compact.match(/^(\d+)\s+open$/i);
      if (countOpenMatch) {
        return `${countOpenMatch[1]} te hapura`;
      }
      const countAssignedMatch = compact.match(/^(\d+)\s+assigned$/i);
      if (countAssignedMatch) {
        return `${countAssignedMatch[1]} te caktuara`;
      }
      const startSubmitMatch = compact.match(/^Start\s+(.+)$/i);
      if (startSubmitMatch) {
        return `Fillim ${startSubmitMatch[1]}`;
      }
      const submitMatch = compact.match(/^Submit\s+(.+)$/i);
      if (submitMatch) {
        return `Dorezim ${submitMatch[1]}`;
      }
      const minUsedMatch = compact.match(/^(\d+)\s+min used$/i);
      if (minUsedMatch) {
        return `${minUsedMatch[1]} min te perdorura`;
      }
      const submittedDateMatch = compact.match(/^Submitted\s+(.+)$/i);
      if (submittedDateMatch) {
        return `Dorezuar ${submittedDateMatch[1]}`;
      }
      const yearSemesterApprovedMatch = compact.match(/^Year\s+(\d+),\s+semester\s+(\d+)\s+-\s+Approved$/i);
      if (yearSemesterApprovedMatch) {
        return `Viti ${yearSemesterApprovedMatch[1]}, semestri ${yearSemesterApprovedMatch[2]} - Aprovuar`;
      }
      const publishedDateMatch = compact.match(/^Published\s+(.+)$/i);
      if (publishedDateMatch) {
        return `Publikuar ${publishedDateMatch[1]}`;
      }
      const activeCountMatch = compact.match(/^(\d+)\s+active$/i);
      if (activeCountMatch) {
        return `${activeCountMatch[1]} aktiv`;
      }
      const inactiveCountMatch = compact.match(/^(\d+)\s+inactive$/i);
      if (inactiveCountMatch) {
        return `${inactiveCountMatch[1]} joaktiv`;
      }
      const rowsIncludedMatch = compact.match(/^(\d+)\s+rows included in this table\.$/i);
      if (rowsIncludedMatch) {
        return `${rowsIncludedMatch[1]} rreshta te perfshire ne kete tabele.`;
      }

      const rowsIncludedFragmentMatch = compact.match(/^rows included in this table\.$/i);
      if (rowsIncludedFragmentMatch) {
        return "rreshta te perfshire ne kete tabele.";
      }
      const thisWeekMatch = compact.match(/^\+?(\d+)\s+this week$/i);
      if (thisWeekMatch) {
        return `+${thisWeekMatch[1]} kete jave`;
      }
      const loadingMatch = compact.match(/^Loading\s+(.+)\.\.\.$/i);
      if (loadingMatch) {
        return `Duke ngarkuar ${translateFragment(loadingMatch[1])}...`;
      }
      const noMatch = compact.match(/^No\s+(.+)$/i);
      if (noMatch && compact.length < 90) {
        return `Nuk ka ${translateFragment(noMatch[1]).toLowerCase()}`;
      }
      const allMatch = compact.match(/^All\s+(.+)$/i);
      if (allMatch && compact.length < 60) {
        return `Te gjitha ${translateFragment(allMatch[1]).toLowerCase()}`;
      }
      const backMatch = compact.match(/^Back to\s+(.+)$/i);
      if (backMatch) {
        return `Kthehu te ${translateFragment(backMatch[1]).toLowerCase()}`;
      }
      const withCommonTerms = compact
        .replace(/\bStarts\b/g, "Fillon")
        .replace(/\bSTARTS\b/g, "FILLON")
        .replace(/\bColloquium\b/gi, "Kollokfium")
        .replace(/\bColloquum\b/gi, "Kollokfium")
        .replace(/\bMidterm\b/gi, "Kollokfium")

        .replace(/\brows included in this table\./gi, "rreshta te perfshire ne kete tabele.")

        .replace(/Export still includes all rows\./gi, "Eksporti ende perfshin te gjithe rreshtat.");
      if (withCommonTerms !== compact) return withCommonTerms;
      return TEXT_TRANSLATIONS[compact] || value;
    }

    function translateFragment(value) {
      const fragment = String(value || "").replace(/\s+/g, " ").trim();
      return TEXT_TRANSLATIONS[fragment] ||
        ADDITIONAL_TEXT_TRANSLATIONS[fragment] ||
        fragment
          .replace(/\bacademic\b/gi, "akademike")
          .replace(/\bworkspace\b/gi, "hapesira")
          .replace(/\brecords\b/gi, "regjistra")
          .replace(/\bquestions\b/gi, "pyetje")
          .replace(/\bexams\b/gi, "provime")
          .replace(/\bresults\b/gi, "rezultate")
          .replace(/\bstudents\b/gi, "studente")
          .replace(/\bofferings\b/gi, "ofrime")
          .replace(/\breports\b/gi, "raporte")
          .replace(/\bgradebook\b/gi, "libri i notave")
          .replace(/\bsettings\b/gi, "cilesime")
          .replace(/\bsession\b/gi, "sesion")
          .replace(/\bstarts\b/gi, "fillon")
          .replace(/\bcolloquium\b/gi, "kollokfium")
          .replace(/\bcolloquum\b/gi, "kollokfium")
          .replace(/\bmidterm\b/gi, "kollokfium")
          .replace(/\bdata\b/gi, "te dhena");
    }

    function applyTranslations() {
      const useAlbanian = i18n.language?.startsWith("sq");
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      textNodes.forEach((node) => {
        if (!textOriginals.has(node)) textOriginals.set(node, node.nodeValue);
        const previousTranslation = textTranslations.get(node);
        if (previousTranslation !== undefined && node.nodeValue !== previousTranslation) {
          textOriginals.set(node, node.nodeValue);
        }
        const original = textOriginals.get(node);
        const nextValue = useAlbanian ? translateText(original) : original;
        textTranslations.set(node, nextValue);
        if (node.nodeValue !== nextValue) {
          node.nodeValue = nextValue;
        }
      });

      root.querySelectorAll("*").forEach((element) => {
        attributeNames.forEach((attributeName) => {
          if (!element.hasAttribute(attributeName)) return;
          const originalAttribute = `data-original-${attributeName}`;
          if (!element.hasAttribute(originalAttribute)) {
            element.setAttribute(originalAttribute, element.getAttribute(attributeName) || "");
          }
          const original = element.getAttribute(originalAttribute) || "";
          const translated = ATTRIBUTE_TRANSLATIONS[original] || TEXT_TRANSLATIONS[original] || original;
          const nextValue = useAlbanian ? translated : original;
          if (element.getAttribute(attributeName) !== nextValue) {
            element.setAttribute(attributeName, nextValue);
          }
        });
      });
    }


    let frameId = 0;
    function scheduleTranslations() {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        applyTranslations();
      });
    }

    scheduleTranslations();
    const observer = new MutationObserver(scheduleTranslations);
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
    window.addEventListener("languagechange", scheduleTranslations);
    window.addEventListener("app-language-changed", scheduleTranslations);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("languagechange", scheduleTranslations);
      window.removeEventListener("app-language-changed", scheduleTranslations);
    };
  }, [i18n.language]);

  return null;
}
