# 🏢 ERP Construction Project Management

Witamy w oficjalnej dokumentacji systemu **ERP do zarządzania projektami budowlanymi**. 

Ten system to nowoczesna aplikacja monorepo zaprojektowana specjalnie dla sektora budowlanego (w tym farm fotowoltaicznych PV oraz magazynów energii BESS), pozwalająca na śledzenie projektów, budżetów i kamieni milowych w czasie rzeczywistym.

---

## 📑 Spis Treści

Wybierz jedną z poniższych sekcji, aby zapoznać się ze szczegółami:

1. [**Architektura i Stos Technologiczny**](./architecture.md)
   *Dowiedz się, jak zbudowany jest system, z jakich technologii korzystamy i jak uruchomić projekt.*

2. [**Role i Uprawnienia**](./roles_and_permissions.md)
   *Sprawdź, jakie role występują w systemie (np. Dyrektor Operacyjny, Kierownik Projektu) i do czego mają dostęp.*

3. [**Przepływ Pracy (Business Workflows)**](./business_workflows.md)
   *Zrozum krok po kroku logikę biznesową – od utworzenia projektu, przez planowanie budżetu i zasobów, aż po raporty codzienne.*

4. [**Schemat Bazy Danych (Database Schema)**](./database_schema.md)
   *Zapoznaj się z relacjami między encjami, strukturą bazy danych PostgreSQL oraz cyklem życia projektu.*

---

## 🎯 Główne Funkcjonalności

> [!TIP]
> **Interaktywne Wykresy Gantta**
> System oferuje wsparcie dla płynnych, interaktywnych wykresów (Gantt Headcount Chart) do planowania obsady pracowniczej, zapobiegając konfliktom w alokacji zasobów.

* **Zaawansowany Panel Projektów (Dashboard)**: Wizualizacja aktywnych i zakończonych projektów, śledzenie budżetu.
* **Kamienie Milowe (Milestones)**: Precyzyjne śledzenie etapów projektu, zarządzanie fakturowaniem i procentowym udziałem.
* **Roboty Dodatkowe**: Łatwe zarządzanie pracami poza zakresem i dodatkowymi roszczeniami finansowymi.
* **Zarządzanie Zasobami**: Bezpośrednie przydzielanie brygadzistów i podwykonawców do poszczególnych prac.
* **Raportowanie Codzienne**: Intuicyjny moduł dla brygadzistów do raportowania godzin i postępu prac prosto z placu budowy.
