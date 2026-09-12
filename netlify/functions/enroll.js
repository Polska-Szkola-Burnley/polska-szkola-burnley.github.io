const querystring = require("querystring");
const nodemailer = require("nodemailer");

// Rate limit Netlify (code-based, dostępny na wszystkich planach):
// max 10 żądań na 60 sekund z jednego adresu IP. Nadmiar -> HTTP 429 bez wywołania funkcji body.
exports.config = {
  path: "/.netlify/functions/enroll",
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip"],
  },
};

// FNV-1a (32-bit) - identyczna implementacja jak po stronie przeglądarki.
// Służy do zapisu oczekiwanego wyniku CAPTCHY matematycznej w oznaczonej formie.
function fnv1a(str) {
  let h = 0x811c9dc5;
  const s = String(str).trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}

function isValidBirthDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v).trim());
  if (!m) return false;
  const y = +m[1];
  const month = +m[2];
  const day = +m[3];
  if (y < 2005 || y > new Date().getFullYear()) return false;
  const dt = new Date(y, month - 1, day);
  return (
    dt.getFullYear() === y && dt.getMonth() === month - 1 && dt.getDate() === day
  );
}

function hasLetters(v) {
  return /\p{L}/u.test(String(v).trim());
}

function countDigits(v) {
  return String(v).replace(/\D/g, "").length;
}

// CAPTCHA matematyczna: przeglądarka wysyła odpowiedź (math_answer)
// oraz hash oczekiwanego wyniku (math_hash). Tu porównujemy hash podanej
// odpowiedzi z oczekiwanym hashem. Zwraca null, gdy OK, albo komunikat błędu.
function checkCaptcha(data) {
  const answer = String(data.math_answer || "").trim();
  const expectedHash = String(data.math_hash || "").trim().toLowerCase();
  if (!answer) {
    return "Pole antyspamowe jest puste — wpisz wynik działania.";
  }
  if (!/^[0-9a-f]{8}$/.test(expectedHash)) {
    return "Brak poprawnego zabezpieczenia antyspamowego. Odśwież stronę i spróbuj ponownie.";
  }
  if (fnv1a(answer) !== expectedHash) {
    return "Pole antyspamowe zostało wypełnione niepoprawnie — podany wynik jest zły. Spróbuj ponownie.";
  }
  return null;
}

// Walidacja najważniejszych pól formularza. Zwraca null, gdy OK, albo komunikat błędu.
function validateFields(data) {
  const textFields = [
    ["child_name", "Imię i nazwisko dziecka"],
    ["child_birth_place", "Miejsce urodzenia dziecka"],
    ["child_address", "Adres zamieszkania dziecka"],
    ["english_school", "Nazwa angielskiej szkoły"],
    ["parent1_name", "Imię i nazwisko pierwszego rodzica"],
  ];
  for (const [key, label] of textFields) {
    const v = data[key];
    if (!v || !hasLetters(v)) {
      return `Pole „${label}" jest puste lub nie zawiera liter.`;
    }
  }
  if (!data.contact_email || !String(data.contact_email).trim()) {
    return "Pole „Email kontaktowy” jest puste.";
  }
  if (!isValidEmail(data.contact_email)) {
    return "Podany adres email jest niepoprawny (wymagany format np. jan@przyklad.pl).";
  }
  if (!isValidBirthDate(data.child_birth_date)) {
    return `Data urodzenia jest niepoprawna (wymagany format RRRR-MM-DD i realna data z lat 2005–${new Date().getFullYear()}).`;
  }
  if (countDigits(data.parent1_phone) < 6) {
    return "Nr telefonu pierwszego rodzica musi zawierać co najmniej 6 cyfr.";
  }
  return null;
}

function rejected(message) {
  return {
    statusCode: 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: `
        <html>
          <head>
            <title>Formularz nie został wysłany.</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f4f8; }
              .message { display: inline-block; padding: 20px; background: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #c0392b; }
              p { color: #34495e; font-size: 16px; }
              a { color: #3498db; text-decoration: none; margin-top: 10px; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="message">
              <h1>Formularz nie został wysłany</h1>
              <p>${message}</p>
              <a href="/dla-rodzicow/jak-zapisac">Wróć do formularza</a>
            </div>
          </body>
        </html>
      `,
  };
}

exports.handler = async (event, context) => {
  // Jeśli event.body jest puste, zakończ funkcję
  if (!event.body) {
    return {
      statusCode: 200,
      body: "Brak danych do przetworzenia.",
    };
  }
  try {
    const data = querystring.parse(event.body);

    const captchaError = checkCaptcha(data);
    if (captchaError) {
      return rejected(captchaError);
    }

    const validationError = validateFields(data);
    if (validationError) {
      return rejected(validationError);
    }

    // transporter SMTP (np. Gmail – wymaga App Password!)
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // np. szkola@gmail.com
        pass: process.env.EMAIL_PASS  // hasło aplikacji Gmail
      }
    });

    const parentsAddress = data.same_address === 'yes'
      ? 'Taki sam jak dziecka'
      : data.parents_address;
    // treść maila
    let mailOptions = {
      from: `"Polska Szkoła w Burnley" <${process.env.EMAIL_USER}>`,
      to: "mondep@wp.pl", // tu ma przychodzić zgłoszenie
      subject: "Nowe zgłoszenie dziecka",
      text: `
Nowe zgłoszenie dziecka:

Imię i nazwisko: ${data.child_name}
Data urodzenia: ${data.child_birth_date}
Miejsce urodzenia: ${data.child_birth_place}
Adres dziecka: ${data.child_address}
Angielska szkoła: ${data.english_school}
Polska szkoła wcześniej: ${data.polish_school_attended} ${data.polish_school_name || ""}
Rodzic 1: ${data.parent1_name}
Telefon rodzica 1: ${data.parent1_phone}
Rodzic 2: ${data.parent2_name || "Nie podano"}
Telefon rodzica 2: ${data.parent2_phone || "Nie podano"}
Email kontaktowy: ${data.contact_email}
Adres rodziców: ${parentsAddress}
`
    };

    await transporter.sendMail(mailOptions);

    // ładne potwierdzenie w HTML
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: `
        <html>
          <head>
            <title>Zgłoszenie wysłane.</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f4f8; }
              .message { display: inline-block; padding: 20px; background: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #2c3e50; }
              p { color: #34495e; font-size: 16px; }
              a { color: #3498db; text-decoration: none; margin-top: 10px; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="message">
              <h1>Dziękujemy!</h1>
              <p>Twoje zgłoszenie zostało wysłane. Przedstawiciel szkoły skontaktuje się z tobą w ciągu 48 godzin.</p>
              <a href="/">Powrót na stronę główną</a>
            </div>
          </body>
        </html>
      `
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: `
        <html>
          <body>
            <h1>Ups!</h1>
            <p>Nie udało się wysłać zgłoszenia. Spróbuj ponownie.</p>
            <a href="/">Powrót na stronę główną</a>
          </body>
        </html>
      `
    };
  }
};