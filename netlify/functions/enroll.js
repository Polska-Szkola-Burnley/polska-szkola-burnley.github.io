const querystring = require("querystring");
const nodemailer = require("nodemailer");

exports.handler = async (event, context) => {
  try {
    const data = querystring.parse(event.body);

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
