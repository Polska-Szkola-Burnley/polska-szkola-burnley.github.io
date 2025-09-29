---
title: "Jak zapisać dziecko do szkoły"
draft: false
description: "Chcesz zapisać dziecko do Polskiej Szkoły w Burnley? Znajdziesz tu formularz zgłoszeniowy i broszurę informacyjną. Sprawdź, jak łatwo dołączyć do naszej społeczności."
type: "page"
---
Wypełnij formularz:
<form name="enrollment" method="POST" action="/.netlify/functions/enroll">
  <div class="heading">
    <h3>Formularz zapisu dziecka do Polskiej Szkoły w Burnley</h3>
    <p>* Pola oznaczone gwiazdką są wymagane</p>
  </div>
  
  <div class="form-group">
    <label for="child_name">Pełne imię i nazwisko dziecka: *</label>
    <input type="text" name="child_name" id="child_name" class="form-control" required>
  </div>

  <div class="form-group">
    <label for="child_birth_date">Data urodzenia dziecka: *</label>
    <input type="date" name="child_birth_date" id="child_birth_date" class="form-control" required>
  </div>

  <div class="form-group">
    <label for="child_birth_place">Miejsce urodzenia dziecka: *</label>
    <input type="text" name="child_birth_place" id="child_birth_place" class="form-control" required>
  </div>

  <div class="form-group">
    <label for="child_address">Adres zamieszkania dziecka: *</label>
    <textarea name="child_address" id="child_address" class="form-control" required></textarea>
  </div>

  <div class="form-group">
    <label for="english_school">Nazwa angielskiej szkoły do której dziecko uczęszcza: *</label>
    <input type="text" name="english_school" id="english_school" class="form-control" required>
  </div>

  <div class="form-group">
    <label for="polish_school_attended">Czy dziecko uczęszczało do polskiej szkoły? *</label>
    <select name="polish_school_attended" id="polish_school_attended" class="form-control" required>
      <option value="Nie">Nie</option>
      <option value="Tak">Tak</option>
    </select>
  </div>

  <div class="form-group">
    <label for="polish_school_name">Jeśli tak, podaj nazwę szkoły:</label>
    <input type="text" name="polish_school_name" id="polish_school_name" class="form-control" disabled>
  </div>

  <div class="form-group">
    <label for="parent1_name">Imię i nazwisko pierwszego rodzica/opiekuna prawnego: *</label>
    <input type="text" name="parent1_name" id="parent1_name" class="form-control" required>
  </div>

  <div class="form-group">
    <label for="parent1_phone">Nr telefonu: *</label>
    <input type="tel" name="parent1_phone" id="parent1_phone" class="form-control" required>
  </div>

  <div class="form-group">
    <label for="parent2_name">Imię i nazwisko drugiego rodzica/opiekuna prawnego:</label>
    <input type="text" name="parent2_name" id="parent2_name" class="form-control">
  </div>

  <div class="form-group">
    <label for="parent2_phone">Nr telefonu:</label>
    <input type="tel" name="parent2_phone" id="parent2_phone" class="form-control">
  </div>

  <div class="form-group">
    <label for="contact_email">Email kontaktowy: *</label>
    <input type="email" name="contact_email" id="contact_email" class="form-control" required>
  </div>

  <div class="checkbox">
    <label>
      <input type="checkbox" id="same_address" name="same_address" value="yes"> Adres zamieszkania rodziców jest taki sam jak dziecka
    </label>
  </div>
  <div class="form-group">
    <label for="parents_address">Adres zamieszkania rodziców:</label>
    <textarea name="parents_address" id="parents_address" class="form-control" required></textarea>
  </div>

  <button type="submit" class="btn btn-template-main">
    Wyślij zgłoszenie
  </button>
</form>



Proszę także zapoznać się z broszurą dla nowych rodziców.
<iframe src="/pdf/dla_nowych.pdf" width="100%" height="700px">
    Twój przeglądarka nie obsługuje wyświetlania plików PDF.
    Możesz pobrać go [tutaj](pdf/dla_nowych.pdf).
</iframe>

Formularz zgłoszeniowy.
<iframe src="/pdf/formularz.pdf" width="100%" height="700px">
    Twój przeglądarka nie obsługuje wyświetlania plików PDF.
    Możesz pobrać go [tutaj](pdf/formularz.pdf).
</iframe>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const polishSchoolAttendedSelect = document.getElementById('polish_school_attended');
  const polishSchoolNameInput = document.getElementById('polish_school_name');
  const polishSchoolNameLabel = document.querySelector('label[for="polish_school_name"]');
  const sameAddressCheckbox = document.getElementById('same_address');
  const childAddressTextarea = document.getElementById('child_address');
  const parentsAddressTextarea = document.getElementById('parents_address');
  const parentsAddressGroup = parentsAddressTextarea.closest('.form-group');
  const parentsAddressLabel = document.querySelector('label[for="parents_address"]');

  function togglePolishSchoolNameField() {
    if (polishSchoolAttendedSelect.value === 'Tak') {
      polishSchoolNameInput.disabled = false;
      polishSchoolNameInput.required = true;
      polishSchoolNameLabel.textContent = 'Jeśli tak, podaj nazwę szkoły: *';
    } else {
      polishSchoolNameInput.disabled = true;
      polishSchoolNameInput.required = false;
      polishSchoolNameInput.value = ''; // Wyczyść pole, gdy jest nieaktywne
      polishSchoolNameLabel.textContent = 'Jeśli tak, podaj nazwę szkoły:';
    }
  }

  function toggleParentsAddressField() {
    if (sameAddressCheckbox.checked) {
      parentsAddressTextarea.value = childAddressTextarea.value;
      parentsAddressTextarea.required = false;
      parentsAddressGroup.style.display = 'none';
      parentsAddressLabel.textContent = 'Adres zamieszkania rodziców:';
    } else {
      parentsAddressTextarea.required = true;
      parentsAddressGroup.style.display = 'block';
      parentsAddressLabel.textContent = 'Adres zamieszkania rodziców: *';
    }
  }

  // Ustaw stan początkowy po załadowaniu strony
  togglePolishSchoolNameField();
  toggleParentsAddressField();

  // Dodaj nasłuchiwanie na zmiany
  polishSchoolAttendedSelect.addEventListener('change', togglePolishSchoolNameField);
  sameAddressCheckbox.addEventListener('change', toggleParentsAddressField);
  
  // Aktualizuj adres rodziców, jeśli checkbox jest zaznaczony, a adres dziecka się zmienia
  childAddressTextarea.addEventListener('input', function() {
    if (sameAddressCheckbox.checked) {
      parentsAddressTextarea.value = this.value;
    }
  });
});
</script>