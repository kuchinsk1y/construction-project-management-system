# System Zarządzania Projektami ERP — Status i Dokumentacja

Niniejszy dokument opisuje aktualny stan wdrożenia systemu ERP do zarządzania projektami budowlanymi, architekturę, role użytkowników oraz plan rozwoju (roadmape).

---

## 🛠️ Architektura Systemu

System opiera się na nowoczesnym stosie technologicznym w architekturze monorepo:

*   **Frontend**: React (Vite) + Tailwind CSS + Radix/Base UI + TanStack Query.
*   **Backend**: NestJS + Prisma ORM.
*   **Baza Danych**: PostgreSQL + pgPool (wsparcie dla Driver Adapters w Prisma).
*   **Komunikacja**: REST API, uwierzytelnianie przez jednorazowe kody e-mail (AuthCodes).

---

## 👥 Role w Systemie & Uprawnienia

W systemie zdefiniowano następujące role użytkowników:

| Rola (DB) | Nazwa w UI | Opis uprawnień |
| :--- | :--- | :--- |
| `admin` | **Administrator** | Pełny dostęp do systemu, zarządza użytkownikami (`/users`), kontrahentami i ustawieniami. |
| `operational_director` | **Dyrektor Operacyjny** | Tworzy projekty, konfiguruje budżety, warunki finansowe, kamienie milowe. |
| `project_manager` | **Kierownik Projektu** | Zarządza przydzielonymi projektami, definiuje zakres prac (Works), planuje obsadę (Resources). |
| `foreman` / `brygadzista` | **Starszy Brygadzista** | Odpowiada za realizację prac w terenie, raportuje postępy (w trakcie wdrażania). |
| `financial_director` | **Dyrektor Finansowy** | Kontroluje finanse, faktury i rentowność (w trakcie wdrażania). |

---

## 🔄 Przepływ Pracy (Workflow) & Status Wdrożenia

### Krok 1: Dodanie nowego projektu 🟢 (Wdrożono)
*   **Odpowiedzialny**: Dyrektor Operacyjny (`operational_director` / `admin`).
*   **Funkcjonalność**: Tworzenie projektu z danymi: *Kontrahent (Contractor)*, *Nazwa*, *Lokalizacja*, *Współrzędne GPS (PIN Google Maps)*, *Kraj*, *Moc MW*, *Kierownik Projektu*.
*   **Plik UI**: [ProjectsShowcase.tsx](file:///d:/PROGRAMMING/ERP/web/src/features/projects/ProjectsShowcase.tsx)

### Krok 2: Uzupełnienie danych finansowych i kamieni milowych 🟢 (Wdrożono)
*   **Odpowiedzialny**: Dyrektor Operacyjny (`operational_director` / `admin`).
*   **Funkcjonalność**:
    *   *Dane ogólne*: Kwota netto kontraktu, stawka VAT, termin płatności, okres i procent zatrzymania kaucji gwarancyjnej.
    *   *Kamienie Milowe (Milestones)*: Definiowanie etapów (KM1, KM2...) wraz z procentowym udziałem w wartości kontraktu i częstotliwością fakturowania częściowego.
*   **Plik UI**: [ProjectsShowcase.tsx](file:///d:/PROGRAMMING/ERP/web/src/features/projects/ProjectsShowcase.tsx)

### Krok 3: Zakres prac i przypisanie brygadzistów 🟢 (Wdrożono)
*   **Odpowiedzialny**: Kierownik Projektu (`project_manager`).
*   **Funkcjonalność**:
    *   Dodawanie rodzajów robót powiązanych z kamieniami milowymi (KM) wraz z jednostką miary i planowaną ilością całkowitą.
    *   Przypisanie robót do działów budowy: *Kafar / Montaż / Elektryka / Kable AC / Maszyny*.
    *   Wyznaczenie Starszego Brygadzisty dla każdego działu zaangażowanego w projekt (lista opcji pobiera użytkowników z rolami `foreman` lub `brygadzista`).
*   **Plik UI**: [WorksPage.tsx](file:///d:/PROGRAMMING/ERP/web/src/features/workspace/pages/WorksPage.tsx)

### Krok 4: Planowanie zasobów ludzkich 🟢 (Wdrożono)
*   **Odpowiedzialny**: Kierownik Projektu (`project_manager`).
*   **Funkcjonalność**:
    *   Określenie planowanej liczby pracowników potrzebnych do realizacji wybranego zakresu robót w danych przedziałach czasowych.
    *   **Wizualny Wykres Obsady (Gantt Headcount Chart)**: Sumaryczna, płynna i czytelna stepped-area diagram pokazująca skumulowane zapotrzebowanie kadrowe na budowie w czasie, zapobiegając konfliktom alokacji.
*   **Plik UI**: [ResourcesPage.tsx](file:///d:/PROGRAMMING/ERP/web/src/features/workspace/pages/ResourcesPage.tsx)

### Krok 5: Codzienne raportowanie (Dziennik budowy) 🟡 (Baza danych gotowa, brak API/UI)
*   **Odpowiedzialny**: Starszy Brygadzista (`foreman`).
*   **Opis**: Codzienne zgłaszanie faktycznie przepracowanych godzin, liczby obecnych pracowników oraz wykonanej ilości obmiarowej prac.
*   **Stan techniczny**: W bazie danych istnieje tabela `daily_reports` (z kolumnami `actual_workers`, `actual_hours`, `actual_quantity`, `report_date`), ale brakuje dla niej obsługi po stronie backendu i widoków po stronie frontendowej.

---

## 📝 Plan Dalszego Rozwoju (Roadmap & Backlog)

1.  **Dokończenie Kroku 5 (Raportowanie dzienne)**:
    *   Stworzenie modułu API dla `daily_reports` (kontroler, serwis, walidacja DTO).
    *   Wdrożenie widoku dla Brygadzisty, w którym może on w prosty sposób wybrać dzień, swój dział/projekt i wpisać raport dzienny.
2.  **Moduł Dyrektora Finansowego**:
    *   Interfejs do fakturowania kamieni milowych (KM).
    *   Weryfikacja postępu finansowego projektu (porównanie planu finansowego z wystawionymi fakturami i rzeczywistym postępem rzeczowym prac z raportów dziennych).
    *   Wykresy przepływów pieniężnych (Cash Flow) i rentowności.
