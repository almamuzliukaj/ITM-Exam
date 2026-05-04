import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const LANGUAGE_STORAGE_KEY = "app-language";

const resources = {
  en: {
    translation: {
      common: {
        appName: "ITM Exam",
        language: "Language",
        english: "English",
        albanian: "Albanian",
        logout: "Logout",
        dashboard: "Dashboard",
        exams: "Exams",
        users: "Manage Users",
        loading: "Loading...",
        error: "Error",
        cancel: "Cancel",
        back: "Back",
        signedIn: "Signed in",
        unknownUser: "Unknown user",
        guest: "Guest",
        workspace: "Workspace",
        operationalNote: "Operational note",
        operationalNoteText: "This workspace is structured for role-based academic operations and secure exam delivery.",
        facultyWorkspace: "Faculty Operations Suite",
        departmentWorkspace: "Department workspace",
        examOperationsPlatform: "Exam operations platform",
        academicCatalog: "Academic catalog",
        enterWorkspace: "Enter workspace",
        text: "Text",
        code: "Code"
      },
      login: {
        title: "Run academic assessment with clarity, structure, and control.",
        text: "Built for departments that need role-based onboarding, exam preparation, question bank workflows, and a clean student-facing experience.",
        signIn: "Sign in",
        signInText: "Access your role-based workspace. Account provisioning is handled by the administrator.",
        emailLabel: "Email address",
        passwordLabel: "Password",
        emailPlaceholder: "name@faculty.edu",
        passwordPlaceholder: "Enter your password",
        show: "Show",
        hide: "Hide",
        signingIn: "Signing in...",
        loginFailed: "Login failed",
        presets: {
          admin: "Admin demo",
          professor: "Professor demo",
          student: "Student demo"
        },
        features: {
          adminTitle: "Admin operations",
          adminText: "User onboarding, imports, staff management, and semester control.",
          teachingTitle: "Teaching workflows",
          teachingText: "Question authoring, exam setup, publishing, and grading readiness.",
          studentTitle: "Student delivery",
          studentText: "Focused access to eligible exams, results, and carry-over opportunities."
        }
      },
      dashboard: {
        loading: "Loading workspace...",
        error: "Unable to load dashboard.",
        statsError: "Dashboard data could not be loaded.",
        title: "Operational overview",
        subtitle: "A role-based workspace designed for real academic operations, exam preparation, and secure assessment delivery.",
        examWorkspace: "Exam workspace",
        academicSetup: "Academic setup",
        enrollmentControl: "Enrollment control",
        userManagement: "User management",
        badges: {
          Admin: "Admin dashboard",
          Professor: "Professor dashboard",
          Assistant: "Assistant dashboard",
          Student: "Student dashboard"
        }
      },
      examsList: {
        loading: "Loading exams...",
        error: "Failed to load exam data.",
        userError: "Unable to load user profile.",
        badge: "Exam workspace",
        title: "Exams",
        subtitle: "Review current assessments, drafts, and publishing readiness in a cleaner operational view.",
        create: "Create exam",
        total: "Total exams",
        published: "Published",
        draft: "Draft",
        loadingRecords: "Loading exam records...",
        emptyTitle: "No exams are available yet.",
        emptyText: "Once faculty workflows are connected, current, scheduled, and published exams will appear here.",
        noDescription: "No description has been provided for this assessment yet.",
        openHint: "Open the exam to manage questions, review details, and continue the workflow.",
        open: "Open"
      },
      examCreate: {
        loading: "Loading creation workspace...",
        userError: "Unable to load user profile.",
        error: "Unable to create the exam right now.",
        offeringsError: "Assigned course offerings could not be loaded.",
        badge: "Exam authoring",
        title: "Create exam",
        subtitle: "Set the assessment foundation first. Question selection, scheduling, and publishing will build on this record.",
        configuration: "Exam configuration",
        loadingOfferings: "Loading assigned course offerings...",
        noOfferingsTitle: "No assigned course offerings.",
        noOfferingsText: "Ask an administrator or primary professor to assign you to an offering before creating an exam.",
        offeringLabel: "Course offering",
        titleLabel: "Title",
        durationLabel: "Duration in minutes",
        descriptionLabel: "Description",
        descriptionPlaceholder: "Describe scope, instructions, allowed materials, and intended delivery notes.",
        creating: "Creating...",
        create: "Create exam"
      },
      examDetails: {
        loading: "Loading exam details...",
        error: "Failed to load exam details.",
        userError: "Unable to load user profile.",
        badge: "Exam details",
        titleFallback: "Exam detail",
        subtitleFallback: "Inspect the exam structure, question coverage, and next authoring actions.",
        backToExams: "Back to exams",
        addQuestion: "Add question",
        loadingStructure: "Loading exam structure...",
        status: "Status",
        duration: "Duration",
        questions: "Questions",
        coverage: "Question coverage",
        progress: "Current authoring progress for this assessment",
        noQuestionsTitle: "No questions have been added yet.",
        noQuestionsText: "Add the first question to start building the exam.",
        type: "Type",
        points: "Points",
        generator: {
          title: "Random question generator",
          subtitle: "Build this draft from your question bank by count and type.",
          count: "Question count",
          generate: "Generate questions",
          generating: "Generating...",
          replace: "Replace question",
          replacing: "Replacing..."
        }
      },
      questionCreate: {
        loading: "Loading question editor...",
        loadExamError: "Failed to load exam.",
        userError: "Unable to load user profile.",
        saveError: "Failed to add question.",
        badge: "Question authoring",
        title: "Add question",
        subtitleLoading: "Loading exam context...",
        subtitle: "Create a new question for {{title}}.",
        backToExam: "Back to exam",
        content: "Question content",
        prompt: "Prompt",
        promptPlaceholder: "Write the question prompt here.",
        type: "Type",
        points: "Points",
        saving: "Saving...",
        save: "Save question"
      },
      questionBank: {
        loading: "Loading question bank...",
        userError: "Unable to load user profile.",
        loadOfferingsError: "Assigned offerings could not be loaded.",
        loadQuestionsError: "Question bank questions could not be loaded.",
        deleteError: "Question could not be deleted.",
        deleteConfirm: "Delete this question from the question bank?",
        badge: "Question bank",
        title: "Question bank",
        subtitle: "Manage course-based MCQ and text questions per assigned offering.",
        create: "Create question",
        filters: "Filters",
        offering: "Course offering",
        selectOffering: "Select offering",
        type: "Type",
        allTypes: "All types",
        difficulty: "Difficulty",
        allDifficulties: "All difficulties",
        search: "Search",
        searchPlaceholder: "Search by prompt or answer",
        selectedOffering: "Working in: {{offering}}",
        loadingOfferings: "Loading assigned offerings...",
        loadingQuestions: "Loading question bank questions...",
        emptyOfferingTitle: "No offering selected.",
        emptyOfferingText: "Choose one of your assigned offerings to start authoring questions.",
        emptyTitle: "No questions yet.",
        emptyText: "Create the first MCQ or text question for this offering.",
        pointsValue: "{{count}} pts",
        noDifficulty: "No difficulty",
        correctTag: "(correct)",
        modelAnswer: "Model answer",
        cardHint: "Edit the question or keep building the course question bank.",
        edit: "Edit",
        delete: "Delete",
        difficulties: {
          easy: "Easy",
          medium: "Medium",
          hard: "Hard"
        },
        editor: {
          loading: "Loading question bank editor...",
          loadContextError: "Question bank context could not be loaded.",
          loadQuestionError: "Question could not be loaded.",
          saveError: "Question could not be saved.",
          createTitle: "Create question bank entry",
          editTitle: "Edit question bank entry",
          subtitle: "Author a question for {{offering}}.",
          subtitleEmpty: "Author a question for one of your assigned offerings.",
          back: "Back to question bank",
          sectionTitle: "Question details",
          prompt: "Prompt",
          promptPlaceholder: "Write the full question prompt here.",
          points: "Points",
          options: "MCQ options",
          addOption: "Add option",
          optionPlaceholder: "Option {{index}}",
          remove: "Remove",
          correctAnswer: "Correct answer",
          selectCorrectAnswer: "Select the correct option",
          modelAnswerPlaceholder: "Optional reference answer for manual grading.",
          saving: "Saving...",
          save: "Save question"
        }
      },
      adminUsers: {
        loading: "Loading administration workspace...",
        userError: "Unable to load user profile.",
        loadUsersError: "Failed to load users.",
        createError: "Failed to create user.",
        createSuccess: "User created successfully.",
        previewIssue: "Some CSV rows need attention before import.",
        fixCsv: "Fix CSV validation issues before importing.",
        importError: "Failed to import users.",
        importSuccess: "Import completed. {{count}} users added.",
        updateSuccess: "User updated successfully.",
        updateError: "Failed to update user.",
        statusError: "Failed to update user status.",
        statusSuccess: "User {{action}} successfully.",
        resetMissing: "Enter a new password before resetting.",
        resetSuccess: "Password reset successfully.",
        resetError: "Failed to reset password.",
        badge: "Administration",
        title: "User management",
        subtitle: "Provision students, professors, and assistants with an interface designed for real departmental operations.",
        backToOverview: "Back to overview",
        createUser: "Create user",
        fullName: "Full name",
        email: "Email",
        role: "Role",
        temporaryPassword: "Temporary password",
        activeAccount: "Active account",
        creating: "Creating...",
        createButton: "Create user",
        bulkImport: "Bulk import",
        defaultPassword: "Default password",
        defaultPasswordPlaceholder: "Used when a row password is empty",
        generatePasswords: "Generate passwords when none are provided",
        csvRows: "CSV rows",
        validateFile: "Validate file",
        importing: "Importing...",
        importUsers: "Import users",
        importPreview: "Import preview",
        previewHint: "Validate the CSV content to preview rows before import.",
        line: "Line",
        status: "Status",
        validation: "Validation",
        ready: "Ready",
        importSummary: "Import summary",
        requested: "Requested",
        imported: "Imported",
        failed: "Failed",
        importedAccounts: "Imported accounts",
        failedRows: "Failed rows",
        userDirectory: "User directory",
        searchPlaceholder: "Search by full name or email",
        allRoles: "All roles",
        allStatuses: "All statuses",
        active: "Active",
        inactive: "Inactive",
        activated: "activated",
        deactivated: "deactivated",
        loadingRecords: "Loading user records...",
        created: "Created",
        actions: "Actions",
        edit: "Edit",
        deactivate: "Deactivate",
        activate: "Activate",
        newPassword: "New password",
        reset: "Reset",
        save: "Save",
        roles: {
          Student: "Student",
          Professor: "Professor",
          Assistant: "Assistant",
          Admin: "Admin"
        },
        csvErrors: {
          required: "FullName, Email, and Role are required.",
          invalidRole: "Role must be Student, Professor, Assistant, or Admin.",
          duplicate: "Duplicate email in CSV.",
          weakPassword: "Password must be at least 8 characters and include upper, lower, and number."
        }
      },
      shell: {
        nav: {
          adminOverview: "Overview",
          adminAcademic: "Academic",
          adminEnrollments: "Enrollments",
          adminUsers: "Users",
          adminExams: "Exams",
          professorOverview: "Overview",
          professorQuestionBank: "Question bank",
          professorExams: "My exams",
          professorCreateExam: "Create exam",
          assistantOverview: "Overview",
          assistantQuestionBank: "Question bank",
          assistantExams: "Assigned exams",
          studentOverview: "Overview",
          studentExams: "Available exams"
        }
      },
      rolePanels: {
        admin: {
          badge: "Administration",
          heroTitle: "Control the academic cycle from one operational workspace.",
          heroText: "Manage user onboarding, monitor platform readiness, and keep semesters, staff assignments, and exam operations aligned.",
          stats: {
            activeUsers: { label: "Active users", meta: "+12 this week" },
            offerings: { label: "Course offerings", meta: "Across 6 semesters" },
            imports: { label: "Pending enrollments", meta: "Require review" },
            alerts: { label: "Policy alerts", meta: "Need admin action" }
          },
          quickActions: {
            academicSetup: "Academic setup",
            manageUsers: "Manage users",
            reviewExams: "Review exams"
          },
          sections: {
            priorities: {
              title: "Operational priorities",
              items: [
                "Review newly imported students before semester activation.",
                "Confirm professor and assistant assignments for course offerings.",
                "Validate inactive accounts before the next exam window."
              ]
            },
            nextMoves: {
              title: "Recommended next moves",
              items: [
                "Add enrollment workflows so students map to current and carry-over subjects.",
                "Connect role dashboards to real aggregate APIs.",
                "Finalize exam publishing and monitoring flows."
              ]
            }
          }
        },
        professor: {
          badge: "Professor Workspace",
          heroTitle: "Design exams, manage question quality, and supervise assessment readiness.",
          heroText: "Your dashboard groups teaching responsibilities, exam creation tasks, and grading priorities in one place.",
          stats: {
            assignedCourses: { label: "Assigned courses", meta: "Across Years 1-3" },
            draftExams: { label: "Draft exams", meta: "Awaiting completion" },
            questionBank: { label: "Question bank", meta: "Tagged by difficulty" },
            grading: { label: "Pending grading", meta: "Assistant-linked included" }
          },
          quickActions: {
            openExams: "Open exam workspace",
            createExam: "Create exam"
          },
          sections: {
            focus: {
              title: "This week's focus",
              items: [
                "Build exams from approved question banks per semester.",
                "Review assistant-created assessments and their grading progress.",
                "Prepare publish-ready schedules for active exam windows."
              ]
            },
            courses: {
              title: "Course organization",
              items: [
                "Year 1: Programming Fundamentals, Database Systems",
                "Year 2: Algorithms, Operating Systems",
                "Year 3: Software Engineering"
              ]
            }
          },
          offerings: {
            title: "Assigned offerings",
            subtitle: "Only course offerings assigned to your active professor account are shown.",
            loading: "Loading assigned offerings...",
            error: "Assigned offerings could not be loaded.",
            emptyTitle: "No assigned offerings yet.",
            emptyText: "Ask an administrator to assign you to a course offering before creating course-linked exams.",
            total: "{{count}} assigned",
            groupTitle: "Year {{year}}, Semester {{semester}}",
            groupCount: "{{count}} offerings",
            section: "Section {{section}}",
            term: "Term",
            delivery: "Delivery",
            capacity: "Capacity",
            courseFallback: "Unnamed course",
            termFallback: "No term"
          }
        },
        assistant: {
          badge: "Assistant Workspace",
          heroTitle: "Support course delivery, exam execution, and grading coordination.",
          heroText: "Use this area to track assigned offerings, exam support tasks, and grading responsibilities under your professor's courses.",
          stats: {
            assignedOfferings: { label: "Assigned offerings", meta: "Current semester" },
            supportExams: { label: "Support exams", meta: "Including live sessions" },
            reviewTasks: { label: "Review tasks", meta: "Short-answer grading" },
            activeSessions: { label: "Active sessions", meta: "Monitoring enabled soon" }
          },
          quickActions: {
            assignedExams: "Open assigned exams"
          },
          sections: {
            responsibilities: {
              title: "Responsibilities",
              items: [
                "Support exam preparation and monitor assigned assessments.",
                "Review student outcomes for exams created under your course offerings.",
                "Escalate publishing and unlock decisions to the professor."
              ]
            },
            notes: {
              title: "Operational notes",
              items: [
                "Assistant dashboards should expose grades and support actions, not global exam ownership.",
                "Live monitoring and violation logs will appear here once the proctoring module is implemented."
              ]
            }
          },
          offerings: {
            title: "Assigned support offerings",
            subtitle: "Only course offerings where your assistant assignment is active are shown.",
            loading: "Loading assigned support offerings...",
            error: "Assigned support offerings could not be loaded.",
            emptyTitle: "No support offerings assigned yet.",
            emptyText: "Ask an administrator or primary professor to assign you to an active course offering.",
            total: "{{count}} assigned",
            groupTitle: "Year {{year}}, Semester {{semester}}",
            groupCount: "{{count}} support offerings",
            section: "Section {{section}}",
            term: "Term",
            delivery: "Delivery",
            capacity: "Capacity",
            responsibility: "Responsibility",
            responsibilityValue: "Exam support and grading coordination",
            courseFallback: "Unnamed course",
            termFallback: "No term"
          }
        },
        student: {
          badge: "Student Workspace",
          heroTitle: "Track eligible exams, upcoming deadlines, and your result history.",
          heroText: "Your dashboard is focused on what you can actually act on: active-semester exams, carry-over opportunities, and published outcomes.",
          stats: {
            eligibleExams: { label: "Eligible exams", meta: "Current visibility rules" },
            upcoming: { label: "Upcoming windows", meta: "Next 7 days" },
            results: { label: "Published results", meta: "Ready to download" },
            carryOver: { label: "Carry-over exams", meta: "Professor unlock required" }
          },
          quickActions: {
            viewExams: "View exams"
          },
          sections: {
            visible: {
              title: "What you should see here",
              items: [
                "Only subjects from your active semester.",
                "Carry-over exams only when explicitly unlocked.",
                "Published results after staff approval."
              ]
            },
            security: {
              title: "Security expectations",
              items: [
                "Exam access will later include QR entry and focused-session rules.",
                "Attempt status, timer, and result downloads will appear as the student flow is completed."
              ]
            }
          }
        }
      }
    }
  },
  sq: {
    translation: {
      common: {
        appName: "ITM Exam",
        language: "Gjuha",
        english: "Anglisht",
        albanian: "Shqip",
        logout: "Dil",
        dashboard: "Ballina",
        exams: "Provimet",
        users: "Menaxho përdoruesit",
        loading: "Duke u ngarkuar...",
        error: "Gabim",
        cancel: "Anulo",
        back: "Kthehu",
        signedIn: "I kyçur",
        unknownUser: "Përdorues i panjohur",
        guest: "Vizitor",
        workspace: "Hapësira e punës",
        operationalNote: "Shënim operacional",
        operationalNoteText: "Kjo hapësirë është ndërtuar për operacione akademike me role dhe shpërndarje të sigurt të provimeve.",
        facultyWorkspace: "Paketa operative e fakultetit",
        departmentWorkspace: "Hapësira e departamentit",
        examOperationsPlatform: "Platforma e operimit të provimeve",
        academicCatalog: "Katalogu akademik",
        enterWorkspace: "Hyr në sistem",
        text: "Tekst",
        code: "Kod"
      },
      login: {
        title: "Menaxho vlerësimin akademik me qartësi, strukturë dhe kontroll.",
        text: "Ndërtuar për departamente që kërkojnë onboarding me role, përgatitje provimesh, rrjedha për bankën e pyetjeve dhe një përvojë të pastër për studentin.",
        signIn: "Kyçu",
        signInText: "Hyr në hapësirën tënde sipas rolit. Krijimi i llogarive menaxhohet nga administratori.",
        emailLabel: "Adresa e email-it",
        passwordLabel: "Fjalëkalimi",
        emailPlaceholder: "emri@fakulteti.edu",
        passwordPlaceholder: "Shkruaj fjalëkalimin",
        show: "Shfaq",
        hide: "Fsheh",
        signingIn: "Duke u kyçur...",
        loginFailed: "Kyçja dështoi",
        presets: {
          admin: "Demo admin",
          professor: "Demo profesor",
          student: "Demo student"
        },
        features: {
          adminTitle: "Operacione admini",
          adminText: "Onboarding i përdoruesve, importe, menaxhim i stafit dhe kontroll i semestrit.",
          teachingTitle: "Rrjedha mësimore",
          teachingText: "Krijim pyetjesh, konfigurim provimesh, publikim dhe gatishmëri për vlerësim.",
          studentTitle: "Përvoja e studentit",
          studentText: "Qasje e fokusuar te provimet e lejuara, rezultatet dhe mundësitë carry-over."
        }
      },
      dashboard: {
        loading: "Duke u ngarkuar hapësira...",
        error: "Ballina nuk mund të ngarkohet.",
        statsError: "Të dhënat e panelit nuk mund të ngarkohen.",
        title: "Pasqyra operative",
        subtitle: "Një hapësirë me role për operacione reale akademike, përgatitje provimesh dhe zhvillim të sigurt të vlerësimit.",
        examWorkspace: "Hapësira e provimeve",
        academicSetup: "Konfigurimi akademik",
        enrollmentControl: "Menaxhimi i regjistrimeve",
        userManagement: "Menaxhimi i përdoruesve",
        badges: {
          Admin: "Paneli i adminit",
          Professor: "Paneli i profesorit",
          Assistant: "Paneli i asistentit",
          Student: "Paneli i studentit"
        }
      },
      examsList: {
        loading: "Duke u ngarkuar provimet...",
        error: "Të dhënat e provimeve nuk u ngarkuan.",
        userError: "Profili i përdoruesit nuk mund të ngarkohet.",
        badge: "Hapësira e provimeve",
        title: "Provimet",
        subtitle: "Shiko vlerësimet aktuale, draftet dhe gatishmërinë për publikim në një pamje më të pastër operative.",
        create: "Krijo provim",
        total: "Totali i provimeve",
        published: "Publikuara",
        draft: "Draft",
        loadingRecords: "Duke u ngarkuar regjistrat e provimeve...",
        emptyTitle: "Ende nuk ka provime.",
        emptyText: "Pasi të lidhen rrjedhat e fakultetit, këtu do të shfaqen provimet aktuale, të planifikuara dhe të publikuara.",
        noDescription: "Për këtë provim ende nuk është dhënë përshkrim.",
        openHint: "Hap provimin për të menaxhuar pyetjet, detajet dhe për të vazhduar rrjedhën e punës.",
        open: "Hap"
      },
      examCreate: {
        loading: "Duke u ngarkuar hapësira e krijimit...",
        userError: "Profili i përdoruesit nuk mund të ngarkohet.",
        error: "Për momentin provimi nuk mund të krijohet.",
        offeringsError: "Ofrimet e caktuara nuk u ngarkuan.",
        badge: "Krijimi i provimit",
        title: "Krijo provim",
        subtitle: "Vendos fillimisht bazën e vlerësimit. Përzgjedhja e pyetjeve, orari dhe publikimi do të ndërtohen mbi këtë regjistër.",
        configuration: "Konfigurimi i provimit",
        loadingOfferings: "Duke u ngarkuar ofrimet e caktuara...",
        noOfferingsTitle: "Nuk ka ofrime te caktuara.",
        noOfferingsText: "Kerko nga administratori ose profesori kryesor te te caktoje ne nje ofrim para se te krijosh provim.",
        offeringLabel: "Ofrimi i lendes",
        titleLabel: "Titulli",
        durationLabel: "Kohëzgjatja në minuta",
        descriptionLabel: "Përshkrimi",
        descriptionPlaceholder: "Përshkruaj përmbajtjen, udhëzimet, materialet e lejuara dhe shënimet e zhvillimit.",
        creating: "Duke u krijuar...",
        create: "Krijo provim"
      },
      examDetails: {
        loading: "Duke u ngarkuar detajet e provimit...",
        error: "Detajet e provimit nuk u ngarkuan.",
        userError: "Profili i përdoruesit nuk mund të ngarkohet.",
        badge: "Detajet e provimit",
        titleFallback: "Detaji i provimit",
        subtitleFallback: "Shiko strukturën e provimit, mbulimin e pyetjeve dhe hapat e ardhshëm të authoring-ut.",
        backToExams: "Kthehu te provimet",
        addQuestion: "Shto pyetje",
        loadingStructure: "Duke u ngarkuar struktura e provimit...",
        status: "Statusi",
        duration: "Kohëzgjatja",
        questions: "Pyetjet",
        coverage: "Mbulimi i pyetjeve",
        progress: "Progresi aktual i authoring-ut për këtë vlerësim",
        noQuestionsTitle: "Ende nuk është shtuar asnjë pyetje.",
        noQuestionsText: "Shto pyetjen e parë për të nisur ndërtimin e provimit.",
        type: "Lloji",
        points: "Pikët",
        generator: {
          title: "Gjeneruesi random i pyetjeve",
          subtitle: "Ndërto këtë draft nga banka e pyetjeve sipas numrit dhe llojit.",
          count: "Numri i pyetjeve",
          generate: "Gjenero pyetje",
          generating: "Duke gjeneruar...",
          replace: "Zëvendëso pyetjen",
          replacing: "Duke zëvendësuar..."
        }
      },
      questionCreate: {
        loading: "Duke u ngarkuar edituesi i pyetjes...",
        loadExamError: "Provimi nuk u ngarkua.",
        userError: "Profili i përdoruesit nuk mund të ngarkohet.",
        saveError: "Pyetja nuk u shtua.",
        badge: "Authoring i pyetjeve",
        title: "Shto pyetje",
        subtitleLoading: "Duke u ngarkuar konteksti i provimit...",
        subtitle: "Krijo një pyetje të re për {{title}}.",
        backToExam: "Kthehu te provimi",
        content: "Përmbajtja e pyetjes",
        prompt: "Prompt-i",
        promptPlaceholder: "Shkruaj këtu përmbajtjen e pyetjes.",
        type: "Lloji",
        points: "Pikët",
        saving: "Duke u ruajtur...",
        save: "Ruaj pyetjen"
      },
      questionBank: {
        loading: "Duke u ngarkuar banka e pyetjeve...",
        userError: "Profili i përdoruesit nuk mund të ngarkohet.",
        loadOfferingsError: "Ofrimet e caktuara nuk u ngarkuan.",
        loadQuestionsError: "Pyetjet e bankës nuk u ngarkuan.",
        deleteError: "Pyetja nuk u fshi.",
        deleteConfirm: "A dëshiron ta fshish këtë pyetje nga banka e pyetjeve?",
        badge: "Banka e pyetjeve",
        title: "Banka e pyetjeve",
        subtitle: "Menaxho pyetjet MCQ dhe Text sipas offering-ut të lëndës.",
        create: "Krijo pyetje",
        filters: "Filtrat",
        offering: "Ofrimi i lëndës",
        selectOffering: "Zgjidh offering-un",
        type: "Lloji",
        allTypes: "Të gjitha llojet",
        difficulty: "Vështirësia",
        allDifficulties: "Të gjitha nivelet",
        search: "Kërko",
        searchPlaceholder: "Kërko sipas pyetjes ose përgjigjes",
        selectedOffering: "Po punon në: {{offering}}",
        loadingOfferings: "Duke u ngarkuar ofrimet e caktuara...",
        loadingQuestions: "Duke u ngarkuar pyetjet e bankës...",
        emptyOfferingTitle: "Nuk është zgjedhur offering.",
        emptyOfferingText: "Zgjidh një nga offering-et e tua për të nisur authoring-un e pyetjeve.",
        emptyTitle: "Ende nuk ka pyetje.",
        emptyText: "Krijo pyetjen e parë MCQ ose Text për këtë offering.",
        pointsValue: "{{count}} pikë",
        noDifficulty: "Pa vështirësi",
        correctTag: "(sakta)",
        modelAnswer: "Përgjigjja model",
        cardHint: "Ndrysho pyetjen ose vazhdo ndërtimin e bankës së lëndës.",
        edit: "Ndrysho",
        delete: "Fshi",
        difficulties: {
          easy: "E lehtë",
          medium: "Mesatare",
          hard: "E vështirë"
        },
        editor: {
          loading: "Duke u ngarkuar edituesi i bankës së pyetjeve...",
          loadContextError: "Konteksti i bankës së pyetjeve nuk u ngarkua.",
          loadQuestionError: "Pyetja nuk u ngarkua.",
          saveError: "Pyetja nuk u ruajt.",
          createTitle: "Krijo hyrje në bankën e pyetjeve",
          editTitle: "Ndrysho hyrjen në bankën e pyetjeve",
          subtitle: "Krijo një pyetje për {{offering}}.",
          subtitleEmpty: "Krijo një pyetje për një nga offering-et e tua.",
          back: "Kthehu te banka e pyetjeve",
          sectionTitle: "Detajet e pyetjes",
          prompt: "Prompt-i",
          promptPlaceholder: "Shkruaj këtu pyetjen e plotë.",
          points: "Pikët",
          options: "Opsionet e MCQ",
          addOption: "Shto opsion",
          optionPlaceholder: "Opsioni {{index}}",
          remove: "Hiq",
          correctAnswer: "Përgjigjja e saktë",
          selectCorrectAnswer: "Zgjidh përgjigjen e saktë",
          modelAnswerPlaceholder: "Përgjigje reference opsionale për vlerësim manual.",
          saving: "Duke u ruajtur...",
          save: "Ruaj pyetjen"
        }
      },
      adminUsers: {
        loading: "Duke u ngarkuar hapësira e administrimit...",
        userError: "Profili i përdoruesit nuk mund të ngarkohet.",
        loadUsersError: "Përdoruesit nuk u ngarkuan.",
        createError: "Përdoruesi nuk u krijua.",
        createSuccess: "Përdoruesi u krijua me sukses.",
        previewIssue: "Disa rreshta të CSV kërkojnë vëmendje para importit.",
        fixCsv: "Rregullo problemet e CSV para importit.",
        importError: "Importi i përdoruesve dështoi.",
        importSuccess: "Importi përfundoi. U shtuan {{count}} përdorues.",
        updateSuccess: "Përdoruesi u përditësua me sukses.",
        updateError: "Përdoruesi nuk u përditësua.",
        statusError: "Statusi i përdoruesit nuk u ndryshua.",
        statusSuccess: "Përdoruesi u {{action}} me sukses.",
        resetMissing: "Shkruaj fjalëkalimin e ri para reset-it.",
        resetSuccess: "Fjalëkalimi u resetua me sukses.",
        resetError: "Reset-i i fjalëkalimit dështoi.",
        badge: "Administrim",
        title: "Menaxhimi i përdoruesve",
        subtitle: "Menaxho studentët, profesorët dhe asistentët me një ndërfaqe të ndërtuar për operacione reale departamenti.",
        backToOverview: "Kthehu te përmbledhja",
        createUser: "Krijo përdorues",
        fullName: "Emri i plotë",
        email: "Email",
        role: "Roli",
        temporaryPassword: "Fjalëkalimi i përkohshëm",
        activeAccount: "Llogari aktive",
        creating: "Duke u krijuar...",
        createButton: "Krijo përdorues",
        bulkImport: "Import masiv",
        defaultPassword: "Fjalëkalimi bazë",
        defaultPasswordPlaceholder: "Përdoret kur rreshti nuk ka fjalëkalim",
        generatePasswords: "Gjenero fjalëkalime kur mungojnë",
        csvRows: "Rreshtat CSV",
        validateFile: "Valido file-in",
        importing: "Duke importuar...",
        importUsers: "Importo përdorues",
        importPreview: "Parapamja e importit",
        previewHint: "Valido përmbajtjen CSV për të parë rreshtat para importit.",
        line: "Rreshti",
        status: "Statusi",
        validation: "Validimi",
        ready: "Gati",
        importSummary: "Përmbledhja e importit",
        requested: "Kërkuara",
        imported: "Importuara",
        failed: "Dështuara",
        importedAccounts: "Llogaritë e importuara",
        failedRows: "Rreshtat e dështuar",
        userDirectory: "Direktoria e përdoruesve",
        searchPlaceholder: "Kërko sipas emrit ose email-it",
        allRoles: "Të gjitha rolet",
        allStatuses: "Të gjitha statuset",
        active: "Aktiv",
        inactive: "Joaktiv",
        activated: "aktivizua",
        deactivated: "çaktivizua",
        loadingRecords: "Duke u ngarkuar regjistrat e përdoruesve...",
        created: "Krijuar",
        actions: "Veprimet",
        edit: "Ndrysho",
        deactivate: "Çaktivizo",
        activate: "Aktivizo",
        newPassword: "Fjalëkalim i ri",
        reset: "Reset",
        save: "Ruaj",
        roles: {
          Student: "Student",
          Professor: "Profesor",
          Assistant: "Asistent",
          Admin: "Admin"
        },
        csvErrors: {
          required: "FullName, Email dhe Role janë të detyrueshme.",
          invalidRole: "Roli duhet të jetë Student, Professor, Assistant ose Admin.",
          duplicate: "Email i dyfishtë në CSV.",
          weakPassword: "Fjalëkalimi duhet të ketë të paktën 8 karaktere dhe të përfshijë shkronjë të madhe, të vogël dhe numër."
        }
      },
      shell: {
        nav: {
          adminOverview: "Përmbledhje",
          adminAcademic: "Akademike",
          adminEnrollments: "Regjistrimet",
          adminUsers: "Përdoruesit",
          adminExams: "Provimet",
          professorOverview: "Përmbledhje",
          professorQuestionBank: "Banka e pyetjeve",
          professorExams: "Provimet e mia",
          professorCreateExam: "Krijo provim",
          assistantOverview: "Përmbledhje",
          assistantQuestionBank: "Banka e pyetjeve",
          assistantExams: "Provimet e caktuara",
          studentOverview: "Përmbledhje",
          studentExams: "Provimet e lejuara"
        }
      },
      rolePanels: {
        admin: {
          badge: "Administrim",
          heroTitle: "Kontrollo ciklin akademik nga një hapësirë e vetme operative.",
          heroText: "Menaxho onboarding-un e përdoruesve, monitoro gatishmërinë e platformës dhe mbaj të sinkronizuara semestrat, caktimet e stafit dhe operacionet e provimeve.",
          stats: {
            activeUsers: { label: "Përdorues aktivë", meta: "+12 këtë javë" },
            offerings: { label: "Ofrime lëndësh", meta: "Në 6 semestra" },
            imports: { label: "Regjistrime në pritje", meta: "Kërkojnë kontroll" },
            alerts: { label: "Njoftime politike", meta: "Kërkojnë veprim admini" }
          },
          quickActions: {
            academicSetup: "Konfigurimi akademik",
            manageUsers: "Menaxho përdoruesit",
            reviewExams: "Shiko provimet"
          },
          sections: {
            priorities: {
              title: "Prioritetet operative",
              items: [
                "Kontrollo studentët e importuar para aktivizimit të semestrit.",
                "Konfirmo caktimet e profesorëve dhe asistentëve për ofrimet e lëndëve.",
                "Verifiko llogaritë joaktive para dritares së ardhshme të provimeve."
              ]
            },
            nextMoves: {
              title: "Hapat e rekomanduar",
              items: [
                "Shto rrjedhat e regjistrimit që studentët të lidhen me lëndët aktuale dhe carry-over.",
                "Lidhi panelet sipas roleve me API aggregate reale.",
                "Finalizo publikimin e provimeve dhe rrjedhat e monitorimit."
              ]
            }
          }
        },
        professor: {
          badge: "Hapësira e profesorit",
          heroTitle: "Dizenjo provime, menaxho cilësinë e pyetjeve dhe mbikëqyr gatishmërinë e vlerësimit.",
          heroText: "Paneli yt grupon përgjegjësitë mësimore, detyrat për krijimin e provimeve dhe prioritetet e notimit në një vend.",
          stats: {
            assignedCourses: { label: "Lëndë të caktuara", meta: "Në vitet 1-3" },
            draftExams: { label: "Provime draft", meta: "Në pritje të plotësimit" },
            questionBank: { label: "Banka e pyetjeve", meta: "Të etiketuar sipas vështirësisë" },
            grading: { label: "Notime në pritje", meta: "Përfshirë ato të lidhura me asistentë" }
          },
          quickActions: {
            openExams: "Hape hapësirën e provimeve",
            createExam: "Krijo provim"
          },
          sections: {
            focus: {
              title: "Fokusi i kësaj jave",
              items: [
                "Ndërto provime nga bankat e aprovuara të pyetjeve për semestër.",
                "Kontrollo provimet e krijuara nga asistentët dhe progresin e tyre në notim.",
                "Përgatit oraret gati për publikim për dritaret aktive të provimeve."
              ]
            },
            courses: {
              title: "Organizimi i lëndëve",
              items: [
                "Viti 1: Bazat e Programimit, Sisteme të Databazave",
                "Viti 2: Algoritme, Sisteme Operative",
                "Viti 3: Inxhinieri Softuerike"
              ]
            }
          },
          offerings: {
            title: "Ofrimet e caktuara",
            subtitle: "Shfaqen vetem ofrimet e lendeve qe jane te lidhura me llogarine tende aktive si profesor.",
            loading: "Duke u ngarkuar ofrimet e caktuara...",
            error: "Ofrimet e caktuara nuk u ngarkuan.",
            emptyTitle: "Ende nuk ke ofrime te caktuara.",
            emptyText: "Kerko nga administratori te te caktoje ne nje ofrim lende para se te krijosh provime te lidhura me lenden.",
            total: "{{count}} te caktuara",
            groupTitle: "Viti {{year}}, Semestri {{semester}}",
            groupCount: "{{count}} ofrime",
            section: "Grupi {{section}}",
            term: "Afati",
            delivery: "Lloji",
            capacity: "Kapaciteti",
            courseFallback: "Lende pa emer",
            termFallback: "Pa afat"
          }
        },
        assistant: {
          badge: "Hapësira e asistentit",
          heroTitle: "Mbështet zhvillimin e lëndës, ekzekutimin e provimit dhe koordinimin e notimit.",
          heroText: "Përdor këtë zonë për të ndjekur ofrimet e caktuara, detyrat mbështetëse të provimeve dhe përgjegjësitë e notimit nën lëndët e profesorit.",
          stats: {
            assignedOfferings: { label: "Ofrime të caktuara", meta: "Semestri aktual" },
            supportExams: { label: "Provime mbështetëse", meta: "Përfshirë sesionet live" },
            reviewTasks: { label: "Detyra rishikimi", meta: "Notim i pyetjeve me përgjigje të shkurtra" },
            activeSessions: { label: "Sesione aktive", meta: "Monitorimi vjen së shpejti" }
          },
          quickActions: {
            assignedExams: "Hap provimet e caktuara"
          },
          sections: {
            responsibilities: {
              title: "Përgjegjësitë",
              items: [
                "Mbështet përgatitjen e provimeve dhe monitoro vlerësimet e caktuara.",
                "Rishiko rezultatet e studentëve për provimet e krijuara nën ofrimet e lëndëve tuaja.",
                "Kaloi te profesori vendimet për publikim dhe unlock."
              ]
            },
            notes: {
              title: "Shënime operative",
              items: [
                "Panelet e asistentit duhet të ekspozojnë nota dhe veprime mbështetëse, jo pronësi globale të provimeve.",
                "Monitorimi live dhe logjet e shkeljeve do të shfaqen këtu pasi të implementohet moduli i proctoring."
              ]
            }
          },
          offerings: {
            title: "Ofrimet mbeshtetese te caktuara",
            subtitle: "Shfaqen vetem ofrimet ku caktimi yt si asistent eshte aktiv.",
            loading: "Duke u ngarkuar ofrimet mbeshtetese...",
            error: "Ofrimet mbeshtetese nuk u ngarkuan.",
            emptyTitle: "Ende nuk ke ofrime mbeshtetese te caktuara.",
            emptyText: "Kerko nga administratori ose profesori kryesor te te caktoje ne nje ofrim aktiv.",
            total: "{{count}} te caktuara",
            groupTitle: "Viti {{year}}, Semestri {{semester}}",
            groupCount: "{{count}} ofrime mbeshtetese",
            section: "Grupi {{section}}",
            term: "Afati",
            delivery: "Lloji",
            capacity: "Kapaciteti",
            responsibility: "Pergjegjesia",
            responsibilityValue: "Mbeshtetje provimi dhe koordinim notimi",
            courseFallback: "Lende pa emer",
            termFallback: "Pa afat"
          }
        },
        student: {
          badge: "Hapësira e studentit",
          heroTitle: "Ndiq provimet e lejuara, afatet e ardhshme dhe historikun e rezultateve.",
          heroText: "Paneli yt fokusohet vetëm te ajo që mund të veprosh realisht: provimet e semestrit aktiv, mundësitë carry-over dhe rezultatet e publikuara.",
          stats: {
            eligibleExams: { label: "Provime të lejuara", meta: "Sipas rregullave aktuale" },
            upcoming: { label: "Dritare të ardhshme", meta: "7 ditët e ardhshme" },
            results: { label: "Rezultate të publikuara", meta: "Gati për shkarkim" },
            carryOver: { label: "Provime carry-over", meta: "Kërkohet unlock nga profesori" }
          },
          quickActions: {
            viewExams: "Shiko provimet"
          },
          sections: {
            visible: {
              title: "Çfarë duhet të shohësh këtu",
              items: [
                "Vetëm lëndët nga semestri yt aktiv.",
                "Provime carry-over vetëm kur janë zhbllokuar shprehimisht.",
                "Rezultate të publikuara pas aprovimit të stafit."
              ]
            },
            security: {
              title: "Pritshmëritë e sigurisë",
              items: [
                "Qasja në provim do të përfshijë më vonë hyrje me QR dhe rregulla për sesion të fokusuar.",
                "Statusi i tentimit, kohëmatësi dhe shkarkimet e rezultateve do të shfaqen kur rrjedha e studentit të përfundohet."
              ]
            }
          }
        }
      }
    }
  }
};

function resolveInitialLanguage() {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (savedLanguage === "en" || savedLanguage === "sq") {
    return savedLanguage;
  }

  return navigator.language?.toLowerCase().startsWith("sq") ? "sq" : "en";
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: resolveInitialLanguage(),
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

i18n.on("languageChanged", (language) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
});

export default i18n;
