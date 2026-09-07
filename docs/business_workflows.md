# 🔄 Przepływ Pracy (Business Workflows)

System odzwierciedla naturalny cykl życia projektów budowlanych w naszej firmie, automatyzując i łącząc kolejne procesy — od pozyskania kontraktu, przez realizację, aż po rozliczenie finansowe.

---

## 📅 Cykl Życia Projektu

Każdy projekt przechodzi przez zdefiniowane statusy, które determinują, co można z nim robić.

| Status | Znaczenie | Zastosowanie w Systemie |
| :--- | :--- | :--- |
| `draft` | **Szkic** | Utworzony, ale brakuje menedżera, kamieni milowych lub budżetu. Nie raportuje się jeszcze godzin. |
| `active` | **W Robocie** | Projekt w fazie wykonawczej. Działają raporty dzienne, przydziały zasobów i wyliczanie kosztów. |
| `on_hold` | **Wstrzymany** | Pauza (np. zima, brak pozwoleń, opóźnienia u dostawców). Zablokowane raportowanie. |
| `completed`| **Zakończony**| Prace zakończone, kamienie milowe osiągnięte. Etap ostatecznego rozliczania płatności. |
| `archived` | **Archiwum** | Wszelkie płatności wykonane, okres gwarancji zakończony. Stan "Tylko do odczytu". |
| `cancelled`| **Anulowany** | Projekt zerwany (np. odmowa kontrahenta). |

---

## 🪜 Etapy Realizacji Projektu

Poniżej przedstawiono standardowy proces (kroki), przez które przechodzi każdy nowo rozpoczęty projekt budowlany.

### Krok 1: Inicjalizacja Projektu
*   **Aktor**: Dyrektor Operacyjny.
*   **Akcja**: Wprowadzenie podstawowych informacji, takich jak nazwa projektu, dane Kontrahenta, adres, współrzędne GPS. Definiowane są parametry niestandardowe (np. w PV — generowana moc w MW).
*   **Wynik**: Projekt zyskuje status `draft`. Zostaje przydzielony Kierownik Projektu.

### Krok 2: Uwarunkowania Finansowe i Kamienie Milowe
*   **Aktor**: Dyrektor Operacyjny.
*   **Akcja**: 
    *   Definiowanie całkowitej wartości kontraktu netto, stawki VAT oraz waluty.
    *   Ustalenie terminów i procentu kaucji gwarancyjnych.
    *   Podział projektu na **Kamienie Milowe (Milestones)**. Każdy etap ma określony opis, wartość (w %) i uprawnienia do fakturowania częściowego.

### Krok 3: Budżet i Godziny
*   **Aktor**: Dyrektor Operacyjny.
*   **Akcja**:
    *   Przypisanie planowanych kwot do "kategorii kosztów" (np. materiały, wynajem sprzętu ciężkiego, hostele).
    *   **Kluczowe**: Kategoria kosztów "Zarobki" w połączeniu ze średnią stawką godzinową pracownika pozwala systemowi na zautomatyzowane wyliczenie całkowitej puli godzin przewidzianej na budowę.
    *   Pula godzin jest wstępnie dystrybuowana pomiędzy planowane w Kroku 4 etapy.

### Krok 4: Zakres Prac i Przypisywanie Zespołów
*   **Aktor**: Kierownik Projektu.
*   **Akcja**:
    *   Wewnątrz stworzonych przez Dyrektora Operacyjnego Kamieni Milowych, dodaje poszczególne pakiety prac (np. Wbijanie pali, Montaż konstrukcji, Elektryka).
    *   Określa ich jednostki miary, planowaną datę rozpoczęcia i zakończenia.
    *   Oznacza dział odpowiedzialny za te prace i na tej podstawie przypisuje odpowiedzialnego **Starszego Brygadzistę**.

### Krok 5: Planowanie Zasobów (Resource Planning)
*   **Aktor**: Kierownik Projektu.
*   **Akcja**:
    *   Wykorzystuje interaktywny "Gantt Headcount Chart", aby precyzyjnie przypisać potrzebnych ludzi do określonych prac w określonym oknie czasowym.
    *   System wizualnie alarmuje, jeżeli suma nakładających się na siebie prac powoduje nieosiągalne wymagania ludzkie w konkretnym dniu.

### Krok 6: Raportowanie Dzienne (Dziennik Budowy)
*   **Aktor**: Starszy Brygadzista.
*   **Akcja**: Codziennie w aplikacji mobilnej / webowej dodaje "szybki raport". Podaje jedynie faktyczną ilość przepracowanych godzin swojego zespołu, liczbę ludzi obecnych na budowie oraz wykonany w tym dniu obmiar robót.

### Krok 7: Płatności i Analiza (Działania Ciągłe)
*   **Aktor**: Dyrektor Finansowy.
*   **Akcja**: Bada przepływ gotówki (Cash Flow), wystawia faktury na zrealizowane w `Kroku 6` kamienie milowe, a także śledzi rentowność względem założonego budżetu w `Kroku 3`.
