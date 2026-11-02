// Receives Maya's payment notifications for the demo booking deposit. Demo only: it logs status + booking ref and saves nothing.
// shortcut: no signature/IP check and no booking update, because the demo stores no bookings; a real clinic site must verify the sender and then confirm the booking.

const REF = /^NGITI-\d{8}-[A-Z0-9]{4}$/;

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
  } catch {
    // not JSON: still acknowledge so Maya stops retrying
  }
  const raw = body.status ?? body.paymentStatus;
  const status = typeof raw === 'string' && /^[A-Z_]{1,40}$/.test(raw) ? raw : 'unknown';
  const ref = typeof body.requestReferenceNumber === 'string' && REF.test(body.requestReferenceNumber) ? body.requestReferenceNumber : 'unknown';
  console.info('maya webhook', status, ref); // never log buyer or card details
  return new Response(null, { status: 200 });
}
