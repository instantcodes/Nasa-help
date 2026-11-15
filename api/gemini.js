// api/gemini.js
export default async function handler(req, res) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
  const answer = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": process.env.GEMINI_API_KEY
    },
    body: JSON.stringify(req.body)
  });
  const data = await answer.json();
  res.status(200).json(data);
}
