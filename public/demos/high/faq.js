// FAQ matcher for the demo clinic chatbot. Fixed answers only; symptoms and unknown questions go to staff.

const SYMPTOMS = ['masakit', 'sakit', 'pain', 'painful', 'ache', 'aching', 'toothache', 'bleeding', 'bleed', 'dugo', 'dumudugo',
  'namamaga', 'maga', 'swollen', 'swelling', 'infection', 'nana', 'pus', 'emergency', 'fever', 'lagnat'];

const FAQ = [
  { id: 'prices', words: ['magkano', 'much', 'price', 'prices', 'presyo', 'cost', 'costs', 'rate', 'rates', 'fee', 'fees'],
    text: 'Sample prices: Consultation ₱500 · Cleaning ₱1,000 - ₱1,500 · Filling from ₱1,000 · Extraction from ₱1,000 · Whitening from ₱8,000 · Braces from ₱40,000. Your dentist confirms the final price before treatment.' },
  { id: 'hmo', words: ['hmo', 'maxicare', 'intellicare', 'medicard', 'insurance', 'card'],
    text: 'Yes, we accept Maxicare, Intellicare and Medicard. Bring your HMO card and one valid ID.' },
  { id: 'hours', words: ['open', 'bukas', 'hours', 'oras', 'sunday', 'linggo', 'sarado', 'closed', 'saturday', 'sabado'],
    text: 'We are open Monday to Saturday, 9:00 AM - 6:00 PM. Closed on Sundays.' },
  { id: 'location', words: ['saan', 'where', 'address', 'location', 'located', 'parking', 'park', 'directions', 'map'],
    text: 'Unit 0, Sample Street, Pasig City (fictional address). Street parking is available near the clinic.' },
  { id: 'book', words: ['book', 'booking', 'appointment', 'schedule', 'sched', 'reserve', 'reservation', 'slot'],
    text: 'You can book online in under a minute: choose a service, date and time, then pay a ₱500 deposit with Maya.', link: 'book.html' },
  { id: 'payment', words: ['gcash', 'maya', 'deposit', 'pay', 'payment', 'bayad', 'cash'],
    text: 'Online bookings need a ₱500 deposit through Maya, deducted from your bill. At the clinic you can pay by cash, card or Maya.' },
  { id: 'comfort', words: ['hurt', 'hurts', 'takot', 'scared', 'nervous', 'anesthesia', 'numb'],
    text: 'Most treatments only feel like mild pressure, and we numb the area when needed. Tell your dentist if you feel nervous.' },
  { id: 'kids', words: ['kids', 'kid', 'child', 'children', 'bata', 'anak'],
    text: 'Yes, we see children from age 3 and up.' },
];

export const QUICK_REPLIES = [
  { label: 'Prices', question: 'How much are your services?' },
  { label: 'HMO', question: 'Do you accept HMO?' },
  { label: 'Hours', question: 'What are your clinic hours?' },
  { label: 'Location & parking', question: 'Where are you and is there parking?' },
  { label: 'Book an appointment', question: 'I want to book an appointment' },
];

export function answer(text) {
  const words = String(text ?? '').toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.some((w) => SYMPTOMS.includes(w))) return { kind: 'handoff', reason: 'symptom' };
  let best = null;
  let bestScore = 0;
  for (const f of FAQ) {
    const score = words.filter((w) => f.words.includes(w)).length;
    if (score > bestScore) { best = f; bestScore = score; }
  }
  if (!best) return { kind: 'handoff', reason: 'unknown' };
  return { kind: 'answer', id: best.id, text: best.text, ...(best.link ? { link: best.link } : {}) };
}
