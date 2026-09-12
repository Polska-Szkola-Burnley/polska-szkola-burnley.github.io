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
// odpowiedzi z oczekiwanym hashem.
function checkCaptcha(data) {
  const answer = String(data.math_answer || "").trim();
  const expectedHash = String(data.math_hash || "").trim().toLowerCase();
  if (!answer || !expectedHash) return false;
  if (!/^[0-9a-f]{8}$/.test(expectedHash)) return false;
  return fnv1a(answer) === expectedHash;
}

// Walidacja najważniejszych pól formularza. Odrzuca bez wysyłki maila.
function validateFields(data) {
  const textFields = [
    "child_name",
    "child_birth_place",
    "child_address",
    "english_school",
    "parent1_name",
  ];
  for (const key of textFields) {
    if (!data[key] || !hasLetters(data[key])) return false;
  }
  if (!isValidEmail(data.contact_email)) return false;
  if (!isValidBirthDate(data.child_birth_date)) return false;
  if (countDigits(data.parent1_phone) < 6) return false;
  return true;
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

    if (!checkCaptcha(data)) {
      return rejected(
        "Pole antyspamowe zostało wypełnione niepoprawnie. Sprawdź wynik działania i spróbuj ponownie."
      );
    }

    if (!validateFields(data)) {
      return rejected(
        "Brakuje wymaganych danych lub część z nich jest niepoprawna (np. email, data urodzenia, telefon). Uzupełnij formularz i spróbuj ponownie."
      );
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