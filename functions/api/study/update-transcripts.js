const LILY_PLAUD_SERIAL = '8810B30300523466';

export async function onRequestPost() {
  return Response.json(
    {
      ok: false,
      code: 'PLAUD_NOT_CONNECTED',
      message: 'The study page is ready, but the Plaud import function still needs hosted credentials before it can pull recordings.',
      expectedDeviceSerial: LILY_PLAUD_SERIAL,
      items: [],
    },
    { status: 501 },
  );
}

export async function onRequestGet() {
  return Response.json(
    {
      ok: true,
      service: 'study-transcript-import',
      status: 'waiting-for-plaud-connection',
      expectedDeviceSerial: LILY_PLAUD_SERIAL,
    },
  );
}
