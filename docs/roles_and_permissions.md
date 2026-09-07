# 👥 Role w Systemie i Uprawnienia

System ERP zarządza dostępami za pomocą rozbudowanego systemu ról i uprawnień, gwarantując, że każdy użytkownik widzi i może edytować tylko te informacje, do których jest upoważniony.

---

## 📋 Lista Ról

Poniższa tabela przedstawia główne role zdefiniowane w systemie oraz ich powiązane uprawnienia i zakres odpowiedzialności.

| Rola w Bazie (ID) | Nazwa Wyświetlana (UI) | Główne Odpowiedzialności i Uprawnienia |
| :--- | :--- | :--- |
| `admin` | **Administrator** | Pełny dostęp do całego systemu. Zarządza użytkownikami (`/users`), kontrahentami, rolami oraz ustawieniami globalnymi. Może wykonywać akcje w imieniu każdego innego pracownika. |
| `operational_director` | **Dyrektor Operacyjny** | Tworzy nowe projekty w systemie, przypisuje Kierowników Projektu. Konfiguruje budżety, warunki finansowe oraz kamienie milowe. Przydziela zaplanowane godziny na poszczególne typy prac. |
| `financial_director` | **Dyrektor Finansowy** | Kontroluje finanse i opłacalność. Planuje dochody i wydatki, wystawia oraz śledzi faktury (powiązane z kamieniami milowymi), kontroluje płatności i analizuje rentowność (Cash Flow). |
| `project_manager` | **Kierownik Projektu** | Zarządza przydzielonymi projektami. Definiuje zakres prac (Work Types) dla każdego kamienia milowego. Przypisuje Starszych Brygadzistów do prac i precyzyjnie planuje obsadę na dany dzień (Resource Planning). |
| `department_head` | **Kierownik Działu** | Posiada status obserwatora (Viewer) z pełnym wglądem we wszystkie projekty. Służy do analizy całkowitego obciążenia pracą konkretnego działu budowlanego. |
| `foreman` / `st. brygadzista` | **Starszy Brygadzista** | Odpowiada za realizację prac w terenie. Wypełnia raporty codzienne (dziennik budowy) raportując obecność, przepracowane godziny i faktyczny przerób na przypisanych mu projektach. |
| `viewer` | **Gлядач (Obserwator)** | Podgląd całego systemu w trybie "Tylko do odczytu". Brak możliwości dokonywania jakichkolwiek modyfikacji. |
| `contractor` | **Kontrahent (Zleceniodawca)** | Autoryzuje się w systemie w celu śledzenia postępów *wyłącznie swoich własnych projektów* w czasie rzeczywistym. Nie ma wglądu w projekty innych podmiotów ani wrażliwe dane finansowe firmy. |

---

## 🔒 Dostęp Kontrahentów (Security)

> [!WARNING]
> Wdrożono specjalną logikę zabezpieczeń na poziomie bazy danych i API, która gwarantuje, że konto z rolą `contractor` ma ograniczony dostęp za pomocą mechanizmu `Row-Level Security` (lub na poziomie filtrowania backendu). Widzi on jedynie obiekty przypisane do relacji tabeli `contractor_project_access`.
