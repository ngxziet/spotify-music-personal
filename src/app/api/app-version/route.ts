export function GET() {
  return Response.json(
    { version: process.env.VERCEL_DEPLOYMENT_ID || '' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
